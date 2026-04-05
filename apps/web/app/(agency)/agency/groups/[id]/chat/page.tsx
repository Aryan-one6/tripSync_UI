import { redirect } from "next/navigation";

export default async function AgencyGroupChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/agency/inbox?groupId=${encodeURIComponent(id)}`);
}
