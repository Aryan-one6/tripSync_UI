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
      subtitle="Complete your payment to confirm your spot. Your payment is held in escrow and released to the agency only when your trip milestones are completed."
    >
      <GroupPaymentCard groupId={id} />
    </DashboardShell>
  );
}
