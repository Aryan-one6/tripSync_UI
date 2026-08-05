# TripSync Flutter Project Analysis

## System shape

TripSync is a Turborepo travel marketplace. `apps/api` is Express 5 + Prisma/PostgreSQL; `apps/web` is a Next.js 16 reference client; `packages/shared` holds Zod request contracts. The API prefix is `/api/v1`, and successful responses are `{ "data": ... }`; cursor endpoints additionally return `meta.cursor`.

There are three JWT roles: `user`, `agency_admin`, and `platform_admin`. A user may own one agency. Core flows are traveler/agency onboarding, trip-plan bidding, published agency packages, group membership, group/direct chat, checkout and escrow, reviews, social follows, wallets/loyalty, referrals, invoices, and notifications.

## Authentication and authorization

Signup (`/auth/signup/traveler` or `/auth/signup/agency`) creates an account but deliberately does not return a session; the user logs in afterward. Login accepts email, username, or an Indian phone number and returns user, role, optional `agencyId`, and two HS256 JWTs. Access tokens expire in 15 minutes and refresh tokens in 30 days. Refresh validates the refresh JWT and creates a fresh pair; refresh tokens are not persisted/revocable server-side.

Protected REST calls require `Authorization: Bearer <accessToken>`. On the first 401, refresh once, replace the stored session, and retry once; if that fails, clear the session and route to login. Flutter must keep the full session in `flutter_secure_storage`, never shared preferences. The reference web app stores it in localStorage, which should not be copied.

Agency-only routes require `agency_admin` plus `agencyId`; some management operations additionally check an AgencyMember role in the service. Admin-only routes are marked in the API inventory. The server CORS configuration is web-oriented but mobile native requests are unaffected.

## Lifecycle highlights

1. A traveler creates and publishes a `Plan` (or an agency publishes a `Package`). Publishing exposes it in discovery.
2. Travelers join a linked `Group`; membership progresses INTERESTED → APPROVED → COMMITTED (or LEFT/REMOVED). A plan creator can approve/remove; auto-approve is supported.
3. Agencies submit/counter/withdraw offers on plans. The creator accepts one offer, creating/advancing the group and a confirming payment window.
4. Each committed traveler receives a checkout amount. Payment can use loyalty points, referral wallet credit, and an optional promo code, then Razorpay or mock capture. Captured funds enter escrow; the group locks once all commitments settle.
5. Escrow payout releases in two tranches. Completion releases the final tranche, increments completed trips, and grants loyalty points. Disputes pause release.

## Supporting integrations

- Razorpay: orders, signature verification, webhook verification, reconciliation, and an attempted Route payout. When unavailable, checkout is mock mode and payouts become manual.
- S3/R2-compatible object storage: only KYC file upload/download is implemented. The API returns a 5-minute presigned PUT URL and then receives metadata with the private S3 key. There is no generic image-upload API; plan/package/avatar image fields currently take URLs.
- Redis/BullMQ: used for queues, OTP-like durability, and Socket.IO adapter when configured. In-memory fallbacks exist. Socket and workers are disabled on Vercel.
- DigiLocker/mock Aadhaar verification, GST lookup, WhatsApp notification helper, and invoice services are optional environment-backed integrations.

## Flutter implications

Use a feature-first app with separate public, traveler, and agency navigation shells. Treat server enums as the source of truth; all money is integer paise in payment calculations/records despite some older UI comments calling values rupees. Parse dates as ISO-8601 UTC and display in India time zone where appropriate. Every mutation should surface API validation errors, guard duplicate submissions with an idempotency key where the API supports it, and refresh affected REST state after real-time events.

The web implementation includes some safe-fetch mock/fallback behavior. Flutter should show explicit empty/error/retry states rather than silently substituting mocks for API failures.
