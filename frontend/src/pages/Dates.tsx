import { useEffect, useState } from "react";
import { api } from "../api";
import type { DatePlan } from "../types";
import { DateCard } from "../components/DateCard";

export function Dates() {
  const [items, setItems] = useState<DatePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"upcoming" | "all" | "done">("upcoming");

  async function load() {
    setLoading(true);
    try {
      const params =
        filter === "upcoming"
          ? { upcoming: true, status: "planned" }
          : filter === "done"
            ? { status: "done" }
            : {};
      const data = await api.listDates(params);
      setItems(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [filter]);

  return (
    <div className="flex flex-col gap-4">
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        <FilterChip active={filter === "upcoming"} onClick={() => setFilter("upcoming")}>
          Geplant
        </FilterChip>
        <FilterChip active={filter === "done"} onClick={() => setFilter("done")}>
          Erledigt
        </FilterChip>
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
          Alle
        </FilterChip>
      </div>

      {loading ? (
        <div className="text-center text-text-muted">Lade…</div>
      ) : items.length === 0 ? (
        <div className="card text-center text-text-muted">Keine Dates hier.</div>
      ) : (
        <div className="grid gap-2">
          {items.map((d) => (
            <DateRow key={d.id} date={d} onChange={load} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={`chip ${active ? "chip-secondary" : "chip-muted"}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function DateRow({ date, onChange }: { date: DatePlan; onChange: () => void }) {
  const [busy, setBusy] = useState(false);

  async function setStatus(status: DatePlan["status"]) {
    setBusy(true);
    try {
      await api.updateDate(date.id, { status });
      onChange();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Date wirklich löschen?")) return;
    setBusy(true);
    try {
      await api.deleteDate(date.id);
      onChange();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <DateCard date={date} />
      <div className="flex flex-wrap gap-2 pl-1">
        {date.status === "planned" && (
          <>
            <button
              className="btn btn-ghost py-1.5 text-xs"
              disabled={busy}
              onClick={() => setStatus("done")}
            >
              ✓ Erledigt
            </button>
            <button
              className="btn btn-ghost py-1.5 text-xs"
              disabled={busy}
              onClick={() => setStatus("cancelled")}
            >
              × Abgesagt
            </button>
          </>
        )}
        {date.status !== "planned" && (
          <button
            className="btn btn-ghost py-1.5 text-xs"
            disabled={busy}
            onClick={() => setStatus("planned")}
          >
            ↺ Wieder einplanen
          </button>
        )}
        <button className="btn btn-danger py-1.5 text-xs" disabled={busy} onClick={remove}>
          Löschen
        </button>
      </div>
    </div>
  );
}
