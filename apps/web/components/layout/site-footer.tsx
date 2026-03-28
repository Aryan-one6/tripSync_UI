import Image from "next/image";
import { Heart } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="relative mt-12 overflow-hidden">
      {/* Decorative top wave */}
      <div className="h-16 bg-gradient-to-b from-transparent to-[var(--color-surface-2)]" />

      <div className="bg-[var(--color-surface-2)]">
        <div className="page-shell pb-8 pt-4">
          <div className="rounded-[var(--radius-xl)] border border-white/60 bg-[var(--color-surface-raised)] p-5 shadow-[var(--shadow-clay)] sm:p-6">
            {/* Decorative blobs */}
            <div className="clay-blob -top-16 right-10 size-36 bg-[var(--color-sea-200)] opacity-15 animate-blob" />
            <div className="clay-blob -bottom-10 left-20 size-28 bg-[var(--color-sunset-200)] opacity-10 animate-blob delay-300" />

            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              {/* Brand */}
              <div className="flex items-center gap-3">
                <Image
                  src="/brand/travellersin.png"
                  alt="TravellersIn"
                  width={312}
                  height={92}
                  className="h-11 w-auto sm:h-12"
                />
              </div>

              {/* Credits */}
              <p className="flex items-center gap-1.5 text-xs text-[var(--color-ink-500)]">
                Built with <Heart className="size-3 fill-[var(--color-sunset-400)] text-[var(--color-sunset-400)]" /> for travelers everywhere
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
