import { PlanStatus, PaymentStatus } from '@prisma/client';
import { prisma } from '../src/lib/prisma.js';
import { hashPassword } from '../src/modules/auth/password.js';

const DEMO_PASSWORD = 'TravellersIn123!';

type SeedUser = {
  key: string;
  phone: string;
  username: string;
  email: string;
  fullName: string;
  gender: 'male' | 'female' | 'other';
  city: string;
  verification: 'BASIC' | 'VERIFIED' | 'TRUSTED';
  completedTrips: number;
  avgRating: number;
  dateOfBirth: string;
  bio: string;
};

type SeedAgency = {
  ownerKey: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  description: string;
  specializations: string[];
  destinations: string[];
  verification: 'pending' | 'under_review' | 'verified';
  gstin?: string;
  pan?: string;
  tourismLicense?: string;
};

type PlanScenario = {
  key: string;
  slug: string;
  title: string;
  destination: string;
  destinationState: string;
  creatorKey: string;
  budgetMin: number;
  budgetMax: number;
  groupType: string;
  genderPref: string;
  vibes: string[];
  activities: string[];
  accommodation: string;
  autoApprove: boolean;
  status: PlanStatus;
  startOffset: number;
  endOffset: number;
  groupSizeMax: number;
  description: string;
};

const seedUsers: SeedUser[] = [
  {
    key: 'mira',
    username: 'mira_kapoor',
    email: 'mira@tripsync.test',
    phone: '9100000001',
    fullName: 'Mira Kapoor',
    gender: 'female',
    city: 'Delhi',
    verification: 'TRUSTED',
    completedTrips: 6,
    avgRating: 4.9,
    dateOfBirth: '1994-05-14',
    bio: 'Adventure-first traveler who likes sunrise call times, strong coordination, and women-led departures.',
  },
  {
    key: 'riya',
    username: 'riya_chandel',
    email: 'riya@tripsync.test',
    phone: '9100000002',
    fullName: 'Riya Chandel',
    gender: 'female',
    city: 'Chandigarh',
    verification: 'VERIFIED',
    completedTrips: 3,
    avgRating: 4.7,
    dateOfBirth: '1996-08-09',
    bio: 'Workation traveler who prefers structured plans, tidy stays, and clear budgets.',
  },
  {
    key: 'kabir',
    username: 'kabir_malhotra',
    email: 'kabir@tripsync.test',
    phone: '9100000003',
    fullName: 'Kabir Malhotra',
    gender: 'male',
    city: 'Gurugram',
    verification: 'VERIFIED',
    completedTrips: 4,
    avgRating: 4.5,
    dateOfBirth: '1993-02-11',
    bio: 'Weekend mountain runner who wants simple logistics and sharp pricing.',
  },
  {
    key: 'ananya',
    username: 'ananya_rawat',
    email: 'ananya@tripsync.test',
    phone: '9100000004',
    fullName: 'Ananya Rawat',
    gender: 'female',
    city: 'Dehradun',
    verification: 'TRUSTED',
    completedTrips: 7,
    avgRating: 4.8,
    dateOfBirth: '1995-01-22',
    bio: 'Host-style traveler who loves balanced groups, scenic stays, and calm planning.',
  },
  {
    key: 'isha',
    username: 'isha_verma',
    email: 'isha@tripsync.test',
    phone: '9100000021',
    fullName: 'Isha Verma',
    gender: 'female',
    city: 'Delhi',
    verification: 'VERIFIED',
    completedTrips: 2,
    avgRating: 4.5,
    dateOfBirth: '1998-03-18',
    bio: 'Cafe-and-content traveler who joins small groups and likes active chats.',
  },
  {
    key: 'rahul',
    username: 'rahul_dogra',
    email: 'rahul@tripsync.test',
    phone: '9100000022',
    fullName: 'Rahul Dogra',
    gender: 'male',
    city: 'Pathankot',
    verification: 'BASIC',
    completedTrips: 1,
    avgRating: 4.2,
    dateOfBirth: '1997-06-20',
    bio: 'Budget-focused traveler who tests the early-stage join and approval flow.',
  },
  {
    key: 'meher',
    username: 'meher_bawa',
    email: 'meher@tripsync.test',
    phone: '9100000023',
    fullName: 'Meher Bawa',
    gender: 'female',
    city: 'Chandigarh',
    verification: 'VERIFIED',
    completedTrips: 3,
    avgRating: 4.7,
    dateOfBirth: '1999-10-02',
    bio: 'Flexible co-traveler who joins both social trips and referrals-based trips.',
  },
  {
    key: 'yuvraj',
    username: 'yuvraj_singh',
    email: 'yuvraj@tripsync.test',
    phone: '9100000024',
    fullName: 'Yuvraj Singh',
    gender: 'male',
    city: 'Ludhiana',
    verification: 'VERIFIED',
    completedTrips: 2,
    avgRating: 4.4,
    dateOfBirth: '1996-01-15',
    bio: 'Easy-going traveler used in manual approval, confirming, and DM scenarios.',
  },
  {
    key: 'komal',
    username: 'komal_bisht',
    email: 'komal@tripsync.test',
    phone: '9100000025',
    fullName: 'Komal Bisht',
    gender: 'female',
    city: 'Dehradun',
    verification: 'TRUSTED',
    completedTrips: 5,
    avgRating: 4.8,
    dateOfBirth: '1994-09-27',
    bio: 'Reliable co-traveler used in payment, review, and coordination QA.',
  },
  {
    key: 'neha',
    username: 'neha_suri',
    email: 'neha@tripsync.test',
    phone: '9100000026',
    fullName: 'Neha Suri',
    gender: 'female',
    city: 'Noida',
    verification: 'VERIFIED',
    completedTrips: 2,
    avgRating: 4.6,
    dateOfBirth: '1997-11-07',
    bio: 'Soft-adventure traveler seeded to keep plan cards and chats populated.',
  },
  {
    key: 'aman',
    username: 'aman_gill',
    email: 'aman@tripsync.test',
    phone: '9100000027',
    fullName: 'Aman Gill',
    gender: 'male',
    city: 'Mohali',
    verification: 'BASIC',
    completedTrips: 1,
    avgRating: 4.1,
    dateOfBirth: '1998-07-23',
    bio: 'New traveler used to show lightweight profiles and fresh joiner states.',
  },
  {
    key: 'arjun_owner',
    username: 'arjun_sethi',
    email: 'arjun@tripsync.test',
    phone: '9100000011',
    fullName: 'Arjun Sethi',
    gender: 'male',
    city: 'Delhi',
    verification: 'TRUSTED',
    completedTrips: 5,
    avgRating: 4.7,
    dateOfBirth: '1991-07-17',
    bio: 'Agency owner account for Summit Circuit Expeditions.',
  },
  {
    key: 'tara_owner',
    username: 'tara_rana',
    email: 'tara@tripsync.test',
    phone: '9100000012',
    fullName: 'Tara Rana',
    gender: 'female',
    city: 'Shimla',
    verification: 'TRUSTED',
    completedTrips: 6,
    avgRating: 4.8,
    dateOfBirth: '1990-11-04',
    bio: 'Agency owner account for Pine Trail Collective.',
  },
  {
    key: 'neel_owner',
    username: 'neel_bhardwaj',
    email: 'neel@tripsync.test',
    phone: '9100000013',
    fullName: 'Neel Bhardwaj',
    gender: 'male',
    city: 'Noida',
    verification: 'VERIFIED',
    completedTrips: 2,
    avgRating: 4.4,
    dateOfBirth: '1992-04-25',
    bio: 'Agency owner account for Altitude Pulse Travel.',
  },
  {
    key: 'sana_owner',
    username: 'sana_dutt',
    email: 'sana@tripsync.test',
    phone: '9100000014',
    fullName: 'Sana Dutt',
    gender: 'female',
    city: 'Mohali',
    verification: 'TRUSTED',
    completedTrips: 5,
    avgRating: 4.9,
    dateOfBirth: '1993-09-08',
    bio: 'Agency owner account for Riverstone Routes.',
  },
  {
    key: 'dev_owner',
    username: 'dev_mehta',
    email: 'dev@tripsync.test',
    phone: '9100000015',
    fullName: 'Dev Mehta',
    gender: 'male',
    city: 'Jaipur',
    verification: 'VERIFIED',
    completedTrips: 3,
    avgRating: 4.6,
    dateOfBirth: '1989-12-13',
    bio: 'Agency owner account for Northbound Social Club.',
  },
];

