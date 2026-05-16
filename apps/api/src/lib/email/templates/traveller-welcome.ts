/**
 * Traveller welcome email template
 * Sent after a new Traveller/User account is successfully created.
 */

export interface TravellerWelcomeEmailData {
  fullName: string;
  dashboardUrl: string;
  appName: string;
  websiteUrl: string;
}

/**
 * Returns the HTML body for the traveller welcome email.
 */
export function getTravellerWelcomeEmailHtml(data: TravellerWelcomeEmailData): string {
  const { fullName, dashboardUrl, appName, websiteUrl } = data;
  const firstName = fullName.split(' ')[0] ?? fullName;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to ${appName}!</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f6fb; color: #1a1a2e; }
    .wrapper { max-width: 620px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #1e3a5f 0%, #2d6a9f 100%); padding: 36px 40px; text-align: center; }
    .header-logo { font-size: 28px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; }
    .header-logo span { color: #60c4ff; }
    .header-tagline { color: rgba(255,255,255,0.75); font-size: 13px; margin-top: 4px; }
    .hero-banner { background: linear-gradient(180deg, #eef5ff 0%, #ffffff 100%); padding: 32px 40px 0; text-align: center; }
    .hero-emoji { font-size: 56px; }
    .hero-title { font-size: 26px; font-weight: 800; color: #1a1a2e; margin-top: 12px; }
    .hero-subtitle { font-size: 15px; color: #4a4a6a; margin-top: 8px; }
    .body { padding: 32px 40px; }
    .text { font-size: 15px; color: #4a4a6a; line-height: 1.7; margin-bottom: 16px; }
    .features { display: grid; gap: 0; margin: 24px 0; }
    .feature-item { display: flex; align-items: flex-start; gap: 14px; padding: 16px 0; border-bottom: 1px solid #e8ecf3; }
    .feature-item:last-child { border-bottom: none; }
    .feature-icon { font-size: 24px; flex-shrink: 0; margin-top: 2px; }
    .feature-title { font-size: 15px; font-weight: 700; color: #1a1a2e; margin-bottom: 2px; }
    .feature-desc { font-size: 13px; color: #6a6a8a; line-height: 1.5; }
    .cta-wrapper { text-align: center; margin: 32px 0; }
    .cta-btn { display: inline-block; background: linear-gradient(135deg, #1e3a5f 0%, #2d6a9f 100%); color: #ffffff !important; text-decoration: none; font-size: 16px; font-weight: 700; padding: 16px 40px; border-radius: 50px; letter-spacing: 0.3px; }
    .cta-secondary { display: inline-block; margin-top: 14px; color: #2d6a9f; font-size: 14px; text-decoration: none; }
    .divider { border: none; border-top: 1px solid #e8ecf3; margin: 24px 0; }
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

    <!-- Hero -->
    <div class="hero-banner">
      <div class="hero-emoji">✈️</div>
      <div class="hero-title">Welcome aboard, ${firstName}!</div>
      <div class="hero-subtitle">Your traveller account is ready — the world is waiting.</div>
    </div>

    <!-- Body -->
    <div class="body">
      <p class="text">
        We're thrilled to have you join <strong>${appName}</strong>! Your account has been created
        successfully. You're now part of a growing community of passionate travellers discovering
        incredible destinations across India and beyond.
      </p>

      <!-- Feature highlights -->
      <div class="features">
        <div class="feature-item">
          <div class="feature-icon">🗺️</div>
          <div>
            <div class="feature-title">Discover Travel Deals</div>
            <div class="feature-desc">Browse curated packages from verified agencies at the best prices.</div>
          </div>
        </div>
        <div class="feature-item">
          <div class="feature-icon">👥</div>
          <div>
            <div class="feature-title">Join Group Trips</div>
            <div class="feature-desc">Connect with fellow travellers, form groups, and split costs effortlessly.</div>
          </div>
        </div>
        <div class="feature-item">
          <div class="feature-icon">🛡️</div>
          <div>
            <div class="feature-title">Secure Escrow Payments</div>
            <div class="feature-desc">Your money is protected until every travel milestone is delivered.</div>
          </div>
        </div>
        <div class="feature-item">
          <div class="feature-icon">⭐</div>
          <div>
            <div class="feature-title">Earn Loyalty Points</div>
            <div class="feature-desc">Book trips, refer friends, and earn points redeemable on future bookings.</div>
          </div>
        </div>
      </div>

      <!-- Primary CTA -->
      <div class="cta-wrapper">
        <a href="${dashboardUrl}" class="cta-btn" target="_blank" rel="noopener noreferrer">
          🚀 &nbsp;Go to My Dashboard
        </a>
        <br />
        <a href="${websiteUrl}" class="cta-secondary" target="_blank" rel="noopener noreferrer">
          Browse travel deals →
        </a>
      </div>

      <hr class="divider" />

      <p class="text" style="font-size:13px; text-align:center; color:#6a6a8a;">
        Questions? Reply to this email or reach us at
        <a href="mailto:connect@travellersin.com" style="color:#2d6a9f;">connect@travellersin.com</a>
      </p>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p class="footer-text">
        &copy; ${new Date().getFullYear()} ${appName}. All rights reserved.<br />
        <a href="${websiteUrl}">Visit our website</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Returns the plain-text fallback for the traveller welcome email.
 */
export function getTravellerWelcomeEmailText(data: TravellerWelcomeEmailData): string {
  const { fullName, dashboardUrl, appName, websiteUrl } = data;
  const firstName = fullName.split(' ')[0] ?? fullName;

  return `Welcome to ${appName}, ${firstName}!

Your traveller account has been created successfully. 🎉

Here's what you can do now:
- Discover travel deals and packages from verified agencies
- Join group trips and connect with fellow travellers
- Make secure escrow-protected bookings
- Earn loyalty points on every trip

Go to your dashboard:
${dashboardUrl}

Browse travel deals:
${websiteUrl}

Questions? Contact us at connect@travellersin.com

— The ${appName} Team
`;
}
