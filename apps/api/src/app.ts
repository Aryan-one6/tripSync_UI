import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './lib/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { authRouter } from './modules/auth/router.js';
import { plansRouter } from './modules/plans/router.js';
import { packagesRouter } from './modules/packages/router.js';
import { discoverRouter } from './modules/discover/router.js';
import { groupsRouter } from './modules/groups/router.js';
import { offersRouter } from './modules/offers/router.js';
import { paymentsRouter } from './modules/payments/router.js';
import { razorpayWebhookHandler } from './modules/payments/router.js';
import { chatRouter } from './modules/chat/router.js';
import { agenciesRouter } from './modules/agencies/router.js';
import { reviewsRouter } from './modules/reviews/router.js';
import { referralsRouter } from './modules/referrals/router.js';
import { usersRouter } from './modules/users/router.js';
import { socialRouter } from './modules/social/router.js';
import { generalLimiter, authLimiter } from './middleware/rate-limit.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.post(
  '/api/v1/payments/webhook/razorpay',
  express.raw({ type: 'application/json' }),
  (req, res, next) => {
    void razorpayWebhookHandler(req, res).catch(next);
  },
);
app.use(express.json({ limit: '25mb' }));
app.use(generalLimiter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/v1/auth', authLimiter, authRouter);
app.use('/api/v1/plans', plansRouter);
app.use('/api/v1/packages', packagesRouter);
app.use('/api/v1/discover', discoverRouter);
app.use('/api/v1/groups', groupsRouter);
app.use('/api/v1/offers', offersRouter);
app.use('/api/v1/payments', paymentsRouter);
app.use('/api/v1/chat', chatRouter);
app.use('/api/v1/agencies', agenciesRouter);
app.use('/api/v1/reviews', reviewsRouter);
app.use('/api/v1/referrals', referralsRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/social', socialRouter);

app.use(errorHandler);

export default app;
