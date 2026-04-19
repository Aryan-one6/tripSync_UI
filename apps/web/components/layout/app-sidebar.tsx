"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  Compass,
  Eye,
  FilePlus2,
  Gift,
  Handshake,
  LayoutDashboard,
  MessageSquareText,
  Package,
  Route,
  Settings,
  Store,
  Ticket,
  Wallet,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const userNavMain = [
  { href: "/discover?audience=traveler", label: "Discover", icon: Compass },
  { href: "/dashboard/plans", label: "My Plans", icon: Route },
  { href: "/dashboard/plans/new", label: "Create Plan", icon: FilePlus2 },
  { href: "/dashboard/trips", label: "My Trips", icon: Ticket },
  { href: "/dashboard/messages", label: "Messages", icon: MessageSquareText },
];

const userNavSecondary = [
  { href: "/dashboard/profile", label: "Profile", icon: User },
  { href: "/dashboard/storefront", label: "Public Profile", icon: Eye },
  { href: "/dashboard/wallet", label: "Wallet", icon: Wallet },
  { href: "/dashboard/refer-and-earn", label: "Refer & Earn", icon: Gift },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

const agencyNavMain = [
  { href: "/agency/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/agency/inbox", label: "Inbox", icon: MessageSquareText },
  { href: "/agency/packages", label: "My Packages", icon: Package },
  { href: "/agency/packages/new", label: "Create Package", icon: FilePlus2 },
  { href: "/agency/bids", label: "Bid Manager", icon: Handshake },
  { href: "/agency/referrals", label: "Referrals", icon: BriefcaseBusiness },
];

const agencyNavSecondary = [
  { href: "/agency/storefront", label: "Storefront", icon: Store },
  { href: "/agency/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/agency/settings", label: "Verification", icon: Settings },
];

function NavItem({
  href,
  label,
  icon: Icon,
  pathname,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  pathname: string;
  onNavigate?: () => void;
}) {
  const activePath = href.split("?")[0] ?? href;
  const active =
    pathname === activePath || (activePath !== "/discover" && pathname.startsWith(`${activePath}/`));
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-150",
        active
          ? "border border-(--color-sea-100) bg-(--color-sea-50) text-(--color-sea-700)"
          : "border border-transparent text-(--color-ink-600) hover:bg-(--color-surface-2)",
      )}
    >
      <Icon className={cn("size-4", active ? "text-(--color-sea-500)" : "")} />
      {label}
    </Link>
  );
}

export function AppSidebar({
  variant,
  onNavigate,
}: {
  variant: "user" | "agency";
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const title = variant === "agency" ? "Agency Console" : "My Space";
  const Icon = variant === "agency" ? Building2 : Compass;
  const mainItems = variant === "agency" ? agencyNavMain : userNavMain;
  const secondaryItems = variant === "agency" ? agencyNavSecondary : userNavSecondary;

  return (
    <aside className="rounded-xl border border-(--color-border) bg-(--color-surface-raised) p-4 shadow-(--shadow-sm) sm:p-5">
      {/* Sidebar header */}
      <div className="mb-5 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-md border border-(--color-border) bg-(--color-surface-2) text-(--color-ink-700)">
          <Icon className="size-5" />
        </div>
        <div>
          <p className="font-display text-base text-(--color-ink-950)">{title}</p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-(--color-ink-500)">
            Navigation
          </p>
        </div>
      </div>

      {/* Main nav items */}
      <nav className="space-y-0.5">
        {mainItems.map((item) => (
          <NavItem key={item.href} {...item} pathname={pathname} onNavigate={onNavigate} />
        ))}
      </nav>

      {/* Divider */}
      <div className="my-3 border-t border-(--color-border)" />

      {/* Secondary nav items */}
      <nav className="space-y-0.5">
        {secondaryItems.map((item) => (
          <NavItem key={item.href} {...item} pathname={pathname} onNavigate={onNavigate} />
        ))}
      </nav>
    </aside>
  );
}
