"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { PageLoader } from "@/components/ui/page-loader";

const SHOW_DELAY_MS = 80;
const MIN_VISIBLE_MS = 240;

function isSameRoute(url: URL) {
  return (
    url.pathname === window.location.pathname &&
    url.search === window.location.search
  );
}

function shouldStartLoader(event: MouseEvent, anchor: HTMLAnchorElement) {
  if (event.defaultPrevented) return false;
  if (event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  if (anchor.hasAttribute("download")) return false;

  const target = anchor.getAttribute("target");
  if (target && target !== "_self") return false;

  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#")) return false;

  let nextUrl: URL;
  try {
    nextUrl = new URL(anchor.href, window.location.href);
  } catch {
    return false;
  }

  if (nextUrl.origin !== window.location.origin) return false;
  if (isSameRoute(nextUrl)) return false;

  return true;
}

export function RouteLoaderOverlay() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = useMemo(
    () => `${pathname}?${searchParams.toString()}`,
    [pathname, searchParams]
  );

  const mountedRef = useRef(false);
  const pendingRef = useRef(false);
  const showTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const shownAtRef = useRef<number | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }

    if (!pendingRef.current) return;
    pendingRef.current = false;

    if (showTimerRef.current) {
      window.clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }

    const hideLoader = () => {
      setVisible(false);
      shownAtRef.current = null;
    };

    if (!shownAtRef.current) {
      hideLoader();
      return;
    }

    const elapsed = Date.now() - shownAtRef.current;
    const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);

    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(hideLoader, remaining);
  }, [routeKey]);

  useEffect(() => {
    const startPendingLoader = () => {
      if (showTimerRef.current) window.clearTimeout(showTimerRef.current);
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }

      pendingRef.current = true;
      showTimerRef.current = window.setTimeout(() => {
        if (!pendingRef.current) return;
        shownAtRef.current = Date.now();
        setVisible(true);
      }, SHOW_DELAY_MS);
    };

    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (!shouldStartLoader(event, anchor)) return;

      startPendingLoader();
    };

    const onPopState = () => {
      startPendingLoader();
    };

    document.addEventListener("click", onDocumentClick);
    window.addEventListener("popstate", onPopState);

    return () => {
      document.removeEventListener("click", onDocumentClick);
      window.removeEventListener("popstate", onPopState);
      if (showTimerRef.current) window.clearTimeout(showTimerRef.current);
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[125] flex items-center justify-center">
      <PageLoader label="Loading next page" />
    </div>
  );
}
