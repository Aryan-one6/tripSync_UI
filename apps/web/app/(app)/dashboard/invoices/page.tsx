"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { FileText, ChevronRight, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card } from "@/components/ui/card";

interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  currency: string;
  status: string;
  createdAt: string;
  payment: { status: string; paidAt: string | null; planId: string | null; packageId: string | null; };
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

function StatusIcon({ status }: { status: string }) {
  if (status === "CAPTURED") return <CheckCircle2 className="size-4 text-emerald-500" />;
  if (status === "FAILED") return <AlertCircle className="size-4 text-red-400" />;
  return <Clock className="size-4 text-amber-400" />;
}

export default function InvoicesListPage() {
  const { apiFetchWithAuth } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [isLoading, start] = useTransition();

  useEffect(() => {
    start(async () => {
      try {
        const data = await apiFetchWithAuth<InvoiceSummary[]>("/invoices/me");
        setInvoices(data);
      } catch { /* show empty state */ }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DashboardShell
      title="My Invoices"
      subtitle="Tax invoices for all your trip payments. Download as PDF anytime."
    >
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="size-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        </div>
      )}

      {!isLoading && invoices.length === 0 && (
        <Card className="flex flex-col items-center gap-3 py-14 text-center">
          <FileText className="size-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">No invoices yet</p>
          <p className="text-xs text-slate-400">Invoices appear here once you confirm and pay for a trip.</p>
        </Card>
      )}

      {!isLoading && invoices.length > 0 && (
        <div className="space-y-3">
          {invoices.map((inv) => {
            const tripInfo = inv.group.plan ?? inv.group.package;
            const paymentId = inv.payment.planId ?? inv.payment.packageId ?? inv.id;
            return (
              <Link key={inv.id} href={`/dashboard/invoices/${paymentId}`}>
                <Card className="group flex items-center gap-4 p-4 transition-all hover:border-indigo-200 hover:shadow-md cursor-pointer">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
                    <FileText className="size-5 text-indigo-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-800 text-sm">{tripInfo?.title ?? "Trip Booking"}</p>
                      <StatusIcon status={inv.payment.status} />
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {tripInfo?.destination ?? "—"} · {fmtDate(tripInfo?.startDate)}
                    </p>
                    <p className="text-xs text-slate-400">{inv.invoiceNumber} · Issued {fmtDate(inv.createdAt)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-slate-800">{inr(inv.totalAmount)}</p>
                    <p className="text-xs text-slate-400">{inv.currency}</p>
                  </div>
                  <ChevronRight className="size-4 text-slate-300 group-hover:text-indigo-400 transition-colors shrink-0" />
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}
