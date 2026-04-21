import { prisma } from '../../lib/prisma.js';
import { env } from '../../lib/env.js';
import { NotFoundError, ForbiddenError } from '../../lib/errors.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatInvoiceNumber(paymentId: string, type: 'USER' | 'AGENCY'): string {
  const prefix = type === 'USER' ? 'TSU' : 'TSA';
  const short = paymentId.replace(/-/g, '').slice(0, 8).toUpperCase();
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${short}`;
}

function paise(amount: number) {
  return amount; // amounts are stored in paise/smallest unit
}

function rupeesStr(amount: number | null | undefined) {
  if (!amount) return '₹0.00';
  return `₹${(amount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Platform constants ──────────────────────────────────────────────────────

const PLATFORM = {
  name: 'TripSync',
  tagline: 'India\'s Social Travel Platform',
  address: 'TripSync Pvt. Ltd., Bengaluru, Karnataka — 560001',
  gstin: '29AABCT1234R1Z5',
  email: 'billing@tripsync.in',
  website: 'https://www.tripsync.in',
  cin: 'U63090KA2024PTC000001',
  supportEmail: 'support@tripsync.in',
  supportPhone: '+91 80 4567 8900',
};

// ─── Cancellation / Refund Policy ───────────────────────────────────────────

const REFUND_POLICY = [
  { window: '30+ days before trip', refund: '100% refund (less payment gateway charges)' },
  { window: '15–29 days before trip', refund: '75% refund' },
  { window: '7–14 days before trip', refund: '50% refund' },
  { window: '2–6 days before trip', refund: '25% refund' },
  { window: 'Less than 48 hours', refund: 'No refund' },
];

const TERMS_AND_CONDITIONS = [
  'All payments are securely held in escrow until 48 hours after trip departure, protecting both travellers and agencies.',
  'TripSync Pvt. Ltd. acts solely as an intermediary platform and does not operate travel services directly.',
  'Agency-issued itineraries and inclusions are governed by their respective cancellation policy at the time of booking.',
  'In the event of a payment dispute, TripSync\'s dispute resolution team has final authority over escrow release decisions.',
  'Loyalty points redeemed are non-refundable once applied to a confirmed booking.',
  'Wallet credits are refunded to the wallet (not original payment method) in case of eligible cancellations.',
  'GST is charged at the applicable rate on the platform service fee only, not on the trip amount paid to the agency.',
  'This invoice is computer-generated and does not require a physical signature.',
  'For disputes or complaints, contact support@tripsync.in within 7 days of the trip start date.',
];

// ─── Core Invoice Payload Builder ────────────────────────────────────────────

export async function buildUserInvoicePayload(paymentId: string, requestingUserId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      user: {
        select: { id: true, fullName: true, email: true, phone: true, city: true },
      },
      group: {
        include: {
          plan: {
            include: {
              creator: { select: { fullName: true } },
              selectedOffer: {
                include: {
                  agency: {
                    select: {
                      id: true, name: true, slug: true, gstin: true, pan: true,
                      address: true, city: true, state: true, email: true,
                      phone: true, logoUrl: true,
                    },
                  },
                },
              },
            },
          },
          package: {
            include: {
              agency: {
                select: {
                  id: true, name: true, slug: true, gstin: true, pan: true,
                  address: true, city: true, state: true, email: true,
                  phone: true, logoUrl: true,
                },
              },
            },
          },
          members: {
            where: { status: 'COMMITTED' },
            include: { user: { select: { fullName: true } } },
          },
        },
      },
      invoice: true,
    },
  });

  if (!payment) throw new NotFoundError('Payment not found');
  if (payment.userId !== requestingUserId) throw new ForbiddenError('Access denied');

  const plan = payment.group?.plan ?? null;
  const pkg = payment.group?.package ?? null;
  const agency = plan?.selectedOffer?.agency ?? pkg?.agency ?? null;
  const offer = plan?.selectedOffer ?? null;

  const invNumber = payment.invoice?.invoiceNumber
    ?? formatInvoiceNumber(payment.id, 'USER');

  // ── Line items ──
  const tripAmount = payment.tripAmount || payment.amount;
  const platformFee = payment.platformFeeAmount || 0;
  const gstOnFee = payment.feeGstAmount || 0;
  const pointsDiscount = (payment.pointsRedeemed || 0) * 100; // 1 point = 1 INR = 100 paise
  const walletDiscount = Number(payment.walletAmountUsed || 0) * 100; // stored in INR, convert to paise

  // The actual charged amount after all discounts
  const grandTotal = payment.amount;

  const travelerCount = payment.group?.members?.length || 1;
  const pricePerPerson = offer
    ? offer.pricePerPerson
    : pkg
      ? pkg.basePrice
      : Math.floor(tripAmount / Math.max(travelerCount, 1));

  const tripTitle = plan?.title ?? pkg?.title ?? 'Trip';
  const destination = plan?.destination ?? pkg?.destination ?? '';
  const startDate = plan?.startDate ?? pkg?.startDate ?? null;
  const endDate = plan?.endDate ?? pkg?.endDate ?? null;
  const inclusions: string[] = offer?.inclusions
    ? (offer.inclusions as string[])
    : pkg?.inclusions
      ? (pkg.inclusions as string[])
      : [];
  const cancellationPolicy: string = offer?.cancellationPolicy
    ?? pkg?.cancellationPolicy
    ?? 'Standard TripSync cancellation policy applies.';

  const lineItems = [
    {
      description: `${tripTitle} — ${destination}`,
      subtext: startDate && endDate
        ? `${formatDate(startDate)} → ${formatDate(endDate)}`
        : 'Dates to be confirmed',
      qty: travelerCount,
      unit: 'person',
      rate: pricePerPerson,
      subtotal: tripAmount,
    },
    platformFee > 0 && {
      description: 'TripSync Platform Fee (18% GST included)',
      subtext: `Fee: ${rupeesStr(platformFee - gstOnFee)}  +  GST @18%: ${rupeesStr(gstOnFee)}`,
      qty: 1,
      unit: 'fixed',
      rate: platformFee,
      subtotal: platformFee,
    },
  ].filter(Boolean) as Array<{
    description: string; subtext: string;
    qty: number; unit: string; rate: number; subtotal: number;
  }>;

  const discountLines = [
    payment.pointsRedeemed > 0 && {
      label: `Loyalty Points Redeemed (${payment.pointsRedeemed} pts × ₹1)`,
      amount: -pointsDiscount,
    },
    walletDiscount > 0 && {
      label: `TripSync Wallet Credit Applied`,
      amount: -walletDiscount,
    },
  ].filter(Boolean) as Array<{ label: string; amount: number }>;

  return {
    invoiceType: 'USER_PAYMENT' as const,
    invoiceNumber: invNumber,
    issuedAt: payment.paidAt ?? payment.createdAt,
    status: payment.status,
    escrowStatus: payment.escrowStatus,

    platform: PLATFORM,

    traveler: {
      name: payment.user.fullName,
      email: payment.user.email ?? '',
      phone: payment.user.phone,
      city: payment.user.city ?? '',
    },

    agency: agency
      ? {
          name: agency.name,
          gstin: agency.gstin ?? 'Pending verification',
          pan: agency.pan ?? '',
          address: [agency.address, agency.city, agency.state].filter(Boolean).join(', '),
          email: agency.email ?? '',
          phone: agency.phone ?? '',
          logoUrl: agency.logoUrl ?? null,
        }
      : null,

    trip: {
      title: tripTitle,
      destination,
      startDate,
      endDate,
      travelerCount,
      pricePerPerson,
      inclusions,
      cancellationPolicy: cancellationPolicy,
      planType: plan?.planType ?? 'STANDARD',
      accommodation: plan?.accommodation ?? pkg?.accommodation ?? null,
      vibes: (plan?.vibes ?? pkg?.vibes ?? []) as string[],
    },

    lineItems,

    summary: {
      subtotal: tripAmount + platformFee,
      tripAmount,
      platformFee: platformFee - gstOnFee,
      gstOnPlatformFee: gstOnFee,
      discountLines,
      totalDiscounts: -(pointsDiscount + walletDiscount),
      grandTotal,
    },

    payment: {
      id: payment.id,
      razorpayOrderId: payment.razorpayOrderId,
      razorpayPaymentId: payment.razorpayPaymentId,
      currency: payment.currency,
      paidAt: payment.paidAt,
      escrowSchedule: [
        {
          tranche: 1,
          label: 'Advance (45% to Agency, 48h after departure)',
          amount: payment.initialPayout,
          released: payment.tranche1Released,
        },
        {
          tranche: 2,
          label: 'Final Settlement (55% after trip completion)',
          amount: payment.finalPayout,
          released: payment.tranche2Released,
        },
      ],
    },

    pointsRedeemed: payment.pointsRedeemed,
    walletAmountUsed: Number(payment.walletAmountUsed),

    refundPolicy: REFUND_POLICY,
    termsAndConditions: TERMS_AND_CONDITIONS,
    members: payment.group?.members?.map((m: { user: { fullName: string } }) => m.user.fullName) ?? [],
  };
}

