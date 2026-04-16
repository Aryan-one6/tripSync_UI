import { InboxChatbox } from "@/components/chat/inbox-chatbox";

export default function AgencyInboxPage() {
  return (
    <main className="mx-auto flex h-[100svh] min-h-[100svh] w-full max-w-screen-2xl flex-col px-0 md:h-[calc(100dvh-3.5rem)] md:min-h-[calc(100dvh-3.5rem)] md:px-6 md:py-6">
      <div className="min-h-0 flex-1 md:h-full md:min-h-0">
        <InboxChatbox variant="agency" mobileMessengerMode />
      </div>
    </main>
  );
}
