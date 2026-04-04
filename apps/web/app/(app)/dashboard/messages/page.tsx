import { InboxChatbox } from "@/components/chat/inbox-chatbox";

export default function MessagesPage() {
  return (
    <main className="mx-auto w-full max-w-screen-2xl px-0 md:px-6 md:py-6">
      <div className="pb-mobile-nav md:pb-0">
        <InboxChatbox variant="user" />
      </div>
    </main>
  );
}
