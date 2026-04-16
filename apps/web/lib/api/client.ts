import { API_BASE_URL } from "@/lib/config";
import type { ApiEnvelope } from "@/lib/api/types";

export type QueryPrimitive = string | number | boolean;
export type QueryValue = QueryPrimitive | null | undefined | QueryPrimitive[];
export type QueryParams = Record<string, QueryValue>;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly details: string[],
  ) {
    super(details[0] ?? "Request failed");
  }
}

export interface ApiRequestInit extends RequestInit {
  query?: QueryParams;
  token?: string;
  timeoutMs?: number;
}

function buildUrl(path: string, query?: QueryParams) {
  const url = new URL(path.startsWith("http") ? path : `${API_BASE_URL}${path}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;

      if (Array.isArray(value)) {
        for (const item of value) {
          url.searchParams.append(key, String(item));
        }
        continue;
      }

      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

function normalizeErrors(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return ["Something went wrong"];
  }

  const maybeEnvelope = payload as Partial<ApiEnvelope<unknown>>;
  if (Array.isArray(maybeEnvelope.errors)) {
    return maybeEnvelope.errors.map((error) => error.message ?? "Request failed");
  }

  if (maybeEnvelope.errors && typeof maybeEnvelope.errors === "object") {
    return Object.values(maybeEnvelope.errors)
      .flat()
      .map((item) => String(item));
  }

  return ["Something went wrong"];
}

export async function apiFetch<T>(path: string, init: ApiRequestInit = {}) {
  const { query, token, headers, body, timeoutMs, signal: providedSignal, ...rest } = init;
  const resolvedHeaders = new Headers(headers);

  if (body && !resolvedHeaders.has("Content-Type")) {
    resolvedHeaders.set("Content-Type", "application/json");
  }

  if (token) {
    resolvedHeaders.set("Authorization", `Bearer ${token}`);
  }

  const timeoutController = typeof timeoutMs === "number" && timeoutMs > 0 ? new AbortController() : null;
  let didTimeout = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  if (timeoutController && providedSignal) {
    if (providedSignal.aborted) {
      timeoutController.abort(providedSignal.reason);
    } else {
      providedSignal.addEventListener(
        "abort",
        () => timeoutController.abort(providedSignal.reason),
        { once: true },
      );
    }
  }

  if (timeoutController && typeof timeoutMs === "number" && timeoutMs > 0) {
    timeoutId = setTimeout(() => {
      didTimeout = true;
      timeoutController.abort("request_timeout");
    }, timeoutMs);
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      ...rest,
      body,
      headers: resolvedHeaders,
      signal: timeoutController?.signal ?? providedSignal,
    });
  } catch (error) {
    if (didTimeout) {
      throw new ApiError(408, ["Request timed out. Please retry."]);
    }
    throw error;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(response.status, normalizeErrors(payload));
  }

  return (payload as ApiEnvelope<T>).data;
}

export async function safeApiFetch<T>(path: string, fallback: T, init: ApiRequestInit = {}) {
  try {
    return await apiFetch<T>(path, init);
  } catch {
    return fallback;
  }
}
