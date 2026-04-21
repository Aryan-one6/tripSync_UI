"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { FileText, ChevronRight, CheckCircle2, Clock, AlertCircle, TrendingUp } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card } from "@/components/ui/card";

interface AgencyInvoice {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  currency: string;
  status: string;
  createdAt: string;
  payment: { status: string; paidAt: string | null; agencyNetAmount: number; tranche1Released: boolean; tranche2Released: boolean; };
  group: {
    plan: { title: string; destination: string; startDate: string | null; } | null;
    package: { title: string; destination: string; startDate: string | null; } | null;
  };
}

function inr(p: number) { return `₹${(p / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`; }
function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function AgencyInvoicesPage() {
  const { apiFetchWithAuth } = useAuth();
  const [invoices, setInvoices] = useState<AgencyInvoice[]>([]);
  const [, start] = useTransition();

  useEffect(() => {
    start(async () => {
      try {
        const data = await apiFetchWithAuth<AgencyInvoice[]>("/invoices/agency/me");
        setInvoices(data);
      } catch { /* empty state */ }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DashboardShell
      variant="agency"
      title="Settlement Invoices"
      subtitle="View escrow payout statements and download them as PDFs for your accounting."
    >
      {invoices.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-14 text-center">
          <FileText className="size-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">No settlement statements yet</p>
          <p className="text-xs text-slate-400">Settlement invoices appear once a confirmed group's payment is captured.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => {
            const tripInfo = inv.group.plan ?? inv.group.package;
            const tranchesReleased = [inv.payment.tranche1Released, inv.payment.tranche2Released].filter(Boolean).length;
            return (
              <Link key={inv.id} href={`/agency/invoices/${inv.id}`}>
                <Card className="group flex items-center gap-4 p-4 transition-all hover:border-emerald-200 hover:shadow-md cursor-pointer">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                    <FileText className="size-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-800 text-sm">{tripInfo?.title ?? "Trip Booking"}</p>
                      {inv.payment.status === "CAPTURED" ? (
                        <CheckCircle2 className="size-4 text-emerald-500" />
                      ) : inv.payment.status === "FAILED" ? (
                        <AlertCircle className="size-4 text-red-400" />
                      ) : (
                        <Clock className="size-4 text-amber-400" />
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{tripInfo?.destination ?? "—"} · {fmtDate(tripInfo?.startDate)}</p>
                    <p className="text-xs text-slate-400">{inv.invoiceNumber} · {tranchesReleased}/2 tranches released</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 justify-end text-emerald-700">
                      <TrendingUp className="size-3.5" />
                      <p className="font-bold">{inr(inv.payment.agencyNetAmount)}</p>
                    </div>
                    <p className="text-xs text-slate-400">Net to agency</p>
                  </div>
                  <ChevronRight className="size-4 text-slate-300 group-hover:text-emerald-400 transition-colors shrink-0" />
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}
