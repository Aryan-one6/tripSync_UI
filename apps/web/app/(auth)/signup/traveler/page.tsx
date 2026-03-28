import { TravelerSignupForm } from "@/components/auth/traveler-signup-form";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function TravelerSignupPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const nextPath =
    typeof params.next === "string" && params.next.startsWith("/") ? params.next : "/dashboard/plans";

  return (
    <div className="page-shell flex min-h-[80vh] items-center py-10">
      <div className="grid w-full gap-8 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--color-sea-700)]">
            Signup as traveler
          </p>
          <h1 className="font-display text-6xl leading-[0.96] text-[var(--color-ink-950)]">
            Build your TripSync traveler identity one step at a time.
          </h1>
          <p className="max-w-xl text-lg text-[var(--color-ink-600)]">
            Create the account once, then log in with username or email and password whenever you want to
            publish plans, join trips, chat, pay, or review.
          </p>
        </div>
        <TravelerSignupForm nextPath={nextPath} />
      </div>
    </div>
  );
}
