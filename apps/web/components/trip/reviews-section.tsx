"use client";

import { useState } from "react";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ReviewItem {
  id: string;
  overallRating: number;
  safetyRating?: number;
  valueRating?: number;
  comment?: string | null;
  createdAt: string;
  reviewer: {
    id: string;
    fullName: string;
    avatarUrl?: string | null;
  };
}

interface ReviewsSectionProps {
  reviews: ReviewItem[];
  avgRating?: number;
  totalReviews?: number;
}

function StarDisplay({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          className={cn(
            "size-3.5",
            i < rating
              ? "fill-current text-[var(--color-sunset-400)]"
              : "text-[var(--color-ink-300)]",
          )}
        />
      ))}
    </div>
  );
}

export function ReviewsSection({
  reviews,
  avgRating = 0,
  totalReviews = 0,
}: ReviewsSectionProps) {
  const [page, setPage] = useState(0);
  const perPage = 3;
  const totalPages = Math.ceil(reviews.length / perPage);
  const visible = reviews.slice(page * perPage, (page + 1) * perPage);

  if (reviews.length === 0) return null;

  return (
    <div className="space-y-5">
      {/* Header with aggregate rating */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-xl text-[var(--color-ink-950)]">
            Traveler voices
          </h3>
          <div className="mt-1 flex items-center gap-2">
            <StarDisplay rating={Math.round(avgRating)} />
            <span className="text-sm font-semibold text-[var(--color-ink-700)]">
              {avgRating.toFixed(1)}
            </span>
            <span className="text-xs text-[var(--color-ink-500)]">
              ({totalReviews} review{totalReviews !== 1 ? "s" : ""})
            </span>
          </div>
        </div>

        {/* Pagination arrows */}
        {totalPages > 1 && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="flex size-9 items-center justify-center rounded-full bg-[var(--color-surface-raised)] shadow-[var(--shadow-clay-sm)] transition hover:shadow-[var(--shadow-clay)] disabled:opacity-40"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="flex size-9 items-center justify-center rounded-full bg-[var(--color-surface-raised)] shadow-[var(--shadow-clay-sm)] transition hover:shadow-[var(--shadow-clay)] disabled:opacity-40"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        )}
      </div>

      {/* Review cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        {visible.map((review) => (
          <div
            key={review.id}
            className="relative rounded-[var(--radius-md)] border border-white/70 bg-[var(--color-surface-raised)] p-4 shadow-[var(--shadow-clay-sm)] transition hover:shadow-[var(--shadow-clay)]"
          >
            <Quote className="absolute top-3 right-3 size-5 text-[var(--color-sea-100)]" />
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-b from-[var(--color-sea-50)] to-[var(--color-sea-100)] text-xs font-bold text-[var(--color-sea-700)] shadow-[var(--shadow-clay-sm)]">
                {review.reviewer.avatarUrl ? (
                  <img
                    src={review.reviewer.avatarUrl}
                    alt={review.reviewer.fullName}
                    className="size-full rounded-full object-cover"
                  />
                ) : (
                  initials(review.reviewer.fullName)
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--color-ink-900)]">
                  {review.reviewer.fullName}
                </p>
                <StarDisplay rating={review.overallRating} />
              </div>
            </div>

            {review.comment && (
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-600)] line-clamp-4">
                {review.comment}
              </p>
            )}

            {/* Sub-ratings */}
            {(review.safetyRating || review.valueRating) && (
              <div className="mt-3 flex gap-3 border-t border-[var(--color-line)] pt-2">
                {review.safetyRating && (
                  <div className="text-[10px] text-[var(--color-ink-500)]">
                    Safety: <span className="font-bold text-[var(--color-ink-700)]">{review.safetyRating}/5</span>
                  </div>
                )}
                {review.valueRating && (
                  <div className="text-[10px] text-[var(--color-ink-500)]">
                    Value: <span className="font-bold text-[var(--color-ink-700)]">{review.valueRating}/5</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
