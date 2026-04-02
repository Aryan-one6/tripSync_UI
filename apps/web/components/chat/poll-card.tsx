"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PollOption {
  id: string;
  label: string;
  votes: string[]; // array of user IDs who voted
}

export interface PollCardProps {
  question: string;
  options: PollOption[];
  currentUserId?: string;
  /** Mine = rendered on the right in a dark bubble */
  isMine?: boolean;
  onVote?: (optionId: string) => void;
  disabled?: boolean;
}

// ─── Animated progress bar ────────────────────────────────────────────────────

function AnimatedBar({
  pct,
  isMine,
  voted,
}: {
  pct: number;
  isMine: boolean;
  voted: boolean;
}) {
  const [displayed, setDisplayed] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let start: number | null = null;
    const duration = 600;
    const from = displayed;
    const to = pct;

    function tick(ts: number) {
      if (start === null) start = ts;
      const elapsed = ts - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(from + (to - from) * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // Only re-run when pct actually changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pct]);

  return (
    <div
      className={cn(
        "relative h-2 overflow-hidden rounded-full",
        isMine ? "bg-white/15" : "bg-[var(--color-surface-2)]",
      )}
    >
      <div
        className={cn(
          "absolute inset-y-0 left-0 rounded-full transition-none",
          voted
            ? isMine
              ? "bg-white/80"
              : "bg-gradient-to-r from-[var(--color-sea-400)] to-[var(--color-sea-600)]"
            : isMine
              ? "bg-white/40"
              : "bg-[var(--color-ink-300)]",
        )}
        style={{ width: `${displayed}%` }}
      />
    </div>
  );
}

// ─── PollCard ─────────────────────────────────────────────────────────────────

export function PollCard({
  question,
  options,
  currentUserId = "",
  isMine = false,
  onVote,
  disabled = false,
}: PollCardProps) {
  const totalVotes = options.reduce((sum, o) => sum + o.votes.length, 0);

  return (
    <div
      className={cn(
        "mt-2.5 overflow-hidden rounded-[var(--radius-md)] border",
        isMine
          ? "border-white/20 bg-white/10"
          : "border-[var(--color-border)] bg-[var(--color-surface-2)]",
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-center gap-2 border-b px-4 py-2.5",
          isMine
            ? "border-white/15 text-white/80"
            : "border-[var(--color-border)] text-[var(--color-ink-500)]",
        )}
      >
        <BarChart3 className="size-3.5 shrink-0" />
        <span className="text-[10px] font-bold uppercase tracking-[0.16em]">Poll</span>
        <span
          className={cn(
            "ml-auto text-[10px] tabular-nums",
            isMine ? "text-white/60" : "text-[var(--color-ink-400)]",
          )}
        >
          {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
        </span>
      </div>

      <div className="space-y-1 p-3">
        {/* Question */}
        <p
          className={cn(
            "mb-3 text-sm font-semibold leading-snug",
            isMine ? "text-white" : "text-[var(--color-ink-900)]",
          )}
        >
          {question}
        </p>

        {/* Options */}
        {options.map((option) => {
          const voteCount = option.votes.length;
          const pct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
          const didVote = option.votes.includes(currentUserId);
          const isWinning =
            totalVotes > 0 &&
            voteCount === Math.max(...options.map((o) => o.votes.length)) &&
            voteCount > 0;

          return (
            <button
              key={option.id}
              type="button"
              disabled={disabled}
              onClick={() => onVote?.(option.id)}
              className={cn(
                "group w-full rounded-[var(--radius-sm)] px-3 py-2.5 text-left transition-all focus:outline-none",
                isMine
                  ? "hover:bg-white/10 focus:bg-white/10 active:bg-white/15"
                  : "hover:bg-[var(--color-sea-50)] focus:bg-[var(--color-sea-50)]",
                didVote && !isMine && "ring-2 ring-[var(--color-sea-400)] ring-offset-1",
                didVote && isMine && "ring-2 ring-white/60 ring-offset-1 ring-offset-transparent",
                disabled && "cursor-default",
              )}
            >
              {/* Label row */}
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  {didVote && (
                    <CheckCircle2
                      className={cn(
                        "size-3.5 shrink-0",
                        isMine ? "text-white" : "text-[var(--color-sea-600)]",
                      )}
                    />
                  )}
                  <span
                    className={cn(
                      "truncate text-sm font-medium",
                      isMine ? "text-white" : "text-[var(--color-ink-800)]",
                      didVote && !isMine && "text-[var(--color-sea-700)]",
                    )}
                  >
                    {option.label}
                  </span>
                  {isWinning && (
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                        isMine
                          ? "bg-white/20 text-white"
                          : "bg-[var(--color-sea-50)] text-[var(--color-sea-700)]",
                      )}
                    >
                      Leading
                    </span>
                  )}
                </div>
                <span
                  className={cn(
                    "shrink-0 text-xs font-semibold tabular-nums",
                    isMine ? "text-white/80" : "text-[var(--color-ink-600)]",
                  )}
                >
                  {pct}%
                </span>
              </div>

              {/* Progress bar */}
              <AnimatedBar pct={pct} isMine={isMine} voted={didVote} />

              {/* Vote count */}
              <p
                className={cn(
                  "mt-1 text-[10px] tabular-nums",
                  isMine ? "text-white/50" : "text-[var(--color-ink-400)]",
                )}
              >
                {voteCount} {voteCount === 1 ? "vote" : "votes"}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
