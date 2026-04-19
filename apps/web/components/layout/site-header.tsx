"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  Building2,
  Compass,
  Eye,
  FilePlus2,
  Gift,
  Handshake,
  Inbox,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  Package,
  Route,
  Settings,
  Store,
  Ticket,
  User,
  UserRoundPlus,
  X,
  Menu,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/auth-context";
import { initials } from "@/lib/format";
import { useLiveNotifications } from "@/lib/realtime/use-live-notifications";
import { useUnreadDirectCount } from "@/lib/realtime/use-unread-direct-count";
import { WalletMenu } from "@/components/wallet/wallet-menu";

// ─── Shared nav config (mirrors app-sidebar) ─────────────────────────────────

const userNavMain = [
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/dashboard/plans", label: "My Plans", icon: Route },
  { href: "/dashboard/plans/new", label: "Create Plan", icon: FilePlus2 },
  { href: "/dashboard/trips", label: "My Trips", icon: Ticket },
  { href: "/dashboard/messages", label: "Messages", icon: MessageSquareText },
];
const userNavSecondary = [
  { href: "/dashboard/profile", label: "Profile", icon: User },
  { href: "/dashboard/storefront", label: "Public Profile", icon: Eye },
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function UserAvatar({
  name,
  avatarUrl,
  size = 9,
}: {
  name: string;
  avatarUrl?: string | null;
  size?: number;
}) {
  const dimension = `${size * 0.25}rem`;

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="shrink-0 rounded-full object-cover"
        style={{ width: dimension, height: dimension }}
      />
    );
  }

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[var(--color-sea-500)] to-[var(--color-sea-700)] text-xs font-bold text-white"
      style={{ width: dimension, height: dimension }}
    >
      {initials(name)}
    </div>
  );
}

function SidebarNavItem({
  href,
  label,
  icon: Icon,
  pathname,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  pathname: string;
  onClick: () => void;
}) {
  const activePath = href.split("?")[0] ?? href;
  const active =
    pathname === activePath ||
    (activePath !== "/discover" && pathname.startsWith(`${activePath}/`));
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-[var(--color-sea-50)] text-[var(--color-sea-700)] border border-[var(--color-sea-100)]"
          : "text-[var(--color-ink-600)] hover:bg-[var(--color-surface-2)] border border-transparent"
      )}
    >
      <Icon className={cn("size-4 shrink-0", active ? "text-[var(--color-sea-500)]" : "")} />
      {label}
      {active && <ChevronRight className="ml-auto size-3.5 text-[var(--color-sea-400)]" />}
    </Link>
  );
}

// ─── Main Header ─────────────────────────────────────────────────────────────

