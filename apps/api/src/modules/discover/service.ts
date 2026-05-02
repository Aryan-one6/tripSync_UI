import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import type { DiscoverQuery, FollowingDiscoverQuery, SearchQuery } from '@tripsync/shared';

interface DiscoverItem {
  id: string;
  slug: string;
  originType: 'plan' | 'package';
  title: string;
  destination: string;
  destinationState: string | null;
  startDate: Date | null;
  endDate: Date | null;
  priceLow: number | null;
  priceHigh: number | null;
  vibes: Prisma.JsonValue | null;
  groupType: string | null;
  groupSizeMin: number;
  groupSizeMax: number;
  coverImageUrl: string | null;
  status: string;
  createdAt: Date;
  ownerId: string | null;
  agencyId: string | null;
  joinedCount: number;
  /** Null for packages, 'STANDARD' or 'CORPORATE' for plans */
  planType: string | null;
}

interface CursorRow {
  id: string;
  slug: string;
  createdAt: Date;
  sortValue: number | null;
  originRank: number | null;
}

const DISCOVER_VIEW = Prisma.sql`
  SELECT
    id,
    slug,
    "originType",
    title,
    destination,
    "destinationState",
    "startDate",
    "endDate",
    "priceLow",
    "priceHigh",
    vibes,
    "groupType",
    "groupSizeMin",
    "groupSizeMax",
    "coverImageUrl",
    status,
    "createdAt",
    "ownerId",
    "agencyId",
    "joinedCount",
    "planType"
  FROM discover_feed
`;

