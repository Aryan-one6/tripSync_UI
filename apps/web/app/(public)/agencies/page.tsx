import { Search } from "lucide-react";
import { AgencyCard } from "@/components/cards/agency-card";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { getAgencies } from "@/lib/api/public";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AgenciesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const agencies = await getAgencies({
    city: typeof params.city === "string" ? params.city : undefined,
    state: typeof params.state === "string" ? params.state : undefined,
    specialization: typeof params.specialization === "string" ? params.specialization : undefined,
    destination: typeof params.destination === "string" ? params.destination : undefined,
  });

  return (
    <div className="page-shell space-y-8 py-10">
      <SectionHeading
        eyebrow="Agency browse"
        title="Find operators that fit the trip you want to run"
        description="Browse destination focus, specialization, and ratings before you refer your plan or compare offers."
      />

      {/* Filters */}
      <Card className="relative overflow-hidden p-5">
        <div className="clay-blob -top-8 -right-8 size-20 bg-[var(--color-sand-200)] opacity-10" />
        <form className="relative grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
          <Input name="city" placeholder="City" defaultValue={typeof params.city === "string" ? params.city : ""} />
          <Input name="state" placeholder="State" defaultValue={typeof params.state === "string" ? params.state : ""} />
          <Input
            name="specialization"
            placeholder="Specialization"
            defaultValue={typeof params.specialization === "string" ? params.specialization : ""}
          />
          <Input
            name="destination"
            placeholder="Destination"
            defaultValue={typeof params.destination === "string" ? params.destination : ""}
          />
          <Button type="submit">
            <Search className="size-4" />
            Search
          </Button>
        </form>
      </Card>

      {/* Results */}
      {agencies.length === 0 ? (
        <EmptyState
          title="No agencies found"
          description="Try different filters or check back later for new operator profiles."
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {agencies.map((agency) => (
            <AgencyCard key={agency.id} agency={agency} />
          ))}
        </div>
      )}
    </div>
  );
}
