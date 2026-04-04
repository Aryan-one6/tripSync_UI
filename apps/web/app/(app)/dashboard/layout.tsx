import type { ReactNode } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { AuthGate } from "@/components/layout/auth-gate";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

export default function DashboardGroupLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <AuthGate requireRole="user">{children}</AuthGate>
      <MobileBottomNav />
    </>
  );
}
