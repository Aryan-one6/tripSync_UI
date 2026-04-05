"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth/auth-context";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { RouteLoaderOverlay } from "@/components/layout/route-loader-overlay";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <RouteLoaderOverlay />
      <MobileBottomNav />
    </AuthProvider>
  );
}
