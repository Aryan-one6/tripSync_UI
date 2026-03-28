"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PackageForm } from "@/components/forms/package-form";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/auth-context";
import type { PackageDetails } from "@/lib/api/types";

export default function EditPackagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { apiFetchWithAuth } = useAuth();
  const [pkg, setPkg] = useState<PackageDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [packageId, setPackageId] = useState("");

  useEffect(() => {
    void (async () => {
      const { id } = await params;
      setPackageId(id);
      try {
        const data = await apiFetchWithAuth<PackageDetails>(`/packages/${id}`);
        setPkg(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [apiFetchWithAuth, params]);

  return (
    <DashboardShell
      variant="agency"
      title="Edit package"
      subtitle="Refine itinerary, logistics, and positioning without leaving the agency workspace."
    >
      {loading ? (
        <Card className="flex items-center justify-center p-12 text-[var(--color-ink-500)]">
          <div className="animate-pulse-soft text-center">
            <div className="mx-auto mb-3 size-10 rounded-full bg-[var(--color-sea-100)] shadow-[var(--shadow-clay-sm)]" />
            <p className="text-sm">Loading package...</p>
          </div>
        </Card>
      ) : (
        <PackageForm mode="edit" packageId={packageId} initialData={pkg} />
      )}
    </DashboardShell>
  );
}
