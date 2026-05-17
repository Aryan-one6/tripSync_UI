import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.union([z.string().url(), z.literal('')]).default(''),
  REDIS_URL: z.union([z.string().url(), z.literal('')]).default(''),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  MSG91_AUTH_KEY: z.string().default(''),
  MSG91_TEMPLATE_ID: z.string().default(''),
  DIGILOCKER_VERIFY_URL: z.union([z.string().url(), z.literal('')]).default(''),
  DIGILOCKER_CLIENT_ID: z.string().default(''),
  DIGILOCKER_CLIENT_SECRET: z.string().default(''),
  GSTINCHECK_API_KEY: z.string().default(''),
  RAZORPAY_KEY_ID: z.string().default(''),
  RAZORPAY_KEY_SECRET: z.string().default(''),
  RAZORPAY_WEBHOOK_SECRET: z.string().default(''),
  WHATSAPP_ACCESS_TOKEN: z.string().default(''),
  WHATSAPP_PHONE_NUMBER_ID: z.string().default(''),
  WHATSAPP_API_VERSION: z.string().default('v22.0'),
  S3_BUCKET: z.string().default(''),
  S3_REGION: z.string().default(''),
  S3_ACCESS_KEY: z.string().default(''),
  S3_SECRET_KEY: z.string().default(''),
  S3_ENDPOINT: z.string().default(''),
  PORT: z.coerce.number().default(4010),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  VERCEL: z.string().default(''),
  // ─── Supabase Auth (email verification) ────────────────────────────────────
  SUPABASE_URL: z.string().default(''),
  SUPABASE_ANON_KEY: z.string().default(''),
  // ─── ZeptoMail API (recommended for hosted environments) ──────────────────
  ZEPTOMAIL_API_URL: z.string().url().default('https://api.zeptomail.in/v1.1/email'),
  ZEPTOMAIL_API_KEY: z.string().default(''),
  ZEPTOMAIL_FROM_ADDRESS: z.string().default(''),
  // ─── Zoho Business Email (SMTP) ────────────────────────────────────────────
  ZOHO_SMTP_HOST: z.string().default('smtp.zoho.com'),
  ZOHO_SMTP_PORT: z.coerce.number().default(465),
  ZOHO_SMTP_SECURE: z
    .string()
    .transform((v) => v === 'true' || v === '1')
    .default('true'),
  ZOHO_EMAIL: z.string().default(''),
  ZOHO_EMAIL_PASSWORD: z.string().default(''),
  APP_NAME: z.string().default('Travellers India'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment variables:');
    console.error(result.error.flatten().fieldErrors);
    process.exit(1);
  }
  return result.data;
}

export const env = loadEnv();
