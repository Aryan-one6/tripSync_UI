"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Compass,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Menu,
  UserRoundPlus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/auth-context";

const links = [
  { href: "/", label: "Home" },
  { href: "/discover", label: "Discover" },
  { href: "/agencies", label: "Agencies" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { session, status, logout, switchRole } = useAuth();
  const [isPending, startTransition] = useTransition();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dashboardHref = session?.role === "agency_admin" ? "/agency/dashboard" : "/dashboard/plans";
  const canSwitchToAgency =
    session?.role === "user" && session.availableRoles.includes("agency_admin");
  const canSwitchToUser =
    session?.role === "agency_admin" && session.availableRoles.includes("user");

  return (
    <>
      <header className="sticky top-0 z-40 safe-top">
        <div className="mx-auto max-w-[1500px] px-4 pt-3 md:px-6">
          <div className="flex items-center justify-between gap-4 rounded-[var(--radius-xl)] border border-white/60 bg-[var(--color-surface-raised)]/90 px-4 py-3 shadow-[var(--shadow-clay)] backdrop-blur-xl md:px-6">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3" onClick={() => setMobileMenuOpen(false)}>
              <div className="flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-gradient-to-b from-[var(--color-sea-400)] to-[var(--color-sea-700)] text-white shadow-[var(--shadow-clay-sea)]">
                <Compass className="size-5" />
              </div>
              <div className="hidden sm:block">
                <p className="font-display text-lg text-[var(--color-ink-950)]">TripSync</p>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-ink-500)]">
                  Social Travel
                </p>
              </div>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden items-center gap-1 rounded-full border border-white/50 bg-[var(--color-surface-2)] p-1 shadow-[var(--shadow-clay-inset)] md:flex">
              {links.map((link) => {
                const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(`${link.href}/`));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "rounded-full px-5 py-2 text-sm font-medium transition-all duration-200",
                      active
                        ? "bg-[var(--color-surface-raised)] text-[var(--color-sea-700)] shadow-[var(--shadow-clay-sm)]"
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
                <>
                  {canSwitchToAgency && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        startTransition(async () => {
                          await switchRole("agency_admin");
                          router.push("/agency/dashboard");
                        })
                      }
                      disabled={isPending}
                    >
                      {isPending ? "Switching..." : "Agency Mode"}
                    </Button>
                  )}
                  {canSwitchToUser && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        startTransition(async () => {
                          await switchRole("user");
                          router.push("/dashboard/plans");
                        })
                      }
                      disabled={isPending}
                    >
                      {isPending ? "Switching..." : "Traveler Mode"}
                    </Button>
                  )}
                  <Link href={dashboardHref}>
                    <Button variant="secondary" size="sm">
                      <LayoutDashboard className="size-4" />
                      {session.role === "agency_admin" ? "Agency" : "Dashboard"}
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={logout}>
                    <LogOut className="size-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/signup/traveler">
                    <Button variant="secondary" size="sm">
                      <UserRoundPlus className="size-4" />
                      Sign up
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button size="sm">
                      <MapPinned className="size-4" />
                      Login
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              type="button"
              className="flex size-10 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-ink-700)] shadow-[var(--shadow-clay-sm)] transition-all active:shadow-[var(--shadow-clay-btn-active)] md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-30 md:hidden">
          <div className="absolute inset-0 bg-[var(--color-ink-950)]/30 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute left-4 right-4 top-20 animate-scale-in rounded-[var(--radius-xl)] border border-white/60 bg-[var(--color-surface-raised)] p-5 shadow-[var(--shadow-clay-lg)]">
            {/* Nav links */}
            <nav className="space-y-1">
              {links.map((link) => {
                const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(`${link.href}/`));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-[var(--radius-md)] px-4 py-3.5 text-sm font-medium transition-all",
                      active
                        ? "bg-[var(--color-sea-50)] text-[var(--color-sea-700)] shadow-[var(--shadow-clay-sm)]"
                        : "text-[var(--color-ink-700)] hover:bg-[var(--color-surface-2)]",
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <div className="my-4 h-px bg-[var(--color-line)]" />

            {/* Auth actions */}
            <div className="space-y-2">
              {status === "authenticated" && session ? (
                <>
                  {canSwitchToAgency && (
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        startTransition(async () => {
                          await switchRole("agency_admin");
                          router.push("/agency/dashboard");
                        });
                      }}
                      disabled={isPending}
                    >
                      {isPending ? "Switching..." : "Switch to Agency"}
                    </Button>
                  )}
                  {canSwitchToUser && (
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        startTransition(async () => {
                          await switchRole("user");
                          router.push("/dashboard/plans");
                        });
                      }}
                      disabled={isPending}
                    >
                      {isPending ? "Switching..." : "Switch to Traveler"}
                    </Button>
                  )}
                  <Link href={dashboardHref} onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="secondary" className="w-full">
                      <LayoutDashboard className="size-4" />
                      {session.role === "agency_admin" ? "Agency Dashboard" : "My Dashboard"}
                    </Button>
                  </Link>
                  <Button variant="ghost" className="w-full justify-start text-[var(--color-sunset-600)]" onClick={() => { setMobileMenuOpen(false); logout(); }}>
                    <LogOut className="size-4" />
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full">
                      <MapPinned className="size-4" />
                      Login
                    </Button>
                  </Link>
                  <Link href="/signup/traveler" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="secondary" className="w-full">
                      <UserRoundPlus className="size-4" />
                      Create Account
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
