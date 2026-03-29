"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ArrowLeft, ArrowRight, Building2, User, Heart, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardInset } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Stepper } from "@/components/ui/stepper";
import { Select } from "@/components/ui/select";
import { useAuth } from "@/lib/auth/auth-context";

const agencyFormSchema = z
  .object({
    fullName: z.string().trim().min(2).max(100),
    username: z.string().trim().min(3).max(24).regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers, and underscores only"),
    email: z.string().trim().email(),
    phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid Indian phone number"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm your password"),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date of birth must be in YYYY-MM-DD format"),
    gender: z.enum(["male", "female", "other"]),
    city: z.string().trim().min(2).max(100),
    travelPreferences: z.string().trim().min(10).max(500),
    bio: z.string().trim().max(500).optional(),
    agencyName: z.string().trim().min(2).max(120),
    agencyDescription: z.string().trim().min(20).max(1200),
    agencyPhone: z.union([z.string().regex(/^[6-9]\d{9}$/, "Invalid Indian phone number"), z.literal("")]),
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
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type AgencyFormValues = z.infer<typeof agencyFormSchema>;

const steps = [
  {
    key: "owner",
    title: "Owner Account",
    description: "Login credentials",
    fields: ["fullName", "username", "email", "phone", "password", "confirmPassword"] as Array<keyof AgencyFormValues>,
    icon: <User className="size-5" />,
  },
  {
    key: "profile",
    title: "Owner Profile",
    description: "Personal details",
    fields: ["gender", "dateOfBirth", "city", "travelPreferences", "bio"] as Array<keyof AgencyFormValues>,
    icon: <Heart className="size-5" />,
  },
  {
    key: "agency",
    title: "Agency Info",
    description: "Public profile",
    fields: ["agencyName", "agencyDescription", "agencyAddress", "agencyCity", "agencyState"] as Array<keyof AgencyFormValues>,
    icon: <Building2 className="size-5" />,
  },
  {
    key: "operations",
    title: "Operations",
    description: "Business details",
    fields: ["agencyPhone", "agencyEmail", "specializationsInput", "destinationsInput", "gstin", "pan", "tourismLicense"] as Array<keyof AgencyFormValues>,
    icon: <MapPin className="size-5" />,
  },
];

function arrayFromCsv(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export function AgencySignupForm({ nextPath = "/agency/dashboard" }: { nextPath?: string }) {
  const router = useRouter();
  const { signupAgency } = useAuth();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [isPending, startTransition] = useTransition();
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

  const currentStep = steps[step];
  const isLastStep = step === steps.length - 1;
  const loginNextPath = nextPath.startsWith("/dashboard") ? "/agency/dashboard" : nextPath;

  async function goNext() {
    const valid = await form.trigger(currentStep.fields);
    if (valid) setStep((c) => c + 1);
  }

  return (
    <Card className="relative mx-auto w-full max-w-3xl overflow-hidden p-6 sm:p-8">
      {/* Decorative blobs */}
      <div className="clay-blob -top-14 -right-14 size-40 bg-[var(--color-sand-200)] opacity-20 animate-blob" />
      <div className="clay-blob -bottom-10 -left-10 size-28 bg-[var(--color-sea-200)] opacity-12 animate-blob delay-300" />

      <div className="relative">
        {/* Header */}
        <div className="mb-6">
          <div className="mb-4 flex size-14 items-center justify-center rounded-[var(--radius-lg)] bg-gradient-to-b from-[var(--color-sand-100)] to-[var(--color-sand-200)] text-[var(--color-ink-700)] shadow-[var(--shadow-clay)]">
            <Building2 className="size-6" />
          </div>
          <h1 className="font-display text-2xl text-[var(--color-ink-950)] sm:text-3xl">Agency signup</h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--color-ink-600)] leading-relaxed">
            Create the owner account and operator profile in one flow, then land directly in your agency workspace.
          </p>
        </div>

        {/* Stepper */}
        <div className="mb-6">
          <Stepper
            steps={steps}
            currentStep={step}
            onStepClick={(i) => { if (i < step) setStep(i); }}
          />
        </div>

        {/* Step info */}
        <CardInset className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-sea-700)]">
            {currentStep.title}
          </p>
          <p className="mt-1 text-sm text-[var(--color-ink-600)]">{currentStep.description}</p>
        </CardInset>

        {/* Form */}
        <form
          className="space-y-5"
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
                router.replace(
                  `/login?signup=agency&email=${encodeURIComponent(values.email)}&next=${encodeURIComponent(loginNextPath)}`,
                );
              } catch (error) {
                setFeedback(error instanceof Error ? error.message : "Unable to create the agency account.");
              }
            }),
          )}
        >
          {step === 0 && (
            <div className="grid gap-4 sm:grid-cols-2 animate-rise-in">
              <Field label="Owner full name" error={form.formState.errors.fullName?.message}>
                <Input placeholder="Naresh Sharma" {...form.register("fullName")} />
              </Field>
              <Field label="Username" error={form.formState.errors.username?.message}>
                <Input placeholder="tripsync_operator" {...form.register("username")} />
              </Field>
              <Field label="Owner email" error={form.formState.errors.email?.message}>
                <Input type="email" placeholder="owner@example.com" {...form.register("email")} />
              </Field>
              <Field label="Owner phone" error={form.formState.errors.phone?.message}>
                <Input placeholder="9876543210" {...form.register("phone")} />
              </Field>
              <Field label="Password" error={form.formState.errors.password?.message}>
                <Input type="password" placeholder="At least 8 characters" {...form.register("password")} />
              </Field>
              <Field label="Confirm password" error={form.formState.errors.confirmPassword?.message}>
                <Input type="password" placeholder="Repeat the password" {...form.register("confirmPassword")} />
              </Field>
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-4 sm:grid-cols-2 animate-rise-in">
              <Field label="Gender" error={form.formState.errors.gender?.message}>
                <Select
                  {...form.register("gender")}
                  options={[
                    { value: "male", label: "Male" },
                    { value: "female", label: "Female" },
                    { value: "other", label: "Other" },
                  ]}
                />
              </Field>
              <Field label="Date of birth" error={form.formState.errors.dateOfBirth?.message}>
                <Input type="date" {...form.register("dateOfBirth")} />
              </Field>
              <Field label="City" error={form.formState.errors.city?.message}>
                <Input placeholder="Delhi" {...form.register("city")} />
              </Field>
              <Field
                label="Travel preferences"
                error={form.formState.errors.travelPreferences?.message}
                className="sm:col-span-2"
              >
                <Textarea
                  placeholder="Tell travelers how you like to run trips, pacing, accommodation style, and group energy."
                  {...form.register("travelPreferences")}
                />
              </Field>
              <Field label="Owner bio" error={form.formState.errors.bio?.message} className="sm:col-span-2">
                <Textarea
                  placeholder="Tell travelers about your experience operating travel groups..."
                  {...form.register("bio")}
                />
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-4 sm:grid-cols-2 animate-rise-in">
              <Field label="Agency name" error={form.formState.errors.agencyName?.message}>
                <Input placeholder="TrailRoot Travels" {...form.register("agencyName")} />
              </Field>
              <Field label="Agency city" error={form.formState.errors.agencyCity?.message}>
                <Input placeholder="Delhi" {...form.register("agencyCity")} />
              </Field>
              <Field label="Agency state" error={form.formState.errors.agencyState?.message}>
                <Input placeholder="Delhi" {...form.register("agencyState")} />
              </Field>
              <Field label="Registered address" error={form.formState.errors.agencyAddress?.message}>
                <Input placeholder="Office or registered address" {...form.register("agencyAddress")} />
              </Field>
              <Field label="Agency description" error={form.formState.errors.agencyDescription?.message} className="sm:col-span-2">
                <Textarea
                  placeholder="What destinations, formats, and service style define your agency?"
                  {...form.register("agencyDescription")}
                />
              </Field>
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-4 sm:grid-cols-2 animate-rise-in">
              <Field label="Agency phone" error={form.formState.errors.agencyPhone?.message}>
                <Input placeholder="9876543210" {...form.register("agencyPhone")} />
              </Field>
              <Field label="Agency email" error={form.formState.errors.agencyEmail?.message}>
                <Input type="email" placeholder="ops@example.com" {...form.register("agencyEmail")} />
              </Field>
              <Field label="Specializations" error={form.formState.errors.specializationsInput?.message} className="sm:col-span-2">
                <Input placeholder="Adventure, Trekking, Weekend getaways" {...form.register("specializationsInput")} />
              </Field>
              <Field label="Destinations" error={form.formState.errors.destinationsInput?.message} className="sm:col-span-2">
                <Input placeholder="Bir, Manali, Spiti" {...form.register("destinationsInput")} />
              </Field>
              <Field label="GSTIN" error={form.formState.errors.gstin?.message}>
                <Input placeholder="Required GSTIN" {...form.register("gstin")} />
              </Field>
              <Field label="PAN" error={form.formState.errors.pan?.message}>
                <Input placeholder="Optional for now" {...form.register("pan")} />
              </Field>
              <Field label="Tourism license" error={form.formState.errors.tourismLicense?.message} className="sm:col-span-2">
                <Input placeholder="Optional for now" {...form.register("tourismLicense")} />
              </Field>
            </div>
          )}

          {/* Feedback */}
          {feedback && (
            <div className="rounded-[var(--radius-md)] bg-[var(--color-sunset-50)] p-3 text-sm text-[var(--color-sunset-700)] shadow-[var(--shadow-clay-inset)]">
              {feedback}
            </div>
          )}

          {/* Nav */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-3">
              {step > 0 && (
                <Button type="button" variant="secondary" onClick={() => setStep((c) => c - 1)}>
                  <ArrowLeft className="size-4" />
                  Back
                </Button>
              )}
              <Link
                href={`/login?next=${encodeURIComponent(nextPath)}`}
                className="text-sm text-[var(--color-ink-600)] hover:text-[var(--color-sea-700)] transition"
              >
                Already have an account?
              </Link>
            </div>
            {isLastStep ? (
              <Button type="submit" disabled={isPending}>
                {isPending ? "Creating agency..." : "Create agency account"}
                <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button type="button" onClick={() => void goNext()}>
                Continue
                <ArrowRight className="size-4" />
              </Button>
            )}
          </div>
        </form>
      </div>
    </Card>
  );
}

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">{label}</label>
      {children}
      {error && (
        <p className="mt-2 text-xs text-[var(--color-sunset-600)]">{error}</p>
      )}
    </div>
  );
}
