/**
 * GST Verification Service — TripSync
 *
 * Validates Indian GSTIN format, checks uniqueness across the platform,
 * and fetches the company/trade name from a public GST verification API.
 *
 * GSTIN Format: 2-digit state + 10-digit PAN + 1 entity + 1 digit + 1 checksum = 15 chars
 * Example: 27AADCB2230M1ZT
 */

import { prisma } from './prisma.js';
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
 * GST verification response shape from public API
 */
export interface GstVerificationResult {
  gstin: string;
  legalName: string;       // registered legal name from GST records
  tradeName: string | null; // trade/brand name (may differ from legal)
  status: 'Active' | 'Inactive' | 'Cancelled' | 'Suspended' | string;
  stateCode: string;
  registrationDate: string | null;
  verified: boolean;
}

/**
 * Verify a GSTIN against the public GST verification API.
 *
 * Uses the free Appyflow/MasterIndia GST Search API endpoint.
 * In production, swap this with a paid provider (ClearTax, Suvit, MasterGST, etc.)
 * that gives higher rate limits and SLAs.
 *
 * Falls back gracefully if the API is unavailable — returns unverified result
 * so registration isn't blocked, but marks it as unverified for manual review.
 */
export async function verifyGstinFromApi(gstin: string): Promise<GstVerificationResult> {
  const normalized = gstin.toUpperCase().trim();

  if (!isValidGSTIN(normalized)) {
    throw new BadRequestError(
      `Invalid GSTIN format: ${normalized}. Expected 15-character Indian GSTIN (e.g. 27AADCB2230M1ZT).`,
    );
  }

  try {
    // Use the free public GST search API (rate-limited, best-effort)
    // In production, replace with a paid provider like ClearTax or MasterGST
    const response = await fetch(
      `https://sheet.gstincheck.co.in/check/${normalized}`,
      {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10_000), // 10s timeout
      },
    );

    if (!response.ok) {
      console.warn(`[gst:verify] API returned ${response.status} for ${normalized}`);
      return fallbackResult(normalized);
    }

    const data = await response.json() as {
      flag?: boolean;
      data?: {
        lgnm?: string;  // legal name
        tradeNam?: string;
        sts?: string;
        stcd?: string;
        rgdt?: string;
        gstin?: string;
      };
      error?: boolean;
      message?: string;
    };

    if (data.flag === false || data.error || !data.data) {
      console.warn(`[gst:verify] API error for ${normalized}:`, data.message);
      return fallbackResult(normalized);
    }

    const gstData = data.data;

    return {
      gstin: normalized,
      legalName: gstData.lgnm ?? 'Unknown',
      tradeName: gstData.tradeNam || null,
      status: gstData.sts ?? 'Unknown',
      stateCode: gstData.stcd ?? normalized.slice(0, 2),
      registrationDate: gstData.rgdt || null,
      verified: true,
    };
  } catch (err) {
    console.warn(`[gst:verify] Failed to verify ${normalized}:`, err instanceof Error ? err.message : err);
    return fallbackResult(normalized);
  }
}

function fallbackResult(gstin: string): GstVerificationResult {
  return {
    gstin,
    legalName: '',
    tradeName: null,
    status: 'Unknown',
    stateCode: gstin.slice(0, 2),
    registrationDate: null,
    verified: false,
  };
}
