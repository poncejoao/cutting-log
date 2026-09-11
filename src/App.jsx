import React, { useState, useEffect, useRef, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Dumbbell, UtensilsCrossed, TrendingUp, Home, Plus, Minus, Check, Settings, ChevronRight, ChevronUp, ChevronDown, Flame, X, Repeat, Download } from "lucide-react";

// ---------- Static plan data (from João's program) ----------
const DAY_TYPES = { P: "Push", U: "Pull", L: "Legs", D: "Descanso" };
const DAY_COLOR = { Push: "var(--push)", Pull: "var(--pull)", Legs: "var(--legs)", Descanso: "var(--muted)" };
const WEEKDAY_LABEL = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DEFAULT_SCHEDULE = { 0: "Descanso", 1: "Push", 2: "Pull", 3: "Legs", 4: "Push", 5: "Pull", 6: "Legs" };

const PLAN = {
  Push: [
    { id: "supino-reto", n: "Supino reto", sets: 3, reps: "6-8", rir: "1-2", variations: ["Barra", "Halteres", "Máquina", "Smith"], equivalents: ["Supino máquina (peck deck press)", "Crucifixo reto halteres"] },
    { id: "supino-inclinado", n: "Supino inclinado halteres", sets: 3, reps: "8-10", rir: "1-2", variations: ["Halteres", "Barra", "Máquina", "Smith"], equivalents: ["Supino inclinado barra", "Supino inclinado máquina", "Crucifixo inclinado halteres"] },
    { id: "desenvolvimento", n: "Desenvolvimento militar", sets: 3, reps: "8-10", rir: "1-2", variations: ["Barra", "Halteres", "Máquina", "Smith"], equivalents: ["Desenvolvimento Arnold", "Desenvolvimento máquina"] },
    { id: "elevacao-lateral", n: "Elevação lateral", sets: 3, reps: "12-15", rir: "0-1", variations: ["Halteres", "Polia", "Máquina"], equivalents: ["Elevação lateral polia unilateral", "Elevação lateral máquina"] },
    { id: "triceps-pulley", n: "Tríceps pulley", sets: 3, reps: "10-12", rir: "0-1", variations: ["Barra reta", "Barra V", "Corda", "Puxador unilateral"], equivalents: ["Tríceps testa (skull crusher)", "Mergulho no banco (bench dip)"] },
    { id: "triceps-frances", n: "Tríceps francês", sets: 2, reps: "10-12", rir: "0-1", variations: ["Barra", "Halteres", "Corda (polia)"], equivalents: ["Tríceps testa barra W", "Tríceps coice (kickback)"] },
  ],
  Pull: [
    { id: "remada-curvada", n: "Remada curvada pronada", sets: 3, reps: "6-8", rir: "1-2", variations: ["Barra", "Halteres"], equivalents: ["Remada curvada supinada", "Remada cavalinho (T-bar row)", "Remada máquina"] },
    { id: "puxada-aberta", n: "Puxada aberta", sets: 3, reps: "8-10", rir: "1", variations: ["Pegada aberta", "Pegada supinada", "Pegada neutra", "Máquina"], equivalents: ["Barra fixa (pull-up)", "Puxada triângulo"] },
    { id: "remada-baixa", n: "Remada baixa", sets: 3, reps: "8-10", rir: "1", variations: ["Triângulo", "Barra reta", "Pegada aberta"], equivalents: ["Remada unilateral halter (serrote)", "Remada máquina peck deck invertido"] },
    { id: "face-pull", n: "Face pull", sets: 3, reps: "12-15", rir: "0-1", variations: ["Corda", "Barra reta"], equivalents: ["Crucifixo invertido máquina", "Crucifixo invertido halteres"] },
    { id: "rosca-direta", n: "Rosca direta", sets: 3, reps: "8-10", rir: "1", variations: ["Barra reta", "Barra W", "Halteres"], equivalents: ["Rosca Scott", "Rosca concentrada"] },
    { id: "rosca-martelo", n: "Rosca martelo", sets: 2, reps: "10-12", rir: "0-1", variations: ["Halteres", "Corda (polia)"], equivalents: ["Rosca alternada halteres", "Rosca corda polia"] },
    { id: "lombar-maquina", n: "Lombar máquina", sets: 2, reps: "10-15", rir: "1-2", variations: ["Máquina", "Extensão lombar 45°"], equivalents: ["Extensão lombar solo (superman)", "Good morning leve"] },
  ],
  Legs: [
    { id: "agachamento", n: "Agachamento livre", sets: 3, reps: "6-8", rir: "1-2", variations: ["Barra livre", "Smith", "Barra segura (safety bar)"], equivalents: ["Leg press 45°", "Hack machine", "Agachamento búlgaro"] },
    { id: "cadeira-extensora", n: "Cadeira extensora", sets: 3, reps: "10-12", rir: "0-1", variations: ["Bilateral", "Unilateral"], equivalents: ["Agachamento sissy"] },
    { id: "mesa-flexora", n: "Mesa flexora", sets: 3, reps: "10-12", rir: "0-1", variations: ["Deitado", "Sentado", "Em pé unilateral"], equivalents: ["Stiff (RDL) halteres", "Flexora sentado"] },
    { id: "panturrilha-pe", n: "Panturrilha em pé", sets: 3, reps: "12-15", rir: "0-1", variations: ["Máquina em pé", "Smith", "Halteres"], equivalents: ["Panturrilha no leg press", "Panturrilha Smith"] },
    { id: "panturrilha-sentada", n: "Panturrilha sentada", sets: 2, reps: "15-20", rir: "0", variations: ["Máquina sentado"], equivalents: ["Panturrilha burrinho (donkey calf raise)"] },
    { id: "abdomen", n: "Abdômen", sets: 3, reps: "15-20", rir: "0-1", variations: ["Máquina", "Solo", "Polia (cabo)"], equivalents: ["Prancha isométrica", "Elevação de pernas"] },
  ],
};

