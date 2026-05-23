import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import type { Idea } from "../types";
import { IdeaTile } from "../components/IdeaTile";

export function Ideas() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await api.listIdeas();
      setIdeas(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Poll for pending enrichments
  useEffect(() => {
    const hasPending = ideas.some((i) => i.enrichment_status === "pending");
    if (!hasPending) return;
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [ideas]);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    ideas.forEach((i) => i.tags.forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [ideas]);

  const filtered = useMemo(() => {
    let xs = ideas;
    if (search.trim()) {
      const q = search.toLowerCase();
      xs = xs.filter(
        (i) =>
          (i.title || "").toLowerCase().includes(q) ||
          (i.summary || "").toLowerCase().includes(q) ||
          i.raw_input.toLowerCase().includes(q),
      );
    }
    if (activeTag) xs = xs.filter((i) => i.tags.includes(activeTag));
    return xs;
  }, [ideas, search, activeTag]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <input
          className="input flex-1"
          placeholder="Suchen…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          + Neu
        </button>
      </div>

      {allTags.length > 0 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          <button
            className={`chip ${activeTag === null ? "chip-secondary" : "chip-muted"}`}
            onClick={() => setActiveTag(null)}
          >
            Alle
          </button>
          {allTags.map((t) => (
            <button
              key={t}
              className={`chip ${activeTag === t ? "chip-secondary" : "chip-muted"}`}
              onClick={() => setActiveTag(t)}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-center text-text-muted">Lade…</div>
      ) : filtered.length === 0 ? (
        <div className="card text-center text-text-muted">
          Keine Ideen gefunden.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((idea) => (
            <IdeaTile key={idea.id} idea={idea} />
          ))}
        </div>
      )}

      {showAdd && <AddIdeaSheet onClose={() => setShowAdd(false)} onAdded={load} />}
    </div>
  );
}

function AddIdeaSheet({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: () => void;
}) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      await api.createIdea({ raw_input: text.trim() });
      onAdded();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-bg/70 backdrop-blur"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl border-t border-x border-border bg-surface p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-3 font-semibold">Neue Idee</h3>
        <textarea
          className="textarea"
          autoFocus
          placeholder="Z.B. 'Pizza selbst machen mit gutem Wein'"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="mt-2 text-xs text-text-muted">
          KI ergänzt automatisch Outfit, Essen, Musik, Tags…
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={onClose}>
            Abbrechen
          </button>
          <button
            className="btn btn-primary disabled:opacity-50"
            onClick={submit}
            disabled={submitting || !text.trim()}
          >
            {submitting ? "Speichere…" : "Speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}
