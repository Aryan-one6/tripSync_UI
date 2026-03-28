import { DashboardShell } from "@/components/layout/dashboard-shell";
import { OfferInbox } from "@/components/offers/offer-inbox";

export default async function OfferInboxPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <DashboardShell
      variant="user"
      title="Offer inbox"
      subtitle="Compare agencies side-by-side, negotiate when needed, and move the plan into confirming only when the offer actually fits."
    >
      <OfferInbox planId={id} />
    </DashboardShell>
  );
}
