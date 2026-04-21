"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import {
  Printer, CheckCircle2, Clock, AlertCircle,
  MapPin, Calendar, Users, TrendingUp, Wallet,
} from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";

interface PayoutTranche {
  tranche: number; label: string; amount: number;
  released: boolean; expectedDate: string | null;
}

interface AgencySettlementPayload {
  invoiceType: "AGENCY_SETTLEMENT";
  invoiceNumber: string;
  issuedAt: string;
  status: string;
  transferStatus: string;
  platform: { name: string; address: string; gstin: string; email: string; website: string; cin: string; supportEmail: string; };
  agency: { name: string; gstin: string; pan: string; address: string; email: string; phone: string; ownerName: string; logoUrl: string | null; };
  client: { name: string; email: string; phone: string; };
  trip: { title: string; destination: string; startDate: string | null; endDate: string | null; travelerCount: number; };
  settlement: { totalCollected: number; tripAmount: number; platformCommission: number; platformFee: number; gstOnFee: number; agencyNetAmount: number; schedule: PayoutTranche[]; };
  payment: { id: string; razorpayOrderId: string | null; razorpayPaymentId: string | null; currency: string; paidAt: string | null; transferReference: string | null; };
  members: string[];
  termsAndConditions: string[];
}

function inr(p: number) { return `₹${(p / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`; }
function fmtDate(d: string | null | undefined) {
  if (!d) return "TBD";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function statusPill(s: string) {
  if (["RELEASED", "CAPTURED"].includes(s)) return "bg-emerald-100 text-emerald-800";
  if (["REFUNDED", "FAILED"].includes(s)) return "bg-red-100 text-red-700";
  return "bg-amber-100 text-amber-700";
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-8">
      <h3 className="mb-3 border-b border-slate-200 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">{title}</h3>
      {children}
    </div>
  );
}

