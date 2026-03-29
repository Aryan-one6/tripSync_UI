"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Star, MessageCircle, CheckCircle2, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardInset } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth/auth-context";
import { formatCompactDate, initials } from "@/lib/format";
import type { ReviewEligibility, ReviewRecord, UserSummary } from "@/lib/api/types";

type ReviewDraft = {
  overallRating: number;
  safetyRating: number;
  valueRating: number;
  comment: string;
};

function createDraft(): ReviewDraft {
  return { overallRating: 5, safetyRating: 5, valueRating: 5, comment: "" };
}

function StarRating({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-[var(--color-ink-700)]">{label}</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="rounded-[var(--radius-sm)] p-1 transition-all hover:scale-110 active:scale-95"
          >
            <Star
              className={`size-6 transition-colors ${
                star <= value
                  ? "fill-[var(--color-sunset-400)] text-[var(--color-sunset-500)]"
                  : "text-[var(--color-ink-300)]"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function ReviewComposer({
  title,
  subtitle,
  onSubmit,
  draft,
  setDraft,
  pending,
}: {
  title: string;
  subtitle?: string;
  onSubmit: () => void;
  draft: ReviewDraft;
  setDraft: (next: ReviewDraft) => void;
  pending: boolean;
}) {
  return (
    <Card className="relative overflow-hidden p-5 sm:p-6">
      <div className="relative space-y-4">
        <div>
          <h3 className="font-display text-lg text-[var(--color-ink-950)]">{title}</h3>
          {subtitle && <p className="mt-1 text-sm text-[var(--color-ink-600)]">{subtitle}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <StarRating
            label="Overall"
            value={draft.overallRating}
            onChange={(value) => setDraft({ ...draft, overallRating: value })}
          />
          <StarRating
            label="Safety"
            value={draft.safetyRating}
            onChange={(value) => setDraft({ ...draft, safetyRating: value })}
          />
          <StarRating
            label="Value"
            value={draft.valueRating}
            onChange={(value) => setDraft({ ...draft, valueRating: value })}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">Comment</label>
          <Textarea
            value={draft.comment}
            onChange={(event) => setDraft({ ...draft, comment: event.target.value })}
            placeholder="Share specifics that help the next traveler make a better decision."
            rows={3}
          />
        </div>

        <Button onClick={onSubmit} disabled={pending}>
          {pending ? "Saving..." : "Submit review"}
        </Button>
      </div>
    </Card>
  );
}

function ReviewCard({ review }: { review: ReviewRecord }) {
  return (
    <div className="flex gap-3 rounded-[var(--radius-md)] bg-[var(--color-surface-2)] px-4 py-3.5 shadow-[var(--shadow-clay-inset)]">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[var(--color-sea-50)] to-[var(--color-sea-100)] text-xs font-bold text-[var(--color-sea-700)]">
        {initials(review.reviewer.fullName)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-[var(--color-ink-900)]">
            {review.reviewer.fullName}
            <span className="mx-1.5 text-[var(--color-ink-400)]">→</span>
            <span className="text-[var(--color-ink-700)]">
              {review.targetAgency?.name ?? review.targetUser?.fullName ?? review.reviewType}
            </span>
          </p>
          <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-500)]">
            {formatCompactDate(review.createdAt)}
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-2">
          <Badge variant="sea">Overall {review.overallRating}/5</Badge>
          <Badge variant="lavender">Safety {review.safetyRating}/5</Badge>
          <Badge variant="sunset">Value {review.valueRating}/5</Badge>
        </div>
        {review.comment && (
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-600)]">{review.comment}</p>
        )}
      </div>
    </div>
  );
}

export function GroupReviewPanel({ groupId }: { groupId: string }) {
  const { apiFetchWithAuth } = useAuth();
  const [eligibility, setEligibility] = useState<ReviewEligibility | null>(null);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [agencyDraft, setAgencyDraft] = useState<ReviewDraft>(createDraft);
  const [travelerDrafts, setTravelerDrafts] = useState<Record<string, ReviewDraft>>({});

  const load = useCallback(async () => {
    const [eligibilityData, reviewData] = await Promise.all([
      apiFetchWithAuth<ReviewEligibility>(`/reviews/groups/${groupId}/eligibility`),
      apiFetchWithAuth<ReviewRecord[]>(`/reviews/groups/${groupId}`),
    ]);
    setEligibility(eligibilityData);
    setReviews(reviewData);
  }, [apiFetchWithAuth, groupId]);

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        await load();
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Reviews are not available yet.");
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  const agencyReviewExists = useMemo(
    () => eligibility?.existingReviews.some((review) => review.reviewType === "agency") ?? false,
    [eligibility],
  );

  function submitAgencyReview() {
    if (!eligibility?.agency) return;
    setPendingKey("agency");
    startTransition(async () => {
      try {
        await apiFetchWithAuth("/reviews", {
          method: "POST",
          body: JSON.stringify({
            groupId,
            reviewType: "agency",
            targetAgencyId: eligibility.agency?.id,
            ...agencyDraft,
            comment: agencyDraft.comment || undefined,
          }),
        });
        setAgencyDraft(createDraft());
        await load();
        setFeedback("Agency review submitted.");
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Unable to submit the review.");
      } finally {
        setPendingKey(null);
      }
    });
  }

  function draftForTraveler(user: UserSummary) {
    return travelerDrafts[user.id] ?? createDraft();
  }

  function setTravelerDraft(userId: string, next: ReviewDraft) {
    setTravelerDrafts((current) => ({ ...current, [userId]: next }));
  }

  function submitTravelerReview(user: UserSummary) {
    setPendingKey(user.id);
    startTransition(async () => {
      try {
        const draft = draftForTraveler(user);
        await apiFetchWithAuth("/reviews", {
          method: "POST",
          body: JSON.stringify({
            groupId,
            reviewType: "co_traveler",
            targetUserId: user.id,
            ...draft,
            comment: draft.comment || undefined,
          }),
        });
        setTravelerDraft(user.id, createDraft());
        await load();
        setFeedback(`Review submitted for ${user.fullName}.`);
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Unable to submit the review.");
      } finally {
        setPendingKey(null);
      }
    });
  }

  if (loading) {
    return (
      <Card className="flex items-center justify-center p-12 text-[var(--color-ink-500)]">
        <div className="animate-pulse-soft text-center">
          <div className="mx-auto mb-3 size-10 rounded-full bg-[var(--color-sunset-100)] shadow-[var(--shadow-clay-sm)]" />
          <p className="text-sm">Loading reviews...</p>
        </div>
      </Card>
    );
  }

  if (!eligibility) {
    return (
      <Card className="relative overflow-hidden p-8 text-center">
        <div className="relative">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-gradient-to-b from-[var(--color-lavender-50)] to-[var(--color-lavender-100)] shadow-[var(--shadow-clay-sm)]">
            <Award className="size-5 text-[var(--color-lavender-700)]" />
          </div>
          <p className="text-sm text-[var(--color-ink-600)]">
            Reviews unlock after the trip ends and become available to active travelers.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Feedback */}
      {feedback && (
        <div className="rounded-[var(--radius-md)] bg-[var(--color-sunset-50)] p-3 text-sm text-[var(--color-sunset-700)] shadow-[var(--shadow-clay-inset)]">
          {feedback}
        </div>
      )}

      {/* Agency review */}
      {eligibility.agency && (
        agencyReviewExists ? (
          <CardInset className="flex items-center gap-3 p-4">
            <CheckCircle2 className="size-4 shrink-0 text-[var(--color-sea-600)]" />
            <span className="text-sm text-[var(--color-ink-600)]">
              Your agency review is already recorded for this trip.
            </span>
          </CardInset>
        ) : (
          <ReviewComposer
            title={`Review ${eligibility.agency.name}`}
            subtitle="Rate the agency that organized this trip"
            draft={agencyDraft}
            setDraft={setAgencyDraft}
            pending={isPending && pendingKey === "agency"}
            onSubmit={submitAgencyReview}
          />
        )
      )}

      {/* Co-traveler reviews */}
      {eligibility.coTravelers.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-[var(--color-lavender-50)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-lavender-700)] shadow-[var(--shadow-clay-sm)]">
              Co-traveler reviews
            </span>
          </div>

          <div className="grid gap-4">
            {eligibility.coTravelers.map((traveler) => {
              const existing = eligibility.existingReviews.find(
                (review) => review.reviewType === "co_traveler" && review.targetUserId === traveler.id,
              );

              if (existing) {
                return (
                  <CardInset key={traveler.id} className="flex items-center gap-3 p-4">
                    <CheckCircle2 className="size-4 shrink-0 text-[var(--color-sea-600)]" />
                    <span className="text-sm text-[var(--color-ink-600)]">
                      You already reviewed {traveler.fullName}.
                    </span>
                  </CardInset>
                );
              }

              return (
                <ReviewComposer
                  key={traveler.id}
                  title={`Review ${traveler.fullName}`}
                  draft={draftForTraveler(traveler)}
                  setDraft={(next) => setTravelerDraft(traveler.id, next)}
                  pending={isPending && pendingKey === traveler.id}
                  onSubmit={() => submitTravelerReview(traveler)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Submitted reviews log */}
      {reviews.length > 0 && (
        <Card className="relative overflow-hidden p-5 sm:p-6">
          <div className="relative space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-[var(--radius-sm)] bg-gradient-to-b from-[var(--color-sea-50)] to-[var(--color-sea-100)] text-[var(--color-sea-700)] shadow-[var(--shadow-clay-sm)]">
                <MessageCircle className="size-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
                  Submitted reviews
                </p>
                <p className="font-display text-lg text-[var(--color-ink-950)]">Trip feedback log</p>
              </div>
            </div>

            <div className="space-y-3">
              {reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
