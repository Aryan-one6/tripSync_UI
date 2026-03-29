"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/auth-context";

export function AuthGate({
  children,
  requireAgency = false,
  requireRole,
}: {
  children: React.ReactNode;
  requireAgency?: boolean;
  requireRole?: "user" | "agency_admin";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, status } = useAuth();
  const expectedRole = requireRole ?? (requireAgency ? "agency_admin" : undefined);

  useEffect(() => {
    if (status === "guest") {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    if (status === "authenticated" && expectedRole && session?.role !== expectedRole) {
      router.replace(expectedRole === "agency_admin" ? "/dashboard/feed" : "/agency/dashboard");
    }
  }, [expectedRole, pathname, router, session?.role, status]);

  if (
    status === "loading" ||
    status === "guest" ||
    (status === "authenticated" && expectedRole && session?.role !== expectedRole)
  ) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <Card className="max-w-lg p-10 text-center">
          <div className="animate-pulse-soft">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-gradient-to-b from-[var(--color-sea-50)] to-[var(--color-sea-100)] shadow-[var(--shadow-clay-sm)]">
              <LockKeyhole className="size-5 text-[var(--color-sea-700)]" />
            </div>
            <p className="text-sm text-[var(--color-ink-600)]">Loading your TravellersIn workspace...</p>
          </div>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
