import { prisma } from '../src/lib/prisma.js';

type SeedUser = {
  key: string;
  phone: string;
  fullName: string;
  gender: 'male' | 'female' | 'other';
  city: string;
  verification: 'BASIC' | 'VERIFIED' | 'TRUSTED';
  completedTrips: number;
  avgRating: number;
  dateOfBirth: string;
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

const seedUsers: SeedUser[] = [
  {
    key: 'mira',
    phone: '9100000001',
    fullName: 'Mira Kapoor',
    gender: 'female',
    city: 'Delhi',
    verification: 'TRUSTED',
    completedTrips: 6,
    avgRating: 4.9,
    dateOfBirth: '1994-05-14',
  },
  {
    key: 'riya',
    phone: '9100000002',
    fullName: 'Riya Chandel',
    gender: 'female',
    city: 'Chandigarh',
    verification: 'VERIFIED',
    completedTrips: 3,
    avgRating: 4.7,
    dateOfBirth: '1996-08-09',
  },
  {
    key: 'kabir',
    phone: '9100000003',
    fullName: 'Kabir Malhotra',
    gender: 'male',
    city: 'Gurugram',
    verification: 'VERIFIED',
    completedTrips: 4,
    avgRating: 4.5,
    dateOfBirth: '1993-02-11',
  },
  {
    key: 'ananya',
    phone: '9100000004',
    fullName: 'Ananya Rawat',
    gender: 'female',
    city: 'Dehradun',
    verification: 'TRUSTED',
    completedTrips: 7,
    avgRating: 4.8,
    dateOfBirth: '1995-01-22',
  },
  {
    key: 'arjun_owner',
    phone: '9100000011',
    fullName: 'Arjun Sethi',
    gender: 'male',
    city: 'Delhi',
    verification: 'TRUSTED',
    completedTrips: 5,
    avgRating: 4.7,
    dateOfBirth: '1991-07-17',
  },
  {
    key: 'tara_owner',
    phone: '9100000012',
    fullName: 'Tara Rana',
    gender: 'female',
    city: 'Shimla',
    verification: 'TRUSTED',
    completedTrips: 6,
    avgRating: 4.8,
    dateOfBirth: '1990-11-04',
  },
  {
    key: 'neel_owner',
    phone: '9100000013',
    fullName: 'Neel Bhardwaj',
    gender: 'male',
    city: 'Noida',
    verification: 'VERIFIED',
    completedTrips: 2,
    avgRating: 4.4,
    dateOfBirth: '1992-04-25',
  },
  {
    key: 'sana_owner',
    phone: '9100000014',
    fullName: 'Sana Dutt',
    gender: 'female',
    city: 'Mohali',
    verification: 'TRUSTED',
    completedTrips: 5,
    avgRating: 4.9,
    dateOfBirth: '1993-09-08',
  },
  {
    key: 'dev_owner',
    phone: '9100000015',
    fullName: 'Dev Mehta',
    gender: 'male',
    city: 'Jaipur',
    verification: 'VERIFIED',
    completedTrips: 3,
    avgRating: 4.6,
    dateOfBirth: '1989-12-13',
  },
  {
    key: 'isha',
    phone: '9100000021',
    fullName: 'Isha Verma',
    gender: 'female',
    city: 'Delhi',
    verification: 'VERIFIED',
    completedTrips: 2,
    avgRating: 4.5,
    dateOfBirth: '1998-03-18',
  },
  {
    key: 'rahul',
    phone: '9100000022',
    fullName: 'Rahul Dogra',
    gender: 'male',
    city: 'Pathankot',
    verification: 'BASIC',
    completedTrips: 1,
    avgRating: 4.2,
    dateOfBirth: '1997-06-20',
  },
  {
    key: 'meher',
    phone: '9100000023',
    fullName: 'Meher Bawa',
    gender: 'female',
    city: 'Chandigarh',
    verification: 'VERIFIED',
    completedTrips: 3,
    avgRating: 4.7,
    dateOfBirth: '1999-10-02',
  },
  {
    key: 'yuvraj',
    phone: '9100000024',
    fullName: 'Yuvraj Singh',
    gender: 'male',
    city: 'Ludhiana',
    verification: 'VERIFIED',
    completedTrips: 2,
    avgRating: 4.4,
    dateOfBirth: '1996-01-15',
  },
  {
    key: 'komal',
    phone: '9100000025',
    fullName: 'Komal Bisht',
    gender: 'female',
    city: 'Dehradun',
    verification: 'TRUSTED',
    completedTrips: 5,
    avgRating: 4.8,
    dateOfBirth: '1994-09-27',
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
  {
    title: 'Auli Snowline Sprint',
    destination: 'Auli',
    destinationState: 'Uttarakhand',
    accommodation: 'Slope-view hotel',
    basePrice: 22400,
    vibes: ['premium', 'adventure'],
    activities: ['gondola', 'ski intro', 'sunset point'],
  },
];

const planBlueprints = [
  {
    title: 'Women-led Bir sunrise launch squad',
    destination: 'Bir Billing',
    destinationState: 'Himachal Pradesh',
    budgetMin: 14000,
    budgetMax: 21000,
    groupType: 'female_only',
    genderPref: 'female_only',
    vibes: ['adventure', 'content'],
    activities: ['paragliding', 'sunrise drive'],
    creatorKey: 'mira',
  },
  {
    title: 'Tirthan cabin crew escape',
    destination: 'Tirthan Valley',
    destinationState: 'Himachal Pradesh',
    budgetMin: 12000,
    budgetMax: 18000,
    groupType: 'friends',
    genderPref: 'balanced',
    vibes: ['nature', 'slow travel'],
    activities: ['river walk', 'bonfire'],
    creatorKey: 'kabir',
  },
  {
    title: 'Rishikesh reset with rafting and cafes',
    destination: 'Rishikesh',
    destinationState: 'Uttarakhand',
    budgetMin: 9000,
    budgetMax: 16000,
    groupType: 'solo',
    genderPref: 'open',
    vibes: ['wellness', 'adventure'],
    activities: ['rafting', 'sunrise yoga'],
    creatorKey: 'ananya',
  },
  {
    title: 'Shoja remote-work sprint',
    destination: 'Shoja',
    destinationState: 'Himachal Pradesh',
    budgetMin: 15000,
    budgetMax: 24000,
    groupType: 'friends',
    genderPref: 'balanced',
    vibes: ['workation', 'nature'],
    activities: ['forest trail', 'cafe workday'],
    creatorKey: 'riya',
  },
];

function slugifySeed(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function daysFromNow(days: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

function getGenderCounts(members: Array<{ gender: SeedUser['gender'] }>) {
  return members.reduce(
    (acc, member) => {
      if (member.gender === 'male') acc.maleCount += 1;
      else if (member.gender === 'female') acc.femaleCount += 1;
      else acc.otherCount += 1;
      return acc;
    },
    { maleCount: 0, femaleCount: 0, otherCount: 0 },
  );
}

async function upsertUser(seed: SeedUser) {
  return prisma.user.upsert({
    where: { phone: seed.phone },
    update: {
      fullName: seed.fullName,
      gender: seed.gender,
      city: seed.city,
      verification: seed.verification,
      completedTrips: seed.completedTrips,
      avgRating: seed.avgRating,
      dateOfBirth: new Date(`${seed.dateOfBirth}T00:00:00.000Z`),
      aadhaarHash: seed.verification === 'BASIC' ? null : `seed_hash_${seed.key}`,
      bio: `Seeded beta profile for ${seed.fullName}.`,
    },
    create: {
      phone: seed.phone,
      fullName: seed.fullName,
      gender: seed.gender,
      city: seed.city,
      verification: seed.verification,
      completedTrips: seed.completedTrips,
      avgRating: seed.avgRating,
      dateOfBirth: new Date(`${seed.dateOfBirth}T00:00:00.000Z`),
      aadhaarHash: seed.verification === 'BASIC' ? null : `seed_hash_${seed.key}`,
      bio: `Seeded beta profile for ${seed.fullName}.`,
    },
  });
}

async function seedAgencyPackages(agencyId: string, agencySlug: string, memberIds: string[]) {
  for (let index = 0; index < packageBlueprints.length; index += 1) {
    const blueprint = packageBlueprints[index];
    const startDate = daysFromNow(15 + index * 5);
    const endDate = daysFromNow(18 + index * 5);
    const slug = `${agencySlug}-${slugifySeed(blueprint.title)}`;

    const pkg = await prisma.package.upsert({
      where: { slug },
      update: {
        agencyId,
        title: blueprint.title,
        destination: blueprint.destination,
        destinationState: blueprint.destinationState,
        startDate,
        endDate,
        basePrice: blueprint.basePrice + index * 500,
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
        basePrice: blueprint.basePrice + index * 500,
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
        status: 'OPEN',
      },
    });

    const group = await prisma.group.upsert({
      where: { packageId: pkg.id },
      update: {},
      create: { packageId: pkg.id },
    });

    const activeMembers = memberIds.slice(0, 2 + (index % 2));
    for (const userId of activeMembers) {
      await prisma.groupMember.upsert({
        where: { groupId_userId: { groupId: group.id, userId } },
        update: { status: 'APPROVED', leftAt: null, committedAt: null },
        create: { groupId: group.id, userId, status: 'APPROVED' },
      });
    }

    const users = await prisma.user.findMany({
      where: { id: { in: activeMembers } },
      select: { gender: true },
    });

    const counts = getGenderCounts(users as Array<{ gender: SeedUser['gender'] }>);
    await prisma.group.update({
      where: { id: group.id },
      data: {
        currentSize: activeMembers.length,
        ...counts,
      },
    });
  }
}

async function seedTeamPlans(
  creators: Record<string, Awaited<ReturnType<typeof upsertUser>>>,
  memberIds: string[],
) {
  for (let index = 0; index < 16; index += 1) {
    const blueprint = planBlueprints[index % planBlueprints.length];
    const creator = creators[blueprint.creatorKey];
    const startDate = daysFromNow(12 + index * 3);
    const endDate = daysFromNow(15 + index * 3);
    const slug = `${slugifySeed(blueprint.title)}-${index + 1}`;

    const plan = await prisma.plan.upsert({
      where: { slug },
      update: {
        creatorId: creator.id,
        title: blueprint.title,
        destination: blueprint.destination,
        destinationState: blueprint.destinationState,
        startDate,
        endDate,
        budgetMin: blueprint.budgetMin + index * 250,
        budgetMax: blueprint.budgetMax + index * 250,
        groupSizeMin: 4,
        groupSizeMax: 10,
        groupType: blueprint.groupType,
        genderPref: blueprint.genderPref,
        accommodation: index % 2 === 0 ? 'hostel' : 'cottage',
        vibes: blueprint.vibes,
        activities: blueprint.activities,
        description: `Seeded beta plan for ${blueprint.destination}.`,
        autoApprove: index % 3 !== 0,
        status: 'OPEN',
        expiresAt: daysFromNow(45 + index),
      },
      create: {
        creatorId: creator.id,
        slug,
        title: blueprint.title,
        destination: blueprint.destination,
        destinationState: blueprint.destinationState,
        startDate,
        endDate,
        budgetMin: blueprint.budgetMin + index * 250,
        budgetMax: blueprint.budgetMax + index * 250,
        groupSizeMin: 4,
        groupSizeMax: 10,
        groupType: blueprint.groupType,
        genderPref: blueprint.genderPref,
        accommodation: index % 2 === 0 ? 'hostel' : 'cottage',
        vibes: blueprint.vibes,
        activities: blueprint.activities,
        description: `Seeded beta plan for ${blueprint.destination}.`,
        autoApprove: index % 3 !== 0,
        status: 'OPEN',
        expiresAt: daysFromNow(45 + index),
      },
    });

    const group = await prisma.group.upsert({
      where: { planId: plan.id },
      update: {},
      create: { planId: plan.id, isLocked: false },
    });

    await prisma.groupMember.upsert({
      where: { groupId_userId: { groupId: group.id, userId: creator.id } },
      update: { role: 'CREATOR', status: 'APPROVED', leftAt: null, committedAt: null },
      create: {
        groupId: group.id,
        userId: creator.id,
        role: 'CREATOR',
        status: 'APPROVED',
      },
    });

    const extraMembers = memberIds
      .filter((memberId) => memberId !== creator.id)
      .slice(0, blueprint.genderPref === 'female_only' ? 2 : 1 + (index % 3));

    for (const userId of extraMembers) {
      await prisma.groupMember.upsert({
        where: { groupId_userId: { groupId: group.id, userId } },
        update: { status: 'APPROVED', leftAt: null, committedAt: null },
        create: {
          groupId: group.id,
          userId,
          status: 'APPROVED',
        },
      });
    }

    const users = await prisma.user.findMany({
      where: { id: { in: [creator.id, ...extraMembers] } },
      select: { gender: true },
    });

    const counts = getGenderCounts(users as Array<{ gender: SeedUser['gender'] }>);
    await prisma.group.update({
      where: { id: group.id },
      data: {
        currentSize: 1 + extraMembers.length,
        ...counts,
      },
    });
  }
}

async function main() {
  const userMap = new Map<string, Awaited<ReturnType<typeof upsertUser>>>();
  for (const seed of seedUsers) {
    const user = await upsertUser(seed);
    userMap.set(seed.key, user);
  }

  for (const agencySeed of seedAgencies) {
    const owner = userMap.get(agencySeed.ownerKey);
    if (!owner) continue;

    const agency = await prisma.agency.upsert({
      where: { ownerId: owner.id },
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
        phone: owner.phone,
        email: `${agencySeed.slug}@tripsync.test`,
        specializations: agencySeed.specializations,
        destinations: agencySeed.destinations,
        avgRating: 4.6,
        totalReviews: 12,
        totalTrips: 18,
      },
      create: {
        ownerId: owner.id,
        name: agencySeed.name,
        slug: agencySeed.slug,
        description: agencySeed.description,
        city: agencySeed.city,
        state: agencySeed.state,
        verification: agencySeed.verification,
        gstin: agencySeed.gstin,
        pan: agencySeed.pan,
        tourismLicense: agencySeed.tourismLicense,
        phone: owner.phone,
        email: `${agencySeed.slug}@tripsync.test`,
        specializations: agencySeed.specializations,
        destinations: agencySeed.destinations,
        avgRating: 4.6,
        totalReviews: 12,
        totalTrips: 18,
      },
    });

    await seedAgencyPackages(agency.id, agency.slug, [
      userMap.get('isha')!.id,
      userMap.get('rahul')!.id,
      userMap.get('meher')!.id,
    ]);
  }

  await seedTeamPlans(
    {
      mira: userMap.get('mira')!,
      riya: userMap.get('riya')!,
      kabir: userMap.get('kabir')!,
      ananya: userMap.get('ananya')!,
    },
    [userMap.get('isha')!.id, userMap.get('meher')!.id, userMap.get('komal')!.id, userMap.get('yuvraj')!.id],
  );

  console.log(
    `TripSync seed complete: ${seedAgencies.length * packageBlueprints.length} packages and 16 plans ready for beta QA.`,
  );
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
