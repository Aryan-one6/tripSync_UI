/**
 * Email verification template
 * Sent when a new user signs up and needs to verify their email address.
 */

export interface VerificationEmailData {
  fullName: string;
  verificationUrl: string;
  appName: string;
  expiryHours?: number;
}

/**
 * Returns the HTML body for the email verification email.
 */
export function getVerificationEmailHtml(data: VerificationEmailData): string {
  const { fullName, verificationUrl, appName, expiryHours = 24 } = data;
  const firstName = fullName.split(' ')[0] ?? fullName;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify Your Email – ${appName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f6fb; color: #1a1a2e; }
    .wrapper { max-width: 620px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #1e3a5f 0%, #2d6a9f 100%); padding: 36px 40px; text-align: center; }
    .header-logo { font-size: 28px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; }
    .header-logo span { color: #60c4ff; }
    .header-tagline { color: rgba(255,255,255,0.75); font-size: 13px; margin-top: 4px; }
    .body { padding: 40px; }
    .greeting { font-size: 22px; font-weight: 700; color: #1a1a2e; margin-bottom: 12px; }
    .text { font-size: 15px; color: #4a4a6a; line-height: 1.7; margin-bottom: 16px; }
    .cta-wrapper { text-align: center; margin: 32px 0; }
    .cta-btn { display: inline-block; background: linear-gradient(135deg, #1e3a5f 0%, #2d6a9f 100%); color: #ffffff !important; text-decoration: none; font-size: 16px; font-weight: 700; padding: 16px 40px; border-radius: 50px; letter-spacing: 0.3px; }
    .divider { border: none; border-top: 1px solid #e8ecf3; margin: 28px 0; }
    .expiry-note { background: #fff8e6; border: 1px solid #ffd966; border-radius: 10px; padding: 14px 18px; font-size: 13px; color: #7a5c00; margin-bottom: 24px; }
    .expiry-note strong { color: #5a4000; }
    .fallback-link { font-size: 13px; color: #4a4a6a; word-break: break-all; }
    .fallback-link a { color: #2d6a9f; }
    .footer { background: #f4f6fb; padding: 24px 40px; text-align: center; }
    .footer-text { font-size: 12px; color: #9090aa; line-height: 1.6; }
    .footer-text a { color: #2d6a9f; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <!-- Header / Brand -->
    <div class="header">
      <div class="header-logo">${appName.split(' ')[0]}<span>${appName.split(' ').slice(1).join(' ') || ''}</span></div>
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
        If the button above doesn't work, copy and paste this link into your browser:<br />
        <a href="${verificationUrl}">${verificationUrl}</a>
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
