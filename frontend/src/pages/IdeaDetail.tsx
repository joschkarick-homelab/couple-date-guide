import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import type { Idea } from "../types";

type Draft = {
  title: string;
  summary: string;
  activity: string;
  location: string;
  clothing: string;
  food: string;
  music_playlist: string;
  tagsInput: string;
};

function makeDraft(idea: Idea): Draft {
  return {
    title: idea.title ?? "",
    summary: idea.summary ?? "",
    activity: idea.activity ?? "",
    location: idea.location ?? "",
    clothing: idea.clothing ?? "",
    food: idea.food ?? "",
    music_playlist: idea.music_playlist ?? "",
    tagsInput: idea.tags.join(", "),
  };
}

export function IdeaDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [idea, setIdea] = useState<Idea | null>(null);
  const [loading, setLoading] = useState(true);
  const [planOpen, setPlanOpen] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const editMode = draft !== null;

  async function load() {
    if (!id) return;
    setLoading(true);
    try {
      const data = await api.getIdea(Number(id));
      setIdea(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    if (idea?.enrichment_status !== "pending") return;
    const t = setInterval(load, 2500);
    return () => clearInterval(t);
  }, [idea?.enrichment_status]);

  async function reEnrich() {
    if (!idea) return;
    await api.reEnrichIdea(idea.id);
    load();
  }

  async function remove() {
    if (!idea) return;
    if (!confirm("Idee wirklich löschen?")) return;
    await api.deleteIdea(idea.id);
    nav("/ideas");
  }

  function startEdit() {
    if (!idea) return;
    setDraft(makeDraft(idea));
  }

  function cancelEdit() {
    setDraft(null);
  }

  async function saveEdit() {
    if (!idea || !draft) return;
    setSaving(true);
    try {
      const updated = await api.updateIdea(idea.id, {
        title: draft.title.trim() || null,
        summary: draft.summary.trim() || null,
        activity: draft.activity.trim() || null,
        location: draft.location.trim() || null,
        clothing: draft.clothing.trim() || null,
        food: draft.food.trim() || null,
        music_playlist: draft.music_playlist.trim() || null,
        tags: draft.tagsInput
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });
      setIdea(updated);
      setDraft(null);
    } finally {
      setSaving(false);
    }
  }

  function setField(key: keyof Draft, value: string) {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  }

  if (loading || !idea) {
    return <div className="text-center text-text-muted">Lade…</div>;
  }

  const pending = idea.enrichment_status === "pending";

  return (
    <div className="flex flex-col gap-4">
      <button
        className="self-start text-sm text-text-muted hover:text-text"
        onClick={() => nav(-1)}
      >
        ← Zurück
      </button>

      <div className="overflow-hidden rounded-2xl border border-border">
        <div
          className="relative h-44 bg-gradient-to-br from-purple-700/60 to-pink-500/40 bg-cover bg-center"
          style={
            idea.image_url ? { backgroundImage: `url(${idea.image_url})` } : undefined
          }
        >
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/30 to-transparent" />
          {!editMode && (
            <div className="absolute bottom-3 left-3 right-3">
              <h2 className="text-xl font-bold text-white drop-shadow">
                {idea.title || idea.raw_input.slice(0, 80)}
              </h2>
            </div>
          )}
        </div>
      </div>

      {pending && !editMode && (
        <div className="card text-sm text-accent">
          ✨ KI reichert die Idee gerade an…
        </div>
      )}
      {idea.enrichment_status === "failed" && !editMode && (
        <div className="card text-sm">
          <div className="text-red-300">Anreicherung fehlgeschlagen.</div>
          {idea.enrichment_error && (
            <div className="mt-1 text-xs text-text-muted">{idea.enrichment_error}</div>
          )}
          <button className="btn btn-ghost mt-2" onClick={reEnrich}>
            Erneut versuchen
          </button>
        </div>
      )}

      {editMode && (
        <div className="card">
          <div className="section-title">Titel</div>
          <input
            className="input"
            value={draft.title}
            onChange={(e) => setField("title", e.target.value)}
            placeholder="Titel der Idee…"
          />
        </div>
      )}

      {(idea.summary || editMode) && (
        <div className="card">
          <div className="section-title">Idee</div>
          {editMode ? (
            <textarea
              className="textarea"
              value={draft.summary}
              onChange={(e) => setField("summary", e.target.value)}
              placeholder="Kurzbeschreibung der Idee…"
            />
          ) : (
            <p className="text-sm">{idea.summary}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {editMode ? (
          <>
            <EditField
              label="Aktivität"
              icon="🎯"
              value={draft.activity}
              onChange={(v) => setField("activity", v)}
            />
            <EditField
              label="Ort"
              icon="📍"
              value={draft.location}
              onChange={(v) => setField("location", v)}
            />
            <EditField
              label="Outfit"
              icon="👗"
              value={draft.clothing}
              onChange={(v) => setField("clothing", v)}
            />
            <EditField
              label="Essen & Trinken"
              icon="🍷"
              value={draft.food}
              onChange={(v) => setField("food", v)}
            />
            <EditField
              label="Musik / Playlist"
              icon="🎵"
              value={draft.music_playlist}
              onChange={(v) => setField("music_playlist", v)}
              className="sm:col-span-2"
            />
          </>
        ) : (
          <>
            <Field label="Aktivität" value={idea.activity} icon="🎯" />
            <Field label="Ort" value={idea.location} icon="📍" />
            <Field label="Outfit" value={idea.clothing} icon="👗" />
            <Field label="Essen & Trinken" value={idea.food} icon="🍷" />
            <Field
              label="Musik / Playlist"
              value={idea.music_playlist}
              icon="🎵"
              className="sm:col-span-2"
            />
          </>
        )}
      </div>

      {(idea.tags.length > 0 || editMode) && (
        <div className="card">
          <div className="section-title">Tags</div>
          {editMode ? (
            <>
              <input
                className="input"
                value={draft.tagsInput}
                onChange={(e) => setField("tagsInput", e.target.value)}
                placeholder="Romantisch, Draußen, Günstig…"
              />
              <p className="mt-1.5 text-xs text-text-muted">
                Kommagetrennt eingeben
              </p>
            </>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {idea.tags.map((t) => (
                <span key={t} className="chip-muted">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <details className="card text-xs text-text-muted">
        <summary className="cursor-pointer">Original-Eingabe</summary>
        <p className="mt-2 whitespace-pre-wrap">{idea.raw_input}</p>
      </details>

      {editMode ? (
        <div className="flex flex-wrap gap-2">
          <button
            className="btn btn-primary disabled:opacity-50"
            onClick={saveEdit}
            disabled={saving}
          >
            {saving ? "Speichere…" : "💾 Speichern"}
          </button>
          <button className="btn btn-ghost" onClick={cancelEdit} disabled={saving}>
            Abbrechen
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary" onClick={() => setPlanOpen(true)}>
            📅 Date einplanen
          </button>
          <button className="btn btn-ghost" onClick={startEdit}>
            ✏️ Bearbeiten
          </button>
          <button className="btn btn-ghost" onClick={reEnrich}>
            ♻️ KI neu fragen
          </button>
          <button className="btn btn-danger" onClick={remove}>
            🗑 Löschen
          </button>
        </div>
      )}

      {planOpen && (
        <PlanDateSheet idea={idea} onClose={() => setPlanOpen(false)} />
      )}
    </div>
  );
}

function Field({
  label,
  value,
  icon,
  className = "",
}: {
  label: string;
  value: string | null;
  icon: string;
  className?: string;
}) {
  if (!value) return null;
  return (
    <div className={`card ${className}`}>
      <div className="section-title flex items-center gap-1.5">
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <p className="text-sm">{value}</p>
    </div>
  );
}

function EditField({
  label,
  icon,
  value,
  onChange,
  className = "",
}: {
  label: string;
  icon: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div className={`card ${className}`}>
      <div className="section-title flex items-center gap-1.5">
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <textarea
        className="textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`${label}…`}
      />
    </div>
  );
}

function PlanDateSheet({ idea, onClose }: { idea: Idea; onClose: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  async function submit() {
    setBusy(true);
    try {
      await api.createDate({
        title: idea.title || idea.raw_input.slice(0, 60),
        scheduled_for: date,
        notes: notes.trim() || null,
        idea_id: idea.id,
      });
      onClose();
      nav("/dates");
    } finally {
      setBusy(false);
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
        <h3 className="mb-3 font-semibold">Date planen</h3>
        <label className="mb-3 block">
          <span className="mb-1 block text-xs text-text-muted">Datum</span>
          <input
            type="date"
            className="input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label className="mb-3 block">
          <span className="mb-1 block text-xs text-text-muted">Notizen (optional)</span>
          <textarea
            className="textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        <div className="flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={onClose}>
            Abbrechen
          </button>
          <button
            className="btn btn-primary disabled:opacity-50"
            onClick={submit}
            disabled={busy}
          >
            {busy ? "Speichere…" : "Einplanen"}
          </button>
        </div>
      </div>
    </div>
  );
}
