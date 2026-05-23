import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import type { DatePlan, Idea } from "../types";
import { DateCard } from "../components/DateCard";
import { IdeaTile } from "../components/IdeaTile";

export function Dashboard() {
  const [dates, setDates] = useState<DatePlan[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.listDates({ upcoming: true, status: "planned" }),
      api.listIdeas(),
    ])
      .then(([d, i]) => {
        setDates(d);
        setIdeas(i);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center text-text-muted">Lade…</div>;
  }

  const next = dates[0];
  const upcoming = dates.slice(1, 4);
  const recentIdeas = ideas.slice(0, 4);

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="section-title">Nächstes Date</h2>
        {next ? (
          <DateCard date={next} highlight />
        ) : (
          <div className="card flex flex-col items-center gap-3 py-8 text-center text-text-muted">
            <div className="text-3xl">💜</div>
            <div>Noch nichts geplant.</div>
            <Link to="/finder" className="btn btn-primary">
              Date Finder starten
            </Link>
          </div>
        )}
      </section>

      {upcoming.length > 0 && (
        <section>
          <h2 className="section-title">Bald</h2>
          <div className="grid gap-2">
            {upcoming.map((d) => (
              <DateCard key={d.id} date={d} />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="section-title m-0">Frische Ideen</h2>
          <Link to="/ideas" className="text-xs text-primary hover:text-primary-hover">
            Alle ansehen →
          </Link>
        </div>
        {recentIdeas.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {recentIdeas.map((idea) => (
              <IdeaTile key={idea.id} idea={idea} />
            ))}
          </div>
        ) : (
          <div className="card text-center text-text-muted">
            Noch keine Ideen. Leg per Kurzbefehl oder im{" "}
            <Link to="/ideas" className="text-primary">Ideen-Tab</Link> los.
          </div>
        )}
      </section>
    </div>
  );
}
