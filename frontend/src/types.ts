export type Idea = {
  id: number;
  raw_input: string;
  title: string | null;
  summary: string | null;
  clothing: string | null;
  food: string | null;
  music_playlist: string | null;
  activity: string | null;
  location: string | null;
  image_url: string | null;
  image_source: string | null;
  tags: string[];
  enrichment_status: "pending" | "done" | "failed";
  enrichment_error: string | null;
  created_at: string;
  updated_at: string;
};

export type DatePlan = {
  id: number;
  title: string;
  scheduled_for: string; // ISO date YYYY-MM-DD
  notes: string | null;
  status: "planned" | "done" | "cancelled";
  idea_id: number | null;
  idea: Idea | null;
  notification_sent: boolean;
  created_at: string;
  updated_at: string;
};

export type Preferences = {
  context: string;
  updated_at: string;
};

export type ChatResponse = {
  session_id: string;
  reply: string;
  suggested_idea_ids: number[];
};

export type Me = {
  email: string;
  name: string | null;
};

export type Health = {
  status: string;
  ai_provider: string;
  ai_configured: boolean;
};