const seedAgencies: SeedAgency[] = [
  {
    ownerKey: 'arjun_owner',
    name: 'Summit Circuit Expeditions',
    slug: 'summit-circuit-expeditions',
    city: 'Delhi',
    state: 'Delhi',
    description: 'Adventure departures tuned for fast-moving social groups across Himachal and Uttarakhand.',
    specializations: ['Adventure', 'Trekking', 'Paragliding'],
    destinations: ['Bir Billing', 'Kasol', 'Tirthan', 'Auli'],
    verification: 'verified',
    gstin: '07AAICS1234A1Z9',
    pan: 'AAICS1234A',
    tourismLicense: 'HP-TRAVEL-1001',
  },
  {
    ownerKey: 'tara_owner',
    name: 'Pine Trail Collective',
    slug: 'pine-trail-collective',
    city: 'Shimla',
    state: 'Himachal Pradesh',
    description: 'Locally anchored mountain operator focused on balanced pacing, clean stays, and women-led groups.',
    specializations: ['Women-led', 'Road Trips', 'Wellness'],
    destinations: ['Jibhi', 'Manali', 'Shoja', 'Spiti'],
    verification: 'verified',
    gstin: '02AAICT1234A1Z8',
    pan: 'AAICT1234A',
    tourismLicense: 'HP-TRAVEL-1002',
  },
  {
    ownerKey: 'neel_owner',
    name: 'Altitude Pulse Travel',
    slug: 'altitude-pulse-travel',
    city: 'Noida',
    state: 'Uttar Pradesh',
    description: 'Youth-focused departures with strong logistics for weekend escapes and content-heavy outdoor itineraries.',
    specializations: ['Weekend Escapes', 'Backpacking'],
    destinations: ['Rishikesh', 'Lansdowne', 'Chakrata', 'Mussoorie'],
    verification: 'under_review',
    gstin: '09AAICA1234A1Z7',
    pan: 'AAICA1234A',
  },
  {
    ownerKey: 'sana_owner',
    name: 'Riverstone Routes',
    slug: 'riverstone-routes',
    city: 'Mohali',
    state: 'Punjab',
    description: 'Mid-size operator for rafting, riverside camping, and scenic workation itineraries.',
    specializations: ['Camping', 'Rafting', 'Workations'],
    destinations: ['Rishikesh', 'Tirthan', 'Sainj', 'Kasol'],
    verification: 'verified',
    gstin: '03AAICR1234A1Z6',
    pan: 'AAICR1234A',
    tourismLicense: 'UK-TRAVEL-2001',
  },
  {
    ownerKey: 'dev_owner',
    name: 'Northbound Social Club',
    slug: 'northbound-social-club',
    city: 'Jaipur',
    state: 'Rajasthan',
    description: 'Community-first trip operator for mixed-format departures, nightlife-friendly stays, and social pacing.',
    specializations: ['Social Trips', 'Nightlife', 'Budget'],
    destinations: ['Manali', 'Bir Billing', 'McLeodganj', 'Nainital'],
    verification: 'verified',
    gstin: '08AAICN1234A1Z5',
    pan: 'AAICN1234A',
    tourismLicense: 'RJ-TRAVEL-3001',
  },
];

const packageBlueprints = [
  {
    title: 'Bir Billing Air & Trail Circuit',
    destination: 'Bir Billing',
    destinationState: 'Himachal Pradesh',
    accommodation: 'Boutique hostel',
    basePrice: 15800,
    vibes: ['adventure', 'social'],
    activities: ['paragliding', 'hike', 'cafe hopping'],
  },
  {
    title: 'Jibhi Cedar Cabin Reset',
    destination: 'Jibhi',
    destinationState: 'Himachal Pradesh',
    accommodation: 'Cabin stay',
    basePrice: 17200,
    vibes: ['slow travel', 'nature'],
    activities: ['waterfall walk', 'bonfire', 'forest trail'],
  },
  {
    title: 'Rishikesh River Rush Weekend',
    destination: 'Rishikesh',
    destinationState: 'Uttarakhand',
    accommodation: 'Riverside camp',
    basePrice: 12800,
    vibes: ['adventure', 'wellness'],
    activities: ['rafting', 'yoga', 'sunrise cafe'],
  },
  {
    title: 'Kasol Night Sky Basecamp',
    destination: 'Kasol',
    destinationState: 'Himachal Pradesh',
    accommodation: 'Mountain hostel',
    basePrice: 14900,
    vibes: ['backpacking', 'social'],
    activities: ['easy trek', 'riverside chill', 'music night'],
  },
];