// Banco de alimentos — valores aproximados por 100g (proteína/carbo/gordura em g).
// São estimativas médias de referência, não análise laboratorial exata.
const FOOD_DB = [
  { n: "Arroz branco cozido", p: 2.5, c: 28.1, f: 0.2 },
  { n: "Arroz integral cozido", p: 2.6, c: 25.8, f: 1.0 },
  { n: "Feijão carioca cozido", p: 4.8, c: 13.6, f: 0.5 },
  { n: "Feijão preto cozido", p: 4.5, c: 14.0, f: 0.5 },
  { n: "Frango peito grelhado", p: 31.0, c: 0, f: 3.6 },
  { n: "Frango coxa/sobrecoxa assada", p: 26.0, c: 0, f: 10.0 },
  { n: "Carne bovina patinho grelhado", p: 32.0, c: 0, f: 4.0 },
  { n: "Carne bovina acém cozido", p: 28.0, c: 0, f: 12.0 },
  { n: "Carne moída magra refogada", p: 26.0, c: 0, f: 10.0 },
  { n: "Ovo cozido/inteiro", p: 13.0, c: 1.1, f: 11.0 },
  { n: "Clara de ovo", p: 11.0, c: 0.7, f: 0.2 },
  { n: "Pão francês", p: 8.0, c: 58.0, f: 3.0 },
  { n: "Pão integral", p: 9.0, c: 49.0, f: 4.0 },
  { n: "Queijo minas frescal", p: 17.4, c: 3.2, f: 20.0 },
  { n: "Queijo muçarela", p: 22.6, c: 2.2, f: 25.0 },
  { n: "Requeijão", p: 8.0, c: 3.0, f: 24.0 },
  { n: "Leite integral", p: 3.2, c: 4.7, f: 3.5 },
  { n: "Leite desnatado", p: 3.4, c: 5.0, f: 0.2 },
  { n: "Iogurte natural integral", p: 3.5, c: 4.7, f: 3.0 },
  { n: "Batata doce cozida", p: 1.6, c: 20.0, f: 0.1 },
  { n: "Batata inglesa cozida", p: 1.9, c: 18.0, f: 0.1 },
  { n: "Mandioca cozida", p: 1.0, c: 30.0, f: 0.3 },
  { n: "Macarrão cozido", p: 5.0, c: 25.0, f: 1.0 },
  { n: "Aveia em flocos", p: 13.9, c: 66.6, f: 8.5 },
  { n: "Tapioca (goma hidratada)", p: 0.2, c: 27.0, f: 0.1 },
  { n: "Banana", p: 1.1, c: 23.0, f: 0.3 },
  { n: "Maçã", p: 0.3, c: 14.0, f: 0.2 },
  { n: "Abacate", p: 2.0, c: 6.0, f: 15.0 },
  { n: "Whey protein (pó)", p: 75.0, c: 10.0, f: 6.0 },
  { n: "Azeite de oliva", p: 0, c: 0, f: 100.0 },
  { n: "Óleo de soja/girassol", p: 0, c: 0, f: 100.0 },
  { n: "Manteiga", p: 0.6, c: 0.1, f: 82.0 },
  { n: "Amendoim", p: 27.0, c: 16.0, f: 49.0 },
  { n: "Pasta de amendoim", p: 25.0, c: 20.0, f: 50.0 },
  { n: "Tilápia grelhada", p: 26.0, c: 0, f: 2.7 },
  { n: "Atum em água (lata)", p: 26.0, c: 0, f: 1.0 },
  { n: "Presunto", p: 18.0, c: 2.0, f: 5.0 },
  { n: "Peito de peru (frios)", p: 20.0, c: 2.0, f: 2.0 },
  { n: "Brócolis cozido", p: 2.6, c: 4.0, f: 0.3 },
  { n: "Alface", p: 1.0, c: 2.0, f: 0.1 },
  { n: "Tomate", p: 0.9, c: 3.9, f: 0.2 },
  { n: "Cenoura crua", p: 0.9, c: 9.6, f: 0.2 },
];

const DIET_TARGETS = {
  Treino: { protein: 157.5, carb: 257.5 },
  Descanso: { protein: 158, carb: 195 },
};

const DEFAULT_SETTINGS = {
  schedule: DEFAULT_SCHEDULE,
  fatTraining: 60,
  fatRest: 60,
  startWeight: 71,
  exerciseVariations: {},
  exerciseSubstitutions: {},
  exerciseOrder: {},
};

