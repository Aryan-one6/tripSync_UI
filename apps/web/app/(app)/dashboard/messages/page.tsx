import { DashboardShell } from "@/components/layout/dashboard-shell";
import { InboxChatbox } from "@/components/chat/inbox-chatbox";

export default function MessagesPage() {
  return (
    <DashboardShell
      variant="user"
      title="Inbox"
      subtitle="Direct chats and active group channels in one messenger workspace with live updates and typing indicators."
    >
      <InboxChatbox variant="user" />
    </DashboardShell>
  );
}
