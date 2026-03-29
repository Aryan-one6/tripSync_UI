"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import {
  Bell,
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

const links = [
  { href: "/", label: "Home" },
  { href: "/discover", label: "Discover" },
  { href: "/agencies", label: "Agencies" },
];

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
  const avatarRef = useRef<HTMLDivElement>(null);

  const dashboardHref =
    session?.role === "agency_admin" ? "/agency/dashboard" : "/dashboard/plans";
  const profileHref = "/dashboard/profile";
  const settingsHref = "/dashboard/settings";
  const userName = session?.user?.fullName ?? session?.user?.username ?? "User";
  const userEmail = session?.user?.email ?? "";

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarMenuOpen(false);
      }
    }
    if (avatarMenuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [avatarMenuOpen]);

  useEffect(() => {
    setMobileMenuOpen(false);
    setAvatarMenuOpen(false);
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
            {links.map((link) => {
              const active =
                pathname === link.href ||
                (link.href !== "/" && pathname.startsWith(`${link.href}/`));
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
                {/* Notification bell */}
                <button
                  type="button"
                  className="flex size-9 items-center justify-center rounded-full text-[var(--color-ink-500)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink-900)]"
                  aria-label="Notifications"
                >
                  <Bell className="size-5" />
                </button>

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
                        Profile
                      </Link>
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
              {links.map((link) => {
                const active =
                  pathname === link.href ||
                  (link.href !== "/" && pathname.startsWith(`${link.href}/`));
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
                    Profile
                  </Link>
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
