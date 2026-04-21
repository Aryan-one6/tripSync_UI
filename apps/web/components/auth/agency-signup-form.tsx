"use client";

import Link from "next/link";
import { useState, useTransition, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  ArrowLeft, ArrowRight, Building2, User, MapPin,
  ShieldCheck, Check, Eye, EyeOff, Loader2, BadgeCheck,
  AlertCircle, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { useAuth } from "@/lib/auth/auth-context";
import { apiFetch } from "@/lib/api/client";
import { API_BASE_URL } from "@/lib/config";

// ─── Schema ───────────────────────────────────────────────────────────────────

const agencyFormSchema = z
  .object({
    fullName: z.string().trim().min(2).max(100),
    username: z.string().trim().min(3).max(24).regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers, and underscores only"),
    email: z.string().trim().email(),
    phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid Indian mobile number"),
    password: z.string().min(8, "At least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm your password"),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
    gender: z.enum(["male", "female", "other"]),
    city: z.string().trim().min(2).max(100),
    travelPreferences: z.string().trim().min(10).max(500),
    bio: z.string().trim().max(500).optional(),
    agencyName: z.string().trim().min(2).max(120),
    agencyDescription: z.string().trim().min(20).max(1200),
    agencyPhone: z.union([z.string().regex(/^[6-9]\d{9}$/, "Invalid phone"), z.literal("")]),
    agencyEmail: z.union([z.string().trim().email(), z.literal("")]),
    agencyAddress: z.string().trim().min(5).max(300),
    agencyCity: z.string().trim().min(2).max(100),
    agencyState: z.string().trim().min(2).max(100),
    gstin: z.string().trim().min(5).max(30),
    pan: z.string().trim().max(30).optional(),
    tourismLicense: z.string().trim().max(80).optional(),
    specializationsInput: z.string().min(2, "Add at least one specialization"),
    destinationsInput: z.string().min(2, "Add at least one destination"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type AgencyFormValues = z.infer<typeof agencyFormSchema>;

// ─── GST verification state ───────────────────────────────────────────────────

type GstStatus =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "verified"; legalName: string; tradeName?: string | null }
  | { state: "conflict"; message: string }
  | { state: "inactive"; status: string }
  | { state: "invalid" }
  | { state: "unavailable" };

// ─── Steps config ─────────────────────────────────────────────────────────────

const STEPS = [
  {
    key: "owner",
    title: "Owner Account",
    subtitle: "Your personal login credentials",
    icon: User,
    fields: ["fullName", "username", "email", "phone", "password", "confirmPassword"] as Array<keyof AgencyFormValues>,
  },
  {
    key: "profile",
    title: "Owner Profile",
    subtitle: "Personal details for your profile",
    icon: User,
    fields: ["gender", "dateOfBirth", "city", "travelPreferences", "bio"] as Array<keyof AgencyFormValues>,
  },
  {
    key: "agency",
    title: "Agency Details",
    subtitle: "Your business information",
    icon: Building2,
    fields: ["agencyName", "agencyDescription", "agencyAddress", "agencyCity", "agencyState"] as Array<keyof AgencyFormValues>,
  },
  {
    key: "operations",
    title: "Verification",
    subtitle: "Compliance & operational info",
    icon: ShieldCheck,
    fields: ["agencyPhone", "agencyEmail", "specializationsInput", "destinationsInput", "gstin", "pan", "tourismLicense"] as Array<keyof AgencyFormValues>,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function arrayFromCsv(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ steps, current }: { steps: typeof STEPS; current: number }) {
  return (
    <div className="flex items-center">
      {steps.map((step, idx) => {
        const Icon = step.icon;
        const isCompleted = idx < current;
        const isActive = idx === current;
        return (
          <div key={step.key} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div className={`flex size-8 items-center justify-center rounded-full border-2 transition-all ${
                isCompleted ? "border-emerald-500 bg-emerald-500 text-white" :
                isActive ? "border-emerald-500 bg-white text-emerald-600" :
                "border-gray-200 bg-white text-gray-400"
              }`}>
                {isCompleted ? <Check className="size-3.5" /> : <Icon className="size-3.5" />}
              </div>
              <span className={`hidden sm:block text-[9px] font-bold text-center leading-tight max-w-[56px] ${
                isActive ? "text-emerald-700" : isCompleted ? "text-emerald-600" : "text-gray-400"
              }`}>
                {step.title}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`mx-1 mb-4 sm:mb-5 h-0.5 flex-1 transition-all ${idx < current ? "bg-emerald-500" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({ label, error, hint, className, children, optional }: {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
        {label}
        {optional && <span className="text-[10px] font-normal text-gray-400">(optional)</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-[10px] text-gray-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ─── GSTIN Verification Badge ─────────────────────────────────────────────────

function GstVerificationBadge({ status }: { status: GstStatus }) {
  if (status.state === "idle") return null;

  if (status.state === "checking") {
    return (
      <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-600">
        <Loader2 className="size-3.5 animate-spin" />
        Verifying GSTIN…
      </div>
    );
  }

  if (status.state === "verified") {
    return (
      <div className="mt-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <BadgeCheck className="size-4 text-emerald-600" />
          <span className="text-xs font-bold text-emerald-700">GSTIN Verified</span>
          <Lock className="size-3 text-emerald-500 ml-auto" />
        </div>
        <p className="mt-0.5 text-[11px] text-emerald-800 font-medium">
          {status.legalName}
        </p>
        {status.tradeName && status.tradeName !== status.legalName && (
          <p className="text-[10px] text-emerald-600">Trade name: {status.tradeName}</p>
        )}
        <p className="mt-1 text-[10px] text-emerald-600">
          Company name and address are now locked and read-only.
        </p>
      </div>
    );
  }

  if (status.state === "conflict") {
    return (
      <div className="mt-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <AlertCircle className="size-3.5 text-red-500" />
          <span className="text-xs font-bold text-red-700">Already Registered</span>
        </div>
        <p className="mt-0.5 text-[11px] text-red-700">{status.message}</p>
        <Link href="/login?role=agency" className="mt-1 block text-[10px] font-semibold text-violet-600 hover:underline">
          Sign in to your existing account →
        </Link>
      </div>
    );
  }

  if (status.state === "inactive") {
    return (
      <div className="mt-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <AlertCircle className="size-3.5 text-amber-600" />
          <span className="text-xs font-bold text-amber-700">Inactive GSTIN</span>
        </div>
        <p className="mt-0.5 text-[11px] text-amber-700">
          Status: {status.status}. Only active GSTINs are accepted for escrow payouts.
        </p>
      </div>
    );
  }

  if (status.state === "invalid") {
    return (
      <div className="mt-2 flex items-center gap-1.5 text-xs text-red-500">
        <AlertCircle className="size-3.5" />
        Invalid GSTIN format. Expected 15-character code (e.g. 22AAAAA0000A1Z5).
      </div>
    );
  }

  if (status.state === "unavailable") {
    return (
      <div className="mt-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <AlertCircle className="size-3.5 text-gray-400" />
          <span className="text-xs text-gray-500">
            Verification service unavailable — your GSTIN will be reviewed manually.
          </span>
        </div>
      </div>
    );
  }

  return null;
}

// ─── Main Form ────────────────────────────────────────────────────────────────

export function AgencySignupForm({ nextPath = "/agency/dashboard" }: { nextPath?: string }) {
  const router = useRouter();
  const { signupAgency } = useAuth();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // GST verification state
  const [gstStatus, setGstStatus] = useState<GstStatus>({ state: "idle" });
  const gstDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const GSTIN_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

  const form = useForm<AgencyFormValues>({
    resolver: zodResolver(agencyFormSchema),
    defaultValues: {
      fullName: "", username: "", email: "", phone: "",
      password: "", confirmPassword: "",
      dateOfBirth: "", gender: "male", city: "", travelPreferences: "", bio: "",
      agencyName: "", agencyDescription: "",
      agencyPhone: "", agencyEmail: "",
      agencyAddress: "", agencyCity: "", agencyState: "",
      gstin: "", pan: "", tourismLicense: "",
      specializationsInput: "", destinationsInput: "",
    },
  });

  const currentStep = STEPS[step];
  const isLastStep = step === STEPS.length - 1;
  const loginNextPath = nextPath.startsWith("/dashboard") ? "/agency/dashboard" : nextPath;
  const isGstVerified = gstStatus.state === "verified";

  // ─── GSTIN live verification ─────────────────────────────────────────────────

  const handleGstinChange = useCallback(
    (value: string) => {
      const normalized = value.toUpperCase().trim();
      form.setValue("gstin", normalized, { shouldValidate: false });

      if (gstDebounceRef.current) clearTimeout(gstDebounceRef.current);

      if (normalized.length < 15) {
        setGstStatus({ state: "idle" });
        return;
      }

      if (!GSTIN_REGEX.test(normalized)) {
        setGstStatus({ state: "invalid" });
        return;
      }

      setGstStatus({ state: "checking" });

      gstDebounceRef.current = setTimeout(async () => {
        try {
          const data = await apiFetch<{
            valid: boolean;
            verified: boolean;
            error: string | null;
            message: string | null;
            legalName: string | null;
            tradeName: string | null;
            status: string | null;
            alreadyRegistered: boolean;
          }>(`/agencies/gst/verify?gstin=${encodeURIComponent(normalized)}`);

          if (data.alreadyRegistered) {
            setGstStatus({ state: "conflict", message: data.message || "This GSTIN is already registered." });
            return;
          }

          if (data.error === "GST_INACTIVE") {
            setGstStatus({ state: "inactive", status: data.status ?? "Inactive" });
            return;
          }

          if (data.verified && data.legalName) {
            setGstStatus({
              state: "verified",
              legalName: data.legalName,
              tradeName: data.tradeName,
            });
            // Auto-populate legal name into agencyName if it's not yet set
            const currentName = form.getValues("agencyName");
            if (!currentName || currentName.trim() === "") {
              form.setValue("agencyName", data.tradeName || data.legalName);
            }
            return;
          }

          if (data.error === "INVALID_FORMAT") {
            setGstStatus({ state: "invalid" });
            return;
          }

          // Verification API returned but couldn't verify
          setGstStatus({ state: "unavailable" });
        } catch {
          setGstStatus({ state: "unavailable" });
        }
      }, 700);
    },
    [form],
  );

  async function goNext() {
    const valid = await form.trigger(currentStep.fields);
    if (valid) setStep((c) => c + 1);
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-5 text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-100 px-2.5 py-0.5 text-[9px] font-bold text-amber-700 mb-2.5 uppercase tracking-wider">
          Step {step + 1} of {STEPS.length}
        </div>
        <h1 className="font-display text-xl font-black text-gray-950 sm:text-2xl">{currentStep.title}</h1>
        <p className="mt-1 text-xs text-gray-400">{currentStep.subtitle}</p>
      </div>

      {/* Step indicator */}
      <div className="mb-6">
        <StepIndicator steps={STEPS} current={step} />
      </div>

      {/* Form */}
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit((values) =>
          startTransition(async () => {
            try {
              await signupAgency({
                fullName: values.fullName, username: values.username,
                email: values.email, phone: values.phone, password: values.password,
                dateOfBirth: values.dateOfBirth, gender: values.gender,
                city: values.city, travelPreferences: values.travelPreferences,
                bio: values.bio || undefined,
                agencyName: values.agencyName, agencyDescription: values.agencyDescription,
                agencyPhone: values.agencyPhone || undefined, agencyEmail: values.agencyEmail || undefined,
                agencyAddress: values.agencyAddress, agencyCity: values.agencyCity,
                agencyState: values.agencyState,
                gstin: values.gstin || undefined, pan: values.pan || undefined,
                tourismLicense: values.tourismLicense || undefined,
                specializations: arrayFromCsv(values.specializationsInput),
                destinations: arrayFromCsv(values.destinationsInput),
              });
              router.replace(`/login?signup=agency&email=${encodeURIComponent(values.email)}&next=${encodeURIComponent(loginNextPath)}`);
            } catch (error) {
              setFeedback(error instanceof Error ? error.message : "Unable to create agency account.");
            }
          }),
        )}
      >
        {/* ── Step 0: Owner credentials ── */}
        {step === 0 && (
          <div className="grid gap-3.5 sm:grid-cols-2 animate-rise-in">
            <Field label="Full name" error={form.formState.errors.fullName?.message}>
              <Input placeholder="Naresh Sharma" autoFocus className="h-10" {...form.register("fullName")} />
            </Field>
            <Field label="Username" error={form.formState.errors.username?.message} hint="Lowercase, no spaces">
              <Input placeholder="tripsync_operator" className="h-10" {...form.register("username")} />
            </Field>
            <Field label="Email address" error={form.formState.errors.email?.message}>
              <Input type="email" placeholder="owner@agency.com" autoComplete="email" className="h-10" {...form.register("email")} />
            </Field>
            <Field label="Mobile number" error={form.formState.errors.phone?.message}>
              <Input placeholder="9876543210" className="h-10" {...form.register("phone")} />
            </Field>
            <Field label="Password" error={form.formState.errors.password?.message}>
              <div className="relative">
                <Input type={showPw ? "text" : "password"} placeholder="Min 8 characters" autoComplete="new-password" className="h-10 pr-10" {...form.register("password")} />
                <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition">
                  {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>
            <Field label="Confirm password" error={form.formState.errors.confirmPassword?.message}>
              <div className="relative">
                <Input type={showConfirmPw ? "text" : "password"} placeholder="Repeat password" autoComplete="new-password" className="h-10 pr-10" {...form.register("confirmPassword")} />
                <button type="button" onClick={() => setShowConfirmPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition">
                  {showConfirmPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>
          </div>
        )}

        {/* ── Step 1: Owner profile ── */}
        {step === 1 && (
          <div className="grid gap-3.5 sm:grid-cols-2 animate-rise-in">
            <Field label="Gender" error={form.formState.errors.gender?.message}>
              <Select {...form.register("gender")} options={[
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
                { value: "other", label: "Prefer not to say" },
              ]} />
            </Field>
            <Field label="Date of birth" error={form.formState.errors.dateOfBirth?.message}>
              <Input type="date" className="h-10" {...form.register("dateOfBirth")} />
            </Field>
            <Field label="Home city" error={form.formState.errors.city?.message}>
              <Input placeholder="Delhi, Mumbai…" className="h-10" {...form.register("city")} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Travel preferences" error={form.formState.errors.travelPreferences?.message} hint="Help travelers understand your operating style">
                <Textarea placeholder="Adventure-first, mixed groups, flexible pacing, budget-friendly…" className="resize-none min-h-[72px]" {...form.register("travelPreferences")} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Owner bio" error={form.formState.errors.bio?.message} optional>
                <Textarea placeholder="Your experience in travel industry…" className="resize-none min-h-[60px]" {...form.register("bio")} />
              </Field>
            </div>
          </div>
        )}

        {/* ── Step 2: Agency details ── */}
        {step === 2 && (
          <div className="grid gap-3.5 sm:grid-cols-2 animate-rise-in">
            <Field label="Agency name" error={form.formState.errors.agencyName?.message}>
              <Input
                placeholder="TrailRoot Travels"
                className={`h-10 ${isGstVerified ? "bg-gray-50 text-gray-500 cursor-not-allowed" : ""}`}
                readOnly={isGstVerified}
                {...form.register("agencyName")}
              />
              {isGstVerified && (
                <p className="mt-1 flex items-center gap-1 text-[10px] text-emerald-600">
                  <Lock className="size-2.5" /> Locked after GST verification
                </p>
              )}
            </Field>
            <Field label="Agency city" error={form.formState.errors.agencyCity?.message}>
              <Input placeholder="Delhi" className="h-10" {...form.register("agencyCity")} />
            </Field>
            <Field label="State" error={form.formState.errors.agencyState?.message}>
              <Input placeholder="Delhi" className="h-10" {...form.register("agencyState")} />
            </Field>
            <Field label="Registered address" error={form.formState.errors.agencyAddress?.message}>
              <Input
                placeholder="Office / registered address"
                className={`h-10 ${isGstVerified ? "bg-gray-50 text-gray-500 cursor-not-allowed" : ""}`}
                readOnly={isGstVerified}
                {...form.register("agencyAddress")}
              />
              {isGstVerified && (
                <p className="mt-1 flex items-center gap-1 text-[10px] text-emerald-600">
                  <Lock className="size-2.5" /> Locked after GST verification
                </p>
              )}
            </Field>
            <div className="sm:col-span-2">
              <Field label="Agency description" error={form.formState.errors.agencyDescription?.message} hint="What makes your agency unique?">
                <Textarea placeholder="Destinations, trip formats, and service style…" className="resize-none min-h-[80px]" {...form.register("agencyDescription")} />
              </Field>
            </div>
          </div>
        )}

        {/* ── Step 3: Operations & docs ── */}
        {step === 3 && (
          <div className="grid gap-3.5 sm:grid-cols-2 animate-rise-in">
            {/* Compliance info box */}
            <div className="sm:col-span-2 rounded-xl bg-amber-50 border border-amber-100 p-3 text-xs text-amber-800">
              🔒 GSTIN is required for escrow payouts. PAN & Tourism license help boost your credibility score.
            </div>
            <Field label="Agency phone" error={form.formState.errors.agencyPhone?.message} optional>
              <Input placeholder="9876543210" className="h-10" {...form.register("agencyPhone")} />
            </Field>
            <Field label="Agency email" error={form.formState.errors.agencyEmail?.message} optional>
              <Input type="email" placeholder="ops@agency.com" className="h-10" {...form.register("agencyEmail")} />
            </Field>
            <Field label="Specializations" error={form.formState.errors.specializationsInput?.message} hint="Comma-separated: Adventure, Trekking, Beach" className="sm:col-span-2">
              <Input placeholder="Adventure, Trekking, Weekend getaways" className="h-10" {...form.register("specializationsInput")} />
            </Field>
            <Field label="Destinations" error={form.formState.errors.destinationsInput?.message} hint="Comma-separated: Manali, Spiti, Goa" className="sm:col-span-2">
              <Input placeholder="Bir, Manali, Spiti, Kasol" className="h-10" {...form.register("destinationsInput")} />
            </Field>

            {/* ── GSTIN with live verification ── */}
            <div className="sm:col-span-2">
              <Field label="GSTIN" error={form.formState.errors.gstin?.message}>
                <div className="relative">
                  <Input
                    placeholder="22AAAAA0000A1Z5"
                    className={`h-10 font-mono pr-10 ${isGstVerified ? "border-emerald-300 bg-emerald-50/50" : ""}`}
                    readOnly={isGstVerified}
                    value={form.watch("gstin")}
                    onChange={(e) => handleGstinChange(e.target.value)}
                  />
                  {isGstVerified && (
                    <BadgeCheck className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-emerald-500" />
                  )}
                  {gstStatus.state === "checking" && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-blue-500 animate-spin" />
                  )}
                </div>
                <GstVerificationBadge status={gstStatus} />
              </Field>
            </div>

            <Field label="PAN" error={form.formState.errors.pan?.message} optional>
              <Input placeholder="ABCDE1234F" className="h-10 font-mono" {...form.register("pan")} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Tourism license no." error={form.formState.errors.tourismLicense?.message} optional>
                <Input placeholder="License number if available" className="h-10" {...form.register("tourismLicense")} />
              </Field>
            </div>
          </div>
        )}

        {/* Error */}
        {feedback && (
          <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
            {feedback}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-3">
            {step > 0 && (
              <button type="button" onClick={() => setStep((c) => c - 1)}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                <ArrowLeft className="size-3.5" /> Back
              </button>
            )}
            {step === 0 && (
              <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="text-sm text-gray-400 hover:text-emerald-600 transition">
                Sign in instead
              </Link>
            )}
          </div>

          {isLastStep ? (
            <button type="submit" disabled={isPending}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-200 px-5 py-2.5 text-sm font-bold text-white transition shadow-sm"
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin size-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Creating agency…
                </span>
              ) : (
                <span className="flex items-center gap-1.5">Create agency <Check className="size-4" /></span>
              )}
            </button>
          ) : (
            <button type="button" onClick={() => void goNext()}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white transition shadow-sm"
            >
              Continue <ArrowRight className="size-3.5" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
