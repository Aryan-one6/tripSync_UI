import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PackageForm } from "@/components/forms/package-form";

export default function NewPackagePage() {
  return (
    <DashboardShell
      variant="agency"
      title="Create a package"
      subtitle="Structure itinerary, inclusions, and pricing so your listings feel immediately comparable in the offer market."
    >
      <PackageForm mode="create" />
    </DashboardShell>
  );
}
