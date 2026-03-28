import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PlanWizard } from "@/components/forms/plan-wizard";

export default function NewPlanPage() {
  return (
    <DashboardShell
      variant="user"
      title="Create a trip plan"
      subtitle="Four fast steps, no bloated form. Capture the trip signal, then publish when it feels right."
    >
      <PlanWizard />
    </DashboardShell>
  );
}