const planScenarios: PlanScenario[] = [
  {
    key: 'open_no_offers',
    slug: 'qa-open-no-offers-bir',
    title: 'Bir sunrise launch squad',
    destination: 'Bir Billing',
    destinationState: 'Himachal Pradesh',
    creatorKey: 'mira',
    budgetMin: 14000,
    budgetMax: 21000,
    groupType: 'female_only',
    genderPref: 'female_only',
    vibes: ['adventure', 'content'],
    activities: ['paragliding', 'sunrise drive'],
    accommodation: 'hostel',
    autoApprove: true,
    status: 'OPEN',
    startOffset: 12,
    endOffset: 15,
    groupSizeMax: 8,
    description: 'QA scenario: open traveler plan with no offers yet.',
  },
  {
    key: 'offer_battle',
    slug: 'qa-offer-battle-tirthan',
    title: 'Tirthan offer battle',
    destination: 'Tirthan Valley',
    destinationState: 'Himachal Pradesh',
    creatorKey: 'kabir',
    budgetMin: 12000,
    budgetMax: 18500,
    groupType: 'friends',
    genderPref: 'balanced',
    vibes: ['nature', 'slow travel'],
    activities: ['river walk', 'bonfire'],
    accommodation: 'cottage',
    autoApprove: true,
    status: 'OPEN',
    startOffset: 18,
    endOffset: 21,
    groupSizeMax: 10,
    description: 'QA scenario: multiple agencies bidding with negotiation history.',
  },
  {
    key: 'referral_loop',
    slug: 'qa-referral-loop-rishikesh',
    title: 'Rishikesh referral loop',
    destination: 'Rishikesh',
    destinationState: 'Uttarakhand',
    creatorKey: 'ananya',
    budgetMin: 9000,
    budgetMax: 15500,
    groupType: 'solo',
    genderPref: 'open',
    vibes: ['wellness', 'adventure'],
    activities: ['rafting', 'sunrise yoga'],
    accommodation: 'camp',
    autoApprove: true,
    status: 'OPEN',
    startOffset: 22,
    endOffset: 25,
    groupSizeMax: 10,
    description: 'QA scenario: traveler-referred plan with agency referral inbox coverage.',
  },
  {
    key: 'manual_approval',
    slug: 'qa-manual-approval-shoja',
    title: 'Shoja remote-work sprint',
    destination: 'Shoja',
    destinationState: 'Himachal Pradesh',
    creatorKey: 'riya',
    budgetMin: 15000,
    budgetMax: 24000,
    groupType: 'friends',
    genderPref: 'balanced',
    vibes: ['workation', 'nature'],
    activities: ['forest trail', 'cafe workday'],
    accommodation: 'cabin',
    autoApprove: false,
    status: 'OPEN',
    startOffset: 28,
    endOffset: 32,
    groupSizeMax: 8,
    description: 'QA scenario: interested traveler waiting for creator approval.',
  },
  {
    key: 'confirming',
    slug: 'qa-confirming-auli',
    title: 'Auli snowline sprint',
    destination: 'Auli',
    destinationState: 'Uttarakhand',
    creatorKey: 'mira',
    budgetMin: 20000,
    budgetMax: 26000,
    groupType: 'friends',
    genderPref: 'balanced',
    vibes: ['premium', 'adventure'],
    activities: ['gondola', 'ski intro'],
    accommodation: 'hotel',
    autoApprove: true,
    status: 'CONFIRMING',
    startOffset: 35,
    endOffset: 38,
    groupSizeMax: 6,
    description: 'QA scenario: accepted offer, partial payments, plan still confirming.',
  },
  {
    key: 'confirmed',
    slug: 'qa-confirmed-kasol',
    title: 'Kasol social basecamp',
    destination: 'Kasol',
    destinationState: 'Himachal Pradesh',
    creatorKey: 'kabir',
    budgetMin: 13500,
    budgetMax: 18000,
    groupType: 'friends',
    genderPref: 'balanced',
    vibes: ['backpacking', 'social'],
    activities: ['easy trek', 'music night'],
    accommodation: 'hostel',
    autoApprove: true,
    status: 'CONFIRMED',
    startOffset: 42,
    endOffset: 45,
    groupSizeMax: 7,
    description: 'QA scenario: everyone paid, trip confirmed, group chat active.',
  },
  {
    key: 'completed',
    slug: 'qa-completed-jibhi',
    title: 'Jibhi cabin closeout',
    destination: 'Jibhi',
    destinationState: 'Himachal Pradesh',
    creatorKey: 'ananya',
    budgetMin: 16000,
    budgetMax: 21000,
    groupType: 'friends',
    genderPref: 'balanced',
    vibes: ['nature', 'slow travel'],
    activities: ['waterfall walk', 'bonfire'],
    accommodation: 'cabin',
    autoApprove: true,
    status: 'COMPLETED',
    startOffset: -12,
    endOffset: -9,
    groupSizeMax: 8,
    description: 'QA scenario: completed trip with reviews for agency and co-travelers.',
  },
  {
    key: 'open_generic',
    slug: 'qa-open-spiti-sampler',
    title: 'Spiti sampler social run',
    destination: 'Spiti',
    destinationState: 'Himachal Pradesh',
    creatorKey: 'riya',
    budgetMin: 22000,
    budgetMax: 32000,
    groupType: 'solo',
    genderPref: 'open',
    vibes: ['content', 'mountains'],
    activities: ['road trip', 'stargazing'],
    accommodation: 'camp',
    autoApprove: true,
    status: 'OPEN',
    startOffset: 50,
    endOffset: 55,
    groupSizeMax: 10,
    description: 'QA scenario: extra open plan for browse density.',
  },
];

const DESTINATION_IMAGE_LIBRARY = [
  '/destinations/andaman.jpg',
  '/destinations/bir%20Billing.jpg',
  '/destinations/chandrashila.jpg',
  '/destinations/cooorg.jpg',
  '/destinations/goa.webp',
  '/destinations/jibhi.webp',
  '/destinations/kerala.avif',
  '/destinations/leh%20ladhak.jpg',
  '/destinations/pravati-valley-kasol.webp',
  '/destinations/rishikesh.webp',
  '/destinations/shoja-.avif',
  '/destinations/TirthanValley.jpg',
  '/destinations/Rajasthan.jpg',
] as const;

const DESTINATION_IMAGE_BY_KEY: Record<string, string> = {
  andaman: '/destinations/andaman.jpg',
  auli: '/destinations/chandrashila.jpg',
  birbilling: '/destinations/bir%20Billing.jpg',
  coorg: '/destinations/cooorg.jpg',
  cooorg: '/destinations/cooorg.jpg',
  goa: '/destinations/goa.webp',
  jibhi: '/destinations/jibhi.webp',
  kasol: '/destinations/pravati-valley-kasol.webp',
  kerala: '/destinations/kerala.avif',
  lehladakh: '/destinations/leh%20ladhak.jpg',
  lehladhak: '/destinations/leh%20ladhak.jpg',
  manali: '/destinations/Rajasthan.jpg',
  rajasthan: '/destinations/Rajasthan.jpg',
  rishikesh: '/destinations/rishikesh.webp',
  shoja: '/destinations/shoja-.avif',
  spiti: '/destinations/leh%20ladhak.jpg',
  tirthan: '/destinations/TirthanValley.jpg',
  tirthanvalley: '/destinations/TirthanValley.jpg',
};

function normalizeMediaKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function hashText(value: string) {
  return Array.from(value).reduce((total, char) => total + char.charCodeAt(0), 0);
}

function pickFallbackImage(seed: string, indexOffset = 0) {
  const index = (hashText(seed) + indexOffset) % DESTINATION_IMAGE_LIBRARY.length;
  return DESTINATION_IMAGE_LIBRARY[index];
}

function imageForDestination(destination: string, seed: string) {
  const key = normalizeMediaKey(destination);
  return DESTINATION_IMAGE_BY_KEY[key] ?? pickFallbackImage(seed);
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter((value) => value.length > 0)));
}

function galleryForDestination(destination: string, seed: string, count = 3) {
  const primary = imageForDestination(destination, seed);
  const gallery = [primary];
  let offset = 1;

  while (gallery.length < Math.max(1, count) && offset < DESTINATION_IMAGE_LIBRARY.length + 4) {
    const candidate = pickFallbackImage(`${seed}:${offset}`, offset);
    if (!gallery.includes(candidate)) {
      gallery.push(candidate);
    }
    offset += 1;
  }

  return gallery.slice(0, Math.max(1, count));
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0);
}

