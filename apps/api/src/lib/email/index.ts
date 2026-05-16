/**
 * Email service – Zoho Business Email via SMTP (nodemailer)
 *
 * Exports:
 *   sendEmail()                   – low-level send helper
 *   sendVerificationEmail()       – email-verification flow
 *   sendTravellerWelcomeEmail()   – welcome email for Traveller accounts
 *   sendAgencyWelcomeEmail()      – welcome email for Agency accounts
 */

import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../env.js';
import {
  getVerificationEmailHtml,
  getVerificationEmailText,
} from './templates/verification.js';
import {
  getTravellerWelcomeEmailHtml,
  getTravellerWelcomeEmailText,
} from './templates/traveller-welcome.js';
import {
  getAgencyWelcomeEmailHtml,
  getAgencyWelcomeEmailText,
} from './templates/agency-welcome.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// ─── Transporter (singleton, lazy init) ──────────────────────────────────────

let _transporter: Transporter | null = null;

/** Call this in tests or after env changes to force a fresh transporter. */
export function resetTransporter(): void {
  _transporter = null;
}

function getTransporter(): Transporter {
  if (_transporter) return _transporter;

  if (!env.ZOHO_EMAIL || !env.ZOHO_EMAIL_PASSWORD) {
    // Dev/test mode – log emails to console instead of sending
    console.warn('[email] ZOHO_EMAIL / ZOHO_EMAIL_PASSWORD not set. Emails will be logged only.');
    _transporter = nodemailer.createTransport({ jsonTransport: true });
    return _transporter;
  }

  console.log(
    `[email] Creating SMTP transporter → host=${env.ZOHO_SMTP_HOST} port=${env.ZOHO_SMTP_PORT} secure=${env.ZOHO_SMTP_SECURE} user=${env.ZOHO_EMAIL}`,
  );

  _transporter = nodemailer.createTransport({
    host: env.ZOHO_SMTP_HOST,
    port: env.ZOHO_SMTP_PORT,
    secure: env.ZOHO_SMTP_SECURE, // true → port 465 (SSL), false → STARTTLS
    auth: {
      user: env.ZOHO_EMAIL,
      pass: env.ZOHO_EMAIL_PASSWORD,
    },
  });

  return _transporter;
}

// ─── Core send helper ─────────────────────────────────────────────────────────

/**
 * Sends an email via Zoho SMTP.
 * In dev mode (no credentials), the email content is printed to the console.
 */
export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const transporter = getTransporter();

  const mailOptions = {
    from: `"${env.APP_NAME}" <${env.ZOHO_EMAIL || 'noreply@example.com'}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  };

  // Dev mode – transporter uses jsonTransport, print the message
  if (!env.ZOHO_EMAIL || !env.ZOHO_EMAIL_PASSWORD) {
    const info = await transporter.sendMail(mailOptions);
    console.log(
      `[email:dev] Would send "${options.subject}" to ${options.to}\n`,
      JSON.parse((info as any).message ?? '{}'),
    );
    return;
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[email] Sent "${options.subject}" to ${options.to} – id: ${info.messageId}`);
  } catch (err) {
    // Log the error but don't crash the signup flow
    console.error(`[email] Failed to send "${options.subject}" to ${options.to}:`, err);
    throw err; // re-throw so callers can decide whether to surface the error
  }
}

// ─── High-level helpers ───────────────────────────────────────────────────────

/**
 * Sends the email-verification email to a newly signed-up user.
 */
export async function sendVerificationEmail(params: {
  to: string;
  fullName: string;
  verificationToken: string;
}): Promise<void> {
  const verificationUrl = `${env.FRONTEND_URL}/verify-email?token=${params.verificationToken}`;

  await sendEmail({
    to: params.to,
    subject: `Verify your email – ${env.APP_NAME}`,
    html: getVerificationEmailHtml({
      fullName: params.fullName,
      verificationUrl,
      appName: env.APP_NAME,
      expiryHours: 24,
    }),
    text: getVerificationEmailText({
      fullName: params.fullName,
      verificationUrl,
      appName: env.APP_NAME,
      expiryHours: 24,
    }),
  });
}

/**
 * Sends the welcome email to a newly registered Traveller account.
 */
export async function sendTravellerWelcomeEmail(params: {
  to: string;
  fullName: string;
}): Promise<void> {
  const dashboardUrl = `${env.FRONTEND_URL}/dashboard`;

  await sendEmail({
    to: params.to,
    subject: `Welcome to ${env.APP_NAME} – Your adventure starts now! 🚀`,
    html: getTravellerWelcomeEmailHtml({
      fullName: params.fullName,
      dashboardUrl,
      appName: env.APP_NAME,
      websiteUrl: env.FRONTEND_URL,
    }),
    text: getTravellerWelcomeEmailText({
      fullName: params.fullName,
      dashboardUrl,
      appName: env.APP_NAME,
      websiteUrl: env.FRONTEND_URL,
    }),
  });
}

/**
 * Sends the welcome email to a newly registered Agency account.
 */
export async function sendAgencyWelcomeEmail(params: {
  to: string;
  fullName: string;
  agencyName: string;
}): Promise<void> {
  const dashboardUrl = `${env.FRONTEND_URL}/agency/dashboard`;

  await sendEmail({
    to: params.to,
    subject: `Welcome to ${env.APP_NAME} – Agency Partner Account Created 🏢`,
    html: getAgencyWelcomeEmailHtml({
      fullName: params.fullName,
      agencyName: params.agencyName,
      dashboardUrl,
      appName: env.APP_NAME,
      websiteUrl: env.FRONTEND_URL,
    }),
    text: getAgencyWelcomeEmailText({
      fullName: params.fullName,
      agencyName: params.agencyName,
      dashboardUrl,
      appName: env.APP_NAME,
      websiteUrl: env.FRONTEND_URL,
    }),
  });
}