export function SiteHeader() {
  const pathname = usePathname();
  const { session, status, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  const isHomepage = pathname === "/";
  const isTransparent = isHomepage && !scrolled;

  const isAgency = session?.role === "agency_admin";
  const discoverHref = `/discover?audience=${isAgency ? "agency" : "traveler"}`;
  const dashboardHref = isAgency ? "/agency/dashboard" : "/dashboard/plans";
  const settingsHref = isAgency ? "/agency/settings" : "/dashboard/settings";
  const inboxHref = isAgency ? "/agency/inbox" : "/dashboard/messages";
  const userName = session?.user?.fullName ?? session?.user?.username ?? "User";
  const userAvatarUrl = session?.user?.avatarUrl;
  const userEmail = session?.user?.email ?? "";
  const isMobileMessengerRoute =
    pathname === "/dashboard/messages" ||
    pathname === "/agency/inbox" ||
    pathname.startsWith("/dashboard/messages/") ||
    pathname.startsWith("/agency/inbox/");
  const { notifications, unreadCount, markAllRead, markRead } = useLiveNotifications();
  const { unreadDirectCount } = useUnreadDirectCount({
    enabled: !isMobileMessengerRoute,
  });

  const publicNavLinks = [
    { href: discoverHref, label: "Home" },
    { href: "/agencies", label: "Agencies" },
  ];

  const mainNav = isAgency ? agencyNavMain : userNavMain;
  const secondaryNav = isAgency ? agencyNavSecondary : userNavSecondary;
  const sidebarIcon = isAgency ? Building2 : Compass;
  const sidebarTitle = isAgency ? "Agency Console" : "My Space";
  const SidebarIcon = sidebarIcon;

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 20); }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarMenuOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setNotificationMenuOpen(false);
      }
    }
    if (avatarMenuOpen || notificationMenuOpen) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [avatarMenuOpen, notificationMenuOpen]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setSidebarOpen(false);
      setAvatarMenuOpen(false);
      setNotificationMenuOpen(false);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  // Prevent body scroll when sidebar open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  return (
    <>
      {/* ── Sticky header bar ─────────────────────────────────────── */}
      <header
        className={cn(
          "sticky top-0 z-40 transition-all duration-300",
          isTransparent
            ? "border-b border-transparent bg-transparent shadow-none"
            : "border-b border-[var(--color-border)] bg-white/95 backdrop-blur-xl shadow-[var(--shadow-sm)]",
          isMobileMessengerRoute && "hidden md:block",
        )}
      >
        <div className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between gap-4 px-4 sm:px-6">

          {/* Logo */}
          <Link href="/" className="flex shrink-0 items-center">
            <Image
              src={isTransparent ? "/brand/travellersin-light.png" : "/brand/travellersin.png"}
              alt="TravellersIn"
              width={312}
              height={92}
              priority
              className="h-8 w-auto sm:h-9"
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {publicNavLinks.map((link) => {
              const activePath = link.href.split("?")[0] ?? link.href;
              const active =
                pathname === activePath ||
                pathname.startsWith(`${activePath}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  style={isTransparent ? { color: "#ffffff" } : undefined}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    isTransparent
                      ? active
                        ? "bg-white/20 !text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.45)]"
                        : "!text-white hover:bg-white/15 drop-shadow-[0_1px_1px_rgba(0,0,0,0.45)]"
                      : active
                        ? "bg-[var(--color-sea-50)] text-[var(--color-sea-700)]"
                        : "text-[var(--color-ink-600)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink-900)]"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {status === "authenticated" && session && (
              <div className="relative" ref={notificationRef}>
                <button
                  type="button"
                  onClick={() => setNotificationMenuOpen((v) => !v)}
                  className={cn(
                    "relative flex size-9 items-center justify-center rounded-full transition",
                    isTransparent
                      ? "text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.55)] hover:bg-white/15 hover:text-white"
                      : "text-[var(--color-ink-500)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink-900)]",
                  )}
                  aria-label="Notifications"
                >
                  <Bell className="size-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-[var(--color-sunset-600)] px-1 text-[10px] font-semibold text-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
                {notificationMenuOpen && (
                  <div className="absolute right-0 top-full z-[60] mt-2 w-80 rounded-xl border border-[var(--color-border)] bg-white py-2 shadow-[var(--shadow-lg)] animate-scale-in">
                    <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 pb-2">
                      <p className="text-xs font-semibold text-[var(--color-ink-900)]">Notifications</p>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={markAllRead}
                          className="text-[11px] font-medium text-[var(--color-sea-700)] hover:text-[var(--color-sea-600)]"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-96 overflow-y-auto py-1">
                      {notifications.length === 0 ? (
                        <p className="px-4 py-5 text-center text-xs text-[var(--color-ink-500)]">
                          No notifications yet.
                        </p>
                      ) : (
                        notifications.slice(0, 12).map((item) => (
                          <Link
                            key={item.id}
                            href={item.href}
                            onClick={() => { markRead(item.id); setNotificationMenuOpen(false); }}
                            className={cn(
                              "block border-b border-[var(--color-border)] px-4 py-2.5 last:border-b-0 transition hover:bg-[var(--color-surface-2)]",
                              item.read ? "" : "bg-[var(--color-sea-50)]/60"
                            )}
                          >
                            <p className="text-xs font-semibold text-[var(--color-ink-900)]">{item.title}</p>
                            <p className="mt-0.5 line-clamp-2 text-[11px] text-[var(--color-ink-600)]">{item.body}</p>
                            <p className="mt-1 text-[10px] text-[var(--color-ink-400)]">
                              {new Date(item.createdAt).toLocaleString()}
                            </p>
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Desktop right actions */}
            <div className="hidden items-center gap-2 md:flex">
              {status === "authenticated" && session ? (
                <>
                  <WalletMenu />
                  <div ref={avatarRef} className="flex items-center gap-2">
                <Link href={inboxHref}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={cn(
                      isTransparent &&
                        "text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.55)] hover:bg-white/15 hover:text-white",
                    )}
                  >
                    <span className="relative">
                      <Inbox className="size-4" />
                      {unreadDirectCount > 0 && (
                        <span className="absolute -right-1.5 -top-1.5 flex min-w-4 items-center justify-center rounded-full bg-[var(--color-sunset-600)] px-1 text-[10px] font-semibold text-white">
                          {unreadDirectCount > 9 ? "9+" : unreadDirectCount}
                        </span>
                      )}
                    </span>
                    Inbox
                  </Button>
                </Link>
                {!isAgency && (
                  <Link href="/dashboard/refer-and-earn">
                    <Button type="button" variant="soft" size="sm">
                      <Gift className="size-4" />
                      Refer &amp; Earn
                    </Button>
                  </Link>
                )}

                {/* Avatar dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setAvatarMenuOpen((v) => !v)}
                    className="flex items-center rounded-full border border-[var(--color-border)] shadow-[var(--shadow-sm)] transition hover:shadow-[var(--shadow-md)]"
                    aria-label="Account menu"
                  >
                    <UserAvatar name={userName} avatarUrl={userAvatarUrl} size={9} />
                  </button>
                  {avatarMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-[var(--color-border)] bg-white py-1.5 shadow-[var(--shadow-lg)] animate-scale-in">
                      <div className="border-b border-[var(--color-border)] px-4 pb-2 pt-1">
                        <p className="truncate text-xs font-semibold text-[var(--color-ink-950)]">{userName}</p>
                        <p className="truncate text-[11px] text-[var(--color-ink-500)]">{userEmail}</p>
                      </div>
                      <Link href={dashboardHref} className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-ink-700)] transition hover:bg-[var(--color-surface-2)]">
                        <LayoutDashboard className="size-4 text-[var(--color-sea-600)]" />
                        {isAgency ? "Agency Dashboard" : "Dashboard"}
                      </Link>
                      <Link href={settingsHref} className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-ink-700)] transition hover:bg-[var(--color-surface-2)]">
                        <Settings className="size-4 text-[var(--color-sea-600)]" />
                        Settings
                      </Link>
                      <div className="my-1 border-t border-[var(--color-border)]" />
                      <button
                        type="button"
                        onClick={() => { setAvatarMenuOpen(false); logout(); }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-sunset-600)] transition hover:bg-[var(--color-sunset-50)]"
                      >
                        <LogOut className="size-4" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
                  </div>
                </>
            ) : (
              <>
                <Link href="/login">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={isTransparent ? "text-white hover:bg-white/15" : ""}
                  >
                    Log In
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm">
                    <UserRoundPlus className="size-4" />
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
            </div>

            {/* Mobile: hamburger */}
            <button
              type="button"
              className={cn(
                "flex size-10 items-center justify-center  md:hidden",
                isTransparent
                  ? " text-white "
                  : " text-[var(--color-ink-700)] "
              )}
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile slide-in sidebar ──────────────────────────────── */}
      {!isMobileMessengerRoute && (
        <div
          className={cn(
            "fixed inset-0 z-50 md:hidden",
            sidebarOpen ? "pointer-events-auto" : "pointer-events-none",
          )}
          aria-modal="true"
          role="dialog"
        >
        <div
          className={cn(
            "absolute inset-0 bg-[var(--color-ink-950)]/50 backdrop-blur-sm transition-opacity duration-200",
            sidebarOpen ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setSidebarOpen(false)}
        />

        <div
          className={cn(
            "absolute inset-y-0 left-0 flex w-[86vw] max-w-[340px] flex-col border-r border-[var(--color-border)] bg-white shadow-[var(--shadow-xl)] transition-transform duration-300 ease-out",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--color-border)] px-4">
            <Image
              src="/brand/travellersin.png"
              alt="TravellersIn"
              width={312}
              height={92}
              className="h-7 w-auto"
            />
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="flex size-8 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-ink-600)]"
              aria-label="Close menu"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {status === "authenticated" && session ? (
              <>
                <div className="mb-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar name={userName} avatarUrl={userAvatarUrl} size={10} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[var(--color-ink-950)]">{userName}</p>
                      <p className="truncate text-[11px] text-[var(--color-ink-500)]">{userEmail}</p>
                    </div>
                    {unreadCount > 0 && (
                      <span className="ml-auto flex min-w-5 items-center justify-center rounded-full bg-[var(--color-sunset-600)] px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mb-1 flex items-center gap-2 px-3">
                  <div className="flex size-6 items-center justify-center rounded-md bg-[var(--color-surface-2)] text-[var(--color-ink-700)]">
                    <SidebarIcon className="size-3.5" />
                  </div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--color-ink-400)]">
                    {sidebarTitle}
                  </p>
                </div>

                {mainNav.map((item) => (
                  <SidebarNavItem
                    key={item.href}
                    href={item.href === "/discover" ? discoverHref : item.href}
                    label={item.label}
                    icon={item.icon}
                    pathname={pathname}
                    onClick={() => setSidebarOpen(false)}
                  />
                ))}

                <div className="my-2 border-t border-[var(--color-border)]" />
                <p className="px-3 pb-1 text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--color-ink-400)]">
                  Account
                </p>

                {secondaryNav.map((item) => (
                  <SidebarNavItem
                    key={item.href}
                    {...item}
                    pathname={pathname}
                    onClick={() => setSidebarOpen(false)}
                  />
                ))}

                <div className="my-2 border-t border-[var(--color-border)]" />

                {publicNavLinks.map((link) => {
                  const activePath = link.href.split("?")[0] ?? link.href;
                  const active =
                    pathname === activePath ||
                    pathname.startsWith(`${activePath}/`);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                        active
                          ? "border-[var(--color-sea-100)] bg-[var(--color-sea-50)] text-[var(--color-sea-700)]"
                          : "border-transparent text-[var(--color-ink-600)] hover:bg-[var(--color-surface-2)]",
                      )}
                    >
                      <Compass className="size-4 shrink-0" />
                      {link.label}
                    </Link>
                  );
                })}
              </>
            ) : (
              <>
                {publicNavLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setSidebarOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--color-ink-700)] transition hover:bg-[var(--color-surface-2)]"
                  >
                    <Compass className="size-4 shrink-0" />
                    {link.label}
                  </Link>
                ))}
                <div className="mt-4 space-y-2 px-1">
                  <Link href="/login" onClick={() => setSidebarOpen(false)}>
                    <Button variant="ghost" className="w-full">Log In</Button>
                  </Link>
                  <Link href="/signup/traveler" onClick={() => setSidebarOpen(false)}>
                    <Button className="w-full">
                      <UserRoundPlus className="size-4" />
                      Sign Up
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </div>

          {status === "authenticated" && session && (
            <div className="safe-bottom shrink-0 border-t border-[var(--color-border)] px-3 py-3">
              <button
                type="button"
                onClick={() => { setSidebarOpen(false); logout(); }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--color-sunset-600)] transition hover:bg-[var(--color-sunset-50)]"
              >
                <LogOut className="size-4" />
                Logout
              </button>
            </div>
          )}
        </div>
        </div>
      )}
    </>
  );
}
