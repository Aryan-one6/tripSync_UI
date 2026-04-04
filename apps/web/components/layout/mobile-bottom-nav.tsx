"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  Home,
  Plus,
  MessageSquare,
  User,
  BriefcaseBusiness,
  Handshake,
  Package,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/auth-context";
import { useUnreadDirectCount } from "@/lib/realtime/use-unread-direct-count";

// ─── Nav Items ─────────────────────────────────────────────────────────────────

const USER_TABS = [
  { href: "/dashboard/feed", label: "Feed", icon: Home },
  { href: "/discover?audience=traveler", label: "Discover", icon: Compass },
  { href: "/dashboard/plans/new", label: "Create", icon: Plus, isPrimary: true },
  { href: "/dashboard/messages", label: "Messages", icon: MessageSquare },
  { href: "/dashboard/profile", label: "Profile", icon: User },
];

const AGENCY_TABS = [
  { href: "/agency/dashboard", label: "Dashboard", icon: BriefcaseBusiness },
  { href: "/agency/bids", label: "Bids", icon: Handshake },
  { href: "/agency/packages/new", label: "New Pkg", icon: Plus, isPrimary: true },
  { href: "/agency/packages", label: "Packages", icon: Package },
  { href: "/agency/inbox", label: "Inbox", icon: Inbox },
];

// ─── Tab Item ─────────────────────────────────────────────────────────────────

function TabItem({
  href,
  label,
  icon: Icon,
  active,
  isPrimary = false,
  badgeCount = 0,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  isPrimary?: boolean;
  badgeCount?: number;
}) {
  if (isPrimary) {
    return (
      <Link href={href} className="flex flex-1 flex-col items-center justify-center">
        <div
          className={cn(
            "flex size-12 items-center justify-center rounded-full shadow-[var(--shadow-md)] transition-all",
            "bg-gradient-to-b from-[var(--color-sea-400)] to-[var(--color-sea-600)] text-white",
            "active:scale-95 hover:shadow-[var(--shadow-lg)] hover:-translate-y-0.5",
          )}
        >
          <Icon className="size-5" />
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-colors",
        active
          ? "text-[var(--color-sea-700)]"
          : "text-[var(--color-ink-400)] hover:text-[var(--color-ink-700)]",
      )}
    >
      <div
        className={cn(
          "flex size-8 items-center justify-center rounded-full transition-colors",
          active && "bg-[var(--color-sea-50)]",
        )}
      >
        <span className="relative">
          <Icon
            className={cn(
              "size-5 transition-colors",
              active ? "text-[var(--color-sea-700)]" : "text-[var(--color-ink-400)]",
            )}
          />
          {badgeCount > 0 && (
            <span className="absolute -right-2 -top-1.5 flex min-w-4 items-center justify-center rounded-full bg-[var(--color-sunset-600)] px-1 text-[10px] font-semibold text-white">
              {badgeCount > 9 ? "9+" : badgeCount}
            </span>
          )}
        </span>
      </div>
      <span
        className={cn(
          "text-[9px] font-semibold uppercase tracking-wider transition-colors",
          active ? "text-[var(--color-sea-700)]" : "text-[var(--color-ink-400)]",
        )}
      >
        {label}
      </span>
    </Link>
  );
}

// ─── MobileBottomNav ─────────────────────────────────────────────────────────

export function MobileBottomNav() {
  const { session, status } = useAuth();
  const pathname = usePathname();
  const { unreadDirectCount } = useUnreadDirectCount();

  // Only show for authenticated users on mobile
  if (status !== "authenticated" || !session) return null;

  const isAgency = session.role === "agency_admin";
  const tabs = isAgency ? AGENCY_TABS : USER_TABS;

  // Determine active tab
  const activeHref = tabs
    .filter((t) => !t.isPrimary)
    .reduce<string | null>((best, tab) => {
      const tabPath = tab.href.split("?")[0] ?? tab.href;
      if (!pathname.startsWith(tabPath)) return best;
      if (!best) return tabPath;
      return tabPath.length > best.length ? tabPath : best;
    }, null);

  return (
    <nav
      className={cn(
        // Only visible below md breakpoint
        "fixed bottom-0 inset-x-0 z-40 flex md:hidden",
        "border-t border-[var(--color-border)] bg-white/95 backdrop-blur-lg",
        "safe-bottom",
      )}
      aria-label="Mobile navigation"
    >
      {tabs.map((tab) => (
        <TabItem
          key={tab.href}
          href={tab.href}
          label={tab.label}
          icon={tab.icon}
          active={activeHref === (tab.href.split("?")[0] ?? tab.href)}
          isPrimary={tab.isPrimary}
          badgeCount={
            tab.href === "/dashboard/messages" || tab.href === "/agency/inbox"
              ? unreadDirectCount
              : 0
          }
        />
      ))}
    </nav>
  );
}
