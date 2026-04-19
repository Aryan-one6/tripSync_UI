"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, UserRoundPlus, Building2, Shield } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoginSchema } from "@tripsync/shared";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth/auth-context";

type LoginValues = z.input<typeof LoginSchema>;

function resolveDestination(nextPath: string, role: "user" | "agency_admin" | "platform_admin") {
  const defaultPath = role === "agency_admin" ? "/agency/dashboard" : "/discover?audience=traveler";
  if (!nextPath.startsWith("/")) return defaultPath;
  if (role === "agency_admin") return nextPath.startsWith("/agency") ? nextPath : defaultPath;
  return nextPath.startsWith("/agency") ? defaultPath : nextPath;
}

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
  const [showPw, setShowPw] = useState(false);
  const [isSuccess, setIsSuccess] = useState(Boolean(successMessage));

  const form = useForm<LoginValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { identifier: defaultIdentifier, password: "" },
  });

  const travelerSignupHref = `/signup/traveler?next=${encodeURIComponent(nextPath)}`;
  const agencySignupHref = `/signup/agency?next=${encodeURIComponent(nextPath)}`;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-5 text-center">
        <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100 shadow-sm">
          <Shield className="size-4 text-emerald-600" />
        </div>
        <h1 className="font-display text-xl font-black text-[var(--color-ink-950)] sm:text-2xl">Welcome back</h1>
        <p className="mt-1 text-xs text-[var(--color-ink-500)]">
          Sign in to continue planning your adventures.
        </p>
      </div>

      {/* Success / info banner */}
      {isSuccess && feedback && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-800">
          <svg className="mt-0.5 size-4 shrink-0 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          {feedback}
        </div>
      )}

      {/* Form */}
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit((values) =>
          startTransition(async () => {
            try {
              const identifier = values.identifier ?? values.email ?? "";
              const session = await login(identifier, values.password);
              router.replace(resolveDestination(nextPath, session.role));
            } catch (error) {
              setIsSuccess(false);
              setFeedback(error instanceof Error ? error.message : "Login failed. Please try again.");
            }
          }),
        )}
      >
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-[var(--color-ink-700)]">
            Email or username
          </label>
          <Input
            type="text"
            placeholder="you@example.com or naresh_travel"
            autoComplete="username"
            {...form.register("identifier")}
            className="h-11"
          />
          {form.formState.errors.identifier && (
            <p className="mt-1.5 text-xs text-red-500">{form.formState.errors.identifier.message}</p>
          )}
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-sm font-semibold text-[var(--color-ink-700)]">Password</label>
            <button type="button" className="text-xs font-medium text-emerald-600 hover:text-emerald-500 transition">
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Input
              type={showPw ? "text" : "password"}
              placeholder="Enter your password"
              autoComplete="current-password"
              {...form.register("password")}
              className="h-11 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-400)] hover:text-[var(--color-ink-700)] transition"
            >
              {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {form.formState.errors.password && (
            <p className="mt-1.5 text-xs text-red-500">{form.formState.errors.password.message}</p>
          )}
        </div>

        {/* Error banner */}
        {!isSuccess && feedback && (
          <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
            {feedback}
          </div>
        )}

        <Button type="submit" className="w-full h-11 text-sm font-bold" disabled={isPending}>
          {isPending ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin size-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              Signing in…
            </span>
          ) : (
            <span className="flex items-center gap-2">Sign In <ArrowRight className="size-4" /></span>
          )}
        </Button>
      </form>

      {/* Divider */}
      <div className="my-6 flex items-center gap-3">
        <div className="flex-1 h-px bg-[var(--color-border)]" />
        <span className="text-xs font-medium text-[var(--color-ink-400)]">New to TravellersIn?</span>
        <div className="flex-1 h-px bg-[var(--color-border)]" />
      </div>

      {/* Signup options */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Link href={travelerSignupHref}
          className="group flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3.5 transition hover:border-emerald-200 hover:bg-emerald-50"
        >
          <div className="flex size-9 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition">
            <UserRoundPlus className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[var(--color-ink-950)]">I&apos;m a Traveler</p>
            <p className="text-[10px] text-[var(--color-ink-500)] truncate">Browse & join group trips</p>
          </div>
          <ArrowRight className="ml-auto size-3.5 text-[var(--color-ink-300)] group-hover:text-emerald-500 transition" />
        </Link>

        <Link href={agencySignupHref}
          className="group flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3.5 transition hover:border-gray-300 hover:bg-gray-50"
        >
          <div className="flex size-9 items-center justify-center rounded-lg border border-[var(--color-border)] bg-white text-[var(--color-ink-600)] group-hover:bg-gray-100 transition">
            <Building2 className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[var(--color-ink-950)]">I&apos;m an Agency</p>
            <p className="text-[10px] text-[var(--color-ink-500)] truncate">List packages & bid on trips</p>
          </div>
          <ArrowRight className="ml-auto size-3.5 text-[var(--color-ink-300)] group-hover:text-gray-500 transition" />
        </Link>
      </div>
    </div>
  );
}
