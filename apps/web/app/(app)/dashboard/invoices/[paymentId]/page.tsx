"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import {
  Printer, Download, CheckCircle2, Clock, AlertCircle,
  MapPin, Calendar, Users, Shield, Landmark, Award, Wallet,
} from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";

// ─── Types matching the backend payload ───────────────────────────────────

interface RefundRow { window: string; refund: string; }
interface LineItem { description: string; subtext: string; qty: number; unit: string; rate: number; subtotal: number; }
interface DiscountLine { label: string; amount: number; }
interface EscrowTranche { tranche: number; label: string; amount: number; released: boolean; }

interface UserInvoicePayload {
  invoiceType: "USER_PAYMENT";
  invoiceNumber: string;
  issuedAt: string;
  status: string;
  escrowStatus: string;
  platform: { name: string; tagline: string; address: string; gstin: string; email: string; website: string; cin: string; supportEmail: string; supportPhone: string; };
  traveler: { name: string; email: string; phone: string; city: string; };
  agency: { name: string; gstin: string; pan: string; address: string; email: string; phone: string; logoUrl: string | null; } | null;
  trip: { title: string; destination: string; startDate: string | null; endDate: string | null; travelerCount: number; pricePerPerson: number; inclusions: string[]; cancellationPolicy: string; planType: string; accommodation: string | null; vibes: string[]; };
  lineItems: LineItem[];
  summary: { subtotal: number; tripAmount: number; platformFee: number; gstOnPlatformFee: number; discountLines: DiscountLine[]; totalDiscounts: number; grandTotal: number; };
  payment: { id: string; razorpayOrderId: string | null; razorpayPaymentId: string | null; currency: string; paidAt: string | null; escrowSchedule: EscrowTranche[]; };
  pointsRedeemed: number;
  walletAmountUsed: number;
  refundPolicy: RefundRow[];
  termsAndConditions: string[];
  members: string[];
}

// ─── Utilities ─────────────────────────────────────────────

function inr(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}
function fmtDate(d: string | null | undefined) {
  if (!d) return "TBD";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function statusColor(s: string) {
  if (s === "CAPTURED" || s === "RELEASED") return "bg-emerald-100 text-emerald-800";
  if (s === "FAILED" || s === "REFUNDED") return "bg-red-100 text-red-700";
  return "bg-amber-100 text-amber-700";
}

// ─── Sub-components ────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-8">
      <h3 className="mb-3 border-b border-slate-200 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {title}
      </h3>
      {children}
    </div>
  );
}