function daysFromNow(days: number) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function slugifySeed(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function buildDirectConversationKey(leftUserId: string, rightUserId: string) {
  return [leftUserId, rightUserId].sort().join(':');
}

function activeStatuses() {
  return ['INTERESTED', 'APPROVED', 'COMMITTED'] as const;
}

function genderCountsForUsers(
  users: Array<{ gender: SeedUser['gender'] | null }>,
  countStatuses: string[],
  memberships: Array<{ status: string; userId: string }>,
) {
  const activeUserIds = new Set(
    memberships.filter((membership) => countStatuses.includes(membership.status)).map((membership) => membership.userId),
  );

  return users.reduce(
    (acc, user, index) => {
      const membership = memberships[index];
      if (!membership || !activeUserIds.has(membership.userId)) return acc;
      if (user.gender === 'male') acc.maleCount += 1;
      else if (user.gender === 'female') acc.femaleCount += 1;
      else acc.otherCount += 1;
      return acc;
    },
    { maleCount: 0, femaleCount: 0, otherCount: 0 },
  );
}

async function upsertUser(seed: SeedUser, passwordHash: string) {
  const avatarUrl = pickFallbackImage(seed.key, 1);

  return prisma.user.upsert({
    where: { phone: seed.phone },
    update: {
      username: seed.username,
      email: seed.email,
      passwordHash,
      fullName: seed.fullName,
      gender: seed.gender,
      city: seed.city,
      verification: seed.verification,
      completedTrips: seed.completedTrips,
      avgRating: seed.avgRating,
      dateOfBirth: new Date(`${seed.dateOfBirth}T00:00:00.000Z`),
      aadhaarHash: seed.verification === 'BASIC' ? null : `seed_hash_${seed.key}`,
      bio: seed.bio,
      avatarUrl,
    },
    create: {
      phone: seed.phone,
      username: seed.username,
      email: seed.email,
      passwordHash,
      fullName: seed.fullName,
      gender: seed.gender,
      city: seed.city,
      verification: seed.verification,
      completedTrips: seed.completedTrips,
      avgRating: seed.avgRating,
      dateOfBirth: new Date(`${seed.dateOfBirth}T00:00:00.000Z`),
      aadhaarHash: seed.verification === 'BASIC' ? null : `seed_hash_${seed.key}`,
      bio: seed.bio,
      avatarUrl,
    },
  });
}

async function upsertAgency(agencySeed: SeedAgency, ownerId: string, ownerPhone: string) {
  const logoUrl = imageForDestination(
    agencySeed.destinations[0] ?? agencySeed.city,
    agencySeed.slug,
  );

  return prisma.agency.upsert({
    where: { ownerId },
    update: {
      name: agencySeed.name,
      slug: agencySeed.slug,
      description: agencySeed.description,
      city: agencySeed.city,
      state: agencySeed.state,
      verification: agencySeed.verification,
      gstin: agencySeed.gstin,
      pan: agencySeed.pan,
      tourismLicense: agencySeed.tourismLicense,
      phone: ownerPhone,
      email: `${agencySeed.slug}@tripsync.test`,
      specializations: agencySeed.specializations,
      destinations: agencySeed.destinations,
      avgRating: 4.6,
      totalReviews: 12,
      totalTrips: 18,
      logoUrl,
    },
    create: {
      ownerId,
      name: agencySeed.name,
      slug: agencySeed.slug,
      description: agencySeed.description,
      city: agencySeed.city,
      state: agencySeed.state,
      verification: agencySeed.verification,
      gstin: agencySeed.gstin,
      pan: agencySeed.pan,
      tourismLicense: agencySeed.tourismLicense,
      phone: ownerPhone,
      email: `${agencySeed.slug}@tripsync.test`,
      specializations: agencySeed.specializations,
      destinations: agencySeed.destinations,
      avgRating: 4.6,
      totalReviews: 12,
      totalTrips: 18,
      logoUrl,
    },
  });
}

async function seedAgencyPackages(
  agencyId: string,
  agencySlug: string,
  memberIds: string[],
) {
  for (let index = 0; index < packageBlueprints.length; index += 1) {
    const blueprint = packageBlueprints[index];
    const startDate = daysFromNow(15 + index * 6);
    const endDate = daysFromNow(18 + index * 6);
    const slug = `${agencySlug}-${slugifySeed(blueprint.title)}`;
    const packageGallery = galleryForDestination(blueprint.destination, slug, 3);

    const pkg = await prisma.package.upsert({
      where: { slug },
      update: {
        agencyId,
        title: blueprint.title,
        destination: blueprint.destination,
        destinationState: blueprint.destinationState,
        startDate,
        endDate,
        basePrice: blueprint.basePrice + index * 350,
        groupSizeMin: 4,
        groupSizeMax: 12,
        accommodation: blueprint.accommodation,
        vibes: blueprint.vibes,
        activities: blueprint.activities,
        inclusions: {
          transport: true,
          stay: true,
          meals: index % 2 === 0,
        },
        itinerary: [
          { day: 1, title: 'Arrival and warm-up', description: 'Transit, check-in, and local orientation.' },
          { day: 2, title: 'Core experience day', description: `Main ${blueprint.activities[0]} block plus social dinner.` },
          { day: 3, title: 'Scenic close-out', description: 'Photo stops and return transit.' },
        ],
        galleryUrls: packageGallery,
        status: 'OPEN',
      },
      create: {
        agencyId,
        slug,
        title: blueprint.title,
        destination: blueprint.destination,
        destinationState: blueprint.destinationState,
        startDate,
        endDate,
        basePrice: blueprint.basePrice + index * 350,
        groupSizeMin: 4,
        groupSizeMax: 12,
        accommodation: blueprint.accommodation,
        vibes: blueprint.vibes,
        activities: blueprint.activities,
        inclusions: {
          transport: true,
          stay: true,
          meals: index % 2 === 0,
        },
        itinerary: [
          { day: 1, title: 'Arrival and warm-up', description: 'Transit, check-in, and local orientation.' },
          { day: 2, title: 'Core experience day', description: `Main ${blueprint.activities[0]} block plus social dinner.` },
          { day: 3, title: 'Scenic close-out', description: 'Photo stops and return transit.' },
        ],
        galleryUrls: packageGallery,
        status: 'OPEN',
      },
    });

    const group = await prisma.group.upsert({
      where: { packageId: pkg.id },
      update: {},
      create: { packageId: pkg.id },
    });

    for (const userId of memberIds.slice(0, 2 + (index % 2))) {
      await prisma.groupMember.upsert({
        where: { groupId_userId: { groupId: group.id, userId } },
        update: { status: 'APPROVED', role: 'MEMBER', leftAt: null, committedAt: null },
        create: { groupId: group.id, userId, status: 'APPROVED' },
      });
    }

    const memberships = await prisma.groupMember.findMany({
      where: { groupId: group.id, status: { in: activeStatuses() as any } },
      select: { userId: true, status: true, user: { select: { gender: true } } },
      orderBy: { joinedAt: 'asc' },
    });
    const counts = genderCountsForUsers(
      memberships.map((membership) => ({ gender: membership.user.gender as SeedUser['gender'] | null })),
      [...activeStatuses()],
      memberships.map((membership) => ({ userId: membership.userId, status: membership.status })),
    );

    await prisma.group.update({
      where: { id: group.id },
      data: {
        currentSize: memberships.length,
        ...counts,
      },
    });
  }
}

async function upsertScenarioPlan(creatorId: string, scenario: PlanScenario) {
  const startDate = daysFromNow(scenario.startOffset);
  const endDate = daysFromNow(scenario.endOffset);
  const scenarioGallery = galleryForDestination(scenario.destination, scenario.slug, 3);

  const plan = await prisma.plan.upsert({
    where: { slug: scenario.slug },
    update: {
      creatorId,
      title: scenario.title,
      destination: scenario.destination,
      destinationState: scenario.destinationState,
      startDate,
      endDate,
      budgetMin: scenario.budgetMin,
      budgetMax: scenario.budgetMax,
      groupSizeMin: 4,
      groupSizeMax: scenario.groupSizeMax,
      groupType: scenario.groupType,
      genderPref: scenario.genderPref,
      accommodation: scenario.accommodation,
      vibes: scenario.vibes,
      activities: scenario.activities,
      description: scenario.description,
      itinerary: [
        { day: 1, title: 'Depart and settle in', description: 'Transit and first-night reset.' },
        { day: 2, title: 'Signature experience', description: `Main ${scenario.activities[0]} block and group time.` },
        { day: 3, title: 'Wrap and return', description: 'Slow close-out and departure.' },
      ],
      galleryUrls: scenarioGallery,
      coverImageUrl: scenarioGallery[0],
      autoApprove: scenario.autoApprove,
      status: scenario.status,
      expiresAt: daysFromNow(60),
      confirmedAt: scenario.status === 'CONFIRMED' || scenario.status === 'COMPLETED' ? daysFromNow(-1) : null,
    },
    create: {
      creatorId,
      slug: scenario.slug,
      title: scenario.title,
      destination: scenario.destination,
      destinationState: scenario.destinationState,
      startDate,
      endDate,
      budgetMin: scenario.budgetMin,
      budgetMax: scenario.budgetMax,
      groupSizeMin: 4,
      groupSizeMax: scenario.groupSizeMax,
      groupType: scenario.groupType,
      genderPref: scenario.genderPref,
      accommodation: scenario.accommodation,
      vibes: scenario.vibes,
      activities: scenario.activities,
      description: scenario.description,
      itinerary: [
        { day: 1, title: 'Depart and settle in', description: 'Transit and first-night reset.' },
        { day: 2, title: 'Signature experience', description: `Main ${scenario.activities[0]} block and group time.` },
        { day: 3, title: 'Wrap and return', description: 'Slow close-out and departure.' },
      ],
      galleryUrls: scenarioGallery,
      coverImageUrl: scenarioGallery[0],
      autoApprove: scenario.autoApprove,
      status: scenario.status,
      expiresAt: daysFromNow(60),
      confirmedAt: scenario.status === 'CONFIRMED' || scenario.status === 'COMPLETED' ? daysFromNow(-1) : null,
    },
  });

  const creator = await prisma.user.findUnique({
    where: { id: creatorId },
    select: { gender: true },
  });

  const group = await prisma.group.upsert({
    where: { planId: plan.id },
    update: {
      isLocked: scenario.status !== 'OPEN',
      currentSize: 1,
      maleCount: creator?.gender === 'male' ? 1 : 0,
      femaleCount: creator?.gender === 'female' ? 1 : 0,
      otherCount: creator?.gender === 'other' || !creator?.gender ? 1 : 0,
    },
    create: {
      planId: plan.id,
      isLocked: scenario.status !== 'OPEN',
      currentSize: 1,
      maleCount: creator?.gender === 'male' ? 1 : 0,
      femaleCount: creator?.gender === 'female' ? 1 : 0,
      otherCount: creator?.gender === 'other' || !creator?.gender ? 1 : 0,
    },
  });

  await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId: group.id, userId: creatorId } },
    update: { role: 'CREATOR', status: 'APPROVED', leftAt: null, committedAt: null },
    create: { groupId: group.id, userId: creatorId, role: 'CREATOR', status: 'APPROVED' },
  });

  return { plan, group };
}

