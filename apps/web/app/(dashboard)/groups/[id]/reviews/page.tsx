import { DashboardShell } from "@/components/layout/dashboard-shell";
import { GroupReviewPanel } from "@/components/reviews/group-review-panel";

export default async function GroupReviewsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <DashboardShell
      variant="user"
      title="Post-trip reviews"
      subtitle="Rate the agency and your co-travelers after the trip ends so the marketplace accumulates trust, safety signal, and real accountability."
    >
      <GroupReviewPanel groupId={id} />
    </DashboardShell>
  );
}
