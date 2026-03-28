import crypto from 'node:crypto';
import { env } from './env.js';

export interface AadhaarKycRequest {
  aadhaarNumber: string;
  fullName: string;
  dateOfBirth: string;
}

export interface AadhaarKycResult {
  provider: 'mock' | 'digilocker';
  referenceId: string;
  fullName: string;
  dateOfBirth: string;
  aadhaarHash: string;
  maskedAadhaar: string;
}

function hashAadhaar(aadhaarNumber: string) {
  return crypto.createHash('sha256').update(aadhaarNumber).digest('hex');
}

function maskAadhaar(aadhaarNumber: string) {
  return `XXXX-XXXX-${aadhaarNumber.slice(-4)}`;
}

function isObviouslyInvalidAadhaar(aadhaarNumber: string) {
  return /^(\d)\1{11}$/.test(aadhaarNumber) || aadhaarNumber.startsWith('0');
}

async function verifyWithConfiguredProvider(
  data: AadhaarKycRequest,
): Promise<AadhaarKycResult> {
  const response = await fetch(env.DIGILOCKER_VERIFY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': env.DIGILOCKER_CLIENT_ID,
      'x-client-secret': env.DIGILOCKER_CLIENT_SECRET,
    },
    body: JSON.stringify({
      aadhaarNumber: data.aadhaarNumber,
      fullName: data.fullName,
      dateOfBirth: data.dateOfBirth,
      consent: true,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`DigiLocker verification failed: ${body || response.statusText}`);
  }

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  return {
    provider: 'digilocker',
    referenceId:
      String(payload.referenceId ?? payload.kycId ?? payload.id ?? crypto.randomUUID()),
    fullName: String(payload.fullName ?? data.fullName),
    dateOfBirth: String(payload.dateOfBirth ?? data.dateOfBirth),
    aadhaarHash: hashAadhaar(data.aadhaarNumber),
    maskedAadhaar: String(payload.maskedAadhaar ?? maskAadhaar(data.aadhaarNumber)),
  };
}

export async function performAadhaarKyc(
  data: AadhaarKycRequest,
): Promise<AadhaarKycResult> {
  if (isObviouslyInvalidAadhaar(data.aadhaarNumber)) {
    throw new Error('Aadhaar verification failed');
  }

  if (
    env.DIGILOCKER_VERIFY_URL &&
    env.DIGILOCKER_CLIENT_ID &&
    env.DIGILOCKER_CLIENT_SECRET
  ) {
    return verifyWithConfiguredProvider(data);
  }

  return {
    provider: 'mock',
    referenceId: `mock_${crypto.randomUUID()}`,
    fullName: data.fullName,
    dateOfBirth: data.dateOfBirth,
    aadhaarHash: hashAadhaar(data.aadhaarNumber),
    maskedAadhaar: maskAadhaar(data.aadhaarNumber),
  };
}
