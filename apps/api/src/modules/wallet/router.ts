import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import * as walletService from './service.js';

export const walletRouter = Router();

// ─── User Wallet Endpoints ────────────────────────────────────────────────────

// GET /wallet/balance — Get current wallet balance
walletRouter.get(
  '/balance',
  authenticate,
  asyncHandler(async (req, res) => {
    const balance = await walletService.getWalletBalance(req.userId!);
    res.json({ data: { balance } });
  }),
);

// GET /wallet/transactions — Get wallet transaction history
walletRouter.get(
  '/transactions',
  authenticate,
  asyncHandler(async (req, res) => {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 50;
    const filterType = (req.query.type as string) || undefined;

    const result = await walletService.getWalletTransactionHistory(
      req.userId!,
      page,
      pageSize,
      filterType as any,
    );
    res.json({ data: result });
  }),
);

// GET /wallet/monthly-summary — Get monthly wallet activity summary
walletRouter.get(
  '/monthly-summary',
  authenticate,
  asyncHandler(async (req, res) => {
    const monthsBack = req.query.monthsBack ? parseInt(req.query.monthsBack as string, 10) : 12;
    const summary = await walletService.getWalletMonthlySummary(req.userId!, monthsBack);
    res.json({ data: summary });
  }),
);

// ─── Admin Endpoints ───────────────────────────────────────────────────────────

// GET /wallet/admin/cashflow-audit — Get cashflow audit report
walletRouter.get(
  '/admin/cashflow-audit',
  authenticate,
  asyncHandler(async (req, res) => {
    // TODO: Add adminOnly middleware
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date('2026-01-01');
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

    const report = await walletService.getCashflowAudit(startDate, endDate);
    res.json({ data: report });
  }),
);

// GET /wallet/admin/reconciliation — Get reconciliation report
walletRouter.get(
  '/admin/reconciliation',
  authenticate,
  asyncHandler(async (req, res) => {
    // TODO: Add adminOnly middleware
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date('2026-01-01');
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

    const report = await walletService.getReconciliationReport(startDate, endDate);
    res.json({ data: report });
  }),
);
