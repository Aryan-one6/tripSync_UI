export type VerificationTier = "BASIC" | "VERIFIED" | "TRUSTED";
export type AgencyVerificationStatus = "pending" | "under_review" | "verified";
export type PlanStatus =
  | "DRAFT"
  | "OPEN"
  | "CONFIRMING"
  | "CONFIRMED"
  | "COMPLETED"
  | "EXPIRED"
  | "CANCELLED";
export type OfferStatus = "PENDING" | "COUNTERED" | "ACCEPTED" | "REJECTED" | "WITHDRAWN";
export type MemberStatus = "INTERESTED" | "APPROVED" | "COMMITTED" | "LEFT" | "REMOVED";
export type MemberRole = "CREATOR" | "MEMBER";
export type PaymentStatus = "PENDING" | "AUTHORIZED" | "CAPTURED" | "REFUNDED" | "FAILED";
export type EscrowStatus = "HELD" | "PARTIAL_RELEASE" | "RELEASED" | "REFUNDED";
export type PaymentSource = "PLAN_OFFER" | "PACKAGE";

export interface ApiErrorPayload {
  code?: string;
  message?: string;
}

export interface ApiEnvelope<T> {
  data: T;
  meta?: Record<string, unknown>;
  errors?: ApiErrorPayload[] | Record<string, unknown>;
}

export interface UserSummary {
  id: string;
  fullName: string;
  username?: string | null;
  avatarUrl?: string | null;
  verification?: VerificationTier;
  gender?: string | null;
  city?: string | null;
  avgRating?: number;
  completedTrips?: number;
}

export interface AgencySummary {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  description?: string | null;
  verification?: AgencyVerificationStatus | string | null;
  gstin?: string | null;
  pan?: string | null;
  tourismLicense?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  state?: string | null;
  specializations?: string[] | null;
  destinations?: string[] | null;
  avgRating: number;
  totalReviews?: number;
  totalTrips?: number;
}

export interface Negotiation {
  id: string;
  round: number;
  senderType: "user" | "agency";
  price?: number | null;
  inclusionsDelta?: Record<string, unknown> | null;
  message?: string | null;
  createdAt: string;
}

export interface ItineraryItem {
  day: number;
  title: string;
  description?: string | null;
  highlights?: string[] | null;
  meals?: string[] | null;
  accommodation?: string | null;
  transport?: string | null;
}

export interface Offer {
  id: string;
  planId?: string;
  pricePerPerson: number;
  pricingTiers?: Array<{ minPax: number; price: number }> | null;
  inclusions?: Record<string, unknown> | null;
  itinerary?: ItineraryItem[] | null;
  cancellationPolicy?: string | null;
  cancellationRules?: {
    rules: Array<{ daysBeforeTrip: number; refundPercent: number }>;
    convenienceFeeRefundable?: boolean;
    agencyCancelFullRefund?: boolean;
  } | null;
  validUntil?: string | null;
  status: OfferStatus;
  isReferred?: boolean;
  referredAt?: string | null;
  createdAt: string;
  updatedAt: string;
  agency: AgencySummary;
  negotiations: Negotiation[];
  plan?: {
    id: string;
    slug: string;
    title: string;
    destination: string;
    budgetMin?: number | null;
    budgetMax?: number | null;
    startDate?: string | null;
    endDate?: string | null;
    status: PlanStatus;
    creator?: UserSummary;
    group?: {
      id: string;
      currentSize?: number;
    } | null;
  };
}

export interface GroupMember {
  id: string;
  role: MemberRole;
  status: MemberStatus;
  joinedAt: string;
  user: UserSummary;
}

export interface Group {
  id: string;
  planId?: string | null;
  currentSize: number;
  maleCount: number;
  femaleCount: number;
  otherCount: number;
  isLocked: boolean;
  members?: GroupMember[];
}

export interface DiscoverItem {
  id: string;
  slug: string;
  originType: "plan" | "package";
  title: string;
  destination: string;
  destinationState?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  priceLow?: number | null;
  priceHigh?: number | null;
  vibes?: string[] | null;
  groupType?: string | null;
  groupSizeMin: number;
  groupSizeMax: number;
  coverImageUrl?: string | null;
  status: string;
  createdAt: string;
  ownerId?: string | null;
  agencyId?: string | null;
  joinedCount: number;
}

