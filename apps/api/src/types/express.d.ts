declare global {
  namespace Express {
    interface Request {
      userId?: string;
      role?: 'user' | 'agency_admin' | 'platform_admin';
      agencyId?: string;
      validatedQuery?: unknown;
    }
  }
}

export {};
