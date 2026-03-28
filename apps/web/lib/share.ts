import { SITE_URL } from "@/lib/config";

export function buildAbsoluteUrl(path: string) {
  return new URL(path.startsWith("/") ? path : `/${path}`, SITE_URL).toString();
}

export function buildWhatsAppShareHref(text: string, path?: string) {
  const message = path ? `${text}\n${buildAbsoluteUrl(path)}` : text;
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function compactDescription(input: string, fallback: string, maxLength = 160) {
  const source = (input || fallback).trim();
  if (source.length <= maxLength) return source;
  return `${source.slice(0, maxLength - 1).trimEnd()}…`;
}
