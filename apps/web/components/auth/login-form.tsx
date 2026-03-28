"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole, UserRoundPlus, Building2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoginSchema } from "@tripsync/shared";
import { Button } from "@/components/ui/button";
import { Card, CardInset } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth/auth-context";
import { inferRequestedRole } from "@/lib/auth/role-intent";

type LoginValues = { identifier: string; password: string };

export function LoginForm({
  nextPath = "/",
  defaultIdentifier = "",
  successMessage,
}: {
  nextPath?: string;
  defaultIdentifier?: string;
  successMessage?: string;
}) {
  const router = useRouter();
  const { login } = useAuth();
  const [feedback, setFeedback] = useState<string | null>(successMessage ?? null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<LoginValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { identifier: defaultIdentifier, password: "" },
  });

  const travelerSignupHref = `/signup/traveler?next=${encodeURIComponent(nextPath)}`;
  const agencySignupHref = `/signup/agency?next=${encodeURIComponent(nextPath)}`;

  return (
    <Card className="relative mx-auto w-full max-w-lg overflow-hidden p-6 sm:p-8">
      {/* Decorative blobs */}
      <div className="clay-blob -top-12 -right-12 size-36 bg-[var(--color-sea-200)] opacity-15 animate-blob" />
      <div className="clay-blob -bottom-10 -left-10 size-28 bg-[var(--color-lavender-200)] opacity-12 animate-blob delay-300" />

      <div className="relative">
        {/* Header */}
        <div className="mb-7">
          <div className="mb-4 flex size-14 items-center justify-center rounded-[var(--radius-lg)] bg-gradient-to-b from-[var(--color-sea-50)] to-[var(--color-sea-100)] text-[var(--color-sea-700)] shadow-[var(--shadow-clay)]">
            <LockKeyhole className="size-6" />
          </div>
          <h1 className="font-display text-2xl text-[var(--color-ink-950)] sm:text-3xl">Welcome back</h1>
          <p className="mt-2 text-sm text-[var(--color-ink-600)] leading-relaxed">
            Log in with your username or email. Agency owners and travelers share one account.
          </p>
        </div>

        {/* Form */}
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) =>
            startTransition(async () => {
              try {
                await login(values.identifier, values.password, inferRequestedRole(nextPath));
                router.replace(nextPath);
              } catch (error) {
                setFeedback(error instanceof Error ? error.message : "Login failed.");
              }
            }),
          )}
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">
              Username or email
            </label>
            <Input placeholder="naresh_travel or you@example.com" {...form.register("identifier")} />
            {form.formState.errors.identifier && (
              <p className="mt-2 text-xs text-[var(--color-sunset-600)]">
                {form.formState.errors.identifier.message}
              </p>
            )}
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">Password</label>
            <Input type="password" placeholder="Enter your password" {...form.register("password")} />
            {form.formState.errors.password && (
              <p className="mt-2 text-xs text-[var(--color-sunset-600)]">
                {form.formState.errors.password.message}
              </p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Logging in..." : "Login"}
            <ArrowRight className="size-4" />
          </Button>
        </form>

        {/* Feedback */}
        {feedback && (
          <div className="mt-4 rounded-[var(--radius-md)] bg-[var(--color-sunset-50)] p-3 text-sm text-[var(--color-sunset-700)] shadow-[var(--shadow-clay-inset)]">
            {feedback}
          </div>
        )}

        {/* Signup options */}
        <div className="mt-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
            New here?
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href={travelerSignupHref}>
              <CardInset className="group h-full space-y-2 transition-all hover:shadow-[var(--shadow-clay)] hover:-translate-y-0.5">
                <div className="flex size-10 items-center justify-center rounded-[var(--radius-sm)] bg-gradient-to-b from-[var(--color-sea-50)] to-[var(--color-sea-100)] text-[var(--color-sea-700)] shadow-[var(--shadow-clay-sm)]">
                  <UserRoundPlus className="size-5" />
                </div>
                <h2 className="font-display text-lg text-[var(--color-ink-950)]">Traveler</h2>
                <p className="text-xs text-[var(--color-ink-600)] leading-relaxed">
                  Create plans, join groups, and explore trips.
                </p>
              </CardInset>
            </Link>
            <Link href={agencySignupHref}>
              <CardInset className="group h-full space-y-2 transition-all hover:shadow-[var(--shadow-clay)] hover:-translate-y-0.5">
                <div className="flex size-10 items-center justify-center rounded-[var(--radius-sm)] bg-gradient-to-b from-[var(--color-sand-100)] to-[var(--color-sand-200)] text-[var(--color-ink-700)] shadow-[var(--shadow-clay-sm)]">
                  <Building2 className="size-5" />
                </div>
                <h2 className="font-display text-lg text-[var(--color-ink-950)]">Agency</h2>
                <p className="text-xs text-[var(--color-ink-600)] leading-relaxed">
                  Set up your operator profile and start bidding.
                </p>
              </CardInset>
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}
