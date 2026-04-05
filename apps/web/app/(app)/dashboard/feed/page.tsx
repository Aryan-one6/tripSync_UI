import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function FeedPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const nextParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value.length > 0) {
      nextParams.set(key, value);
    }
  }

  if (!nextParams.has("audience")) {
    nextParams.set("audience", "traveler");
  }

  const qs = nextParams.toString();
  redirect(qs ? `/discover?${qs}` : "/discover?audience=traveler");
}