export interface PlanDetails {
  id: string;
  slug: string;
  title: string;
  destination: string;
  destinationState?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isDateFlexible: boolean;
  budgetMin?: number | null;
  budgetMax?: number | null;
  groupSizeMin: number;
  groupSizeMax: number;
  vibes?: string[] | null;
  accommodation?: string | null;
  groupType?: string | null;
  genderPref?: string | null;
  ageRangeMin?: number | null;
  ageRangeMax?: number | null;
  activities?: string[] | null;
  description?: string | null;
  itinerary?: ItineraryItem[] | null;
  galleryUrls?: string[] | null;
  coverImageUrl?: string | null;
  autoApprove: boolean;
  status: PlanStatus;
  expiresAt?: string | null;
  confirmedAt?: string | null;
  creator: UserSummary;
  group?: Group | null;
  offers?: Offer[];
  selectedOffer?: Offer | null;
}

export interface PackageDetails {
  id: string;
  slug: string;
  title: string;
  destination: string;
  destinationState?: string | null;
  itinerary?: ItineraryItem[] | null;
  startDate?: string | null;
  endDate?: string | null;
  departureDates?: string[] | null;
  basePrice: number;
  pricingTiers?: Array<{ minPax: number; price: number }> | null;
  groupSizeMin: number;
  groupSizeMax: number;
  inclusions?: Record<string, unknown> | null;
  exclusions?: string | null;
  accommodation?: string | null;
  vibes?: string[] | null;
  activities?: string[] | null;
  galleryUrls?: string[] | null;
  cancellationPolicy?: string | null;
  cancellationRules?: {
    rules: Array<{ daysBeforeTrip: number; refundPercent: number }>;
    convenienceFeeRefundable?: boolean;
    agencyCancelFullRefund?: boolean;
  } | null;
  status: PlanStatus;
  agency: AgencySummary;
  group?: Group | null;
}

export interface UserProfile extends UserSummary {
  phone: string;
  email?: string | null;
  travelPreferences?: string | null;
  bio?: string | null;
  dateOfBirth?: string | null;
  agency?: AgencySummary | null;
}

export interface ProfileVerificationStatus {
  tier: VerificationTier;
  hasAadhaar: boolean;
  completedTrips: number;
  avgRating: number;
  trustedEligible: boolean;
  agency?: Pick<AgencySummary, "id" | "name" | "slug" | "verification"> | null;
}

export interface AadhaarVerificationResult {
  tier: VerificationTier;
  provider: "mock" | "digilocker";
  maskedAadhaar: string;
  fullName: string;
  dateOfBirth?: string | null;
  agency?: Pick<AgencySummary, "id" | "name" | "slug" | "verification"> | null;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
  agencyId: string | null;
  role: "user" | "agency_admin" | "platform_admin";
}

export interface TripMembership {
  id: string;
  status: MemberStatus;
  joinedAt: string;
  group: {
    id: string;
    plan?: Pick<
      PlanDetails,
      "id" | "slug" | "title" | "destination" | "startDate" | "endDate" | "status" | "coverImageUrl"
    > | null;
    package?: Pick<
      PackageDetails,
      "id" | "slug" | "title" | "destination" | "startDate" | "endDate" | "status" | "galleryUrls" | "basePrice"
    > | null;
  };
}

export interface ChatMessage {
  id: string;
  groupId: string;
  senderId?: string | null;
  messageType: "text" | "system" | "poll" | "document";
  content: string;
  metadata?: {
    options?: Array<{
      id: string;
      label: string;
      votes: string[];
    }>;
    [key: string]: unknown;
  } | null;
  createdAt: string;
  sender?: UserSummary | null;
}

export interface DirectMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender?: UserSummary | null;
}

export interface DirectConversation {
  id: string;
  createdAt: string;
  updatedAt: string;
  counterpart?: UserSummary | null;
  unreadCount: number;
  lastReadAt?: string | null;
  lastMessage?: DirectMessage | null;
}

export interface PaymentRecord {
  id: string;
  userId: string;
  groupId: string;
  amount: number;
  currency: string;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  status: PaymentStatus;
  escrowStatus: EscrowStatus;
  tranche1Released: boolean;
  tranche2Released: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GroupPaymentState {
  groupId: string;
  agencyName: string;
  paymentSource: PaymentSource;
  plan?: {
    id: string;
    title: string;
    slug: string;
    status: PlanStatus;
  } | null;
  package?: {
    id: string;
    title: string;
    slug: string;
    status: PlanStatus;
  } | null;
  offer?: {
    id: string;
    agencyName: string;
    pricePerPerson: number;
  } | null;
  payment?: PaymentRecord | null;
  amount: number;
  breakdown: {
    tripAmount: number;
    platformFeeAmount: number;
    feeGstAmount: number;
    commissionAmount: number;
    totalAmount: number;
  };
  currency: string;
  committedCount: number;
  travelerCount: number;
  checkoutMode: "razorpay" | "mock" | "captured";
  razorpayKeyId?: string | null;
}

export interface GroupPaymentOrder {
  payment: PaymentRecord;
  amount: number;
  breakdown: {
    tripAmount: number;
    platformFeeAmount: number;
    feeGstAmount: number;
    commissionAmount: number;
    totalAmount: number;
  };
  paymentSource: PaymentSource;
  currency: string;
  checkoutMode: "razorpay" | "mock" | "captured";
  razorpayKeyId?: string | null;
  description?: string;
}

export interface AgencyWalletSummary {
  pendingBalance: number;
  availableBalance: number;
  totalEarned: number;
  totalCommission: number;
  securityDeposit: number;
  payoutMode: "TRUST" | "PRO";
}

export interface AgencyWalletTransaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  groupId?: string | null;
  paymentId?: string | null;
  razorpayTransferId?: string | null;
  createdAt: string;
}