// ─── Agency Settlement Invoice ─────────────────────────────────────────────

export async function buildAgencySettlementPayload(paymentId: string, requestingAgencyOwnerId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      user: { select: { fullName: true, email: true, phone: true } },
      group: {
        include: {
          plan: {
            include: {
              selectedOffer: {
                include: {
                  agency: { include: { owner: { select: { fullName: true, email: true } } } },
                },
              },
            },
          },
          package: {
            include: {
              agency: { include: { owner: { select: { fullName: true, email: true } } } },
            },
          },
          members: {
            where: { status: 'COMMITTED' },
            include: { user: { select: { fullName: true } } },
          },
        },
      },
      invoice: true,
    },
  });

  if (!payment) throw new NotFoundError('Payment not found');

  const agency = payment.group?.plan?.selectedOffer?.agency
    ?? payment.group?.package?.agency
    ?? null;

  if (!agency) throw new NotFoundError('Agency not found for this payment');
  if (agency.ownerId !== requestingAgencyOwnerId) throw new ForbiddenError('Access denied');

  const plan = payment.group?.plan ?? null;
  const pkg = payment.group?.package ?? null;
  const invNumber = payment.invoice?.invoiceNumber
    ? payment.invoice.invoiceNumber.replace('TSU', 'TSA')
    : formatInvoiceNumber(payment.id, 'AGENCY');

  const travelerCount = payment.group?.members?.length || 1;
  const tripTitle = plan?.title ?? pkg?.title ?? 'Trip Booking';

  return {
    invoiceType: 'AGENCY_SETTLEMENT' as const,
    invoiceNumber: invNumber,
    issuedAt: payment.paidAt ?? payment.createdAt,
    status: payment.escrowStatus,
    transferStatus: payment.transferStatus,

    platform: PLATFORM,

    agency: {
      name: agency.name,
      gstin: agency.gstin ?? 'Pending',
      pan: agency.pan ?? '',
      address: [agency.address, agency.city, agency.state].filter(Boolean).join(', '),
      email: agency.email ?? '',
      phone: agency.phone ?? '',
      ownerName: agency.owner.fullName,
      logoUrl: agency.logoUrl ?? null,
    },

    client: {
      name: payment.user.fullName,
      email: payment.user.email ?? '',
      phone: payment.user.phone,
    },

    trip: {
      title: tripTitle,
      destination: plan?.destination ?? pkg?.destination ?? '',
      startDate: plan?.startDate ?? pkg?.startDate ?? null,
      endDate: plan?.endDate ?? pkg?.endDate ?? null,
      travelerCount,
    },

    settlement: {
      totalCollected: payment.amount,
      tripAmount: payment.tripAmount,
      platformCommission: payment.commissionAmount,
      platformFee: payment.platformFeeAmount,
      gstOnFee: payment.feeGstAmount,
      agencyNetAmount: payment.agencyNetAmount,
      schedule: [
        {
          tranche: 1,
          label: 'Advance Payout (45%) — Released 48h after departure',
          amount: payment.initialPayout,
          released: payment.tranche1Released,
          expectedDate: plan?.startDate
            ? new Date(plan.startDate.getTime() + 2 * 24 * 60 * 60 * 1000)
            : null,
        },
        {
          tranche: 2,
          label: 'Final Payout (55%) — Released after trip completion',
          amount: payment.finalPayout,
          released: payment.tranche2Released,
          expectedDate: plan?.endDate ?? pkg?.endDate ?? null,
        },
      ],
    },

    payment: {
      id: payment.id,
      razorpayOrderId: payment.razorpayOrderId,
      razorpayPaymentId: payment.razorpayPaymentId,
      currency: payment.currency,
      paidAt: payment.paidAt,
      transferReference: payment.transferReference,
    },

    members: payment.group?.members?.map((m: { user: { fullName: string } }) => m.user.fullName) ?? [],
    termsAndConditions: [
      'Settlement is released in two tranches as per TripSync escrow policy.',
      'TripSync retains a platform commission as agreed during agency onboarding.',
      'GST will be charged on the platform commission at the prevailing rate.',
      'Amounts are transferred via Razorpay Route to your registered bank account.',
      'In the event of a traveller dispute, settlement may be delayed until resolution.',
      'This statement is for informational purposes. Official tax invoice will be issued separately.',
    ],
  };
}

