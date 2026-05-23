import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import type { Idea } from "../types";

type Msg = { role: "user" | "assistant"; content: string; suggested?: number[] };

const SEED: Msg = {
  role: "assistant",
  content: "Lust auf ein Date heute? Erzähl mir, wie ihr drauf seid – ruhig, abenteuerlustig, hungrig, müde?",
};

export function DateFinder() {
  const [messages, setMessages] = useState<Msg[]>([SEED]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [ideaCache, setIdeaCache] = useState<Record<number, Idea>>({});
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages, busy]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setError(null);
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setBusy(true);
    try {
      const resp = await api.chat(text, sessionId);
      setSessionId(resp.session_id);
      setMessages((m) => [
        ...m,
        { role: "assistant", content: resp.reply, suggested: resp.suggested_idea_ids },
      ]);

      // Fetch any referenced ideas we don't have yet
      const missing = resp.suggested_idea_ids.filter((id) => !ideaCache[id]);
      if (missing.length > 0) {
        const fetched = await Promise.all(missing.map((id) => api.getIdea(id).catch(() => null)));
        const next = { ...ideaCache };
        fetched.forEach((idea) => {
          if (idea) next[idea.id] = idea;
        });
        setIdeaCache(next);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col gap-3">
      <div
        ref={scrollRef}
        className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1"
      >
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "self-end" : "self-start"}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "rounded-br-md bg-primary text-bg"
                  : "rounded-bl-md bg-surface text-text"
              }`}
            >
              {m.content}
            </div>
            {m.suggested && m.suggested.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {m.suggested.map((id) => {
                  const idea = ideaCache[id];
                  return (
                    <Link
                      key={id}
                      to={`/ideas/${id}`}
                      className="chip-secondary"
                    >
                      {idea?.title || `Idee #${id}`} →
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ))}
        {busy && (
          <div className="self-start rounded-2xl rounded-bl-md bg-surface px-4 py-2.5 text-sm text-text-muted">
            <span className="animate-pulse">denkt nach…</span>
          </div>
        )}
        {error && (
          <div className="self-start rounded-2xl bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
            {error}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input
          className="input flex-1"
          placeholder="Schreib der Date-Fee…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          disabled={busy}
        />
        <button
          className="btn btn-primary disabled:opacity-50"
          disabled={!input.trim() || busy}
          onClick={send}
        >
          Senden
        </button>
      </div>
    </div>
  );
}
