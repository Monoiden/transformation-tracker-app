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

type AnalysisInput = {
  sex: "male" | "female";
  age: string;
  heightCm: string;
  currentWeightKg: string;
  targetWeightKg: string;
  activityLevel: "very_low" | "low" | "light_training" | "moderate_training" | "high_training";
  trainingDays: string;
  cigarettesPerDay: string;
  goalMode: "fat_loss" | "recomp" | "maintain";
};

type Recommendation = {
  bmr: number;
  pal: number;
  tdee: number;
  deficit: number;
  avgCalories: number;
  trainingCalories: number;
  restCalories: number;
  proteinGoal: number;
  fatGoal: number;
  carbsTraining: number;
  carbsRest: number;
  stepsGoal: number;
  sleepGoal: number;
  projected16WeekLow: number;
  projected16WeekHigh: number;
  suggestedGoalWeight: number;
  notes: string[];
};

const ENTRY_KEY = "tracker-entries-v3";
const SETTINGS_KEY = "tracker-settings-v3";
const ANALYSIS_KEY = "tracker-analysis-v3";

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

const defaultAnalysis: AnalysisInput = {
  sex: "male",
  age: "35",
  heightCm: "171",
  currentWeightKg: "103",
  targetWeightKg: "85",
  activityLevel: "very_low",
  trainingDays: "5",
  cigarettesPerDay: "0",
  goalMode: "fat_loss",
};

function round5(n: number) {
  return Math.round(n / 5) * 5;
}

function calcRecommendation(input: AnalysisInput): Recommendation | null {
  const age = Number(input.age);
  const height = Number(input.heightCm);
  const weight = Number(input.currentWeightKg);
  const targetWeight = Number(input.targetWeightKg);
  const trainingDays = Number(input.trainingDays);
  const cigarettes = Number(input.cigarettesPerDay);

  if (!age || !height || !weight) return null;

  const sexAdj = input.sex === "male" ? 5 : -161;
  const bmr = 10 * weight + 6.25 * height - 5 * age + sexAdj;

  const palMap = {
    very_low: 1.4,
    low: 1.5,
    light_training: 1.55,
    moderate_training: 1.65,
    high_training: 1.75,
  } as const;

  let pal = palMap[input.activityLevel];
  if (input.activityLevel === "very_low" && trainingDays >= 4) pal = 1.55;

  const tdee = bmr * pal;
  const deficit = input.goalMode === "fat_loss" ? 600 : input.goalMode === "recomp" ? 300 : 0;
  const avgCalories = Math.max(1400, Math.round(tdee - deficit));
  const trainingCalories = Math.round(avgCalories + 50);
  const restCalories = Math.round(avgCalories - 50);

  const proteinGoal = round5(Math.max(140, weight * 1.8));
  const effectiveTarget = targetWeight > 0 ? targetWeight : Math.max(weight - weight * 0.12, 75);
  const fatGoal = round5(Math.max(55, effectiveTarget * 0.8));

  const proteinCals = proteinGoal * 4;
  const fatCals = fatGoal * 9;
  const carbsTraining = Math.max(80, Math.round((trainingCalories - proteinCals - fatCals) / 4));
  const carbsRest = Math.max(60, Math.round((restCalories - proteinCals - fatCals) / 4));

  const lossMin = weight * 0.005;
  const lossMax = weight * 0.01;
  const projected16WeekLow = Number(Math.max(weight - lossMax * 16, effectiveTarget).toFixed(1));
  const projected16WeekHigh = Number(Math.max(weight - lossMin * 16, effectiveTarget).toFixed(1));
  const suggestedGoalWeight = Number(Math.max(effectiveTarget, weight - lossMin * 16).toFixed(1));

  let stepsGoal = 7000;
  if (input.activityLevel === "very_low") stepsGoal = 5000;
  if (input.activityLevel === "low") stepsGoal = 6000;
  if (input.activityLevel === "moderate_training") stepsGoal = 8000;
  if (input.activityLevel === "high_training") stepsGoal = 9000;

  const notes: string[] = [
    "Starte konservativ und bewerte die Trendlinie erst nach 10–14 Tagen.",
    "Halte das Gewichtsverlust-Tempo grob zwischen 0,5 % und 1,0 % pro Woche.",
  ];
  if (cigarettes > 0) notes.push("Bei Rauchen: Baseline erfassen, schrittweise reduzieren und nicht kurz vor dem Training rauchen.");
  if (input.activityLevel === "very_low" || input.activityLevel === "low") notes.push("Bei niedriger Aktivität zuerst Schritte erhöhen, bevor du das Defizit weiter verschärfst.");
  if (trainingDays >= 4) notes.push("Mit mehreren Trainingstagen sind höhere Proteinmengen und ausreichende Kohlenhydrate sinnvoll.");

  return {
    bmr: Math.round(bmr),
    pal: Number(pal.toFixed(2)),
    tdee: Math.round(tdee),
    deficit,
    avgCalories,
    trainingCalories,
    restCalories,
    proteinGoal,
    fatGoal,
    carbsTraining,
    carbsRest,
    stepsGoal,
    sleepGoal: 7.5,
    projected16WeekLow,
    projected16WeekHigh,
    suggestedGoalWeight,
    notes,
  };
}

