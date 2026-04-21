# Referral + Wallet Rollout Runbook

## Rollout sequence (staged)

1. Schema rollout
- Deploy Prisma schema/migrations first.
- Confirm tables/indexes exist for `ReferralLink`, `ReferralTransaction`, `ReferralWallet`, `ReferralWalletTransaction`.
- Confirm unique indexes on referral code and idempotency keys are active.

2. Service rollout (backend)
- Deploy API service layer with:
  - wallet idempotency and validation
  - referral invite/completion events
  - payment checkout wallet+points validation
- Keep UI unchanged during this step.

3. API rollout
- Enable updated request/response contracts:
  - `POST /payments/groups/:groupId/order` accepts `walletAmountToUse`
  - checkout state includes `wallet` + `loyalty` blocks
  - wallet/referral list endpoints return standard `{ data: ... }` envelopes

4. UI rollout
- Deploy wallet realtime hooks (`useWalletBalance`)
- Deploy referral realtime hooks (`useReferralUpdates`)
- Deploy checkout wallet toggle + points redemption controls
- Deploy dashboard wallet route and sidebar wallet card

## Monitoring and alerts

## Accuracy metrics
- Wallet reconciliation delta (`sum(wallet checkout debits)` vs `sum(payment.walletAmountUsed)`) must stay at 0.
- Referral completion mismatch count (COMPLETED rows without both credits) must be 0.
- Duplicate idempotency violations for wallet/referral should be tracked (expect rare, recoverable).

## Product metrics
- Checkout conversion rate before/after wallet toggle launch.
- Share-to-signup referral conversion rate.
- Referral completion rate (INVITED -> COMPLETED).

## Runtime metrics
- `wallet:balance-updated` socket event delivery latency p95 < 1s.
- API error rate on:
  - `/payments/groups/:groupId/order`
  - `/referrals/generate-link`
  - `/wallet/balance`

## Operational checks
- Daily cashflow audit export review.
- Weekly idempotency collision report review.
- Backfill/reconciliation script run if discrepancy count > 0.

## Rollback plan
- UI rollback first (feature flags/routes) if checkout errors spike.
- API rollback second if wallet/referral mutation errors spike.
- Schema rollback only if absolutely required; prefer forward-fix migrations.

## Frontend integration checklist (manual)

1. Realtime wallet header
- Open two tabs as same user.
- Complete a referral credit or wallet checkout deduction in one tab.
- Verify header wallet balance updates in both tabs within 1 second.

2. Refer & Earn realtime updates
- Generate referral link and sign up new user with it.
- Verify `Refer & Earn` page shows new invite without manual refresh.
- Complete referred profile and verify status updates to `COMPLETED`.

3. Checkout calculation correctness
- Validate formula: `final = total - walletUsed - pointsUsed`.
- Toggle wallet on/off and verify preview updates correctly.
- Enter points above max and verify UI clamps value.

4. Wallet toggle behavior
- Wallet auto-applies by default when balance > 0.
- Deselecting wallet removes wallet discount from preview.
- Repeating `Pay now` for same pending order does not double-deduct wallet.