// ---------- Helpers ----------
const todayISO = (d = new Date()) => {
  const tz = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return tz.toISOString().slice(0, 10);
};
const fmtDateLabel = (iso) => {
  const d = new Date(iso + "T12:00:00");
  return `${WEEKDAY_LABEL[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
};
const topRep = (range) => parseInt(range.split("-").pop(), 10);
const isTrainingDay = (dayType) => dayType === "Push" || dayType === "Pull" || dayType === "Legs";
const kcal = (p, c, f) => Math.round(p * 4 + c * 4 + f * 9);
const computeFromFood = (food, g) => ({
  protein: (food.p * g) / 100,
  carb: (food.c * g) / 100,
  fat: (food.f * g) / 100,
});

function useDebouncedSave(value, key, ready) {
  const timer = useRef(null);
  const latest = useRef(value);
  latest.current = value;

  useEffect(() => {
    if (!ready) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      timer.current = null;
      try {
        await window.storage.set(key, JSON.stringify(latest.current), false);
      } catch (e) {
        console.error("save failed", key, e);
      }
    }, 400);
    return () => clearTimeout(timer.current);
  }, [value, key, ready]);

  // Salva na hora se o app for minimizado/fechado antes do debounce terminar —
  // no iOS o Safari pode matar o PWA em background quase instantaneamente,
  // então não dá pra confiar só no timer de 400ms.
  useEffect(() => {
    if (!ready) return;
    const flush = () => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
        window.storage.set(key, JSON.stringify(latest.current), false).catch((e) => {
          console.error("flush save failed", key, e);
        });
      }
    };
    const onVisibility = () => {
      if (document.hidden) flush();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
    };
  }, [key, ready]);
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState("hoje");
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [logs, setLogs] = useState({});
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const l = await window.storage.get("logs");
        if (l && l.value) setLogs(JSON.parse(l.value));
      } catch (e) {}
      try {
        const s = await window.storage.get("settings");
        if (s && s.value) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(s.value) });
      } catch (e) {}
      setReady(true);
    })();
  }, []);

  useDebouncedSave(logs, "logs", ready);
  useDebouncedSave(settings, "settings", ready);

  const dow = new Date(selectedDate + "T12:00:00").getDay();
  const dayType = settings.schedule[dow] || "Descanso";
  const dietCat = isTrainingDay(dayType) ? "Treino" : "Descanso";
  const dayEntry = logs[selectedDate] || {};

  function updateDay(patch) {
    setLogs((prev) => ({
      ...prev,
      [selectedDate]: { ...(prev[selectedDate] || {}), ...patch },
    }));
  }

  // history of a given exercise across all logged days, sorted ascending by date
  function exerciseHistory(name) {
    return Object.entries(logs)
      .filter(([d, v]) => v?.exercises?.[name]?.sets?.length)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([d, v]) => ({ date: d, sets: v.exercises[name].sets }));
  }

  return (
    <div className="app">
      <style>{CSS}</style>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" style={{ background: DAY_COLOR[dayType] }} />
          <div>
            <div className="brand-title">Cutting Log</div>
            <div className="brand-sub">João Gabriel · PPL</div>
          </div>
        </div>
        <button className="icon-btn" onClick={() => setShowSettings(true)} aria-label="Configurações">
          <Settings size={18} />
        </button>
      </header>

      <main className="content">
        {tab === "hoje" && (
          <HojeTab
            settings={settings}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            dayType={dayType}
            dietCat={dietCat}
            dayEntry={dayEntry}
            updateDay={updateDay}
            setTab={setTab}
          />
        )}
        {tab === "treino" && (
          <TreinoTab
            dayType={dayType}
            dayEntry={dayEntry}
            updateDay={updateDay}
            exerciseHistory={exerciseHistory}
            selectedDate={selectedDate}
            settings={settings}
            setSettings={setSettings}
          />
        )}
        {tab === "dieta" && (
          <DietaTab dietCat={dietCat} settings={settings} dayEntry={dayEntry} updateDay={updateDay} />
        )}
        {tab === "progresso" && <ProgressoTab logs={logs} settings={settings} />}
      </main>

      <nav className="tabbar">
        <TabBtn icon={Home} label="Hoje" active={tab === "hoje"} onClick={() => setTab("hoje")} />
        <TabBtn icon={Dumbbell} label="Treino" active={tab === "treino"} onClick={() => setTab("treino")} />
        <TabBtn icon={UtensilsCrossed} label="Dieta" active={tab === "dieta"} onClick={() => setTab("dieta")} />
        <TabBtn icon={TrendingUp} label="Progresso" active={tab === "progresso"} onClick={() => setTab("progresso")} />
      </nav>

      {showSettings && (
        <SettingsSheet settings={settings} setSettings={setSettings} logs={logs} onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}

function TabBtn({ icon: Icon, label, active, onClick }) {
  return (
    <button className={"tab-btn" + (active ? " active" : "")} onClick={onClick}>
      <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
      <span>{label}</span>
    </button>
  );
}

// ---------------- Hoje ----------------
function HojeTab({ settings, selectedDate, setSelectedDate, dayType, dietCat, dayEntry, updateDay, setTab }) {
  const training = isTrainingDay(dayType);
  const target = DIET_TARGETS[dietCat];
  const fatTarget = training ? settings.fatTraining : settings.fatRest;
  const targetKcal = kcal(target.protein, target.carb, fatTarget);
  const meals = dayEntry.meals || [];
  const got = meals.reduce(
    (a, m) => ({ protein: a.protein + m.protein, carb: a.carb + m.carb, fat: a.fat + m.fat }),
    { protein: 0, carb: 0, fat: 0 }
  );
  const gotKcal = kcal(got.protein, got.carb, got.fat);
  const exercisesDone = dayEntry.exercises ? Object.keys(dayEntry.exercises).length : 0;
  const exercisesTotal = training ? PLAN[dayType].length : 0;

  const isToday = selectedDate === todayISO();
  const hour = new Date().getHours();
  const showWeightReminder = isToday && dayEntry.bodyweight == null && hour >= 9;

  return (
    <div className="stack">
      {showWeightReminder && (
        <div className="reminder-banner">
          <Flame size={14} />
          <span>Ainda não registrou o peso de hoje — pesa em jejum antes de comer/beber algo.</span>
        </div>
      )}
      <div className="date-row">
        <button
          className="date-nav"
          onClick={() => {
            const d = new Date(selectedDate + "T12:00:00");
            d.setDate(d.getDate() - 1);
            setSelectedDate(todayISO(d));
          }}
        >
          ‹
        </button>
        <div className="date-label">{fmtDateLabel(selectedDate)}</div>
        <button
          className="date-nav"
          onClick={() => {
            const d = new Date(selectedDate + "T12:00:00");
            d.setDate(d.getDate() + 1);
            setSelectedDate(todayISO(d));
          }}
        >
          ›
        </button>
      </div>

      <div className="hero-card" style={{ borderColor: DAY_COLOR[dayType] }}>
        <div className="hero-eyebrow" style={{ color: DAY_COLOR[dayType] }}>
          {dietCat === "Treino" ? "Dia de treino" : "Dia de descanso"}
        </div>
        <div className="hero-title">{dayType}</div>
        {training && (
          <div className="hero-progress">
            {exercisesDone}/{exercisesTotal} exercícios registrados
          </div>
        )}
        <button className="hero-cta" onClick={() => setTab(training ? "treino" : "dieta")}>
          {training ? "Abrir treino de hoje" : "Ver metas de hoje"} <ChevronRight size={16} />
        </button>
      </div>

      <div className="card">
        <div className="card-head">Macros de hoje</div>
        <MacroBar label="Proteína" got={got.protein} target={target.protein} color="var(--push)" unit="g" />
        <MacroBar label="Carboidrato" got={got.carb} target={target.carb} color="var(--pull)" unit="g" />
        <MacroBar label="Gordura" got={got.fat} target={fatTarget} color="var(--legs)" unit="g" />
        <div className="kcal-row">
          <span>{gotKcal} kcal</span>
          <span className="muted"> / {targetKcal} kcal</span>
        </div>
      </div>

      <div className="card">
        <div className="card-head">Peso corporal</div>
        <BodyweightQuickLog dayEntry={dayEntry} updateDay={updateDay} startWeight={settings.startWeight} />
        <div className="hint">Sempre em jejum, ao acordar, antes de comer/beber — mantém o padrão pra comparação real.</div>
      </div>
    </div>
  );
}

function MacroBar({ label, got, target, color, unit }) {
  const pct = target > 0 ? Math.min(100, (got / target) * 100) : 0;
  return (
    <div className="macro-row">
      <div className="macro-labels">
        <span>{label}</span>
        <span className="mono">
          {Math.round(got)}
          {unit} <span className="muted">/ {Math.round(target)}{unit}</span>
        </span>
      </div>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: pct + "%", background: color }} />
      </div>
    </div>
  );
}

function BodyweightQuickLog({ dayEntry, updateDay, startWeight }) {
  const [val, setVal] = useState(dayEntry.bodyweight ?? "");
  useEffect(() => setVal(dayEntry.bodyweight ?? ""), [dayEntry.bodyweight]);
  return (
    <div className="bw-row">
      <input
        className="input mono"
        type="number"
        step="0.1"
        placeholder={String(startWeight)}
        value={val}
        onChange={(e) => {
          const v = e.target.value;
          setVal(v);
          updateDay({ bodyweight: v === "" ? null : parseFloat(v) });
        }}
      />
      <span className="muted">kg</span>
    </div>
  );
}

// ---------------- Treino ----------------
function TreinoTab({ dayType, dayEntry, updateDay, exerciseHistory, selectedDate, settings, setSettings }) {
  if (!isTrainingDay(dayType)) {
    return (
      <div className="stack">
        <div className="empty-state">
          <div className="empty-title">Dia de descanso</div>
          <p className="muted">Sem treino programado para {fmtDateLabel(selectedDate)}. Aproveite pra recuperar.</p>
        </div>
      </div>
    );
  }
  const planExercises = PLAN[dayType];
  const order = settings.exerciseOrder[dayType] || planExercises.map((e) => e.id);
  // garante que ids novos (ou fora de ordem salva) apareçam também
  const fullOrder = [...order, ...planExercises.map((e) => e.id).filter((id) => !order.includes(id))];
  const orderedExercises = fullOrder.map((id) => planExercises.find((e) => e.id === id)).filter(Boolean);

  const logged = dayEntry.exercises || {};

  function effectiveName(ex) {
    return settings.exerciseSubstitutions[ex.id] || ex.n;
  }

  function setExerciseSets(key, sets) {
    updateDay({ exercises: { ...logged, [key]: { sets } } });
  }

  function setVariation(id, variation) {
    setSettings((prev) => ({
      ...prev,
      exerciseVariations: { ...prev.exerciseVariations, [id]: variation },
    }));
  }

  function setSubstitution(id, name) {
    setSettings((prev) => ({
      ...prev,
      exerciseSubstitutions: { ...prev.exerciseSubstitutions, [id]: name },
    }));
  }

  function moveExercise(id, dir) {
    const idx = fullOrder.indexOf(id);
    const swapWith = idx + dir;
    if (swapWith < 0 || swapWith >= fullOrder.length) return;
    const next = fullOrder.slice();
    [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
    setSettings((prev) => ({ ...prev, exerciseOrder: { ...prev.exerciseOrder, [dayType]: next } }));
  }

  return (
    <div className="stack">
      <div className="section-title" style={{ color: DAY_COLOR[dayType] }}>
        {dayType} · {fmtDateLabel(selectedDate)}
      </div>
      {orderedExercises.map((ex, i) => {
        const key = effectiveName(ex);
        return (
          <ExerciseCard
            key={ex.id}
            plan={ex}
            effectiveName={key}
            logged={logged[key]?.sets}
            history={exerciseHistory(key)}
            onChange={(sets) => setExerciseSets(key, sets)}
            variation={settings.exerciseVariations[ex.id] || ex.variations[0]}
            onVariationChange={(v) => setVariation(ex.id, v)}
            substitution={settings.exerciseSubstitutions[ex.id] || ex.n}
            onSubstitutionChange={(v) => setSubstitution(ex.id, v)}
            onMoveUp={i > 0 ? () => moveExercise(ex.id, -1) : null}
            onMoveDown={i < orderedExercises.length - 1 ? () => moveExercise(ex.id, 1) : null}
          />
        );
      })}
    </div>
  );
}

function ExerciseCard({
  plan,
  effectiveName,
  logged,
  history,
  onChange,
  variation,
  onVariationChange,
  substitution,
  onSubstitutionChange,
  onMoveUp,
  onMoveDown,
}) {
  const top = topRep(plan.reps);
  const [sets, setSets] = useState(logged || Array.from({ length: plan.sets }, () => ({ weight: "", reps: "" })));

  useEffect(() => {
    setSets(logged || Array.from({ length: plan.sets }, () => ({ weight: "", reps: "" })));
  }, [logged, plan.sets]);

  function commit(next) {
    setSets(next);
    onChange(next.filter((s) => s.weight !== "" || s.reps !== ""));
  }

  function hitTop(entry) {
    if (!entry || !entry.sets || entry.sets.length < plan.sets) return false;
    return entry.sets.every((s) => parseInt(s.reps, 10) >= top);
  }

  const last = history[history.length - 1];
  const prev = history[history.length - 2];
  const lastTwoHitTop = hitTop(last) && hitTop(prev);
  const isSubstituted = substitution !== plan.n;

  let suggestion = null;
  if (last) {
    suggestion = lastTwoHitTop
      ? { text: `Suba a carga (+2,5–5%) — bateu ${top} reps em todas as séries 2x seguidas`, tone: "up" }
      : { text: `Meta: adicionar 1 rep mantendo RIR ${plan.rir}`, tone: "hold" };
  }

  return (
    <div className="card exercise-card">
      <div className="ex-order-controls">
        <button className="order-btn" onClick={onMoveUp} disabled={!onMoveUp} aria-label="Mover pra cima">
          <ChevronUp size={14} />
        </button>
        <button className="order-btn" onClick={onMoveDown} disabled={!onMoveDown} aria-label="Mover pra baixo">
          <ChevronDown size={14} />
        </button>
      </div>
      <div className="ex-head">
        <div>
          <div className="ex-name-row">
            <Repeat size={11} className="swap-icon" />
            <select
              className="ex-name-select"
              value={substitution}
              onChange={(e) => onSubstitutionChange(e.target.value)}
            >
              <option value={plan.n}>{plan.n}</option>
              {plan.equivalents.map((eq) => (
                <option key={eq} value={eq}>
                  {eq}
                </option>
              ))}
            </select>
            {!isSubstituted && (
              <select
                className="variation-chip"
                value={variation}
                onChange={(e) => onVariationChange(e.target.value)}
              >
                {plan.variations.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="ex-meta mono">
            {plan.sets}× {plan.reps} reps · RIR {plan.rir}
            {isSubstituted && <span className="sub-note"> · substituindo {plan.n}</span>}
          </div>
        </div>
        {last && (
          <div className="ex-last-badge mono">
            <span className="muted-sm">últ.</span>
            {last.sets.map((s) => `${s.weight || "—"}×${s.reps || "—"}`).join(" / ")}
          </div>
        )}
      </div>

      {suggestion && (
        <div className={"suggestion " + suggestion.tone}>
          <Flame size={13} /> {suggestion.text}
        </div>
      )}

      <div className="set-grid">
        <div className="set-grid-head muted mono">
          <span>Série</span>
          <span>kg</span>
          <span>reps</span>
        </div>
        {sets.map((s, i) => (
          <div className="set-grid-row" key={i}>
            <span className="mono muted">{i + 1}</span>
            <input
              className="input mono set-input"
              type="number"
              inputMode="decimal"
              value={s.weight}
              onChange={(e) => {
                const next = sets.slice();
                next[i] = { ...next[i], weight: e.target.value };
                commit(next);
              }}
            />
            <input
              className="input mono set-input"
              type="number"
              inputMode="numeric"
              value={s.reps}
              onChange={(e) => {
                const next = sets.slice();
                next[i] = { ...next[i], reps: e.target.value };
                commit(next);
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------- Dieta ----------------
function DietaTab({ dietCat, settings, dayEntry, updateDay }) {
  const target = DIET_TARGETS[dietCat];
  const fatTarget = dietCat === "Treino" ? settings.fatTraining : settings.fatRest;
  const targetKcal = kcal(target.protein, target.carb, fatTarget);
  const meals = dayEntry.meals || [];
  const got = meals.reduce(
    (a, m) => ({ protein: a.protein + m.protein, carb: a.carb + m.carb, fat: a.fat + m.fat }),
    { protein: 0, carb: 0, fat: 0 }
  );
  const remaining = {
    protein: Math.max(0, target.protein - got.protein),
    carb: Math.max(0, target.carb - got.carb),
    fat: Math.max(0, fatTarget - got.fat),
  };

  const [mode, setMode] = useState("food"); // "food" ou "manual"
  const [foodQuery, setFoodQuery] = useState("");
  const [grams, setGrams] = useState("");
  const [manualForm, setManualForm] = useState({ name: "", protein: "", carb: "", fat: "" });

  const matchedFood = FOOD_DB.find((f) => f.n === foodQuery);
  const previewMacros = matchedFood && grams ? computeFromFood(matchedFood, parseFloat(grams) || 0) : null;

  function addFoodMeal() {
    if (!matchedFood || !grams || parseFloat(grams) <= 0) return;
    const m = computeFromFood(matchedFood, parseFloat(grams));
    updateDay({ meals: [...meals, { name: `${matchedFood.n} (${grams}g)`, ...m }] });
    setFoodQuery("");
    setGrams("");
  }

  function addManualMeal() {
    if (!manualForm.name.trim()) return;
    const meal = {
      name: manualForm.name.trim(),
      protein: parseFloat(manualForm.protein) || 0,
      carb: parseFloat(manualForm.carb) || 0,
      fat: parseFloat(manualForm.fat) || 0,
    };
    updateDay({ meals: [...meals, meal] });
    setManualForm({ name: "", protein: "", carb: "", fat: "" });
  }

  function removeMeal(idx) {
    updateDay({ meals: meals.filter((_, i) => i !== idx) });
  }

  return (
    <div className="stack">
      <div className="section-title">{dietCat === "Treino" ? "Meta · dia de treino" : "Meta · dia de descanso"}</div>

      <div className="card">
        <MacroBar label="Proteína" got={got.protein} target={target.protein} color="var(--push)" unit="g" />
        <MacroBar label="Carboidrato" got={got.carb} target={target.carb} color="var(--pull)" unit="g" />
        <MacroBar label="Gordura" got={got.fat} target={fatTarget} color="var(--legs)" unit="g" />
        <div className="kcal-row">
          <span className="mono">{kcal(got.protein, got.carb, got.fat)} kcal</span>
          <span className="muted"> / {targetKcal} kcal</span>
        </div>
        <div className="remaining mono muted">
          Falta: {Math.round(remaining.protein)}g P · {Math.round(remaining.carb)}g C · {Math.round(remaining.fat)}g G
        </div>
      </div>

      <div className="card">
        <div className="mode-toggle">
          <button className={mode === "food" ? "mode-btn active" : "mode-btn"} onClick={() => setMode("food")}>
            Por alimento
          </button>
          <button className={mode === "manual" ? "mode-btn active" : "mode-btn"} onClick={() => setMode("manual")}>
            Manual
          </button>
        </div>

        {mode === "food" ? (
          <>
            <input
              className="input"
              list="food-options"
              placeholder="Digite o alimento (ex: Arroz branco cozido)"
              value={foodQuery}
              onChange={(e) => setFoodQuery(e.target.value)}
            />
            <datalist id="food-options">
              {FOOD_DB.map((f) => (
                <option key={f.n} value={f.n} />
              ))}
            </datalist>
            <input
              className="input mono"
              type="number"
              placeholder="Quantidade (g)"
              value={grams}
              onChange={(e) => setGrams(e.target.value)}
              style={{ marginTop: 8 }}
            />
            {previewMacros && (
              <div className="food-preview mono muted">
                {Math.round(previewMacros.protein)}g P · {Math.round(previewMacros.carb)}g C ·{" "}
                {Math.round(previewMacros.fat)}g G · {kcal(previewMacros.protein, previewMacros.carb, previewMacros.fat)} kcal
              </div>
            )}
            {foodQuery && !matchedFood && (
              <div className="food-preview muted">Alimento não encontrado na lista — tenta o modo manual.</div>
            )}
            <button className="btn-primary" onClick={addFoodMeal} disabled={!matchedFood || !grams}>
              <Plus size={16} /> Registrar
            </button>
          </>
        ) : (
          <>
            <input
              className="input"
              placeholder="Nome (ex: Marmita do restaurante)"
              value={manualForm.name}
              onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })}
            />
            <div className="macro-inputs">
              <input
                className="input mono"
                type="number"
                placeholder="P (g)"
                value={manualForm.protein}
                onChange={(e) => setManualForm({ ...manualForm, protein: e.target.value })}
              />
              <input
                className="input mono"
                type="number"
                placeholder="C (g)"
                value={manualForm.carb}
                onChange={(e) => setManualForm({ ...manualForm, carb: e.target.value })}
              />
              <input
                className="input mono"
                type="number"
                placeholder="G (g)"
                value={manualForm.fat}
                onChange={(e) => setManualForm({ ...manualForm, fat: e.target.value })}
              />
            </div>
            <button className="btn-primary" onClick={addManualMeal}>
              <Plus size={16} /> Registrar
            </button>
          </>
        )}
      </div>

      {meals.length > 0 && (
        <div className="card">
          <div className="card-head">Refeições de hoje</div>
          {meals.map((m, i) => (
            <div className="meal-row" key={i}>
              <div>
                <div className="meal-name">{m.name}</div>
                <div className="muted mono meal-macros">
                  {Math.round(m.protein)}g P · {Math.round(m.carb)}g C · {Math.round(m.fat)}g G ·{" "}
                  {kcal(m.protein, m.carb, m.fat)} kcal
                </div>
              </div>
              <button className="icon-btn" onClick={() => removeMeal(i)} aria-label="Remover">
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------- Progresso ----------------
function ProgressoTab({ logs, settings }) {
  const bwData = Object.entries(logs)
    .filter(([, v]) => v.bodyweight != null)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([d, v]) => ({ date: d.slice(5), peso: v.bodyweight }));

  const days = Object.entries(logs).sort(([a], [b]) => (a < b ? 1 : -1));
  const currentWeight = bwData.length ? bwData[bwData.length - 1].peso : settings.startWeight;
  const delta = (currentWeight - settings.startWeight).toFixed(1);

  return (
    <div className="stack">
      <div className="card">
        <div className="card-head">Peso corporal</div>
        {bwData.length >= 2 ? (
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={bwData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 4" vertical={false} />
                <XAxis dataKey="date" stroke="var(--muted)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted)" fontSize={11} tickLine={false} axisLine={false} domain={["dataMin - 1", "dataMax + 1"]} />
                <Tooltip
                  contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "var(--text)" }}
                />
                <Line type="monotone" dataKey="peso" stroke="var(--push)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="muted">Registre o peso por alguns dias na aba Hoje pra ver o gráfico.</p>
        )}
        <div className="kcal-row">
          <span className="mono">{currentWeight}kg</span>
          <span className={"mono " + (delta <= 0 ? "tone-down" : "tone-up")}>
            {delta > 0 ? "+" : ""}
            {delta}kg desde o início
          </span>
        </div>
      </div>

      <ExerciseProgressCard logs={logs} />

      <div className="card">
        <div className="card-head">Histórico de treino</div>
        {days.length === 0 && <p className="muted">Nenhum dia registrado ainda.</p>}
        {days.slice(0, 14).map(([d, v]) => {
          const dow = new Date(d + "T12:00:00").getDay();
          const dt = settings.schedule[dow] || "Descanso";
          const exCount = v.exercises ? Object.keys(v.exercises).length : 0;
          return (
            <div className="hist-row" key={d}>
              <span className="hist-date">{fmtDateLabel(d)}</span>
              <span className="hist-tag" style={{ color: DAY_COLOR[dt] }}>
                {dt}
              </span>
              <span className="muted mono">{isTrainingDay(dt) ? `${exCount}/${PLAN[dt]?.length || 0} ex` : "—"}</span>
              <span className="muted mono">{v.bodyweight ? `${v.bodyweight}kg` : ""}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ALL_EXERCISES = [...PLAN.Push, ...PLAN.Pull, ...PLAN.Legs].map((e) => e.n);

function ExerciseProgressCard({ logs }) {
  const [selected, setSelected] = useState(ALL_EXERCISES[0]);

  const data = useMemo(() => {
    return Object.entries(logs)
      .filter(([, v]) => v?.exercises?.[selected]?.sets?.length)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([d, v]) => {
        const sets = v.exercises[selected].sets;
        const weights = sets.map((s) => parseFloat(s.weight) || 0);
        const reps = sets.map((s) => parseInt(s.reps, 10) || 0);
        return {
          date: d.slice(5),
          fullDate: d,
          carga: Math.max(...weights, 0),
          reps: Math.max(...reps, 0),
        };
      });
  }, [logs, selected]);

  return (
    <div className="card">
      <div className="card-head">Evolução por exercício</div>
      <select className="select select-full" value={selected} onChange={(e) => setSelected(e.target.value)}>
        {["Push", "Pull", "Legs"].map((g) => (
          <optgroup label={g} key={g}>
            {PLAN[g].map((e) => (
              <React.Fragment key={e.id}>
                <option value={e.n}>{e.n}</option>
                {e.equivalents.map((eq) => (
                  <option key={eq} value={eq}>
                    {eq}
                  </option>
                ))}
              </React.Fragment>
            ))}
          </optgroup>
        ))}
      </select>

      {data.length >= 2 ? (
        <div style={{ height: 170, marginTop: 12 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 4" vertical={false} />
              <XAxis dataKey="date" stroke="var(--muted)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted)" fontSize={11} tickLine={false} axisLine={false} domain={["dataMin - 2", "dataMax + 2"]} />
              <Tooltip
                contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "var(--text)" }}
                formatter={(value, name) => [name === "carga" ? `${value}kg` : `${value} reps`, name === "carga" ? "Carga máx." : "Reps (série top)"]}
              />
              <Line type="monotone" dataKey="carga" stroke="var(--push)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="muted" style={{ marginTop: 12 }}>
          Registre esse exercício em pelo menos 2 sessões pra ver a evolução.
        </p>
      )}
    </div>
  );
}

// ---------------- Settings ----------------
function SettingsSheet({ settings, setSettings, logs, onClose }) {
  const [local, setLocal] = useState(settings);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <span>Configurações</span>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="stack">
          <div className="card">
            <div className="card-head">Divisão semanal</div>
            {WEEKDAY_LABEL.map((label, i) => (
              <div className="schedule-row" key={i}>
                <span>{label}</span>
                <select
                  className="select"
                  value={local.schedule[i]}
                  onChange={(e) => setLocal({ ...local, schedule: { ...local.schedule, [i]: e.target.value } })}
                >
                  <option>Push</option>
                  <option>Pull</option>
                  <option>Legs</option>
                  <option>Descanso</option>
                </select>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-head">Meta de gordura (g/dia)</div>
            <div className="schedule-row">
              <span>Dia de treino</span>
              <input
                className="input mono settings-input"
                type="number"
                value={local.fatTraining}
                onChange={(e) => setLocal({ ...local, fatTraining: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="schedule-row">
              <span>Dia de descanso</span>
              <input
                className="input mono settings-input"
                type="number"
                value={local.fatRest}
                onChange={(e) => setLocal({ ...local, fatRest: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div className="card">
            <div className="card-head">Peso inicial (kg)</div>
            <input
              className="input mono"
              type="number"
              value={local.startWeight}
              onChange={(e) => setLocal({ ...local, startWeight: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div className="card">
            <div className="card-head">Exportar dados</div>
            <p className="muted export-hint">
              Baixa tudo que foi registrado (treino, dieta, peso) pra analisar depois num Excel/Sheets.
            </p>
            <button className="btn-secondary" onClick={() => exportCSV(logs)}>
              <Download size={15} /> Exportar resumo diário (CSV)
            </button>
            <button className="btn-secondary" onClick={() => exportJSON(logs, settings)}>
              <Download size={15} /> Exportar backup completo (JSON)
            </button>
          </div>
          <button
            className="btn-primary"
            onClick={() => {
              setSettings(local);
              onClose();
            }}
          >
            <Check size={16} /> Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportCSV(logs) {
  const rows = [["data", "tipo_registrado_peso_kg", "exercicios_registrados", "proteina_g", "carboidrato_g", "gordura_g", "kcal"]];
  Object.entries(logs)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .forEach(([date, v]) => {
      const meals = v.meals || [];
      const got = meals.reduce(
        (a, m) => ({ protein: a.protein + m.protein, carb: a.carb + m.carb, fat: a.fat + m.fat }),
        { protein: 0, carb: 0, fat: 0 }
      );
      const exCount = v.exercises ? Object.keys(v.exercises).length : 0;
      rows.push([
        date,
        v.bodyweight ?? "",
        exCount,
        got.protein.toFixed(1),
        got.carb.toFixed(1),
        got.fat.toFixed(1),
        kcal(got.protein, got.carb, got.fat),
      ]);
    });
  const csv = rows.map((r) => r.join(";")).join("\n");
  downloadFile(`cutting-log-resumo-${todayISO()}.csv`, csv, "text/csv;charset=utf-8");
}

function exportJSON(logs, settings) {
  const payload = { exportedAt: new Date().toISOString(), settings, logs };
  downloadFile(`cutting-log-backup-${todayISO()}.json`, JSON.stringify(payload, null, 2), "application/json");
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,650&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');

:root{
  --bg:#1E1A16;
  --surface:#28221D;
  --surface-2:#332B24;
  --border:#3D342B;
  --text:#EFE7DA;
  --muted:#9C9186;
  --push:#C6902E;
  --pull:#4C8B82;
  --legs:#B15A34;
}

*{box-sizing:border-box;}
html,body{margin:0;padding:0;background:var(--bg);}
#root{min-height:100vh;}
.app{
  font-family:'IBM Plex Sans',sans-serif;
  background:var(--bg);
  color:var(--text);
  min-height:100vh;
  max-width:480px;
  margin:0 auto;
  display:flex;
  flex-direction:column;
  padding-bottom:76px;
}
@media (min-width:640px){
  html,body{background:#141110;}
  #root{display:flex;justify-content:center;min-height:100vh;}
  .app{
    min-height:calc(100vh - 48px);
    margin:24px auto;
    border:1px solid var(--border);
    border-radius:20px;
    box-shadow:0 30px 60px -20px rgba(0,0,0,0.6);
    overflow:hidden;
  }
}
.mono{font-family:'IBM Plex Mono',monospace;}
.muted{color:var(--muted);}

.topbar{
  display:flex;align-items:center;justify-content:space-between;
  padding:16px 18px 14px;
  border-bottom:1px solid var(--border);
}
.brand{display:flex;align-items:center;gap:10px;}
.brand-mark{width:10px;height:10px;border-radius:2px;display:inline-block;}
.brand-title{font-family:'Fraunces',serif;font-weight:650;font-size:19px;letter-spacing:-0.01em;}
.brand-sub{font-size:11.5px;color:var(--muted);margin-top:1px;}
.icon-btn{
  background:var(--surface-2);border:1px solid var(--border);color:var(--text);
  width:34px;height:34px;border-radius:8px;display:flex;align-items:center;justify-content:center;
  cursor:pointer;
}

.content{flex:1;padding:16px;}
.stack{display:flex;flex-direction:column;gap:14px;}

.date-row{display:flex;align-items:center;justify-content:center;gap:18px;}
.date-nav{background:none;border:none;color:var(--muted);font-size:20px;cursor:pointer;padding:4px 10px;}
.date-label{font-family:'Fraunces',serif;font-size:15px;font-weight:500;}

.hero-card{
  background:var(--surface);border:1px solid;border-radius:14px;padding:20px;
}
.hero-eyebrow{font-size:12px;font-weight:500;margin-bottom:4px;}
.hero-title{font-family:'Fraunces',serif;font-size:30px;font-weight:650;line-height:1.1;}
.hero-progress{color:var(--muted);font-size:13px;margin-top:6px;}
.hero-cta{
  margin-top:16px;background:var(--surface-2);border:1px solid var(--border);color:var(--text);
  padding:10px 14px;border-radius:9px;font-size:13.5px;display:flex;align-items:center;gap:4px;
  cursor:pointer;font-family:'IBM Plex Sans',sans-serif;
}

.card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px;}
.card-head{font-size:13px;color:var(--muted);margin-bottom:12px;font-weight:500;}

.macro-row{margin-bottom:12px;}
.macro-row:last-of-type{margin-bottom:8px;}
.macro-labels{display:flex;justify-content:space-between;font-size:13.5px;margin-bottom:5px;}
.bar-track{height:6px;background:var(--surface-2);border-radius:4px;overflow:hidden;}
.bar-fill{height:100%;border-radius:4px;transition:width .3s ease;}
.kcal-row{display:flex;justify-content:space-between;align-items:baseline;margin-top:10px;padding-top:10px;border-top:1px solid var(--border);font-size:15px;font-weight:500;}
.remaining{font-size:12.5px;margin-top:8px;}

.bw-row{display:flex;align-items:center;gap:8px;}
.hint{font-size:11.5px;color:var(--muted);margin-top:8px;line-height:1.4;}
.reminder-banner{
  display:flex;align-items:center;gap:8px;background:rgba(198,144,46,0.15);color:var(--push);
  border:1px solid rgba(198,144,46,0.35);border-radius:10px;padding:10px 12px;font-size:12.5px;
}
.weight-table-head, .weight-table-row{
  display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;font-size:12.5px;padding:7px 0;border-top:1px solid var(--border);
}
.weight-table-head{border-top:none;font-size:11px;padding-bottom:8px;}
.weight-table-row:first-of-type{border-top:1px solid var(--border);}
.input{
  background:var(--surface-2);border:1px solid var(--border);color:var(--text);
  border-radius:8px;padding:9px 11px;font-size:14px;width:100%;font-family:'IBM Plex Sans',sans-serif;
}
.input:focus{outline:none;border-color:var(--push);}

.section-title{font-family:'Fraunces',serif;font-size:16px;font-weight:650;margin-bottom:2px;}

.exercise-card{padding:14px;position:relative;}
.ex-order-controls{position:absolute;top:10px;right:10px;display:flex;flex-direction:column;gap:2px;}
.order-btn{
  background:var(--surface-2);border:1px solid var(--border);color:var(--muted);
  width:20px;height:16px;border-radius:4px;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;
}
.order-btn:disabled{opacity:0.25;cursor:default;}
.ex-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;padding-right:26px;}
.ex-name-row{display:flex;align-items:center;gap:5px;flex-wrap:wrap;}
.swap-icon{color:var(--muted);flex-shrink:0;}
.ex-name-select{
  background:none;border:none;color:var(--text);font-size:14.5px;font-weight:500;
  font-family:'IBM Plex Sans',sans-serif;padding:0;max-width:210px;cursor:pointer;
}
.variation-chip{
  background:var(--surface-2);border:1px solid var(--border);color:var(--push);
  border-radius:20px;padding:2px 8px;font-size:10.5px;font-family:'IBM Plex Sans',sans-serif;
  cursor:pointer;max-width:150px;
}
.ex-meta{font-size:11.5px;color:var(--muted);white-space:nowrap;margin-top:2px;}
.sub-note{color:var(--legs);}
.ex-last-badge{
  background:var(--surface-2);border:1px solid var(--border);border-radius:7px;
  padding:5px 8px;font-size:11px;text-align:right;line-height:1.35;max-width:120px;flex-shrink:0;
}
.muted-sm{color:var(--muted);font-size:9.5px;display:block;text-transform:lowercase;}
.suggestion{
  display:flex;align-items:center;gap:6px;font-size:12px;margin-top:8px;padding:7px 10px;border-radius:7px;
}
.suggestion.up{background:rgba(198,144,46,0.15);color:var(--push);}
.suggestion.hold{background:var(--surface-2);color:var(--muted);}

.set-grid{margin-top:12px;}
.set-grid-head, .set-grid-row{
  display:grid;grid-template-columns:32px 1fr 1fr;gap:8px;align-items:center;margin-bottom:6px;
}
.set-grid-head{font-size:11px;}
.set-input{padding:7px 9px;text-align:center;}

.macro-inputs{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin:10px 0;}
.mode-toggle{display:flex;gap:6px;margin-bottom:12px;}
.mode-btn{
  flex:1;background:var(--surface-2);border:1px solid var(--border);color:var(--muted);
  padding:7px;border-radius:8px;font-size:12.5px;cursor:pointer;font-family:'IBM Plex Sans',sans-serif;
}
.mode-btn.active{color:var(--push);border-color:var(--push);background:rgba(198,144,46,0.12);}
.food-preview{font-size:12px;margin-top:8px;}
.btn-primary{
  width:100%;background:var(--push);color:#1E1A16;border:none;border-radius:9px;padding:11px;
  font-size:14px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:6px;
  cursor:pointer;font-family:'IBM Plex Sans',sans-serif;margin-top:10px;
}
.btn-primary:disabled{opacity:0.4;cursor:default;}
.btn-secondary{
  width:100%;background:var(--surface-2);color:var(--text);border:1px solid var(--border);border-radius:9px;padding:10px;
  font-size:13px;display:flex;align-items:center;justify-content:center;gap:6px;cursor:pointer;
  font-family:'IBM Plex Sans',sans-serif;margin-top:8px;
}
.export-hint{font-size:12px;margin-bottom:4px;}

.meal-row{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-top:1px solid var(--border);}
.meal-row:first-of-type{border-top:none;}
.meal-name{font-size:13.5px;}
.meal-macros{font-size:11.5px;margin-top:2px;}

.empty-state{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:28px 18px;text-align:center;}
.empty-title{font-family:'Fraunces',serif;font-size:18px;font-weight:650;margin-bottom:6px;}

.tone-down{color:var(--pull);}
.tone-up{color:var(--legs);}

.hist-row{display:grid;grid-template-columns:60px 60px 1fr auto;gap:8px;align-items:center;font-size:12.5px;padding:7px 0;border-top:1px solid var(--border);}
.hist-row:first-of-type{border-top:none;}
.hist-tag{font-weight:500;}

.tabbar{
  position:fixed;bottom:0;left:50%;transform:translateX(-50%);
  width:100%;max-width:480px;
  background:var(--surface);border-top:1px solid var(--border);
  display:flex;padding:8px 6px 12px;
}
.tab-btn{
  flex:1;background:none;border:none;color:var(--muted);display:flex;flex-direction:column;align-items:center;gap:3px;
  font-size:10.5px;padding:6px 0;cursor:pointer;font-family:'IBM Plex Sans',sans-serif;
}
.tab-btn.active{color:var(--push);}

.sheet-backdrop{
  position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:flex-end;justify-content:center;z-index:50;
}
.sheet{
  background:var(--bg);width:100%;max-width:480px;max-height:85vh;overflow-y:auto;
  border-radius:16px 16px 0 0;padding:16px;border:1px solid var(--border);border-bottom:none;
}
.sheet-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;font-family:'Fraunces',serif;font-size:17px;font-weight:650;}
.schedule-row{display:flex;justify-content:space-between;align-items:center;padding:6px 0;font-size:13.5px;}
.select{
  background:var(--surface-2);border:1px solid var(--border);color:var(--text);border-radius:7px;
  padding:6px 8px;font-size:13px;font-family:'IBM Plex Sans',sans-serif;
}
.select-full{width:100%;padding:9px 10px;}
.settings-input{width:80px;text-align:right;}
`;
