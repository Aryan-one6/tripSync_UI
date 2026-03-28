"use client";

import { useEffect, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LockKeyhole, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const { session, status, switchRole } = useAuth();
  const [isPending, startTransition] = useTransition();
  const expectedRole = requireRole ?? (requireAgency ? "agency_admin" : undefined);

  useEffect(() => {
    if (status === "guest") {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [pathname, router, status]);

  if (status === "loading" || status === "guest") {
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

  if (expectedRole && session?.role !== expectedRole) {
    const canSwitch =
      expectedRole === "user"
        ? session?.availableRoles.includes("user")
        : session?.availableRoles.includes("agency_admin");
    const targetPath = expectedRole === "user" ? "/dashboard/plans" : "/agency/dashboard";

    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
        <Card className="relative mx-auto max-w-2xl overflow-hidden p-8 text-center sm:p-10">
          <div className="clay-blob -top-10 -right-10 size-28 bg-[var(--color-lavender-200)] opacity-12" />
          <div className="relative">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-[var(--radius-lg)] bg-gradient-to-b from-[var(--color-lavender-50)] to-[var(--color-lavender-100)] text-[var(--color-lavender-700)] shadow-[var(--shadow-clay)]">
              <ArrowLeftRight className="size-6" />
            </div>
            <h1 className="font-display text-2xl text-[var(--color-ink-950)] sm:text-3xl">
              {expectedRole === "agency_admin" ? "Agency access required" : "Traveler context required"}
            </h1>
            <p className="mt-3 text-sm text-[var(--color-ink-600)] leading-relaxed">
              {expectedRole === "agency_admin"
                ? "Switch to your agency role to access this dashboard."
                : "Switch to your traveler role to access this workspace."}
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              {canSwitch && (
                <Button
                  onClick={() =>
                    startTransition(async () => {
                      await switchRole(expectedRole);
                      router.replace(targetPath);
                    })
                  }
                  disabled={isPending}
                >
                  {isPending
                    ? "Switching..."
                    : expectedRole === "agency_admin"
                      ? "Switch to Agency"
                      : "Switch to User"}
                </Button>
              )}
              <Link href="/">
                <Button variant="secondary">Back home</Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
