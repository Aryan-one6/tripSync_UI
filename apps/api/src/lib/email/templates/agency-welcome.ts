/**
 * Agency welcome email template
 * Sent after a new Agency account is successfully created.
 */

export interface AgencyWelcomeEmailData {
  fullName: string;
  agencyName: string;
  dashboardUrl: string;
  appName: string;
  websiteUrl: string;
}

/**
 * Returns the HTML body for the agency welcome email.
 */
export function getAgencyWelcomeEmailHtml(data: AgencyWelcomeEmailData): string {
  const { fullName, agencyName, dashboardUrl, appName, websiteUrl } = data;
  const firstName = fullName.split(' ')[0] ?? fullName;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to ${appName} – Agency Partner</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f6fb; color: #1a1a2e; }
    .wrapper { max-width: 620px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #0f2a44 0%, #1e5080 100%); padding: 36px 40px; text-align: center; }
    .header-logo { font-size: 28px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; }
    .header-logo span { color: #60c4ff; }
    .header-badge { display: inline-block; background: rgba(96,196,255,0.15); border: 1px solid rgba(96,196,255,0.4); color: #60c4ff; font-size: 11px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; padding: 4px 12px; border-radius: 50px; margin-top: 10px; }
    .hero-banner { background: linear-gradient(180deg, #e8f0fa 0%, #ffffff 100%); padding: 32px 40px 0; text-align: center; }
    .hero-emoji { font-size: 56px; }
    .hero-title { font-size: 26px; font-weight: 800; color: #1a1a2e; margin-top: 12px; }
    .hero-subtitle { font-size: 15px; color: #4a4a6a; margin-top: 8px; }
    .agency-badge { display: inline-block; background: #e8f5e9; border: 1px solid #a5d6a7; color: #2e7d32; font-size: 13px; font-weight: 700; padding: 6px 16px; border-radius: 50px; margin-top: 16px; }
    .body { padding: 32px 40px; }
    .text { font-size: 15px; color: #4a4a6a; line-height: 1.7; margin-bottom: 16px; }
    .features { gap: 0; margin: 24px 0; }
    .feature-item { display: flex; align-items: flex-start; gap: 14px; padding: 16px 0; border-bottom: 1px solid #e8ecf3; }
    .feature-item:last-child { border-bottom: none; }
    .feature-icon { font-size: 24px; flex-shrink: 0; margin-top: 2px; }
    .feature-title { font-size: 15px; font-weight: 700; color: #1a1a2e; margin-bottom: 2px; }
    .feature-desc { font-size: 13px; color: #6a6a8a; line-height: 1.5; }
    .info-box { background: #f0f7ff; border: 1px solid #b3d4f5; border-radius: 10px; padding: 16px 20px; margin: 20px 0; font-size: 14px; color: #1e3a5f; line-height: 1.6; }
    .info-box strong { display: block; margin-bottom: 4px; font-size: 15px; }
    .cta-wrapper { text-align: center; margin: 32px 0; }
    .cta-btn { display: inline-block; background: linear-gradient(135deg, #0f2a44 0%, #1e5080 100%); color: #ffffff !important; text-decoration: none; font-size: 16px; font-weight: 700; padding: 16px 40px; border-radius: 50px; letter-spacing: 0.3px; }
    .cta-secondary { display: inline-block; margin-top: 14px; color: #1e5080; font-size: 14px; text-decoration: none; }
    .divider { border: none; border-top: 1px solid #e8ecf3; margin: 24px 0; }
    .footer { background: #f4f6fb; padding: 24px 40px; text-align: center; }
    .footer-text { font-size: 12px; color: #9090aa; line-height: 1.6; }
    .footer-text a { color: #1e5080; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <!-- Header / Brand -->
    <div class="header">
      <div class="header-logo">${appName.split(' ')[0]}<span>${appName.split(' ').slice(1).join(' ') || ''}</span></div>
      <div class="header-badge">Agency Partner</div>
    </div>

    <!-- Hero -->
    <div class="hero-banner">
      <div class="hero-emoji">🏢</div>
      <div class="hero-title">Welcome, ${firstName}!</div>
      <div class="hero-subtitle">Your agency profile is live and ready.</div>
      <div class="agency-badge">✅ ${agencyName}</div>
    </div>

    <!-- Body -->
    <div class="body">
      <p class="text">
        Congratulations! Your agency profile for <strong>${agencyName}</strong> has been created successfully
        on <strong>${appName}</strong>. You're now part of our verified network of travel agencies
        trusted by thousands of travellers across India.
      </p>

      <!-- Info box -->
      <div class="info-box">
        <strong>🎉 Your profile is under review</strong>
        Our team will verify your agency details within 24–48 hours. Once approved, your
        packages will be visible to travellers on the platform.
      </div>

      <!-- Feature highlights -->
      <div class="features">
        <div class="feature-item">
          <div class="feature-icon">📦</div>
          <div>
            <div class="feature-title">Create & Manage Packages</div>
            <div class="feature-desc">List your travel packages and manage availability, pricing, and itineraries.</div>
          </div>
        </div>
        <div class="feature-item">
          <div class="feature-icon">📋</div>
          <div>
            <div class="feature-title">Manage Bookings & Leads</div>
            <div class="feature-desc">View incoming booking requests, respond to group plans, and convert leads.</div>
          </div>
        </div>
        <div class="feature-item">
          <div class="feature-icon">👥</div>
          <div>
            <div class="feature-title">Customer Management</div>
            <div class="feature-desc">Track your customers, view booking history, and build lasting relationships.</div>
          </div>
        </div>
        <div class="feature-item">
          <div class="feature-icon">💰</div>
          <div>
            <div class="feature-title">Secure Escrow Payouts</div>
            <div class="feature-desc">Receive guaranteed payouts via our escrow system after trip milestones are met.</div>
          </div>
        </div>
        <div class="feature-item">
          <div class="feature-icon">📊</div>
          <div>
            <div class="feature-title">Analytics Dashboard</div>
            <div class="feature-desc">Track earnings, reviews, performance metrics, and growth insights.</div>
          </div>
        </div>
      </div>

      <!-- Primary CTA -->
      <div class="cta-wrapper">
        <a href="${dashboardUrl}" class="cta-btn" target="_blank" rel="noopener noreferrer">
          🚀 &nbsp;Go to Agency Dashboard
        </a>
        <br />
        <a href="${websiteUrl}" class="cta-secondary" target="_blank" rel="noopener noreferrer">
          Visit ${appName} →
        </a>
      </div>

      <hr class="divider" />

      <p class="text" style="font-size:13px; text-align:center; color:#6a6a8a;">
        Need help getting started? Our team is happy to assist.<br />
        <a href="mailto:connect@travellersin.com" style="color:#1e5080;">connect@travellersin.com</a>
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
 * Returns the plain-text fallback for the agency welcome email.
 */
export function getAgencyWelcomeEmailText(data: AgencyWelcomeEmailData): string {
  const { fullName, agencyName, dashboardUrl, appName, websiteUrl } = data;
  const firstName = fullName.split(' ')[0] ?? fullName;

  return `Welcome to ${appName}, ${firstName}!

Your agency profile for "${agencyName}" has been created successfully. 🎉

Your profile is currently under review. Our team will verify your details within 24–48 hours. Once approved, your packages will be visible to travellers.

Here's what you can do on your dashboard:
- Create and manage travel packages
- Manage bookings and leads from travellers
- Track customer history and communications
- Receive secure escrow payouts
- Monitor earnings and performance analytics

Go to your Agency Dashboard:
${dashboardUrl}

Visit ${appName}:
${websiteUrl}

Questions? Contact us at connect@travellersin.com

— The ${appName} Team
`;
}
