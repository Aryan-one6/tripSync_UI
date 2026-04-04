"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { CreditCard, ShieldCheck, Sparkles, MessageSquareMore, ArrowRight, Wallet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardInset } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth/auth-context";
import { APP_NAME, RAZORPAY_PUBLIC_KEY } from "@/lib/config";
import { formatCurrency } from "@/lib/format";
import type { GroupPaymentOrder, GroupPaymentState } from "@/lib/api/types";

type RazorpayCheckoutResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  handler: (response: RazorpayCheckoutResponse) => void | Promise<void>;
  theme?: { color?: string };
  prefill?: { contact?: string; name?: string };
};

type RazorpayWindow = Window & {
  Razorpay?: new (options: RazorpayOptions) => { open: () => void };
};

function loadRazorpayScript() {
  return new Promise<boolean>((resolve) => {
    if ((window as RazorpayWindow).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function GroupPaymentCard({ groupId }: { groupId: string }) {
  const { session, apiFetchWithAuth } = useAuth();
  const [state, setState] = useState<GroupPaymentState | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const loadState = useCallback(async () => {
    const data = await apiFetchWithAuth<GroupPaymentState>(`/payments/groups/${groupId}`);
    setState(data);
  }, [apiFetchWithAuth, groupId]);

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        await loadState();
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Unable to load the payment state.");
      } finally {
        setLoading(false);
      }
    })();
  }, [loadState]);

  function openCheckout() {
    startTransition(async () => {
      try {
        const order = await apiFetchWithAuth<GroupPaymentOrder>(`/payments/groups/${groupId}/order`, {
          method: "POST",
        });

        if (order.checkoutMode === "captured") {
          await loadState();
          setFeedback("Your payment is already captured.");
          return;
        }

        if (order.checkoutMode === "mock") {
          await apiFetchWithAuth("/payments/mock-capture", {
            method: "POST",
            body: JSON.stringify({ paymentId: order.payment.id }),
          });
          await loadState();
          setFeedback("Development payment captured.");
          return;
        }

        const loaded = await loadRazorpayScript();
        if (!loaded) throw new Error("Unable to load Razorpay Checkout.js");

        const key = order.razorpayKeyId || RAZORPAY_PUBLIC_KEY;
        if (!key || !order.payment.razorpayOrderId) {
          throw new Error("Razorpay checkout is not configured correctly.");
        }

        const razorpay = new (window as RazorpayWindow).Razorpay!({
          key,
          amount: order.amount,
          currency: order.currency,
          name: APP_NAME,
          description: order.description,
          order_id: order.payment.razorpayOrderId,
          prefill: { contact: session?.user.phone, name: session?.user.fullName },
          theme: { color: "#1f7a67" },
          handler: async (response) => {
            await apiFetchWithAuth("/payments/verify", {
              method: "POST",
              body: JSON.stringify({
                paymentId: order.payment.id,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });
            await loadState();
            setFeedback("Payment captured successfully.");
          },
        });

        razorpay.open();
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Unable to process payment.");
      }
    });
  }

  if (loading) {
    return (
      <Card className="flex items-center justify-center p-12 text-[var(--color-ink-500)]">
        <div className="animate-pulse-soft text-center">
          <div className="mx-auto mb-3 size-10 rounded-full bg-[var(--color-sea-100)] shadow-[var(--shadow-clay-sm)]" />
          <p className="text-sm">Loading payment...</p>
        </div>
      </Card>
    );
  }

  if (!state) {
    return (
      <Card className="relative overflow-hidden p-8 text-center">
        <div className="relative">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-gradient-to-b from-[var(--color-sea-50)] to-[var(--color-sea-100)] shadow-[var(--shadow-clay-sm)]">
            <Wallet className="size-5 text-[var(--color-sea-700)]" />
          </div>
          <p className="text-sm text-[var(--color-ink-600)]">
            Payment state is unavailable for this trip.
          </p>
        </div>
      </Card>
    );
  }

  const captured = state.payment?.status === "CAPTURED";
  const commitProgress = state.travelerCount > 0
    ? Math.round((state.committedCount / state.travelerCount) * 100)
    : 0;
  const tripTitle = state.plan?.title ?? state.package?.title ?? "Trip checkout";
  const sourceLabel = state.paymentSource === "PACKAGE" ? "Agency package" : "Negotiated plan";

  return (
    <div className="grid gap-5 xl:grid-cols-[1.2fr_0.9fr]">
      {/* Main payment card */}
      <Card className="relative overflow-hidden p-5 sm:p-6">

        <div className="relative space-y-5">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="inline-flex items-center rounded-full bg-[var(--color-sea-50)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-sea-700)] shadow-[var(--shadow-clay-sm)]">
                🔒 Secure Checkout
              </span>
              <h2 className="mt-2 font-display text-xl text-[var(--color-ink-950)] sm:text-2xl">
                {tripTitle}
              </h2>
              <p className="mt-1 text-sm text-[var(--color-ink-600)]">
                {sourceLabel} with {state.agencyName}
              </p>
            </div>
            <div className="shrink-0 rounded-[var(--radius-lg)] bg-gradient-to-b from-[var(--color-sea-50)] to-[var(--color-sea-100)] px-5 py-3 text-right shadow-[var(--shadow-clay-sm)]">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-sea-700)]">Per traveler</p>
              <p className="font-display text-2xl text-[var(--color-sea-800)]">
                {formatCurrency(state.amount / 100)}
              </p>
            </div>
          </div>

          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white/70 p-3 text-sm">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-ink-500)]">
              Payment breakdown
            </p>
            <div className="space-y-1 text-[var(--color-ink-700)]">
              <div className="flex items-center justify-between">
                <span>Trip amount</span>
                <span>{formatCurrency(state.breakdown.tripAmount / 100)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Platform fee</span>
                <span>{formatCurrency(state.breakdown.platformFeeAmount / 100)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>GST on fee (18%)</span>
                <span>{formatCurrency(state.breakdown.feeGstAmount / 100)}</span>
              </div>
              <div className="flex items-center justify-between font-semibold text-[var(--color-ink-900)]">
                <span>Total payable</span>
                <span>{formatCurrency(state.breakdown.totalAmount / 100)}</span>
              </div>
            </div>
          </div>

          {/* Status cards */}
          <div className="grid gap-3 sm:grid-cols-3">
            <CardInset className="p-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] bg-gradient-to-b from-[var(--color-sea-50)] to-[var(--color-sea-100)] shadow-[var(--shadow-clay-sm)]">
                  <CreditCard className="size-4 text-[var(--color-sea-700)]" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-500)]">Payment</p>
                  <Badge variant={captured ? "sea" : "default"}>
                    {state.payment?.status ?? "PENDING"}
                  </Badge>
                </div>
              </div>
            </CardInset>
            <CardInset className="p-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] bg-gradient-to-b from-[var(--color-lavender-50)] to-[var(--color-lavender-100)] shadow-[var(--shadow-clay-sm)]">
                  <ShieldCheck className="size-4 text-[var(--color-lavender-700)]" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-500)]">Escrow</p>
                  <Badge variant="lavender">{state.payment?.escrowStatus ?? "HELD"}</Badge>
                </div>
              </div>
            </CardInset>
            <CardInset className="p-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] bg-gradient-to-b from-[var(--color-sunset-50)] to-[var(--color-sunset-100)] shadow-[var(--shadow-clay-sm)]">
                  <Sparkles className="size-4 text-[var(--color-sunset-700)]" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-500)]">Committed</p>
                  <p className="text-sm font-semibold text-[var(--color-ink-800)]">
                    {state.committedCount}/{state.travelerCount}
                  </p>
                </div>
              </div>
            </CardInset>
          </div>

          {/* Commit progress bar */}
          <div>
            <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-wider text-[var(--color-ink-500)]">
              <span>Group commitment</span>
              <span>{commitProgress}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[var(--color-surface-2)] shadow-[var(--shadow-clay-inset)]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--color-sea-400)] to-[var(--color-sea-600)] shadow-[var(--shadow-clay-sm)] transition-all duration-500"
                style={{ width: `${commitProgress}%` }}
              />
            </div>
          </div>

          {/* Feedback */}
          {feedback && (
            <div className="rounded-[var(--radius-md)] bg-[var(--color-sunset-50)] p-3 text-sm text-[var(--color-sunset-700)] shadow-[var(--shadow-clay-inset)]">
              {feedback}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button onClick={openCheckout} disabled={captured || isPending}>
              {captured ? (
                <>
                  <ShieldCheck className="size-4" />
                  Payment captured
                </>
              ) : isPending ? (
                "Processing..."
              ) : (
                <>
                  <CreditCard className="size-4" />
                  Pay now
                </>
              )}
            </Button>
            <Link href={`/dashboard/groups/${groupId}/chat`}>
              <Button variant="secondary">
                <MessageSquareMore className="size-4" />
                Open group chat
              </Button>
            </Link>
            {captured && state?.payment?.id && (
              <a
                href={`/dashboard/groups/${groupId}/checkout?invoice=1`}
                className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--color-ink-700)] shadow-[var(--shadow-sm)] transition hover:bg-[var(--color-surface-2)]"
              >
                <FileText className="size-4 text-[var(--color-sea-600)]" />
                Download invoice
              </a>
            )}
          </div>
        </div>
      </Card>

      {/* Sidebar info */}
      <div className="space-y-5">
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex size-10 items-center justify-center rounded-[var(--radius-sm)] bg-gradient-to-b from-[var(--color-lavender-50)] to-[var(--color-lavender-100)] text-[var(--color-lavender-700)] shadow-[var(--shadow-clay-sm)]">
              <ArrowRight className="size-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
                What happens next
              </p>
              <p className="font-display text-lg text-[var(--color-ink-950)]">Payment flow</p>
            </div>
          </div>
          <div className="space-y-3">
            {[
              "Pay now to confirm your seat in the group.",
              "Once all approved travellers have paid, the trip is confirmed and group coordination unlocks.",
              "Your money is held safely in escrow and released to the agency only as trip milestones complete.",
            ].map((text, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-sea-50)] text-[10px] font-bold text-[var(--color-sea-700)] shadow-[var(--shadow-clay-sm)]">
                  {i + 1}
                </span>
                <p className="text-sm leading-relaxed text-[var(--color-ink-600)]">{text}</p>
              </div>
            ))}
          </div>
        </Card>

        <CardInset className="flex items-start gap-3 p-4 text-sm text-[var(--color-ink-600)]">
          <ShieldCheck className="size-4 shrink-0 text-[var(--color-sea-600)] mt-0.5" />
          <span>Your payment is held in escrow and released to the agency only as trip milestones complete.</span>
        </CardInset>
      </div>
    </div>
  );
}
