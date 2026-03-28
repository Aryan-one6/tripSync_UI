import { DashboardShell } from "@/components/layout/dashboard-shell";
import { DirectMessages } from "@/components/chat/direct-messages";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ target?: string; conversation?: string }>;
}) {
  const params = await searchParams;

  return (
    <DashboardShell
      variant="user"
      title="Traveler messages"
      subtitle="Open private conversations with other active travelers while keeping agencies in the offer and referral workflows."
    >
      <DirectMessages
        initialTargetUserId={typeof params.target === "string" ? params.target : undefined}
        initialConversationId={typeof params.conversation === "string" ? params.conversation : undefined}
      />
    </DashboardShell>
  );
}