export default function Page() {
  const [entry, setEntry] = useState<Entry>(emptyEntry);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [analysis, setAnalysis] = useState<AnalysisInput>(defaultAnalysis);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "daily" | "weekly" | "settings">("dashboard");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    try {
      const rawEntries = window.localStorage.getItem(ENTRY_KEY);
      if (rawEntries) setEntries(JSON.parse(rawEntries));
      const rawSettings = window.localStorage.getItem(SETTINGS_KEY);
      if (rawSettings) setSettings({ ...defaultSettings, ...JSON.parse(rawSettings) });
      const rawAnalysis = window.localStorage.getItem(ANALYSIS_KEY);
      const a = rawAnalysis ? { ...defaultAnalysis, ...JSON.parse(rawAnalysis) } : defaultAnalysis;
      setAnalysis(a);
      const rec = calcRecommendation(a);
      if (rec) setRecommendation(rec);
    } catch {}
  }, []);

  useEffect(() => { window.localStorage.setItem(ENTRY_KEY, JSON.stringify(entries)); }, [entries]);
  useEffect(() => { window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }, [settings]);

  const stats = useMemo(() => {
    const latest = entries[entries.length - 1];
    const list = (key: keyof Entry) =>
      entries.map((e) => Number(e[key])).filter((v) => Number.isFinite(v) && v > 0);
    const avg = (arr: number[]) => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : "–";
    const current = Number(latest?.weight || 0);
    const goal = Number(settings.goalWeight || 0);
    return {
      latestWeight: latest?.weight || "–",
      averageWeight: avg(list("weight")),
      averageSleep: avg(list("sleep")),
      averageSteps: avg(list("steps")),
      latestCalories: latest?.calories || "–",
      count: entries.length,
      goalWeight: settings.goalWeight || "–",
      remainingKg: current > 0 && goal > 0 ? Math.max(0, current - goal).toFixed(1) : "–",
    };
  }, [entries, settings]);

  function saveEntry() {
    setEntries((prev) => [...prev, entry].sort((a, b) => a.date.localeCompare(b.date)));
    setEntry({ ...emptyEntry, date: new Date().toISOString().slice(0, 10) });
    setMsg("Eintrag gespeichert.");
    window.setTimeout(() => setMsg(""), 1800);
  }

  function deleteAll() {
    if (!window.confirm("Alle lokal gespeicherten Einträge löschen?")) return;
    setEntries([]);
    window.localStorage.removeItem(ENTRY_KEY);
  }

  function runAnalysis() {
    const rec = calcRecommendation(analysis);
    if (!rec) {
      setMsg("Bitte Alter, Größe und aktuelles Gewicht ausfüllen.");
      window.setTimeout(() => setMsg(""), 2200);
      return;
    }
    setRecommendation(rec);
    const nextSettings = {
      proteinGoal: String(rec.proteinGoal),
      stepsGoal: String(rec.stepsGoal),
      sleepGoal: String(rec.sleepGoal),
      goalWeight: String(rec.suggestedGoalWeight),
    };
    setSettings(nextSettings);
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(nextSettings));
    window.localStorage.setItem(ANALYSIS_KEY, JSON.stringify(analysis));
    setMsg("Analyse durchgeführt. Empfehlungen übernommen.");
    window.setTimeout(() => setMsg(""), 2200);
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
          <p>Jetzt mit Analyse und Empfehlungen für Kalorien, Makros, Schritte, Schlaf und Zielgewicht.</p>
        </div>
        <div className="hero-badges">
          <span className="badge">Analyse</span>
          <span className="badge">Empfehlungen</span>
          <span className="badge">Lokal gespeichert</span>
        </div>
      </section>

      <nav className="tabs">
        <button className={activeTab === "dashboard" ? "tab active" : "tab"} onClick={() => setActiveTab("dashboard")}>Dashboard</button>
        <button className={activeTab === "daily" ? "tab active" : "tab"} onClick={() => setActiveTab("daily")}>Täglich</button>
        <button className={activeTab === "weekly" ? "tab active" : "tab"} onClick={() => setActiveTab("weekly")}>Wochenreview</button>
        <button className={activeTab === "settings" ? "tab active" : "tab"} onClick={() => setActiveTab("settings")}>Einstellungen</button>
      </nav>

      {activeTab === "dashboard" && (
        <>
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

          {recommendation && (
            <section className="panel">
              <div className="panel-header">
                <h2>Empfehlung</h2>
                <div className="target-hint">Ergebnis der Analyse</div>
              </div>
              <div className="grid">
                <Card title="BMR" value={`${recommendation.bmr} kcal`} />
                <Card title="PAL" value={`${recommendation.pal}`} />
                <Card title="TDEE" value={`${recommendation.tdee} kcal`} />
                <Card title="Defizit" value={`${recommendation.deficit} kcal`} />
                <Card title="Ø Tageskalorien" value={`${recommendation.avgCalories} kcal`} />
                <Card title="Trainingstag" value={`${recommendation.trainingCalories} kcal`} />
                <Card title="Ruhetag" value={`${recommendation.restCalories} kcal`} />
                <Card title="Protein" value={`${recommendation.proteinGoal} g`} />
                <Card title="Fett" value={`${recommendation.fatGoal} g`} />
                <Card title="KH Training" value={`${recommendation.carbsTraining} g`} />
                <Card title="KH Ruhe" value={`${recommendation.carbsRest} g`} />
                <Card title="16-Wochen-Fenster" value={`${recommendation.projected16WeekLow}–${recommendation.projected16WeekHigh} kg`} />
              </div>
              <div className="notes-list">
                {recommendation.notes.map((note, idx) => (
                  <div key={idx} className="note-item">{note}</div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {activeTab === "daily" && (
        <section className="panel">
          <div className="panel-header">
            <h2>Täglicher Eintrag</h2>
            <div className="target-hint">Zielwerte: {settings.proteinGoal} g Protein · {settings.stepsGoal} Schritte · {settings.sleepGoal} h Schlaf</div>
          </div>

          <div className="form-grid">
            <Field label="Datum"><input type="date" value={entry.date} onChange={(e) => setEntry({ ...entry, date: e.target.value })} /></Field>
            <Field label="Gewicht (kg)"><input value={entry.weight} onChange={(e) => setEntry({ ...entry, weight: e.target.value })} placeholder="101.8" /></Field>
            <Field label="Kalorien"><input value={entry.calories} onChange={(e) => setEntry({ ...entry, calories: e.target.value })} placeholder={recommendation ? String(recommendation.avgCalories) : "2370"} /></Field>
            <Field label="Protein (g)"><input value={entry.protein} onChange={(e) => setEntry({ ...entry, protein: e.target.value })} placeholder={settings.proteinGoal} /></Field>
            <Field label="Kohlenhydrate (g)"><input value={entry.carbs} onChange={(e) => setEntry({ ...entry, carbs: e.target.value })} placeholder={recommendation ? String(recommendation.carbsTraining) : "245"} /></Field>
            <Field label="Fett (g)"><input value={entry.fat} onChange={(e) => setEntry({ ...entry, fat: e.target.value })} placeholder={recommendation ? String(recommendation.fatGoal) : "70"} /></Field>
            <Field label="Schritte"><input value={entry.steps} onChange={(e) => setEntry({ ...entry, steps: e.target.value })} placeholder={settings.stepsGoal} /></Field>
            <Field label="Schlaf (h)"><input value={entry.sleep} onChange={(e) => setEntry({ ...entry, sleep: e.target.value })} placeholder={settings.sleepGoal} /></Field>
            <Field label="Zigaretten"><input value={entry.cigarettes} onChange={(e) => setEntry({ ...entry, cigarettes: e.target.value })} placeholder="0" /></Field>
            <Field label="Taillenumfang (cm)"><input value={entry.waist} onChange={(e) => setEntry({ ...entry, waist: e.target.value })} placeholder="108" /></Field>
            <Field label="Ruhepuls"><input value={entry.restPulse} onChange={(e) => setEntry({ ...entry, restPulse: e.target.value })} placeholder="60" /></Field>
            <div className="field">
              <label>Erledigt</label>
              <div className="checkboxes">
                <label><input type="checkbox" checked={entry.trainingDone} onChange={(e) => setEntry({ ...entry, trainingDone: e.target.checked })} /> Training</label>
                <label><input type="checkbox" checked={entry.zone2Done} onChange={(e) => setEntry({ ...entry, zone2Done: e.target.checked })} /> Zone 2</label>
              </div>
            </div>
            <Field label="Notizen"><textarea value={entry.notes} onChange={(e) => setEntry({ ...entry, notes: e.target.value })} placeholder="Hunger, Performance, Stimmung, Besonderheiten ..." rows={4} /></Field>
          </div>

          <div className="progress-grid">
            <ProgressRow label="Protein" current={Number(entry.protein || 0)} target={proteinGoal} pct={proteinPct} unit="g" />
            <ProgressRow label="Schritte" current={Number(entry.steps || 0)} target={stepsGoal} pct={stepsPct} unit="" />
            <ProgressRow label="Schlaf" current={Number(entry.sleep || 0)} target={sleepGoal} pct={sleepPct} unit="h" />
          </div>

          <div className="actions">
            <button className="primary" onClick={saveEntry}>Eintrag speichern</button>
            <button className="secondary" onClick={deleteAll}>Alle lokalen Daten löschen</button>
            {msg ? <span className="saved">{msg}</span> : null}
          </div>
        </section>
      )}

      {activeTab === "weekly" && (
        <section className="panel">
          <div className="panel-header">
            <h2>Wochenreview</h2>
            <div className="target-hint">Checkliste entsprechend deinem Tracker</div>
          </div>
          <div className="check-grid">
            {["4 Morgenwiegungen gemacht","Wochenschnitt dokumentiert","Taillenumfang gemessen","Fotos gemacht","5 Krafteinheiten absolviert","Zone 2 absolviert","Protein-Ziel an mindestens 6 Tagen erreicht","Schrittziel im Wochenschnitt erreicht","Schlaf im Schnitt erreicht","Zigaretten reduziert oder Abstinenz gehalten"].map((item) => (
              <label key={item} className="check-card"><input type="checkbox" /> <span>{item}</span></label>
            ))}
          </div>
        </section>
      )}

      {activeTab === "settings" && (
        <>
          <section className="panel">
            <div className="panel-header">
              <h2>Analyse</h2>
              <div className="target-hint">Die Analyse übernimmt Empfehlungen in die Einstellungen.</div>
            </div>

            <div className="form-grid">
              <Field label="Geschlecht">
                <select value={analysis.sex} onChange={(e) => setAnalysis({ ...analysis, sex: e.target.value as "male" | "female" })}>
                  <option value="male">Männlich</option>
                  <option value="female">Weiblich</option>
                </select>
              </Field>
              <Field label="Alter"><input value={analysis.age} onChange={(e) => setAnalysis({ ...analysis, age: e.target.value })} /></Field>
              <Field label="Größe (cm)"><input value={analysis.heightCm} onChange={(e) => setAnalysis({ ...analysis, heightCm: e.target.value })} /></Field>
              <Field label="Aktuelles Gewicht (kg)"><input value={analysis.currentWeightKg} onChange={(e) => setAnalysis({ ...analysis, currentWeightKg: e.target.value })} /></Field>
              <Field label="Gewünschtes Zielgewicht (kg)"><input value={analysis.targetWeightKg} onChange={(e) => setAnalysis({ ...analysis, targetWeightKg: e.target.value })} /></Field>
              <Field label="Alltagsaktivität">
                <select value={analysis.activityLevel} onChange={(e) => setAnalysis({ ...analysis, activityLevel: e.target.value as AnalysisInput["activityLevel"] })}>
                  <option value="very_low">Sehr niedrig / sitzend</option>
                  <option value="low">Niedrig</option>
                  <option value="light_training">Leicht aktiv + Training</option>
                  <option value="moderate_training">Moderat aktiv + Training</option>
                  <option value="high_training">Hoch aktiv</option>
                </select>
              </Field>
              <Field label="Trainingstage pro Woche"><input value={analysis.trainingDays} onChange={(e) => setAnalysis({ ...analysis, trainingDays: e.target.value })} /></Field>
              <Field label="Zigaretten pro Tag"><input value={analysis.cigarettesPerDay} onChange={(e) => setAnalysis({ ...analysis, cigarettesPerDay: e.target.value })} /></Field>
              <Field label="Zielmodus">
                <select value={analysis.goalMode} onChange={(e) => setAnalysis({ ...analysis, goalMode: e.target.value as AnalysisInput["goalMode"] })}>
                  <option value="fat_loss">Fettverlust</option>
                  <option value="recomp">Recomposition</option>
                  <option value="maintain">Erhaltung</option>
                </select>
              </Field>
            </div>

            <div className="actions">
              <button className="primary" onClick={runAnalysis}>Analyse durchführen</button>
              {msg ? <span className="saved">{msg}</span> : null}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2>Einstellungen</h2>
              <div className="target-hint">Manuell änderbar oder automatisch aus der Analyse befüllt.</div>
            </div>
            <div className="form-grid">
              <Field label="Protein-Ziel (g pro Tag)"><input value={settings.proteinGoal} onChange={(e) => setSettings({ ...settings, proteinGoal: e.target.value })} /></Field>
              <Field label="Schrittziel (pro Tag)"><input value={settings.stepsGoal} onChange={(e) => setSettings({ ...settings, stepsGoal: e.target.value })} /></Field>
              <Field label="Schlafziel (Stunden pro Nacht)"><input value={settings.sleepGoal} onChange={(e) => setSettings({ ...settings, sleepGoal: e.target.value })} /></Field>
              <Field label="Zielgewicht (kg)"><input value={settings.goalWeight} onChange={(e) => setSettings({ ...settings, goalWeight: e.target.value })} /></Field>
            </div>
            <div className="actions">
              <button className="primary" onClick={() => { window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); setMsg("Einstellungen gespeichert."); window.setTimeout(() => setMsg(""), 1800); }}>Einstellungen speichern</button>
              <button className="secondary" onClick={() => { setSettings(defaultSettings); window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultSettings)); setMsg("Standardwerte wiederhergestellt."); window.setTimeout(() => setMsg(""), 1800); }}>Standardwerte wiederherstellen</button>
            </div>
          </section>
        </>
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
                <tr><th>Datum</th><th>Gewicht</th><th>Kalorien</th><th>Protein</th><th>Schritte</th><th>Schlaf</th><th>Zigaretten</th></tr>
              </thead>
              <tbody>
                {[...entries].reverse().slice(0, 10).map((item, idx) => (
                  <tr key={`${item.date}-${idx}`}>
                    <td>{item.date}</td><td>{item.weight || "–"}</td><td>{item.calories || "–"}</td><td>{item.protein || "–"}</td><td>{item.steps || "–"}</td><td>{item.sleep || "–"}</td><td>{item.cigarettes || "–"}</td>
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
  return <div className="card"><div className="card-title">{title}</div><div className="card-value">{value}</div></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="field"><label>{label}</label>{children}</div>;
}

function ProgressRow({ label, current, target, pct, unit }: { label: string; current: number; target: number; pct: number; unit: string }) {
  return (
    <div className="progress-row">
      <div className="progress-label"><span>{label}</span><span>{current} / {target} {unit}</span></div>
      <div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
    </div>
  );
}
