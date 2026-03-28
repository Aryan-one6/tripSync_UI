import { DashboardShell } from "@/components/layout/dashboard-shell";
import { GroupPaymentCard } from "@/components/payments/group-payment-card";

export default async function GroupCheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <DashboardShell
      variant="user"
      title="Trip checkout"
      subtitle="Capture traveler payments while the plan is confirming, keep the escrow state explicit, and let confirmation happen only after the whole approved group commits."
    >
      <GroupPaymentCard groupId={id} />
    </DashboardShell>
  );
}
