/**
 * Email service – ZeptoMail Email API over HTTPS
 *
 * Exports:
 *   sendEmail()                   – low-level send helper
 *   sendVerificationEmail()       – email-verification flow
 *   sendTravellerWelcomeEmail()   – welcome email for Traveller accounts
 *   sendAgencyWelcomeEmail()      – welcome email for Agency accounts
 */

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

function hasZeptoConfig() {
  const fromAddress = env.ZEPTOMAIL_FROM_ADDRESS || env.ZOHO_EMAIL;
  return Boolean(env.ZEPTOMAIL_API_KEY && fromAddress);
}

// ─── Core send helper ─────────────────────────────────────────────────────────

/**
 * Sends an email via ZeptoMail API.
 * In dev mode (no API key), the email content is printed to the console.
 */
export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const fromAddress = env.ZEPTOMAIL_FROM_ADDRESS || env.ZOHO_EMAIL || 'noreply@example.com';

  if (!hasZeptoConfig()) {
    if (env.NODE_ENV === 'production') {
      throw new Error(
        'ZeptoMail is not configured: set ZEPTOMAIL_API_KEY and ZEPTOMAIL_FROM_ADDRESS.',
      );
    }
    console.warn('[email] ZEPTOMAIL_API_KEY not set. Email will be logged only.');
    console.log('[email:dev] Mock email payload:', {
      from: fromAddress,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    return;
  }

  const payload: Record<string, unknown> = {
    from: { address: fromAddress, name: env.APP_NAME },
    to: [{ email_address: { address: options.to } }],
    subject: options.subject,
    htmlbody: options.html,
  };

  if (options.text) {
    payload['textbody'] = options.text;
  }

  try {
    const response = await fetch(env.ZEPTOMAIL_API_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Zoho-enczapikey ${env.ZEPTOMAIL_API_KEY}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });

    const bodyText = await response.text();
    let bodyJson: unknown = null;
    try {
      bodyJson = bodyText ? JSON.parse(bodyText) : null;
    } catch {
      bodyJson = bodyText;
    }

    if (!response.ok) {
      throw new Error(`ZeptoMail API failed (${response.status}): ${JSON.stringify(bodyJson)}`);
    }

    console.log(`[email] Sent "${options.subject}" to ${options.to} via ZeptoMail`, bodyJson);
  } catch (err) {
    console.error(`[email] Failed to send "${options.subject}" to ${options.to} via ZeptoMail:`, err);
    throw err;
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
