"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Save, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { UpdateProfileSchema } from "@tripsync/shared";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { CoverImageUpload } from "@/components/ui/image-upload";
import { useAuth } from "@/lib/auth/auth-context";
import type { RecentProfileViewerItem, UserProfile } from "@/lib/api/types";
import { initials } from "@/lib/format";

export default function ProfilePage() {
  const router = useRouter();
  const { session, apiFetchWithAuth, updateUser } = useAuth();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [recentViewers, setRecentViewers] = useState<RecentProfileViewerItem[]>([]);
  const [isLoadingViewers, setIsLoadingViewers] = useState(true);
  const [form, setForm] = useState({
    fullName: session?.user.fullName ?? "",
    city: session?.user.city ?? "",
    gender: session?.user.gender ?? "",
    dateOfBirth: session?.user.dateOfBirth?.slice(0, 10) ?? "",
    travelPreferences: session?.user.travelPreferences ?? "",
    bio: session?.user.bio ?? "",
    avatarUrl: session?.user.avatarUrl ?? "",
  });

  useEffect(() => {
    if (!session?.user?.id) {
      setRecentViewers([]);
      setIsLoadingViewers(false);
      return;
    }

    let cancelled = false;
    setIsLoadingViewers(true);

    void apiFetchWithAuth<RecentProfileViewerItem[]>(
      "/notifications/profile-views?limit=12",
    )
      .then((items) => {
        if (cancelled) return;
        setRecentViewers(items);
      })
      .catch(() => {
        if (cancelled) return;
        setRecentViewers([]);
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoadingViewers(false);
      });

    return () => {
      cancelled = true;
    };
  }, [apiFetchWithAuth, session?.user?.id]);

  return (
    <DashboardShell
      variant="user"
      title="Profile"
      subtitle="Edit the public traveler details people will use to judge whether they want to travel with you."
    >
      <div className="space-y-5">
        <Card className="p-5 sm:p-6">
          <h2 className="font-display text-lg text-[var(--color-ink-950)]">Traveler profile</h2>
          <div className="mt-5 space-y-4">
            <CoverImageUpload
              label="Profile photo"
              value={form.avatarUrl}
              onChange={(avatarUrl) => setForm((current) => ({ ...current, avatarUrl }))}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">Full name</label>
                <Input
                  value={form.fullName}
                  onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">City</label>
                <Input
                  value={form.city}
                  onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">Gender</label>
                <Select
                  value={form.gender}
                  onChange={(event) => setForm((current) => ({ ...current, gender: event.target.value }))}
                  options={[
                    { value: "", label: "Select gender" },
                    { value: "male", label: "Male" },
                    { value: "female", label: "Female" },
                    { value: "other", label: "Other" },
                  ]}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">Date of birth</label>
                <Input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, dateOfBirth: event.target.value }))
                  }
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">Travel preferences</label>
              <Textarea
                value={form.travelPreferences}
                onChange={(event) =>
                  setForm((current) => ({ ...current, travelPreferences: event.target.value }))
                }
                placeholder="Share the trip style, budget range, pace, stay preferences, and group energy you prefer."
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">Bio</label>
              <Textarea
                value={form.bio}
                onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
                placeholder="Tell co-travelers what kind of trips you like."
              />
            </div>

            {feedback && (
              <div className="rounded-[var(--radius-md)] bg-[var(--color-sunset-50)] p-3 text-sm text-[var(--color-sunset-700)] shadow-[var(--shadow-clay-inset)]">
                {feedback}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push("/dashboard/storefront")}
                disabled={!session?.user.username}
              >
                <ExternalLink className="size-4" />
                View public profile
              </Button>
              <Button
                onClick={() =>
                  startTransition(async () => {
                    try {
                      const payload = UpdateProfileSchema.parse({
                        fullName: form.fullName || undefined,
                        city: form.city || undefined,
                        gender: form.gender ? (form.gender as "male" | "female" | "other") : undefined,
                        dateOfBirth: form.dateOfBirth
                          ? new Date(`${form.dateOfBirth}T00:00:00.000Z`).toISOString()
                          : undefined,
                        travelPreferences: form.travelPreferences || undefined,
                        bio: form.bio || undefined,
                        avatarUrl: form.avatarUrl || undefined,
                      });
                      const updated = await apiFetchWithAuth<UserProfile>("/auth/me", {
                        method: "PATCH",
                        body: JSON.stringify(payload),
                      });
                      updateUser(updated);
                      setFeedback("Profile updated.");
                    } catch (error) {
                      setFeedback(error instanceof Error ? error.message : "Unable to update your profile.");
                    }
                  })
                }
                disabled={isPending}
              >
                <Save className="size-4" />
                {isPending ? "Saving..." : "Save profile"}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg text-[var(--color-ink-950)]">Recent profile viewers</h2>
              <p className="mt-1 text-sm text-[var(--color-ink-500)]">
                Authenticated users who recently viewed your traveler or agency profile.
              </p>
            </div>
            <span className="rounded-full bg-[var(--color-sea-50)] px-3 py-1 text-xs font-semibold text-[var(--color-sea-700)]">
              {recentViewers.length}
            </span>
          </div>

          {isLoadingViewers ? (
            <p className="mt-4 text-sm text-[var(--color-ink-500)]">Loading recent viewers...</p>
          ) : recentViewers.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--color-ink-500)]">No recent profile views yet.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {recentViewers.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 py-2.5"
                >
                  {item.viewer.avatarUrl ? (
                    <img
                      src={item.viewer.avatarUrl}
                      alt={item.viewer.fullName}
                      className="mt-0.5 size-9 rounded-full object-cover"
                    />
                  ) : (
                    <div className="mt-0.5 flex size-9 items-center justify-center rounded-full bg-[var(--color-sea-100)] text-xs font-semibold text-[var(--color-sea-700)]">
                      {initials(item.viewer.fullName)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--color-ink-900)]">
                      <Link
                        href={`/profile/${item.viewer.handle}`}
                        className="hover:text-[var(--color-sea-700)] hover:underline"
                      >
                        {item.viewer.fullName}
                      </Link>{" "}
                      viewed your{" "}
                      {item.targetType === "agency" ? "agency" : "traveler"} profile
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--color-ink-500)]">
                      Target: {item.targetName} (@{item.targetHandle})
                    </p>
                  </div>
                  <time className="shrink-0 whitespace-nowrap text-[11px] text-[var(--color-ink-400)]">
                    {new Date(item.createdAt).toLocaleString()}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </DashboardShell>
  );
}
