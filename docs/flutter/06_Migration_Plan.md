# Flutter Migration Plan

## Phase 0 — contract baseline

Freeze an API environment configuration (dev/staging/prod), document error payloads, and create generated/manual Dart DTOs from the existing Zod/API contract. Add API contract tests for auth, plan/package, group, payment, and socket event payloads. Resolve current inconsistencies before mobile release (for example, wallet admin endpoints only use `authenticate` despite comments saying admin).

## Phase 1 — foundation and public experience

Implement theme, routing, Dio envelope/error layer, secure session storage, single-flight token refresh, login/signup, logout, and public home/discovery/detail/profile/agency screens. Verify deep links and public endpoint error states.

## Phase 2 — traveler core

Add dashboard, profile/settings/KYC, plan wizard/lifecycle, packages browsing, group join/approval/trips, offer comparison/acceptance, and group chat. Implement notifications and direct messages with socket reconnect/catch-up.

## Phase 3 — commerce and trust

Add checkout preview, promo/points/wallet input, Razorpay handoff and verification, payment tracking, invoices, escrow status, disputes, loyalty, referral wallet/link, reviews, and KYC direct upload. Test pending, mock, Razorpay, failed, and double-submit branches.

## Phase 4 — agency workspace

Build agency dashboard, packages editor/publishing, open plans/referrals/bids and counter-offers, group/inbox chat, analytics, finance/payout/invoices, team, CRM/campaign, bank and KYC management. Hide admin-only API operations unless an intentional admin Flutter surface is in scope.

## Phase 5 — hardening and rollout

Run accessibility, slow-network, background/resume, token expiry, reconnect, Android/iOS payment, and device security testing. Use feature flags and staged beta distribution. Monitor API errors, refresh failures, socket disconnects, payment verification failures, upload failures, and screen funnels before broad release.

## Explicit non-goals for initial Flutter work

Do not duplicate backend business logic, invoke webhooks, access private S3 keys, or assume a generic file-upload endpoint. Keep the web app operational during the migration; Flutter consumes the existing REST/Socket.IO contract and should be released incrementally by feature.
