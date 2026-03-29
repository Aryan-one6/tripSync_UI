import { DashboardShell } from "@/components/layout/dashboard-shell";
import { GroupChat } from "@/components/chat/group-chat";

export default async function GroupChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <DashboardShell
      variant="user"
      title="Group chat"
      subtitle="Coordinate live with committed travelers, settle logistics, and use polls when the group needs a fast decision."
    >
      <GroupChat groupId={id} />
    </DashboardShell>
  );
}
