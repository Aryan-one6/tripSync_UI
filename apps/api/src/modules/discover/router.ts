import { Router } from 'express';
import { validateQuery } from '../../middleware/validate.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import type { DiscoverQuery, SearchQuery } from '@tripsync/shared';
import { DiscoverQuerySchema, SearchQuerySchema } from '@tripsync/shared';
import * as discoverService from './service.js';

export const discoverRouter = Router();

// GET /discover — Unified feed with filters
discoverRouter.get(
  '/',
  validateQuery(DiscoverQuerySchema),
  asyncHandler(async (req, res) => {
    const result = await discoverService.getDiscoverFeed(req.validatedQuery as DiscoverQuery);
    res.json({ data: result.items, meta: { cursor: result.cursor } });
  }),
);

// GET /discover/trending — Trending by join velocity
discoverRouter.get(
  '/trending',
  asyncHandler(async (_req, res) => {
    const result = await discoverService.getTrending();
    res.json({ data: result.items });
  }),
);

// GET /discover/search?q= — Full-text search
discoverRouter.get(
  '/search',
  validateQuery(SearchQuerySchema),
  asyncHandler(async (req, res) => {
    const result = await discoverService.search(req.validatedQuery as SearchQuery);
    res.json({ data: result.items, meta: { cursor: result.cursor } });
  }),
);
