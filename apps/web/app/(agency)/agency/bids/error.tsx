"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AgencyBidsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Agency bid manager crashed", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl space-y-4 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-8 text-center shadow-[var(--shadow-md)]">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[var(--color-sunset-50)] text-[var(--color-sunset-700)]">
        <AlertTriangle className="size-6" />
      </div>
      <h2 className="font-display text-2xl text-[var(--color-ink-950)]">Bid manager could not load</h2>
      <p className="text-sm text-[var(--color-ink-600)]">
        We hit an unexpected issue while opening agency bids. Use reload, or continue from inbox.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button type="button" onClick={reset}>
          <RefreshCcw className="size-4" />
          Try again
        </Button>
        <Link href="/agency/inbox">
          <Button type="button" variant="secondary">Open inbox</Button>
        </Link>
      </div>
    </div>
  );
}