async function syncGroupMemberships(
  groupId: string,
  memberships: Array<{ userId: string; status: 'INTERESTED' | 'APPROVED' | 'COMMITTED'; role?: 'CREATOR' | 'MEMBER' }>,
) {
  const allowedUserIds = new Set(memberships.map((membership) => membership.userId));

  await prisma.groupMember.updateMany({
    where: {
      groupId,
      userId: { notIn: Array.from(allowedUserIds) },
      role: 'MEMBER',
      status: { in: ['INTERESTED', 'APPROVED', 'COMMITTED'] },
    },
    data: {
      status: 'LEFT',
      leftAt: new Date(),
      committedAt: null,
    },
  });

  for (const membership of memberships) {
    await prisma.groupMember.upsert({
      where: { groupId_userId: { groupId, userId: membership.userId } },
      update: {
        role: membership.role ?? 'MEMBER',
        status: membership.status,
        leftAt: null,
        committedAt: membership.status === 'COMMITTED' ? new Date() : null,
      },
      create: {
        groupId,
        userId: membership.userId,
        role: membership.role ?? 'MEMBER',
        status: membership.status,
        committedAt: membership.status === 'COMMITTED' ? new Date() : null,
      },
    });
  }

  const refreshed = await prisma.groupMember.findMany({
    where: { groupId, status: { in: activeStatuses() as any } },
    select: { userId: true, status: true, user: { select: { gender: true } } },
    orderBy: { joinedAt: 'asc' },
  });

  const counts = genderCountsForUsers(
    refreshed.map((membership) => ({ gender: membership.user.gender as SeedUser['gender'] | null })),
    [...activeStatuses()],
    refreshed.map((membership) => ({ userId: membership.userId, status: membership.status })),
  );

  await prisma.group.update({
    where: { id: groupId },
    data: {
      currentSize: refreshed.length,
      ...counts,
    },
  });
}

