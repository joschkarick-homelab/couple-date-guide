import { useEffect, useState } from "react";
import { api } from "../api";
import { subscribeToPush, isPushSubscribed, unsubscribeFromPush } from "../push";

const PLACEHOLDER = `Beispiel:
- Wir haben zwei kleine Kinder, deshalb meistens Dates zuhause oder kurze Ausflüge
- Wir mögen es gerne nerdig (Brettspiele, Sci-Fi)
- Sie liebt Schokolade & Rotwein, er steht auf scharfes Essen
- Keine Action-Filme bitte
- Sie mag Romantik mit einem Augenzwinkern, nicht zu kitschig`;

export function PreferencesPage() {
  const [text, setText] = useState("");
  const [defaultTime, setDefaultTime] = useState(""); // "HH:MM"
  const [defaultDuration, setDefaultDuration] = useState<string>(""); // minutes as string for input
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [pushOn, setPushOn] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [calPath, setCalPath] = useState<string | null>(null);
  const [calBusy, setCalBusy] = useState(false);
  const [calCopied, setCalCopied] = useState(false);

  useEffect(() => {
    api
      .getPreferences()
      .then((p) => {
        setText(p.context);
        setDefaultTime(p.default_start_time ? p.default_start_time.slice(0, 5) : "");
        setDefaultDuration(
          p.default_duration_minutes != null ? String(p.default_duration_minutes) : "",
        );
        setSavedAt(p.updated_at);
      })
      .finally(() => setLoading(false));

    const supported = "serviceWorker" in navigator && "PushManager" in window;
    setPushSupported(supported);
    if (supported) isPushSubscribed().then(setPushOn);

    api.getCalendarSubscription().then((sub) => setCalPath(sub?.ics_path ?? null));
  }, []);

  async function save() {
    setSaving(true);
    try {
      const durationNum = defaultDuration.trim() ? Number(defaultDuration) : null;
      const p = await api.updatePreferences({
        context: text,
        default_start_time: defaultTime.trim() || null,
        default_duration_minutes:
          durationNum != null && !Number.isNaN(durationNum) ? durationNum : null,
      });
      setSavedAt(p.updated_at);
    } finally {
      setSaving(false);
    }
  }

  async function togglePush() {
    if (pushOn) {
      await unsubscribeFromPush();
      setPushOn(false);
    } else {
      const ok = await subscribeToPush();
      setPushOn(ok);
    }
  }

  const calHttps = calPath ? `${window.location.origin}${calPath}` : null;
  const calWebcal = calHttps ? calHttps.replace(/^https?:/, "webcal:") : null;

  async function enableCalendar() {
    setCalBusy(true);
    try {
      const sub = await api.createCalendarSubscription();
      setCalPath(sub.ics_path);
      setCalCopied(false);
    } finally {
      setCalBusy(false);
    }
  }

  async function disableCalendar() {
    if (!confirm("Outlook-Abo deaktivieren? Die bisherige URL wird ungültig.")) return;
    setCalBusy(true);
    try {
      await api.revokeCalendarSubscription();
      setCalPath(null);
    } finally {
      setCalBusy(false);
    }
  }

  async function copyCalUrl() {
    if (!calHttps) return;
    await navigator.clipboard.writeText(calHttps);
    setCalCopied(true);
    setTimeout(() => setCalCopied(false), 2000);
  }

  if (loading) return <div className="text-center text-text-muted">Lade…</div>;

  return (
    <div className="flex flex-col gap-4">
      <div className="card">
        <h2 className="section-title">Über uns (Kontext für die KI)</h2>
        <p className="mb-2 text-xs text-text-muted">
          Wird der KI bei Ideen-Anreicherung und Date Finder als Kontext mitgegeben.
          Je konkreter, desto passender die Vorschläge.
        </p>
        <textarea
          className="textarea min-h-[200px]"
          placeholder={PLACEHOLDER}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <div className="mt-4 border-t border-border pt-4">
          <div className="section-title">Standardzeit für Dates</div>
          <p className="mb-2 text-xs text-text-muted">
            Wird vorausgewählt, wenn ihr ein Date plant — und für getimete
            Outlook-Kalendereinträge genutzt. Leer lassen = ganztägig.
          </p>
          <div className="flex items-end gap-3">
            <label className="block w-36">
              <span className="mb-1 block text-xs text-text-muted">Uhrzeit</span>
              <input
                type="time"
                className="input"
                value={defaultTime}
                onChange={(e) => setDefaultTime(e.target.value)}
              />
            </label>
            <label className="block w-32">
              <span className="mb-1 block text-xs text-text-muted">Dauer (Min.)</span>
              <input
                type="number"
                inputMode="numeric"
                min={15}
                max={1440}
                step={15}
                className="input"
                placeholder="120"
                value={defaultDuration}
                onChange={(e) => setDefaultDuration(e.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-text-muted">
            {savedAt ? `Gespeichert: ${new Date(savedAt).toLocaleString("de-DE")}` : ""}
          </span>
          <button
            className="btn btn-primary disabled:opacity-50"
            disabled={saving}
            onClick={save}
          >
            {saving ? "Speichere…" : "Speichern"}
          </button>
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">Benachrichtigungen</h2>
        <p className="mb-3 text-xs text-text-muted">
          Push-Erinnerung am Morgen eures Date-Tags. iOS: nur möglich, wenn die App
          zum Homescreen hinzugefügt wurde.
        </p>
        {!pushSupported ? (
          <p className="text-sm text-text-muted">
            Dieser Browser unterstützt keine Push-Notifications.
          </p>
        ) : (
          <button
            className={pushOn ? "btn btn-ghost" : "btn btn-primary"}
            onClick={togglePush}
          >
            {pushOn ? "🔕 Deaktivieren" : "🔔 Aktivieren"}
          </button>
        )}
      </div>

      <div className="card">
        <h2 className="section-title">Kalender abonnieren</h2>
        <p className="mb-3 text-xs text-text-muted">
          Read-only iCal-Feed eurer geplanten Dates für Outlook, Apple Kalender, etc.
          Die Datenhoheit bleibt hier — Änderungen im Date-Manager erscheinen
          automatisch im Outlook (Polling alle paar Stunden).
        </p>
        {!calPath ? (
          <button
            className="btn btn-primary disabled:opacity-50"
            disabled={calBusy}
            onClick={enableCalendar}
          >
            {calBusy ? "Erzeuge…" : "📅 Outlook-Abo aktivieren"}
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="text-xs text-text-muted">
              Diese URL in Outlook unter „Kalender hinzufügen → Aus dem Internet" einfügen:
            </div>
            <code className="rounded bg-bg-soft p-2 text-[10px] break-all">
              {calHttps}
            </code>
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-primary text-sm" onClick={copyCalUrl}>
                {calCopied ? "✓ kopiert" : "📋 URL kopieren"}
              </button>
              {calWebcal && (
                <a className="btn btn-ghost text-sm" href={calWebcal}>
                  In Kalender öffnen
                </a>
              )}
              <button
                className="btn btn-ghost text-sm disabled:opacity-50"
                disabled={calBusy}
                onClick={enableCalendar}
              >
                🔄 Neu generieren
              </button>
              <button
                className="btn btn-ghost text-sm disabled:opacity-50"
                disabled={calBusy}
                onClick={disableCalendar}
              >
                Deaktivieren
              </button>
            </div>
            <p className="text-[11px] text-text-muted">
              ⚠️ Diese URL ist eure Geheim-Zugang. Wer sie kennt, sieht eure Date-Titel
              und Notizen — also nicht öffentlich teilen.
            </p>
          </div>
        )}
      </div>

      <div className="card text-xs text-text-muted">
        <h2 className="section-title">iOS-Kurzbefehl</h2>
        <p>
          Lege auf dem iPhone einen Kurzbefehl an, der per <code>POST</code> an{" "}
          <code>/api/ideas/quick-add</code> sendet, mit Header{" "}
          <code>Authorization: Bearer &lt;QUICK_ADD_TOKEN&gt;</code> und Body{" "}
          <code>{`{"raw_input": "<eingabe>"}`}</code>. KI ergänzt den Rest.
        </p>
      </div>
    </div>
  );
}
