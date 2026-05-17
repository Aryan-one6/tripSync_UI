/**
 * Email verification template
 * Sent when a new user signs up and needs to verify their email address.
 */

export interface VerificationEmailData {
  fullName: string;
  verificationUrl: string;
  appName: string;
  brandLogoUrl?: string;
  expiryHours?: number;
}

/**
 * Returns the HTML body for the email verification email.
 */
export function getVerificationEmailHtml(data: VerificationEmailData): string {
  const { fullName, verificationUrl, appName, brandLogoUrl, expiryHours = 24 } = data;
  const firstName = fullName.split(' ')[0] ?? fullName;
  const logo = brandLogoUrl?.trim() || '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify Your Email – ${appName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f2f7f5; color: #1f2937; }
    .wrapper { max-width: 620px; margin: 40px auto; background: #ffffff; border-radius: 18px; overflow: hidden; box-shadow: 0 8px 28px rgba(5, 150, 105, 0.12); }
    .header { background: linear-gradient(135deg, #065f46 0%, #059669 65%, #10b981 100%); padding: 28px 30px; text-align: center; border-bottom: 4px solid #f59e0b; }
    .header-logo-img { max-width: 240px; width: 100%; height: auto; margin: 0 auto 10px; display: block; }
    .header-logo-fallback { font-size: 30px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; }
    .header-logo-fallback span { color: #fbbf24; }
    .header-tagline { color: rgba(255,255,255,0.88); font-size: 13px; margin-top: 4px; }
    .body { padding: 38px 34px; }
    .greeting { font-size: 23px; font-weight: 800; color: #064e3b; margin-bottom: 14px; }
    .text { font-size: 15px; color: #334155; line-height: 1.72; margin-bottom: 16px; }
    .cta-wrapper { text-align: center; margin: 32px 0; }
    .cta-btn { display: inline-block; background: linear-gradient(135deg, #047857 0%, #10b981 100%); color: #ffffff !important; text-decoration: none; font-size: 16px; font-weight: 800; padding: 15px 36px; border-radius: 999px; letter-spacing: 0.2px; box-shadow: 0 10px 18px rgba(16, 185, 129, 0.3); }
    .divider { border: none; border-top: 1px solid #e2e8f0; margin: 28px 0; }
    .expiry-note { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 10px; padding: 14px 18px; font-size: 13px; color: #92400e; margin-bottom: 22px; }
    .expiry-note strong { color: #78350f; }
    .fallback-link { font-size: 13px; color: #334155; line-height: 1.7; }
    .fallback-link a { color: #047857; font-weight: 700; text-decoration: none; }
    .footer { background: #f8fafc; padding: 22px 34px; text-align: center; border-top: 1px solid #e2e8f0; }
    .footer-text { font-size: 12px; color: #64748b; line-height: 1.6; }
    .footer-text a { color: #047857; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <!-- Header / Brand -->
    <div class="header">
      ${
        logo
          ? `<img class="header-logo-img" src="${logo}" alt="${appName} logo" />`
          : `<div class="header-logo-fallback">${appName.split(' ')[0]}<span>${appName.split(' ').slice(1).join(' ') || ''}</span></div>`
      }
      <div class="header-tagline">Your trusted travel companion</div>
    </div>

    <!-- Body -->
    <div class="body">
      <p class="greeting">Hi ${firstName}, please verify your email 👋</p>
      <p class="text">
        Thank you for creating your account on <strong>${appName}</strong>. To keep your account secure and
        unlock all features, we need to confirm that this email address belongs to you.
      </p>
      <p class="text">
        Click the button below to verify your email address:
      </p>

      <!-- CTA Button -->
      <div class="cta-wrapper">
        <a href="${verificationUrl}" class="cta-btn" target="_blank" rel="noopener noreferrer">
          ✉️ &nbsp;Verify My Email
        </a>
      </div>

      <!-- Expiry notice -->
      <div class="expiry-note">
        ⏰ <strong>Important:</strong> This verification link will expire in
        <strong>${expiryHours} hour${expiryHours !== 1 ? 's' : ''}</strong>.
        If it expires, you can request a new one from the login page.
      </div>

      <hr class="divider" />

      <!-- Fallback link -->
      <p class="fallback-link">
        If the button above doesn't work, open this secure verification link:<br />
        <a href="${verificationUrl}" target="_blank" rel="noopener noreferrer">Open secure verification page</a>
      </p>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p class="footer-text">
        You're receiving this because someone used your email to create a ${appName} account.<br />
        If this wasn't you, you can safely ignore this email.<br /><br />
        &copy; ${new Date().getFullYear()} ${appName}. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Returns the plain-text fallback for the email verification email.
 */
export function getVerificationEmailText(data: VerificationEmailData): string {
  const { fullName, verificationUrl, appName, expiryHours = 24 } = data;
  const firstName = fullName.split(' ')[0] ?? fullName;

  return `Hi ${firstName},

Thank you for creating your account on ${appName}!

Please verify your email address by visiting the link below:

${verificationUrl}

This link will expire in ${expiryHours} hour${expiryHours !== 1 ? 's' : ''}.

If you didn't create this account, please ignore this email.

— The ${appName} Team
`;
}
