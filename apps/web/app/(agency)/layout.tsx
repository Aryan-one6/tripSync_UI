import type { ReactNode } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { AuthGate } from "@/components/layout/auth-gate";

export default function AgencyGroupLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <AuthGate requireRole="agency_admin">{children}</AuthGate>
    </>
  );
}