export interface ReviewRecord {
  id: string;
  reviewType: "agency" | "co_traveler";
  targetAgencyId?: string | null;
  targetUserId?: string | null;
  overallRating: number;
  safetyRating: number;
  valueRating: number;
  comment?: string | null;
  createdAt: string;
  reviewer: UserSummary;
  targetAgency?: AgencySummary | null;
  targetUser?: UserSummary | null;
}

export interface ReviewEligibility {
  groupId: string;
  agency?: AgencySummary | null;
  coTravelers: UserSummary[];
  existingReviews: Array<{
    id: string;
    reviewType: "agency" | "co_traveler";
    targetAgencyId?: string | null;
    targetUserId?: string | null;
    overallRating: number;
    safetyRating: number;
    valueRating: number;
    comment?: string | null;
    createdAt: string;
  }>;
}

export interface PublicTravelerProfile extends UserSummary {
  travelPreferences?: string | null;
  bio?: string | null;
  createdPlans: Array<{
    id: string;
    slug: string;
    title: string;
    destination: string;
    destinationState?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    status: PlanStatus;
    coverImageUrl?: string | null;
  }>;
  joinedTrips: Array<
    | {
        id: string;
        slug: string;
        title: string;
        destination: string;
        startDate?: string | null;
        endDate?: string | null;
        status: PlanStatus;
        coverImageUrl?: string | null;
      }
    | {
        id: string;
        slug: string;
        title: string;
        destination: string;
        startDate?: string | null;
        endDate?: string | null;
        status: PlanStatus;
        galleryUrls?: string[] | null;
        basePrice?: number | null;
      }
  >;
  reviewsReceived: Array<{
    id: string;
    overallRating: number;
    safetyRating: number;
    valueRating: number;
    comment?: string | null;
    createdAt: string;
    reviewer: UserSummary;
  }>;
}

export interface SocialFeedAuthor {
  profileType: "traveler" | "agency";
  handle: string;
  name: string;
  avatarUrl?: string | null;
  verification?: VerificationTier | AgencyVerificationStatus | string | null;
}

export interface SocialFeedItem {
  id: string;
  slug: string;
  originType: "plan" | "package";
  title: string;
  destination: string;
  destinationState?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  priceLow?: number | null;
  priceHigh?: number | null;
  groupSizeMin: number;
  groupSizeMax: number;
  joinedCount: number;
  coverImageUrl?: string | null;
  excerpt?: string | null;
  createdAt: string;
  author: SocialFeedAuthor;
}

export interface SocialTripSummary {
  id: string;
  slug: string;
  title: string;
  destination: string;
  destinationState?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status: PlanStatus;
  coverImageUrl?: string | null;
  galleryUrls?: string[] | null;
  basePrice?: number | null;
}

export interface SocialReview {
  id: string;
  overallRating: number;
  safetyRating?: number;
  valueRating?: number;
  comment?: string | null;
  createdAt: string;
  reviewer: UserSummary;
}

interface BaseSocialProfile {
  id: string;
  handle: string;
  name: string;
  avatarUrl?: string | null;
  bio?: string | null;
  location?: string | null;
  followerCount: number;
  followingCount: number;
  travelMap: string[];
}

export interface TravelerSocialProfile extends BaseSocialProfile {
  profileType: "traveler";
  verification: VerificationTier;
  travelPreferences?: string | null;
  avgRating: number;
  completedTrips: number;
  plansCreated: SocialTripSummary[];
  tripsJoined: SocialTripSummary[];
  reviewsReceived: SocialReview[];
}

export interface AgencySocialProfile extends BaseSocialProfile {
  profileType: "agency";
  ownerId: string;
  verification: AgencyVerificationStatus | string;
  avgRating: number;
  totalTrips: number;
  totalReviews: number;
  packages: SocialTripSummary[];
  reviewsReceived: SocialReview[];
}

export type SocialProfile = TravelerSocialProfile | AgencySocialProfile;

export interface FollowState {
  isFollowing: boolean;
  isOwnProfile: boolean;
  followerCount: number;
  followingCount: number;
}
