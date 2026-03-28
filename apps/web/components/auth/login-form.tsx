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
    <Card className="mx-auto w-full max-w-lg p-6 sm:p-8">
      {/* Header */}
      <div className="mb-7">
        <div className="mb-4 flex size-11 items-center justify-center rounded-lg border border-(--color-sea-100) bg-(--color-sea-50) text-(--color-sea-600)">
          <LockKeyhole className="size-5" />
        </div>
        <h1 className="font-display text-2xl text-(--color-ink-950) sm:text-3xl">Welcome back</h1>
        <p className="mt-1.5 text-sm text-(--color-ink-600) leading-relaxed">
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
          <label className="mb-1.5 block text-sm font-medium text-(--color-ink-700)">
            Username or email
          </label>
          <Input placeholder="naresh_travel or you@example.com" {...form.register("identifier")} />
          {form.formState.errors.identifier && (
            <p className="mt-1.5 text-xs text-(--color-sunset-600)">
              {form.formState.errors.identifier.message}
            </p>
          )}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-(--color-ink-700)">Password</label>
          <Input type="password" placeholder="Enter your password" {...form.register("password")} />
          {form.formState.errors.password && (
            <p className="mt-1.5 text-xs text-(--color-sunset-600)">
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
        <div className="mt-4 rounded-md border border-(--color-sunset-100) bg-(--color-sunset-50) p-3 text-sm text-(--color-sunset-700)">
          {feedback}
        </div>
      )}

      {/* Signup options */}
      <div className="mt-8">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-(--color-ink-400)">
          New here?
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href={travelerSignupHref}>
            <CardInset className="group h-full space-y-2 transition-colors hover:bg-(--color-surface-3)">
              <div className="flex size-9 items-center justify-center rounded-md border border-(--color-sea-100) bg-(--color-sea-50) text-(--color-sea-600)">
                <UserRoundPlus className="size-4" />
              </div>
              <h2 className="font-display text-base text-(--color-ink-950)">Traveler</h2>
              <p className="text-xs text-(--color-ink-600) leading-relaxed">
                Create plans, join groups, and explore trips.
              </p>
            </CardInset>
          </Link>
          <Link href={agencySignupHref}>
            <CardInset className="group h-full space-y-2 transition-colors hover:bg-(--color-surface-3)">
              <div className="flex size-9 items-center justify-center rounded-md border border-(--color-border) bg-(--color-surface-2) text-(--color-ink-700)">
                <Building2 className="size-4" />
              </div>
              <h2 className="font-display text-base text-(--color-ink-950)">Agency</h2>
              <p className="text-xs text-(--color-ink-600) leading-relaxed">
                Set up your operator profile and start bidding.
              </p>
            </CardInset>
          </Link>
        </div>
      </div>
    </Card>
  );
}
