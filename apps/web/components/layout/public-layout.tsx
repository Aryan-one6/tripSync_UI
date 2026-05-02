import type { ReactNode } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh max-w-6xl mx-auto flex-col">
      <SiteHeader />
      <main className="flex-1 safe-bottom">{children}</main>
      <SiteFooter />
    </div>
  );
}
