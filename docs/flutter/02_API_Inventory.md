# API Inventory

Base URL: `NEXT_PUBLIC_API_BASE_URL` in web (normally `http://localhost:4010/api/v1`). Protected endpoints below require Bearer JWT unless noted. All standard success bodies wrap the result in `data`.

## Auth

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/auth/signup/traveler` | Public | Register traveler; full profile/password/referral input |
| POST | `/auth/signup/agency` | Public | Register user plus agency/GST details |
| POST | `/auth/login` | Public | Login; returns session/tokens |
| POST | `/auth/refresh` | Public | `refreshToken` → new session/tokens |
| GET/PATCH | `/auth/me` | User | Read/update current profile |
| GET | `/auth/me/verification` | User | Verification status/eligibility |
| POST | `/auth/me/verification/aadhaar` | User | Aadhaar KYC with consent |

## Marketplace and groups

| Resource | Routes |
|---|---|
| Plans | `POST /plans`; `GET /plans/slug/:slug`, `/plans/my`, `/:id`, `/:id/offers`, `/corporate/open`; `PATCH /plans/:id`; `POST /plans/:id/publish`, `/refer`, `/confirm`, `/cancel` |
| Packages | `POST /packages`; `GET /packages/slug/:slug`, `/my`, `/:id`; `PATCH /packages/:id`; `POST /packages/:id/publish` |
| Discovery | Public `GET /discover`, `/discover/trending`, `/discover/search`; protected `GET /discover/following` |
| Groups | `GET /groups/my`; `POST /groups/:id/join`, `/leave`, `/approve/:userId`, `/remove/:userId`, `/invite`, `/offers`; public `GET /groups/:id/members` |
| Offers | `GET /offers/my`, `/:id`; `POST /offers`, `/:id/counter`, `/:id/accept`, `/:id/reject`, `/:id/withdraw` |

Plan/package create and update contracts are in shared schemas. Galleries require 1–8 URL strings. Plan has standard/corporate variants; corporate traveler count is mandatory for `CORPORATE`. Discovery filters: audience, destination, date range, budget range, comma-separated vibes, origin type, group type, sort, cursor, limit (1–50).

## Chat, social, notifications

| Resource | Routes |
|---|---|
| Group chat | `GET/POST /chat/groups/:groupId/messages`; `POST /chat/groups/:groupId/polls`; `POST /chat/messages/:id/vote` |
| Direct chat | `POST/GET /chat/direct/conversations`; `GET/POST /chat/direct/conversations/:id/messages`; `POST /chat/direct/conversations/:id/read` |
| Social | Public `GET /social/feed`, `/profiles/:handle`, `/profiles/:handle/followers`, `/profiles/:handle/following`; protected `GET /social/feed/following`, follow state; `POST/DELETE /profiles/:handle/follow`; `POST /profiles/:handle/view` |
| Users | `GET /users/search` (protected), `/users/profile/:username` (public) |
| Notifications | `GET /notifications`, `/notifications/profile-views`; `POST /notifications/:id/read`, `/notifications/read-all` |
| Reviews | `GET /reviews/groups/:groupId/eligibility`, `/groups/:groupId`; `POST /reviews` |

Chat messages use text/system/poll/document types; send-content validation is 1–2000 chars. Message pagination takes optional UUID cursor and limit ≤50. Review creation requires exactly the applicable agency or co-traveler target.

## Payments, financial, and invoices

| Resource | Routes |
|---|---|
| Checkout | `GET /payments/groups/:id`, `/groups/:id/checkout`; `POST /payments/groups/:id/order`, `/promo/validate`, `/verify`, `/mock-capture` |
| Payments | `GET /payments/my`, `/tracking`; `POST /payments/groups/:id/complete` |
| Agency finance | `GET /payments/wallet/summary`, `/wallet/transactions`, `/agency/payouts`, `/invoices`; `GET /invoices/agency/me`, `/invoices/agency/settlement/:paymentId` |
| Traveler invoices | `GET /invoices/me`, `/invoices/:paymentId` |
| Disputes/admin | `POST/GET /payments/disputes`; admin `POST /disputes/:id/resolve`, `/confirming-window/resolve`, `/reconcile`, `/agency/payout/:paymentId`; admin `GET /payments/admin/map` |
| User wallet | `GET /wallet/balance`, `/transactions`, `/monthly-summary`; currently merely authenticated (not properly admin-gated) `GET /wallet/admin/cashflow-audit`, `/admin/reconciliation` |
| Loyalty | `GET /loyalty/balance`, `/ledger`; admin `POST /loyalty/admin/adjust`, `/admin/expire` |

Order body: optional `pointsToRedeem`, `walletAmountToUse`, `promoCode`. Verify body: payment UUID, Razorpay order/payment IDs, signature. Razorpay webhook is public raw-body `POST /payments/webhook/razorpay` (outside JSON middleware); Flutter never calls it.

## Agencies, referrals, and file security

| Resource | Routes |
|---|---|
| Agencies | Public `GET /agencies/browse`, `/:slug`, `/gst/verify`; protected create/update/verification, member CRUD, analytics/calendar/risk flags, insurance quotes, CRM customers/campaigns, trust evaluation (admin) |
| Bank/KYC | `POST /agencies/:id/bank/verify`; `GET /:id/bank`; `POST/GET /:id/kyc/documents`; admin `GET /:id/kyc/documents/:docId/download`; `POST /:id/kyc/upload-url` |
| Referrals | Agency `GET /referrals/my`; all users `GET /my-link`, `/my-referrals`, `/stats`, `/metrics`; `POST /generate-link` |

KYC flow: request upload URL with `{mimeType,fileName}`, upload bytes directly by HTTP PUT to returned URL, then POST document metadata `{docType,s3Key,fileName,mimeType}`. Do not send multipart through the API. Allowed types are PDF/JPEG/PNG/WEBP.

## Socket.IO contract

Connect to socket base URL with `auth: { token: accessToken }` (or Bearer header). Server joins `user:<id>`, agency, approved/committed group, and direct-conversation rooms. Client emits `group:subscribe/unsubscribe`, `direct:subscribe/unsubscribe`, `group:typing`, `direct:typing`. Listen for `chat:typing`, `direct:typing`, `chat:message_created/updated`, `direct:message_created`, `group:member_updated`, `offer:created/countered/updated/rejected`, `payment:captured`, `payment:plan_confirmed`, `trip:completed`, `notification:created`, `wallet:balance-updated`, `referral:new-invite`, `referral:status-changed`, and `review:created`. Reconnect after token refresh.
