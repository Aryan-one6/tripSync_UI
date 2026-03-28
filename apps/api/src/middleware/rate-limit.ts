import rateLimit from 'express-rate-limit';

// General: 100 req/min per IP
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { errors: [{ code: 'RATE_LIMIT', message: 'Too many requests' }] },
});

// Auth endpoints: 30/min
export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { errors: [{ code: 'RATE_LIMIT', message: 'Too many auth requests' }] },
});

// OTP send: 10/min
export const otpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { errors: [{ code: 'RATE_LIMIT', message: 'Too many OTP requests' }] },
});
