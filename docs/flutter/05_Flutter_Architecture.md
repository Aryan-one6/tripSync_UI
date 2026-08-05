# Flutter Architecture

## Proposed stack

Flutter stable, Dart 3, `go_router`, `flutter_riverpod`, `dio`, `freezed`/`json_serializable`, `flutter_secure_storage`, `socket_io_client`, and a Razorpay Flutter plugin evaluated against current platform requirements. Use a feature-first structure:

`lib/core` (config, Dio, auth interceptor, errors, secure storage, routing, theme); `lib/features/{auth,discover,plans,packages,groups,offers,chat,payments,wallet,agency,social,notifications,...}` with `data`, `domain`, and `presentation`; `lib/shared` for design primitives.

## Networking

One Dio client handles `/api/v1`, JSON envelope extraction, `Authorization`, request timeout, validation errors, and queued single-flight refresh. On 401, one refresh request must be shared among concurrent failures; replay each original request exactly once. Logout on refresh failure. Keep public calls unauthenticated and do not attach a stale token. Support cursor pagination with IDs, not offsets.

Use repository providers as the sole REST entry point. Cache successful lists/details in memory per session and invalidate after mutations/events. Avoid exposing raw API envelopes to widgets.

## State and real time

Create an authenticated socket service from the current access token. On refresh reconnect the socket; on app resume reconnect and REST-refetch active chat/notification/wallet/trip data. Socket events are invalidation/optimistic-update signals, not the only data source. Subscribe explicitly while a group/direct chat is visible and unsubscribe when it closes. Chat screens need pagination, dedupe by message ID, optimistic messages with failure state, and typing debounce.

## Security and payments

Persist only `AuthSession` in secure storage. Never log tokens, Aadhaar, bank/KYC data, or payment signatures. Use HTTPS outside development. Request KYC presigned URL, upload directly with the returned content type, then record metadata; never persist the presigned URL. Payment client creates order first, opens Razorpay with returned key/order/amount, and sends the returned ID/signature only to `/payments/verify`; the backend decides capture and escrow state.

## Offline and observability

Offline support should be read cache plus clear retry UI, not offline financial/chat mutations. Disable duplicate submits while a request is active. Add structured redacted logs, crash reporting, analytics only after consent, and integration tests around token refresh, checkout, KYC upload, deep links, and reconnect behavior.
