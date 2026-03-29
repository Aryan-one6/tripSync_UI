"use client";

import { useEffect } from "react";
import { ExternalLink, LoaderCircle, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";

export function PublicProfileLaunchpad({
  variant,
}: {
  variant: "user" | "agency";
}) {
  const router = useRouter();
  const { session, status } = useAuth();
  const handle = variant === "agency" ? session?.user.agency?.slug ?? null : session?.user.username ?? null;
  const profileHref = handle ? `/profile/${handle}` : null;
  const settingsHref = variant === "agency" ? "/agency/settings" : "/dashboard/profile";
  const title = variant === "agency" ? "Storefront" : "Public profile";
  const subtitle =
    variant === "agency"
      ? "Open the same agency profile and package storefront travelers can see."
      : "Open the public traveler profile other members use when deciding whether to travel with you.";

  useEffect(() => {
    if (status === "authenticated" && profileHref) {
      router.replace(profileHref);
    }
  }, [profileHref, router, status]);

  return (
    <DashboardShell variant={variant} title={title} subtitle={subtitle}>
      <Card className="space-y-4 p-5 sm:p-6">
        {profileHref ? (
          <>
            <div className="flex items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-sea-50)] text-[var(--color-sea-700)] shadow-[var(--shadow-clay-sm)]">
                <LoaderCircle className="size-5 animate-spin" />
              </div>
              <div className="space-y-1">
                <h2 className="font-display text-lg text-[var(--color-ink-950)]">Opening your public profile</h2>
                <p className="text-sm text-[var(--color-ink-600)]">
                  Redirecting to <span className="font-semibold text-[var(--color-ink-900)]">@{handle}</span>.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={() => router.push(profileHref)}>
                <ExternalLink className="size-4" />
                Open profile
              </Button>
              <Button type="button" variant="secondary" onClick={() => router.push(settingsHref)}>
                Go back
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-sunset-50)] text-[var(--color-sunset-700)] shadow-[var(--shadow-clay-sm)]">
                <TriangleAlert className="size-5" />
              </div>
              <div className="space-y-1">
                <h2 className="font-display text-lg text-[var(--color-ink-950)]">Profile handle missing</h2>
                <p className="text-sm text-[var(--color-ink-600)]">
                  Finish your {variant === "agency" ? "agency" : "traveler"} profile details before opening the
                  public page.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={() => router.push(settingsHref)}>
                {variant === "agency" ? "Open agency settings" : "Open profile settings"}
              </Button>
            </div>
          </>
        )}
      </Card>
    </DashboardShell>
  );
}
