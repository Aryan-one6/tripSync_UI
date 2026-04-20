"use client";

import React, { useMemo, useState, useTransition } from "react";
import {
  Building2, ShieldCheck, Save, FileCheck2, ExternalLink,
  Landmark, CheckCircle2, AlertTriangle, Loader2, Lock, RefreshCcw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CoverImageUpload } from "@/components/ui/image-upload";
import { AgencyVerificationBadge, UserVerificationBadge } from "@/components/ui/verification-badge";
import { useAuth } from "@/lib/auth/auth-context";
import type { AgencySummary, UserProfile } from "@/lib/api/types";

type BankVerificationStatus = 'PENDING' | 'VERIFIED' | 'FAILED' | 'NAME_MISMATCH' | 'MAX_RETRIES_EXCEEDED';

interface BankRecord {
  id: string;
  accountHolderName: string;
  bankName?: string | null;
  maskedAccountNumber: string;
  ifscCode: string;
  verificationStatus: BankVerificationStatus;
  nameMatchScore?: number | null;
  nameMatchPassed?: boolean;
  verifiedAt?: string | null;
  retryCount: number;
  message?: string;
}

function arrayFromCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function BankStatusBadge({ status }: { status: BankVerificationStatus }) {
  const map: Record<BankVerificationStatus, { label: string; color: string; icon: React.ReactElement }> = {
    PENDING: { label: "Pending", color: "text-amber-600 bg-amber-50 border-amber-200", icon: <Loader2 className="size-3.5 animate-spin" /> },
    VERIFIED: { label: "Verified", color: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: <CheckCircle2 className="size-3.5" /> },
    FAILED: { label: "Failed", color: "text-red-700 bg-red-50 border-red-200", icon: <AlertTriangle className="size-3.5" /> },
    NAME_MISMATCH: { label: "Name mismatch", color: "text-orange-700 bg-orange-50 border-orange-200", icon: <AlertTriangle className="size-3.5" /> },
    MAX_RETRIES_EXCEEDED: { label: "Max retries", color: "text-gray-700 bg-gray-100 border-gray-300", icon: <Lock className="size-3.5" /> },
  };
  const { label, color, icon } = map[status] ?? map.PENDING;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${color}`}>
      {icon}
      {label}
    </span>
  );
}

export default function AgencySettingsPage() {
  const router = useRouter();
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
    logoUrl: agency?.logoUrl ?? "",
  });

  // ── Bank Verification State ────────────────────────────────────────
  const [bankForm, setBankForm] = useState({
    accountNumber: "",
    ifscCode: "",
    accountHolderName: "",
    bankName: "",
    branchName: "",
  });
  const [bankRecord, setBankRecord] = useState<BankRecord | null>(null);
  const [bankFeedback, setBankFeedback] = useState<string | null>(null);
  const [isBankLoading, startBankVerify] = useTransition();

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
          <CoverImageUpload
            label="Agency logo"
            value={form.logoUrl}
            onChange={(logoUrl) => setForm((current) => ({ ...current, logoUrl }))}
          />

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
              type="button"
              variant="secondary"
              onClick={() => router.push("/agency/storefront")}
              disabled={!agency?.slug}
            >
              <ExternalLink className="size-4" />
              View storefront
            </Button>
            <Button
              onClick={() =>
                startSaving(async () => {
                  try {
                    const payload = {
                      name: form.name,
                      description: form.description || undefined,
                      logoUrl: form.logoUrl || undefined,
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
      {/* Bank Verification card */}
      {agency && (
        <Card className="relative overflow-hidden p-5 sm:p-6">
          <div className="relative space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-[var(--radius-sm)] bg-gradient-to-b from-blue-50 to-blue-100 text-blue-700 shadow-[var(--shadow-clay-sm)]">
                <Landmark className="size-5" />
              </div>
              <div>
                <h2 className="font-display text-lg text-[var(--color-ink-950)]">Bank account verification</h2>
                <p className="text-sm text-[var(--color-ink-500)]">
                  Required for escrow payouts. Encrypted with AES-256-GCM and matched against your GST-verified name.
                </p>
              </div>
            </div>

            {/* Existing record */}
            {bankRecord && (
              <div className={`rounded-xl border p-4 ${
                bankRecord.verificationStatus === 'VERIFIED'
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-amber-200 bg-amber-50'
              }`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-ink-900)]">
                      {bankRecord.maskedAccountNumber}
                    </p>
                    <p className="text-xs text-[var(--color-ink-500)]">
                      {bankRecord.accountHolderName} · {bankRecord.ifscCode}
                    </p>
                    {bankRecord.nameMatchScore !== null && bankRecord.nameMatchScore !== undefined && (
                      <p className="mt-1 text-xs text-[var(--color-ink-400)]">
                        Name match: {(bankRecord.nameMatchScore * 100).toFixed(0)}%
                        {bankRecord.nameMatchPassed ? ' ✓' : ' — below threshold'}
                      </p>
                    )}
                    {bankRecord.message && (
                      <p className="mt-1 text-xs text-[var(--color-ink-600)]">{bankRecord.message}</p>
                    )}
                  </div>
                  <BankStatusBadge status={bankRecord.verificationStatus} />
                </div>
                {bankRecord.retryCount > 0 && bankRecord.verificationStatus !== 'VERIFIED' && (
                  <p className="mt-2 text-xs text-amber-700">
                    Attempt {bankRecord.retryCount} / 3 — re-submit with correct details to retry.
                  </p>
                )}
              </div>
            )}

            {/* Form */}
            {(!bankRecord || bankRecord.verificationStatus !== 'VERIFIED') &&
              bankRecord?.verificationStatus !== 'MAX_RETRIES_EXCEEDED' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">
                    Account number <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="password"
                    autoComplete="off"
                    placeholder="Account number"
                    value={bankForm.accountNumber}
                    onChange={(e) => setBankForm((c) => ({ ...c, accountNumber: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">
                    IFSC code <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g. HDFC0001234"
                    value={bankForm.ifscCode}
                    onChange={(e) => setBankForm((c) => ({ ...c, ifscCode: e.target.value.toUpperCase() }))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">
                    Account holder name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="As registered with your bank"
                    value={bankForm.accountHolderName}
                    onChange={(e) => setBankForm((c) => ({ ...c, accountHolderName: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">Bank name</label>
                  <Input
                    placeholder="HDFC Bank"
                    value={bankForm.bankName}
                    onChange={(e) => setBankForm((c) => ({ ...c, bankName: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">Branch</label>
                  <Input
                    placeholder="Branch name"
                    value={bankForm.branchName}
                    onChange={(e) => setBankForm((c) => ({ ...c, branchName: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {bankFeedback && (
              <div className={`rounded-[var(--radius-md)] p-3 text-sm shadow-[var(--shadow-clay-inset)] ${
                bankRecord?.verificationStatus === 'VERIFIED'
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'bg-[var(--color-sunset-50)] text-[var(--color-sunset-700)]'
              }`}>
                {bankFeedback}
              </div>
            )}

            {(!bankRecord || bankRecord.verificationStatus !== 'VERIFIED') &&
              bankRecord?.verificationStatus !== 'MAX_RETRIES_EXCEEDED' && (
              <div className="flex gap-3">
                {bankRecord && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={async () => {
                      try {
                        const data = await apiFetchWithAuth<BankRecord>(`/agencies/${agency.id}/bank`);
                        setBankRecord(data);
                      } catch {
                        // noop
                      }
                    }}
                  >
                    <RefreshCcw className="size-4" />
                    Refresh status
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={() =>
                    startBankVerify(async () => {
                      setBankFeedback(null);
                      try {
                        if (!bankForm.accountNumber || !bankForm.ifscCode || !bankForm.accountHolderName) {
                          setBankFeedback("Account number, IFSC code, and account holder name are required.");
                          return;
                        }
                        const result = await apiFetchWithAuth<BankRecord>(
                          `/agencies/${agency.id}/bank/verify`,
                          {
                            method: "POST",
                            body: JSON.stringify(bankForm),
                          },
                        );
                        setBankRecord(result);
                        setBankFeedback(
                          result.verificationStatus === 'VERIFIED'
                            ? '✅ Bank account verified successfully!'
                            : result.message ?? 'Verification pending — check the status above.',
                        );
                        setBankForm({ accountNumber: "", ifscCode: "", accountHolderName: "", bankName: "", branchName: "" });
                      } catch (error) {
                        setBankFeedback(error instanceof Error ? error.message : "Unable to verify bank account.");
                      }
                    })
                  }
                  disabled={isBankLoading}
                >
                  {isBankLoading ? (
                    <><Loader2 className="size-4 animate-spin" /> Verifying…</>
                  ) : (
                    <><Landmark className="size-4" /> Verify bank account</>
                  )}
                </Button>
              </div>
            )}

            {bankRecord?.verificationStatus === 'MAX_RETRIES_EXCEEDED' && (
              <p className="text-sm text-red-600">
                Maximum verification attempts exceeded. Please contact support to reset your bank verification.
              </p>
            )}
          </div>
        </Card>
      )}
    </DashboardShell>
  );
}
