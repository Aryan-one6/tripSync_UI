# Database Models

Prisma uses PostgreSQL. IDs are UUID strings. JSON fields hold flexible arrays/objects; DateTime values serialize as ISO strings. Money in payment/agency-wallet paths is integer paise unless an explicit Decimal wallet field is used.

| Domain | Prisma models | Notes |
|---|---|---|
| Identity | `User`, `Agency`, `AgencyMember` | User owns zero/one agency; unique phone/email/username; agency members have ADMIN/MANAGER/AGENT/FINANCE roles. |
| Marketplace | `Plan`, `Package`, `Group`, `GroupMember`, `Offer`, `OfferNegotiation` | A group is linked uniquely to either a plan or package; plan has an optional selected offer. |
| Community | `Follow`, `Notification`, `ProfileView`, `Review` | Follow target may be user or agency; reviews target agency or co-traveler. |
| Messaging | `ChatMessage`, `DirectConversation`, `DirectConversationParticipant`, `DirectMessage` | Chat message metadata stores polls/documents. Direct conversation has stable unique participant key. |
| Payments | `Payment`, `Invoice`, `Dispute`, `AgencyWallet`, `AgencyTransaction` | Payment records Razorpay IDs, fee/commission split, escrow/tranches, points, referral wallet usage, source, transfer state. |
| Trust/operations | `AgencyTrustProfile`, `InsuranceQuote`, `AgencyCustomer`, `AgencyCampaign`, `FraudRiskFlag`, `GstVerificationLog`, `AgencyBankAccount`, `KycDocument` | Agency CRM, verification, fraud, bank and private KYC vault. |
| Loyalty/referrals | `LoyaltyPointsLedger`, `ReferralLink`, `ReferralTransaction`, `ReferralWallet`, `ReferralWalletTransaction` | Referral wallet is one-to-one with user. |
| Promotions | `PromotionalDiscount`, `PromoCodeUsage` | Codes track global/per-user limits, time, min order, percent/fixed discount and usage. |

## Important enums

- `VerificationTier`: BASIC, VERIFIED, TRUSTED.
- `PlanStatus`: DRAFT, OPEN, CONFIRMING, CONFIRMED, COMPLETED, EXPIRED, CANCELLED; `PlanType`: STANDARD, CORPORATE.
- `OfferStatus`: PENDING, COUNTERED, ACCEPTED, REJECTED, WITHDRAWN.
- `MemberStatus`: INTERESTED, APPROVED, COMMITTED, LEFT, REMOVED; `MemberRole`: CREATOR, MEMBER.
- `PaymentStatus`: PENDING, AUTHORIZED, CAPTURED, REFUNDED, FAILED; `EscrowStatus`: HELD, PARTIAL_RELEASE, RELEASED, REFUNDED; `TransferStatus` tracks queued/settled/manual transfer processing.
- Also: payment source, follow/profile-view target, wallet payout mode, dispute status/resolution, risk type, referral status/wallet transaction type, bank verification, and KYC document type.

## Flutter mapping guidance

Do not generate a mobile schema from tables directly. Map API DTOs to immutable feature models and preserve nullable fields. Use sealed/enums for stable server enums, but retain an `unknown` fallback for forward compatibility. Store only the IDs required for navigation/cache keys; never cache Aadhaar hashes, KYC S3 keys, bank account values, passwords, JWT secrets, or Razorpay webhook data.
