"use client";

import { useEffect, useMemo, useState } from "react";

type Entry = {
  date: string;
  weight: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  steps: string;
  sleep: string;
  cigarettes: string;
  waist: string;
  restPulse: string;
  trainingDone: boolean;
  zone2Done: boolean;
  notes: string;
};

type Settings = {
  proteinGoal: string;
  stepsGoal: string;
  sleepGoal: string;
  goalWeight: string;
};

const STORAGE_KEY = "transformation-tracker-entries-v2";
const SETTINGS_KEY = "transformation-tracker-settings-v1";

const emptyEntry: Entry = {
  date: new Date().toISOString().slice(0, 10),
  weight: "",
  calories: "",
  protein: "",
  carbs: "",
  fat: "",
  steps: "",
  sleep: "",
  cigarettes: "",
  waist: "",
  restPulse: "",
  trainingDone: false,
  zone2Done: false,
  notes: "",
};

const defaultSettings: Settings = {
  proteinGoal: "190",
  stepsGoal: "7000",
  sleepGoal: "7.5",
  goalWeight: "85",
};

export default function Page() {
  const [entry, setEntry] = useState<Entry>(emptyEntry);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [activeTab, setActiveTab] = useState<"dashboard" | "daily" | "weekly" | "settings">("dashboard");
  const [savedMessage, setSavedMessage] = useState("");
  const [settingsSavedMessage, setSettingsSavedMessage] = useState("");

  useEffect(() => {
    const rawEntries = window.localStorage.getItem(STORAGE_KEY);
    if (rawEntries) {
      try {
        setEntries(JSON.parse(rawEntries));
      } catch {
        setEntries([]);
      }
    }

    const rawSettings = window.localStorage.getItem(SETTINGS_KEY);
    if (rawSettings) {
      try {
        setSettings({ ...defaultSettings, ...JSON.parse(rawSettings) });
      } catch {
        setSettings(defaultSettings);
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const stats = useMemo(() => {
    const latest = entries[entries.length - 1];
    const numberValues = (key: keyof Entry) =>
      entries
        .map((item) => Number(item[key]))
        .filter((value) => Number.isFinite(value) && value > 0);

    const average = (items: number[]) =>
      items.length ? (items.reduce((a, b) => a + b, 0) / items.length).toFixed(1) : "–";

    const latestWeightNum = Number(latest?.weight || 0);
    const goalWeightNum = Number(settings.goalWeight || 0);
    const remainingKg =
      latestWeightNum > 0 && goalWeightNum > 0 ? Math.max(0, latestWeightNum - goalWeightNum).toFixed(1) : "–";

    return {
      latestWeight: latest?.weight || "–",
      averageWeight: average(numberValues("weight")),
      averageSleep: average(numberValues("sleep")),
      averageSteps: average(numberValues("steps")),
      latestCalories: latest?.calories || "–",
      count: entries.length,
      goalWeight: settings.goalWeight || "–",
      remainingKg,
    };
  }, [entries, settings]);

  const weeklyChecks = [
    "4 Morgenwiegungen gemacht",
    "Wochenschnitt dokumentiert",
    "Taillenumfang gemessen",
    "Fotos gemacht",
    "5 Krafteinheiten absolviert",
    "Zone 2 absolviert",
    "Protein an mindestens 6 Tagen erreicht",
    "Schrittziel im Wochenschnitt erreicht",
    "Schlaf im Schnitt erreicht",
    "Zigaretten reduziert oder Abstinenz gehalten",
  ];

  function updateField<K extends keyof Entry>(key: K, value: Entry[K]) {
    setEntry((prev) => ({ ...prev, [key]: value }));
  }

  function updateSettings<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function saveEntry() {
    setEntries((prev) => [...prev, entry].sort((a, b) => a.date.localeCompare(b.date)));
    setEntry({ ...emptyEntry, date: new Date().toISOString().slice(0, 10) });
    setSavedMessage("Eintrag gespeichert.");
    window.setTimeout(() => setSavedMessage(""), 2000);
  }

  function saveSettings() {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    setSettingsSavedMessage("Einstellungen gespeichert.");
    window.setTimeout(() => setSettingsSavedMessage(""), 2000);
  }

  function resetSettings() {
    setSettings(defaultSettings);
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultSettings));
    setSettingsSavedMessage("Standardwerte wiederhergestellt.");
    window.setTimeout(() => setSettingsSavedMessage(""), 2000);
  }

  function deleteAll() {
    const ok = window.confirm("Alle lokal gespeicherten Einträge wirklich löschen?");
    if (!ok) return;
    setEntries([]);
    window.localStorage.removeItem(STORAGE_KEY);
  }

  const proteinGoal = Number(settings.proteinGoal || 0);
  const stepsGoal = Number(settings.stepsGoal || 0);
  const sleepGoal = Number(settings.sleepGoal || 0);

  const proteinPct = proteinGoal > 0 ? Math.min(100, Math.round((Number(entry.protein || 0) / proteinGoal) * 100)) : 0;
  const stepsPct = stepsGoal > 0 ? Math.min(100, Math.round((Number(entry.steps || 0) / stepsGoal) * 100)) : 0;
  const sleepPct = sleepGoal > 0 ? Math.min(100, Math.round((Number(entry.sleep || 0) / sleepGoal) * 100)) : 0;

  return (
    <main className="page-shell">
      <section className="hero">
        <div>
          <div className="eyebrow">iPhone-fähige Web-App</div>
          <h1>Transformation Tracker</h1>
          <p>
            Jetzt mit echten Einstellungen in der App. Du kannst Protein, Schritte, Schlaf und Zielgewicht direkt
            auf dem iPhone anpassen.
          </p>
        </div>
        <div className="hero-badges">
          <span className="badge">PWA-Basis</span>
          <span className="badge">Mobile first</span>
          <span className="badge">Lokale Einstellungen</span>
        </div>
      </section>

      <nav className="tabs">
        <button className={activeTab === "dashboard" ? "tab active" : "tab"} onClick={() => setActiveTab("dashboard")}>Dashboard</button>
        <button className={activeTab === "daily" ? "tab active" : "tab"} onClick={() => setActiveTab("daily")}>Täglich</button>
        <button className={activeTab === "weekly" ? "tab active" : "tab"} onClick={() => setActiveTab("weekly")}>Wochenreview</button>
        <button className={activeTab === "settings" ? "tab active" : "tab"} onClick={() => setActiveTab("settings")}>Einstellungen</button>
      </nav>

      {activeTab === "dashboard" && (
        <section className="grid">
          <Card title="Letztes Gewicht" value={stats.latestWeight === "–" ? "–" : `${stats.latestWeight} kg`} />
          <Card title="Zielgewicht" value={stats.goalWeight === "–" ? "–" : `${stats.goalWeight} kg`} />
          <Card title="Noch bis Ziel" value={stats.remainingKg === "–" ? "–" : `${stats.remainingKg} kg`} />
          <Card title="Ø Gewicht" value={stats.averageWeight === "–" ? "–" : `${stats.averageWeight} kg`} />
          <Card title="Ø Schlaf" value={stats.averageSleep === "–" ? "–" : `${stats.averageSleep} h`} />
          <Card title="Ø Schritte" value={stats.averageSteps === "–" ? "–" : `${stats.averageSteps}`} />
          <Card title="Letzte Kalorien" value={stats.latestCalories === "–" ? "–" : `${stats.latestCalories} kcal`} />
          <Card title="Gespeicherte Tage" value={`${stats.count}`} />
        </section>
      )}

      {activeTab === "daily" && (
        <section className="panel">
          <div className="panel-header">
            <h2>Täglicher Eintrag</h2>
            <div className="target-hint">
              Zielwerte: {settings.proteinGoal} g Protein · {settings.stepsGoal} Schritte · {settings.sleepGoal} h Schlaf
            </div>
          </div>

          <div className="form-grid">
            <Field label="Datum"><input type="date" value={entry.date} onChange={(e) => updateField("date", e.target.value)} /></Field>
            <Field label="Gewicht (kg)"><input value={entry.weight} onChange={(e) => updateField("weight", e.target.value)} placeholder="101.8" /></Field>
            <Field label="Kalorien"><input value={entry.calories} onChange={(e) => updateField("calories", e.target.value)} placeholder="2370" /></Field>
            <Field label="Protein (g)"><input value={entry.protein} onChange={(e) => updateField("protein", e.target.value)} placeholder={settings.proteinGoal} /></Field>
            <Field label="Kohlenhydrate (g)"><input value={entry.carbs} onChange={(e) => updateField("carbs", e.target.value)} placeholder="245" /></Field>
            <Field label="Fett (g)"><input value={entry.fat} onChange={(e) => updateField("fat", e.target.value)} placeholder="70" /></Field>
            <Field label="Schritte"><input value={entry.steps} onChange={(e) => updateField("steps", e.target.value)} placeholder={settings.stepsGoal} /></Field>
            <Field label="Schlaf (h)"><input value={entry.sleep} onChange={(e) => updateField("sleep", e.target.value)} placeholder={settings.sleepGoal} /></Field>
            <Field label="Zigaretten"><input value={entry.cigarettes} onChange={(e) => updateField("cigarettes", e.target.value)} placeholder="0" /></Field>
            <Field label="Taillenumfang (cm)"><input value={entry.waist} onChange={(e) => updateField("waist", e.target.value)} placeholder="108" /></Field>
            <Field label="Ruhepuls"><input value={entry.restPulse} onChange={(e) => updateField("restPulse", e.target.value)} placeholder="60" /></Field>
            <div className="field">
              <label>Erledigt</label>
              <div className="checkboxes">
                <label><input type="checkbox" checked={entry.trainingDone} onChange={(e) => updateField("trainingDone", e.target.checked)} /> Training</label>
                <label><input type="checkbox" checked={entry.zone2Done} onChange={(e) => updateField("zone2Done", e.target.checked)} /> Zone 2</label>
              </div>
            </div>
            <Field label="Notizen"><textarea value={entry.notes} onChange={(e) => updateField("notes", e.target.value)} placeholder="Hunger, Performance, Stimmung, Besonderheiten ..." rows={4} /></Field>
          </div>

          <div className="progress-grid">
            <ProgressRow label="Protein" current={Number(entry.protein || 0)} target={proteinGoal} pct={proteinPct} unit="g" />
            <ProgressRow label="Schritte" current={Number(entry.steps || 0)} target={stepsGoal} pct={stepsPct} unit="" />
            <ProgressRow label="Schlaf" current={Number(entry.sleep || 0)} target={sleepGoal} pct={sleepPct} unit="h" />
          </div>

          <div className="actions">
            <button className="primary" onClick={saveEntry}>Eintrag speichern</button>
            <button className="secondary" onClick={deleteAll}>Alle lokalen Daten löschen</button>
            {savedMessage ? <span className="saved">{savedMessage}</span> : null}
          </div>
        </section>
      )}

      {activeTab === "weekly" && (
        <section className="panel">
          <div className="panel-header">
            <h2>Wochenreview</h2>
            <div className="target-hint">Checkliste entsprechend deinem Excel-Tracker</div>
          </div>
          <div className="check-grid">
            {weeklyChecks.map((item) => (
              <label key={item} className="check-card">
                <input type="checkbox" /> <span>{item}</span>
              </label>
            ))}
          </div>
        </section>
      )}

      {activeTab === "settings" && (
        <section className="panel">
          <div className="panel-header">
            <h2>Einstellungen</h2>
            <div className="target-hint">Diese Werte werden direkt in der App gespeichert.</div>
          </div>

          <div className="form-grid">
            <Field label="Protein-Ziel (g pro Tag)"><input value={settings.proteinGoal} onChange={(e) => setSettings((prev) => ({ ...prev, proteinGoal: e.target.value }))} /></Field>
            <Field label="Schrittziel (pro Tag)"><input value={settings.stepsGoal} onChange={(e) => setSettings((prev) => ({ ...prev, stepsGoal: e.target.value }))} /></Field>
            <Field label="Schlafziel (Stunden pro Nacht)"><input value={settings.sleepGoal} onChange={(e) => setSettings((prev) => ({ ...prev, sleepGoal: e.target.value }))} /></Field>
            <Field label="Zielgewicht (kg)"><input value={settings.goalWeight} onChange={(e) => setSettings((prev) => ({ ...prev, goalWeight: e.target.value }))} /></Field>
          </div>

          <div className="actions">
            <button className="primary" onClick={saveSettings}>Einstellungen speichern</button>
            <button className="secondary" onClick={resetSettings}>Standardwerte wiederherstellen</button>
            {settingsSavedMessage ? <span className="saved">{settingsSavedMessage}</span> : null}
          </div>
        </section>
      )}

      {entries.length > 0 && (
        <section className="panel">
          <div className="panel-header">
            <h2>Letzte Einträge</h2>
            <div className="target-hint">Lokal gespeichert auf diesem Gerät</div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Gewicht</th>
                  <th>Kalorien</th>
                  <th>Protein</th>
                  <th>Schritte</th>
                  <th>Schlaf</th>
                  <th>Zigaretten</th>
                </tr>
              </thead>
              <tbody>
                {[...entries].reverse().slice(0, 10).map((item, idx) => (
                  <tr key={`${item.date}-${idx}`}>
                    <td>{item.date}</td>
                    <td>{item.weight || "–"}</td>
                    <td>{item.calories || "–"}</td>
                    <td>{item.protein || "–"}</td>
                    <td>{item.steps || "–"}</td>
                    <td>{item.sleep || "–"}</td>
                    <td>{item.cigarettes || "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="card">
      <div className="card-title">{title}</div>
      <div className="card-value">{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

function ProgressRow({
  label,
  current,
  target,
  pct,
  unit,
}: {
  label: string;
  current: number;
  target: number;
  pct: number;
  unit: string;
}) {
  return (
    <div className="progress-row">
      <div className="progress-label">
        <span>{label}</span>
        <span>{current} / {target} {unit}</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