async function upsertOfferForPlan(input: {
  planId: string;
  agencyId: string;
  pricePerPerson: number;
  status: 'PENDING' | 'COUNTERED' | 'ACCEPTED' | 'REJECTED';
  isReferred?: boolean;
  referredAt?: Date;
  pricingTiers?: Array<{ minPax: number; price: number }>;
  inclusions?: Record<string, unknown>;
  cancellationPolicy?: string;
  negotiations?: Array<{
    round: number;
    senderType: 'user' | 'agency';
    price?: number;
    message?: string;
  }>;
}) {
  const offer = await prisma.offer.upsert({
    where: {
      planId_agencyId: {
        planId: input.planId,
        agencyId: input.agencyId,
      },
    },
    update: {
      pricePerPerson: input.pricePerPerson,
      status: input.status,
      isReferred: input.isReferred ?? false,
      referredAt: input.referredAt ?? null,
      pricingTiers: input.pricingTiers as any,
      inclusions: input.inclusions as any,
      cancellationPolicy: input.cancellationPolicy ?? null,
      validUntil: daysFromNow(10),
      itinerary: [
        { day: 1, title: 'Arrival and check-in', description: 'Transfer and orientation.' },
        { day: 2, title: 'Signature experience', description: 'Core day built for the plan brief.' },
        { day: 3, title: 'Departure', description: 'Return transit and check-out.' },
      ],
    },
    create: {
      planId: input.planId,
      agencyId: input.agencyId,
      pricePerPerson: input.pricePerPerson,
      status: input.status,
      isReferred: input.isReferred ?? false,
      referredAt: input.referredAt ?? null,
      pricingTiers: input.pricingTiers as any,
      inclusions: input.inclusions as any,
      cancellationPolicy: input.cancellationPolicy ?? null,
      validUntil: daysFromNow(10),
      itinerary: [
        { day: 1, title: 'Arrival and check-in', description: 'Transfer and orientation.' },
        { day: 2, title: 'Signature experience', description: 'Core day built for the plan brief.' },
        { day: 3, title: 'Departure', description: 'Return transit and check-out.' },
      ],
    },
  });

  await prisma.offerNegotiation.deleteMany({ where: { offerId: offer.id } });
  if (input.negotiations?.length) {
    await prisma.offerNegotiation.createMany({
      data: input.negotiations.map((negotiation) => ({
        offerId: offer.id,
        round: negotiation.round,
        senderType: negotiation.senderType,
        price: negotiation.price,
        message: negotiation.message,
      })),
    });
  }

  return offer;
}

async function upsertPaymentRecord(input: {
  groupId: string;
  userId: string;
  amount: number;
  status: PaymentStatus;
  orderIdSuffix: string;
  paymentIdSuffix?: string;
}) {
  const existing = await prisma.payment.findFirst({
    where: { groupId: input.groupId, userId: input.userId },
  });

  if (existing) {
    return prisma.payment.update({
      where: { id: existing.id },
      data: {
        amount: input.amount,
        currency: 'INR',
        status: input.status,
        razorpayOrderId: `order_seed_${input.orderIdSuffix}`,
        razorpayPaymentId: input.paymentIdSuffix ? `pay_seed_${input.paymentIdSuffix}` : null,
      },
    });
  }

  return prisma.payment.create({
    data: {
      groupId: input.groupId,
      userId: input.userId,
      amount: input.amount,
      currency: 'INR',
      status: input.status,
      razorpayOrderId: `order_seed_${input.orderIdSuffix}`,
      razorpayPaymentId: input.paymentIdSuffix ? `pay_seed_${input.paymentIdSuffix}` : null,
    },
  });
}

async function replaceGroupChat(
  groupId: string,
  entries: Array<{
    senderId: string | null;
    messageType: 'text' | 'system' | 'poll';
    content: string;
    metadata?: Record<string, unknown>;
  }>,
) {
  await prisma.chatMessage.deleteMany({ where: { groupId } });

  for (const entry of entries) {
    await prisma.chatMessage.create({
      data: {
        groupId,
        senderId: entry.senderId,
        messageType: entry.messageType,
        content: entry.content,
        metadata: entry.metadata as any,
      },
    });
  }
}

async function replaceDirectConversationMessages(
  userId: string,
  targetUserId: string,
  entries: Array<{ senderId: string; content: string }>,
) {
  const key = buildDirectConversationKey(userId, targetUserId);
  const conversation = await prisma.directConversation.upsert({
    where: { key },
    update: {},
    create: {
      key,
      participants: {
        create: [
          { userId, lastReadAt: new Date() },
          { userId: targetUserId, lastReadAt: new Date() },
        ],
      },
    },
  });

  await prisma.directConversationParticipant.upsert({
    where: { conversationId_userId: { conversationId: conversation.id, userId } },
    update: { lastReadAt: new Date() },
    create: { conversationId: conversation.id, userId, lastReadAt: new Date() },
  });
  await prisma.directConversationParticipant.upsert({
    where: { conversationId_userId: { conversationId: conversation.id, userId: targetUserId } },
    update: { lastReadAt: new Date() },
    create: { conversationId: conversation.id, userId: targetUserId, lastReadAt: new Date() },
  });

  await prisma.directMessage.deleteMany({ where: { conversationId: conversation.id } });
  for (const entry of entries) {
    await prisma.directMessage.create({
      data: {
        conversationId: conversation.id,
        senderId: entry.senderId,
        content: entry.content,
      },
    });
  }
}

