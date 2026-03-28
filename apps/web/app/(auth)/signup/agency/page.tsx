import { AgencySignupForm } from "@/components/auth/agency-signup-form";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AgencySignupPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const nextPath =
    typeof params.next === "string" && params.next.startsWith("/") ? params.next : "/agency/dashboard";

  return (
    <div className="page-shell flex min-h-[80vh] items-center py-10">
      <div className="grid w-full gap-8 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--color-sea-700)]">
            Signup as agency
          </p>
          <h1 className="font-display text-6xl leading-[0.96] text-[var(--color-ink-950)]">
            Create the owner account and the agency profile in one guided signup.
          </h1>
          <p className="max-w-xl text-lg text-[var(--color-ink-600)]">
            Finish the owner identity, then define the operator profile travelers will judge in the
            marketplace. You land in the agency workspace immediately after signup.
          </p>
        </div>
        <AgencySignupForm nextPath={nextPath} />
      </div>
    </div>
  );
}