// ─── Persist / upsert Invoice record ─────────────────────────────────────────

export async function ensureInvoiceRecord(paymentId: string): Promise<string> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { invoice: true },
  });
  if (!payment) throw new NotFoundError('Payment not found');
  if (payment.invoice) return payment.invoice.invoiceNumber;

  const agencyId = payment.agencyId ?? await resolveAgencyIdForPayment(paymentId);
  if (!agencyId) throw new NotFoundError('Agency could not be resolved for this payment');

  const invoiceNumber = formatInvoiceNumber(paymentId, 'USER');
  await prisma.invoice.create({
    data: {
      paymentId,
      groupId: payment.groupId,
      agencyId,
      userId: payment.userId,
      invoiceNumber,
      amount: payment.tripAmount,
      platformFeeAmount: payment.platformFeeAmount,
      feeGstAmount: payment.feeGstAmount,
      commissionAmount: payment.commissionAmount,
      totalAmount: payment.amount,
      currency: payment.currency,
      status: 'issued',
    },
  });
  return invoiceNumber;
}

async function resolveAgencyIdForPayment(paymentId: string): Promise<string | null> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      group: {
        select: {
          plan: { select: { selectedOffer: { select: { agencyId: true } } } },
          package: { select: { agencyId: true } },
        },
      },
    },
  });
  return (
    payment?.group?.plan?.selectedOffer?.agencyId ??
    payment?.group?.package?.agencyId ??
    null
  );
}

// ─── List invoices for a user / agency ───────────────────────────────────────

export async function listUserInvoices(userId: string) {
  return prisma.invoice.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, invoiceNumber: true, totalAmount: true, currency: true,
      status: true, createdAt: true,
      payment: { select: { status: true, paidAt: true, planId: true, packageId: true } },
      group: {
        select: {
          plan: { select: { title: true, destination: true, startDate: true } },
          package: { select: { title: true, destination: true, startDate: true } },
        },
      },
    },
  });
}

export async function listAgencyInvoices(agencyId: string) {
  return prisma.invoice.findMany({
    where: { agencyId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, invoiceNumber: true, totalAmount: true, currency: true,
      status: true, createdAt: true,
      payment: {
        select: {
          status: true, paidAt: true, agencyNetAmount: true,
          tranche1Released: true, tranche2Released: true,
        },
      },
      group: {
        select: {
          plan: { select: { title: true, destination: true, startDate: true } },
          package: { select: { title: true, destination: true, startDate: true } },
        },
      },
    },
  });
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function formatDate(d: Date) {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