function InfoGrid({ rows }: { rows: [string, string][] }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="flex gap-2">
          <span className="text-slate-400 shrink-0">{label}:</span>
          <span className="font-medium text-slate-800 break-all">{value || "—"}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────

export default function UserInvoicePage() {
  const params = useParams<{ paymentId: string }>();
  const { apiFetchWithAuth } = useAuth();
  const [invoice, setInvoice] = useState<UserInvoicePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, start] = useTransition();

  useEffect(() => {
    start(async () => {
      try {
        const data = await apiFetchWithAuth<UserInvoicePayload>(`/invoices/${params.paymentId}`);
        setInvoice(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load invoice.");
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.paymentId]);

  if (isLoading) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="size-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        <p className="text-sm text-slate-500">Loading invoice…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <AlertCircle className="mx-auto mb-2 size-8 text-red-400" />
        <p className="text-sm text-red-700">{error}</p>
      </div>
    </div>
  );

  if (!invoice) return null;

  const { platform, traveler, agency, trip, lineItems, summary, payment, refundPolicy, termsAndConditions, members } = invoice;

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white">
      {/* ── Toolbar (hidden on print) ── */}
      <div className="print:hidden sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800">Invoice {invoice.invoiceNumber}</p>
            <p className="text-xs text-slate-400">Issued {fmtDate(invoice.issuedAt)}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => window.print()} className="gap-2">
              <Printer className="size-4" /> Print / Save PDF
            </Button>
          </div>
        </div>
      </div>

      {/* ── Invoice body ── */}
      <div className="mx-auto max-w-4xl px-4 py-8 print:py-0 print:px-0">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm print:shadow-none print:border-none">

          {/* Header band */}
          <div className="flex items-start justify-between rounded-t-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-7 text-white print:rounded-none">
            <div>
              <p className="text-xl font-bold tracking-tight">{platform.name}</p>
              <p className="mt-0.5 text-xs text-indigo-200">{platform.tagline}</p>
              <p className="mt-2 text-xs text-indigo-100">{platform.address}</p>
              <p className="text-xs text-indigo-100">GSTIN: {platform.gstin} · CIN: {platform.cin}</p>
              <p className="text-xs text-indigo-100">{platform.email} · {platform.website}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-extrabold tracking-tight">TAX INVOICE</p>
              <p className="mt-1 text-sm text-indigo-200">{invoice.invoiceNumber}</p>
              <p className="mt-0.5 text-xs text-indigo-200">Date: {fmtDate(invoice.issuedAt)}</p>
              <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor(invoice.status)}`}>
                {invoice.status === "CAPTURED" ? <CheckCircle2 className="size-3" /> : <Clock className="size-3" />}
                {invoice.status}
              </span>
            </div>
          </div>

          <div className="px-8 pb-10">
            {/* Traveler + Agency two-column */}
            <div className="mt-7 grid grid-cols-2 gap-6">
              {/* Billed To */}
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Billed To (Traveller)</p>
                <p className="font-semibold text-slate-800">{traveler.name}</p>
                <p className="text-sm text-slate-500">{traveler.email}</p>
                <p className="text-sm text-slate-500">{traveler.phone}</p>
                {traveler.city && <p className="text-sm text-slate-500">{traveler.city}</p>}
              </div>

              {/* Service Provider */}
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Service Provider (Agency)</p>
                {agency ? (
                  <>
                    <p className="font-semibold text-slate-800">{agency.name}</p>
                    {agency.gstin && <p className="text-xs text-slate-500">GSTIN: {agency.gstin}</p>}
                    {agency.pan && <p className="text-xs text-slate-500">PAN: {agency.pan}</p>}
                    <p className="text-sm text-slate-500">{agency.address}</p>
                    <p className="text-sm text-slate-500">{agency.email}</p>
                  </>
                ) : (
                  <p className="text-sm text-slate-400">Direct Booking via TripSync</p>
                )}
              </div>
            </div>

            {/* Trip Summary */}
            <Section title="Trip Details">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-base font-bold text-slate-800">{trip.title}</p>
                <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-600">
                  <span className="flex items-center gap-1.5"><MapPin className="size-3.5 text-indigo-400" />{trip.destination}</span>
                  <span className="flex items-center gap-1.5"><Calendar className="size-3.5 text-indigo-400" />{fmtDate(trip.startDate)} → {fmtDate(trip.endDate)}</span>
                  <span className="flex items-center gap-1.5"><Users className="size-3.5 text-indigo-400" />{trip.travelerCount} Travellers</span>
                </div>
                {trip.inclusions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(trip.inclusions as string[]).map((inc, i) => (
                      <span key={i} className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">{inc}</span>
                    ))}
                  </div>
                )}
                {members.length > 0 && (
                  <p className="mt-2 text-xs text-slate-400">
                    Group: {members.join(" · ")}
                  </p>
                )}
              </div>
            </Section>

            {/* Line Items Table */}
            <Section title="Charges Breakdown">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="pb-2">Description</th>
                    <th className="pb-2 text-center">Qty</th>
                    <th className="pb-2 text-right">Rate</th>
                    <th className="pb-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="py-3 pr-4">
                        <p className="font-medium text-slate-800">{item.description}</p>
                        {item.subtext && <p className="text-xs text-slate-400">{item.subtext}</p>}
                      </td>
                      <td className="py-3 text-center text-slate-600">{item.qty}</td>
                      <td className="py-3 text-right text-slate-600">{inr(item.rate)}</td>
                      <td className="py-3 text-right font-semibold text-slate-800">{inr(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Summary block */}
              <div className="mt-4 ml-auto max-w-xs space-y-1.5 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Trip Amount</span><span>{inr(summary.tripAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Platform Fee</span><span>{inr(summary.platformFee)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>GST @18% on Fee</span><span>{inr(summary.gstOnPlatformFee)}</span>
                </div>
                {summary.discountLines.map((d, i) => (
                  <div key={i} className="flex justify-between text-emerald-700">
                    <span className="flex items-center gap-1">
                      {d.label.includes("Points") ? <Award className="size-3" /> : <Wallet className="size-3" />}
                      {d.label}
                    </span>
                    <span>{inr(d.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-slate-300 pt-2 text-base font-bold text-slate-900">
                  <span>Grand Total Paid</span><span>{inr(summary.grandTotal)}</span>
                </div>
                <p className="text-right text-xs text-slate-400">({payment.currency})</p>
              </div>
            </Section>

            {/* Payment Info */}
            <Section title="Payment Information">
              <InfoGrid rows={[
                ["Payment ID", payment.id.slice(0, 18) + "…"],
                ["Razorpay Order ID", payment.razorpayOrderId ?? "—"],
                ["Razorpay Payment ID", payment.razorpayPaymentId ?? "—"],
                ["Paid On", fmtDate(payment.paidAt)],
                ["Escrow Status", invoice.escrowStatus],
                ["Points Redeemed", invoice.pointsRedeemed > 0 ? `${invoice.pointsRedeemed} pts (₹${invoice.pointsRedeemed})` : "—"],
                ["Wallet Credit Used", invoice.walletAmountUsed > 0 ? `₹${invoice.walletAmountUsed}` : "—"],
                ["Currency", payment.currency],
              ]} />
            </Section>

            {/* Escrow Schedule */}
            <Section title="Escrow & Payout Schedule">
              <div className="overflow-hidden rounded-xl border border-slate-100">
                {payment.escrowSchedule.map((t) => (
                  <div key={t.tranche} className="flex items-center justify-between border-b border-slate-100 last:border-b-0 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{t.label}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-semibold text-slate-800">{inr(t.amount)}</span>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${t.released ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {t.released ? <CheckCircle2 className="size-3" /> : <Clock className="size-3" />}
                        {t.released ? "Released" : "Pending"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-400 flex items-center gap-1">
                <Shield className="size-3 shrink-0" /> Funds held in secure escrow by TripSync until trip milestones are reached.
              </p>
            </Section>

            {/* Cancellation / Refund Policy */}
            <Section title="Cancellation & Refund Policy">
              <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900 mb-3">
                <p className="font-semibold mb-1">Agency Policy</p>
                <p className="text-xs">{trip.cancellationPolicy}</p>
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-100">
                {refundPolicy.map((row) => (
                  <div key={row.window} className="flex justify-between border-b border-slate-100 last:border-b-0 px-4 py-2.5 text-sm">
                    <span className="text-slate-600">{row.window}</span>
                    <span className="font-medium text-slate-800">{row.refund}</span>
                  </div>
                ))}
              </div>
            </Section>

            {/* T&C */}
            <Section title="Terms & Conditions">
              <ol className="list-decimal space-y-1.5 pl-5 text-xs text-slate-500">
                {termsAndConditions.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ol>
            </Section>

            {/* Footer */}
            <div className="mt-10 flex items-center justify-between border-t border-slate-200 pt-5">
              <div>
                <p className="text-xs font-bold text-indigo-600">{platform.name}</p>
                <p className="text-xs text-slate-400">{platform.supportEmail} · {platform.supportPhone}</p>
              </div>
              <p className="text-center text-xs text-slate-300">
                This is a computer-generated invoice. No signature required.
              </p>
              <div className="flex items-center gap-1.5">
                <Landmark className="size-3.5 text-slate-300" />
                <p className="text-xs text-slate-300">Payments secured by Razorpay</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print styles injected inline */}
      <style jsx global>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
