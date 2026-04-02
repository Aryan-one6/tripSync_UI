"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import {
  Bell,
  Gift,
  Inbox,
  LogOut,
  MapPinned,
  Menu,
  Settings,
  User,
  UserRoundPlus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/auth-context";
import { initials } from "@/lib/format";
import { useLiveNotifications } from "@/lib/realtime/use-live-notifications";

function UserAvatar({ name, size = 9 }: { name: string; size?: number }) {
  return (
    <div
      className={`flex size-${size} shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[var(--color-sea-500)] to-[var(--color-sea-700)] text-xs font-bold text-white`}
    >
      {initials(name)}
    </div>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const { session, status, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  const isAgency = session?.role === "agency_admin";
  const dashboardHref = isAgency ? "/agency/dashboard" : "/dashboard/plans";
  const profileHref = isAgency ? "/agency/storefront" : "/dashboard/profile";
  const settingsHref = isAgency ? "/agency/settings" : "/dashboard/settings";
  const inboxHref = isAgency ? "/agency/inbox" : "/dashboard/messages";
  const referEarnHref = "/dashboard/refer-and-earn";
  const userName = session?.user?.fullName ?? session?.user?.username ?? "User";
  const userEmail = session?.user?.email ?? "";
  const { notifications, unreadCount, markAllRead, markRead } = useLiveNotifications();
  const navLinks = [
    { href: "/discover", label: "Home" },
    { href: "/agencies", label: "Agencies" },
  ];

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
    setMobileMenuOpen(false);
    setAvatarMenuOpen(false);
    setNotificationMenuOpen(false);
  }, [pathname]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-white/95 backdrop-blur-lg">
        <div className="mx-auto container flex items-center justify-between gap-4 px-6 py-3">
          {/* Logo */}
          <Link href="/" className="flex items-center shrink-0" onClick={() => setMobileMenuOpen(false)}>
            <Image
              src="/brand/travellersin.png"
              alt="TravellersIn"
              width={312}
              height={92}
              priority
              className="h-9 w-auto sm:h-11"
            />
          </Link>

          {/* Desktop nav — direct links, no pill */}
          <nav className="hidden items-center gap-6 md:flex">
            {navLinks.map((link) => {
              const active =
                pathname === link.href ||
                pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "text-sm transition-colors duration-150",
                    active
                      ? "font-semibold text-[var(--color-sea-700)]"
                      : "text-[var(--color-ink-600)] hover:text-[var(--color-ink-900)]",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Desktop actions */}
          <div className="hidden items-center gap-2 md:flex">
            {status === "authenticated" && session ? (
              <div ref={avatarRef} className="flex items-center gap-2">
                <Link href={inboxHref}>
                  <Button type="button" variant="ghost" size="sm">
                    <Inbox className="size-4" />
                    Inbox
                  </Button>
                </Link>
                {!isAgency ? (
                  <Link href={referEarnHref}>
                    <Button type="button" variant="soft" size="sm">
                      <Gift className="size-4" />
                      Refer & Earn
                    </Button>
                  </Link>
                ) : null}
                <div className="relative" ref={notificationRef}>
                  <button
                    type="button"
                    onClick={() => setNotificationMenuOpen((v) => !v)}
                    className="relative flex size-9 items-center justify-center rounded-full text-[var(--color-ink-500)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink-900)]"
                    aria-label="Notifications"
                  >
                    <Bell className="size-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-[var(--color-sunset-600)] px-1 text-[10px] font-semibold text-white">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>
                  {notificationMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-80 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white py-2 shadow-[var(--shadow-lg)] animate-scale-in">
                      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 pb-2">
                        <p className="text-xs font-semibold text-[var(--color-ink-900)]">
                          Notifications
                        </p>
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
                              onClick={() => {
                                markRead(item.id);
                                setNotificationMenuOpen(false);
                              }}
                              className={cn(
                                "block border-b border-[var(--color-border)] px-4 py-2.5 last:border-b-0 transition hover:bg-[var(--color-surface-2)]",
                                item.read ? "" : "bg-[var(--color-sea-50)]/60",
                              )}
                            >
                              <p className="text-xs font-semibold text-[var(--color-ink-900)]">
                                {item.title}
                              </p>
                              <p className="mt-0.5 line-clamp-2 text-[11px] text-[var(--color-ink-600)]">
                                {item.body}
                              </p>
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

                {/* Avatar — click opens dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setAvatarMenuOpen((v) => !v)}
                    className="flex items-center rounded-full border border-[var(--color-border)] shadow-[var(--shadow-sm)] transition hover:shadow-[var(--shadow-md)]"
                    aria-label="Account menu"
                  >
                    <UserAvatar name={userName} size={9} />
                  </button>

                  {avatarMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-52 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white py-1.5 shadow-[var(--shadow-lg)] animate-scale-in">
                      <div className="border-b border-[var(--color-border)] px-4 pb-2 pt-1">
                        <p className="truncate text-xs font-semibold text-[var(--color-ink-950)]">{userName}</p>
                        <p className="truncate text-[11px] text-[var(--color-ink-500)]">{userEmail}</p>
                      </div>
                      <Link
                        href={dashboardHref}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-ink-700)] transition hover:bg-[var(--color-surface-2)]"
                      >
                        <MapPinned className="size-4 text-[var(--color-sea-600)]" />
                        {session.role === "agency_admin" ? "Agency Dashboard" : "Dashboard"}
                      </Link>
                      <Link
                        href={profileHref}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-ink-700)] transition hover:bg-[var(--color-surface-2)]"
                      >
                        <User className="size-4 text-[var(--color-sea-600)]" />
                        {isAgency ? "Storefront" : "Profile"}
                      </Link>
                      <Link
                        href={inboxHref}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-ink-700)] transition hover:bg-[var(--color-surface-2)]"
                      >
                        <Inbox className="size-4 text-[var(--color-sea-600)]" />
                        Inbox
                      </Link>
                      {!isAgency ? (
                        <Link
                          href={referEarnHref}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-ink-700)] transition hover:bg-[var(--color-surface-2)]"
                        >
                          <Gift className="size-4 text-[var(--color-sea-600)]" />
                          Refer & Earn
                        </Link>
                      ) : null}
                      <Link
                        href={settingsHref}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-ink-700)] transition hover:bg-[var(--color-surface-2)]"
                      >
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
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">Log In</Button>
                </Link>
                <Link href="/signup/traveler">
                  <Button size="sm">
                    <UserRoundPlus className="size-4" />
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            className="flex size-9 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-ink-700)] transition-colors hover:bg-[var(--color-surface-3)] md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </header>

      {/* Mobile slide-down panel */}
      {mobileMenuOpen && (
        <div className="fixed inset-x-0 top-[57px] z-30 md:hidden">
          <div className="absolute inset-0 bg-[var(--color-ink-950)]/20" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative border-b border-[var(--color-border)] bg-white/98 backdrop-blur-lg px-4 pb-5 pt-3 shadow-[var(--shadow-lg)]">
            <nav className="space-y-0.5">
              {navLinks.map((link) => {
                const active =
                  pathname === link.href ||
                  pathname.startsWith(`${link.href}/`);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-4 py-3 text-sm font-medium transition-colors",
                      active
                        ? "bg-[var(--color-sea-50)] text-[var(--color-sea-700)]"
                        : "text-[var(--color-ink-700)] hover:bg-[var(--color-surface-2)]",
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <div className="my-3 h-px bg-[var(--color-border)]" />

            <div className="space-y-1">
              {status === "authenticated" && session ? (
                <>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <UserAvatar name={userName} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--color-ink-950)]">{userName}</p>
                      <p className="truncate text-xs text-[var(--color-ink-500)]">{userEmail}</p>
                    </div>
                  </div>
                  <div className="mx-4 mb-2 flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-xs text-[var(--color-ink-700)]">
                    <span className="inline-flex items-center gap-1.5">
                      <Bell className="size-3.5" />
                      Notifications
                    </span>
                    <span className="font-semibold">{unreadCount}</span>
                  </div>
                  <div className="my-2 h-px bg-[var(--color-border)]" />
                  <Link
                    href={dashboardHref}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-md px-4 py-3 text-sm font-medium text-[var(--color-ink-700)] transition hover:bg-[var(--color-surface-2)]"
                  >
                    <MapPinned className="size-4 text-[var(--color-sea-600)]" />
                    {session.role === "agency_admin" ? "Agency Dashboard" : "Dashboard"}
                  </Link>
                  <Link
                    href={profileHref}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-md px-4 py-3 text-sm font-medium text-[var(--color-ink-700)] transition hover:bg-[var(--color-surface-2)]"
                  >
                    <User className="size-4 text-[var(--color-sea-600)]" />
                    {isAgency ? "Storefront" : "Profile"}
                  </Link>
                  <Link
                    href={inboxHref}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-md px-4 py-3 text-sm font-medium text-[var(--color-ink-700)] transition hover:bg-[var(--color-surface-2)]"
                  >
                    <Inbox className="size-4 text-[var(--color-sea-600)]" />
                    Inbox
                  </Link>
                  {!isAgency ? (
                    <Link
                      href={referEarnHref}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 rounded-md px-4 py-3 text-sm font-medium text-[var(--color-ink-700)] transition hover:bg-[var(--color-surface-2)]"
                    >
                      <Gift className="size-4 text-[var(--color-sea-600)]" />
                      Refer & Earn
                    </Link>
                  ) : null}
                  <Link
                    href={settingsHref}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-md px-4 py-3 text-sm font-medium text-[var(--color-ink-700)] transition hover:bg-[var(--color-surface-2)]"
                  >
                    <Settings className="size-4 text-[var(--color-sea-600)]" />
                    Settings
                  </Link>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-md px-4 py-3 text-sm font-medium text-[var(--color-sunset-600)] transition hover:bg-[var(--color-sunset-50)]"
                    onClick={() => { setMobileMenuOpen(false); logout(); }}
                  >
                    <LogOut className="size-4" />
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full">Log In</Button>
                  </Link>
                  <Link href="/signup/traveler" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full">
                      <UserRoundPlus className="size-4" />
                      Sign Up
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