function parseVibes(vibes?: string): string[] {
  return (vibes ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function getAudience(query: DiscoverQuery): 'traveler' | 'agency' {
  return query.audience ?? 'traveler';
}

function shouldPrioritizePackages(query: DiscoverQuery): boolean {
  return getAudience(query) === 'traveler' && !query.originType && query.sort === 'recent';
}

function resolveDiscoverQueryDefaults(query: DiscoverQuery): DiscoverQuery {
  if (getAudience(query) === 'agency' && !query.originType) {
    return {
      ...query,
      originType: 'plan',
    };
  }

  return query;
}

function getDiscoverOriginRankExpression(query: DiscoverQuery): Prisma.Sql {
  if (!shouldPrioritizePackages(query)) {
    return Prisma.sql`NULL`;
  }

  return Prisma.sql`
    CASE
      WHEN "originType" = 'package' THEN 0
      WHEN "originType" = 'plan' THEN 1
      ELSE 2
    END
  `;
}

function getDiscoverSortExpression(sort: DiscoverQuery['sort']): Prisma.Sql {
  switch (sort) {
    case 'price_low':
      return Prisma.sql`COALESCE("priceLow", 2147483647)`;
    case 'price_high':
      return Prisma.sql`COALESCE("priceLow", -1)`;
    case 'popular':
      return Prisma.sql`"joinedCount"`;
    default:
      return Prisma.sql`NULL`;
  }
}

function getDiscoverOrderBy(
  sort: DiscoverQuery['sort'],
  query?: DiscoverQuery,
): Prisma.Sql {
  if (query && shouldPrioritizePackages(query)) {
    return Prisma.sql`
      ${getDiscoverOriginRankExpression(query)} ASC,
      "createdAt" DESC,
      id DESC
    `;
  }

  switch (sort) {
    case 'price_low':
      return Prisma.sql`COALESCE("priceLow", 2147483647) ASC, id ASC`;
    case 'price_high':
      return Prisma.sql`COALESCE("priceLow", -1) DESC, id DESC`;
    case 'popular':
      return Prisma.sql`"joinedCount" DESC, "createdAt" DESC, id DESC`;
    default:
      return Prisma.sql`"createdAt" DESC, id DESC`;
  }
}

function getDiscoverFilters(query: DiscoverQuery): Prisma.Sql[] {
  const filters: Prisma.Sql[] = [];

  // Corporate plans are only visible to agency-audience requests.
  // Travelers can never see CORPORATE plans in the discover feed.
  if (getAudience(query) === 'agency' && query.planType === 'CORPORATE') {
    // Agency explicitly browsing corporate plans
    filters.push(Prisma.sql`"planType" = 'CORPORATE'`);
  } else {
    // Default: hide corporate plans (traveler audience, or agency without explicit CORPORATE filter)
    filters.push(Prisma.sql`("planType" IS NULL OR "planType" = 'STANDARD')`);
  }

  if (query.destination) {
    const destinationTerm = `%${query.destination.trim()}%`;
    filters.push(
      Prisma.sql`(
        destination ILIKE ${destinationTerm}
        OR COALESCE("destinationState", '') ILIKE ${destinationTerm}
      )`,
    );
  }

  if (query.budgetMin !== undefined) {
    filters.push(Prisma.sql`COALESCE("priceLow", 0) >= ${query.budgetMin}`);
  }

  if (query.budgetMax !== undefined) {
    filters.push(Prisma.sql`COALESCE("priceHigh", 2147483647) <= ${query.budgetMax}`);
  }

  if (query.originType) {
    filters.push(Prisma.sql`"originType" = ${query.originType}`);
  }

  if (query.startDate) {
    filters.push(Prisma.sql`"startDate" >= ${new Date(query.startDate)}`);
  }

  if (query.endDate) {
    filters.push(Prisma.sql`"endDate" <= ${new Date(query.endDate)}`);
  }

  if (query.groupType) {
    filters.push(Prisma.sql`"groupType" = ${query.groupType}`);
  }

  const vibes = parseVibes(query.vibes);
  if (vibes.length > 0) {
    filters.push(
      Prisma.sql`
        EXISTS (
          SELECT 1
          FROM jsonb_array_elements_text(COALESCE(vibes, '[]'::jsonb)) AS vibe(value)
          WHERE vibe.value IN (${Prisma.join(vibes)})
        )
      `,
    );
  }

  return filters;
}

function buildWhereClause(filters: Prisma.Sql[]): Prisma.Sql {
  if (filters.length === 0) {
    return Prisma.empty;
  }

  return Prisma.sql`WHERE ${Prisma.join(filters, ' AND ')}`;
}

function getDiscoverCursorFilter(
  sort: DiscoverQuery['sort'],
  cursor: CursorRow,
  query?: DiscoverQuery,
): Prisma.Sql {
  if (query && shouldPrioritizePackages(query)) {
    return Prisma.sql`
      (
        ${getDiscoverOriginRankExpression(query)} > ${cursor.originRank}
        OR (
          ${getDiscoverOriginRankExpression(query)} = ${cursor.originRank}
          AND (
            "createdAt" < ${cursor.createdAt}
            OR ("createdAt" = ${cursor.createdAt} AND id < ${cursor.id})
          )
        )
      )
    `;
  }

  switch (sort) {
    case 'price_low':
      return Prisma.sql`
        (
          COALESCE("priceLow", 2147483647) > ${cursor.sortValue}
          OR (
            COALESCE("priceLow", 2147483647) = ${cursor.sortValue}
            AND id > ${cursor.id}
          )
        )
      `;
    case 'price_high':
      return Prisma.sql`
        (
          COALESCE("priceLow", -1) < ${cursor.sortValue}
          OR (
            COALESCE("priceLow", -1) = ${cursor.sortValue}
            AND id < ${cursor.id}
          )
        )
      `;
    case 'popular':
      return Prisma.sql`
        (
          "joinedCount" < ${cursor.sortValue}
          OR (
            "joinedCount" = ${cursor.sortValue}
            AND (
              "createdAt" < ${cursor.createdAt}
              OR ("createdAt" = ${cursor.createdAt} AND id < ${cursor.id})
            )
          )
        )
      `;
    default:
      return Prisma.sql`
        (
          "createdAt" < ${cursor.createdAt}
          OR ("createdAt" = ${cursor.createdAt} AND id < ${cursor.id})
        )
      `;
  }
}

async function getDiscoverCursorRow(
  cursorId: string,
  sort: DiscoverQuery['sort'],
  query?: DiscoverQuery,
): Promise<CursorRow | null> {
  const rows = await prisma.$queryRaw<CursorRow[]>(Prisma.sql`
    SELECT
      id,
      slug,
      "createdAt",
      ${getDiscoverSortExpression(sort)} AS "sortValue",
      ${query ? getDiscoverOriginRankExpression(query) : Prisma.sql`NULL`} AS "originRank"
    FROM discover_feed
    WHERE id = ${cursorId}
    LIMIT 1
  `);

  return rows[0] ?? null;
}

function getSearchRankExpression(term: string): Prisma.Sql {
  const likeTerm = `%${term}%`;
  return Prisma.sql`
    (
      ts_rank_cd(
        to_tsvector(
          'simple',
          concat_ws(' ', title, destination, COALESCE("destinationState", ''))
        ),
        websearch_to_tsquery('simple', ${term})
      )
      + CASE WHEN title ILIKE ${likeTerm} THEN 0.8 ELSE 0 END
      + CASE WHEN destination ILIKE ${likeTerm} THEN 0.5 ELSE 0 END
      + CASE WHEN COALESCE("destinationState", '') ILIKE ${likeTerm} THEN 0.3 ELSE 0 END
    )
  `;
}

function getSearchFilter(term: string): Prisma.Sql {
  const likeTerm = `%${term}%`;
  return Prisma.sql`
    (
      to_tsvector(
        'simple',
        concat_ws(' ', title, destination, COALESCE("destinationState", ''))
      ) @@ websearch_to_tsquery('simple', ${term})
      OR title ILIKE ${likeTerm}
      OR destination ILIKE ${likeTerm}
      OR COALESCE("destinationState", '') ILIKE ${likeTerm}
    )
  `;
}

async function getSearchCursorRow(cursorId: string, term: string): Promise<CursorRow | null> {
  const rankExpr = getSearchRankExpression(term);
  const rows = await prisma.$queryRaw<CursorRow[]>(Prisma.sql`
    SELECT
      id,
      slug,
      "createdAt",
      ${rankExpr} AS "sortValue"
    FROM discover_feed
    WHERE id = ${cursorId}
      AND ${getSearchFilter(term)}
    LIMIT 1
  `);

  return rows[0] ?? null;
}

export async function getDiscoverFeed(query: DiscoverQuery) {
  const resolvedQuery = resolveDiscoverQueryDefaults(query);
  const filters = getDiscoverFilters(resolvedQuery);

  if (resolvedQuery.cursor) {
    const cursorRow = await getDiscoverCursorRow(
      resolvedQuery.cursor,
      resolvedQuery.sort,
      resolvedQuery,
    );
    if (cursorRow) {
      filters.push(getDiscoverCursorFilter(resolvedQuery.sort, cursorRow, resolvedQuery));
    }
  }

  const items = await prisma.$queryRaw<DiscoverItem[]>(Prisma.sql`
    ${DISCOVER_VIEW}
    ${buildWhereClause(filters)}
    ORDER BY ${getDiscoverOrderBy(resolvedQuery.sort, resolvedQuery)}
    LIMIT ${resolvedQuery.limit}
  `);

  return {
    items,
    cursor: items.length === resolvedQuery.limit ? items[items.length - 1]?.id ?? null : null,
  };
}

export async function search(query: SearchQuery) {
  const term = query.q.trim();
  const rankExpr = getSearchRankExpression(term);
  const cursorFilter =
    query.cursor
      ? await getSearchCursorRow(query.cursor, term)
      : null;

  const searchFilters: Prisma.Sql[] = [
    getSearchFilter(term),
  ];

  if (cursorFilter) {
    searchFilters.push(
      Prisma.sql`
        (
          ${rankExpr} < ${cursorFilter.sortValue}
          OR (
            ${rankExpr} = ${cursorFilter.sortValue}
            AND (
              "createdAt" < ${cursorFilter.createdAt}
              OR ("createdAt" = ${cursorFilter.createdAt} AND id < ${cursorFilter.id})
            )
          )
        )
      `,
    );
  }

  const items = await prisma.$queryRaw<DiscoverItem[]>(Prisma.sql`
    SELECT
      id,
      slug,
      "originType",
      title,
      destination,
      "destinationState",
      "startDate",
      "endDate",
      "priceLow",
      "priceHigh",
      vibes,
      "groupType",
      "groupSizeMin",
      "groupSizeMax",
      "coverImageUrl",
      status,
      "createdAt",
      "ownerId",
      "agencyId",
      "joinedCount",
      "planType"
    FROM discover_feed
    ${buildWhereClause(searchFilters)}
    ORDER BY ${rankExpr} DESC, "createdAt" DESC, id DESC
    LIMIT ${query.limit}
  `);

  return {
    items,
    cursor: items.length === query.limit ? items[items.length - 1]?.id ?? null : null,
  };
}

export async function getFollowingFeed(userId: string, query: FollowingDiscoverQuery) {
  const follows = await prisma.follow.findMany({
    where: { followerUserId: userId },
    select: {
      targetUserId: true,
      targetAgencyId: true,
    },
  });

  const followedUserIds = follows
    .map((follow) => follow.targetUserId)
    .filter((value): value is string => Boolean(value));
  const followedAgencyIds = follows
    .map((follow) => follow.targetAgencyId)
    .filter((value): value is string => Boolean(value));

  if (followedUserIds.length === 0 && followedAgencyIds.length === 0) {
    return { items: [], cursor: null };
  }

  const filters = getDiscoverFilters(query);
  filters.push(
    Prisma.sql`(
      "ownerId" IN (${Prisma.join(followedUserIds.length > 0 ? followedUserIds : [Prisma.sql`NULL`] )})
      OR "agencyId" IN (${Prisma.join(followedAgencyIds.length > 0 ? followedAgencyIds : [Prisma.sql`NULL`] )})
    )`,
  );

  if (query.q?.trim()) {
    filters.push(getSearchFilter(query.q.trim()));
  }

  if (query.cursor) {
    const cursorRow = await getDiscoverCursorRow(query.cursor, query.sort);
    if (cursorRow) {
      filters.push(getDiscoverCursorFilter(query.sort, cursorRow));
    }
  }

  const items = await prisma.$queryRaw<DiscoverItem[]>(Prisma.sql`
    ${DISCOVER_VIEW}
    ${buildWhereClause(filters)}
    ORDER BY ${getDiscoverOrderBy(query.sort)}
    LIMIT ${query.limit}
  `);

  return {
    items,
    cursor: items.length === query.limit ? items[items.length - 1]?.id ?? null : null,
  };
}

export async function getTrending(limit = 20) {
  const items = await prisma.$queryRaw<DiscoverItem[]>(Prisma.sql`
    ${DISCOVER_VIEW}
    ORDER BY "joinedCount" DESC, "createdAt" DESC, id DESC
    LIMIT ${limit}
  `);

  return { items };
}