async function seedPlanScenarios(
  userMap: Map<string, Awaited<ReturnType<typeof upsertUser>>>,
  agencyMap: Map<string, Awaited<ReturnType<typeof upsertAgency>>>,
) {
  const scenarios = new Map<string, { planId: string; groupId: string }>();

  for (const scenario of planScenarios) {
    const creator = userMap.get(scenario.creatorKey)!;
    const { plan, group } = await upsertScenarioPlan(creator.id, scenario);
    scenarios.set(scenario.key, { planId: plan.id, groupId: group.id });
  }

  await syncGroupMemberships(scenarios.get('open_no_offers')!.groupId, [
    { userId: userMap.get('mira')!.id, role: 'CREATOR', status: 'APPROVED' },
    { userId: userMap.get('isha')!.id, status: 'APPROVED' },
  ]);

  await syncGroupMemberships(scenarios.get('offer_battle')!.groupId, [
    { userId: userMap.get('kabir')!.id, role: 'CREATOR', status: 'APPROVED' },
    { userId: userMap.get('meher')!.id, status: 'APPROVED' },
    { userId: userMap.get('aman')!.id, status: 'INTERESTED' },
  ]);

  await syncGroupMemberships(scenarios.get('referral_loop')!.groupId, [
    { userId: userMap.get('ananya')!.id, role: 'CREATOR', status: 'APPROVED' },
    { userId: userMap.get('isha')!.id, status: 'APPROVED' },
    { userId: userMap.get('komal')!.id, status: 'APPROVED' },
  ]);

  await syncGroupMemberships(scenarios.get('manual_approval')!.groupId, [
    { userId: userMap.get('riya')!.id, role: 'CREATOR', status: 'APPROVED' },
    { userId: userMap.get('yuvraj')!.id, status: 'INTERESTED' },
    { userId: userMap.get('neha')!.id, status: 'INTERESTED' },
  ]);

  await syncGroupMemberships(scenarios.get('confirming')!.groupId, [
    { userId: userMap.get('mira')!.id, role: 'CREATOR', status: 'COMMITTED' },
    { userId: userMap.get('komal')!.id, status: 'COMMITTED' },
    { userId: userMap.get('yuvraj')!.id, status: 'APPROVED' },
  ]);

  await syncGroupMemberships(scenarios.get('confirmed')!.groupId, [
    { userId: userMap.get('kabir')!.id, role: 'CREATOR', status: 'COMMITTED' },
    { userId: userMap.get('isha')!.id, status: 'COMMITTED' },
    { userId: userMap.get('meher')!.id, status: 'COMMITTED' },
  ]);

  await syncGroupMemberships(scenarios.get('completed')!.groupId, [
    { userId: userMap.get('ananya')!.id, role: 'CREATOR', status: 'COMMITTED' },
    { userId: userMap.get('komal')!.id, status: 'COMMITTED' },
    { userId: userMap.get('neha')!.id, status: 'COMMITTED' },
  ]);

  await syncGroupMemberships(scenarios.get('open_generic')!.groupId, [
    { userId: userMap.get('riya')!.id, role: 'CREATOR', status: 'APPROVED' },
    { userId: userMap.get('rahul')!.id, status: 'APPROVED' },
  ]);

  const offerBattlePlanId = scenarios.get('offer_battle')!.planId;
  await upsertOfferForPlan({
    planId: offerBattlePlanId,
    agencyId: agencyMap.get('summit-circuit-expeditions')!.id,
    pricePerPerson: 16800,
    status: 'COUNTERED',
    negotiations: [
      { round: 1, senderType: 'agency', price: 17200, message: 'Including stay, transfer, and breakfast.' },
      { round: 2, senderType: 'user', price: 16400, message: 'Can you sharpen the price for a 3-person commit?' },
      { round: 3, senderType: 'agency', price: 16800, message: 'Best final number with the current itinerary.' },
    ],
  });
  await upsertOfferForPlan({
    planId: offerBattlePlanId,
    agencyId: agencyMap.get('pine-trail-collective')!.id,
    pricePerPerson: 18100,
    status: 'PENDING',
  });
  await upsertOfferForPlan({
    planId: offerBattlePlanId,
    agencyId: agencyMap.get('riverstone-routes')!.id,
    pricePerPerson: 17500,
    status: 'REJECTED',
  });

  const referralPlanId = scenarios.get('referral_loop')!.planId;
  await upsertOfferForPlan({
    planId: referralPlanId,
    agencyId: agencyMap.get('altitude-pulse-travel')!.id,
    pricePerPerson: 0,
    status: 'PENDING',
    isReferred: true,
    referredAt: new Date(),
  });
  await upsertOfferForPlan({
    planId: referralPlanId,
    agencyId: agencyMap.get('northbound-social-club')!.id,
    pricePerPerson: 13800,
    status: 'PENDING',
    isReferred: true,
    referredAt: new Date(),
  });
  await upsertOfferForPlan({
    planId: referralPlanId,
    agencyId: agencyMap.get('summit-circuit-expeditions')!.id,
    pricePerPerson: 0,
    status: 'PENDING',
    isReferred: true,
    referredAt: new Date(),
  });

  const confirmingAccepted = await upsertOfferForPlan({
    planId: scenarios.get('confirming')!.planId,
    agencyId: agencyMap.get('summit-circuit-expeditions')!.id,
    pricePerPerson: 22400,
    status: 'ACCEPTED',
  });
  await prisma.plan.update({
    where: { id: scenarios.get('confirming')!.planId },
    data: { selectedOfferId: confirmingAccepted.id, status: 'CONFIRMING', confirmedAt: null },
  });

  const confirmedAccepted = await upsertOfferForPlan({
    planId: scenarios.get('confirmed')!.planId,
    agencyId: agencyMap.get('northbound-social-club')!.id,
    pricePerPerson: 15200,
    status: 'ACCEPTED',
  });
  await prisma.plan.update({
    where: { id: scenarios.get('confirmed')!.planId },
    data: {
      selectedOfferId: confirmedAccepted.id,
      status: 'CONFIRMED',
      confirmedAt: daysFromNow(-2),
    },
  });

  const completedAccepted = await upsertOfferForPlan({
    planId: scenarios.get('completed')!.planId,
    agencyId: agencyMap.get('pine-trail-collective')!.id,
    pricePerPerson: 18400,
    status: 'ACCEPTED',
  });
  await prisma.plan.update({
    where: { id: scenarios.get('completed')!.planId },
    data: {
      selectedOfferId: completedAccepted.id,
      status: 'COMPLETED',
      confirmedAt: daysFromNow(-15),
    },
  });

  const confirmingAmount = 22400 * 100;
  await upsertPaymentRecord({
    groupId: scenarios.get('confirming')!.groupId,
    userId: userMap.get('mira')!.id,
    amount: confirmingAmount,
    status: PaymentStatus.CAPTURED,
    orderIdSuffix: 'confirming_mira',
    paymentIdSuffix: 'confirming_mira',
  });
  await upsertPaymentRecord({
    groupId: scenarios.get('confirming')!.groupId,
    userId: userMap.get('komal')!.id,
    amount: confirmingAmount,
    status: PaymentStatus.CAPTURED,
    orderIdSuffix: 'confirming_komal',
    paymentIdSuffix: 'confirming_komal',
  });
  await upsertPaymentRecord({
    groupId: scenarios.get('confirming')!.groupId,
    userId: userMap.get('yuvraj')!.id,
    amount: confirmingAmount,
    status: PaymentStatus.PENDING,
    orderIdSuffix: 'confirming_yuvraj',
  });

  const confirmedAmount = 15200 * 100;
  for (const key of ['kabir', 'isha', 'meher'] as const) {
    await upsertPaymentRecord({
      groupId: scenarios.get('confirmed')!.groupId,
      userId: userMap.get(key)!.id,
      amount: confirmedAmount,
      status: PaymentStatus.CAPTURED,
      orderIdSuffix: `confirmed_${key}`,
      paymentIdSuffix: `confirmed_${key}`,
    });
  }

  const completedAmount = 18400 * 100;
  for (const key of ['ananya', 'komal', 'neha'] as const) {
    await upsertPaymentRecord({
      groupId: scenarios.get('completed')!.groupId,
      userId: userMap.get(key)!.id,
      amount: completedAmount,
      status: PaymentStatus.CAPTURED,
      orderIdSuffix: `completed_${key}`,
      paymentIdSuffix: `completed_${key}`,
    });
  }

  await replaceGroupChat(scenarios.get('confirming')!.groupId, [
    { senderId: null, messageType: 'system', content: 'An agency offer was accepted. Payment collection is now open for approved travelers.' },
    { senderId: userMap.get('mira')!.id, messageType: 'text', content: 'I have paid. Yuvraj, once you clear your checkout we are good to go.' },
    { senderId: userMap.get('yuvraj')!.id, messageType: 'text', content: 'Will finish payment tonight. Can we keep the departure at 10 PM?' },
  ]);

  await replaceGroupChat(scenarios.get('confirmed')!.groupId, [
    { senderId: null, messageType: 'system', content: 'All approved travelers have paid. The trip is now confirmed.' },
    { senderId: userMap.get('kabir')!.id, messageType: 'text', content: 'Trip is confirmed. Dropping final stay and pickup notes here.' },
    { senderId: userMap.get('isha')!.id, messageType: 'text', content: 'Perfect. I am carrying board games for the hostel night.' },
    {
      senderId: userMap.get('meher')!.id,
      messageType: 'poll',
      content: 'Which pickup point works best?',
      metadata: {
        options: [
          { id: 'option_1', label: 'Kashmere Gate', votes: [userMap.get('kabir')!.id, userMap.get('isha')!.id] },
          { id: 'option_2', label: 'Majnu ka Tila', votes: [userMap.get('meher')!.id] },
        ],
      },
    },
  ]);

  await replaceGroupChat(scenarios.get('completed')!.groupId, [
    { senderId: null, messageType: 'system', content: 'Trip wrapped successfully. Review your agency and co-travelers to leave trust signals for the community.' },
    { senderId: userMap.get('ananya')!.id, messageType: 'text', content: 'Loved how smooth this one was. Leaving reviews now.' },
    { senderId: userMap.get('komal')!.id, messageType: 'text', content: 'Same here. The stay and pacing were both excellent.' },
  ]);

  await prisma.review.deleteMany({ where: { groupId: scenarios.get('completed')!.groupId } });
  await prisma.review.createMany({
    data: [
      {
        reviewerId: userMap.get('ananya')!.id,
        reviewType: 'agency',
        targetAgencyId: agencyMap.get('pine-trail-collective')!.id,
        groupId: scenarios.get('completed')!.groupId,
        overallRating: 5,
        safetyRating: 5,
        valueRating: 5,
        comment: 'Strong pacing, clean stays, and clear pre-trip coordination.',
      },
      {
        reviewerId: userMap.get('komal')!.id,
        reviewType: 'co_traveler',
        targetUserId: userMap.get('ananya')!.id,
        groupId: scenarios.get('completed')!.groupId,
        overallRating: 5,
        safetyRating: 5,
        valueRating: 4,
        comment: 'Excellent host energy. Kept the group aligned without over-managing.',
      },
      {
        reviewerId: userMap.get('neha')!.id,
        reviewType: 'co_traveler',
        targetUserId: userMap.get('komal')!.id,
        groupId: scenarios.get('completed')!.groupId,
        overallRating: 5,
        safetyRating: 5,
        valueRating: 5,
        comment: 'Super easy co-traveler and very responsive in chat.',
      },
    ],
  });

  await replaceDirectConversationMessages(userMap.get('mira')!.id, userMap.get('isha')!.id, [
    { senderId: userMap.get('mira')!.id, content: 'Hey Isha, checking if you are still in for the Bir plan.' },
    { senderId: userMap.get('isha')!.id, content: 'Yes, absolutely. The group vibe looks great.' },
    { senderId: userMap.get('mira')!.id, content: 'Perfect. Use the group chat for updates and ping me here if anything changes.' },
  ]);
  await replaceDirectConversationMessages(userMap.get('kabir')!.id, userMap.get('meher')!.id, [
    { senderId: userMap.get('kabir')!.id, content: 'Do you prefer the cottage option or should we negotiate for hostel pricing?' },
    { senderId: userMap.get('meher')!.id, content: 'Hostel is fine for me if the itinerary stays the same.' },
  ]);
  await replaceDirectConversationMessages(userMap.get('ananya')!.id, userMap.get('komal')!.id, [
    { senderId: userMap.get('komal')!.id, content: 'The referral flow looks good. One of the agencies has already replied.' },
    { senderId: userMap.get('ananya')!.id, content: 'Nice. I will compare the offer cards tonight.' },
  ]);

  return scenarios;
}

