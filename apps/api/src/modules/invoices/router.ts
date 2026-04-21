import { Router } from 'express';
import { authenticate, agencyOnly } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import * as invoiceService from './service.js';
import { param } from '../../lib/helpers.js';

export const invoicesRouter = Router();

// ── GET /invoices/me — list all user invoices ──────────────────────────────
invoicesRouter.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const list = await invoiceService.listUserInvoices(req.userId!);
    res.json({ data: list });
  }),
);

// ── GET /invoices/agency/me — list agency settlement invoices ──────────────
// Must be registered BEFORE /:paymentId to avoid route collision
invoicesRouter.get(
  '/agency/me',
  authenticate,
  agencyOnly,
  asyncHandler(async (req, res) => {
    const list = await invoiceService.listAgencyInvoices(req.agencyId!);
    res.json({ data: list });
  }),
);

// ── GET /invoices/agency/settlement/:paymentId — agency settlement detail ──
invoicesRouter.get(
  '/agency/settlement/:paymentId',
  authenticate,
  agencyOnly,
  asyncHandler(async (req, res) => {
    const payload = await invoiceService.buildAgencySettlementPayload(
      param(req.params.paymentId),
      req.userId!,
    );
    res.json({ data: payload });
  }),
);

// ── GET /invoices/:paymentId — user invoice detail ─────────────────────────
invoicesRouter.get(
  '/:paymentId',
  authenticate,
  asyncHandler(async (req, res) => {
    await invoiceService.ensureInvoiceRecord(param(req.params.paymentId));
    const payload = await invoiceService.buildUserInvoicePayload(
      param(req.params.paymentId),
      req.userId!,
    );
    res.json({ data: payload });
  }),
);
