"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
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
  const { session, status, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dashboardHref = session?.role === "agency_admin" ? "/agency/dashboard" : "/dashboard/feed";

  return (
    <>
      <header className="sticky top-0 z-40 safe-top">
        <div className="mx-auto container px-4 pt-3 md:px-6">
          <div className="flex items-center justify-between gap-4 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface-raised)]/95 px-4 py-3 shadow-[var(--shadow-md)] backdrop-blur-md md:px-6">
            {/* Logo */}
            <Link href="/" className="flex items-center" onClick={() => setMobileMenuOpen(false)}>
              <Image
                src="/brand/travellersin.png"
                alt="TravellersIn"
                width={312}
                height={92}
                priority
                className="h-10 w-auto sm:h-12"
              />
            </Link>

            {/* Desktop nav */}
            <nav className="hidden items-center gap-0.5 rounded-full border border-(--color-border) bg-(--color-surface-2) p-1 md:flex">
              {links.map((link) => {
                const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(`${link.href}/`));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "rounded-full px-5 py-2 text-sm font-medium transition-all duration-200",
                      active
                        ? "bg-(--color-surface-raised) text-(--color-sea-700) shadow-(--shadow-sm)"
                        : "text-(--color-ink-600) hover:text-foreground hover:bg-white/60",
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
              className="flex size-9 items-center justify-center rounded-md border border-(--color-border) bg-(--color-surface-2) text-(--color-ink-700) transition-colors hover:bg-(--color-surface-3) md:hidden"
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
          <div className="absolute inset-0 bg-(--color-ink-950)/20 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute left-4 right-4 top-20 animate-scale-in rounded-[var(--radius-xl)] border border-(--color-border) bg-(--color-surface-raised) p-5 shadow-(--shadow-lg)">
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
                      "flex items-center gap-3 rounded-md px-4 py-3 text-sm font-medium transition-colors",
                      active
                        ? "bg-(--color-sea-50) text-(--color-sea-700)"
                        : "text-(--color-ink-700) hover:bg-(--color-surface-2)",
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <div className="my-4 h-px bg-(--color-border)" />

            {/* Auth actions */}
            <div className="space-y-2">
              {status === "authenticated" && session ? (
                <>
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
