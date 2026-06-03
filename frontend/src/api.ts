import type {
  ChatResponse,
  DatePlan,
  Health,
  Idea,
  Me,
  Preferences,
} from "./types";

const BASE = import.meta.env.VITE_API_URL || "/api";

export function redirectToLogin(): void {
  // oauth2-proxy serves its sign-in handler at /oauth2/sign_in and honours the
  // `rd` query param as the post-login redirect target. Skip if we're already
  // on an oauth2-proxy URL to avoid loops.
  if (window.location.pathname.startsWith("/oauth2/")) return;
  const rd = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.assign(`/oauth2/sign_in?rd=${rd}`);
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    ...init,
  });
  if (res.status === 401) {
    // Session expired (or oauth2-proxy cookie gone). Bounce through the proxy
    // so the user can re-authenticate against Authentik.
    redirectToLogin();
    // Throw to short-circuit callers; the navigation will follow.
    throw new Error("401: session expired, redirecting to login");
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  health: () => http<Health>("/health"),
  me: () => http<Me>("/me"),

  listIdeas: (params: { q?: string; tag?: string; status?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.q) qs.set("q", params.q);
    if (params.tag) qs.set("tag", params.tag);
    if (params.status) qs.set("status", params.status);
    const suffix = qs.toString() ? `?${qs}` : "";
    return http<Idea[]>(`/ideas${suffix}`);
  },
  getIdea: (id: number) => http<Idea>(`/ideas/${id}`),
  createIdea: (data: Partial<Idea> & { raw_input: string }) =>
    http<Idea>("/ideas", { method: "POST", body: JSON.stringify(data) }),
  updateIdea: (id: number, data: Partial<Idea>) =>
    http<Idea>(`/ideas/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  reEnrichIdea: (id: number) =>
    http<Idea>(`/ideas/${id}/re-enrich`, { method: "POST" }),
  deleteIdea: (id: number) => http<void>(`/ideas/${id}`, { method: "DELETE" }),

  listDates: (params: { upcoming?: boolean; status?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.upcoming) qs.set("upcoming", "true");
    if (params.status) qs.set("status", params.status);
    const suffix = qs.toString() ? `?${qs}` : "";
    return http<DatePlan[]>(`/dates${suffix}`);
  },
  createDate: (data: {
    title: string;
    scheduled_for: string;
    start_time?: string | null;
    duration_minutes?: number | null;
    notes?: string | null;
    idea_id?: number | null;
  }) => http<DatePlan>("/dates", { method: "POST", body: JSON.stringify(data) }),
  updateDate: (id: number, data: Partial<DatePlan>) =>
    http<DatePlan>(`/dates/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteDate: (id: number) => http<void>(`/dates/${id}`, { method: "DELETE" }),

  getPreferences: () => http<Preferences>("/preferences"),
  updatePreferences: (data: {
    context: string;
    default_start_time?: string | null;
    default_duration_minutes?: number | null;
  }) =>
    http<Preferences>("/preferences", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  chat: (message: string, session_id?: string) =>
    http<ChatResponse>("/date-finder/chat", {
      method: "POST",
      body: JSON.stringify({ message, session_id }),
    }),

  vapidKey: () => http<{ key: string }>("/notifications/vapid-public-key"),
  subscribePush: (sub: PushSubscriptionJSON) =>
    http<{ ok: boolean }>("/notifications/subscribe", {
      method: "POST",
      body: JSON.stringify(sub),
    }),

  getCalendarSubscription: () =>
    http<{ token: string; ics_path: string } | null>("/calendar/me"),
  createCalendarSubscription: () =>
    http<{ token: string; ics_path: string }>("/calendar", { method: "POST" }),
  revokeCalendarSubscription: () =>
    http<void>("/calendar", { method: "DELETE" }),
};
