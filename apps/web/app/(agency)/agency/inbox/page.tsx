import { InboxChatbox } from "@/components/chat/inbox-chatbox";

export default function AgencyInboxPage() {
  return (
    <main className="mx-auto h-[100dvh] w-full max-w-screen-2xl px-0 md:h-auto md:px-6 md:py-6">
      <div className="h-full md:h-auto">
        <InboxChatbox variant="agency" mobileMessengerMode />
      </div>
    </main>
  );
}
