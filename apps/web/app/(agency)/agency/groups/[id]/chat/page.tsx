import { DashboardShell } from "@/components/layout/dashboard-shell";
import { GroupChat } from "@/components/chat/group-chat";

export default async function AgencyGroupChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <DashboardShell
      variant="agency"
      title="Group room"
      subtitle="Coordinate offers, counter updates, and finalization live with the trip group."
    >
      <GroupChat groupId={id} />
    </DashboardShell>
  );
}
