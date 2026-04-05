"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type DiscoverSearchFiltersProps = {
  q: string;
  destination: string;
  vibes: string;
  originType?: "plan" | "package";
  sort: "price_low" | "price_high" | "popular" | "recent";
  audience: "traveler" | "agency";
  rail: "for-you" | "following" | "trending";
};

export function DiscoverSearchFilters({
  q,
  destination,
  vibes,
  originType,
  sort,
  audience,
  rail,
}: DiscoverSearchFiltersProps) {
  const router = useRouter();
  const desktopPanelRef = useRef<HTMLDivElement>(null);
  const mobilePanelRef = useRef<HTMLDivElement>(null);
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState(q);
  const [destinationValue, setDestinationValue] = useState(destination);
  const [originTypeValue, setOriginTypeValue] = useState(originType ?? "");
  const [sortValue, setSortValue] = useState(sort);
  const [railValue, setRailValue] = useState(rail);

  const baseQuery = useMemo(
    () => ({
      audience,
      vibes,
      q: query.trim(),
      destination: destinationValue.trim(),
      originType: originTypeValue,
      sort: sortValue,
      rail: railValue,
    }),
    [audience, destinationValue, originTypeValue, query, railValue, sortValue, vibes]
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (desktopOpen && desktopPanelRef.current && !desktopPanelRef.current.contains(target)) {
        setDesktopOpen(false);
      }
      if (mobileOpen && mobilePanelRef.current && !mobilePanelRef.current.contains(target)) {
        setMobileOpen(false);
      }
    }

    if (desktopOpen || mobileOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [desktopOpen, mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  function buildHref() {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(baseQuery)) {
      if (value) params.set(key, value);
    }
    return `/discover?${params.toString()}`;
  }

  function applyFilters() {
    router.push(buildHref());
    setDesktopOpen(false);
    setMobileOpen(false);
  }

  function resetFilters() {
    setDestinationValue("");
    setOriginTypeValue("");
    setSortValue("recent");
    setRailValue("for-you");
  }

  function handleFilterButton() {
    if (window.matchMedia("(max-width: 767px)").matches) {
      setMobileOpen(true);
      return;
    }
    setDesktopOpen((current) => !current);
  }

  return (
    <div className="relative mb-5">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          applyFilters();
        }}
      >
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-(--color-ink-400)" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Where next?"
              className="h-12 rounded-(--radius-full) pl-11 pr-4"
            />
          </div>
          <button
            type="button"
            onClick={handleFilterButton}
            className="flex h-12 items-center gap-2 rounded-(--radius-full) border border-(--color-border-strong) bg-(--color-surface-raised) px-4 text-sm font-semibold text-(--color-ink-800) shadow-(--shadow-sm) transition hover:border-(--color-sea-300) hover:text-(--color-sea-700)"
            aria-haspopup="dialog"
            aria-expanded={desktopOpen || mobileOpen}
            aria-label="Open filters"
          >
            <SlidersHorizontal className="size-4" />
            <span className="hidden sm:inline">Filters</span>
          </button>
        </div>
      </form>

      {desktopOpen && (
        <div
          ref={desktopPanelRef}
          className="absolute right-0 top-[calc(100%+0.65rem)] z-30 hidden w-[340px] rounded-xl border border-(--color-border) bg-(--color-surface-raised) p-4 shadow-(--shadow-md) md:block"
        >
          <FilterFields
            destinationValue={destinationValue}
            onDestinationChange={setDestinationValue}
            originTypeValue={originTypeValue}
            onOriginTypeChange={setOriginTypeValue}
            sortValue={sortValue}
            onSortChange={setSortValue}
            railValue={railValue}
            onRailChange={setRailValue}
            onReset={resetFilters}
            onApply={applyFilters}
          />
        </div>
      )}

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-[var(--color-ink-950)]/40 backdrop-blur-[1px]"
            onClick={() => setMobileOpen(false)}
            aria-label="Close filters"
          />
          <aside
            ref={mobilePanelRef}
            className="absolute inset-y-0 right-0 w-[86vw] max-w-sm border-l border-(--color-border) bg-(--color-surface-raised) p-5 shadow-[var(--shadow-lg)] safe-bottom"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-xl text-(--color-ink-950)">Filter results</h3>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="flex size-9 items-center justify-center rounded-full bg-(--color-surface-2) text-(--color-ink-700)"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>
            <FilterFields
              destinationValue={destinationValue}
              onDestinationChange={setDestinationValue}
              originTypeValue={originTypeValue}
              onOriginTypeChange={setOriginTypeValue}
              sortValue={sortValue}
              onSortChange={setSortValue}
              railValue={railValue}
              onRailChange={setRailValue}
              onReset={resetFilters}
              onApply={applyFilters}
            />
          </aside>
        </div>
      )}
    </div>
  );
}

function FilterFields({
  destinationValue,
  onDestinationChange,
  originTypeValue,
  onOriginTypeChange,
  sortValue,
  onSortChange,
  railValue,
  onRailChange,
  onReset,
  onApply,
}: {
  destinationValue: string;
  onDestinationChange: (value: string) => void;
  originTypeValue: string;
  onOriginTypeChange: (value: string) => void;
  sortValue: "price_low" | "price_high" | "popular" | "recent";
  onSortChange: (value: "price_low" | "price_high" | "popular" | "recent") => void;
  railValue: "for-you" | "following" | "trending";
  onRailChange: (value: "for-you" | "following" | "trending") => void;
  onReset: () => void;
  onApply: () => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-(--color-ink-500)">
          Destination
        </p>
        <Input
          value={destinationValue}
          onChange={(event) => onDestinationChange(event.target.value)}
          placeholder="Destination"
          className="h-11"
        />
      </div>

      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-(--color-ink-500)">
          Listing type
        </p>
        <Select
          value={originTypeValue}
          onChange={(event) => onOriginTypeChange(event.target.value)}
          options={[
            { value: "", label: "All listing types" },
            { value: "plan", label: "User plans" },
            { value: "package", label: "Agency packages" },
          ]}
          className="h-11"
        />
      </div>

      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-(--color-ink-500)">
          Sort by
        </p>
        <Select
          value={sortValue}
          onChange={(event) => onSortChange(event.target.value as "price_low" | "price_high" | "popular" | "recent")}
          options={[
            { value: "recent", label: "Most recent" },
            { value: "popular", label: "Trending" },
            { value: "price_low", label: "Price: low to high" },
            { value: "price_high", label: "Price: high to low" },
          ]}
          className="h-11"
        />
      </div>

      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-(--color-ink-500)">
          Feed rail
        </p>
        <Select
          value={railValue}
          onChange={(event) => onRailChange(event.target.value as "for-you" | "following" | "trending")}
          options={[
            { value: "for-you", label: "For You" },
            { value: "following", label: "Following" },
            { value: "trending", label: "Trending" },
          ]}
          className="h-11"
        />
      </div>

      <div className="flex items-center justify-between gap-3 pt-1">
        <Button type="button" variant="secondary" size="sm" onClick={onReset}>
          Reset
        </Button>
        <Button type="button" size="sm" onClick={onApply}>
          Apply filters
        </Button>
      </div>
    </div>
  );
}
