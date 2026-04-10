# TripSync — Audit & Implementation Report

## Escrow / Commission Formula

```
tripAmount        = pricePerPerson * 100 (paise)
commissionAmount  = 10% of tripAmount         ← changed from 8%
agencyNetAmount   = tripAmount - commissionAmount (90%)
initialPayout     = 30% of agencyNetAmount   (before trip)  
finalPayout       = 70% of agencyNetAmount   (after completion)
```

Example ₹10,000 trip:
  Commission = ₹1,000 | Agency net = ₹9,000 | Pre-trip ₹2,700 | Post-trip ₹6,300

## Loyalty System

| Rule                | Value          |
|---------------------|----------------|
| 1 point             | = 1 INR        |
| Referral inviter    | 250 pts        |
| Referral new user   | 250 pts        |
| Trip completion     | 250 pts        |
| Expiry              | 6 months       |
| Redemption cap      | 20% of booking |
| Model               | Append-only ledger |

## New Endpoints

- GET  /api/v1/loyalty/balance
- GET  /api/v1/loyalty/ledger
- POST /api/v1/loyalty/admin/adjust
- POST /api/v1/loyalty/admin/expire
- POST /api/v1/payments/groups/:groupId/complete

## Performance Fixes Implemented

| Fix | Impact |
|-----|--------|
| listDirectConversations: 20 msgs → 1 msg per conversation | CRITICAL: 20x fewer DB rows on inbox load |
| Added take:50 cap on conversation list | Bounded result size |
| @@index([groupId, status]) on GroupMember | CRITICAL: Eliminates full scans on most-queried table |
| @@index([userId, status]) on GroupMember | CRITICAL |
| @@index([userId, status]) on Payment | HIGH |
| @@index([groupId, status]) on Payment | HIGH |
| @@index([groupId, messageType]) on ChatMessage | MEDIUM |

## Edge Cases Handled

- Booking cancelled before trip → escrow refunded, no loyalty bonus
- Trip complete called twice → { alreadyCompleted: true } 
- Duplicate webhook → finalizeCapturedPayment is idempotent
- Referral bonus double-grant → blocked by idempotencyKey unique constraint
- Redeem >20% → BadRequestError
- Redeem > balance → BadRequestError
- Expired points → balance query excludes expired rows

## Files Changed

- apps/api/prisma/schema.prisma
- apps/api/prisma/migrations/202604110001_loyalty_points_and_payment_fields/migration.sql (NEW)
- apps/api/src/modules/loyalty/service.ts (NEW)
- apps/api/src/modules/loyalty/router.ts (NEW)
- apps/api/src/app.ts
- apps/api/src/modules/payments/service.ts
- apps/api/src/modules/payments/router.ts
- apps/api/src/modules/auth/service.ts
- apps/api/src/modules/chat/service.ts
