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
      subtitle="Coordinate live with your approved trip group — message, share updates, and use polls to make group decisions together."
    >
      <GroupChat groupId={id} />
    </DashboardShell>
  );
}
