"use client";

import { useMemo, useState, useTransition } from "react";
import { Building2, ShieldCheck, Save, FileCheck2 } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardInset } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AgencyVerificationBadge, UserVerificationBadge } from "@/components/ui/verification-badge";
import { useAuth } from "@/lib/auth/auth-context";
import type { AgencySummary, UserProfile } from "@/lib/api/types";

function arrayFromCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function AgencySettingsPage() {
  const { session, apiFetchWithAuth, updateUser } = useAuth();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const agency = session?.user.agency ?? null;
  const [form, setForm] = useState({
    name: agency?.name ?? "",
    description: agency?.description ?? "",
    city: agency?.city ?? "",
    state: agency?.state ?? "",
    phone: agency?.phone ?? "",
    email: agency?.email ?? session?.user.email ?? "",
    address: agency?.address ?? "",
    gstin: agency?.gstin ?? "",
    pan: agency?.pan ?? "",
    tourismLicense: agency?.tourismLicense ?? "",
    specializations: (agency?.specializations ?? []).join(", "),
    destinations: (agency?.destinations ?? []).join(", "),
  });

  const ownerTier = session?.user.verification ?? "BASIC";
  const canReachVerified = ownerTier !== "BASIC";
  const verificationHint = useMemo(() => {
    if (agency?.verification === "verified") {
      return "Your operator profile is already verified and public surfaces will show the badge.";
    }
    if (!canReachVerified) {
      return "Verify your traveler profile first. Agency verification needs a verified owner account.";
    }
    return "Submit GSTIN, PAN, and tourism license details to move the agency into verified state.";
  }, [agency?.verification, canReachVerified]);

  return (
    <DashboardShell
      variant="agency"
      title="Agency settings"
      subtitle="Keep operator, compliance, and verification details current inside the agency workspace."
    >
      {/* Status card */}
      <Card className="relative overflow-hidden p-5 sm:p-6">
        <div className="clay-blob -top-8 -right-8 size-24 bg-[var(--color-sea-200)] opacity-10" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-gradient-to-b from-[var(--color-sea-50)] to-[var(--color-sea-100)] text-[var(--color-sea-700)] shadow-[var(--shadow-clay-sm)]">
              <Building2 className="size-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
                Owner status
              </p>
              <h2 className="mt-1 font-display text-lg text-[var(--color-ink-950)]">
                {agency?.name ?? "Agency profile"}
              </h2>
              <p className="mt-1 text-sm text-[var(--color-ink-600)]">{verificationHint}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <UserVerificationBadge tier={ownerTier} />
            <AgencyVerificationBadge status={agency?.verification ?? "pending"} />
          </div>
        </div>
      </Card>

      {/* Details form */}
      <Card className="p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-[var(--radius-sm)] bg-gradient-to-b from-[var(--color-sea-50)] to-[var(--color-sea-100)] text-[var(--color-sea-700)] shadow-[var(--shadow-clay-sm)]">
            <Building2 className="size-5" />
          </div>
          <h2 className="font-display text-lg text-[var(--color-ink-950)]">Business details</h2>
        </div>

        <div className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">Agency name</label>
              <Input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Agency name"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">Email</label>
              <Input
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="Agency email"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">Phone</label>
              <Input
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                placeholder="Agency phone"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">Office address</label>
              <Input
                value={form.address}
                onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
                placeholder="Office address"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">City</label>
              <Input
                value={form.city}
                onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
                placeholder="City"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">State</label>
              <Input
                value={form.state}
                onChange={(event) => setForm((current) => ({ ...current, state: event.target.value }))}
                placeholder="State"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">Description</label>
            <Textarea
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="What kind of trips does your agency operate?"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">Specializations</label>
              <Input
                value={form.specializations}
                onChange={(event) =>
                  setForm((current) => ({ ...current, specializations: event.target.value }))
                }
                placeholder="Trekking, cultural, wildlife..."
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">Destinations</label>
              <Input
                value={form.destinations}
                onChange={(event) =>
                  setForm((current) => ({ ...current, destinations: event.target.value }))
                }
                placeholder="Leh, Manali, Goa..."
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Compliance card */}
      <Card className="relative overflow-hidden p-5 sm:p-6">
        <div className="clay-blob -bottom-6 -left-6 size-20 bg-[var(--color-sunset-200)] opacity-10" />
        <div className="relative space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-[var(--radius-sm)] bg-gradient-to-b from-[var(--color-sunset-50)] to-[var(--color-sunset-100)] text-[var(--color-sunset-700)] shadow-[var(--shadow-clay-sm)]">
              <ShieldCheck className="size-5" />
            </div>
            <h2 className="font-display text-lg text-[var(--color-ink-950)]">Compliance & verification</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">GSTIN</label>
              <Input
                value={form.gstin}
                onChange={(event) => setForm((current) => ({ ...current, gstin: event.target.value }))}
                placeholder="GSTIN"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">PAN</label>
              <Input
                value={form.pan}
                onChange={(event) => setForm((current) => ({ ...current, pan: event.target.value }))}
                placeholder="PAN"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">Tourism license</label>
              <Input
                value={form.tourismLicense}
                onChange={(event) =>
                  setForm((current) => ({ ...current, tourismLicense: event.target.value }))
                }
                placeholder="Tourism license"
              />
            </div>
          </div>

          {feedback && (
            <div className="rounded-[var(--radius-md)] bg-[var(--color-sunset-50)] p-3 text-sm text-[var(--color-sunset-700)] shadow-[var(--shadow-clay-inset)]">
              {feedback}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() =>
                startSaving(async () => {
                  try {
                    const payload = {
                      name: form.name,
                      description: form.description || undefined,
                      city: form.city || undefined,
                      state: form.state || undefined,
                      phone: form.phone || undefined,
                      email: form.email || undefined,
                      address: form.address || undefined,
                      gstin: form.gstin || undefined,
                      pan: form.pan || undefined,
                      tourismLicense: form.tourismLicense || undefined,
                      specializations: arrayFromCsv(form.specializations),
                      destinations: arrayFromCsv(form.destinations),
                    };

                    if (!agency) {
                      setFeedback("Agency profile is missing from your session.");
                      return;
                    }

                    const updated = await apiFetchWithAuth<AgencySummary>(`/agencies/${agency.id}`, {
                      method: "PATCH",
                      body: JSON.stringify(payload),
                    });

                    updateUser({
                      ...(session?.user as UserProfile),
                      agency: updated,
                    });
                    setFeedback("Agency profile updated.");
                  } catch (error) {
                    setFeedback(error instanceof Error ? error.message : "Unable to save agency profile.");
                  }
                })
              }
              disabled={isSaving}
            >
              <Save className="size-4" />
              {isSaving ? "Saving..." : "Save agency details"}
            </Button>

            {agency && (
              <Button
                variant="secondary"
                onClick={() =>
                  startSaving(async () => {
                    try {
                      const updated = await apiFetchWithAuth<AgencySummary>(
                        `/agencies/${agency.id}/verification/submit`,
                        {
                          method: "POST",
                          body: JSON.stringify({
                            gstin: form.gstin || undefined,
                            pan: form.pan || undefined,
                            tourismLicense: form.tourismLicense || undefined,
                            address: form.address || undefined,
                            city: form.city || undefined,
                            state: form.state || undefined,
                            phone: form.phone || undefined,
                            email: form.email || undefined,
                            description: form.description || undefined,
                            consent: true,
                          }),
                        },
                      );

                      updateUser({
                        ...(session?.user as UserProfile),
                        agency: updated,
                      });
                      setFeedback(
                        `Agency verification status updated to ${String(updated.verification ?? "pending").replace("_", " ")}.`,
                      );
                    } catch (error) {
                      setFeedback(
                        error instanceof Error
                          ? error.message
                          : "Unable to submit agency verification right now.",
                      );
                    }
                  })
                }
                disabled={isSaving}
              >
                <FileCheck2 className="size-4" />
                Submit verification
              </Button>
            )}
          </div>
        </div>
      </Card>
    </DashboardShell>
  );
}