export default function AgencySettlementPage() {
  const params = useParams<{ paymentId: string }>();
  const { apiFetchWithAuth } = useAuth();
  const [inv, setInv] = useState<AgencySettlementPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();

  useEffect(() => {
    start(async () => {
      try {
        const data = await apiFetchWithAuth<AgencySettlementPayload>(
          `/invoices/agency/settlement/${params.paymentId}`,
        );
        setInv(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load settlement statement.");
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.paymentId]);

  if (error) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <AlertCircle className="mx-auto mb-2 size-8 text-red-400" />
        <p className="text-sm text-red-700">{error}</p>
      </div>
    </div>
  );
  if (!inv) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="size-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
    </div>
  );

  const { platform, agency, client, trip, settlement, payment } = inv;

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white">
      {/* Toolbar */}
      <div className="print:hidden sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800">Settlement Statement {inv.invoiceNumber}</p>
            <p className="text-xs text-slate-400">Issued {fmtDate(inv.issuedAt)}</p>
          </div>
          <Button variant="secondary" onClick={() => window.print()} className="gap-2">
            <Printer className="size-4" /> Print / Save PDF
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 print:py-0 print:px-0">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm print:shadow-none print:border-none">

          {/* Header band — Emerald theme for agency */}
          <div className="flex items-start justify-between rounded-t-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-7 text-white print:rounded-none">
            <div>
              <p className="text-xl font-bold tracking-tight">{platform.name}</p>
              <p className="mt-0.5 text-xs text-emerald-100">{platform.address}</p>
              <p className="text-xs text-emerald-100">GSTIN: {platform.gstin}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-extrabold tracking-tight">SETTLEMENT STATEMENT</p>
              <p className="mt-1 text-sm text-emerald-100">{inv.invoiceNumber}</p>
              <p className="text-xs text-emerald-100">Date: {fmtDate(inv.issuedAt)}</p>
              <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusPill(inv.status)}`}>
                {inv.status}
              </span>
            </div>
          </div>

          <div className="px-8 pb-10">
            {/* Agency + Client */}
            <div className="mt-7 grid grid-cols-2 gap-6">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Paid To (Agency)</p>
                <p className="font-semibold text-slate-800">{agency.name}</p>
                <p className="text-xs text-slate-500">Owner: {agency.ownerName}</p>
                {agency.gstin && <p className="text-xs text-slate-500">GSTIN: {agency.gstin}</p>}
                {agency.pan && <p className="text-xs text-slate-500">PAN: {agency.pan}</p>}
                <p className="text-sm text-slate-500 mt-1">{agency.address}</p>
                <p className="text-sm text-slate-500">{agency.email}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Client (Traveller)</p>
                <p className="font-semibold text-slate-800">{client.name}</p>
                <p className="text-sm text-slate-500">{client.email}</p>
                <p className="text-sm text-slate-500">{client.phone}</p>
              </div>
            </div>

            {/* Trip */}
            <Section title="Trip Booked">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-base font-bold text-slate-800">{trip.title}</p>
                <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-600">
                  <span className="flex items-center gap-1.5"><MapPin className="size-3.5 text-emerald-400" />{trip.destination}</span>
                  <span className="flex items-center gap-1.5"><Calendar className="size-3.5 text-emerald-400" />{fmtDate(trip.startDate)} → {fmtDate(trip.endDate)}</span>
                  <span className="flex items-center gap-1.5"><Users className="size-3.5 text-emerald-400" />{trip.travelerCount} Travellers</span>
                </div>
                {inv.members.length > 0 && (
                  <p className="mt-2 text-xs text-slate-400">Members: {inv.members.join(" · ")}</p>
                )}
              </div>
            </Section>

            {/* Settlement Breakdown */}
            <Section title="Settlement Breakdown">
              <div className="overflow-hidden rounded-xl border border-slate-100">
                {[
                  ["Total Collected from Traveller", settlement.totalCollected],
                  ["Trip Amount (to Agency)", settlement.tripAmount],
                  ["Platform Commission", -settlement.platformCommission],
                  ["Platform Service Fee", -settlement.platformFee],
                  ["GST on Platform Fee (18%)", -settlement.gstOnFee],
                ].map(([label, amount]) => (
                  <div key={label as string} className="flex justify-between border-b border-slate-100 last:border-b-0 px-4 py-2.5 text-sm">
                    <span className="text-slate-600">{label as string}</span>
                    <span className={`font-medium ${Number(amount) < 0 ? "text-red-600" : "text-slate-800"}`}>
                      {Number(amount) < 0 ? `- ${inr(Math.abs(Number(amount)))}` : inr(Number(amount))}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between bg-emerald-50 px-4 py-3 text-base font-bold">
                  <span className="text-emerald-800 flex items-center gap-2"><TrendingUp className="size-4" /> Net Payable to Agency</span>
                  <span className="text-emerald-800">{inr(settlement.agencyNetAmount)}</span>
                </div>
              </div>
            </Section>

            {/* Payout Schedule */}
            <Section title="Payout Schedule">
              <div className="space-y-3">
                {settlement.schedule.map((t) => (
                  <div key={t.tranche} className={`rounded-xl border px-5 py-4 ${t.released ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Tranche {t.tranche} — {inr(t.amount)}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{t.label}</p>
                        {t.expectedDate && (
                          <p className="text-xs text-slate-400 mt-0.5">Expected: {fmtDate(t.expectedDate)}</p>
                        )}
                      </div>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${t.released ? "bg-emerald-200 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>
                        {t.released ? <CheckCircle2 className="size-3" /> : <Clock className="size-3" />}
                        {t.released ? "Transferred" : "Pending"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {/* Payment reference */}
            <Section title="Payment Reference">
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {[
                  ["Internal Payment ID", payment.id],
                  ["Razorpay Order ID", payment.razorpayOrderId ?? "—"],
                  ["Razorpay Payment ID", payment.razorpayPaymentId ?? "—"],
                  ["Transfer Reference", payment.transferReference ?? "—"],
                  ["Transfer Status", inv.transferStatus],
                  ["Currency", payment.currency],
                  ["Paid On", fmtDate(payment.paidAt)],
                ].map(([label, value]) => (
                  <div key={label as string} className="flex gap-2">
                    <span className="text-slate-400 shrink-0">{label as string}:</span>
                    <span className="font-medium text-slate-700 break-all">{value as string}</span>
                  </div>
                ))}
              </div>
            </Section>

            {/* T&C */}
            <Section title="Terms & Conditions">
              <ol className="list-decimal space-y-1.5 pl-5 text-xs text-slate-500">
                {inv.termsAndConditions.map((t, i) => <li key={i}>{t}</li>)}
              </ol>
            </Section>

            {/* Footer */}
            <div className="mt-10 flex items-center justify-between border-t border-slate-200 pt-5">
              <div>
                <p className="text-xs font-bold text-emerald-600">{platform.name}</p>
                <p className="text-xs text-slate-400">{platform.supportEmail}</p>
              </div>
              <p className="text-xs text-slate-300 text-center">Statement auto-generated. No signature required.</p>
              <div className="flex items-center gap-1.5">
                <Wallet className="size-3.5 text-slate-300" />
                <p className="text-xs text-slate-300">Transfers via Razorpay Route</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
