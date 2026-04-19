"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { TravelerSignupSchema } from "@tripsync/shared";
import { ArrowLeft, ArrowRight, User, Heart, LockKeyhole, Check, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { useAuth } from "@/lib/auth/auth-context";

const travelerFormSchema = TravelerSignupSchema.extend({
  confirmPassword: z.string().min(8, "Confirm your password"),
}).refine((value) => value.password === value.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type TravelerFormValues = z.infer<typeof travelerFormSchema>;

const STEPS = [
  {
    key: "account",
    title: "Your Account",
    subtitle: "Basic login credentials",
    icon: User,
    fields: ["fullName", "username", "email", "phone"] as Array<keyof TravelerFormValues>,
  },
  {
    key: "profile",
    title: "Your Profile",
    subtitle: "Help us personalise your experience",
    icon: Heart,
    fields: ["gender", "dateOfBirth", "city", "travelPreferences", "bio"] as Array<keyof TravelerFormValues>,
  },
  {
    key: "password",
    title: "Secure Account",
    subtitle: "Create a strong password",
    icon: LockKeyhole,
    fields: ["password", "confirmPassword"] as Array<keyof TravelerFormValues>,
  },
];

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({ label, error, hint, className, children }: {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-semibold text-[var(--color-ink-700)]">{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-[10px] text-[var(--color-ink-400)]">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ steps, current }: { steps: typeof STEPS; current: number }) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, idx) => {
        const Icon = step.icon;
        const isCompleted = idx < current;
        const isActive = idx === current;
        return (
          <div key={step.key} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`flex size-9 items-center justify-center rounded-full border-2 transition-all ${
                isCompleted ? "border-emerald-500 bg-emerald-500 text-white" :
                isActive ? "border-emerald-500 bg-white text-emerald-600" :
                "border-gray-200 bg-white text-gray-400"
              }`}>
                {isCompleted ? <Check className="size-4" /> : <Icon className="size-4" />}
              </div>
              <span className={`hidden sm:block text-[10px] font-semibold ${
                isActive ? "text-emerald-700" : isCompleted ? "text-emerald-600" : "text-gray-400"
              }`}>
                {step.title}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`mx-2 mb-5 h-0.5 flex-1 transition-all ${idx < current ? "bg-emerald-500" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

export function TravelerSignupForm({ nextPath = "/discover?audience=traveler" }: { nextPath?: string }) {
  const router = useRouter();
  const { signupTraveler } = useAuth();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const form = useForm<TravelerFormValues>({
    resolver: zodResolver(travelerFormSchema),
    defaultValues: {
      fullName: "", username: "", email: "", phone: "",
      dateOfBirth: "", gender: "male", city: "", travelPreferences: "", bio: "",
      password: "", confirmPassword: "",
    },
  });

  const currentStep = STEPS[step];
  const isLastStep = step === STEPS.length - 1;
  const loginNextPath = nextPath.startsWith("/agency") ? "/discover?audience=traveler" : nextPath;

  async function goNext() {
    const valid = await form.trigger(currentStep.fields);
    if (valid) setStep((c) => c + 1);
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-5 text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 text-[9px] font-bold text-emerald-700 mb-2.5 uppercase tracking-wider">
          Step {step + 1} of {STEPS.length}
        </div>
        <h1 className="font-display text-xl font-black text-[var(--color-ink-950)] sm:text-2xl">{currentStep.title}</h1>
        <p className="mt-1 text-xs text-[var(--color-ink-500)]">{currentStep.subtitle}</p>
      </div>

      {/* Step indicator */}
      <div className="mb-7">
        <StepIndicator steps={STEPS} current={step} />
      </div>

      {/* Form */}
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit((values) =>
          startTransition(async () => {
            try {
              await signupTraveler({
                fullName: values.fullName, username: values.username,
                email: values.email, phone: values.phone, password: values.password,
                dateOfBirth: values.dateOfBirth, gender: values.gender,
                city: values.city, travelPreferences: values.travelPreferences,
                bio: values.bio || undefined,
              });
              router.replace(`/login?signup=traveler&email=${encodeURIComponent(values.email)}&next=${encodeURIComponent(loginNextPath)}`);
            } catch (error) {
              setFeedback(error instanceof Error ? error.message : "Unable to create your account.");
            }
          }),
        )}
      >
        {/* Step 0: Account */}
        {step === 0 && (
          <div className="grid gap-4 sm:grid-cols-2 animate-rise-in">
            <Field label="Full name" error={form.formState.errors.fullName?.message} hint="As it appears on your ID">
              <Input placeholder="Naresh Sharma" autoFocus className="h-11" {...form.register("fullName")} />
            </Field>
            <Field label="Username" error={form.formState.errors.username?.message} hint="Unique, no spaces">
              <Input placeholder="naresh_travel" className="h-11" {...form.register("username")} />
            </Field>
            <Field label="Email" error={form.formState.errors.email?.message}>
              <Input type="email" placeholder="you@example.com" autoComplete="email" className="h-11" {...form.register("email")} />
            </Field>
            <Field label="Phone" error={form.formState.errors.phone?.message} hint="Indian mobile number">
              <Input placeholder="9876543210" className="h-11" {...form.register("phone")} />
            </Field>
          </div>
        )}

        {/* Step 1: Profile */}
        {step === 1 && (
          <div className="grid gap-4 sm:grid-cols-2 animate-rise-in">
            <Field label="Gender" error={form.formState.errors.gender?.message}>
              <Select {...form.register("gender")} options={[
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
                { value: "other", label: "Prefer not to say" },
              ]} />
            </Field>
            <Field label="Date of birth" error={form.formState.errors.dateOfBirth?.message}>
              <Input type="date" className="h-11" {...form.register("dateOfBirth")} />
            </Field>
            <Field label="Home city" error={form.formState.errors.city?.message} hint="Where you're based">
              <Input placeholder="Delhi, Mumbai, Bangalore…" className="h-11" {...form.register("city")} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Travel preferences" error={form.formState.errors.travelPreferences?.message} hint="Help agencies pitch the right trips">
                <Textarea placeholder="Weekend treks, mixed groups, budget backpacking, adventure-first…" className="resize-none min-h-[80px]" {...form.register("travelPreferences")} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Short bio (optional)" error={form.formState.errors.bio?.message} hint="What should future travel buddies know about you?">
                <Textarea placeholder="Tell your story in a few lines…" className="resize-none min-h-[70px]" {...form.register("bio")} />
              </Field>
            </div>
          </div>
        )}

        {/* Step 2: Password */}
        {step === 2 && (
          <div className="space-y-4 animate-rise-in">
            {/* Password strength hint */}
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-xs text-emerald-800">
              🔒 Use at least 8 characters. Mix letters, numbers, and symbols for a stronger password.
            </div>

            <Field label="Password" error={form.formState.errors.password?.message}>
              <div className="relative">
                <Input type={showPw ? "text" : "password"} placeholder="At least 8 characters" autoComplete="new-password" className="h-11 pr-10" {...form.register("password")} />
                <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-400)] hover:text-[var(--color-ink-700)] transition">
                  {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>

            <Field label="Confirm password" error={form.formState.errors.confirmPassword?.message}>
              <div className="relative">
                <Input type={showConfirmPw ? "text" : "password"} placeholder="Repeat password" autoComplete="new-password" className="h-11 pr-10" {...form.register("confirmPassword")} />
                <button type="button" onClick={() => setShowConfirmPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-400)] hover:text-[var(--color-ink-700)] transition">
                  {showConfirmPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>
          </div>
        )}

        {/* Error */}
        {feedback && (
          <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
            {feedback}
          </div>
        )}

        {/* Nav buttons */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-3">
            {step > 0 && (
              <button type="button" onClick={() => setStep((c) => c - 1)}
                className="flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--color-ink-700)] transition hover:bg-[var(--color-surface-2)]"
              >
                <ArrowLeft className="size-3.5" /> Back
              </button>
            )}
            {step === 0 && (
              <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="text-sm text-[var(--color-ink-500)] hover:text-emerald-600 transition">
                Already have an account?
              </Link>
            )}
          </div>

          {isLastStep ? (
            <Button type="submit" disabled={isPending} className="h-11 px-6 text-sm font-bold">
              {isPending ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin size-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Creating account…
                </span>
              ) : (
                <span className="flex items-center gap-2">Create Account <Check className="size-4" /></span>
              )}
            </Button>
          ) : (
            <button type="button" onClick={() => void goNext()}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-6 py-2.5 text-sm font-bold text-white transition shadow-sm"
            >
              Continue <ArrowRight className="size-3.5" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