async function backfillExistingMedia() {
  const plans = await prisma.plan.findMany({
    select: {
      id: true,
      slug: true,
      destination: true,
      galleryUrls: true,
      coverImageUrl: true,
    },
  });

  for (const plan of plans) {
    const existingGallery = asStringArray(plan.galleryUrls);
    const fallbackGallery = galleryForDestination(plan.destination, plan.slug, 3);
    const nextCover = plan.coverImageUrl ?? existingGallery[0] ?? fallbackGallery[0];
    const nextGallery =
      existingGallery.length > 0
        ? uniqueStrings([nextCover, ...existingGallery].filter((value): value is string => Boolean(value)))
        : uniqueStrings([nextCover, ...fallbackGallery].filter((value): value is string => Boolean(value)));

    if (!nextCover) continue;

    const needsUpdate =
      plan.coverImageUrl !== nextCover ||
      existingGallery.length === 0;

    if (needsUpdate) {
      await prisma.plan.update({
        where: { id: plan.id },
        data: {
          coverImageUrl: nextCover,
          galleryUrls: nextGallery,
        },
      });
    }
  }

  const packages = await prisma.package.findMany({
    select: {
      id: true,
      slug: true,
      destination: true,
      galleryUrls: true,
    },
  });

  for (const pkg of packages) {
    const existingGallery = asStringArray(pkg.galleryUrls);
    if (existingGallery.length > 0) continue;

    const nextGallery = galleryForDestination(pkg.destination, pkg.slug, 3);
    await prisma.package.update({
      where: { id: pkg.id },
      data: { galleryUrls: nextGallery },
    });
  }

  const usersWithoutAvatar = await prisma.user.findMany({
    where: { avatarUrl: null },
    select: { id: true, username: true },
  });

  for (const user of usersWithoutAvatar) {
    const avatarUrl = pickFallbackImage(user.username ?? user.id, 2);
    await prisma.user.update({
      where: { id: user.id },
      data: { avatarUrl },
    });
  }

  const agenciesWithoutLogo = await prisma.agency.findMany({
    where: { logoUrl: null },
    select: {
      id: true,
      slug: true,
      city: true,
      destinations: true,
      name: true,
    },
  });

  for (const agency of agenciesWithoutLogo) {
    const destinations = asStringArray(agency.destinations);
    const seed = agency.slug || agency.id;
    const source = destinations[0] ?? agency.city ?? agency.name;
    const logoUrl = imageForDestination(source, seed);
    await prisma.agency.update({
      where: { id: agency.id },
      data: { logoUrl },
    });
  }
}

async function main() {
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const userMap = new Map<string, Awaited<ReturnType<typeof upsertUser>>>();
  const agencyMap = new Map<string, Awaited<ReturnType<typeof upsertAgency>>>();

  for (const seed of seedUsers) {
    const user = await upsertUser(seed, passwordHash);
    userMap.set(seed.key, user);
  }

  for (const agencySeed of seedAgencies) {
    const owner = userMap.get(agencySeed.ownerKey);
    if (!owner) continue;
    const agency = await upsertAgency(agencySeed, owner.id, owner.phone);
    agencyMap.set(agencySeed.slug, agency);
  }

  for (const agencySeed of seedAgencies) {
    const agency = agencyMap.get(agencySeed.slug);
    if (!agency) continue;
    await seedAgencyPackages(agency.id, agency.slug, [
      userMap.get('isha')!.id,
      userMap.get('rahul')!.id,
      userMap.get('meher')!.id,
      userMap.get('komal')!.id,
    ]);
  }

  await seedPlanScenarios(userMap, agencyMap);
  await backfillExistingMedia();

  console.log(`TravellersIn QA seed complete. Shared password: ${DEMO_PASSWORD}`);
  console.log('Traveler logins:');
  for (const user of seedUsers.filter((item) => !item.key.endsWith('_owner'))) {
    console.log(`- ${user.fullName}: ${user.username} / ${user.email}`);
  }
  console.log('Agency owner logins:');
  for (const user of seedUsers.filter((item) => item.key.endsWith('_owner'))) {
    console.log(`- ${user.fullName}: ${user.username} / ${user.email}`);
  }
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
