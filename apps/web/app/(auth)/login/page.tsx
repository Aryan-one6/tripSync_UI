import { LoginForm } from "@/components/auth/login-form";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const nextPath = typeof params.next === "string" && params.next.startsWith("/") ? params.next : "/";
  const defaultIdentifier = typeof params.identifier === "string" ? params.identifier : "";
  const successMessage =
    params.signup === "traveler"
      ? "Traveler account created. Log in with your new credentials."
      : params.signup === "agency"
        ? "Agency account created. Log in with your new credentials."
        : undefined;

  return (
    <div className="page-shell flex min-h-[80vh] items-center py-10">
      <div className="grid w-full gap-8 lg:grid-cols-[1fr_0.9fr]">
        <div className="space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--color-sea-700)]">
            Account access
          </p>
          <h1 className="font-display text-6xl leading-[0.96] text-[var(--color-ink-950)]">
            Password login that keeps traveler and agency workspaces under one account.
          </h1>
          <p className="max-w-xl text-lg text-[var(--color-ink-600)]">
            Signup once as a traveler or create the owner plus agency account together, then keep coming
            back with username or email and password.
          </p>
        </div>
        <LoginForm
          nextPath={nextPath}
          defaultIdentifier={defaultIdentifier}
          successMessage={successMessage}
        />
      </div>
    </div>
  );
}
