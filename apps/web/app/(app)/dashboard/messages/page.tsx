import { DashboardShell } from "@/components/layout/dashboard-shell";
import { InboxChatbox } from "@/components/chat/inbox-chatbox";

export default function MessagesPage() {
  return (
    <DashboardShell
      variant="user"
      title="Messages"
      subtitle="Direct messages and group channels — all in one place."
    >
      <InboxChatbox variant="user" />
    </DashboardShell>
  );
}
