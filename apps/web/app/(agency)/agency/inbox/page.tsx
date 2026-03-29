import { DashboardShell } from "@/components/layout/dashboard-shell";
import { InboxChatbox } from "@/components/chat/inbox-chatbox";

export default function AgencyInboxPage() {
  return (
    <DashboardShell
      variant="agency"
      title="Inbox"
      subtitle="Chat with travelers in real time once offers are live. Typing indicators and delivery updates work instantly."
    >
      <InboxChatbox variant="agency" />
    </DashboardShell>
  );
}
