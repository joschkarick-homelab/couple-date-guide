import type {
  ChatResponse,
  DatePlan,
  Health,
  Idea,
  Me,
  Preferences,
} from "./types";

const BASE = import.meta.env.VITE_API_URL || "/api";

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    ...init,
  });
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
    notes?: string | null;
    idea_id?: number | null;
  }) => http<DatePlan>("/dates", { method: "POST", body: JSON.stringify(data) }),
  updateDate: (id: number, data: Partial<DatePlan>) =>
    http<DatePlan>(`/dates/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteDate: (id: number) => http<void>(`/dates/${id}`, { method: "DELETE" }),

  getPreferences: () => http<Preferences>("/preferences"),
  updatePreferences: (context: string) =>
    http<Preferences>("/preferences", {
      method: "PUT",
      body: JSON.stringify({ context }),
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
};
