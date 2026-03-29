"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { TravelerSignupSchema } from "@tripsync/shared";
import { ArrowLeft, ArrowRight, UserRoundPlus, User, Heart, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardInset } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Stepper } from "@/components/ui/stepper";
import { Select } from "@/components/ui/select";
import { useAuth } from "@/lib/auth/auth-context";

const travelerFormSchema = TravelerSignupSchema.extend({
  confirmPassword: z.string().min(8, "Confirm your password"),
}).refine((value) => value.password === value.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type TravelerFormValues = z.infer<typeof travelerFormSchema>;

const steps = [
  {
    key: "account",
    title: "Account",
    description: "Login credentials",
    fields: ["fullName", "username", "email", "phone"] as Array<keyof TravelerFormValues>,
    icon: <User className="size-5" />,
  },
  {
    key: "profile",
    title: "Profile",
    description: "Traveler details",
    fields: ["gender", "dateOfBirth", "city", "travelPreferences", "bio"] as Array<keyof TravelerFormValues>,
    icon: <Heart className="size-5" />,
  },
  {
    key: "password",
    title: "Password",
    description: "Secure your account",
    fields: ["password", "confirmPassword"] as Array<keyof TravelerFormValues>,
    icon: <LockKeyhole className="size-5" />,
  },
];

export function TravelerSignupForm({ nextPath = "/dashboard/feed" }: { nextPath?: string }) {
  const router = useRouter();
  const { signupTraveler } = useAuth();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [isPending, startTransition] = useTransition();
  const form = useForm<TravelerFormValues>({
    resolver: zodResolver(travelerFormSchema),
    defaultValues: {
      fullName: "", username: "", email: "", phone: "",
      dateOfBirth: "", gender: "male", city: "", travelPreferences: "", bio: "",
      password: "", confirmPassword: "",
    },
  });

  const currentStep = steps[step];
  const isLastStep = step === steps.length - 1;
  const loginNextPath = nextPath.startsWith("/agency") ? "/dashboard/feed" : nextPath;

  async function goNext() {
    const valid = await form.trigger(currentStep.fields);
    if (valid) setStep((c) => c + 1);
  }

  return (
    <Card className="relative mx-auto w-full max-w-2xl overflow-hidden p-6 sm:p-8">
      {/* Decorative blobs */}
      <div className="clay-blob -top-14 -right-14 size-40 bg-[var(--color-sea-200)] opacity-15 animate-blob" />
      <div className="clay-blob -bottom-10 -left-10 size-28 bg-[var(--color-sunset-200)] opacity-10 animate-blob delay-300" />

      <div className="relative">
        {/* Header */}
        <div className="mb-6">
          <div className="mb-4 flex size-14 items-center justify-center rounded-[var(--radius-lg)] bg-gradient-to-b from-[var(--color-sea-50)] to-[var(--color-sea-100)] text-[var(--color-sea-700)] shadow-[var(--shadow-clay)]">
            <UserRoundPlus className="size-6" />
          </div>
          <h1 className="font-display text-2xl text-[var(--color-ink-950)] sm:text-3xl">Create your account</h1>
          <p className="mt-2 text-sm text-[var(--color-ink-600)] leading-relaxed">
            Build your traveler profile to start planning trips and joining groups.
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
                await signupTraveler({
                  fullName: values.fullName, username: values.username,
                  email: values.email, phone: values.phone, password: values.password,
                  dateOfBirth: values.dateOfBirth, gender: values.gender,
                  city: values.city, travelPreferences: values.travelPreferences,
                  bio: values.bio || undefined,
                });
                router.replace(
                  `/login?signup=traveler&email=${encodeURIComponent(values.email)}&next=${encodeURIComponent(loginNextPath)}`,
                );
              } catch (error) {
                setFeedback(error instanceof Error ? error.message : "Unable to create your account.");
              }
            }),
          )}
        >
          {step === 0 && (
            <div className="grid gap-4 sm:grid-cols-2 animate-rise-in">
              <Field label="Full name" error={form.formState.errors.fullName?.message}>
                <Input placeholder="Naresh Sharma" {...form.register("fullName")} />
              </Field>
              <Field label="Username" error={form.formState.errors.username?.message}>
                <Input placeholder="naresh_travel" {...form.register("username")} />
              </Field>
              <Field label="Email" error={form.formState.errors.email?.message}>
                <Input type="email" placeholder="you@example.com" {...form.register("email")} />
              </Field>
              <Field label="Phone" error={form.formState.errors.phone?.message}>
                <Input placeholder="9876543210" {...form.register("phone")} />
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
                  placeholder="Weekend treks, mixed groups, early starts, budget hostels, flexible plans..."
                  {...form.register("travelPreferences")}
                />
              </Field>
              <Field label="Short bio" error={form.formState.errors.bio?.message} className="sm:col-span-2">
                <Textarea
                  placeholder="What kind of trips do you like? What should co-travelers know about you?"
                  {...form.register("bio")}
                />
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-4 sm:grid-cols-2 animate-rise-in">
              <Field label="Password" error={form.formState.errors.password?.message}>
                <Input type="password" placeholder="At least 8 characters" {...form.register("password")} />
              </Field>
              <Field label="Confirm password" error={form.formState.errors.confirmPassword?.message}>
                <Input type="password" placeholder="Repeat the password" {...form.register("confirmPassword")} />
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
                {isPending ? "Creating..." : "Create account"}
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
