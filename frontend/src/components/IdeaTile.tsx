import { Link } from "react-router-dom";
import type { Idea } from "../types";

const GRADIENTS = [
  "from-purple-700/60 to-pink-500/40",
  "from-rose-700/60 to-orange-400/40",
  "from-indigo-700/60 to-purple-500/40",
  "from-pink-600/60 to-amber-400/40",
  "from-violet-700/60 to-fuchsia-500/40",
  "from-amber-700/60 to-rose-500/40",
];

function gradientFor(id: number) {
  return GRADIENTS[id % GRADIENTS.length];
}

export function IdeaTile({ idea }: { idea: Idea }) {
  const pending = idea.enrichment_status === "pending";
  const failed = idea.enrichment_status === "failed";

  return (
    <Link
      to={`/ideas/${idea.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition hover:border-primary/50 hover:shadow-glow"
    >
      <div
        className={`relative h-28 bg-gradient-to-br ${gradientFor(idea.id)} bg-cover bg-center`}
        style={
          idea.image_url ? { backgroundImage: `url(${idea.image_url})` } : undefined
        }
      >
        <div className="absolute inset-0 bg-gradient-to-t from-bg/70 to-transparent" />
        {pending && (
          <span className="chip absolute right-2 top-2 bg-bg/70 text-accent">
            ✨ wird angereichert…
          </span>
        )}
        {failed && (
          <span className="chip absolute right-2 top-2 bg-red-500/80 text-white">
            ⚠ fehlgeschlagen
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="font-semibold leading-tight">
          {idea.title || idea.raw_input.slice(0, 60)}
        </div>
        {idea.summary && (
          <div className="line-clamp-2 text-xs text-text-muted">{idea.summary}</div>
        )}
        {idea.tags.length > 0 && (
          <div className="mt-auto flex flex-wrap gap-1">
            {idea.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="chip-muted">
                {tag}
              </span>
            ))}
            {idea.tags.length > 3 && (
              <span className="chip-muted">+{idea.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
