import { redirect } from "next/navigation";

export default async function GroupChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/dashboard/messages?groupId=${encodeURIComponent(id)}`);
}
