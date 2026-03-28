export function inferRequestedRole(nextPath: string) {
  if (
    nextPath.startsWith("/agency") ||
    nextPath === "/bids" ||
    nextPath === "/referrals" ||
    nextPath === "/packages/new" ||
    /^\/packages\/[^/]+\/edit$/.test(nextPath)
  ) {
    return "agency_admin" as const;
  }

  return "user" as const;
}
