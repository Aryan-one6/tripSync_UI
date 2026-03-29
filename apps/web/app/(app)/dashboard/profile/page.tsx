"use client";

import { useState, useTransition } from "react";
import { Save } from "lucide-react";
import { UpdateProfileSchema } from "@tripsync/shared";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { useAuth } from "@/lib/auth/auth-context";
import type { UserProfile } from "@/lib/api/types";

export default function ProfilePage() {
  const { session, apiFetchWithAuth, updateUser } = useAuth();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    fullName: session?.user.fullName ?? "",
    city: session?.user.city ?? "",
    gender: session?.user.gender ?? "",
    dateOfBirth: session?.user.dateOfBirth?.slice(0, 10) ?? "",
    travelPreferences: session?.user.travelPreferences ?? "",
    bio: session?.user.bio ?? "",
  });

  return (
    <DashboardShell
      variant="user"
      title="Profile"
      subtitle="Edit the public traveler details people will use to judge whether they want to travel with you."
    >
      <Card className="p-5 sm:p-6">
        <h2 className="font-display text-lg text-[var(--color-ink-950)]">Traveler profile</h2>
        <div className="mt-5 space-y-4">
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
    </DashboardShell>
  );
}
