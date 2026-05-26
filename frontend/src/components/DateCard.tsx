import { Link } from "react-router-dom";
import type { DatePlan } from "../types";

function formatDate(iso: string): { weekday: string; date: string; relative: string } {
  const d = new Date(iso + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((d.getTime() - today.getTime()) / 86400000);

  const weekday = d.toLocaleDateString("de-DE", { weekday: "long" });
  const date = d.toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: d.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
  let relative = "";
  if (diffDays === 0) relative = "Heute";
  else if (diffDays === 1) relative = "Morgen";
  else if (diffDays === -1) relative = "Gestern";
  else if (diffDays > 1 && diffDays < 7) relative = `In ${diffDays} Tagen`;
  else if (diffDays < 0) relative = `Vor ${Math.abs(diffDays)} Tagen`;

  return { weekday, date, relative };
}

export function DateCard({
  date,
  highlight = false,
}: {
  date: DatePlan;
  highlight?: boolean;
}) {
  const { weekday, date: dateLabel, relative } = formatDate(date.scheduled_for);
  const isPast = new Date(date.scheduled_for) < new Date(new Date().setHours(0, 0, 0, 0));

  return (
    <Link
      to={`/dates`}
      className={`group block overflow-hidden rounded-2xl border ${
        highlight
          ? "border-primary/40 bg-gradient-to-br from-surface-2 to-surface shadow-glow"
          : "border-border bg-surface"
      } p-4 transition hover:border-primary/50`}
    >
      <div className="mb-2 flex items-center justify-between">
        {relative && (
          <span className="chip bg-accent text-bg">⏰ {relative}</span>
        )}
        <span className="text-[11px] uppercase tracking-wide text-text-muted">
          {date.status === "done" ? "✓ Erledigt" : date.status === "cancelled" ? "× abgesagt" : ""}
        </span>
      </div>
      <div className="text-lg font-bold leading-tight">{date.title}</div>
      <div className="mt-1 text-sm text-text-muted">
        📅 {weekday}, {dateLabel}
        {date.start_time && (
          <span className="ml-1">· ⏱ {date.start_time.slice(0, 5)}</span>
        )}
      </div>
      {date.idea?.music_playlist && (
        <div className="mt-1 text-xs text-text-muted">🎵 {date.idea.music_playlist}</div>
      )}
      {isPast && date.status === "planned" && (
        <div className="mt-2 text-xs text-amber-300">
          War das schon? Markier es als erledigt.
        </div>
      )}
    </Link>
  );
}
