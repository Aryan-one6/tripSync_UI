/**
 * GST Verification Service — TripSync
 *
 * Validates Indian GSTIN format, checks uniqueness across the platform,
 * and fetches the company/trade name using a provider waterfall:
 *
 *   1. Razorpay Verification API  — free with every Razorpay account, uses
 *      existing RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET, no extra signup needed.
 *   2. gstincheck.co.in API — best-effort backup via API key.
 *   3. Graceful unverified fallback — never blocks registration.
 *
 * GSTIN Format: 2-digit state + 10-digit PAN + 1 entity + 1 digit + 1 checksum = 15 chars
 * Example: 27AADCB2230M1ZT
 */

import { prisma } from './prisma.js';
import { env } from './env.js';
import { BadRequestError, ConflictError } from './errors.js';

// ─── GSTIN regex ─────────────────────────────────────────────────────────────
// Format: 2 digits + 5 alpha + 4 digits + 1 alpha + 1 alphanum + Z + 1 alphanum
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{1}Z[0-9A-Z]{1}$/;

/**
 * Validate GSTIN format strictly.
 */
export function isValidGSTIN(gstin: string): boolean {
  return GSTIN_REGEX.test(gstin.toUpperCase().trim());
}

/**
 * Check that the given GSTIN is not already registered by another agency.
 * Throws ConflictError if duplicate.
 */
export async function assertGstinUnique(gstin: string, excludeAgencyId?: string): Promise<void> {
  const normalized = gstin.toUpperCase().trim();
  const existing = await prisma.agency.findUnique({
    where: { gstin: normalized },
    select: { id: true, name: true },
  });

  if (existing && existing.id !== excludeAgencyId) {
    throw new ConflictError(
      `GSTIN ${normalized} is already registered on TravellersIn by another agency. Each GSTIN can only be used once.`,
    );
  }
}

/**
 * GST verification response shape
 */
export interface GstVerificationResult {
  gstin: string;
  legalName: string;
  tradeName: string | null;
  status: 'Active' | 'Inactive' | 'Cancelled' | 'Suspended' | string;
  stateCode: string;
  registrationDate: string | null;
  registeredAddress: string | null;
  registeredCity: string | null;
  registeredState: string | null;
  verified: boolean;
}

// ─── Provider 1: Razorpay beta business-entities API ─────────────────────────
// Included free with every Razorpay account.
// Uses existing RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET (Basic Auth).
async function verifyViaRazorpay(gstin: string): Promise<GstVerificationResult | null> {
  const keyId = env.RAZORPAY_KEY_ID;
  const keySecret = env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;

  try {
    const credentials = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const response = await fetch(
      `https://api.razorpay.com/v1/beta/business-entities/${encodeURIComponent(gstin)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(8_000),
      },
    );

    if (!response.ok) {
      console.warn(`[gst:razorpay] HTTP ${response.status} for ${gstin}`);
      return null;
    }

    const data = await response.json() as {
      gstin?: string;
      legal_name?: string;
      trade_name?: string;
      status?: string;
      registration_date?: string;
      error?: string;
    };

    if (data.error || !data.legal_name) return null;

    return {
      gstin,
      legalName: data.legal_name,
      tradeName: data.trade_name || null,
      status: data.status ?? 'Unknown',
      stateCode: gstin.slice(0, 2),
      registrationDate: data.registration_date || null,
      registeredAddress: null,
      registeredCity: null,
      registeredState: null,
      verified: true,
    };
  } catch (err) {
    console.warn(`[gst:razorpay] Error for ${gstin}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

// ─── Provider 2: gstincheck.co.in API ─────────────────────────────────────────
async function verifyViaPublicApi(gstin: string): Promise<GstVerificationResult | null> {
  const apiKey = env.GSTINCHECK_API_KEY?.trim();
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `https://sheet.gstincheck.co.in/check/${encodeURIComponent(apiKey)}/${encodeURIComponent(gstin)}`,
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8_000),
      },
    );

    if (!response.ok) return null;

    const data = await response.json() as {
      flag?: boolean;
      data?: {
        lgnm?: string;
        tradeNam?: string;
        sts?: string;
        stcd?: string;
        rgdt?: string;
        pradr?: {
          adr?: string;
          addr?: {
            loc?: string;
            stcd?: string;
          };
        };
      };
      error?: boolean;
    };

    if (data.flag === false || data.error || !data.data) return null;

    const g = data.data;
    return {
      gstin,
      legalName: g.lgnm ?? 'Unknown',
      tradeName: g.tradeNam || null,
      status: g.sts ?? 'Unknown',
      stateCode: g.stcd ?? gstin.slice(0, 2),
      registrationDate: g.rgdt || null,
      registeredAddress: g.pradr?.adr?.trim() || null,
      registeredCity: g.pradr?.addr?.loc?.trim() || null,
      registeredState: g.pradr?.addr?.stcd?.trim() || null,
      verified: true,
    };
  } catch (err) {
    console.warn(`[gst:public] Error for ${gstin}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

// ─── Provider 3: Graceful unverified fallback ─────────────────────────────────
function fallbackResult(gstin: string): GstVerificationResult {
  return {
    gstin,
    legalName: '',
    tradeName: null,
    status: 'Unknown',
    stateCode: gstin.slice(0, 2),
    registrationDate: null,
    registeredAddress: null,
    registeredCity: null,
    registeredState: null,
    verified: false,
  };
}

/**
 * Verify a GSTIN using a provider waterfall:
 *   1. Razorpay (free, using existing credentials)
 *   2. gstincheck.co.in API (requires GSTINCHECK_API_KEY)
 *   3. Unverified fallback — never blocks registration
 */
export async function verifyGstinFromApi(gstin: string): Promise<GstVerificationResult> {
  const normalized = gstin.toUpperCase().trim();

  if (!isValidGSTIN(normalized)) {
    throw new BadRequestError(
      `Invalid GSTIN format: ${normalized}. Expected 15-character Indian GSTIN (e.g. 27AADCB2230M1ZT).`,
    );
  }

  // 1. Try Razorpay (free with existing account credentials)
  const razorResult = await verifyViaRazorpay(normalized);
  if (razorResult) {
    console.info(`[gst:verify] ✅ Razorpay verified ${normalized} → ${razorResult.legalName}`);
    return razorResult;
  }

  // 2. Try free public API
  const publicResult = await verifyViaPublicApi(normalized);
  if (publicResult) {
    console.info(`[gst:verify] ✅ Public API verified ${normalized} → ${publicResult.legalName}`);
    return publicResult;
  }

  // 3. Graceful fallback — flag for manual review, don't block
  console.warn(`[gst:verify] ⚠️ All providers failed for ${normalized} — queued for manual review`);
  return fallbackResult(normalized);
}
