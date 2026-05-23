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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [pushOn, setPushOn] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);

  useEffect(() => {
    api
      .getPreferences()
      .then((p) => {
        setText(p.context);
        setSavedAt(p.updated_at);
      })
      .finally(() => setLoading(false));

    const supported = "serviceWorker" in navigator && "PushManager" in window;
    setPushSupported(supported);
    if (supported) isPushSubscribed().then(setPushOn);
  }, []);

  async function save() {
    setSaving(true);
    try {
      const p = await api.updatePreferences(text);
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
