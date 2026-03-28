"use client";

import { useEffect, useState, useTransition } from "react";
import { ShieldCheck, LogOut, Save } from "lucide-react";
import { UpdateProfileSchema } from "@tripsync/shared";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardInset } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { UserVerificationBadge } from "@/components/ui/verification-badge";
import { useAuth } from "@/lib/auth/auth-context";
import type {
  AadhaarVerificationResult,
  ProfileVerificationStatus,
  UserProfile,
} from "@/lib/api/types";

export default function SettingsPage() {
  const { session, apiFetchWithAuth, updateUser, logout } = useAuth();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [verificationFeedback, setVerificationFeedback] = useState<string | null>(null);
  const [verification, setVerification] = useState<ProfileVerificationStatus | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isVerifying, startVerification] = useTransition();
  const [form, setForm] = useState({
    fullName: session?.user.fullName ?? "",
    email: session?.user.email ?? "",
    city: session?.user.city ?? "",
    bio: session?.user.bio ?? "",
    gender: session?.user.gender ?? "",
  });
  const [aadhaarForm, setAadhaarForm] = useState({
    fullName: session?.user.fullName ?? "",
    aadhaarNumber: "",
    dateOfBirth: session?.user.dateOfBirth?.slice(0, 10) ?? "",
  });

  useEffect(() => {
    void (async () => {
      try {
        const data = await apiFetchWithAuth<ProfileVerificationStatus>("/auth/me/verification");
        setVerification(data);
      } catch {
        setVerification(null);
      }
    })();
  }, [apiFetchWithAuth]);

  return (
    <DashboardShell
      variant="user"
      title="Account settings"
      subtitle="Keep the basics accurate so your profile looks credible when people evaluate your plans."
    >
      {/* Verification card */}
      <Card className="relative overflow-hidden p-5 sm:p-6">
        <div className="clay-blob -top-8 -right-8 size-24 bg-[var(--color-sea-200)] opacity-10" />
        <div className="relative space-y-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-gradient-to-b from-[var(--color-sea-50)] to-[var(--color-sea-100)] text-[var(--color-sea-700)] shadow-[var(--shadow-clay-sm)]">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">Verification</p>
                <h2 className="mt-1 font-display text-lg text-[var(--color-ink-950)]">Profile trust signals</h2>
                <p className="mt-1 text-sm text-[var(--color-ink-600)]">
                  Aadhaar eKYC unlocks a verified badge. 3+ completed trips and 4.5+ rating earns trusted status.
                </p>
              </div>
            </div>
            <UserVerificationBadge tier={verification?.tier ?? session?.user.verification ?? "BASIC"} />
          </div>

          {/* Verification stats */}
          <div className="grid gap-3 sm:grid-cols-3">
            <CardInset className="p-3.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-ink-500)]">Aadhaar</p>
              <p className="mt-1 text-sm text-[var(--color-ink-700)]">
                {verification?.hasAadhaar ? "Verified (hash stored)" : "Not verified"}
              </p>
            </CardInset>
            <CardInset className="p-3.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-ink-500)]">Completed trips</p>
              <p className="mt-1 text-sm font-semibold text-[var(--color-ink-800)]">{verification?.completedTrips ?? 0}</p>
            </CardInset>
            <CardInset className="p-3.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-ink-500)]">Average rating</p>
              <p className="mt-1 text-sm font-semibold text-[var(--color-ink-800)]">{(verification?.avgRating ?? 0).toFixed(1)}</p>
            </CardInset>
          </div>

          {/* Aadhaar form */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">Name as per Aadhaar</label>
              <Input
                value={aadhaarForm.fullName}
                onChange={(event) => setAadhaarForm((current) => ({ ...current, fullName: event.target.value }))}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">12-digit Aadhaar</label>
              <Input
                value={aadhaarForm.aadhaarNumber}
                onChange={(event) => setAadhaarForm((current) => ({ ...current, aadhaarNumber: event.target.value }))}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">Date of birth</label>
              <Input
                type="date"
                value={aadhaarForm.dateOfBirth}
                onChange={(event) => setAadhaarForm((current) => ({ ...current, dateOfBirth: event.target.value }))}
              />
            </div>
          </div>
          <p className="text-xs text-[var(--color-ink-500)]">
            Female-only trips use the profile gender saved below.
          </p>

          {verificationFeedback && (
            <div className="rounded-[var(--radius-md)] bg-[var(--color-sunset-50)] p-3 text-sm text-[var(--color-sunset-700)] shadow-[var(--shadow-clay-inset)]">
              {verificationFeedback}
            </div>
          )}

          <Button
            onClick={() =>
              startVerification(async () => {
                try {
                  const result = await apiFetchWithAuth<AadhaarVerificationResult>(
                    "/auth/me/verification/aadhaar",
                    {
                      method: "POST",
                      body: JSON.stringify({ ...aadhaarForm, consent: true }),
                    },
                  );
                  const nextUser: UserProfile = {
                    ...(session?.user as UserProfile),
                    fullName: result.fullName,
                    dateOfBirth: result.dateOfBirth ?? session?.user.dateOfBirth ?? null,
                    verification: result.tier,
                  };
                  updateUser(nextUser);
                  setVerification((current) =>
                    current ? { ...current, tier: result.tier, hasAadhaar: true } : current,
                  );
                  setVerificationFeedback(
                    `Verification complete via ${result.provider}. Stored reference: ${result.maskedAadhaar}.`,
                  );
                } catch (error) {
                  setVerificationFeedback(
                    error instanceof Error ? error.message : "Unable to verify profile right now.",
                  );
                }
              })
            }
            disabled={isVerifying}
          >
            <ShieldCheck className="size-4" />
            {isVerifying ? "Verifying..." : "Verify with Aadhaar"}
          </Button>
        </div>
      </Card>

      {/* Profile edit card */}
      <Card className="p-5 sm:p-6">
        <h2 className="font-display text-lg text-[var(--color-ink-950)]">Profile details</h2>
        <div className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">Full name</label>
              <Input value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">Email</label>
              <Input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">City</label>
              <Input value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} />
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
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">Bio</label>
            <Textarea value={form.bio} onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))} placeholder="Tell co-travelers what kind of trips you like." />
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
                      email: form.email || undefined,
                      city: form.city || undefined,
                      bio: form.bio || undefined,
                      gender: form.gender ? (form.gender as "male" | "female" | "other") : undefined,
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
              {isPending ? "Saving..." : "Save changes"}
            </Button>
            <Button variant="danger" onClick={logout}>
              <LogOut className="size-4" />
              Logout
            </Button>
          </div>
        </div>
      </Card>
    </DashboardShell>
  );
}
