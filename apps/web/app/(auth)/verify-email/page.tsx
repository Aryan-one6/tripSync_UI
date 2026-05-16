"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, Loader2, MailCheck } from "lucide-react";
import { apiFetch } from "@/lib/api/client";

type VerifyState = "loading" | "success" | "error";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [state, setState] = useState<VerifyState>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage("No verification token found. Please check the link in your email.");
      return;
    }

    apiFetch<{ message: string }>(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then((data) => {
        setMessage(data.message ?? "Email verified successfully!");
        setState("success");
        // Auto-redirect to login after 3 seconds
        setTimeout(() => router.replace("/login?verified=1"), 3000);
      })
      .catch((err: unknown) => {
        setMessage(
          err instanceof Error ? err.message : "Verification failed. The link may be invalid or expired.",
        );
        setState("error");
      });
  }, [token, router]);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white border border-gray-100 shadow-lg p-8 text-center">
        {/* Brand */}
        <Link href="/" className="inline-block font-display text-xl font-black text-gray-950 mb-6">
          TravellersIn
        </Link>

        {state === "loading" && (
          <>
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-emerald-50">
              <Loader2 className="size-8 text-emerald-600 animate-spin" />
            </div>
            <h1 className="text-xl font-black text-gray-950 mb-2">Verifying your email…</h1>
            <p className="text-sm text-gray-500">Please wait a moment.</p>
          </>
        )}

        {state === "success" && (
          <>
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2 className="size-8 text-emerald-600" />
            </div>
            <h1 className="text-xl font-black text-gray-950 mb-2">Email Verified! 🎉</h1>
            <p className="text-sm text-gray-600 mb-6">{message}</p>
            <p className="text-xs text-gray-400 mb-4">Redirecting you to login in a moment…</p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-6 py-2.5 text-sm font-bold text-white transition"
            >
              <MailCheck className="size-4" />
              Sign In Now
            </Link>
          </>
        )}

        {state === "error" && (
          <>
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-red-50">
              <XCircle className="size-8 text-red-500" />
            </div>
            <h1 className="text-xl font-black text-gray-950 mb-2">Verification Failed</h1>
            <p className="text-sm text-gray-600 mb-6">{message}</p>
            <div className="space-y-3">
              <Link
                href="/login"
                className="block w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 px-6 py-2.5 text-sm font-bold text-white transition text-center"
              >
                Back to Sign In
              </Link>
              <p className="text-xs text-gray-400">
                You can request a new verification link from the sign-in page.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
