import { redis } from '../../lib/redis.js';
import { env } from '../../lib/env.js';
import { BadRequestError } from '../../lib/errors.js';

const OTP_EXPIRY = 300; // 5 minutes
const OTP_RATE_LIMIT = 3; // max attempts per phone per hour
const RATE_LIMIT_WINDOW = 3600; // 1 hour

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOtpViaMsg91(phone: string, otp: string): Promise<void> {
  if (!env.MSG91_AUTH_KEY || !env.MSG91_TEMPLATE_ID) {
    throw new Error('MSG91 credentials are not configured');
  }

  const params = new URLSearchParams({
    authkey: env.MSG91_AUTH_KEY,
    template_id: env.MSG91_TEMPLATE_ID,
    mobile: `91${phone}`,
    otp,
  });

  const response = await fetch(`https://control.msg91.com/api/v5/otp?${params.toString()}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`MSG91 OTP send failed (${response.status}): ${body}`);
  }
}

export async function sendOtp(phone: string): Promise<void> {
  // Rate limiting
  const rateKey = `otp:rate:${phone}`;
  const attempts = await redis.incr(rateKey);
  if (attempts === 1) {
    await redis.expire(rateKey, RATE_LIMIT_WINDOW);
  }
  if (attempts > OTP_RATE_LIMIT) {
    throw new BadRequestError('Too many OTP requests. Try again later.');
  }

  const otp = generateOtp();
  const otpKey = `otp:${phone}`;
  await redis.setex(otpKey, OTP_EXPIRY, otp);

  if (env.NODE_ENV === 'development' || !env.MSG91_AUTH_KEY || !env.MSG91_TEMPLATE_ID) {
    console.log(`[DEV] OTP for ${phone}: ${otp}`);
    return;
  }

  await sendOtpViaMsg91(phone, otp);
}

export async function verifyOtp(phone: string, otp: string): Promise<boolean> {
  const otpKey = `otp:${phone}`;
  const stored = await redis.get(otpKey);

  if (!stored) {
    return false;
  }

  if (stored !== otp) {
    return false;
  }

  // OTP is valid — delete it so it can't be reused
  await redis.del(otpKey);
  return true;
}
