import React, { useState, useEffect, useRef, useMemo, Suspense, lazy } from "react";
import { Dumbbell, UtensilsCrossed, TrendingUp, TrendingDown, Home, Plus, Minus, Check, Settings, ChevronRight, ChevronUp, ChevronDown, Flame, X, Repeat, Download, Star, Pencil, Trash2, Trophy, CalendarRange, Cloud, LogOut, Eye, EyeOff, Share2, Timer, Droplet, Camera, BarChart3, Link2, Clock, AlertTriangle, Lightbulb, Pill, FileText, History, Bell, BellOff, Mic, Coffee, Activity, Percent, PauseCircle, Gauge } from "lucide-react";
import { supabase } from "./supabaseClient.js";
import { isPushSupported, getPushPermission, isPushEnabled, enablePush, disablePush } from "./push.js";

// recharts é a maior dependência do bundle (~metade do JS) e só é usada nos
// gráficos da aba Progresso — carrega sob demanda em vez de no boot do app.
const MiniLineChart = lazy(() => import("./MiniLineChart.jsx"));
const ChartFallback = ({ height = 180 }) => (
  <div className="chart-loading" style={{ height }}>
    Carregando gráfico…
  </div>
);

// ---------- Static plan data (from João's program) ----------
const DAY_TYPES = { P: "Push", U: "Pull", L: "Legs", D: "Descanso" };
const DAY_COLOR = {
  Push: "var(--push)",
  Pull: "var(--pull)",
  Legs: "var(--legs)",
  Upper: "var(--upper)",
  Lower: "var(--lower)",
  Descanso: "var(--muted)",
};
const WEEKDAY_LABEL = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DEFAULT_SCHEDULE = { 0: "Descanso", 1: "Push", 2: "Pull", 3: "Legs", 4: "Push", 5: "Pull", 6: "Legs" };

const PLAN = {
  Push: [
    { id: "supino-reto", n: "Supino reto", sets: 3, reps: "6-8", rir: "1-2", variations: ["Barra", "Halteres", "Máquina", "Smith"], grips: ["Pronada", "Neutra"], equivalents: ["Supino máquina (peck deck press)", "Crucifixo reto halteres"] },
    { id: "supino-inclinado", n: "Supino inclinado halteres", sets: 3, reps: "8-10", rir: "1-2", variations: ["Halteres", "Barra", "Máquina", "Smith"], grips: ["Pronada", "Neutra"], equivalents: ["Supino inclinado barra", "Supino inclinado máquina", "Crucifixo inclinado halteres"] },
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
    { id: "rosca-direta", n: "Rosca direta", sets: 3, reps: "8-10", rir: "1", variations: ["Barra reta", "Barra W", "Halteres"], grips: ["Supinada", "Neutra", "Pronada"], equivalents: ["Rosca Scott", "Rosca concentrada"] },
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
  // Upper/Lower — pra quando quiser trocar de divisão em vez de PPL. Reusam
  // os mesmos ids dos exercícios de Push/Pull/Legs de propósito: é o mesmo
  // exercício físico, então equipamento/pegada escolhidos ficam valendo
  // independente de em qual divisão você está treinando naquele dia.
  Upper: [
    { id: "supino-reto", n: "Supino reto", sets: 3, reps: "6-8", rir: "1-2", variations: ["Barra", "Halteres", "Máquina", "Smith"], grips: ["Pronada", "Neutra"], equivalents: ["Supino máquina (peck deck press)", "Crucifixo reto halteres"] },
    { id: "remada-curvada", n: "Remada curvada pronada", sets: 3, reps: "6-8", rir: "1-2", variations: ["Barra", "Halteres"], equivalents: ["Remada curvada supinada", "Remada cavalinho (T-bar row)", "Remada máquina"] },
    { id: "desenvolvimento", n: "Desenvolvimento militar", sets: 3, reps: "8-10", rir: "1-2", variations: ["Barra", "Halteres", "Máquina", "Smith"], equivalents: ["Desenvolvimento Arnold", "Desenvolvimento máquina"] },
    { id: "puxada-aberta", n: "Puxada aberta", sets: 3, reps: "8-10", rir: "1", variations: ["Pegada aberta", "Pegada supinada", "Pegada neutra", "Máquina"], equivalents: ["Barra fixa (pull-up)", "Puxada triângulo"] },
    { id: "rosca-direta", n: "Rosca direta", sets: 3, reps: "8-10", rir: "1", variations: ["Barra reta", "Barra W", "Halteres"], grips: ["Supinada", "Neutra", "Pronada"], equivalents: ["Rosca Scott", "Rosca concentrada"] },
    { id: "triceps-pulley", n: "Tríceps pulley", sets: 3, reps: "10-12", rir: "0-1", variations: ["Barra reta", "Barra V", "Corda", "Puxador unilateral"], equivalents: ["Tríceps testa (skull crusher)", "Mergulho no banco (bench dip)"] },
  ],
  Lower: [
    { id: "agachamento", n: "Agachamento livre", sets: 3, reps: "6-8", rir: "1-2", variations: ["Barra livre", "Smith", "Barra segura (safety bar)"], equivalents: ["Leg press 45°", "Hack machine", "Agachamento búlgaro"] },
    { id: "mesa-flexora", n: "Mesa flexora", sets: 3, reps: "10-12", rir: "0-1", variations: ["Deitado", "Sentado", "Em pé unilateral"], equivalents: ["Stiff (RDL) halteres", "Flexora sentado"] },
    { id: "cadeira-extensora", n: "Cadeira extensora", sets: 3, reps: "10-12", rir: "0-1", variations: ["Bilateral", "Unilateral"], equivalents: ["Agachamento sissy"] },
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
  // Itens com unitG/unitLabel são registrados por unidade (ex: 2 biscoitos)
  // em vez de gramatura — a UI troca o input automaticamente pra esses.
  { n: "Pipoca de sal (saco de rua)", p: 9.0, c: 63.0, f: 20.0, unitG: 30, unitLabel: "saco" },
  { n: "Biscoito Mabel (maisena/água e sal)", p: 8.0, c: 75.0, f: 12.0, unitG: 7, unitLabel: "biscoito" },
  { n: "Bolacha recheada (tipo Trakinas)", p: 6.0, c: 68.0, f: 20.0, unitG: 14, unitLabel: "unidade" },
  { n: "Pão de queijo", p: 6.0, c: 34.0, f: 16.0, unitG: 30, unitLabel: "unidade" },
  { n: "Coxinha de frango", p: 9.0, c: 20.0, f: 12.0, unitG: 80, unitLabel: "unidade" },
  { n: "Pastel de feira (carne)", p: 8.0, c: 28.0, f: 14.0, unitG: 90, unitLabel: "unidade" },
  { n: "Esfirra de carne", p: 10.0, c: 25.0, f: 10.0, unitG: 60, unitLabel: "unidade" },
  { n: "Pizza mussarela (fatia)", p: 11.0, c: 28.0, f: 10.0, unitG: 100, unitLabel: "fatia" },
  { n: "Hambúrguer fast food", p: 12.0, c: 22.0, f: 12.0, unitG: 220, unitLabel: "unidade" },
  { n: "Hot dog completo", p: 9.0, c: 20.0, f: 10.0, unitG: 150, unitLabel: "unidade" },
  { n: "Brigadeiro", p: 2.0, c: 55.0, f: 12.0, unitG: 15, unitLabel: "unidade" },
  { n: "Refrigerante", p: 0, c: 10.5, f: 0, unitG: 350, unitLabel: "lata" },
  { n: "Suco de caixinha", p: 0, c: 11.0, f: 0, unitG: 200, unitLabel: "caixinha" },
  { n: "Cerveja", p: 0.3, c: 3.3, f: 0, unitG: 350, unitLabel: "lata" },
  { n: "Barrinha de cereal", p: 7.0, c: 70.0, f: 8.0, unitG: 22, unitLabel: "unidade" },
  { n: "Pão de forma (fatia)", p: 9.0, c: 49.0, f: 3.0, unitG: 25, unitLabel: "fatia" },
  { n: "Ovo de codorna", p: 13.0, c: 0.4, f: 11.0, unitG: 9, unitLabel: "unidade" },
  { n: "Sorvete (bola)", p: 3.5, c: 22.0, f: 11.0, unitG: 60, unitLabel: "bola" },
  { n: "Batata frita (porção)", p: 3.4, c: 41.0, f: 15.0 },
  { n: "Chocolate ao leite", p: 7.0, c: 57.0, f: 30.0 },
  { n: "Granola", p: 10.0, c: 64.0, f: 14.0 },
  { n: "Achocolatado em pó", p: 5.0, c: 80.0, f: 4.0 },
  { n: "Leite condensado", p: 7.0, c: 55.0, f: 8.0 },
  { n: "Farofa pronta", p: 2.0, c: 60.0, f: 15.0 },
  { n: "Molho de tomate", p: 1.5, c: 8.0, f: 1.0 },
  { n: "Salgadinho de pacote (tipo Doritos)", p: 6.0, c: 58.0, f: 28.0 },
  { n: "Iogurte grego", p: 10.0, c: 4.0, f: 5.0 },
];

const DEFAULT_SETTINGS = {
  schedule: DEFAULT_SCHEDULE,
  fatTraining: 60,
  fatRest: 60,
  startWeight: 71,
  exerciseVariations: {},
  exerciseSubstitutions: {},
  exerciseOrder: {},
  exerciseGrips: {},
  favoriteMeals: [],
  phases: [],
  theme: "dark",
  goalWeight: null,
  goalDate: null,
  macroTargets: { Treino: { protein: 157.5, carb: 257.5 }, Descanso: { protein: 158, carb: 195 } },
  waterTarget: 8,
  waterAuto: true,
  supersetLinks: {},
  supplementList: ["Creatina", "Whey protein", "Multivitamínico"],
  supplementStock: {},
  notificationPrefs: { treino: true, peso: true, sync: true, meta: true, pr: true, agua: true, medidas: true, creatina: true, backup: true },
  notificationTimes: { treino: 12, peso: 9, sync: 20, agua: 15, medidas: 20, creatina: 10, backup: 10 },
  notificationsPausedUntil: null,
  customTemplates: [],
  fontScale: 1,
  heightCm: null,
  caffeineDoseMg: 80,
  lastTDEE: null,
  injuries: [],
  mesocycle: { startDate: null, weeks: 6 },
  lastBackupExportAt: null,
  backupReminderDays: 30,
  plateIncrement: 2.5,
  substitutionHistory: [],
};

// Exercícios-âncora usados na comparação de fases — um levantamento composto
// por dia de treino, pra ter um sinal de força mesmo que outros exercícios
// tenham sido substituídos ao longo do tempo.
const ANCHOR_LIFTS = ["Supino reto", "Remada curvada pronada", "Agachamento livre"];

// Grupo muscular por id de exercício — usado pro volume semanal por grupo.
// Upper/Lower reusam os mesmos ids de Push/Pull/Legs de propósito, então um
// único mapa por id cobre as 5 divisões.
const MUSCLE_BY_ID = {
  "supino-reto": "Peito",
  "supino-inclinado": "Peito",
  "desenvolvimento": "Ombro",
  "elevacao-lateral": "Ombro",
  "triceps-pulley": "Tríceps",
  "triceps-frances": "Tríceps",
  "remada-curvada": "Costas",
  "puxada-aberta": "Costas",
  "remada-baixa": "Costas",
  "face-pull": "Ombro",
  "rosca-direta": "Bíceps",
  "rosca-martelo": "Bíceps",
  "lombar-maquina": "Lombar",
  "agachamento": "Quadríceps",
  "cadeira-extensora": "Quadríceps",
  "mesa-flexora": "Posterior de coxa",
  "panturrilha-pe": "Panturrilha",
  "panturrilha-sentada": "Panturrilha",
  "abdomen": "Abdômen",
};

// Dica técnica curta por exercício (id fixo do PLAN) — só pros exercícios
// fixos, templates personalizados não têm.
const EXERCISE_TIPS = {
  "supino-reto": "Escápulas retraídas e apoiadas no banco, barra desce até tocar o peito sem quicar.",
  "supino-inclinado": "Banco a 30-45° — mais que isso vira mais ombro do que peito superior.",
  "desenvolvimento": "Não hiperestenda a lombar — abdômen contraído pra não virar um exercício de costas.",
  "elevacao-lateral": "Cotovelo levemente flexionado e fixo, sobe até a altura do ombro, sem usar embalo do tronco.",
  "triceps-pulley": "Cotovelo colado no corpo o tempo todo — só o antebraço se move.",
  "triceps-frances": "Cotovelo aponta pro teto e não se abre — o movimento é só de dobradiça no cotovelo.",
  "remada-curvada": "Tronco fixo (não balança), puxa em direção ao umbigo, aperta a escápula no topo.",
  "puxada-aberta": "Puxa com o cotovelo, não com a mão — imagina levar o cotovelo até o bolso de trás.",
  "remada-baixa": "Coluna neutra, não arredonda as costas pra puxar mais peso.",
  "face-pull": "Puxa até a altura do rosto com os cotovelos bem altos — foco no manguito e deltoide posterior.",
  "rosca-direta": "Cotovelo fixo ao lado do corpo, sem balançar o tronco pra ajudar a subir.",
  "rosca-martelo": "Pegada neutra o tempo todo (polegar pra cima) — recruta mais o braquial.",
  "lombar-maquina": "Movimento controlado, sem hiperestender no topo — é extensão, não hiperextensão.",
  "agachamento": "Joelho na direção do pé, desce até pelo menos paralelo, peso no meio do pé.",
  "cadeira-extensora": "Trava 1 segundo no topo antes de descer controlado.",
  "mesa-flexora": "Não tira o quadril do banco pra compensar — isola o posterior de coxa.",
  "panturrilha-pe": "Amplitude completa: desce até alongar de verdade, sobe até a ponta do pé.",
  "panturrilha-sentada": "Foco no gastrocnêmio muda pro sóleo com o joelho flexionado — controla a descida.",
  "abdomen": "Movimento vem do abdômen, não do quadril — evita balançar as pernas pra ajudar.",
};

// Nome exibido (incluindo substituições/equivalentes) → grupo muscular. Como
// o exercício logado é salvo pelo NOME (que pode ser um equivalente escolhido
// pelo usuário), mapear por nome garante que a substituição ainda conte pro
// grupo muscular certo.
const NAME_TO_MUSCLE = {};
["Push", "Pull", "Legs"].forEach((cat) => {
  PLAN[cat].forEach((ex) => {
    const muscle = MUSCLE_BY_ID[ex.id];
    if (!muscle) return;
    NAME_TO_MUSCLE[ex.n] = muscle;
    (ex.equivalents || []).forEach((eq) => {
      NAME_TO_MUSCLE[eq] = muscle;
    });
  });
});

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
// Qualquer tipo de dia que não seja "Descanso" conta como treino — inclui os
// 5 fixos (Push/Pull/Legs/Upper/Lower) e qualquer template personalizado
// criado pelo usuário (que nunca se chama "Descanso").
const isTrainingDay = (dayType) => dayType !== "Descanso";
// Heurística pra saber se um exercício é feito um lado de cada vez — cobre os
// nomes/variações e equivalentes que já existem no PLAN, sem precisar marcar
// exercício por exercício manualmente.
const isUnilateralName = (name) => /unilateral|alternad|serrote/i.test(name || "");
// RIR baixo (chegou perto da falha) pede mais descanso; RIR alto (sobrou
// muito) não precisa de tanto — mapeamento simples, não uma fórmula.
const RIR_REST_SUGGESTION = { "0": 150, "1": 120, "2": 90, "3+": 60 };
const ALL_DAY_TYPES = ["Push", "Pull", "Legs", "Upper", "Lower", "Descanso"];
// Paleta de reserva pros templates personalizados — escolhida por um hash
// simples do nome, pra cada template ter uma cor estável e distinta sem o
// usuário precisar escolher uma.
const CUSTOM_COLOR_PALETTE = ["var(--push)", "var(--pull)", "var(--legs)", "var(--upper)", "var(--lower)"];
function getDayColor(dayType) {
  if (DAY_COLOR[dayType]) return DAY_COLOR[dayType];
  let hash = 0;
  for (let i = 0; i < dayType.length; i++) hash = (hash * 31 + dayType.charCodeAt(i)) >>> 0;
  return CUSTOM_COLOR_PALETTE[hash % CUSTOM_COLOR_PALETTE.length];
}
// Exercícios de um dia — dos 5 tipos fixos (PLAN) ou de um template
// personalizado salvo em settings.customTemplates.
function getPlanExercises(dayType, settings) {
  if (PLAN[dayType]) return PLAN[dayType];
  const custom = (settings.customTemplates || []).find((t) => t.name === dayType);
  return custom ? custom.exercises : [];
}
// Peso corporal mais recente já registrado (qualquer data até hoje) — usado
// pra calibrar a meta de água automática sem depender só do peso de hoje.
function getLatestBodyweight(logs, fallback) {
  const entries = Object.entries(logs || {})
    .filter(([, v]) => v?.bodyweight != null)
    .sort(([a], [b]) => (a < b ? -1 : 1));
  return entries.length ? entries[entries.length - 1][1].bodyweight : fallback;
}
// Meta de água baseada no peso: ~35ml/kg de base, +500ml em dia de treino
// (perda extra por suor). Arredonda pro copo de 250ml mais próximo.
function computeWaterTargetCups(weightKg, training) {
  if (!weightKg) return null;
  const ml = weightKg * 35 + (training ? 500 : 0);
  return Math.max(1, Math.round(ml / 250));
}
// MET (equivalente metabólico) por tipo de cardio — kcal = MET * peso(kg) *
// horas. Valores de referência aproximados, não medição real de esforço.
const CARDIO_TYPES = [
  { key: "corrida", label: "Corrida", met: 9.8 },
  { key: "bike", label: "Bike", met: 7.5 },
  { key: "caminhada", label: "Caminhada rápida", met: 4.3 },
  { key: "natacao", label: "Natação", met: 7.0 },
  { key: "eliptico", label: "Elíptico", met: 5.0 },
  { key: "pular-corda", label: "Pular corda", met: 10.0 },
  { key: "outro", label: "Outro", met: 6.0 },
];
function estimateCardioKcal(typeKey, minutes, weightKg) {
  const type = CARDIO_TYPES.find((t) => t.key === typeKey) || CARDIO_TYPES[CARDIO_TYPES.length - 1];
  return Math.round(type.met * (weightKg || 75) * (minutes / 60));
}
const kcal = (p, c, f) => Math.round(p * 4 + c * 4 + f * 9);
const computeFromFood = (food, g) => ({
  protein: (food.p * g) / 100,
  carb: (food.c * g) / 100,
  fat: (food.f * g) / 100,
});
// Teclado numérico do iPhone em pt-BR mostra vírgula como separador decimal,
// mas <input type="number"> só aceita ponto e recusa a vírgula em silêncio
// (a tecla parece não fazer nada). Por isso os campos de peso/quantidade usam
// type="text" + inputMode="decimal" e passam por aqui pra normalizar.
const sanitizeDecimal = (v) => v.replace(",", ".").replace(/[^0-9.]/g, "");

// Um dia "vazio" é sobra técnica (ex: você trocou o tipo de treino e voltou
// atrás, ou abriu o app sem registrar nada) — sem peso, sem série de
// exercício com valor e sem refeição. Seguro de apagar, ao contrário do
// resto do histórico.
function isEmptyDay(v) {
  if (!v) return true;
  const hasWeight = v.bodyweight != null;
  const hasExercise = v.exercises && Object.values(v.exercises).some((e) => e?.sets?.length);
  const hasMeals = v.meals && v.meals.length > 0;
  return !hasWeight && !hasExercise && !hasMeals;
}

// ---------- Comparação de fases ----------
// Acha o primeiro/último dia dentro do intervalo [from, to] em que `pred(v)`
// devolve um valor (não-nulo) — usado pra achar o peso/carga mais próximo do
// início e do fim de uma fase, mesmo com registros esparsos.
function firstInRange(logs, pred, from, to) {
  const entries = Object.entries(logs)
    .filter(([d]) => d >= from && (!to || d <= to))
    .sort(([a], [b]) => (a < b ? -1 : 1));
  for (const [d, v] of entries) {
    const val = pred(v);
    if (val != null) return { date: d, value: val };
  }
  return null;
}
function lastInRange(logs, pred, from, to) {
  const entries = Object.entries(logs)
    .filter(([d]) => d >= from && (!to || d <= to))
    .sort(([a], [b]) => (a < b ? 1 : -1));
  for (const [d, v] of entries) {
    const val = pred(v);
    if (val != null) return { date: d, value: val };
  }
  return null;
}
const bodyweightPred = (v) => v?.bodyweight ?? null;
const exerciseMaxWeightPred = (name) => (v) => {
  const sets = v?.exercises?.[name]?.sets;
  if (!sets?.length) return null;
  const w = Math.max(...sets.map((s) => parseFloat(s.weight) || 0));
  return w > 0 ? w : null;
};

function computePhaseStats(logs, phase) {
  const from = phase.start;
  const to = phase.end || todayISO();
  const startW = firstInRange(logs, bodyweightPred, from, to);
  const endW = lastInRange(logs, bodyweightPred, from, to);
  const lifts = ANCHOR_LIFTS.map((name) => {
    const s = firstInRange(logs, exerciseMaxWeightPred(name), from, to);
    const e = lastInRange(logs, exerciseMaxWeightPred(name), from, to);
    return { name, start: s?.value ?? null, end: e?.value ?? null };
  });
  return {
    weightStart: startW?.value ?? null,
    weightEnd: endW?.value ?? null,
    lifts,
  };
}

// Índice de força geral: cada levantamento-âncora normalizado pro primeiro
// valor já registrado (=100%) e depois com a média dos 3 tirada por dia —
// evita que agachamento (mais pesado) domine a curva só por causa da escala.
function computeStrengthIndex(logs) {
  const baseline = {};
  ANCHOR_LIFTS.forEach((name) => {
    const first = firstInRange(logs, exerciseMaxWeightPred(name), "0000-01-01", null);
    if (first) baseline[name] = first.value;
  });
  return Object.entries(logs)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([d, v]) => {
      const pcts = ANCHOR_LIFTS.map((name) => {
        const w = exerciseMaxWeightPred(name)(v);
        return w != null && baseline[name] ? (w / baseline[name]) * 100 : null;
      }).filter((p) => p != null);
      if (!pcts.length) return null;
      return { date: d.slice(5), indice: Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) };
    })
    .filter(Boolean);
}

// Valor de um indicador "como estava" numa data específica — o último
// registro conhecido até ali (não precisa ter sido registrado bem naquele
// dia exato).
function valueAsOf(logs, pred, date) {
  return lastInRange(logs, pred, "0000-01-01", date);
}
function computeDateCompare(logs, dateA, dateB) {
  const wA = valueAsOf(logs, bodyweightPred, dateA);
  const wB = valueAsOf(logs, bodyweightPred, dateB);
  const lifts = ANCHOR_LIFTS.map((name) => {
    const a = valueAsOf(logs, exerciseMaxWeightPred(name), dateA);
    const b = valueAsOf(logs, exerciseMaxWeightPred(name), dateB);
    return { name, a: a?.value ?? null, b: b?.value ?? null };
  });
  return { weightA: wA?.value ?? null, weightB: wB?.value ?? null, lifts };
}

// Ritmo atual = variação de peso nos últimos 14 dias, projetada por semana.
// Ritmo necessário = quanto falta até a meta, dividido pelas semanas que
// restam até a data alvo. Compara os dois pra dizer se o prazo é realista.
function computeGoalStatus(logs, goalWeight, goalDate) {
  if (!goalWeight || !goalDate) return null;
  const entries = Object.entries(logs)
    .filter(([, v]) => v.bodyweight != null)
    .sort(([a], [b]) => (a < b ? -1 : 1));
  if (!entries.length) return null;
  const [lastDate, lastVal] = entries[entries.length - 1];
  const currentWeight = lastVal.bodyweight;

  const cutoff = new Date(lastDate + "T12:00:00");
  cutoff.setDate(cutoff.getDate() - 14);
  const cutoffISO = todayISO(cutoff);
  const recent = entries.filter(([d]) => d >= cutoffISO);
  let weeklyRate = null;
  if (recent.length >= 2) {
    const [firstDate, firstVal] = recent[0];
    const daysSpan = (new Date(lastDate) - new Date(firstDate)) / 86400000;
    if (daysSpan > 0) weeklyRate = ((currentWeight - firstVal.bodyweight) / daysSpan) * 7;
  }

  const daysLeft = Math.ceil((new Date(goalDate) - new Date(lastDate + "T12:00:00")) / 86400000);
  const weeksLeft = daysLeft / 7;
  const neededTotal = goalWeight - currentWeight;
  const neededWeeklyRate = weeksLeft > 0 ? neededTotal / weeksLeft : null;

  let verdict = "sem_dados";
  if (daysLeft <= 0) {
    verdict = Math.abs(neededTotal) < 0.3 ? "batido" : "prazo_passou";
  } else if (weeklyRate == null || neededWeeklyRate == null) {
    verdict = "sem_dados";
  } else if (Math.abs(neededTotal) < 0.3) {
    verdict = "batido";
  } else if (Math.sign(weeklyRate) !== Math.sign(neededWeeklyRate) && Math.abs(neededWeeklyRate) > 0.05) {
    verdict = "direcao_errada";
  } else if (Math.abs(weeklyRate) >= Math.abs(neededWeeklyRate) * 0.85) {
    verdict = "no_ritmo";
  } else if (Math.abs(weeklyRate) >= Math.abs(neededWeeklyRate) * 0.4) {
    verdict = "lento";
  } else {
    verdict = "muito_lento";
  }

  // Previsão de data — só faz sentido quando o ritmo atual está na direção
  // certa (senão a "data prevista" seria no passado ou nunca).
  let etaDate = null;
  if (weeklyRate != null && Math.abs(weeklyRate) > 0.01 && Math.sign(weeklyRate) === Math.sign(neededTotal || 1)) {
    const dailyRate = weeklyRate / 7;
    const daysToGoal = Math.round(neededTotal / dailyRate);
    if (daysToGoal > 0 && daysToGoal < 3650) {
      const eta = new Date(lastDate + "T12:00:00");
      eta.setDate(eta.getDate() + daysToGoal);
      etaDate = todayISO(eta);
    }
  }

  return { currentWeight, goalWeight, daysLeft, weeklyRate, neededWeeklyRate, verdict, etaDate };
}

// Platô de peso — só entra em alerta quando tem meta configurada (senão
// "peso parado" pode ser exatamente o que a pessoa quer, ex: manutenção) e
// dados suficientes pra não confundir uma pausa de 3 dias com platô de verdade.
function computePlateau(logs, goalWeight) {
  if (!goalWeight) return null;
  const entries = Object.entries(logs)
    .filter(([, v]) => v.bodyweight != null)
    .sort(([a], [b]) => (a < b ? -1 : 1));
  if (entries.length < 8) return null;
  const lastDate = entries[entries.length - 1][0];
  const cutoff = new Date(lastDate + "T12:00:00");
  cutoff.setDate(cutoff.getDate() - 13);
  const cutoffISO = todayISO(cutoff);
  const recent = entries.filter(([d]) => d >= cutoffISO);
  if (recent.length < 8) return null;
  const weights = recent.map(([, v]) => v.bodyweight);
  const range = Math.max(...weights) - Math.min(...weights);
  const currentWeight = weights[weights.length - 1];
  const goingRightDirection = Math.sign(goalWeight - currentWeight) !== 0;
  if (range <= 0.4 && Math.abs(goalWeight - currentWeight) >= 0.5 && goingRightDirection) {
    return { days: recent.length, range: range.toFixed(1), from: recent[0][0], to: lastDate };
  }
  return null;
}

// Platô de FORÇA — mesma ideia do platô de peso, mas olhando o índice de
// força geral (média relativa dos 3 levantamentos-âncora): o peso pode até
// estar variando bem, mas se a força trava por várias sessões seguidas é um
// sinal diferente que vale destacar separado.
function computeStrengthPlateau(logs) {
  // Recalcula igual ao computeStrengthIndex, mas sem cortar o ano da data
  // (aquele corta pra caber no eixo do gráfico) — aqui precisa da data cheia
  // pra formatar certo com fmtDateLabel.
  const baseline = {};
  ANCHOR_LIFTS.forEach((name) => {
    const first = firstInRange(logs, exerciseMaxWeightPred(name), "0000-01-01", null);
    if (first) baseline[name] = first.value;
  });
  const data = Object.entries(logs)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([d, v]) => {
      const pcts = ANCHOR_LIFTS.map((name) => {
        const w = exerciseMaxWeightPred(name)(v);
        return w != null && baseline[name] ? (w / baseline[name]) * 100 : null;
      }).filter((p) => p != null);
      if (!pcts.length) return null;
      return { date: d, indice: Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) };
    })
    .filter(Boolean);
  if (data.length < 8) return null;
  const recent = data.slice(-8);
  const vals = recent.map((d) => d.indice);
  const range = Math.max(...vals) - Math.min(...vals);
  if (range <= 3) {
    return { sessions: recent.length, range, from: recent[0].date, to: recent[recent.length - 1].date };
  }
  return null;
}

// Mesociclo planejado: semana 1..N contada a partir de uma data de início
// configurada pelo usuário, reiniciando o ciclo a cada N semanas. A última
// semana do ciclo é marcada como semana de deload — avisa ANTES de travar,
// em vez de só detectar depois que já estagnou (como o DeloadCard faz).
function computeMesocycleStatus(mesocycle) {
  if (!mesocycle?.startDate || !mesocycle?.weeks) return null;
  const start = new Date(mesocycle.startDate + "T00:00:00");
  const now = new Date();
  const daysElapsed = Math.floor((now - start) / 86400000);
  if (daysElapsed < 0) return null;
  const weekNum = Math.floor(daysElapsed / 7) + 1;
  const cycleWeek = ((weekNum - 1) % mesocycle.weeks) + 1;
  const cycleIndex = Math.floor((weekNum - 1) / mesocycle.weeks);
  const cycleStart = new Date(start);
  cycleStart.setDate(cycleStart.getDate() + cycleIndex * mesocycle.weeks * 7);
  return {
    weekNum,
    cycleWeek,
    totalWeeks: mesocycle.weeks,
    isDeloadWeek: cycleWeek === mesocycle.weeks,
    weeksUntilDeload: mesocycle.weeks - cycleWeek,
    cycleStartDate: todayISO(cycleStart),
  };
}

// Recordes separados por faixa de reps — 1RM não conta a história toda pra
// quem varia a faixa de treino entre mesociclos (força pura vs hipertrofia).
// É a carga REAL levantada em cada faixa, não uma estimativa.
const REP_BUCKETS = [
  { key: "1RM", label: "~1RM", min: 1, max: 2 },
  { key: "5RM", label: "~5RM", min: 4, max: 6 },
  { key: "10RM", label: "~10RM", min: 8, max: 12 },
];
function computePRByRepRange(logs) {
  const byName = {};
  Object.entries(logs)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .forEach(([d, v]) => {
      if (!v?.exercises) return;
      Object.entries(v.exercises).forEach(([name, ex]) => {
        if (!ex?.sets?.length) return;
        (byName[name] || (byName[name] = [])).push(...ex.sets);
      });
    });
  const result = {};
  Object.entries(byName).forEach(([name, sets]) => {
    const best = {};
    sets.forEach((s) => {
      const w = parseFloat(s.weight) || 0;
      const r = parseInt(s.reps, 10) || 0;
      if (!w || !r) return;
      const bucket = REP_BUCKETS.find((b) => r >= b.min && r <= b.max);
      if (!bucket) return;
      if (!best[bucket.key] || w > best[bucket.key]) best[bucket.key] = w;
    });
    if (Object.keys(best).length) result[name] = best;
  });
  return result;
}

// Junta as trocas de exercício registradas (settings.substitutionHistory) por
// exercício original, pra ver ao longo do tempo o que costuma virar "fuga".
function summarizeSubstitutionHistory(history) {
  if (!history?.length) return null;
  const byFrom = {};
  history.forEach((h) => {
    if (!byFrom[h.from]) byFrom[h.from] = { total: 0, to: {} };
    byFrom[h.from].total++;
    byFrom[h.from].to[h.to] = (byFrom[h.from].to[h.to] || 0) + 1;
  });
  return Object.entries(byFrom)
    .map(([from, data]) => ({
      from,
      total: data.total,
      breakdown: Object.entries(data.to)
        .sort((a, b) => b[1] - a[1])
        .map(([to, n]) => `${n}x ${to}`),
    }))
    .sort((a, b) => b.total - a.total);
}

// Tendência de RIR sentido vs alvo do plano, por semana — sinaliza se o
// usuário costuma sentir mais ou menos RIR do que o plano pede (pode indicar
// que a faixa de reps/carga alvo está calibrada errado pra ele).
function computeRirTrend(logs) {
  const targetByName = {};
  ["Push", "Pull", "Legs"].forEach((cat) => {
    (PLAN[cat] || []).forEach((ex) => {
      const nums = (ex.rir || "").split("-").map((n) => parseFloat(n)).filter((n) => !isNaN(n));
      if (!nums.length) return;
      const mid = nums.reduce((a, b) => a + b, 0) / nums.length;
      targetByName[ex.n] = mid;
      (ex.equivalents || []).forEach((eq) => (targetByName[eq] = mid));
    });
  });
  const byWeek = {};
  Object.entries(logs).forEach(([d, v]) => {
    Object.entries(v?.exercises || {}).forEach(([name, ex]) => {
      if (ex?.rirFelt == null) return;
      const target = targetByName[name];
      if (target == null) return;
      const felt = ex.rirFelt === "3+" ? 3.5 : parseFloat(ex.rirFelt);
      if (isNaN(felt)) return;
      const dt = new Date(d + "T12:00:00");
      const weekStart = new Date(dt);
      weekStart.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
      const wk = todayISO(weekStart);
      (byWeek[wk] = byWeek[wk] || []).push(felt - target);
    });
  });
  const weeks = Object.keys(byWeek).sort();
  if (weeks.length < 3) return null;
  const data = weeks.map((wk) => ({
    date: wk.slice(5),
    delta: +(byWeek[wk].reduce((a, b) => a + b, 0) / byWeek[wk].length).toFixed(1),
  }));
  const overall = +(data.reduce((a, b) => a + b.delta, 0) / data.length).toFixed(1);
  return { data, overall };
}

// Palavras-chave simples nas notas do dia, cruzadas com o volume de treino
// daquele dia — não é análise de sentimento de verdade, só uma contagem de
// palavra presente/ausente vs volume médio, pra ver se algum padrão salta
// aos olhos (ex: dias com "cansado" renderam menos volume).
const NOTE_KEYWORDS = [
  "cansado", "cansada", "exausto", "exausta", "dolorido", "dolorida",
  "animado", "animada", "disposto", "disposta", "estressado", "estressada",
  "sem fome", "mal dormi", "dormi bem",
];
function computeNoteKeywordStats(logs) {
  function dayVolume(v) {
    let vol = 0;
    Object.values(v?.exercises || {}).forEach((ex) => {
      (ex?.sets || []).forEach((s) => {
        vol += (parseFloat(s.weight) || 0) * (parseInt(s.reps, 10) || 0);
      });
    });
    return vol;
  }
  const days = Object.values(logs).filter((v) => v?.exercises && dayVolume(v) > 0);
  const results = [];
  NOTE_KEYWORDS.forEach((kw) => {
    const withKw = [];
    const withoutKw = [];
    days.forEach((v) => {
      const vol = dayVolume(v);
      const has = v.note && v.note.toLowerCase().includes(kw);
      (has ? withKw : withoutKw).push(vol);
    });
    if (withKw.length < 2 || withoutKw.length < 2) return;
    const avgWith = withKw.reduce((a, b) => a + b, 0) / withKw.length;
    const avgWithout = withoutKw.reduce((a, b) => a + b, 0) / withoutKw.length;
    const diffPct = ((avgWith - avgWithout) / avgWithout) * 100;
    if (Math.abs(diffPct) < 10) return;
    results.push({ keyword: kw, count: withKw.length, avgWith: Math.round(avgWith), avgWithout: Math.round(avgWithout), diffPct: Math.round(diffPct) });
  });
  results.sort((a, b) => Math.abs(b.diffPct) - Math.abs(a.diffPct));
  return results.length ? results.slice(0, 3) : null;
}

// TDEE estimado a partir dos dados reais (não uma fórmula genérica) — cruza
// a variação de peso de verdade com as calorias registradas: se você comeu
// uma média X e perdeu Y num intervalo de Z dias, seu gasto real é
// X - (Y×7700 ÷ Z) (7700kcal ≈ 1kg de gordura). Mais confiável que qualquer
// fórmula de bolso, porque usa o comportamento real do seu corpo.
function computeTDEE(logs) {
  const to = todayISO();
  const fromD = new Date();
  fromD.setDate(fromD.getDate() - 20);
  const from = todayISO(fromD);
  const daysWithMeals = Object.entries(logs)
    .filter(([d, v]) => d >= from && d <= to && v.meals?.length)
    .sort(([a], [b]) => (a < b ? -1 : 1));
  if (daysWithMeals.length < 7) return null;
  const avgKcal =
    daysWithMeals.reduce((sum, [, v]) => sum + v.meals.reduce((s, m) => s + kcal(m.protein, m.carb, m.fat), 0), 0) /
    daysWithMeals.length;
  const wStart = firstInRange(logs, bodyweightPred, from, to);
  const wEnd = lastInRange(logs, bodyweightPred, from, to);
  if (!wStart || !wEnd || wStart.date === wEnd.date) return null;
  const daysSpan = (new Date(wEnd.date) - new Date(wStart.date)) / 86400000;
  if (daysSpan < 7) return null;
  const weightChangeKg = wEnd.value - wStart.value;
  const tdee = avgKcal - (weightChangeKg * 7700) / daysSpan;
  if (tdee < 800 || tdee > 6000) return null; // fora da faixa plausível, dado ruim demais pra confiar
  return { tdee: Math.round(tdee), avgKcal: Math.round(avgKcal), daysUsed: daysWithMeals.length, weightChangeKg, daysSpan: Math.round(daysSpan) };
}

// Detecção de estagnação — resumo de painel do mesmo critério já usado dentro
// de cada ExerciseCard (mesma carga nas últimas 3 sessões, sem subir as reps):
// aqui agregado pra TODOS os exercícios de uma vez, então dá pra ver de
// relance na aba Progresso sem precisar abrir exercício por exercício.
function computeStagnation(logs) {
  const days = Object.entries(logs).sort(([a], [b]) => (a < b ? -1 : 1));
  const byExercise = {};
  days.forEach(([, v]) => {
    Object.entries(v?.exercises || {}).forEach(([name, ex]) => {
      const sets = ex?.sets;
      if (!sets?.length) return;
      const top = sets.reduce((best, s) => {
        const w = parseFloat(s.weight) || 0;
        const r = parseInt(s.reps, 10) || 0;
        if (w === 0) return best;
        if (!best || w > best.w || (w === best.w && r > best.r)) return { w, r };
        return best;
      }, null);
      if (top) (byExercise[name] = byExercise[name] || []).push(top);
    });
  });
  const stalled = [];
  Object.entries(byExercise).forEach(([name, tops]) => {
    const last3 = tops.slice(-3);
    const isStagnant =
      last3.length === 3 &&
      last3[0].w === last3[1].w &&
      last3[1].w === last3[2].w &&
      last3[2].r <= last3[0].r &&
      last3[2].r <= last3[1].r;
    if (isStagnant) stalled.push({ name, weight: last3[2].w, reps: last3[2].r });
  });
  return stalled.length ? stalled : null;
}

// Risco de overtraining: só dispara quando os três sinais apontam junto —
// volume semanal saltou (>=20% vs semana passada), RPE médio da semana alto
// (>=8) e sono médio baixo (<6h). Qualquer um sozinho é normal; os três
// juntos é o padrão clássico de fadiga acumulada antes de uma lesão/platô.
function computeOvertrainingRisk(logs) {
  const today = new Date();
  function weekRange(offsetWeeks) {
    const end = new Date(today);
    end.setDate(end.getDate() - offsetWeeks * 7);
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    return { startISO: todayISO(start), endISO: todayISO(end) };
  }
  function weekVolume(startISO, endISO) {
    let vol = 0;
    Object.entries(logs).forEach(([d, v]) => {
      if (d < startISO || d > endISO) return;
      Object.values(v?.exercises || {}).forEach((ex) => {
        (ex?.sets || []).forEach((s) => {
          const w = parseFloat(s.weight) || 0;
          const r = parseInt(s.reps, 10) || 0;
          vol += w * r;
        });
      });
    });
    return vol;
  }
  const thisWeek = weekRange(0);
  const lastWeek = weekRange(1);
  const volThis = weekVolume(thisWeek.startISO, thisWeek.endISO);
  const volLast = weekVolume(lastWeek.startISO, lastWeek.endISO);
  if (volThis === 0 || volLast === 0) return null;

  const rpeEntries = Object.entries(logs).filter(([d, v]) => d >= thisWeek.startISO && d <= thisWeek.endISO && v.sessionRPE != null);
  const sleepEntries = Object.entries(logs).filter(([d, v]) => d >= thisWeek.startISO && d <= thisWeek.endISO && v.sleepHours != null);
  if (!rpeEntries.length || !sleepEntries.length) return null;
  const avgRPE = rpeEntries.reduce((s, [, v]) => s + v.sessionRPE, 0) / rpeEntries.length;
  const avgSleep = sleepEntries.reduce((s, [, v]) => s + v.sleepHours, 0) / sleepEntries.length;

  const volumeJumpPct = ((volThis - volLast) / volLast) * 100;
  if (!(volumeJumpPct >= 20 && avgRPE >= 8 && avgSleep < 6)) return null;
  return { volumeJumpPct: Math.round(volumeJumpPct), avgRPE: +avgRPE.toFixed(1), avgSleep: +avgSleep.toFixed(1) };
}

// % de gordura estimado pela fórmula da Marinha americana — só cintura,
// pescoço e altura, sem precisar de paquímetro. É uma estimativa (erro típico
// de ±3-4pp), não substitui uma bioimpedância ou dobra cutânea de verdade.
function computeBodyFatNavy({ waistCm, neckCm, heightCm, sex = "m" }) {
  if (!waistCm || !neckCm || !heightCm || waistCm <= neckCm) return null;
  const bf =
    495 / (1.0324 - 0.19077 * Math.log10(waistCm - neckCm) + 0.15456 * Math.log10(heightCm)) - 450;
  if (!isFinite(bf) || bf <= 0 || bf > 60) return null;
  return Math.round(bf * 10) / 10;
}

// Banco calórico da semana (dieta flexível): soma meta vs consumido só dos
// dias já registrados (com refeição lançada) na semana corrente até hoje —
// dias sem nenhuma refeição não contam, pra não inflar o saldo com dias que o
// usuário simplesmente não abriu o app.
function computeWeeklyCalorieBank(logs, settings, selectedDate) {
  const ref = new Date(selectedDate + "T12:00:00");
  const dow = ref.getDay();
  const monday = new Date(ref);
  monday.setDate(ref.getDate() - ((dow + 6) % 7));
  let bank = 0;
  let daysCounted = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const iso = todayISO(d);
    if (iso > selectedDate) break;
    const entry = logs[iso];
    if (!entry?.meals?.length) continue;
    const dow2 = d.getDay();
    const scheduled = (settings.schedule && settings.schedule[String(dow2)]) || "Descanso";
    const dayType = entry.dayTypeOverride || scheduled;
    const cat = isTrainingDay(dayType) ? "Treino" : "Descanso";
    const target = settings.macroTargets[cat];
    const fatTarget = cat === "Treino" ? settings.fatTraining : settings.fatRest;
    const targetKcal = kcal(target.protein, target.carb, fatTarget);
    const gotKcal = entry.meals.reduce((s, m) => s + kcal(m.protein, m.carb, m.fat), 0);
    bank += targetKcal - gotKcal;
    daysCounted++;
  }
  if (daysCounted === 0) return null;
  return { bank: Math.round(bank), daysCounted };
}

// 1RM estimado pela fórmula de Epley — mais estável que olhar só a carga
// bruta, porque combina peso e reps num número só (útil quando as reps
// variam de sessão pra sessão mas a carga não muda muito).
function estimate1RM(weight, reps) {
  if (!weight || !reps) return 0;
  return weight * (1 + reps / 30);
}

// Brzycki e Lombardi divergem mais do Epley quanto maior o número de reps —
// combinar as três dá uma estimativa mais robusta do que confiar numa só
// fórmula de bolso.
function estimate1RMBrzycki(weight, reps) {
  if (!weight || !reps || reps >= 37) return 0;
  return weight / (1.0278 - 0.0278 * reps);
}
function estimate1RMLombardi(weight, reps) {
  if (!weight || !reps) return 0;
  return weight * Math.pow(reps, 0.1);
}
function estimate1RMAvg(weight, reps) {
  const vals = [estimate1RM(weight, reps), estimate1RMBrzycki(weight, reps), estimate1RMLombardi(weight, reps)].filter(
    (v) => v > 0 && isFinite(v)
  );
  return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
}

// Sequência de dias seguidos com algo registrado (peso, treino, refeição ou
// água) até o dia mais recente. Não conta "hoje" contra a sequência enquanto
// ele ainda está vazio — só quebra a sequência se ontem também estava vazio.
function computeStreak(logs) {
  let streak = 0;
  const today = new Date();
  const todayStr = todayISO(today);
  const todayHasData = logs[todayStr] && !isEmptyDay(logs[todayStr]);
  let cursor = todayHasData ? today : new Date(today.getTime() - 86400000);
  while (true) {
    const iso = todayISO(cursor);
    if (logs[iso] && !isEmptyDay(logs[iso])) {
      streak++;
      cursor = new Date(cursor.getTime() - 86400000);
    } else {
      break;
    }
  }
  return streak;
}

// Lista de recordes de carga — pra cada exercício, cada sessão em que a carga
// máxima superou tudo que veio antes vira uma entrada. A primeira sessão
// registrada de um exercício sempre entra (é a base a partir da qual os
// próximos recordes são medidos).
function computePRHistory(logs) {
  const byName = {};
  Object.entries(logs)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .forEach(([d, v]) => {
      if (!v?.exercises) return;
      Object.entries(v.exercises).forEach(([name, ex]) => {
        if (!ex?.sets?.length) return;
        (byName[name] || (byName[name] = [])).push({ date: d, sets: ex.sets });
      });
    });
  const prs = [];
  Object.entries(byName).forEach(([name, sessions]) => {
    let maxW = 0;
    sessions.forEach(({ date, sets }) => {
      const w = Math.max(0, ...sets.map((s) => parseFloat(s.weight) || 0));
      if (w > maxW) {
        maxW = w;
        prs.push({ date, name, weight: w });
      }
    });
  });
  return prs.sort((a, b) => (a.date < b.date ? 1 : -1));
}

// Lista de dores/desconfortos marcados em exercícios — dá pra levar pro
// fisio/médico depois se precisar mostrar um histórico.
function computePainHistory(logs) {
  const out = [];
  Object.entries(logs)
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .forEach(([d, v]) => {
      if (!v?.exercises) return;
      Object.entries(v.exercises).forEach(([name, ex]) => {
        if (ex?.painNote) out.push({ date: d, name, note: ex.painNote });
      });
    });
  return out;
}

// Resumo automático dos últimos 7 dias — sem precisar escolher datas, já
// mostra treinos feitos, variação de peso e recordes batidos na semana.
function computeWeekSummary(logs, settings, prHistory) {
  const to = todayISO();
  const fromD = new Date();
  fromD.setDate(fromD.getDate() - 6);
  const from = todayISO(fromD);
  let workouts = 0;
  Object.entries(logs).forEach(([d, v]) => {
    if (d < from || d > to) return;
    const dow = new Date(d + "T12:00:00").getDay();
    const scheduled = settings.schedule[dow] || "Descanso";
    const dt = v.dayTypeOverride || scheduled;
    if (isTrainingDay(dt) && v.exercises && Object.keys(v.exercises).length > 0) workouts++;
  });
  const wStart = firstInRange(logs, bodyweightPred, from, to);
  const wEnd = lastInRange(logs, bodyweightPred, from, to);
  const prsThisWeek = prHistory.filter((p) => p.date >= from && p.date <= to);
  const sleepEntries = Object.entries(logs)
    .filter(([d, v]) => d >= from && d <= to && v.sleepHours != null)
    .map(([, v]) => v.sleepHours);
  const avgSleep = sleepEntries.length ? sleepEntries.reduce((a, b) => a + b, 0) / sleepEntries.length : null;
  return {
    from,
    to,
    workouts,
    weightStart: wStart?.value ?? null,
    weightEnd: wEnd?.value ?? null,
    prCount: prsThisWeek.length,
    avgSleep,
  };
}

// Igual ao resumo semanal, só que numa janela de 30 dias — visão mais larga
// sem precisar escolher datas.
function computeMonthSummary(logs, settings, prHistory) {
  const to = todayISO();
  const fromD = new Date();
  fromD.setDate(fromD.getDate() - 29);
  const from = todayISO(fromD);
  let workouts = 0;
  Object.entries(logs).forEach(([d, v]) => {
    if (d < from || d > to) return;
    const dow = new Date(d + "T12:00:00").getDay();
    const scheduled = settings.schedule[dow] || "Descanso";
    const dt = v.dayTypeOverride || scheduled;
    if (isTrainingDay(dt) && v.exercises && Object.keys(v.exercises).length > 0) workouts++;
  });
  const wStart = firstInRange(logs, bodyweightPred, from, to);
  const wEnd = lastInRange(logs, bodyweightPred, from, to);
  const prsThisMonth = prHistory.filter((p) => p.date >= from && p.date <= to);
  return {
    from,
    to,
    workouts,
    weightStart: wStart?.value ?? null,
    weightEnd: wEnd?.value ?? null,
    prCount: prsThisMonth.length,
  };
}

// Versão genérica do resumo (semana/mês reusam essa lógica com janelas
// diferentes) — usada pelo card compartilhável, que deixa o usuário escolher
// entre "mês" e "ano".
function computePeriodSummary(logs, settings, prHistory, days) {
  const to = todayISO();
  const fromD = new Date();
  fromD.setDate(fromD.getDate() - (days - 1));
  const from = todayISO(fromD);
  let workouts = 0;
  Object.entries(logs).forEach(([d, v]) => {
    if (d < from || d > to) return;
    const dow = new Date(d + "T12:00:00").getDay();
    const scheduled = settings.schedule[dow] || "Descanso";
    const dt = v.dayTypeOverride || scheduled;
    if (isTrainingDay(dt) && v.exercises && Object.keys(v.exercises).length > 0) workouts++;
  });
  const wStart = firstInRange(logs, bodyweightPred, from, to);
  const wEnd = lastInRange(logs, bodyweightPred, from, to);
  const prsInRange = prHistory.filter((p) => p.date >= from && p.date <= to);
  return {
    from,
    to,
    workouts,
    weightStart: wStart?.value ?? null,
    weightEnd: wEnd?.value ?? null,
    prCount: prsInRange.length,
  };
}

// Volume total (peso × reps de todos os exercícios) de cada sessão de
// treino, agrupado por dia da semana — pra achar um padrão tipo "segunda
// costuma ser mais forte". Exige pelo menos 2 sessões naquele dia da semana
// pra entrar na comparação (uma sessão isolada não é padrão).
function computeWeekdayPattern(logs) {
  const buckets = Array.from({ length: 7 }, () => []);
  Object.entries(logs).forEach(([d, v]) => {
    if (!v?.exercises) return;
    const vol = Object.values(v.exercises).reduce((sum, ex) => {
      if (!ex?.sets?.length) return sum;
      return sum + ex.sets.reduce((s2, s) => s2 + (parseFloat(s.weight) || 0) * (parseInt(s.reps, 10) || 0), 0);
    }, 0);
    if (vol <= 0) return;
    const dow = new Date(d + "T12:00:00").getDay();
    buckets[dow].push(vol);
  });
  const averages = buckets.map((vols, dow) => ({
    dow,
    label: WEEKDAY_LABEL[dow],
    avg: vols.length ? vols.reduce((a, b) => a + b, 0) / vols.length : 0,
    count: vols.length,
  }));
  const withEnough = averages.filter((a) => a.count >= 2);
  if (withEnough.length < 2) return null;
  const sorted = [...withEnough].sort((a, b) => b.avg - a.avg);
  return { averages, strongest: sorted[0], weakest: sorted[sorted.length - 1] };
}

// Volume (peso × reps somado) dos últimos 7 dias, agrupado por grupo
// muscular — pra notar se algum grupo ficou de fora na semana.
function computeMuscleVolume(logs) {
  const to = todayISO();
  const fromD = new Date();
  fromD.setDate(fromD.getDate() - 6);
  const from = todayISO(fromD);
  const totals = {};
  Object.entries(logs).forEach(([d, v]) => {
    if (d < from || d > to || !v?.exercises) return;
    Object.entries(v.exercises).forEach(([name, ex]) => {
      const muscle = NAME_TO_MUSCLE[name];
      if (!muscle || !ex?.sets?.length) return;
      const vol = ex.sets.reduce((sum, s) => sum + (parseFloat(s.weight) || 0) * (parseInt(s.reps, 10) || 0), 0);
      totals[muscle] = (totals[muscle] || 0) + vol;
    });
  });
  return Object.entries(totals)
    .map(([muscle, volume]) => ({ muscle, volume: Math.round(volume) }))
    .sort((a, b) => b.volume - a.volume);
}

// Toca dois bipes curtos (Web Audio, sem precisar de arquivo de áudio) —
// usado quando o timer de descanso chega a zero.
function playTimerBeep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.22].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.001, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.2);
    });
    setTimeout(() => ctx.close(), 600);
  } catch (e) {
    // navegador sem suporte a Web Audio — silencioso, sem quebrar o timer
  }
}

// Comprime uma foto antes de guardar no localStorage — sem isso, uma foto de
// celular moderno (4-5MB) estouraria a cota de 5MB do app sozinha.
function compressImageFile(file, maxDim = 900, quality = 0.6) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

// Rampa de aquecimento a partir da carga de trabalho de hoje — 3 passos a
// 40/60/80%, arredondados pro incremento de anilha configurado (padrão
// 2,5kg), com reps decrescendo conforme o peso sobe.
function computeWarmup(workingWeight, increment = 2.5) {
  if (!workingWeight || workingWeight <= 0) return [];
  return [
    { pct: 40, reps: 8 },
    { pct: 60, reps: 5 },
    { pct: 80, reps: 3 },
  ].map((step) => ({
    ...step,
    weight: Math.max(increment, Math.round((workingWeight * step.pct) / 100 / increment) * increment),
  }));
}

// Sugere alimentos do banco pra fechar o que falta de proteína no dia — pega
// os mais proteicos, calcula uma quantidade (arredondada de 10 em 10g, entre
// 50 e 300g) que chega perto do que falta, e ordena pelo mais preciso.
function suggestFoodsForRemaining(remaining) {
  if (!remaining || remaining.protein < 10) return [];
  return FOOD_DB.filter((f) => f.p >= 8)
    .map((f) => {
      const rawGrams = (remaining.protein / f.p) * 100;
      const grams = Math.min(300, Math.max(50, Math.round(rawGrams / 10) * 10));
      const macros = computeFromFood(f, grams);
      return { food: f, grams, macros };
    })
    .sort((a, b) => Math.abs(a.macros.protein - remaining.protein) - Math.abs(b.macros.protein - remaining.protein))
    .slice(0, 3);
}

// Dados pro calendário em heatmap (estilo GitHub) dos últimos N dias — uma
// entrada por dia com o tipo de treino (se foi feito) pra colorir o quadrado.
function buildHeatmapData(logs, settings, days = 84) {
  const out = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = todayISO(d);
    const v = logs[dateStr];
    const dow = d.getDay();
    const scheduled = settings.schedule[dow] || "Descanso";
    const dt = v?.dayTypeOverride || scheduled;
    const trained = isTrainingDay(dt) && v?.exercises && Object.keys(v.exercises).length > 0;
    out.push({ date: dateStr, dow, dt, trained, hasAnyData: v && !isEmptyDay(v) });
  }
  return out;
}

// Gera um PDF de uma página com o resumo do progresso — carregado sob
// demanda (jsPDF só entra no bundle quando o botão é clicado).
async function generatePdfReport(logs, settings) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 48;
  let y = 56;
  const lh = 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Cutting Log — Resumo de progresso", marginX, y);
  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(120);
  y += lh;
  doc.text(`Gerado em ${fmtDateLabel(todayISO())}`, marginX, y);
  doc.setTextColor(20);
  y += lh * 1.6;

  function heading(text) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(text, marginX, y);
    y += lh * 1.2;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
  }
  function line(text) {
    doc.text(text, marginX, y);
    y += lh;
  }

  const bwEntries = Object.entries(logs)
    .filter(([, v]) => v.bodyweight != null)
    .sort(([a], [b]) => (a < b ? -1 : 1));
  const currentWeight = bwEntries.length ? bwEntries[bwEntries.length - 1][1].bodyweight : settings.startWeight;

  heading("Peso corporal");
  line(`Inicial: ${settings.startWeight}kg   ·   Atual: ${currentWeight}kg   ·   Variação: ${(currentWeight - settings.startWeight).toFixed(1)}kg`);
  y += lh * 0.6;

  heading("Força — principais levantamentos (carga máxima atual)");
  ANCHOR_LIFTS.forEach((name) => {
    const last = lastInRange(logs, exerciseMaxWeightPred(name), "0000-01-01", null);
    line(`${name}: ${last ? last.value + "kg" : "sem dados"}`);
  });
  y += lh * 0.6;

  const goalStatus = computeGoalStatus(logs, settings.goalWeight, settings.goalDate);
  if (goalStatus) {
    heading("Meta de peso");
    line(`${goalStatus.currentWeight}kg → ${goalStatus.goalWeight}kg   ·   ${GOAL_VERDICT[goalStatus.verdict].text}`);
    y += lh * 0.6;
  }

  if ((settings.phases || []).length) {
    heading("Fases");
    settings.phases.forEach((phase) => {
      const stats = computePhaseStats(logs, phase);
      const wDelta = stats.weightStart != null && stats.weightEnd != null ? (stats.weightEnd - stats.weightStart).toFixed(1) : "—";
      line(`${phase.name}: peso ${stats.weightStart ?? "—"}kg → ${stats.weightEnd ?? "—"}kg (${wDelta}kg)`);
    });
    y += lh * 0.6;
  }

  const prHistory = computePRHistory(logs).slice(0, 10);
  if (prHistory.length) {
    heading("Últimos recordes");
    prHistory.forEach((pr) => line(`${fmtDateLabel(pr.date)} — ${pr.name}: ${pr.weight}kg`));
  }

  doc.save(`cutting-log-resumo-${todayISO()}.pdf`);
}

// Mantém a tela acesa enquanto `active` for true (Wake Lock API) — o
// navegador libera o lock sozinho quando a aba fica em background, então
// reconquista automaticamente quando ela volta a ficar visível.
function useWakeLock(active) {
  const lockRef = useRef(null);
  const supported = typeof navigator !== "undefined" && "wakeLock" in navigator;

  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    async function acquire() {
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) {
          lock.release().catch(() => {});
          return;
        }
        lockRef.current = lock;
      } catch (e) {
        // pode falhar se a aba não estiver visível — sem problema, tenta de
        // novo no próximo visibilitychange
      }
    }
    async function release() {
      if (lockRef.current) {
        try {
          await lockRef.current.release();
        } catch (e) {}
        lockRef.current = null;
      }
    }
    if (active) {
      acquire();
      const onVisible = () => {
        if (document.visibilityState === "visible" && active && !lockRef.current) acquire();
      };
      document.addEventListener("visibilitychange", onVisible);
      return () => {
        cancelled = true;
        document.removeEventListener("visibilitychange", onVisible);
        release();
      };
    } else {
      release();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return supported;
}

function useDebouncedSave(value, key, ready) {
  const timer = useRef(null);
  const latest = useRef(value);
  latest.current = value;

  // Grava agora mesmo, cancelando o debounce pendente. Usado tanto pelo
  // salvamento automático (minimizar/fechar) quanto pelo botão "Salvar agora".
  async function writeNow() {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    await window.storage.set(key, JSON.stringify(latest.current), false);
  }

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
      if (timer.current) writeNow().catch((e) => console.error("flush save failed", key, e));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready]);

  return writeNow;
}

const VALID_TABS = ["hoje", "treino", "dieta", "progresso"];

export default function App() {
  const [ready, setReady] = useState(false);
  // Atalhos do ícone do app (menu de long-press) abrem em /?tab=treino etc —
  // lê uma vez no boot e limpa a URL, sem deixar o parâmetro preso ali.
  const [tab, setTab] = useState(() => {
    const qs = new URLSearchParams(window.location.search).get("tab");
    return VALID_TABS.includes(qs) ? qs : "hoje";
  });
  // Ação rápida via atalho do iOS (Siri): ?tab=hoje&acao=agua|cafe|creatina|peso|sono
  // — dá pra amarrar cada uma num comando de voz no app Atalhos. O parâmetro
  // opcional "valor" permite um Atalho que já lê o peso/sono direto do Apple
  // Saúde e manda o número junto, sem precisar digitar na mão.
  const [pendingAction] = useState(() => new URLSearchParams(window.location.search).get("acao"));
  const [pendingValor] = useState(() => new URLSearchParams(window.location.search).get("valor"));
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [logs, setLogs] = useState({});
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [session, setSession] = useState(null);
  const [cloudStatus, setCloudStatus] = useState("idle"); // idle | syncing | synced | error
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState(() => {
    const raw = localStorage.getItem("cutting-log:lastCloudSync");
    return raw ? Number(raw) : null;
  });
  const pulledFromCloud = useRef(false);

  // Toast de "desfazer" — usado por ações de apagar que são fáceis de tocar
  // sem querer (remover refeição, remover foto). Some sozinho em 5s.
  const [undoToast, setUndoToast] = useState(null); // {message, onUndo}
  const undoTimerRef = useRef(null);
  function showUndo(message, onUndo) {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoToast({ message, onUndo });
    undoTimerRef.current = setTimeout(() => setUndoToast(null), 5000);
  }

  // Tour rápido só pra quem abre o app pela primeira vez de verdade (nenhum
  // dia registrado ainda) — quem já usa o app não vê isso nunca mais, mesmo
  // que o flag de "já visto" seja apagado, porque a condição real é "tem
  // dado ou não".
  const [showTour, setShowTour] = useState(false);
  useEffect(() => {
    if (!ready) return;
    const alreadySeen = localStorage.getItem("cutting-log:tourSeen");
    if (!alreadySeen && Object.keys(logs).length === 0) setShowTour(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
  function dismissTour() {
    localStorage.setItem("cutting-log:tourSeen", "1");
    setShowTour(false);
  }

  const [showChangelog, setShowChangelog] = useState(false);

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
    // Some junto o ?tab= da URL depois de lido, senão ele fica ali preso e
    // reaparece (ex: se o usuário atualizar a página ou compartilhar o link).
    if (window.location.search) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Backup na nuvem (Supabase) — opcional, só ativa se o usuário logar em
  // Configurações. Sessão persiste sozinha no navegador entre aberturas.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      setSession(sess);
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryMode(true);
        setShowSettings(true);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Aparelho novo/reinstalado: se logar e o localStorage estiver vazio, puxa
  // o que já tinha na nuvem em vez de sobrescrever com nada.
  useEffect(() => {
    if (!ready || !session || pulledFromCloud.current) return;
    pulledFromCloud.current = true;
    (async () => {
      const { data, error } = await supabase
        .from("backups")
        .select("logs,settings")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (error) {
        console.error("cloud pull failed", error);
        return;
      }
      if (data && Object.keys(logs).length === 0) {
        if (data.logs) setLogs(data.logs);
        if (data.settings) setSettings((prev) => ({ ...prev, ...data.settings }));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, session]);

  // Empurra pra nuvem sempre que logs/settings mudam, com um pequeno atraso
  // (não precisa da urgência do flush local — o localStorage já é a fonte
  // confiável; a nuvem é só o espelho/seguro contra perda do aparelho).
  useEffect(() => {
    if (!ready || !session) return;
    const timer = setTimeout(async () => {
      setCloudStatus("syncing");
      const { error } = await supabase
        .from("backups")
        .upsert({ user_id: session.user.id, logs, settings, updated_at: new Date().toISOString() });
      setCloudStatus(error ? "error" : "synced");
      if (error) {
        console.error("cloud push failed", error);
      } else {
        const now = Date.now();
        localStorage.setItem("cutting-log:lastCloudSync", String(now));
        setLastSyncAt(now);
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [logs, settings, session, ready]);

  const saveLogsNow = useDebouncedSave(logs, "logs", ready);
  const saveSettingsNow = useDebouncedSave(settings, "settings", ready);
  async function saveNow() {
    await Promise.all([saveLogsNow(), saveSettingsNow()]);
  }

  // O toggle vai no <html>, não só na div do app — assim o fundo por trás
  // do card (mobile: as bordas/status bar; desktop: o "tapete" atrás do
  // card) também troca de cor junto, sem sobrar tarja escura ao redor de
  // um app claro.
  useEffect(() => {
    document.documentElement.classList.toggle("theme-light", settings.theme === "light");
  }, [settings.theme]);

  const dow = new Date(selectedDate + "T12:00:00").getDay();
  const dayEntry = logs[selectedDate] || {};
  const scheduledType = settings.schedule[dow] || "Descanso";
  // Troca manual do dia (ex: pular pra Push mesmo com Legs/Descanso agendado)
  // fica junto do resto do dia em `logs`, não em settings — é uma exceção
  // pontual daquele dia, não uma mudança permanente da divisão semanal.
  const dayType = dayEntry.dayTypeOverride || scheduledType;
  const dietCat = isTrainingDay(dayType) ? "Treino" : "Descanso";

  function updateDay(patch) {
    setLogs((prev) => ({
      ...prev,
      [selectedDate]: { ...(prev[selectedDate] || {}), ...patch },
    }));
  }

  function cleanEmptyDays() {
    setLogs((prev) => {
      const next = {};
      Object.entries(prev).forEach(([d, v]) => {
        if (!isEmptyDay(v)) next[d] = v;
      });
      return next;
    });
  }

  // Histórico por exercício, indexado uma vez por mudança em `logs` em vez de
  // escanear todos os dias de novo pra cada exercício em cada render — o
  // custo cresce com meses de uso, então vale memoizar.
  const historyByExercise = useMemo(() => {
    const map = {};
    Object.entries(logs)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .forEach(([d, v]) => {
        if (!v?.exercises) return;
        Object.entries(v.exercises).forEach(([name, ex]) => {
          if (!ex?.sets?.length) return;
          (map[name] || (map[name] = [])).push({ date: d, sets: ex.sets });
        });
      });
    return map;
  }, [logs]);
  function exerciseHistory(name) {
    return historyByExercise[name] || [];
  }

  const streak = useMemo(() => computeStreak(logs), [logs]);

  return (
    <div className="app" style={{ "--font-scale": settings.fontScale || 1 }}>
      <style>{CSS}</style>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" style={{ background: getDayColor(dayType) }} />
          <div>
            <div className="brand-title">Cutting Log</div>
            <div className="brand-sub">João Gabriel · PPL</div>
          </div>
        </div>
        <div className="topbar-actions">
          {streak > 0 && (
            <div className="streak-badge" title={`${streak} dia(s) seguidos registrando algo no app`}>
              <Flame size={12} /> {streak}
            </div>
          )}
          {session && (
            <button
              className="icon-btn cloud-status-btn"
              onClick={() => setShowSettings(true)}
              aria-label="Status do backup na nuvem"
              title={
                cloudStatus === "syncing" ? "Sincronizando…" : cloudStatus === "error" ? "Erro ao sincronizar" : "Nuvem em dia"
              }
            >
              <Cloud size={16} className={"cloud-status-icon " + cloudStatus} />
            </button>
          )}
          <button className="icon-btn" onClick={() => setShowSettings(true)} aria-label="Configurações">
            <Settings size={18} />
          </button>
        </div>
      </header>

      <main className="content">
        {tab === "hoje" && (
          <HojeTab
            settings={settings}
            setSettings={setSettings}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            dayType={dayType}
            scheduledType={scheduledType}
            dietCat={dietCat}
            dayEntry={dayEntry}
            updateDay={updateDay}
            setTab={setTab}
            ready={ready}
            showUndo={showUndo}
            logs={logs}
            pendingAction={pendingAction}
            pendingValor={pendingValor}
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
            onSaveNow={saveNow}
            ready={ready}
          />
        )}
        {tab === "dieta" && (
          <DietaTab
            dietCat={dietCat}
            settings={settings}
            setSettings={setSettings}
            dayEntry={dayEntry}
            updateDay={updateDay}
            logs={logs}
            selectedDate={selectedDate}
            showUndo={showUndo}
          />
        )}
        {tab === "progresso" && <ProgressoTab logs={logs} settings={settings} setSettings={setSettings} />}
      </main>

      {undoToast && (
        <div className="undo-toast">
          <span>{undoToast.message}</span>
          <button
            onClick={() => {
              undoToast.onUndo();
              setUndoToast(null);
              if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
            }}
          >
            Desfazer
          </button>
        </div>
      )}

      <nav className="tabbar">
        <TabBtn icon={Home} label="Hoje" active={tab === "hoje"} onClick={() => setTab("hoje")} />
        <TabBtn icon={Dumbbell} label="Treino" active={tab === "treino"} onClick={() => setTab("treino")} />
        <TabBtn icon={UtensilsCrossed} label="Dieta" active={tab === "dieta"} onClick={() => setTab("dieta")} />
        <TabBtn icon={TrendingUp} label="Progresso" active={tab === "progresso"} onClick={() => setTab("progresso")} />
      </nav>

      {showSettings && (
        <SettingsSheet
          settings={settings}
          setSettings={setSettings}
          logs={logs}
          setLogs={setLogs}
          onCleanEmptyDays={cleanEmptyDays}
          session={session}
          cloudStatus={cloudStatus}
          lastSyncAt={lastSyncAt}
          recoveryMode={recoveryMode}
          onRecoveryDone={() => setRecoveryMode(false)}
          onClose={() => setShowSettings(false)}
          onShowChangelog={() => setShowChangelog(true)}
        />
      )}

      {showTour && <OnboardingTour onDone={dismissTour} />}

      {showChangelog && <ChangelogModal onClose={() => setShowChangelog(false)} />}
    </div>
  );
}

const TOUR_STEPS = [
  {
    icon: Home,
    title: "Hoje",
    text: "Sua tela de partida: peso, hidratação, suplementos, foto e notas do dia — tudo o que você registra rapidinho, todo dia.",
  },
  {
    icon: Dumbbell,
    title: "Treino",
    text: "Cada exercício do seu treino do dia, com histórico, sugestão de carga, timer de descanso e detecção automática de recorde.",
  },
  {
    icon: UtensilsCrossed,
    title: "Dieta",
    text: "Registre refeições por alimento ou manual, acompanhe os macros da meta e salve favoritos pra registrar em 1 toque.",
  },
  {
    icon: TrendingUp,
    title: "Progresso",
    text: "Gráficos de peso e força, histórico de recordes, calendário de treinos e comparações — tudo calculado automaticamente.",
  },
];

function OnboardingTour({ onDone }) {
  const [step, setStep] = useState(0);
  const s = TOUR_STEPS[step];
  const Icon = s.icon;
  const isLast = step === TOUR_STEPS.length - 1;
  return (
    <div className="sheet-backdrop">
      <div className="tour-card">
        <button className="icon-btn tour-skip" onClick={onDone} aria-label="Pular tour">
          <X size={16} />
        </button>
        <div className="tour-icon">
          <Icon size={28} />
        </div>
        <div className="tour-title">{s.title}</div>
        <p className="tour-text">{s.text}</p>
        <div className="tour-dots">
          {TOUR_STEPS.map((_, i) => (
            <span key={i} className={"tour-dot" + (i === step ? " active" : "")} />
          ))}
        </div>
        <button className="btn-primary" onClick={() => (isLast ? onDone() : setStep((s) => s + 1))}>
          {isLast ? "Começar" : "Próximo"} {!isLast && <ChevronRight size={16} />}
        </button>
        {!isLast && (
          <button className="link-btn" style={{ marginTop: 10 }} onClick={onDone}>
            Pular
          </button>
        )}
      </div>
    </div>
  );
}

// Agrupado por tema em vez de por data exata (as features foram todas
// adicionadas na mesma sessão de desenvolvimento) — mais fácil de escanear.
const CHANGELOG = [
  {
    title: "Inteligência e ajustes finos",
    items: [
      "Previsão de data da meta",
      "Detecção de platô",
      "TDEE estimado a partir dos seus próprios dados",
      "Calculadora de macros inicial",
      "Média móvel de 7 dias no gráfico de peso",
      "Registro de sono",
      "Importar backup",
      "Resumo compartilhável (mês/ano)",
      "Tour pra novo usuário",
      "Dica técnica por exercício",
      "Tamanho de fonte ajustável",
    ],
  },
  {
    title: "Notificações push",
    items: [
      "Lembretes de treino, peso, água e sincronização direto no celular, mesmo com o app fechado",
      "Aviso de novo recorde e de meta batida",
      "Preferências e horários configuráveis por tipo",
    ],
  },
  {
    title: "Treino avançado",
    items: [
      "Superset/circuito",
      "Cronômetro de treino",
      "RIR sentido vs planejado",
      "Aquecimento sugerido",
      "Aviso de dor/desconforto",
      "Templates de treino personalizados",
      "Tela sempre acesa durante o treino",
      "Compartilhar treino em texto",
    ],
  },
  {
    title: "Progresso e insights",
    items: [
      "Calendário de treinos em heatmap",
      "Comparação automática com 3 meses atrás",
      "Resumo semanal e mensal automáticos",
      "Padrão por dia da semana",
      "Volume por grupo muscular",
      "Histórico de recordes",
      "Exportar resumo em PDF",
    ],
  },
  {
    title: "Dieta e corpo",
    items: [
      "Sugestão de alimento pra bater a meta",
      "Checklist de suplementos",
      "Fotos de progresso",
      "Medidas corporais (cintura/braço/peito/coxa)",
      "Hidratação",
      "Clonar refeições de ontem",
    ],
  },
  {
    title: "Base",
    items: [
      "Recorde pessoal (PR) automático",
      "Deload sugerido",
      "Comparação de fases",
      "Backup na nuvem",
      "1RM estimado",
      "Streak de dias",
      "Atalhos do ícone",
      "Desfazer última ação",
    ],
  },
];

function ChangelogModal({ onClose }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <span>Novidades do app</span>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="stack">
          {CHANGELOG.map((group) => (
            <div className="card" key={group.title}>
              <div className="card-head">{group.title}</div>
              <ul className="changelog-list">
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
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
function HojeTab({ settings, setSettings, selectedDate, setSelectedDate, dayType, scheduledType, dietCat, dayEntry, updateDay, setTab, ready, showUndo, logs, pendingAction, pendingValor }) {
  const [switching, setSwitching] = useState(false);
  const training = isTrainingDay(dayType);
  const latestWeight = getLatestBodyweight(logs, settings.startWeight);
  const autoWaterCups = settings.waterAuto ? computeWaterTargetCups(latestWeight, training) : null;
  const waterTargetCups = autoWaterCups || settings.waterTarget;

  // Ações rápidas via URL (atalho iOS "Ei Siri, registra água") — dispara uma
  // vez só quando a tela carrega já pronta, e não repete em re-renders.
  const ranActionRef = useRef(false);
  const bwInputRef = useRef(null);
  useEffect(() => {
    if (!ready || !pendingAction || ranActionRef.current) return;
    ranActionRef.current = true;
    const valor = pendingValor ? parseFloat(pendingValor.replace(",", ".")) : null;
    if (pendingAction === "agua") updateDay({ water: (dayEntry.water || 0) + 1 });
    else if (pendingAction === "cafe") updateDay({ caffeine: (dayEntry.caffeine || 0) + 1 });
    else if (pendingAction === "creatina") {
      updateDay({ supplements: { ...(dayEntry.supplements || {}), Creatina: true } });
    } else if (pendingAction === "peso") {
      // Com "valor" (ex: vindo de um Atalho que lê o Apple Saúde), grava
      // direto — sem valor, só foca o campo pro usuário digitar.
      if (valor > 0) updateDay({ bodyweight: valor });
      else setTimeout(() => bwInputRef.current?.focus(), 150);
    } else if (pendingAction === "sono" && valor > 0) {
      updateDay({ sleepHours: valor });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, pendingAction, pendingValor]);

  function setSupplementStock(name, qty) {
    setSettings((prev) => ({ ...prev, supplementStock: { ...prev.supplementStock, [name]: qty } }));
  }
  const target = settings.macroTargets[dietCat];
  const fatTarget = training ? settings.fatTraining : settings.fatRest;
  const targetKcal = kcal(target.protein, target.carb, fatTarget);
  const meals = dayEntry.meals || [];
  const got = meals.reduce(
    (a, m) => ({ protein: a.protein + m.protein, carb: a.carb + m.carb, fat: a.fat + m.fat }),
    { protein: 0, carb: 0, fat: 0 }
  );
  const gotKcal = kcal(got.protein, got.carb, got.fat);
  const exercisesDone = dayEntry.exercises ? Object.keys(dayEntry.exercises).length : 0;
  const exercisesTotal = training ? getPlanExercises(dayType, settings).length : 0;
  const dayOptions = [...ALL_DAY_TYPES.slice(0, -1), ...(settings.customTemplates || []).map((t) => t.name), "Descanso"];

  const isToday = selectedDate === todayISO();
  const hour = new Date().getHours();
  const showWeightReminder = isToday && dayEntry.bodyweight == null && hour >= 9;
  const showTrainingReminder = isToday && training && hour >= 12 && exercisesDone === 0;

  return (
    <div className="stack">
      {showWeightReminder && (
        <div className="reminder-banner">
          <Flame size={14} />
          <span>Ainda não registrou o peso de hoje — pesa em jejum antes de comer/beber algo.</span>
        </div>
      )}
      {showTrainingReminder && (
        <div className="reminder-banner">
          <Dumbbell size={14} />
          <span>Já passou do meio-dia e o treino de {dayType} de hoje ainda não foi registrado.</span>
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

      <div className="hero-card" style={{ borderColor: getDayColor(dayType) }}>
        <div className="hero-head-row">
          <div className="hero-eyebrow" style={{ color: getDayColor(dayType) }}>
            {dietCat === "Treino" ? "Dia de treino" : "Dia de descanso"}
          </div>
          <button className="hero-switch-btn" onClick={() => setSwitching((s) => !s)}>
            <Repeat size={12} /> Trocar
          </button>
        </div>
        <div className="hero-title">{dayType}</div>
        {dayEntry.dayTypeOverride && !switching && (
          <div className="hero-override-note">
            Trocado de {scheduledType} pra hoje ·{" "}
            <button className="link-btn" onClick={() => updateDay({ dayTypeOverride: null })}>
              reverter
            </button>
          </div>
        )}
        {switching && (
          <div className="day-switch-row">
            {dayOptions.map((dt) => (
              <button
                key={dt}
                className={"day-switch-chip" + (dt === dayType ? " active" : "")}
                style={
                  dt === dayType
                    ? { borderColor: getDayColor(dt), background: getDayColor(dt), color: "#1E1A16" }
                    : { borderColor: getDayColor(dt), color: getDayColor(dt) }
                }
                onClick={() => {
                  updateDay({ dayTypeOverride: dt === scheduledType ? null : dt });
                  setSwitching(false);
                }}
              >
                {dt}
              </button>
            ))}
          </div>
        )}
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
        <BodyweightQuickLog
          dayEntry={dayEntry}
          updateDay={updateDay}
          startWeight={settings.startWeight}
          selectedDate={selectedDate}
          ready={ready}
          inputRef={bwInputRef}
        />
        <div className="hint">Sempre em jejum, ao acordar, antes de comer/beber — mantém o padrão pra comparação real.</div>
      </div>

      <div className="card">
        <div className="card-head">Medidas corporais</div>
        <MeasurementsForm dayEntry={dayEntry} updateDay={updateDay} selectedDate={selectedDate} ready={ready} />
      </div>

      <div className="card">
        <div className="card-head">Sono</div>
        <SleepField dayEntry={dayEntry} updateDay={updateDay} selectedDate={selectedDate} ready={ready} />
      </div>

      <div className="card">
        <div className="card-head">Hidratação</div>
        <WaterCounter dayEntry={dayEntry} updateDay={updateDay} target={waterTargetCups} />
        {autoWaterCups != null && (
          <div className="hint" style={{ marginTop: 6, marginBottom: 0 }}>
            Meta automática pro seu peso ({latestWeight}kg{training ? ", dia de treino" : ""})
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-head">Cafeína</div>
        <CaffeineCounter dayEntry={dayEntry} updateDay={updateDay} doseMg={settings.caffeineDoseMg} />
      </div>

      <div className="card">
        <div className="card-head">Cardio</div>
        <CardioLogCard dayEntry={dayEntry} updateDay={updateDay} weightKg={latestWeight} />
      </div>

      <div className="card">
        <div className="card-head">Suplementos</div>
        <SupplementChecklist
          dayEntry={dayEntry}
          updateDay={updateDay}
          list={settings.supplementList}
          stock={settings.supplementStock}
          onStockChange={setSupplementStock}
        />
      </div>

      <div className="card">
        <div className="card-head">Foto do dia</div>
        <PhotoDayCard dayEntry={dayEntry} updateDay={updateDay} showUndo={showUndo} />
      </div>

      <div className="card">
        <div className="card-head">Notas do dia</div>
        <DayNoteField dayEntry={dayEntry} updateDay={updateDay} selectedDate={selectedDate} ready={ready} />
      </div>
    </div>
  );
}

const MEASUREMENT_FIELDS = [
  { key: "waist", label: "Cintura" },
  { key: "neck", label: "Pescoço" },
  { key: "arm", label: "Braço" },
  { key: "chest", label: "Peito" },
  { key: "thigh", label: "Coxa" },
];

function SleepField({ dayEntry, updateDay, selectedDate, ready }) {
  const [val, setVal] = useState(dayEntry.sleepHours ?? "");
  useEffect(() => {
    setVal(dayEntry.sleepHours ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, ready]);
  return (
    <div className="bw-row">
      <input
        className="input mono"
        type="text"
        inputMode="decimal"
        placeholder="ex: 7.5"
        value={val}
        onChange={(e) => {
          const v = sanitizeDecimal(e.target.value);
          setVal(v);
          updateDay({ sleepHours: v === "" ? null : parseFloat(v) });
        }}
      />
      <span className="muted">horas dormidas</span>
    </div>
  );
}

function MeasurementsForm({ dayEntry, updateDay, selectedDate, ready }) {
  const [open, setOpen] = useState(!!dayEntry.measurements);
  const [vals, setVals] = useState(() => dayEntry.measurements || {});

  useEffect(() => {
    setVals(dayEntry.measurements || {});
    setOpen(!!dayEntry.measurements);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, ready]);

  function setField(key, raw) {
    const v = sanitizeDecimal(raw);
    const next = { ...vals, [key]: v };
    setVals(next);
    const cleaned = {};
    Object.entries(next).forEach(([k, val]) => {
      if (val !== "") cleaned[k] = parseFloat(val);
    });
    updateDay({ measurements: Object.keys(cleaned).length ? cleaned : null });
  }

  if (!open) {
    return (
      <button className="btn-secondary" onClick={() => setOpen(true)}>
        <Plus size={15} /> Adicionar medidas hoje
      </button>
    );
  }

  return (
    <div className="macro-inputs" style={{ gridTemplateColumns: "1fr 1fr", margin: 0 }}>
      {MEASUREMENT_FIELDS.map((f) => (
        <div className="schedule-row" key={f.key}>
          <span>{f.label}</span>
          <input
            className="input mono settings-input"
            type="text"
            inputMode="decimal"
            placeholder="cm"
            value={vals[f.key] ?? ""}
            onChange={(e) => setField(f.key, e.target.value)}
          />
        </div>
      ))}
    </div>
  );
}

function WaterCounter({ dayEntry, updateDay, target }) {
  const cups = dayEntry.water || 0;
  const ml = cups * 250;
  const targetMl = (target || 8) * 250;
  const pct = targetMl > 0 ? Math.min(100, (ml / targetMl) * 100) : 0;
  return (
    <>
      <div className="water-row">
        <button
          className="water-btn"
          onClick={() => updateDay({ water: Math.max(0, cups - 1) })}
          disabled={cups === 0}
          aria-label="Remover um copo"
        >
          <Minus size={16} />
        </button>
        <div className="water-count">
          <Droplet size={16} />
          <span className="mono">
            {cups} <span className="muted">/ {target || 8} copos</span>
          </span>
        </div>
        <button className="water-btn" onClick={() => updateDay({ water: cups + 1 })} aria-label="Adicionar um copo">
          <Plus size={16} />
        </button>
      </div>
      <div className="bar-track" style={{ marginTop: 10 }}>
        <div className="bar-fill" style={{ width: pct + "%", background: "var(--upper)" }} />
      </div>
      <div className="hint" style={{ marginTop: 6, marginBottom: 0 }}>
        {ml}ml de {targetMl}ml (copo de 250ml)
      </div>
    </>
  );
}

// Doses de cafeína no dia — mesmo padrão do contador de água, mas sem meta
// (o objetivo aqui é ter noção do total, não bater um alvo). Acima de 400mg
// (~5 doses de 80mg) mostra um aviso suave, que é o teto geralmente citado
// como seguro pra adulto saudável.
function CaffeineCounter({ dayEntry, updateDay, doseMg }) {
  const doses = dayEntry.caffeine || 0;
  const mg = doses * (doseMg || 80);
  const over = mg > 400;
  return (
    <>
      <div className="water-row">
        <button
          className="water-btn"
          onClick={() => updateDay({ caffeine: Math.max(0, doses - 1) })}
          disabled={doses === 0}
          aria-label="Remover uma dose"
        >
          <Minus size={16} />
        </button>
        <div className="water-count">
          <Coffee size={16} />
          <span className="mono">
            {doses} <span className="muted">dose{doses === 1 ? "" : "s"} (~{mg}mg)</span>
          </span>
        </div>
        <button className="water-btn" onClick={() => updateDay({ caffeine: doses + 1 })} aria-label="Adicionar uma dose">
          <Plus size={16} />
        </button>
      </div>
      {over && (
        <div className="hint" style={{ marginTop: 6, marginBottom: 0, color: "var(--warn, #d98c3f)" }}>
          Passou de 400mg hoje — teto geralmente citado como seguro pra um adulto saudável.
        </div>
      )}
    </>
  );
}

function CardioLogCard({ dayEntry, updateDay, weightKg }) {
  const entries = dayEntry.cardio || [];
  const [type, setType] = useState(CARDIO_TYPES[0].key);
  const [minutes, setMinutes] = useState("");
  const [distance, setDistance] = useState("");

  function addEntry() {
    const min = parseFloat(minutes);
    if (!min || min <= 0) return;
    const kcalBurned = estimateCardioKcal(type, min, weightKg);
    const entry = { type, minutes: min, distance: distance ? parseFloat(distance) : null, kcal: kcalBurned };
    updateDay({ cardio: [...entries, entry] });
    setMinutes("");
    setDistance("");
  }
  function removeEntry(idx) {
    updateDay({ cardio: entries.filter((_, i) => i !== idx) });
  }
  const totalKcal = entries.reduce((s, e) => s + e.kcal, 0);

  return (
    <>
      {entries.map((e, i) => {
        const typeLabel = CARDIO_TYPES.find((t) => t.key === e.type)?.label || e.type;
        return (
          <div className="meal-row" key={i}>
            <div>
              <div className="meal-name">
                {typeLabel} — {e.minutes}min{e.distance ? ` · ${e.distance}km` : ""}
              </div>
              <div className="muted mono meal-macros">~{e.kcal} kcal</div>
            </div>
            <button className="icon-btn" onClick={() => removeEntry(i)} aria-label="Remover">
              <X size={16} />
            </button>
          </div>
        );
      })}
      {entries.length > 0 && (
        <div className="hint mono" style={{ marginTop: entries.length ? 0 : undefined }}>
          Total: ~{totalKcal} kcal queimadas em cardio hoje
        </div>
      )}
      <div className="macro-inputs" style={{ gridTemplateColumns: "1.3fr 1fr 1fr", margin: "10px 0 0" }}>
        <select className="select" value={type} onChange={(e) => setType(e.target.value)}>
          {CARDIO_TYPES.map((t) => (
            <option key={t.key} value={t.key}>
              {t.label}
            </option>
          ))}
        </select>
        <input
          className="input mono"
          type="text"
          inputMode="numeric"
          placeholder="min"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ""))}
        />
        <input
          className="input mono"
          type="text"
          inputMode="decimal"
          placeholder="km (opc.)"
          value={distance}
          onChange={(e) => setDistance(sanitizeDecimal(e.target.value))}
        />
      </div>
      <button className="btn-secondary" onClick={addEntry} disabled={!minutes} style={{ marginTop: 8 }}>
        <Plus size={15} /> Registrar cardio
      </button>
    </>
  );
}

function SupplementChecklist({ dayEntry, updateDay, list, stock, onStockChange }) {
  const taken = dayEntry.supplements || {};
  function toggle(name) {
    const wasTaken = !!taken[name];
    updateDay({ supplements: { ...taken, [name]: !wasTaken } });
    if (onStockChange && stock?.[name] != null) {
      onStockChange(name, wasTaken ? stock[name] + 1 : Math.max(0, stock[name] - 1));
    }
  }
  if (!list || list.length === 0) {
    return <p className="muted">Nenhum suplemento cadastrado — adicione em Configurações.</p>;
  }
  const lowStock = list.filter((name) => stock?.[name] != null && stock[name] <= 5);
  return (
    <>
      <div className="supplement-list">
        {list.map((name) => (
          <button
            key={name}
            type="button"
            className={"supplement-chip" + (taken[name] ? " active" : "")}
            onClick={() => toggle(name)}
          >
            <Pill size={13} /> {name}
            {stock?.[name] != null && <span className="muted mono" style={{ marginLeft: 5 }}>({stock[name]})</span>}
          </button>
        ))}
      </div>
      {lowStock.length > 0 && (
        <div className="hint" style={{ marginTop: 6, marginBottom: 0, color: "var(--warn, #d98c3f)" }}>
          Acabando: {lowStock.map((n) => `${n} (${stock[n]} dose${stock[n] === 1 ? "" : "s"})`).join(", ")} — hora de repor.
        </div>
      )}
    </>
  );
}

function PhotoDayCard({ dayEntry, updateDay, showUndo }) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await compressImageFile(file);
      updateDay({ photo: dataUrl });
    } catch (err) {
      console.error("photo compress failed", err);
    } finally {
      setBusy(false);
    }
  }

  if (dayEntry.photo) {
    return (
      <>
        <img src={dayEntry.photo} alt="Foto do dia" className="progress-photo" />
        <button
          className="btn-secondary"
          onClick={() => {
            const removed = dayEntry.photo;
            updateDay({ photo: null });
            showUndo?.("Foto removida", () => updateDay({ photo: removed }));
          }}
        >
          <Trash2 size={15} /> Remover foto
        </button>
      </>
    );
  }

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" hidden onChange={handleFile} />
      <button className="btn-secondary" onClick={() => inputRef.current?.click()} disabled={busy}>
        <Camera size={15} /> {busy ? "Comprimindo…" : "Adicionar foto"}
      </button>
      <div className="hint">A foto é comprimida automaticamente antes de salvar (ocupa mais espaço que o resto dos dados).</div>
    </>
  );
}

function DayNoteField({ dayEntry, updateDay, selectedDate, ready }) {
  const [note, setNote] = useState(dayEntry.note ?? "");
  // Resincroniza quando o dia muda OU quando os dados terminam de carregar do
  // storage (o storage é lido de forma assíncrona, então no primeiro render
  // esse campo nasce vazio mesmo se já existir uma nota salva pra hoje — sem
  // o `ready` na lista de dependências, o campo ficava com essa aparência de
  // "vazio" até o usuário trocar de dia e voltar).
  useEffect(() => {
    setNote(dayEntry.note ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, ready]);

  return (
    <textarea
      className="input note-textarea"
      placeholder="Como foi o dia? (ex: dormi mal, treino fraco hoje, sem fome...)"
      value={note}
      onChange={(e) => {
        setNote(e.target.value);
        updateDay({ note: e.target.value });
      }}
    />
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

function BodyweightQuickLog({ dayEntry, updateDay, startWeight, selectedDate, ready, inputRef }) {
  const [val, setVal] = useState(dayEntry.bodyweight ?? "");
  // Recarrega o campo quando o DIA muda ou quando os dados terminam de
  // carregar do storage (`ready`) — não fica de olho em dayEntry.bodyweight
  // direto, senão cada tecla digitada reescreveria o valor já arredondado
  // (parseFloat) de volta no campo e apagaria o "." de quem está no meio de
  // digitar "82.5". Sem o `ready`, o campo nascia vazio no primeiro render
  // (storage ainda carregando) e nunca mais sincronizava sozinho.
  useEffect(() => {
    setVal(dayEntry.bodyweight ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, ready]);
  return (
    <div className="bw-row">
      <input
        ref={inputRef}
        className="input mono"
        type="text"
        inputMode="decimal"
        placeholder={String(startWeight)}
        value={val}
        onChange={(e) => {
          const v = sanitizeDecimal(e.target.value);
          setVal(v);
          updateDay({ bodyweight: v === "" ? null : parseFloat(v) });
        }}
      />
      <span className="muted">kg</span>
    </div>
  );
}

// ---------------- Treino ----------------
function TreinoTab({ dayType, dayEntry, updateDay, exerciseHistory, selectedDate, settings, setSettings, onSaveNow, ready }) {
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved
  const [shareMsg, setShareMsg] = useState("");
  const [wakeLockOn, setWakeLockOn] = useState(false);
  const wakeLockSupported = useWakeLock(wakeLockOn && isTrainingDay(dayType));
  async function handleSaveNow() {
    setSaveState("saving");
    try {
      await onSaveNow();
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 1800);
    } catch (e) {
      console.error("manual save failed", e);
      setSaveState("idle");
    }
  }

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
  const planExercises = getPlanExercises(dayType, settings);
  const order = settings.exerciseOrder[dayType] || planExercises.map((e) => e.id);
  // garante que ids novos (ou fora de ordem salva) apareçam também
  const fullOrder = [...order, ...planExercises.map((e) => e.id).filter((id) => !order.includes(id))];
  const orderedExercises = fullOrder.map((id) => planExercises.find((e) => e.id === id)).filter(Boolean);

  const logged = dayEntry.exercises || {};

  function effectiveName(ex) {
    return settings.exerciseSubstitutions[ex.id] || ex.n;
  }

  // Carimba início/última atividade do treino de hoje — só usado pra mostrar
  // "durou ~Xmin" (do primeiro ao último registro), não é um cronômetro rodando.
  function stampWorkoutActivity(patch) {
    const now = Date.now();
    updateDay({
      ...patch,
      workoutStartedAt: dayEntry.workoutStartedAt || now,
      workoutLastActivityAt: now,
    });
  }

  function setExerciseSets(key, sets) {
    stampWorkoutActivity({ exercises: { ...logged, [key]: { ...(logged[key] || {}), sets } } });
  }

  function setExerciseMeta(key, patch) {
    stampWorkoutActivity({ exercises: { ...logged, [key]: { ...(logged[key] || {}), ...patch } } });
  }

  function toggleSupersetLink(id) {
    setSettings((prev) => ({
      ...prev,
      supersetLinks: { ...prev.supersetLinks, [id]: !prev.supersetLinks[id] },
    }));
  }

  const workoutMinutes =
    dayEntry.workoutStartedAt && dayEntry.workoutLastActivityAt && dayEntry.workoutLastActivityAt > dayEntry.workoutStartedAt
      ? Math.round((dayEntry.workoutLastActivityAt - dayEntry.workoutStartedAt) / 60000)
      : null;

  // Resuminho em texto pra colar no WhatsApp/grupo — só os exercícios que já
  // têm alguma série preenchida hoje.
  async function shareWorkoutText() {
    const lines = [`${dayType} · ${fmtDateLabel(selectedDate)}`, ""];
    Object.entries(logged).forEach(([name, ex]) => {
      if (!ex?.sets?.length) return;
      lines.push(`${name}: ${ex.sets.map((s) => `${s.weight || "—"}×${s.reps || "—"}`).join(", ")}`);
    });
    if (dayEntry.bodyweight != null) lines.push("", `Peso: ${dayEntry.bodyweight}kg`);
    const text = lines.join("\n");
    if (navigator.share) {
      try {
        await navigator.share({ text, title: "Cutting Log" });
      } catch (e) {
        // usuário cancelou — não é erro
      }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      setShareMsg("Copiado!");
      setTimeout(() => setShareMsg(""), 2000);
    }
  }

  function setVariation(id, variation) {
    setSettings((prev) => ({
      ...prev,
      exerciseVariations: { ...prev.exerciseVariations, [id]: variation },
    }));
  }

  function setGrip(id, grip) {
    setSettings((prev) => ({
      ...prev,
      exerciseGrips: { ...prev.exerciseGrips, [id]: grip },
    }));
  }

  function setSubstitution(id, name, fromName) {
    setSettings((prev) => {
      const entry =
        fromName && fromName !== name
          ? [{ id: Date.now().toString(36), exerciseId: id, from: fromName, to: name, date: todayISO() }]
          : [];
      return {
        ...prev,
        exerciseSubstitutions: { ...prev.exerciseSubstitutions, [id]: name },
        substitutionHistory: [...(prev.substitutionHistory || []), ...entry].slice(-100),
      };
    });
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
      <div className="section-title" style={{ color: getDayColor(dayType) }}>
        {dayType} · {fmtDateLabel(selectedDate)}
      </div>
      {workoutMinutes != null && (
        <div className="workout-duration muted mono">
          <Clock size={12} /> ~{workoutMinutes}min de treino (do 1º ao último registro)
        </div>
      )}
      <div className="treino-toolbar">
        {wakeLockSupported && (
          <button
            type="button"
            className={"treino-toolbar-btn" + (wakeLockOn ? " active" : "")}
            onClick={() => setWakeLockOn((s) => !s)}
          >
            {wakeLockOn ? "🔆" : "🔅"} Tela acesa
          </button>
        )}
        <button type="button" className="treino-toolbar-btn" onClick={shareWorkoutText}>
          <Share2 size={13} /> {shareMsg || "Compartilhar treino"}
        </button>
      </div>
      <div className="rir-felt-row">
        <span className="muted mono rir-felt-label">
          <Gauge size={12} style={{ verticalAlign: "-2px" }} /> RPE da sessão:
        </span>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <button
            key={n}
            type="button"
            className={"rir-felt-chip" + (dayEntry.sessionRPE === n ? " active" : "")}
            onClick={() => updateDay({ sessionRPE: dayEntry.sessionRPE === n ? null : n })}
          >
            {n}
          </button>
        ))}
      </div>
      {orderedExercises.map((ex, i) => {
        const key = effectiveName(ex);
        const entry = logged[key] || {};
        return (
          <ExerciseCard
            key={ex.id}
            plan={ex}
            effectiveName={key}
            plateIncrement={settings.plateIncrement || 2.5}
            selectedDate={selectedDate}
            ready={ready}
            logged={entry.sets}
            history={exerciseHistory(key)}
            getHistory={exerciseHistory}
            onChange={(sets) => setExerciseSets(key, sets)}
            variation={settings.exerciseVariations[ex.id] || ex.variations[0]}
            onVariationChange={(v) => setVariation(ex.id, v)}
            grip={settings.exerciseGrips[ex.id] || ex.grips?.[0]}
            onGripChange={(g) => setGrip(ex.id, g)}
            substitution={settings.exerciseSubstitutions[ex.id] || ex.n}
            onSubstitutionChange={(v) => setSubstitution(ex.id, v, key)}
            onMoveUp={i > 0 ? () => moveExercise(ex.id, -1) : null}
            onMoveDown={i < orderedExercises.length - 1 ? () => moveExercise(ex.id, 1) : null}
            rirFelt={entry.rirFelt || null}
            onRirChange={(r) => setExerciseMeta(key, { rirFelt: r })}
            painNote={entry.painNote || ""}
            onPainChange={(t) => setExerciseMeta(key, { painNote: t })}
            isLinkedToNext={!!settings.supersetLinks[ex.id]}
            onToggleLinkNext={() => toggleSupersetLink(ex.id)}
            isLinkedFromPrev={i > 0 && !!settings.supersetLinks[orderedExercises[i - 1].id]}
          />
        );
      })}
      <button
        className={"btn-primary" + (saveState === "saved" ? " btn-saved" : "")}
        onClick={handleSaveNow}
        disabled={saveState === "saving"}
      >
        {saveState === "saved" ? (
          <>
            <Check size={16} /> Salvo
          </>
        ) : saveState === "saving" ? (
          "Salvando…"
        ) : (
          <>
            <Check size={16} /> Salvar agora
          </>
        )}
      </button>
    </div>
  );
}

function ExerciseCard({
  plan,
  effectiveName,
  plateIncrement = 2.5,
  selectedDate,
  ready,
  logged,
  history,
  getHistory,
  onChange,
  variation,
  onVariationChange,
  grip,
  onGripChange,
  substitution,
  onSubstitutionChange,
  onMoveUp,
  onMoveDown,
  rirFelt,
  onRirChange,
  painNote,
  onPainChange,
  isLinkedToNext,
  onToggleLinkNext,
  isLinkedFromPrev,
}) {
  const [showWarmup, setShowWarmup] = useState(false);
  const [showPainInput, setShowPainInput] = useState(!!painNote);
  const [showTip, setShowTip] = useState(false);
  const tip = EXERCISE_TIPS[plan.id];
  const top = topRep(plan.reps);
  // Completa com séries vazias até bater o número planejado — tanto pra quem
  // nunca registrou nada quanto pra dado antigo já salvo com menos séries do
  // que devia (ex: sobra de quando esse componente ainda tinha o bug de
  // truncar séries vazias).
  function fillSets(arr) {
    const base = (arr || []).slice(0, plan.sets);
    while (base.length < plan.sets) base.push({ weight: "", reps: "" });
    return base;
  }
  const [sets, setSets] = useState(() => fillSets(logged));
  const [restLeft, setRestLeft] = useState(null); // segundos restantes do timer de descanso, ou null se parado
  const [lastRest, setLastRest] = useState(null); // {planned, actual} do último descanso concluído/cancelado
  const restStartRef = useRef(null);

  // Re-sincroniza só quando o dia ou o exercício mudam de verdade — não a cada
  // tecla. Ao salvar, as séries vazias são filtradas antes de ir pro storage
  // (pra não guardar lixo), mas esse array "enxuto" não pode voltar e resetar
  // as séries que o usuário ainda está preenchendo na tela.
  useEffect(() => {
    setSets(fillSets(logged));
    setRestLeft(null);
    setLastRest(null);
    restStartRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, effectiveName, plan.sets, ready]);

  function finishRestTracking() {
    if (!restStartRef.current) return;
    const actual = Math.round((Date.now() - restStartRef.current.start) / 1000);
    setLastRest({ planned: restStartRef.current.planned, actual });
    restStartRef.current = null;
  }
  function startRest(seconds) {
    restStartRef.current = { start: Date.now(), planned: seconds };
    setRestLeft(seconds);
  }
  function cancelRest() {
    finishRestTracking();
    setRestLeft(null);
  }

  // Timer de descanso — decrementa 1x por segundo; ao chegar em zero, vibra e
  // bipa, mostra "0:00" por 1.5s e some sozinho.
  useEffect(() => {
    if (restLeft == null) return;
    if (restLeft === 0) {
      playTimerBeep();
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      finishRestTracking();
      const t = setTimeout(() => setRestLeft(null), 1500);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setRestLeft((s) => (s != null ? s - 1 : null)), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restLeft]);

  function commit(next) {
    setSets(next);
    onChange(next.filter((s) => s.weight !== "" || s.reps !== ""));
  }

  // Registrar série por voz — "60 por 8" ou "60 e 8" viram peso=60, reps=8.
  // Só extrai os dois primeiros números da fala; não entende números por
  // extenso ("sessenta"), só dígitos falados como número.
  const [listening, setListening] = useState(false);
  const speechSupported = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
  function startVoiceInput() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.lang = "pt-BR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    setListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const numbers = transcript.match(/\d+([.,]\d+)?/g);
      if (numbers && numbers.length >= 2) {
        const weight = numbers[0].replace(",", ".");
        const reps = numbers[1].replace(",", ".");
        const idx = sets.findIndex((s) => s.weight === "" && s.reps === "");
        const targetIdx = idx === -1 ? sets.length - 1 : idx;
        const next = sets.slice();
        next[targetIdx] = { weight, reps };
        commit(next);
      }
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognition.start();
  }

  function hitTop(entry) {
    if (!entry || !entry.sets || entry.sets.length < plan.sets) return false;
    return entry.sets.every((s) => parseInt(s.reps, 10) >= top);
  }

  // "history" inclui o dia selecionado assim que ele tem alguma série
  // preenchida — sem filtrar, "última sessão" e o PR ficariam comparando o
  // que você está digitando agora com ele mesmo.
  const pastHistory = history.filter((h) => h.date !== selectedDate);
  const last = pastHistory[pastHistory.length - 1];
  const prev = pastHistory[pastHistory.length - 2];
  const lastTwoHitTop = hitTop(last) && hitTop(prev);
  const isSubstituted = substitution !== plan.n;

  // Carga equivalente ao trocar de variação: sem histórico na variação atual,
  // olha o exercício "irmão" (o original ou outro equivalente) usado mais
  // recentemente e sugere partir da mesma carga em vez de começar do zero.
  const equivalentHint = useMemo(() => {
    if (last || !getHistory) return null;
    const siblingNames = [plan.n, ...(plan.equivalents || [])].filter((n) => n !== substitution);
    let best = null;
    siblingNames.forEach((name) => {
      const h = getHistory(name).filter((entry) => entry.date !== selectedDate);
      const entry = h[h.length - 1];
      if (!entry) return;
      if (!best || entry.date > best.date) best = { ...entry, name };
    });
    if (!best) return null;
    const top = best.sets.reduce((b, s) => {
      const w = parseFloat(s.weight) || 0;
      const r = parseInt(s.reps, 10) || 0;
      if (w === 0) return b;
      if (!b || w > b.w) return { w, r };
      return b;
    }, null);
    return top ? { name: best.name, w: top.w, r: top.r } : null;
  }, [last, getHistory, plan.n, plan.equivalents, substitution, selectedDate]);

  // Assimetria: só faz sentido em exercício unilateral com o lado marcado nas
  // séries — compara a carga média de cada lado nas últimas 5 sessões (mais a
  // de hoje, se já tiver lado marcado) e avisa quando a diferença passa de 15%.
  // Sugestão de descanso pelo RIR sentido (não pelo alvo do plano): chegou
  // perto da falha (RIR baixo) pede mais recuperação; sobrou muito (RIR alto)
  // não precisa descansar tanto. É calculado sobre o RIR marcado na última
  // vez que o exercício foi avaliado, não por série individual.
  const suggestedRestSec = rirFelt ? RIR_REST_SUGGESTION[rirFelt] : null;
  const unilateral = isUnilateralName(effectiveName);
  const asymmetryNote = useMemo(() => {
    if (!unilateral) return null;
    const recent = [...pastHistory.slice(-5), { date: selectedDate, sets }];
    const bySide = { E: [], D: [] };
    recent.forEach((entry) => {
      (entry.sets || []).forEach((s) => {
        const w = parseFloat(s.weight) || 0;
        if (w > 0 && (s.side === "E" || s.side === "D")) bySide[s.side].push(w);
      });
    });
    if (bySide.E.length < 2 || bySide.D.length < 2) return null;
    const avgE = bySide.E.reduce((a, b) => a + b, 0) / bySide.E.length;
    const avgD = bySide.D.reduce((a, b) => a + b, 0) / bySide.D.length;
    const diffPct = (Math.abs(avgE - avgD) / Math.max(avgE, avgD)) * 100;
    if (diffPct < 15) return null;
    const weaker = avgE < avgD ? "E" : "D";
    return `Lado ${weaker} em média ${diffPct.toFixed(0)}% mais fraco (${avgE.toFixed(1)}kg vs ${avgD.toFixed(1)}kg) nas últimas sessões.`;
  }, [unilateral, pastHistory, selectedDate, sets]);

  // Preenche só as séries ainda vazias com o peso/reps da última sessão —
  // nunca sobrescreve o que você já digitou hoje.
  function repeatLastSession() {
    if (!last) return;
    const next = sets.map((s, i) => {
      if (s.weight !== "" || s.reps !== "") return s;
      const prevSet = last.sets[i];
      return prevSet ? { weight: prevSet.weight, reps: prevSet.reps } : s;
    });
    commit(next);
  }

  // Série "top" de uma sessão = maior peso (desempate por reps) — usada pra
  // detectar estagnação: 3 sessões seguidas sem subir nem carga nem reps.
  function topSet(entry) {
    if (!entry?.sets?.length) return null;
    return entry.sets.reduce((best, s) => {
      const w = parseFloat(s.weight) || 0;
      const r = parseInt(s.reps, 10) || 0;
      if (w === 0) return best;
      if (!best || w > best.w || (w === best.w && r > best.r)) return { w, r };
      return best;
    }, null);
  }
  const last3Tops = pastHistory.slice(-3).map(topSet);
  const isStagnant =
    last3Tops.length === 3 &&
    last3Tops.every((t) => t && t.w > 0) &&
    last3Tops[0].w === last3Tops[1].w &&
    last3Tops[1].w === last3Tops[2].w &&
    last3Tops[2].r <= last3Tops[0].r &&
    last3Tops[2].r <= last3Tops[1].r;

  let suggestion = null;
  if (isStagnant) {
    suggestion = {
      text: `Estagnado há 3 sessões em ${last3Tops[2].w}kg × ${last3Tops[2].r} — considera uma semana de deload (~40-50% da carga) antes de tentar progredir de novo`,
      tone: "deload",
    };
  } else if (last) {
    if (lastTwoHitTop) {
      // Progressão dupla: já bateu o topo das reps 2x seguidas, então sugere
      // subir a carga (~2,5%, arredondado pro incremento de anilha mais
      // próximo) e voltar pro início da faixa de reps.
      const lastTop = topSet(last);
      const bottomRep = parseInt(plan.reps.split("-")[0], 10) || top;
      let nextWeight = lastTop && lastTop.w > 0 ? Math.ceil((lastTop.w * 1.025) / plateIncrement) * plateIncrement : null;
      if (nextWeight != null && nextWeight <= lastTop.w) nextWeight = lastTop.w + plateIncrement;
      suggestion = nextWeight
        ? { text: `Hoje tenta ${nextWeight}kg × ${bottomRep} — bateu ${top} reps em todas as séries 2x seguidas`, tone: "up" }
        : { text: `Suba a carga (+2,5–5%) — bateu ${top} reps em todas as séries 2x seguidas`, tone: "up" };
    } else {
      suggestion = { text: `Meta: adicionar 1 rep mantendo RIR ${plan.rir}`, tone: "hold" };
    }
  }

  // PR de carga: maior peso já registrado numa sessão passada desse exercício.
  const maxPastWeight = Math.max(0, ...pastHistory.flatMap((h) => h.sets.map((s) => parseFloat(s.weight) || 0)));
  const currentMaxWeight = Math.max(0, ...sets.map((s) => parseFloat(s.weight) || 0));
  const isNewPR = maxPastWeight > 0 && currentMaxWeight > maxPastWeight;

  // 1RM estimado (Epley) a partir da série "top" de hoje — só aparece depois
  // que pelo menos uma série tem peso e reps preenchidos.
  const currentTopSet = topSet({ sets });
  const currentE1RM = currentTopSet ? Math.round(estimate1RMAvg(currentTopSet.w, currentTopSet.r)) : null;

  // Rampa de aquecimento baseada na carga de trabalho de hoje (ou, se ainda
  // não preencheu nada, na última sessão registrada).
  const workingWeight = currentTopSet?.w || topSet(last)?.w || null;
  const warmupSteps = computeWarmup(workingWeight, plateIncrement);

  return (
    <div className={"card exercise-card" + (isLinkedFromPrev ? " ex-linked-prev" : "")}>
      {isLinkedFromPrev && (
        <div className="superset-connector mono">
          <Link2 size={11} /> continuação do superset — sem descanso antes desse
        </div>
      )}
      <div className="ex-order-controls">
        <button className="order-btn" onClick={onMoveUp} disabled={!onMoveUp} aria-label="Mover pra cima">
          <ChevronUp size={17} />
        </button>
        <button className="order-btn" onClick={onMoveDown} disabled={!onMoveDown} aria-label="Mover pra baixo">
          <ChevronDown size={17} />
        </button>
      </div>
      <div className="ex-head">
        <div className="ex-info">
          <div className="ex-name-row">
            <Repeat size={11} className="swap-icon" />
            <select
              className="ex-name-select"
              value={substitution}
              onChange={(e) => onSubstitutionChange(e.target.value)}
            >
              <option value={plan.n}>{plan.n}</option>
              {(plan.equivalents || []).map((eq) => (
                <option key={eq} value={eq}>
                  {eq}
                </option>
              ))}
            </select>
            {!isSubstituted && plan.variations?.length > 0 && (
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
            {!isSubstituted && plan.grips && (
              <select className="variation-chip grip-chip" value={grip} onChange={(e) => onGripChange(e.target.value)}>
                {plan.grips.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="ex-meta mono">
            {plan.sets}× {plan.reps} reps{plan.rir ? ` · RIR ${plan.rir}` : ""}
            {isSubstituted && <span className="sub-note"> · substituindo {plan.n}</span>}
            {tip && (
              <button type="button" className="tip-toggle" onClick={() => setShowTip((s) => !s)} aria-label="Dica técnica">
                ?
              </button>
            )}
          </div>
          {tip && showTip && <div className="tip-text">{tip}</div>}
          {currentE1RM > 0 && (
            <div className="e1rm-note mono muted">1RM estimado: ~{currentE1RM}kg (méd. Epley/Brzycki/Lombardi)</div>
          )}
          {!last && equivalentHint && (
            <div className="e1rm-note mono muted">
              Sem histórico nessa variação — última vez em {equivalentHint.name}: ~{equivalentHint.w}kg × {equivalentHint.r}
            </div>
          )}
          <button
            type="button"
            className={"superset-toggle" + (isLinkedToNext ? " active" : "")}
            onClick={onToggleLinkNext}
          >
            <Link2 size={11} /> {isLinkedToNext ? "Superset com o próximo ✓" : "Ligar com o próximo (superset)"}
          </button>
        </div>
        {last && (
          <div className="ex-last-col">
            <div className="ex-last-badge mono">
              <span className="muted-sm">últ.</span>
              {last.sets.map((s) => `${s.weight || "—"}×${s.reps || "—"}`).join(" / ")}
            </div>
            <button className="repeat-last-btn" onClick={repeatLastSession}>
              <Repeat size={11} /> Repetir
            </button>
          </div>
        )}
      </div>

      {isNewPR ? (
        <div className="suggestion pr">
          <Trophy size={13} /> Novo recorde de carga! {currentMaxWeight}kg (antes: {maxPastWeight}kg)
        </div>
      ) : (
        suggestion && (
          <div className={"suggestion " + suggestion.tone}>
            {suggestion.tone === "deload" ? <TrendingDown size={13} /> : <Flame size={13} />} {suggestion.text}
          </div>
        )
      )}

      {warmupSteps.length > 0 && (
        <div className="warmup-block">
          <button type="button" className="warmup-toggle" onClick={() => setShowWarmup((s) => !s)}>
            <Flame size={12} /> Aquecimento sugerido {showWarmup ? "▲" : "▼"}
          </button>
          {showWarmup && (
            <div className="warmup-steps mono">
              {warmupSteps.map((s) => (
                <span key={s.pct}>
                  {s.pct}%: {s.weight}kg×{s.reps}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="set-grid">
        <div className="set-grid-head muted mono">
          <span>Série</span>
          <span>kg</span>
          <span>reps</span>
          {speechSupported && (
            <button
              type="button"
              className={"mic-btn" + (listening ? " listening" : "")}
              onClick={startVoiceInput}
              aria-label="Registrar série por voz"
              title='Fala "peso por reps", ex: "60 por 8"'
            >
              <Mic size={14} />
            </button>
          )}
        </div>
        {sets.map((s, i) => (
          <div className={"set-grid-row" + (unilateral ? " has-side" : "")} key={i}>
            <span className="mono muted">{i + 1}</span>
            <input
              className="input mono set-input"
              type="text"
              inputMode="decimal"
              value={s.weight}
              onChange={(e) => {
                const next = sets.slice();
                next[i] = { ...next[i], weight: sanitizeDecimal(e.target.value) };
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
            {unilateral && (
              <button
                type="button"
                className="side-btn"
                onClick={() => {
                  const order = [null, "E", "D"];
                  const next = sets.slice();
                  next[i] = { ...next[i], side: order[(order.indexOf(s.side || null) + 1) % order.length] };
                  commit(next);
                }}
                aria-label="Lado (esquerdo/direito)"
              >
                {s.side || "—"}
              </button>
            )}
          </div>
        ))}
      </div>
      {asymmetryNote && (
        <div className="hint mono" style={{ marginTop: 6, marginBottom: 0 }}>
          <AlertTriangle size={11} style={{ verticalAlign: "-1px" }} /> {asymmetryNote}
        </div>
      )}

      <div className="rest-timer-row">
        {restLeft == null ? (
          <>
            <span className="rest-timer-label muted">
              <Timer size={13} /> Descanso:
            </span>
            {[60, 90, 120].map((s) => (
              <button key={s} className="rest-timer-btn" onClick={() => startRest(s)}>
                {s}s
              </button>
            ))}
          </>
        ) : (
          <>
            <span className={"rest-timer-active mono" + (restLeft === 0 ? " rest-timer-done" : "")}>
              <Timer size={13} /> {Math.floor(restLeft / 60)}:{String(restLeft % 60).padStart(2, "0")}
            </span>
            <button className="rest-timer-cancel" onClick={cancelRest}>
              Cancelar
            </button>
          </>
        )}
      </div>
      {lastRest && (
        <div className="hint mono" style={{ marginTop: -6 }}>
          Descanso real: {lastRest.actual}s (previsto {lastRest.planned}s)
        </div>
      )}
      {restLeft == null && suggestedRestSec && (
        <div className="hint mono" style={{ marginTop: -6 }}>
          RIR sentido {rirFelt} → descanso sugerido: {suggestedRestSec}s
          {suggestedRestSec !== 60 && suggestedRestSec !== 90 && suggestedRestSec !== 120 && (
            <button type="button" className="link-btn" style={{ marginLeft: 6 }} onClick={() => startRest(suggestedRestSec)}>
              Usar
            </button>
          )}
        </div>
      )}

      <div className="rir-felt-row">
        <span className="muted mono rir-felt-label">RIR sentido:</span>
        {["0", "1", "2", "3+"].map((r) => (
          <button
            key={r}
            type="button"
            className={"rir-felt-chip" + (rirFelt === r ? " active" : "")}
            onClick={() => onRirChange(rirFelt === r ? null : r)}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="pain-row">
        <button
          type="button"
          className={"pain-toggle" + (painNote ? " active" : "")}
          onClick={() => setShowPainInput((s) => !s)}
        >
          <AlertTriangle size={12} /> {painNote ? "Dor/desconforto registrado" : "Senti dor/desconforto aqui"}
        </button>
        {showPainInput && (
          <input
            className="input pain-input"
            type="text"
            placeholder="Onde doeu? (ex: ombro direito na 3ª série)"
            value={painNote || ""}
            onChange={(e) => onPainChange(e.target.value)}
          />
        )}
      </div>
    </div>
  );
}

// ---------------- Dieta ----------------
function DietaTab({ dietCat, settings, setSettings, dayEntry, updateDay, logs, selectedDate, showUndo }) {
  const target = settings.macroTargets[dietCat];
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
  const cardioKcal = (dayEntry.cardio || []).reduce((s, e) => s + e.kcal, 0);
  // Alerta de concentração: proteína toda numa refeição só distribui pior a
  // síntese proteica ao longo do dia do que espalhada — só avisa com >=2
  // refeições e uma meta que já valha a pena avaliar (>=20g).
  const maxMealProtein = meals.length >= 2 ? Math.max(...meals.map((m) => m.protein)) : 0;
  const proteinConcentrated = target.protein >= 20 && maxMealProtein / target.protein > 0.6;
  const weeklyBank = useMemo(
    () => computeWeeklyCalorieBank(logs, settings, selectedDate),
    [logs, settings, selectedDate]
  );

  const [mode, setMode] = useState("food"); // "food" ou "manual"
  const [foodQuery, setFoodQuery] = useState("");
  const [grams, setGrams] = useState("");
  const [manualForm, setManualForm] = useState({ name: "", protein: "", carb: "", fat: "" });

  const matchedFood = FOOD_DB.find((f) => f.n === foodQuery);
  // Alimentos com unitG (ex: biscoito, pipoca em saco) são digitados em
  // unidades — a gramatura real usada no cálculo vem de qty * unitG.
  const isUnitFood = !!matchedFood?.unitG;
  const effectiveGrams = matchedFood ? (isUnitFood ? (parseFloat(grams) || 0) * matchedFood.unitG : parseFloat(grams) || 0) : 0;
  const previewMacros = matchedFood && grams ? computeFromFood(matchedFood, effectiveGrams) : null;

  function addFoodMeal() {
    if (!matchedFood || !grams || parseFloat(grams) <= 0) return;
    const m = computeFromFood(matchedFood, effectiveGrams);
    const qty = parseFloat(grams);
    const label = isUnitFood
      ? `${matchedFood.n} (${grams} ${matchedFood.unitLabel}${qty === 1 ? "" : "s"})`
      : `${matchedFood.n} (${grams}g)`;
    updateDay({ meals: [...meals, { name: label, ...m }] });
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
    const previousMeals = meals;
    updateDay({ meals: meals.filter((_, i) => i !== idx) });
    showUndo?.("Refeição removida", () => updateDay({ meals: previousMeals }));
  }

  function setMealTiming(idx, timing) {
    const next = meals.slice();
    next[idx] = { ...next[idx], timing: next[idx].timing === timing ? null : timing };
    updateDay({ meals: next });
  }

  // "Clonar refeições de ontem" — só aparece quando hoje ainda não tem
  // nenhuma refeição registrada, pra nunca sobrescrever o que já foi digitado.
  const yesterday = todayISO(new Date(new Date(selectedDate + "T12:00:00").getTime() - 86400000));
  const yesterdayMeals = logs?.[yesterday]?.meals || [];
  function cloneYesterdayMeals() {
    if (meals.length > 0 || yesterdayMeals.length === 0) return;
    updateDay({ meals: yesterdayMeals.map((m) => ({ ...m })) });
  }

  const favorites = settings.favoriteMeals || [];

  function saveFavorite(macros, suggestedName) {
    const name = window.prompt("Salvar como favorito com que nome?", suggestedName || "");
    if (!name || !name.trim()) return;
    const fav = {
      id: Date.now().toString(36),
      name: name.trim(),
      protein: macros.protein || 0,
      carb: macros.carb || 0,
      fat: macros.fat || 0,
    };
    setSettings((prev) => ({ ...prev, favoriteMeals: [...(prev.favoriteMeals || []), fav] }));
  }

  function addFavoriteAsMeal(fav) {
    updateDay({ meals: [...meals, { name: fav.name, protein: fav.protein, carb: fav.carb, fat: fav.fat }] });
  }

  function renameFavorite(id, newName) {
    setSettings((prev) => ({
      ...prev,
      favoriteMeals: (prev.favoriteMeals || []).map((f) => (f.id === id ? { ...f, name: newName } : f)),
    }));
  }

  function deleteFavorite(id) {
    setSettings((prev) => ({ ...prev, favoriteMeals: (prev.favoriteMeals || []).filter((f) => f.id !== id) }));
  }

  const suggestions = suggestFoodsForRemaining(remaining);
  function addSuggested(s) {
    updateDay({ meals: [...meals, { name: `${s.food.n} (${s.grams}g)`, ...s.macros }] });
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
        {cardioKcal > 0 && (
          <div className="hint mono" style={{ marginBottom: 0 }}>
            <Activity size={11} style={{ verticalAlign: "-1px" }} /> Líquido (comida − cardio): {kcal(got.protein, got.carb, got.fat) - cardioKcal} kcal
          </div>
        )}
        {proteinConcentrated && (
          <div className="hint" style={{ marginBottom: 0 }}>
            Mais de 60% da proteína do dia veio de uma refeição só — distribuir melhor ao longo do dia costuma
            aproveitar mais a síntese proteica.
          </div>
        )}
        {meals.length === 0 && yesterdayMeals.length > 0 && (
          <button className="btn-secondary" onClick={cloneYesterdayMeals}>
            <Repeat size={15} /> Clonar refeições de ontem
          </button>
        )}
      </div>

      {weeklyBank && (
        <div className="card">
          <div className="card-head">Banco calórico da semana</div>
          <div className="kcal-row">
            <span className="mono" style={{ color: weeklyBank.bank >= 0 ? "var(--push)" : "var(--legs)" }}>
              {weeklyBank.bank >= 0 ? "+" : ""}
              {weeklyBank.bank} kcal
            </span>
          </div>
          <p className="hint" style={{ marginBottom: 0 }}>
            {weeklyBank.bank >= 0
              ? `Sobrou déficit em ${weeklyBank.daysCounted} dia(s) registrado(s) essa semana — dá pra "gastar" isso num dia de folga.`
              : `Passou da meta em ${weeklyBank.daysCounted} dia(s) essa semana — considera compensar nos próximos.`}
          </p>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="card">
          <div className="card-head">
            <Lightbulb size={13} style={{ verticalAlign: "-2px", marginRight: 5 }} />
            Sugestão pra bater a meta
          </div>
          {suggestions.map((s) => (
            <div className="meal-row" key={s.food.n}>
              <div>
                <div className="meal-name">
                  {s.food.n} ({s.grams}g)
                </div>
                <div className="muted mono meal-macros">
                  {Math.round(s.macros.protein)}g P · {Math.round(s.macros.carb)}g C · {Math.round(s.macros.fat)}g G
                </div>
              </div>
              <button className="icon-btn favorite-add" onClick={() => addSuggested(s)} aria-label="Adicionar">
                <Plus size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {favorites.length > 0 && (
        <div className="card">
          <div className="card-head">Favoritos</div>
          {favorites.map((fav) => (
            <FavoriteRow
              key={fav.id}
              fav={fav}
              onAdd={() => addFavoriteAsMeal(fav)}
              onRename={(n) => renameFavorite(fav.id, n)}
              onDelete={() => deleteFavorite(fav.id)}
            />
          ))}
        </div>
      )}

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
              type="text"
              inputMode="decimal"
              placeholder={isUnitFood ? `Quantidade (${matchedFood.unitLabel}s)` : "Quantidade (g)"}
              value={grams}
              onChange={(e) => setGrams(sanitizeDecimal(e.target.value))}
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
            <button
              className="btn-secondary"
              onClick={() => saveFavorite(previewMacros, matchedFood?.n)}
              disabled={!previewMacros}
            >
              <Star size={14} /> Salvar como favorito
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
                type="text"
                inputMode="decimal"
                placeholder="P (g)"
                value={manualForm.protein}
                onChange={(e) => setManualForm({ ...manualForm, protein: sanitizeDecimal(e.target.value) })}
              />
              <input
                className="input mono"
                type="text"
                inputMode="decimal"
                placeholder="C (g)"
                value={manualForm.carb}
                onChange={(e) => setManualForm({ ...manualForm, carb: sanitizeDecimal(e.target.value) })}
              />
              <input
                className="input mono"
                type="text"
                inputMode="decimal"
                placeholder="G (g)"
                value={manualForm.fat}
                onChange={(e) => setManualForm({ ...manualForm, fat: sanitizeDecimal(e.target.value) })}
              />
            </div>
            <button className="btn-primary" onClick={addManualMeal}>
              <Plus size={16} /> Registrar
            </button>
            <button
              className="btn-secondary"
              onClick={() =>
                saveFavorite(
                  {
                    protein: parseFloat(manualForm.protein) || 0,
                    carb: parseFloat(manualForm.carb) || 0,
                    fat: parseFloat(manualForm.fat) || 0,
                  },
                  manualForm.name
                )
              }
              disabled={!manualForm.name.trim()}
            >
              <Star size={14} /> Salvar como favorito
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
                <div className="meal-name">
                  {m.name}
                  {m.timing && <span className="muted mono"> · {m.timing === "pre" ? "pré-treino" : "pós-treino"}</span>}
                </div>
                <div className="muted mono meal-macros">
                  {Math.round(m.protein)}g P · {Math.round(m.carb)}g C · {Math.round(m.fat)}g G ·{" "}
                  {kcal(m.protein, m.carb, m.fat)} kcal
                </div>
              </div>
              {dietCat === "Treino" && (
                <div style={{ display: "flex", gap: 4 }}>
                  <button
                    type="button"
                    className={"rir-felt-chip" + (m.timing === "pre" ? " active" : "")}
                    style={{ width: "auto", padding: "0 8px" }}
                    onClick={() => setMealTiming(i, "pre")}
                  >
                    Pré
                  </button>
                  <button
                    type="button"
                    className={"rir-felt-chip" + (m.timing === "pos" ? " active" : "")}
                    style={{ width: "auto", padding: "0 8px" }}
                    onClick={() => setMealTiming(i, "pos")}
                  >
                    Pós
                  </button>
                </div>
              )}
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

function FavoriteRow({ fav, onAdd, onRename, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(fav.name);

  function confirmRename() {
    const trimmed = name.trim();
    if (trimmed) onRename(trimmed);
    else setName(fav.name);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="meal-row favorite-row">
        <input
          className="input favorite-rename-input"
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") confirmRename();
            if (e.key === "Escape") {
              setName(fav.name);
              setEditing(false);
            }
          }}
        />
        <div className="favorite-actions">
          <button className="icon-btn" onClick={confirmRename} aria-label="Confirmar novo nome">
            <Check size={16} />
          </button>
          <button className="icon-btn" onClick={onDelete} aria-label="Excluir favorito">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="meal-row favorite-row">
      <div className="favorite-info">
        <div className="meal-name">{fav.name}</div>
        <div className="muted mono meal-macros">
          {Math.round(fav.protein)}g P · {Math.round(fav.carb)}g C · {Math.round(fav.fat)}g G ·{" "}
          {kcal(fav.protein, fav.carb, fav.fat)} kcal
        </div>
      </div>
      <div className="favorite-actions">
        <button className="icon-btn favorite-add" onClick={onAdd} aria-label="Adicionar hoje">
          <Plus size={16} />
        </button>
        <button className="icon-btn" onClick={() => setEditing(true)} aria-label="Renomear favorito">
          <Pencil size={14} />
        </button>
      </div>
    </div>
  );
}

// ---------------- Progresso ----------------
function ProgressoTab({ logs, settings, setSettings }) {
  const bwData = Object.entries(logs)
    .filter(([, v]) => v.bodyweight != null)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([d, v]) => ({ date: d.slice(5), peso: v.bodyweight }));
  // Média móvel dos últimos 7 registros — o peso do dia oscila com água/sódio;
  // a média suaviza esse ruído e mostra a tendência real.
  bwData.forEach((row, i) => {
    const window = bwData.slice(Math.max(0, i - 6), i + 1);
    row.media = +(window.reduce((sum, r) => sum + r.peso, 0) / window.length).toFixed(1);
  });

  const days = Object.entries(logs).sort(([a], [b]) => (a < b ? 1 : -1));
  const currentWeight = bwData.length ? bwData[bwData.length - 1].peso : settings.startWeight;
  const delta = (currentWeight - settings.startWeight).toFixed(1);
  const strengthData = useMemo(() => computeStrengthIndex(logs), [logs]);
  const goalStatus = useMemo(
    () => computeGoalStatus(logs, settings.goalWeight, settings.goalDate),
    [logs, settings.goalWeight, settings.goalDate]
  );
  const plateau = useMemo(() => computePlateau(logs, settings.goalWeight), [logs, settings.goalWeight]);
  const tdee = useMemo(() => computeTDEE(logs), [logs]);
  // Guarda o TDEE calculado como "linha de base" — na primeira vez que houver
  // dado suficiente pra calcular, e sempre que o usuário aceitar uma nova
  // atualização. Compara contra ela pra avisar quando o gasto real mudou o
  // bastante pra valer a pena reajustar a meta (perder peso reduz o TDEE).
  useEffect(() => {
    if (!tdee || settings.lastTDEE) return;
    setSettings((prev) => ({ ...prev, lastTDEE: { value: tdee.tdee, date: todayISO() } }));
  }, [tdee, settings.lastTDEE, setSettings]);
  const tdeeShiftPct = tdee && settings.lastTDEE ? ((tdee.tdee - settings.lastTDEE.value) / settings.lastTDEE.value) * 100 : 0;
  const showTdeeShift = tdee && settings.lastTDEE && Math.abs(tdeeShiftPct) >= 8;
  function acceptNewTDEE() {
    setSettings((prev) => ({ ...prev, lastTDEE: { value: tdee.tdee, date: todayISO() } }));
  }
  const stagnation = useMemo(() => computeStagnation(logs), [logs]);
  const overtraining = useMemo(() => computeOvertrainingRisk(logs), [logs]);
  const strengthPlateau = useMemo(() => computeStrengthPlateau(logs), [logs]);
  const mesocycleStatus = useMemo(() => computeMesocycleStatus(settings.mesocycle), [settings.mesocycle]);
  const mesocycleClosing = useMemo(() => {
    if (!mesocycleStatus?.isDeloadWeek) return null;
    return computeDateCompare(logs, mesocycleStatus.cycleStartDate, todayISO());
  }, [logs, mesocycleStatus]);
  const noteStats = useMemo(() => computeNoteKeywordStats(logs), [logs]);
  const prByRepRange = useMemo(() => computePRByRepRange(logs), [logs]);
  const rirTrend = useMemo(() => computeRirTrend(logs), [logs]);
  const bodyFat = useMemo(() => {
    const withNeck = Object.entries(logs)
      .filter(([, v]) => v?.measurements?.waist != null && v?.measurements?.neck != null)
      .sort(([a], [b]) => (a < b ? -1 : 1));
    if (!withNeck.length) return null;
    const [, latest] = withNeck[withNeck.length - 1];
    return computeBodyFatNavy({ waistCm: latest.measurements.waist, neckCm: latest.measurements.neck, heightCm: settings.heightCm });
  }, [logs, settings.heightCm]);
  const prHistory = useMemo(() => computePRHistory(logs), [logs]);
  const weekSummary = useMemo(() => computeWeekSummary(logs, settings, prHistory), [logs, settings, prHistory]);
  const monthSummary = useMemo(() => computeMonthSummary(logs, settings, prHistory), [logs, settings, prHistory]);
  const weekdayPattern = useMemo(() => computeWeekdayPattern(logs), [logs]);
  const muscleVolume = useMemo(() => computeMuscleVolume(logs), [logs]);
  const painHistory = useMemo(() => computePainHistory(logs), [logs]);
  const heatmapData = useMemo(() => buildHeatmapData(logs, settings), [logs, settings]);
  const threeMonthsAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return { date: todayISO(d), compare: computeDateCompare(logs, todayISO(d), todayISO()) };
  }, [logs]);
  const bwChartRef = useRef(null);
  const strengthChartRef = useRef(null);

  return (
    <div className="stack">
      <WeekSummaryCard summary={weekSummary} />

      <MonthSummaryCard summary={monthSummary} />

      <ShareSummaryCard logs={logs} settings={settings} />

      {goalStatus && <GoalStatusCard status={goalStatus} />}

      {plateau && <PlateauCard plateau={plateau} />}

      {tdee && <TDEECard tdee={tdee} />}

      {showTdeeShift && <TDEEShiftCard tdee={tdee} baseline={settings.lastTDEE} pct={tdeeShiftPct} onAccept={acceptNewTDEE} />}

      {stagnation && <DeloadCard stagnation={stagnation} />}

      {overtraining && <OvertrainingCard risk={overtraining} />}

      {strengthPlateau && <StrengthPlateauCard plateau={strengthPlateau} />}

      {mesocycleStatus && <MesocycleCard mesocycle={settings.mesocycle} status={mesocycleStatus} />}

      {mesocycleClosing && (
        <ThreeMonthsAgoCard
          fromDate={mesocycleStatus.cycleStartDate}
          result={mesocycleClosing}
          title="Fechamento do mesociclo"
          subtitle={`Do início do ciclo (${fmtDateLabel(mesocycleStatus.cycleStartDate)}) até hoje — semana de deload, hora de olhar o antes × depois.`}
        />
      )}

      {settings.goalWeight != null && <WhatIfSimulator currentWeight={currentWeight} goalWeight={settings.goalWeight} />}

      {rirTrend && <RirTrendCard trend={rirTrend} />}

      {noteStats && <NoteInsightsCard stats={noteStats} />}

      <RepRangePRCard prByRange={prByRepRange} />

      <SubstitutionHistoryCard history={settings.substitutionHistory} />

      <InjuryTracker injuries={settings.injuries} setSettings={setSettings} />

      <PhotoTimelapseCard logs={logs} />

      <div className="card">
        <div className="card-head">Peso corporal</div>
        {bwData.length >= 2 ? (
          <>
            <div ref={bwChartRef}>
              <Suspense fallback={<ChartFallback height={180} />}>
                <MiniLineChart
                  data={bwData}
                  dataKey="peso"
                  secondaryDataKey="media"
                  secondaryLabel="Média 7 dias"
                  yDomain={["dataMin - 1", "dataMax + 1"]}
                  height={180}
                  valueSuffix="kg"
                />
              </Suspense>
            </div>
            <ShareChartButton containerRef={bwChartRef} filename="peso-corporal.png" />
            <p className="hint">Linha sólida = peso do dia · linha pontilhada = média móvel de 7 dias (a tendência real, sem o ruído de água/sódio).</p>
          </>
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

      <div className="card">
        <div className="card-head">Força geral</div>
        {strengthData.length >= 2 ? (
          <>
            <div ref={strengthChartRef}>
              <Suspense fallback={<ChartFallback height={170} />}>
                <MiniLineChart
                  data={strengthData}
                  dataKey="indice"
                  yDomain={["dataMin - 5", "dataMax + 5"]}
                  height={170}
                  valueSuffix="%"
                />
              </Suspense>
            </div>
            <ShareChartButton containerRef={strengthChartRef} filename="forca-geral.png" />
          </>
        ) : (
          <p className="muted">
            Registre {ANCHOR_LIFTS.join(", ")} por mais sessões pra ver a média de evolução dos 3.
          </p>
        )}
        <p className="hint">
          Média de Supino reto, Remada curvada pronada e Agachamento livre, cada um relativo à primeira vez que foi
          registrado (=100%) — assim nenhum dos três domina o gráfico só por pesar mais.
        </p>
      </div>

      <MuscleVolumeCard data={muscleVolume} />

      {weekdayPattern && <WeekdayPatternCard pattern={weekdayPattern} />}

      <HeatmapCard data={heatmapData} />

      <ThreeMonthsAgoCard fromDate={threeMonthsAgo.date} result={threeMonthsAgo.compare} />

      {(settings.phases || []).length > 0 && <PhaseComparisonCard logs={logs} phases={settings.phases} />}

      <DateCompareCard logs={logs} />

      <PhotoCompareCard logs={logs} />

      <MeasurementsProgressCard logs={logs} />

      {bodyFat != null && <BodyFatCard bodyFat={bodyFat} />}

      <ExerciseProgressCard logs={logs} />

      <PRHistoryCard prHistory={prHistory} />

      {painHistory.length > 0 && <PainHistoryCard painHistory={painHistory} />}

      <div className="card">
        <div className="card-head">Histórico de treino</div>
        {days.length === 0 && <p className="muted">Nenhum dia registrado ainda.</p>}
        {days.slice(0, 14).map(([d, v]) => {
          const dow = new Date(d + "T12:00:00").getDay();
          const scheduled = settings.schedule[dow] || "Descanso";
          const dt = v.dayTypeOverride || scheduled;
          const wasSwapped = !!v.dayTypeOverride;
          const exCount = v.exercises ? Object.keys(v.exercises).length : 0;
          return (
            <div className="hist-row" key={d}>
              <span className="hist-date">{fmtDateLabel(d)}</span>
              <span
                className="hist-tag"
                style={{ color: getDayColor(dt) }}
                title={wasSwapped ? `Agendado: ${scheduled} · trocado pra ${dt}` : undefined}
              >
                {dt}
                {wasSwapped && <span className="hist-swap-dot">●</span>}
              </span>
              <span className="muted mono">{isTrainingDay(dt) ? `${exCount}/${getPlanExercises(dt, settings).length} ex` : "—"}</span>
              <span className="muted mono">{v.bodyweight ? `${v.bodyweight}kg` : ""}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekSummaryCard({ summary }) {
  const weightDelta =
    summary.weightStart != null && summary.weightEnd != null ? summary.weightEnd - summary.weightStart : null;
  return (
    <div className="card">
      <div className="card-head">
        <BarChart3 size={13} style={{ verticalAlign: "-2px", marginRight: 5 }} />
        Resumo da semana
      </div>
      <div className="phase-stat-row">
        <span className="muted">Treinos feitos</span>
        <span className="mono">{summary.workouts}</span>
      </div>
      <div className="phase-stat-row">
        <span className="muted">Peso corporal</span>
        {weightDelta != null ? (
          <span className="mono">
            {summary.weightStart}kg → {summary.weightEnd}kg{" "}
            <span className={weightDelta <= 0 ? "tone-down" : "tone-up"}>
              ({weightDelta > 0 ? "+" : ""}
              {weightDelta.toFixed(1)}kg)
            </span>
          </span>
        ) : (
          <span className="muted mono">sem dados suficientes</span>
        )}
      </div>
      <div className="phase-stat-row">
        <span className="muted">Recordes batidos</span>
        <span className="mono">{summary.prCount}</span>
      </div>
      {summary.avgSleep != null && (
        <div className="phase-stat-row">
          <span className="muted">Sono médio</span>
          <span className="mono">{summary.avgSleep.toFixed(1)}h</span>
        </div>
      )}
      <div className="hint" style={{ marginBottom: 0 }}>
        Últimos 7 dias, atualizado automaticamente.
      </div>
    </div>
  );
}

function ShareSummaryCard({ logs, settings }) {
  const [period, setPeriod] = useState("month"); // "month" | "year"
  const days = period === "month" ? 30 : 365;
  const prHistory = useMemo(() => computePRHistory(logs), [logs]);
  const summary = useMemo(() => computePeriodSummary(logs, settings, prHistory, days), [logs, settings, prHistory, days]);
  const streak = useMemo(() => computeStreak(logs), [logs]);
  const containerRef = useRef(null);
  const weightDelta =
    summary.weightStart != null && summary.weightEnd != null ? summary.weightEnd - summary.weightStart : null;
  const periodLabel = period === "month" ? "Últimos 30 dias" : "Últimos 12 meses";

  return (
    <div className="card">
      <div className="card-head">Resumo compartilhável</div>
      <div className="mode-toggle">
        <button className={period === "month" ? "mode-btn active" : "mode-btn"} onClick={() => setPeriod("month")}>
          Mês
        </button>
        <button className={period === "year" ? "mode-btn active" : "mode-btn"} onClick={() => setPeriod("year")}>
          Ano
        </button>
      </div>
      <div ref={containerRef} className="share-card-svg-wrap">
        <svg viewBox="0 0 500 640" xmlns="http://www.w3.org/2000/svg">
          <rect x="1" y="1" width="498" height="638" rx="24" fill="var(--surface)" stroke="var(--border)" />
          <text x="40" y="72" fontSize="30" fontWeight="700" fill="var(--text)" fontFamily="Georgia, serif">
            Cutting Log
          </text>
          <text x="40" y="100" fontSize="15" fill="var(--muted)">
            {periodLabel}
          </text>

          <text x="40" y="195" fontSize="14" fill="var(--muted)">
            Treinos feitos
          </text>
          <text x="40" y="240" fontSize="52" fontWeight="700" fill="var(--push)">
            {summary.workouts}
          </text>

          <text x="40" y="315" fontSize="14" fill="var(--muted)">
            Variação de peso
          </text>
          <text x="40" y="360" fontSize="36" fontWeight="700" fill="var(--text)">
            {weightDelta != null ? `${weightDelta > 0 ? "+" : ""}${weightDelta.toFixed(1)}kg` : "—"}
          </text>

          <text x="40" y="435" fontSize="14" fill="var(--muted)">
            Recordes batidos
          </text>
          <text x="40" y="480" fontSize="52" fontWeight="700" fill="var(--legs)">
            {summary.prCount}
          </text>

          <text x="40" y="555" fontSize="14" fill="var(--muted)">
            Sequência atual
          </text>
          <text x="40" y="600" fontSize="36" fontWeight="700" fill="var(--pull)">
            {streak} dia{streak === 1 ? "" : "s"}
          </text>
        </svg>
      </div>
      <ShareChartButton containerRef={containerRef} filename={`cutting-log-resumo-${period === "month" ? "mes" : "ano"}.png`} />
    </div>
  );
}

function MonthSummaryCard({ summary }) {
  const weightDelta =
    summary.weightStart != null && summary.weightEnd != null ? summary.weightEnd - summary.weightStart : null;
  return (
    <div className="card">
      <div className="card-head">
        <BarChart3 size={13} style={{ verticalAlign: "-2px", marginRight: 5 }} />
        Resumo do mês (30 dias)
      </div>
      <div className="phase-stat-row">
        <span className="muted">Treinos feitos</span>
        <span className="mono">{summary.workouts}</span>
      </div>
      <div className="phase-stat-row">
        <span className="muted">Peso corporal</span>
        {weightDelta != null ? (
          <span className="mono">
            {summary.weightStart}kg → {summary.weightEnd}kg{" "}
            <span className={weightDelta <= 0 ? "tone-down" : "tone-up"}>
              ({weightDelta > 0 ? "+" : ""}
              {weightDelta.toFixed(1)}kg)
            </span>
          </span>
        ) : (
          <span className="muted mono">sem dados suficientes</span>
        )}
      </div>
      <div className="phase-stat-row">
        <span className="muted">Recordes batidos</span>
        <span className="mono">{summary.prCount}</span>
      </div>
    </div>
  );
}

function WeekdayPatternCard({ pattern }) {
  const maxAvg = Math.max(...pattern.averages.map((a) => a.avg), 1);
  return (
    <div className="card">
      <div className="card-head">Padrão por dia da semana</div>
      <p className="muted export-hint">
        {pattern.strongest.label !== pattern.weakest.label ? (
          <>
            Suas sessões de <strong className="cloud-email">{pattern.strongest.label}</strong> costumam ser as mais
            fortes · <strong className="cloud-email">{pattern.weakest.label}</strong> as mais fracas (volume médio de
            treino).
          </>
        ) : (
          "Ainda não há diferença clara entre os dias da semana."
        )}
      </p>
      {pattern.averages
        .filter((a) => a.count > 0)
        .map((a) => (
          <div className="macro-row" key={a.dow}>
            <div className="macro-labels">
              <span>{a.label}</span>
              <span className="mono muted">{a.count} sessão(ões)</span>
            </div>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: (a.avg / maxAvg) * 100 + "%", background: "var(--upper)" }} />
            </div>
          </div>
        ))}
    </div>
  );
}

function MuscleVolumeCard({ data }) {
  const maxVol = data[0]?.volume || 0;
  return (
    <div className="card">
      <div className="card-head">Volume por grupo muscular (7 dias)</div>
      {data.length === 0 ? (
        <p className="muted">Registre treinos nos últimos 7 dias pra ver o volume por grupo muscular.</p>
      ) : (
        data.map((g) => (
          <div className="macro-row" key={g.muscle}>
            <div className="macro-labels">
              <span>{g.muscle}</span>
              <span className="mono">{g.volume.toLocaleString("pt-BR")}kg</span>
            </div>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: (maxVol ? (g.volume / maxVol) * 100 : 0) + "%", background: "var(--legs)" }} />
            </div>
          </div>
        ))
      )}
      <p className="hint" style={{ marginBottom: 0 }}>
        Soma de peso × reps de cada série, agrupado por grupo muscular — ajuda a notar se algum ficou de fora na semana.
      </p>
    </div>
  );
}

function PRHistoryCard({ prHistory }) {
  const top = prHistory.slice(0, 15);
  return (
    <div className="card">
      <div className="card-head">Histórico de recordes</div>
      {top.length === 0 && <p className="muted">Nenhum recorde registrado ainda.</p>}
      {top.map((pr, i) => (
        <div className="hist-row pr-hist-row" key={pr.date + pr.name + i}>
          <span className="hist-date">{fmtDateLabel(pr.date)}</span>
          <span className="pr-hist-name">{pr.name}</span>
          <span className="mono pr-hist-weight">
            <Trophy size={11} /> {pr.weight}kg
          </span>
        </div>
      ))}
    </div>
  );
}

function RepRangePRCard({ prByRange }) {
  const entries = Object.entries(prByRange);
  if (!entries.length) return null;
  return (
    <div className="card">
      <div className="card-head">Recordes por faixa de reps</div>
      <p className="muted export-hint">
        Carga real já levantada em cada faixa (não é 1RM estimado) — útil pra quem varia entre força e hipertrofia.
      </p>
      {entries.map(([name, buckets]) => (
        <div className="phase-stat-row" key={name}>
          <span className="muted">{name}</span>
          <span className="mono">
            {REP_BUCKETS.map((b) => (buckets[b.key] != null ? `${b.label}: ${buckets[b.key]}kg` : null))
              .filter(Boolean)
              .join(" · ")}
          </span>
        </div>
      ))}
    </div>
  );
}

function SubstitutionHistoryCard({ history }) {
  const summary = summarizeSubstitutionHistory(history);
  if (!summary) return null;
  return (
    <div className="card">
      <div className="card-head">Histórico de trocas de exercício</div>
      {summary.map((s) => (
        <div className="phase-stat-row" key={s.from}>
          <span className="muted">
            {s.from} ({s.total}x)
          </span>
          <span className="mono" style={{ fontSize: 11.5 }}>
            {s.breakdown.join(", ")}
          </span>
        </div>
      ))}
    </div>
  );
}

function RirTrendCard({ trend }) {
  const chartRef = useRef(null);
  return (
    <div className="card">
      <div className="card-head">RIR sentido vs plano</div>
      <div className="phase-stat-row">
        <span className="muted">Média geral</span>
        <span className="mono" style={{ fontWeight: 600 }}>
          {trend.overall > 0 ? "+" : ""}
          {trend.overall}
        </span>
      </div>
      <div ref={chartRef}>
        <Suspense fallback={<ChartFallback height={140} />}>
          <MiniLineChart data={trend.data} dataKey="delta" height={140} valueSuffix="" />
        </Suspense>
      </div>
      <p className="hint" style={{ marginBottom: 0 }}>
        {trend.overall > 0.3
          ? "Você costuma sentir MAIS RIR do que o plano pede — talvez dê pra subir a carga um pouco mais rápido."
          : trend.overall < -0.3
          ? "Você costuma sentir MENOS RIR do que o plano pede (chega mais perto da falha) — talvez a carga esteja alta demais pro alvo."
          : "Em média, o RIR sentido bate com o alvo do plano."}
      </p>
    </div>
  );
}

function PhotoCompareCard({ logs }) {
  const [dateA, setDateA] = useState("");
  const [dateB, setDateB] = useState("");
  const photoA = dateA ? logs[dateA]?.photo : null;
  const photoB = dateB ? logs[dateB]?.photo : null;

  return (
    <div className="card">
      <div className="card-head">Comparar fotos</div>
      <p className="muted export-hint">Escolhe dois dias que tenham foto registrada pra comparar lado a lado.</p>
      <div className="phase-date-row">
        <div>
          <div className="hint phase-date-label">Data 1</div>
          <input className="input mono" type="date" value={dateA} onChange={(e) => setDateA(e.target.value)} />
        </div>
        <div>
          <div className="hint phase-date-label">Data 2</div>
          <input className="input mono" type="date" value={dateB} onChange={(e) => setDateB(e.target.value)} />
        </div>
      </div>
      {(dateA || dateB) && (
        <div className="photo-compare-row">
          <div className="photo-compare-col">
            {photoA ? <img src={photoA} alt={dateA} className="progress-photo" /> : dateA && <p className="muted export-hint">Sem foto nesse dia.</p>}
          </div>
          <div className="photo-compare-col">
            {photoB ? <img src={photoB} alt={dateB} className="progress-photo" /> : dateB && <p className="muted export-hint">Sem foto nesse dia.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function MeasurementsProgressCard({ logs }) {
  const [field, setField] = useState("waist");
  const chartRef = useRef(null);

  const data = useMemo(() => {
    return Object.entries(logs)
      .filter(([, v]) => v?.measurements?.[field] != null)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([d, v]) => ({ date: d.slice(5), valor: v.measurements[field] }));
  }, [logs, field]);

  const first = data[0]?.valor;
  const last = data[data.length - 1]?.valor;
  const delta = first != null && last != null ? last - first : null;

  const hasAny = MEASUREMENT_FIELDS.some((f) => Object.values(logs).some((v) => v?.measurements?.[f.key] != null));
  if (!hasAny) return null;

  return (
    <div className="card">
      <div className="card-head">Medidas corporais</div>
      <div className="mode-toggle" style={{ flexWrap: "wrap" }}>
        {MEASUREMENT_FIELDS.map((f) => (
          <button key={f.key} className={field === f.key ? "mode-btn active" : "mode-btn"} onClick={() => setField(f.key)}>
            {f.label}
          </button>
        ))}
      </div>
      {data.length >= 2 ? (
        <>
          <div ref={chartRef}>
            <Suspense fallback={<ChartFallback height={160} />}>
              <MiniLineChart data={data} dataKey="valor" yDomain={["dataMin - 1", "dataMax + 1"]} height={160} valueSuffix="cm" />
            </Suspense>
          </div>
          <ShareChartButton containerRef={chartRef} filename={`medida-${field}.png`} />
          {delta != null && (
            <div className="kcal-row">
              <span className="mono">{last}cm</span>
              <span className={"mono " + (delta <= 0 ? "tone-down" : "tone-up")}>
                {delta > 0 ? "+" : ""}
                {delta.toFixed(1)}cm desde o início
              </span>
            </div>
          )}
        </>
      ) : (
        <p className="muted" style={{ marginTop: 10 }}>
          Registre essa medida em pelo menos 2 dias pra ver a evolução.
        </p>
      )}
    </div>
  );
}

const GOAL_VERDICT = {
  batido: { text: "🎉 Meta batida!", tone: "good" },
  no_ritmo: { text: "No ritmo certo pra bater a meta no prazo.", tone: "good" },
  lento: { text: "Ritmo um pouco devagar — talvez não dê tempo no prazo atual.", tone: "warn" },
  muito_lento: { text: "Ritmo bem abaixo do necessário — dificilmente bate nesse prazo.", tone: "warn" },
  direcao_errada: { text: "O peso está indo na direção contrária da meta.", tone: "warn" },
  prazo_passou: { text: "O prazo já passou e a meta ainda não foi batida.", tone: "warn" },
  sem_dados: { text: "Registre o peso por mais dias pra calcular o ritmo.", tone: "neutral" },
};

function GoalStatusCard({ status }) {
  const v = GOAL_VERDICT[status.verdict];
  return (
    <div className="card">
      <div className="card-head">Meta de peso</div>
      <div className="phase-stat-row">
        <span className="muted">Atual → alvo</span>
        <span className="mono">
          {status.currentWeight}kg → {status.goalWeight}kg
        </span>
      </div>
      <div className="phase-stat-row">
        <span className="muted">Prazo</span>
        <span className="mono">{status.daysLeft > 0 ? `${status.daysLeft} dias restantes` : "prazo encerrado"}</span>
      </div>
      {status.weeklyRate != null && (
        <div className="phase-stat-row">
          <span className="muted">Ritmo atual</span>
          <span className="mono">
            {status.weeklyRate > 0 ? "+" : ""}
            {status.weeklyRate.toFixed(2)}kg/semana
          </span>
        </div>
      )}
      {status.neededWeeklyRate != null && status.daysLeft > 0 && (
        <div className="phase-stat-row">
          <span className="muted">Ritmo necessário</span>
          <span className="mono">
            {status.neededWeeklyRate > 0 ? "+" : ""}
            {status.neededWeeklyRate.toFixed(2)}kg/semana
          </span>
        </div>
      )}
      {status.etaDate && status.verdict !== "batido" && status.verdict !== "prazo_passou" && (
        <div className="phase-stat-row">
          <span className="muted">Previsão (no ritmo atual)</span>
          <span className="mono">{fmtDateLabel(status.etaDate)}</span>
        </div>
      )}
      <div className={"goal-verdict " + v.tone}>{v.text}</div>
    </div>
  );
}

function PlateauCard({ plateau }) {
  return (
    <div className="card">
      <div className="card-head">Platô detectado</div>
      <div className="suggestion deload" style={{ marginTop: 0 }}>
        <TrendingDown size={13} /> Peso variou só {plateau.range}kg nos últimos {plateau.days} registros ({fmtDateLabel(plateau.from)} –{" "}
        {fmtDateLabel(plateau.to)}) — mesmo com a meta ainda longe. Vale reavaliar as calorias ou o NEAT (quanto você
        se movimenta fora do treino).
      </div>
    </div>
  );
}

function StrengthPlateauCard({ plateau }) {
  return (
    <div className="card">
      <div className="card-head">Platô de força</div>
      <div className="suggestion deload" style={{ marginTop: 0 }}>
        <TrendingDown size={13} /> O índice de força geral variou só {plateau.range} pontos nas últimas{" "}
        {plateau.sessions} sessões ({fmtDateLabel(plateau.from)} – {fmtDateLabel(plateau.to)}) — mesmo que o peso
        corporal esteja mudando. Vale revisar volume, sono ou a variação dos exercícios.
      </div>
    </div>
  );
}

function MesocycleCard({ mesocycle, status }) {
  return (
    <div className="card">
      <div className="card-head">Mesociclo</div>
      <div className="phase-stat-row">
        <span className="muted">Semana</span>
        <span className="mono" style={{ fontWeight: 600 }}>
          {status.cycleWeek} de {status.totalWeeks}
        </span>
      </div>
      {status.isDeloadWeek ? (
        <p className="hint" style={{ marginBottom: 0, color: "var(--legs)" }}>
          Essa é a semana de deload planejada — reduz volume/carga de propósito antes de começar o próximo ciclo.
        </p>
      ) : (
        <p className="hint" style={{ marginBottom: 0 }}>
          Faltam {status.weeksUntilDeload} semana{status.weeksUntilDeload === 1 ? "" : "s"} pro deload planejado.
        </p>
      )}
    </div>
  );
}

function WhatIfSimulator({ currentWeight, goalWeight }) {
  const [deficit, setDeficit] = useState("500");
  const d = parseFloat(deficit) || 0;
  const dailyChangeKg = -d / 7700; // déficit positivo = perde peso, negativo = superávit (ganha)
  const neededChangeKg = goalWeight != null && currentWeight != null ? goalWeight - currentWeight : null;
  let daysToGoal = null;
  if (neededChangeKg != null && dailyChangeKg !== 0 && Math.sign(dailyChangeKg) === Math.sign(neededChangeKg)) {
    daysToGoal = Math.ceil(neededChangeKg / dailyChangeKg);
  }
  const weeklyRateKg = dailyChangeKg * 7;
  const projectedDate = (() => {
    if (daysToGoal == null) return null;
    const dt = new Date();
    dt.setDate(dt.getDate() + daysToGoal);
    return todayISO(dt);
  })();

  return (
    <div className="card">
      <div className="card-head">Simulador "e se"</div>
      <p className="muted export-hint">Ajusta o déficit diário e vê a data projetada da meta mudar na hora.</p>
      <div className="schedule-row">
        <span>Déficit diário (kcal)</span>
        <input
          className="input mono settings-input"
          type="text"
          inputMode="numeric"
          value={deficit}
          onChange={(e) => setDeficit(e.target.value.replace(/[^0-9-]/g, ""))}
        />
      </div>
      <div className="phase-stat-row">
        <span className="muted">Ritmo projetado</span>
        <span className="mono">
          {weeklyRateKg >= 0 ? "+" : ""}
          {weeklyRateKg.toFixed(2)}kg/semana
        </span>
      </div>
      {daysToGoal != null ? (
        <div className="phase-stat-row">
          <span className="muted">Bateria a meta em</span>
          <span className="mono">
            {fmtDateLabel(projectedDate)} (~{daysToGoal}d)
          </span>
        </div>
      ) : (
        <p className="hint" style={{ marginBottom: 0 }}>
          Com esse número você não caminha na direção da meta — ajusta o déficit.
        </p>
      )}
    </div>
  );
}

function PhotoTimelapseCard({ logs }) {
  const photos = Object.entries(logs)
    .filter(([, v]) => v.photo)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([d, v]) => ({ date: d, photo: v.photo }));
  const [playing, setPlaying] = useState(false);
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (!playing || photos.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % photos.length), 500);
    return () => clearInterval(t);
  }, [playing, photos.length]);
  if (photos.length < 2) return null;
  return (
    <div className="card">
      <div className="card-head">Time-lapse das fotos</div>
      <img src={photos[idx].photo} alt="" className="progress-photo" />
      <div className="hint mono" style={{ textAlign: "center" }}>
        {fmtDateLabel(photos[idx].date)} · {idx + 1}/{photos.length}
      </div>
      <button className="btn-secondary" onClick={() => setPlaying((p) => !p)}>
        {playing ? "Pausar" : "▶ Reproduzir"}
      </button>
    </div>
  );
}

function NoteInsightsCard({ stats }) {
  return (
    <div className="card">
      <div className="card-head">Padrões nas notas do dia</div>
      <p className="muted export-hint">
        Cruza palavras que você mesmo escreve nas notas com o volume de treino daquele dia — não é IA de sentimento,
        só uma comparação simples.
      </p>
      {stats.map((s) => (
        <div className="phase-stat-row" key={s.keyword}>
          <span className="muted">
            Dias com "{s.keyword}" ({s.count})
          </span>
          <span className="mono" style={{ color: s.diffPct < 0 ? "var(--legs)" : "var(--push)" }}>
            {s.diffPct >= 0 ? "+" : ""}
            {s.diffPct}% volume
          </span>
        </div>
      ))}
    </div>
  );
}

function TDEECard({ tdee }) {
  return (
    <div className="card">
      <div className="card-head">TDEE estimado</div>
      <div className="phase-stat-row">
        <span className="muted">Seu gasto calórico real</span>
        <span className="mono" style={{ fontSize: 18, fontWeight: 600 }}>
          ~{tdee.tdee} kcal/dia
        </span>
      </div>
      <p className="hint">
        Calculado a partir de dados reais: você comeu em média {tdee.avgKcal}kcal/dia em {tdee.daysUsed} dia(s)
        registrado(s) nos últimos {tdee.daysSpan} dias, e {tdee.weightChangeKg <= 0 ? "perdeu" : "ganhou"}{" "}
        {Math.abs(tdee.weightChangeKg).toFixed(1)}kg nesse intervalo — mais confiável que qualquer fórmula de bolso,
        porque usa o comportamento real do seu corpo.
      </p>
    </div>
  );
}

function DeloadCard({ stagnation }) {
  return (
    <div className="card">
      <div className="card-head">Possível estagnação</div>
      {stagnation.map((s) => (
        <div className="suggestion deload" style={{ marginTop: 0 }} key={s.name}>
          <Gauge size={13} /> {s.name}: estagnado em {s.weight}kg × {s.reps} nas últimas 3 sessões.
        </div>
      ))}
      <p className="hint" style={{ marginBottom: 0 }}>
        Considera uma semana de deload (~40-50% da carga) antes de tentar progredir de novo — mesmo aviso que aparece
        dentro do exercício, só que reunido aqui pra ver todos de uma vez.
      </p>
    </div>
  );
}

function BodyFatCard({ bodyFat }) {
  return (
    <div className="card">
      <div className="card-head">
        <Percent size={13} style={{ verticalAlign: "-2px", marginRight: 5 }} />
        % de gordura estimado
      </div>
      <div className="phase-stat-row">
        <span className="muted">Fórmula da Marinha (cintura + pescoço + altura)</span>
        <span className="mono" style={{ fontSize: 18, fontWeight: 600 }}>
          ~{bodyFat}%
        </span>
      </div>
      <p className="hint" style={{ marginBottom: 0 }}>
        Estimativa (erro típico de ±3-4 pontos) — usa a cintura e o pescoço mais recentes registrados em Medidas
        corporais, mais a altura cadastrada em Configurações. Não substitui bioimpedância ou dobra cutânea de verdade.
      </p>
    </div>
  );
}

function TDEEShiftCard({ tdee, baseline, pct, onAccept }) {
  const up = pct > 0;
  return (
    <div className="card">
      <div className="card-head">TDEE mudou</div>
      <div className="phase-stat-row">
        <span className="muted">
          De ~{baseline.value} pra ~{tdee.tdee} kcal/dia
        </span>
        <span className="mono" style={{ fontWeight: 600, color: up ? "var(--push)" : "var(--legs)" }}>
          {up ? "+" : ""}
          {pct.toFixed(0)}%
        </span>
      </div>
      <p className="hint">
        {up
          ? "Seu gasto real subiu — talvez dê pra comer um pouco mais sem perder o ritmo."
          : "Seu gasto real caiu (comum conforme o peso desce) — talvez valha reduzir um pouco as calorias pra manter o déficit."}
      </p>
      <button className="btn-secondary" onClick={onAccept}>
        Atualizar linha de base
      </button>
    </div>
  );
}

function OvertrainingCard({ risk }) {
  return (
    <div className="card">
      <div className="card-head">Risco de overtraining</div>
      <div className="suggestion deload" style={{ marginTop: 0 }}>
        <AlertTriangle size={13} /> Volume subiu {risk.volumeJumpPct}% essa semana, com RPE médio {risk.avgRPE} e só{" "}
        {risk.avgSleep}h de sono — combinação que costuma preceder fadiga acumulada.
      </div>
      <p className="hint" style={{ marginBottom: 0 }}>
        Vale segurar o volume essa semana e priorizar o sono antes de empilhar mais carga.
      </p>
    </div>
  );
}

const INJURY_STATUS_CYCLE = ["ativa", "recuperando", "resolvida"];
const INJURY_STATUS_LABEL = { ativa: "Ativa", recuperando: "Recuperando", resolvida: "Resolvida" };
// Separado do "Senti dor/desconforto aqui" por série (que é automático e some
// no histórico do dia) — isso aqui é uma lista mantida à mão, só pra lesão de
// verdade que vale acompanhar por semanas/meses até resolver.
function InjuryTracker({ injuries, setSettings }) {
  const list = injuries || [];
  const [name, setName] = useState("");

  function addInjury() {
    if (!name.trim()) return;
    const injury = { id: Date.now().toString(36), name: name.trim(), startDate: todayISO(), status: "ativa" };
    setSettings((prev) => ({ ...prev, injuries: [...(prev.injuries || []), injury] }));
    setName("");
  }
  function cycleStatus(id) {
    setSettings((prev) => ({
      ...prev,
      injuries: (prev.injuries || []).map((inj) =>
        inj.id === id
          ? { ...inj, status: INJURY_STATUS_CYCLE[(INJURY_STATUS_CYCLE.indexOf(inj.status) + 1) % INJURY_STATUS_CYCLE.length] }
          : inj
      ),
    }));
  }
  function removeInjury(id) {
    setSettings((prev) => ({ ...prev, injuries: (prev.injuries || []).filter((inj) => inj.id !== id) }));
  }

  return (
    <div className="card">
      <div className="card-head">Histórico de lesões</div>
      {list.length === 0 && (
        <p className="muted">Nenhuma lesão registrada — adiciona só o que for real de acompanhar, não toda dorzinha pontual.</p>
      )}
      {list.map((inj) => (
        <div className="meal-row" key={inj.id}>
          <div>
            <div className="meal-name">{inj.name}</div>
            <div className="muted mono meal-macros">desde {fmtDateLabel(inj.startDate)}</div>
          </div>
          <button
            type="button"
            className={"notif-pref-toggle" + (inj.status !== "resolvida" ? " active" : "")}
            onClick={() => cycleStatus(inj.id)}
          >
            {INJURY_STATUS_LABEL[inj.status]}
          </button>
          <button className="icon-btn" onClick={() => removeInjury(inj.id)} aria-label="Remover">
            <X size={16} />
          </button>
        </div>
      ))}
      <input
        className="input"
        placeholder="Nome da lesão (ex: Ombro direito)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ marginTop: list.length ? 10 : 0 }}
      />
      <button className="btn-secondary" onClick={addInjury} disabled={!name.trim()} style={{ marginTop: 8 }}>
        <Plus size={15} /> Adicionar lesão
      </button>
    </div>
  );
}

function PhaseComparisonCard({ logs, phases }) {
  const sorted = [...phases].sort((a, b) => (a.start < b.start ? -1 : 1));
  return (
    <div className="card">
      <div className="card-head">Comparação de fases</div>
      {sorted.map((phase) => {
        const stats = computePhaseStats(logs, phase);
        const weightDelta =
          stats.weightStart != null && stats.weightEnd != null ? stats.weightEnd - stats.weightStart : null;
        const ongoing = !phase.end;
        return (
          <div className="phase-card" key={phase.id}>
            <div className="phase-card-head">
              <span className="phase-name">{phase.name}</span>
              {ongoing && <span className="phase-ongoing-tag">em andamento</span>}
            </div>
            <div className="phase-stat-row">
              <span className="muted">Peso corporal</span>
              {stats.weightStart != null && stats.weightEnd != null ? (
                <span className="mono">
                  {stats.weightStart}kg → {stats.weightEnd}kg{" "}
                  <span className={weightDelta <= 0 ? "tone-down" : "tone-up"}>
                    ({weightDelta > 0 ? "+" : ""}
                    {weightDelta.toFixed(1)}kg)
                  </span>
                </span>
              ) : (
                <span className="muted mono">sem dados suficientes</span>
              )}
            </div>
            {stats.lifts.map((lift) => {
              const liftDelta = lift.start != null && lift.end != null ? lift.end - lift.start : null;
              const pct = liftDelta != null && lift.start > 0 ? Math.round((liftDelta / lift.start) * 100) : null;
              return (
                <div className="phase-stat-row" key={lift.name}>
                  <span className="muted">{lift.name}</span>
                  {liftDelta != null ? (
                    <span className="mono">
                      {lift.start}kg → {lift.end}kg{" "}
                      <span className={liftDelta >= 0 ? "tone-down" : "tone-up"}>
                        ({pct > 0 ? "+" : ""}
                        {pct}%)
                      </span>
                    </span>
                  ) : (
                    <span className="muted mono">sem dados suficientes</span>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function DateCompareCard({ logs }) {
  const loggedDates = Object.keys(logs).sort();
  const [dateA, setDateA] = useState("");
  const [dateB, setDateB] = useState("");

  const result = dateA && dateB ? computeDateCompare(logs, dateA < dateB ? dateA : dateB, dateA < dateB ? dateB : dateA) : null;
  const weightDelta = result && result.weightA != null && result.weightB != null ? result.weightB - result.weightA : null;

  return (
    <div className="card">
      <div className="card-head">Comparar duas datas</div>
      <p className="muted export-hint">Escolhe dois dias quaisquer pra ver a diferença de peso e força entre eles.</p>
      <div className="phase-date-row">
        <div>
          <div className="hint phase-date-label">Data 1</div>
          <input className="input mono" type="date" value={dateA} onChange={(e) => setDateA(e.target.value)} />
        </div>
        <div>
          <div className="hint phase-date-label">Data 2</div>
          <input className="input mono" type="date" value={dateB} onChange={(e) => setDateB(e.target.value)} />
        </div>
      </div>
      {result && (
        <div className="phase-card">
          <div className="phase-stat-row">
            <span className="muted">Peso corporal</span>
            {weightDelta != null ? (
              <span className="mono">
                {result.weightA}kg → {result.weightB}kg{" "}
                <span className={weightDelta <= 0 ? "tone-down" : "tone-up"}>
                  ({weightDelta > 0 ? "+" : ""}
                  {weightDelta.toFixed(1)}kg)
                </span>
              </span>
            ) : (
              <span className="muted mono">sem dados suficientes</span>
            )}
          </div>
          {result.lifts.map((lift) => {
            const liftDelta = lift.a != null && lift.b != null ? lift.b - lift.a : null;
            const pct = liftDelta != null && lift.a > 0 ? Math.round((liftDelta / lift.a) * 100) : null;
            return (
              <div className="phase-stat-row" key={lift.name}>
                <span className="muted">{lift.name}</span>
                {liftDelta != null ? (
                  <span className="mono">
                    {lift.a}kg → {lift.b}kg{" "}
                    <span className={liftDelta >= 0 ? "tone-down" : "tone-up"}>
                      ({pct > 0 ? "+" : ""}
                      {pct}%)
                    </span>
                  </span>
                ) : (
                  <span className="muted mono">sem dados suficientes</span>
                )}
              </div>
            );
          })}
        </div>
      )}
      {!result && loggedDates.length === 0 && <p className="muted export-hint">Nenhum dia registrado ainda.</p>}
    </div>
  );
}

function ThreeMonthsAgoCard({
  fromDate,
  result,
  title = "Você, 3 meses atrás",
  subtitle = `Comparação automática com ${fmtDateLabel(fromDate)} — sem precisar escolher a data.`,
}) {
  const weightDelta = result.weightA != null && result.weightB != null ? result.weightB - result.weightA : null;
  const hasAnything = weightDelta != null || result.lifts.some((l) => l.a != null && l.b != null);
  if (!hasAnything) return null;
  return (
    <div className="card">
      <div className="card-head">
        <History size={13} style={{ verticalAlign: "-2px", marginRight: 5 }} />
        {title}
      </div>
      <p className="muted export-hint">{subtitle}</p>
      <div className="phase-card">
        <div className="phase-stat-row">
          <span className="muted">Peso corporal</span>
          {weightDelta != null ? (
            <span className="mono">
              {result.weightA}kg → {result.weightB}kg{" "}
              <span className={weightDelta <= 0 ? "tone-down" : "tone-up"}>
                ({weightDelta > 0 ? "+" : ""}
                {weightDelta.toFixed(1)}kg)
              </span>
            </span>
          ) : (
            <span className="muted mono">sem dados suficientes</span>
          )}
        </div>
        {result.lifts.map((lift) => {
          const liftDelta = lift.a != null && lift.b != null ? lift.b - lift.a : null;
          const pct = liftDelta != null && lift.a > 0 ? Math.round((liftDelta / lift.a) * 100) : null;
          return (
            <div className="phase-stat-row" key={lift.name}>
              <span className="muted">{lift.name}</span>
              {liftDelta != null ? (
                <span className="mono">
                  {lift.a}kg → {lift.b}kg{" "}
                  <span className={liftDelta >= 0 ? "tone-down" : "tone-up"}>
                    ({pct > 0 ? "+" : ""}
                    {pct}%)
                  </span>
                </span>
              ) : (
                <span className="muted mono">sem dados suficientes</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HeatmapCard({ data }) {
  // Agrupa em semanas (colunas), domingo a sábado (linhas) — igual ao
  // contribution graph do GitHub, só que colorido pelo tipo de treino.
  const weeks = [];
  let currentWeek = new Array(data[0]?.dow ?? 0).fill(null);
  data.forEach((day) => {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });
  if (currentWeek.length) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }
  return (
    <div className="card">
      <div className="card-head">Calendário de treinos</div>
      <div className="heatmap-grid">
        {weeks.map((week, wi) => (
          <div className="heatmap-col" key={wi}>
            {week.map((day, di) =>
              day ? (
                <div
                  key={di}
                  className="heatmap-cell"
                  title={`${fmtDateLabel(day.date)} — ${day.trained ? day.dt : day.hasAnyData ? "sem treino" : "sem registro"}`}
                  style={{
                    background: day.trained ? getDayColor(day.dt) : day.hasAnyData ? "var(--surface-2)" : "var(--border)",
                    opacity: day.trained ? 1 : day.hasAnyData ? 0.7 : 0.35,
                  }}
                />
              ) : (
                <div key={di} className="heatmap-cell heatmap-cell-empty" />
              )
            )}
          </div>
        ))}
      </div>
      <p className="hint" style={{ marginBottom: 0 }}>
        Cada coluna é uma semana (domingo em cima) · cor forte = treino feito, cor fraca = dia sem registro.
      </p>
    </div>
  );
}

function PainHistoryCard({ painHistory }) {
  const top = painHistory.slice(0, 10);
  return (
    <div className="card">
      <div className="card-head">
        <AlertTriangle size={13} style={{ verticalAlign: "-2px", marginRight: 5 }} />
        Dor/desconforto registrado
      </div>
      {top.map((p, i) => (
        <div className="meal-row" key={p.date + p.name + i}>
          <div className="favorite-info">
            <div className="meal-name">{p.name}</div>
            <div className="muted mono meal-macros">
              {fmtDateLabel(p.date)} — {p.note}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const ALL_EXERCISES = [...PLAN.Push, ...PLAN.Pull, ...PLAN.Legs].map((e) => e.n);

function ExerciseProgressCard({ logs }) {
  const [selected, setSelected] = useState(ALL_EXERCISES[0]);
  const [metric, setMetric] = useState("carga"); // "carga" (peso máx.) ou "e1rm" (1RM estimado)
  const chartRef = useRef(null);

  const data = useMemo(() => {
    return Object.entries(logs)
      .filter(([, v]) => v?.exercises?.[selected]?.sets?.length)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([d, v]) => {
        const sets = v.exercises[selected].sets;
        // Série "top" = maior peso (desempate por reps) — a mesma que decide
        // PR/estagnação em ExerciseCard, então o 1RM estimado usa reps dessa
        // mesma série em vez de misturar peso de uma série com reps de outra.
        const top = sets.reduce((best, s) => {
          const w = parseFloat(s.weight) || 0;
          const r = parseInt(s.reps, 10) || 0;
          if (w === 0) return best;
          if (!best || w > best.w || (w === best.w && r > best.r)) return { w, r };
          return best;
        }, null);
        return {
          date: d.slice(5),
          fullDate: d,
          carga: top?.w || 0,
          reps: top?.r || 0,
          e1rm: top ? Math.round(estimate1RMAvg(top.w, top.r)) : 0,
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
      <div className="mode-toggle" style={{ marginTop: 10, marginBottom: 0 }}>
        <button className={metric === "carga" ? "mode-btn active" : "mode-btn"} onClick={() => setMetric("carga")}>
          Carga máxima
        </button>
        <button className={metric === "e1rm" ? "mode-btn active" : "mode-btn"} onClick={() => setMetric("e1rm")}>
          1RM estimado
        </button>
      </div>

      {data.length >= 2 ? (
        <>
          <div ref={chartRef}>
            <Suspense fallback={<ChartFallback height={170} />}>
              <MiniLineChart
                data={data}
                dataKey={metric}
                yDomain={["dataMin - 2", "dataMax + 2"]}
                height={170}
                wrapperStyle={{ marginTop: 12 }}
                valueSuffix="kg"
                tooltipFormatter={(value) => [`${value}kg`, metric === "carga" ? "Carga máx." : "1RM estimado"]}
              />
            </Suspense>
          </div>
          <ShareChartButton containerRef={chartRef} filename={`${selected}.png`} />
        </>
      ) : (
        <p className="muted" style={{ marginTop: 12 }}>
          Registre esse exercício em pelo menos 2 sessões pra ver a evolução.
        </p>
      )}
    </div>
  );
}

// ---------------- Settings ----------------
function CloudBackupCard({ session, cloudStatus, lastSyncAt, recoveryMode, onRecoveryDone }) {
  const [mode, setMode] = useState("signup"); // signup | login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  async function handleSubmit() {
    setLoading(true);
    setMsg("");
    try {
      // Importante: chamar como supabase.auth.signUp(...)/.signInWithPassword(...)
      // direto — extrair a função numa variável antes ("const fn = supabase.auth.x")
      // perde o "this" interno do cliente e trava a chamada pra sempre.
      const { data, error } =
        mode === "signup"
          ? await supabase.auth.signUp({ email: email.trim(), password })
          : await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        setMsg(error.message);
      } else if (mode === "signup" && !data.session) {
        setMsg("Conta criada — confirma o e-mail que a Supabase mandou e depois entra aqui de novo.");
      }
    } catch (e) {
      setMsg("Erro inesperado: " + (e?.message || String(e)));
    } finally {
      setLoading(false);
    }
  }
  async function handleForgotPassword() {
    if (!email.trim()) {
      setMsg("Digita seu e-mail ali em cima primeiro.");
      return;
    }
    setLoading(true);
    setMsg("");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      });
      setMsg(error ? error.message : "Te mandamos um e-mail com um link pra criar uma senha nova.");
    } catch (e) {
      setMsg("Erro inesperado: " + (e?.message || String(e)));
    } finally {
      setLoading(false);
    }
  }
  async function handleLogout() {
    await supabase.auth.signOut();
  }
  async function handleSetNewPassword() {
    setLoading(true);
    setMsg("");
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setMsg(error.message);
      } else {
        setNewPassword("");
        onRecoveryDone();
      }
    } catch (e) {
      setMsg("Erro inesperado: " + (e?.message || String(e)));
    } finally {
      setLoading(false);
    }
  }

  if (recoveryMode) {
    return (
      <div className="card">
        <div className="card-head">Definir nova senha</div>
        <p className="muted export-hint">Você pediu pra redefinir sua senha — digita a nova aqui embaixo.</p>
        <div className="password-field">
          <input
            className="input"
            type={showPassword ? "text" : "password"}
            placeholder="Senha nova (mín. 6 caracteres)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {msg && (
          <p className="muted export-hint" style={{ marginTop: 8 }}>
            {msg}
          </p>
        )}
        <button className="btn-primary" disabled={loading || newPassword.length < 6} onClick={handleSetNewPassword}>
          <Check size={15} /> {loading ? "Aguenta aí…" : "Salvar nova senha"}
        </button>
      </div>
    );
  }

  if (session) {
    const daysSinceSync = lastSyncAt != null ? Math.floor((Date.now() - lastSyncAt) / 86400000) : null;
    const syncStale = daysSinceSync != null && daysSinceSync >= 2;
    return (
      <div className="card">
        <div className="card-head">Backup na nuvem</div>
        <p className="muted export-hint">
          Sincronizado com <strong className="cloud-email">{session.user.email}</strong> ·{" "}
          {cloudStatus === "syncing" ? "salvando…" : cloudStatus === "error" ? "erro ao sincronizar" : "tudo em dia"}
        </p>
        {daysSinceSync != null && (
          <p className={syncStale ? "sync-age-warn" : "muted export-hint"}>
            {daysSinceSync === 0
              ? "Última sincronização: hoje"
              : `Última sincronização: há ${daysSinceSync} dia${daysSinceSync > 1 ? "s" : ""}`}
            {syncStale && " — confere se o celular teve internet ultimamente"}
          </p>
        )}
        <button className="btn-secondary" onClick={handleLogout}>
          <LogOut size={15} /> Sair dessa conta
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-head">Backup na nuvem</div>
      <p className="muted export-hint">
        Cria uma conta uma vez — daí pra frente tudo sincroniza sozinho. Se trocar de celular, é só entrar de novo
        com o mesmo e-mail e senha.
      </p>
      <div className="mode-toggle">
        <button className={mode === "signup" ? "mode-btn active" : "mode-btn"} onClick={() => setMode("signup")}>
          Criar conta
        </button>
        <button className={mode === "login" ? "mode-btn active" : "mode-btn"} onClick={() => setMode("login")}>
          Já tenho conta
        </button>
      </div>
      <input className="input" type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
      <div className="password-field" style={{ marginTop: 8 }}>
        <input
          className="input"
          type={showPassword ? "text" : "password"}
          placeholder="Senha (mín. 6 caracteres)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setShowPassword((s) => !s)}
          aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {mode === "login" && (
        <button type="button" className="link-btn" style={{ marginTop: 8 }} onClick={handleForgotPassword}>
          Esqueci minha senha
        </button>
      )}
      {msg && (
        <p className="muted export-hint" style={{ marginTop: 8 }}>
          {msg}
        </p>
      )}
      <button
        className="btn-primary"
        disabled={loading || !email.trim() || password.length < 6}
        onClick={handleSubmit}
      >
        <Cloud size={15} /> {loading ? "Aguenta aí…" : mode === "signup" ? "Criar conta e ativar backup" : "Entrar"}
      </button>
    </div>
  );
}

// Notificações push de verdade (chegam com o app fechado) — dependem de
// estar logado na nuvem, porque quem decide se manda o lembrete é a função
// agendada da Supabase, olhando os dados sincronizados desse usuário.
const NOTIFICATION_KINDS = [
  { key: "treino", label: "Lembrete de treino", hasTime: true, defaultTime: 12 },
  { key: "peso", label: "Lembrete de peso", hasTime: true, defaultTime: 9 },
  { key: "agua", label: "Lembrete de água", hasTime: true, defaultTime: 15 },
  { key: "sync", label: "Dias sem sincronizar", hasTime: true, defaultTime: 20 },
  { key: "medidas", label: "Dias sem medir o corpo", hasTime: true, defaultTime: 20 },
  { key: "creatina", label: "Lembrete de creatina", hasTime: true, defaultTime: 10 },
  { key: "backup", label: "Lembrete de backup", hasTime: true, defaultTime: 10 },
  { key: "pr", label: "Novo recorde", hasTime: false },
  { key: "meta", label: "Meta de peso batida", hasTime: false },
];

function NotificationsCard({ session, local, setLocal }) {
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState("default");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const supported = isPushSupported();

  useEffect(() => {
    if (!supported) return;
    setPermission(getPushPermission());
    isPushEnabled().then(setEnabled);
  }, []);

  if (!session) {
    return (
      <div className="card">
        <div className="card-head">Notificações</div>
        <p className="muted export-hint">Faça login no backup na nuvem (aqui embaixo) pra poder ativar notificações.</p>
      </div>
    );
  }

  if (!supported) {
    return (
      <div className="card">
        <div className="card-head">Notificações</div>
        <p className="muted export-hint">Esse navegador não suporta notificações push.</p>
      </div>
    );
  }

  async function handleToggle() {
    setLoading(true);
    setMsg("");
    try {
      if (enabled) {
        await disablePush(session.user.id);
        setEnabled(false);
      } else {
        await enablePush(session.user.id);
        setEnabled(true);
        setPermission(getPushPermission());
      }
    } catch (e) {
      setMsg(e?.message || "Erro inesperado ao configurar notificações.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <div className="card-head">Notificações</div>
      <p className="muted export-hint">
        Lembrete de treino, peso, água, medidas corporais, creatina, dias sem sincronizar e um alô quando bater
        recorde ou meta — chegam mesmo com o app fechado.
      </p>
      {permission === "denied" && (
        <p className="sync-age-warn">
          Notificações bloqueadas nas configurações do navegador/celular — precisa liberar por lá antes de ativar aqui.
        </p>
      )}
      {msg && <p className="sync-age-warn">{msg}</p>}
      <button className={enabled ? "btn-secondary" : "btn-primary"} disabled={loading || permission === "denied"} onClick={handleToggle}>
        {enabled ? <BellOff size={15} /> : <Bell size={15} />}{" "}
        {loading ? "Aguenta aí…" : enabled ? "Desativar notificações" : "Ativar notificações"}
      </button>
      <div className="notif-pref-list">
        {NOTIFICATION_KINDS.map((k) => {
          const prefs = local.notificationPrefs || {};
          const times = local.notificationTimes || {};
          const isOn = prefs[k.key] !== false;
          return (
            <div className="notif-pref-row" key={k.key}>
              <button
                type="button"
                className={"notif-pref-toggle" + (isOn ? " active" : "")}
                onClick={() =>
                  setLocal((prev) => ({
                    ...prev,
                    notificationPrefs: { ...prev.notificationPrefs, [k.key]: !isOn },
                  }))
                }
              >
                <span className="notif-pref-dot" /> {k.label}
              </button>
              {k.hasTime && isOn && (
                <select
                  className="select"
                  value={times[k.key] ?? k.defaultTime}
                  onChange={(e) =>
                    setLocal((prev) => ({
                      ...prev,
                      notificationTimes: { ...prev.notificationTimes, [k.key]: parseInt(e.target.value, 10) },
                    }))
                  }
                >
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h}>
                      {String(h).padStart(2, "0")}h
                    </option>
                  ))}
                </select>
              )}
            </div>
          );
        })}
      </div>
      <VacationModeToggle local={local} setLocal={setLocal} />
    </div>
  );
}

// Pausa TODAS as notificações de uma vez por N dias (viagem, período sem
// treinar, etc.) sem precisar desligar cada tipo manualmente — e sem
// esquecer ligado depois, porque some sozinho na data marcada.
function VacationModeToggle({ local, setLocal }) {
  const pausedUntil = local.notificationsPausedUntil;
  const isPaused = pausedUntil && pausedUntil >= todayISO();
  if (isPaused) {
    return (
      <div className="reminder-banner" style={{ marginTop: 12 }}>
        <PauseCircle size={14} />
        <span>Notificações pausadas até {fmtDateLabel(pausedUntil)}.</span>
        <button type="button" className="link-btn" onClick={() => setLocal({ ...local, notificationsPausedUntil: null })}>
          Retomar agora
        </button>
      </div>
    );
  }
  function pauseFor(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setLocal({ ...local, notificationsPausedUntil: todayISO(d) });
  }
  return (
    <div className="treino-toolbar" style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
      <button type="button" className="treino-toolbar-btn" onClick={() => pauseFor(7)}>
        <PauseCircle size={13} /> Pausar 7 dias
      </button>
      <button type="button" className="treino-toolbar-btn" onClick={() => pauseFor(14)}>
        <PauseCircle size={13} /> Pausar 14 dias
      </button>
    </div>
  );
}

// Não dá pra registrar um "App Intent" de verdade sem ser um app nativo, mas
// um PWA aceita ação por URL — então basta o usuário criar um Atalho no app
// Atalhos do iPhone com a ação "Abrir URL" apontando pra um desses links e
// amarrar numa frase da Siri. Cada link já executa a ação sozinho ao abrir.
const SIRI_SHORTCUTS = [
  { label: "Registrar água (+1 copo)", param: "agua" },
  { label: "Registrar cafeína (+1 dose)", param: "cafe" },
  { label: "Marcar creatina tomada", param: "creatina" },
  { label: "Abrir pra registrar peso", param: "peso" },
];
function SiriShortcutsCard() {
  const [copied, setCopied] = useState("");
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  async function copyLink(param) {
    const url = `${origin}/?tab=hoje&acao=${param}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(param);
      setTimeout(() => setCopied(""), 2000);
    } catch (e) {}
  }
  return (
    <div className="card">
      <div className="card-head">Atalhos rápidos (Siri/Atalhos)</div>
      <p className="muted export-hint">
        Copia o link, cria um Atalho no app Atalhos do iPhone com a ação "Abrir URL" e amarra numa frase pra Siri —
        tipo "Ei Siri, registra água".
      </p>
      {SIRI_SHORTCUTS.map((s) => (
        <div className="meal-row" key={s.param}>
          <div className="meal-name">{s.label}</div>
          <button className="btn-secondary" onClick={() => copyLink(s.param)} style={{ padding: "6px 10px" }}>
            {copied === s.param ? "Copiado!" : "Copiar link"}
          </button>
        </div>
      ))}
      <p className="muted export-hint" style={{ marginTop: 14 }}>
        Sincronizar peso/sono do Apple Saúde: no Atalhos, usa "Obter amostra de saúde" (Peso ou Sono) e depois "Abrir
        URL" colando o valor lido dentro do link — sem precisar digitar nada na hora.
      </p>
      {[
        { label: "Base p/ peso (do Apple Saúde)", param: "peso" },
        { label: "Base p/ sono (do Apple Saúde)", param: "sono" },
      ].map((s) => (
        <div className="meal-row" key={s.param}>
          <div className="meal-name">{s.label}</div>
          <button
            className="btn-secondary"
            onClick={async () => {
              const url = `${origin}/?tab=hoje&acao=${s.param}&valor=`;
              try {
                await navigator.clipboard.writeText(url);
                setCopied(s.param);
                setTimeout(() => setCopied(""), 2000);
              } catch (e) {}
            }}
            style={{ padding: "6px 10px" }}
          >
            {copied === s.param ? "Copiado!" : "Copiar base"}
          </button>
        </div>
      ))}
    </div>
  );
}

function CustomTemplatesCard({ templates, onChange }) {
  const [name, setName] = useState("");
  const [draftExercises, setDraftExercises] = useState([]);
  const [exName, setExName] = useState("");
  const [exSets, setExSets] = useState("3");
  const [exReps, setExReps] = useState("8-12");
  const [exRir, setExRir] = useState("1-2");

  function addExerciseToDraft() {
    if (!exName.trim()) return;
    setDraftExercises((prev) => [
      ...prev,
      {
        id: `custom-${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`,
        n: exName.trim(),
        sets: parseInt(exSets, 10) || 3,
        reps: exReps.trim() || "8-12",
        rir: exRir.trim() || "1-2",
        variations: [],
        equivalents: [],
      },
    ]);
    setExName("");
    setExSets("3");
    setExReps("8-12");
    setExRir("1-2");
  }

  function removeDraftExercise(id) {
    setDraftExercises((prev) => prev.filter((e) => e.id !== id));
  }

  function saveTemplate() {
    if (!name.trim() || draftExercises.length === 0) return;
    const template = { id: `tpl-${Date.now().toString(36)}`, name: name.trim(), exercises: draftExercises };
    onChange([...(templates || []), template]);
    setName("");
    setDraftExercises([]);
  }

  function deleteTemplate(id) {
    onChange((templates || []).filter((t) => t.id !== id));
  }

  return (
    <div className="card">
      <div className="card-head">Templates de treino personalizados</div>
      {(templates || []).length === 0 && (
        <p className="muted export-hint">
          Crie sua própria rotina (ex: "Braço extra") pra usar como opção de dia de treino, além do PPL/Upper-Lower fixo.
        </p>
      )}
      {(templates || []).map((t) => (
        <div className="meal-row" key={t.id}>
          <div className="favorite-info">
            <div className="meal-name">{t.name}</div>
            <div className="muted mono meal-macros">{t.exercises.length} exercício(s)</div>
          </div>
          <button className="icon-btn" onClick={() => deleteTemplate(t.id)} aria-label="Excluir template">
            <Trash2 size={16} />
          </button>
        </div>
      ))}

      <input
        className="input"
        placeholder="Nome do template (ex: Braço extra)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ marginTop: (templates || []).length ? 10 : 0 }}
      />
      {draftExercises.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {draftExercises.map((e) => (
            <div className="meal-row" key={e.id}>
              <div className="favorite-info">
                <div className="meal-name">{e.n}</div>
                <div className="muted mono meal-macros">
                  {e.sets}× {e.reps} · RIR {e.rir}
                </div>
              </div>
              <button className="icon-btn" onClick={() => removeDraftExercise(e.id)} aria-label="Remover exercício">
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
      <input
        className="input"
        placeholder="Nome do exercício"
        value={exName}
        onChange={(e) => setExName(e.target.value)}
        style={{ marginTop: 10 }}
      />
      <div className="macro-inputs">
        <input
          className="input mono"
          placeholder="Séries"
          inputMode="numeric"
          value={exSets}
          onChange={(e) => setExSets(e.target.value.replace(/\D/g, ""))}
        />
        <input className="input mono" placeholder="Reps (ex: 8-12)" value={exReps} onChange={(e) => setExReps(e.target.value)} />
        <input className="input mono" placeholder="RIR (ex: 1-2)" value={exRir} onChange={(e) => setExRir(e.target.value)} />
      </div>
      <button className="btn-secondary" onClick={addExerciseToDraft} disabled={!exName.trim()}>
        <Plus size={15} /> Adicionar exercício ao template
      </button>
      <button className="btn-primary" onClick={saveTemplate} disabled={!name.trim() || draftExercises.length === 0}>
        <Check size={15} /> Salvar template
      </button>
    </div>
  );
}

// Sugestão inicial de macros pela fórmula de Mifflin-St Jeor (TMB) × fator de
// atividade, com proteína alta (2g/kg) fixa e o resto dividido entre carbo e
// gordura — ponto de partida melhor que chutar um número, mas ainda é uma
// estimativa: ajuste depois olhando o TDEE real calculado a partir dos seus
// próprios dados.
const ACTIVITY_FACTORS = [
  { v: 1.2, label: "Sedentário" },
  { v: 1.375, label: "Leve (1-3x/sem)" },
  { v: 1.55, label: "Moderado (3-5x/sem)" },
  { v: 1.725, label: "Ativo (6-7x/sem)" },
  { v: 1.9, label: "Muito ativo" },
];

function MacroCalculator({ onApply }) {
  const [open, setOpen] = useState(false);
  const [sex, setSex] = useState("m");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [age, setAge] = useState("");
  const [activity, setActivity] = useState(1.55);
  const [deficit, setDeficit] = useState("500");

  const w = parseFloat(weight);
  const h = parseFloat(height);
  const a = parseInt(age, 10);
  const canCalc = w > 0 && h > 0 && a > 0;

  let result = null;
  if (canCalc) {
    const bmr = 10 * w + 6.25 * h - 5 * a + (sex === "m" ? 5 : -161);
    const tdee = bmr * activity;
    const targetKcalTraining = Math.max(1200, tdee - (parseFloat(deficit) || 0));
    const targetKcalRest = targetKcalTraining; // mesma meta calórica; só a distribuição de gordura muda no app
    const protein = Math.round(w * 2);
    const fat = Math.round((targetKcalTraining * 0.25) / 9);
    const carb = Math.max(0, Math.round((targetKcalTraining - protein * 4 - fat * 9) / 4));
    result = { bmr: Math.round(bmr), tdee: Math.round(tdee), targetKcal: Math.round(targetKcalTraining), protein, carb, fat };
  }

  return (
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
      <button type="button" className="warmup-toggle" onClick={() => setOpen((s) => !s)}>
        <Lightbulb size={13} /> Calculadora de macros {open ? "▲" : "▼"}
      </button>
      {open && (
        <div style={{ marginTop: 10 }}>
          <div className="mode-toggle">
            <button className={sex === "m" ? "mode-btn active" : "mode-btn"} onClick={() => setSex("m")}>
              Homem
            </button>
            <button className={sex === "f" ? "mode-btn active" : "mode-btn"} onClick={() => setSex("f")}>
              Mulher
            </button>
          </div>
          <div className="macro-inputs">
            <input className="input mono" placeholder="Peso (kg)" inputMode="decimal" value={weight} onChange={(e) => setWeight(sanitizeDecimal(e.target.value))} />
            <input className="input mono" placeholder="Altura (cm)" inputMode="decimal" value={height} onChange={(e) => setHeight(sanitizeDecimal(e.target.value))} />
            <input className="input mono" placeholder="Idade" inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value.replace(/\D/g, ""))} />
          </div>
          <select className="select select-full" value={activity} onChange={(e) => setActivity(parseFloat(e.target.value))} style={{ marginTop: 8 }}>
            {ACTIVITY_FACTORS.map((f) => (
              <option key={f.v} value={f.v}>
                {f.label}
              </option>
            ))}
          </select>
          <div className="schedule-row">
            <span>Déficit calórico (kcal/dia)</span>
            <input
              className="input mono settings-input"
              inputMode="numeric"
              value={deficit}
              onChange={(e) => setDeficit(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          {result && (
            <div className="phase-card">
              <div className="phase-stat-row">
                <span className="muted">TMB / TDEE estimados</span>
                <span className="mono">
                  {result.bmr} / {result.tdee}kcal
                </span>
              </div>
              <div className="phase-stat-row">
                <span className="muted">Meta sugerida</span>
                <span className="mono">
                  {result.protein}g P · {result.carb}g C · {result.fat}g G ({result.targetKcal}kcal)
                </span>
              </div>
            </div>
          )}
          <button
            className="btn-secondary"
            disabled={!result}
            onClick={() =>
              result &&
              onApply({
                Treino: { protein: result.protein, carb: result.carb },
                Descanso: { protein: result.protein, carb: Math.max(0, result.carb - 40) },
              })
            }
          >
            <Check size={15} /> Aplicar essa sugestão
          </button>
          <p className="hint" style={{ marginBottom: 0 }}>
            Ponto de partida — ajuste depois olhando o TDEE real calculado a partir dos seus próprios dados, na aba
            Progresso.
          </p>
        </div>
      )}
    </div>
  );
}

function SettingsSheet({
  settings,
  setSettings,
  logs,
  setLogs,
  onCleanEmptyDays,
  session,
  cloudStatus,
  lastSyncAt,
  recoveryMode,
  onRecoveryDone,
  onClose,
  onShowChangelog,
}) {
  const [local, setLocal] = useState(settings);
  const [newPhase, setNewPhase] = useState({ name: "", start: "", end: "" });
  const [newSupplement, setNewSupplement] = useState("");
  const [importMsg, setImportMsg] = useState("");
  const importInputRef = useRef(null);

  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImportMsg("");
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== "object" || !parsed.logs) {
        setImportMsg("Arquivo não parece um backup válido do Cutting Log.");
        return;
      }
      const dayCount = Object.keys(parsed.logs).length;
      const ok = window.confirm(
        `Isso vai SUBSTITUIR todos os dados atuais pelos do backup (${dayCount} dia(s) registrado(s), exportado em ${
          parsed.exportedAt ? fmtDateLabel(parsed.exportedAt.slice(0, 10)) : "data desconhecida"
        }). Essa ação não tem desfazer. Continuar?`
      );
      if (!ok) return;
      setLogs(parsed.logs || {});
      if (parsed.settings) {
        const merged = { ...DEFAULT_SETTINGS, ...parsed.settings };
        setSettings(merged);
        setLocal(merged);
      }
      setImportMsg("Backup importado com sucesso.");
    } catch (err) {
      setImportMsg("Não consegui ler esse arquivo — confere se é um JSON exportado daqui mesmo.");
    }
  }
  const [pdfBusy, setPdfBusy] = useState(false);

  const storage = useMemo(() => {
    const logsBytes = new Blob([JSON.stringify(logs)]).size;
    const settingsBytes = new Blob([JSON.stringify(settings)]).size;
    const totalBytes = logsBytes + settingsBytes;
    const QUOTA_BYTES = 5 * 1024 * 1024; // 5MB — mínimo garantido pelo Safari
    const dayCount = Object.keys(logs).length;
    const emptyDays = Object.entries(logs).filter(([, v]) => isEmptyDay(v));
    const avgPerDay = dayCount > 0 ? totalBytes / dayCount : 0;
    const daysLeft = avgPerDay > 0 ? Math.floor((QUOTA_BYTES - totalBytes) / avgPerDay) : null;
    return {
      totalBytes,
      pct: Math.min(100, (totalBytes / QUOTA_BYTES) * 100),
      dayCount,
      emptyCount: emptyDays.length,
      yearsLeft: daysLeft != null ? (daysLeft / 365).toFixed(0) : null,
    };
  }, [logs, settings]);

  function addPhase() {
    if (!newPhase.name.trim() || !newPhase.start) return;
    const phase = {
      id: Date.now().toString(36),
      name: newPhase.name.trim(),
      start: newPhase.start,
      end: newPhase.end || null,
    };
    setLocal((prev) => ({ ...prev, phases: [...(prev.phases || []), phase] }));
    setNewPhase({ name: "", start: "", end: "" });
  }
  function removePhase(id) {
    setLocal((prev) => ({ ...prev, phases: (prev.phases || []).filter((p) => p.id !== id) }));
  }
  function fmtPhaseDate(iso) {
    const d = new Date(iso + "T12:00:00");
    return `${d.getDate()}/${d.getMonth() + 1}/${String(d.getFullYear()).slice(2)}`;
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <span>Configurações</span>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <button type="button" className="link-btn" style={{ marginBottom: 10 }} onClick={onShowChangelog}>
          Ver novidades do app
        </button>
        <div className="stack">
          <div className="card">
            <div className="card-head">Aparência</div>
            <div className="mode-toggle">
              <button
                className={local.theme !== "light" ? "mode-btn active" : "mode-btn"}
                onClick={() => setLocal({ ...local, theme: "dark" })}
              >
                Escuro
              </button>
              <button
                className={local.theme === "light" ? "mode-btn active" : "mode-btn"}
                onClick={() => setLocal({ ...local, theme: "light" })}
              >
                Claro
              </button>
            </div>
            <div className="hint phase-date-label" style={{ marginTop: 12 }}>
              Tamanho da fonte (séries e título do dia)
            </div>
            <div className="mode-toggle" style={{ marginBottom: 0 }}>
              {[
                { v: 1, label: "Normal" },
                { v: 1.15, label: "Grande" },
                { v: 1.3, label: "Extra" },
              ].map((opt) => (
                <button
                  key={opt.v}
                  className={(local.fontScale || 1) === opt.v ? "mode-btn active" : "mode-btn"}
                  onClick={() => setLocal({ ...local, fontScale: opt.v })}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
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
                  <option>Upper</option>
                  <option>Lower</option>
                  {(local.customTemplates || []).map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                  <option>Descanso</option>
                </select>
              </div>
            ))}
          </div>
          <CustomTemplatesCard
            templates={local.customTemplates}
            onChange={(next) => setLocal((prev) => ({ ...prev, customTemplates: next }))}
          />
          <div className="card">
            <div className="card-head">Meta de macros diária (g/dia)</div>
            {["Treino", "Descanso"].map((cat) => (
              <div key={cat}>
                <div className="hint phase-date-label" style={{ marginTop: cat === "Treino" ? 0 : 10 }}>
                  Dia de {cat === "Treino" ? "treino" : "descanso"}
                </div>
                <div className="macro-inputs" style={{ gridTemplateColumns: "1fr 1fr", margin: "4px 0 0" }}>
                  <div className="schedule-row">
                    <span>Proteína</span>
                    <input
                      className="input mono settings-input"
                      type="text"
                      inputMode="decimal"
                      value={local.macroTargets[cat].protein}
                      onChange={(e) =>
                        setLocal({
                          ...local,
                          macroTargets: {
                            ...local.macroTargets,
                            [cat]: { ...local.macroTargets[cat], protein: parseFloat(sanitizeDecimal(e.target.value)) || 0 },
                          },
                        })
                      }
                    />
                  </div>
                  <div className="schedule-row">
                    <span>Carbo</span>
                    <input
                      className="input mono settings-input"
                      type="text"
                      inputMode="decimal"
                      value={local.macroTargets[cat].carb}
                      onChange={(e) =>
                        setLocal({
                          ...local,
                          macroTargets: {
                            ...local.macroTargets,
                            [cat]: { ...local.macroTargets[cat], carb: parseFloat(sanitizeDecimal(e.target.value)) || 0 },
                          },
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
            <MacroCalculator
              onApply={(targets) => setLocal((prev) => ({ ...prev, macroTargets: targets }))}
            />
          </div>
          <div className="card">
            <div className="card-head">Meta de água (copos de 250ml/dia)</div>
            <button
              type="button"
              className={"notif-pref-toggle" + (local.waterAuto !== false ? " active" : "")}
              onClick={() => setLocal({ ...local, waterAuto: local.waterAuto === false })}
            >
              <span className="notif-pref-dot" /> Ajustar automaticamente pelo peso (35ml/kg + 500ml em dia de treino)
            </button>
            {local.waterAuto === false && (
              <input
                className="input mono"
                type="text"
                inputMode="numeric"
                style={{ marginTop: 8 }}
                value={local.waterTarget}
                onChange={(e) => setLocal({ ...local, waterTarget: parseInt(e.target.value, 10) || 0 })}
              />
            )}
          </div>
          <div className="card">
            <div className="card-head">Suplementos</div>
            <p className="muted export-hint">Doses restantes é opcional — preenche só se quiser um aviso quando tiver acabando.</p>
            {(local.supplementList || []).map((name) => (
              <div className="meal-row" key={name}>
                <div className="meal-name">{name}</div>
                <input
                  className="input mono"
                  type="text"
                  inputMode="numeric"
                  placeholder="doses"
                  style={{ width: 70, textAlign: "center" }}
                  value={local.supplementStock?.[name] ?? ""}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "");
                    setLocal((prev) => ({
                      ...prev,
                      supplementStock: { ...prev.supplementStock, [name]: v === "" ? undefined : parseInt(v, 10) },
                    }));
                  }}
                />
                <button
                  className="icon-btn"
                  onClick={() =>
                    setLocal((prev) => ({ ...prev, supplementList: prev.supplementList.filter((n) => n !== name) }))
                  }
                  aria-label="Remover suplemento"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
            <input
              className="input"
              placeholder="Nome do suplemento (ex: Ômega 3)"
              value={newSupplement}
              onChange={(e) => setNewSupplement(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newSupplement.trim()) {
                  setLocal((prev) => ({ ...prev, supplementList: [...(prev.supplementList || []), newSupplement.trim()] }));
                  setNewSupplement("");
                }
              }}
              style={{ marginTop: (local.supplementList || []).length ? 10 : 0 }}
            />
            <button
              className="btn-secondary"
              disabled={!newSupplement.trim()}
              onClick={() => {
                setLocal((prev) => ({ ...prev, supplementList: [...(prev.supplementList || []), newSupplement.trim()] }));
                setNewSupplement("");
              }}
            >
              <Plus size={15} /> Adicionar suplemento
            </button>
          </div>
          <div className="card">
            <div className="card-head">Meta de gordura (g/dia)</div>
            <div className="schedule-row">
              <span>Dia de treino</span>
              <input
                className="input mono settings-input"
                type="text"
                inputMode="decimal"
                value={local.fatTraining}
                onChange={(e) => setLocal({ ...local, fatTraining: parseFloat(sanitizeDecimal(e.target.value)) || 0 })}
              />
            </div>
            <div className="schedule-row">
              <span>Dia de descanso</span>
              <input
                className="input mono settings-input"
                type="text"
                inputMode="decimal"
                value={local.fatRest}
                onChange={(e) => setLocal({ ...local, fatRest: parseFloat(sanitizeDecimal(e.target.value)) || 0 })}
              />
            </div>
          </div>
          <div className="card">
            <div className="card-head">Peso inicial (kg)</div>
            <input
              className="input mono"
              type="text"
              inputMode="decimal"
              value={local.startWeight}
              onChange={(e) => setLocal({ ...local, startWeight: parseFloat(sanitizeDecimal(e.target.value)) || 0 })}
            />
          </div>
          <div className="card">
            <div className="card-head">Incremento de anilha (kg)</div>
            <p className="muted export-hint">
              Usado nas sugestões de progressão e na rampa de aquecimento — ajusta pro menor salto de peso que você
              realmente tem disponível.
            </p>
            <input
              className="input mono"
              type="text"
              inputMode="decimal"
              value={local.plateIncrement ?? 2.5}
              onChange={(e) => setLocal({ ...local, plateIncrement: parseFloat(sanitizeDecimal(e.target.value)) || 2.5 })}
            />
          </div>
          <div className="card">
            <div className="card-head">Altura (cm)</div>
            <p className="muted export-hint">Usada só pra estimar o % de gordura (fórmula da Marinha) em Progresso.</p>
            <input
              className="input mono"
              type="text"
              inputMode="numeric"
              placeholder="ex: 178"
              value={local.heightCm ?? ""}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "");
                setLocal({ ...local, heightCm: v === "" ? null : parseInt(v, 10) });
              }}
            />
          </div>
          <div className="card">
            <div className="card-head">Meta de peso final</div>
            <p className="muted export-hint">Define até quando e quanto — o app mostra se o ritmo atual bate com o prazo.</p>
            <div className="phase-date-row">
              <div>
                <div className="hint phase-date-label">Peso alvo (kg)</div>
                <input
                  className="input mono"
                  type="text"
                  inputMode="decimal"
                  placeholder="ex: 68"
                  value={local.goalWeight ?? ""}
                  onChange={(e) => setLocal({ ...local, goalWeight: parseFloat(sanitizeDecimal(e.target.value)) || null })}
                />
              </div>
              <div>
                <div className="hint phase-date-label">Data alvo</div>
                <input
                  className="input mono"
                  type="date"
                  value={local.goalDate || ""}
                  onChange={(e) => setLocal({ ...local, goalDate: e.target.value || null })}
                />
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-head">Mesociclo</div>
            <p className="muted export-hint">
              Define a data de início e a duração — o app avisa a semana de deload antes de chegar, em vez de só
              detectar estagnação depois que já travou.
            </p>
            <div className="phase-date-row">
              <div>
                <div className="hint phase-date-label">Início do ciclo</div>
                <input
                  className="input mono"
                  type="date"
                  value={local.mesocycle?.startDate || ""}
                  onChange={(e) =>
                    setLocal({ ...local, mesocycle: { ...local.mesocycle, startDate: e.target.value || null } })
                  }
                />
              </div>
              <div>
                <div className="hint phase-date-label">Duração (semanas)</div>
                <input
                  className="input mono"
                  type="text"
                  inputMode="numeric"
                  value={local.mesocycle?.weeks ?? 6}
                  onChange={(e) =>
                    setLocal({
                      ...local,
                      mesocycle: { ...local.mesocycle, weeks: parseInt(e.target.value.replace(/\D/g, ""), 10) || 6 },
                    })
                  }
                />
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-head">Fases (corte, manutenção, bulk...)</div>
            {(local.phases || []).length === 0 && (
              <p className="muted export-hint">
                Marque o início (e o fim, quando acabar) de uma fase pra comparar peso perdido × força mantida depois, na aba Progresso.
              </p>
            )}
            {(local.phases || []).map((p) => (
              <div className="meal-row" key={p.id}>
                <div className="favorite-info">
                  <div className="meal-name">{p.name}</div>
                  <div className="muted mono meal-macros">
                    {fmtPhaseDate(p.start)} → {p.end ? fmtPhaseDate(p.end) : "em andamento"}
                  </div>
                </div>
                <button className="icon-btn" onClick={() => removePhase(p.id)} aria-label="Remover fase">
                  <X size={16} />
                </button>
              </div>
            ))}
            <input
              className="input"
              placeholder="Nome da fase (ex: Corte verão 2026)"
              value={newPhase.name}
              onChange={(e) => setNewPhase({ ...newPhase, name: e.target.value })}
              style={{ marginTop: (local.phases || []).length ? 10 : 0 }}
            />
            <div className="phase-date-row">
              <div>
                <div className="hint phase-date-label">Início</div>
                <input
                  className="input mono"
                  type="date"
                  value={newPhase.start}
                  onChange={(e) => setNewPhase({ ...newPhase, start: e.target.value })}
                />
              </div>
              <div>
                <div className="hint phase-date-label">Fim (opcional)</div>
                <input
                  className="input mono"
                  type="date"
                  value={newPhase.end}
                  onChange={(e) => setNewPhase({ ...newPhase, end: e.target.value })}
                />
              </div>
            </div>
            <button className="btn-secondary" onClick={addPhase} disabled={!newPhase.name.trim() || !newPhase.start}>
              <CalendarRange size={15} /> Adicionar fase
            </button>
          </div>
          <CloudBackupCard
            session={session}
            cloudStatus={cloudStatus}
            lastSyncAt={lastSyncAt}
            recoveryMode={recoveryMode}
            onRecoveryDone={onRecoveryDone}
          />
          <NotificationsCard session={session} local={local} setLocal={setLocal} />
          <SiriShortcutsCard />
          <div className="card">
            <div className="card-head">Armazenamento</div>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: storage.pct + "%", background: "var(--push)" }} />
            </div>
            <div className="storage-usage-row mono muted">
              {(storage.totalBytes / 1024).toFixed(1)}KB usados de ~5MB ({storage.pct.toFixed(2)}%)
            </div>
            <p className="muted export-hint">
              {storage.dayCount} dia(s) registrado(s).{" "}
              {storage.yearsLeft != null
                ? `Nesse ritmo, dá pra usar por mais de ${storage.yearsLeft} anos sem se preocupar com espaço.`
                : "Comece a registrar pra ver a estimativa de quanto tempo o espaço dura."}
            </p>
            {storage.emptyCount > 0 && (
              <button
                className="btn-secondary"
                onClick={() => {
                  onCleanEmptyDays();
                }}
              >
                <Trash2 size={15} /> Limpar {storage.emptyCount} dia(s) vazio(s)
              </button>
            )}
          </div>
          <div className="card">
            <div className="card-head">Exportar dados</div>
            <p className="muted export-hint">
              Baixa tudo que foi registrado (treino, dieta, peso, água, cafeína, sono, cardio, medidas) pra analisar depois num Excel/Sheets.
            </p>
            <button className="btn-secondary" onClick={() => exportCSV(logs)}>
              <Download size={15} /> Exportar resumo diário (CSV)
            </button>
            <button
              className="btn-secondary"
              onClick={() => {
                exportJSON(logs, settings);
                const patch = { lastBackupExportAt: todayISO() };
                setSettings((prev) => ({ ...prev, ...patch }));
                setLocal((prev) => ({ ...prev, ...patch }));
              }}
            >
              <Download size={15} /> Exportar backup completo (JSON)
            </button>
            <button
              className="btn-secondary"
              disabled={pdfBusy}
              onClick={async () => {
                setPdfBusy(true);
                try {
                  await generatePdfReport(logs, settings);
                } catch (e) {
                  console.error("pdf export failed", e);
                } finally {
                  setPdfBusy(false);
                }
              }}
            >
              <FileText size={15} /> {pdfBusy ? "Gerando…" : "Exportar resumo em PDF"}
            </button>
          </div>
          <div className="card">
            <div className="card-head">Importar backup</div>
            <p className="muted export-hint">
              Restaura um backup JSON exportado daqui — útil se trocar de celular sem estar logado na nuvem.
            </p>
            <input ref={importInputRef} type="file" accept="application/json" hidden onChange={handleImportFile} />
            <button className="btn-secondary" onClick={() => importInputRef.current?.click()}>
              <Download size={15} style={{ transform: "rotate(180deg)" }} /> Importar backup (JSON)
            </button>
            {importMsg && <p className="muted export-hint">{importMsg}</p>}
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

// Serializa o <svg> do gráfico, troca os var(--cor) pelo valor real (uma
// imagem isolada não tem acesso às variáveis CSS da página), desenha num
// canvas com o fundo do app por trás (o SVG em si é transparente) e devolve
// um PNG — pronto pra compartilhar ou baixar.
async function chartSvgToPngBlob(containerEl) {
  const svg = containerEl?.querySelector("svg");
  if (!svg) return null;
  const clone = svg.cloneNode(true);
  const root = getComputedStyle(document.documentElement);
  const bg = root.getPropertyValue("--surface").trim() || "#28221D";
  let svgString = new XMLSerializer().serializeToString(clone);
  ["--bg", "--surface", "--surface-2", "--border", "--text", "--muted", "--push", "--pull", "--legs", "--upper", "--lower"].forEach(
    (name) => {
      const val = root.getPropertyValue(name).trim();
      if (val) svgString = svgString.split(`var(${name})`).join(val);
    }
  );
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  try {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
    const scale = 2;
    const w = svg.viewBox?.baseVal?.width || svg.clientWidth || img.width;
    const h = svg.viewBox?.baseVal?.height || svg.clientHeight || img.height;
    const canvas = document.createElement("canvas");
    canvas.width = w * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, w, h);
    return await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function shareOrDownloadChart(containerEl, filename) {
  const blob = await chartSvgToPngBlob(containerEl);
  if (!blob) return;
  const file = new File([blob], filename, { type: "image/png" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Cutting Log" });
    } catch (e) {
      // usuário cancelou o compartilhamento — não é erro
    }
  } else {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

function ShareChartButton({ containerRef, filename }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="share-chart-btn"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await shareOrDownloadChart(containerRef.current, filename);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Share2 size={13} /> {busy ? "Gerando…" : "Compartilhar gráfico"}
    </button>
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
  const rows = [
    [
      "data",
      "peso_kg",
      "exercicios_registrados",
      "rpe_sessao",
      "proteina_g",
      "carboidrato_g",
      "gordura_g",
      "kcal",
      "cardio_kcal",
      "agua_copos",
      "cafeina_doses",
      "sono_horas",
      "cintura_cm",
      "pescoco_cm",
      "braco_cm",
      "peito_cm",
      "coxa_cm",
    ],
  ];
  Object.entries(logs)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .forEach(([date, v]) => {
      const meals = v.meals || [];
      const got = meals.reduce(
        (a, m) => ({ protein: a.protein + m.protein, carb: a.carb + m.carb, fat: a.fat + m.fat }),
        { protein: 0, carb: 0, fat: 0 }
      );
      const exCount = v.exercises ? Object.keys(v.exercises).length : 0;
      const cardioKcal = (v.cardio || []).reduce((s, e) => s + e.kcal, 0);
      const m = v.measurements || {};
      rows.push([
        date,
        v.bodyweight ?? "",
        exCount,
        v.sessionRPE ?? "",
        got.protein.toFixed(1),
        got.carb.toFixed(1),
        got.fat.toFixed(1),
        kcal(got.protein, got.carb, got.fat),
        cardioKcal || "",
        v.water ?? "",
        v.caffeine ?? "",
        v.sleepHours ?? "",
        m.waist ?? "",
        m.neck ?? "",
        m.arm ?? "",
        m.chest ?? "",
        m.thigh ?? "",
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
  --upper:#5B7A99;
  --lower:#8B6F9E;
  --desktop-bg:#141110;
  --card-shadow:rgba(0,0,0,0.3);
  --card-shadow-lg:rgba(0,0,0,0.35);
}
:root.theme-light{
  --bg:#FBF6EE;
  --surface:#FFFFFF;
  --surface-2:#F1E9DC;
  --border:#E2D5C2;
  --text:#2A2318;
  --muted:#8A7F6E;
  --desktop-bg:#E8E0D2;
  --card-shadow:rgba(120,100,70,0.15);
  --card-shadow-lg:rgba(120,100,70,0.2);
}

*{box-sizing:border-box;}
html,body{margin:0;padding:0;background:var(--bg);}
#root{min-height:100vh;}
button,select,.input{transition:background-color .15s ease,border-color .15s ease,color .15s ease,opacity .15s ease,transform .1s ease,box-shadow .15s ease;}
button:active:not(:disabled){transform:scale(0.96);}
.app{
  font-family:'IBM Plex Sans',sans-serif;
  background:var(--bg);
  color:var(--text);
  min-height:100vh;
  max-width:480px;
  margin:0 auto;
  display:flex;
  flex-direction:column;
  padding-bottom:calc(76px + env(safe-area-inset-bottom));
}
@media (min-width:640px){
  html,body{background:var(--desktop-bg);}
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
  padding:max(16px, env(safe-area-inset-top)) 18px 14px;
  border-bottom:1px solid var(--border);
}
.brand{display:flex;align-items:center;gap:10px;}
.brand-mark{width:10px;height:10px;border-radius:2px;display:inline-block;}
.brand-title{font-family:'Fraunces',serif;font-weight:650;font-size:19px;letter-spacing:-0.01em;}
.brand-sub{font-size:11.5px;color:var(--muted);margin-top:1px;}
.topbar-actions{display:flex;align-items:center;gap:8px;}
.icon-btn{
  background:var(--surface-2);border:1px solid var(--border);color:var(--text);
  width:44px;height:44px;border-radius:10px;display:flex;align-items:center;justify-content:center;
  cursor:pointer;flex-shrink:0;
}
.cloud-status-icon.synced{color:var(--pull);}
.cloud-status-icon.error{color:var(--legs);}
.cloud-status-icon.syncing{color:var(--push);animation:cloud-pulse 1s ease-in-out infinite;}
@keyframes cloud-pulse{0%,100%{opacity:1;}50%{opacity:0.35;}}

.content{flex:1;padding:16px;}
.stack{display:flex;flex-direction:column;gap:14px;}

.date-row{display:flex;align-items:center;justify-content:center;gap:18px;}
.date-nav{background:none;border:none;color:var(--muted);font-size:20px;cursor:pointer;padding:4px 10px;}
.date-label{font-family:'Fraunces',serif;font-size:15px;font-weight:500;}

.hero-card{
  background:var(--surface);border:1px solid;border-radius:14px;padding:20px;
  box-shadow:0 4px 14px -6px var(--card-shadow-lg);
}
.hero-head-row{display:flex;align-items:center;justify-content:space-between;gap:8px;}
.hero-eyebrow{font-size:12px;font-weight:500;margin-bottom:4px;}
.hero-switch-btn{
  background:none;border:none;color:var(--muted);font-size:11.5px;display:flex;align-items:center;gap:4px;
  cursor:pointer;padding:2px 4px;font-family:'IBM Plex Sans',sans-serif;
}
.hero-title{font-family:'Fraunces',serif;font-size:calc(30px * var(--font-scale, 1));font-weight:650;line-height:1.1;}
.hero-override-note{color:var(--muted);font-size:11.5px;margin-top:4px;}
.link-btn{background:none;border:none;color:var(--push);font-size:11.5px;text-decoration:underline;cursor:pointer;padding:0;font-family:'IBM Plex Sans',sans-serif;}
.day-switch-row{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;}
.day-switch-chip{
  background:transparent;border:1px solid var(--border);border-radius:20px;padding:5px 12px;
  font-size:12px;font-weight:500;cursor:pointer;font-family:'IBM Plex Sans',sans-serif;
}
.hero-progress{color:var(--muted);font-size:13px;margin-top:6px;}
.hero-cta{
  margin-top:16px;background:var(--surface-2);border:1px solid var(--border);color:var(--text);
  padding:10px 14px;border-radius:9px;font-size:13.5px;display:flex;align-items:center;gap:4px;
  cursor:pointer;font-family:'IBM Plex Sans',sans-serif;
}

.card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px;box-shadow:0 2px 10px -6px var(--card-shadow);}
.chart-loading{display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:12.5px;}
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
.input:focus{outline:none;border-color:var(--push);box-shadow:0 0 0 3px rgba(198,144,46,0.15);}
.note-textarea{min-height:72px;resize:vertical;line-height:1.4;}

.section-title{font-family:'Fraunces',serif;font-size:16px;font-weight:650;margin-bottom:2px;}

.exercise-card{padding:14px;position:relative;}
.ex-order-controls{position:absolute;top:8px;right:8px;display:flex;flex-direction:column;gap:4px;}
.order-btn{
  background:var(--surface-2);border:1px solid var(--border);color:var(--muted);
  width:32px;height:28px;border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;
}
.order-btn:disabled{opacity:0.25;cursor:default;}
.ex-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;padding-right:38px;}
.ex-info{min-width:0;flex:1;}
.ex-name-row{display:flex;align-items:center;gap:5px;flex-wrap:wrap;min-width:0;}
.swap-icon{color:var(--muted);flex-shrink:0;}
.ex-name-select{
  background:none;border:none;color:var(--text);font-size:14.5px;font-weight:500;
  font-family:'IBM Plex Sans',sans-serif;padding:0;cursor:pointer;
  min-width:0;max-width:100%;flex:1 1 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}
.variation-chip{
  background:var(--surface-2);border:1px solid var(--border);color:var(--push);
  border-radius:20px;padding:2px 8px;font-size:10.5px;font-family:'IBM Plex Sans',sans-serif;
  cursor:pointer;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex-shrink:0;
}
.grip-chip{color:var(--pull);}
.ex-meta{font-size:11.5px;color:var(--muted);margin-top:2px;}
.sub-note{color:var(--legs);}
.ex-last-col{display:flex;flex-direction:column;align-items:flex-end;gap:5px;flex-shrink:0;}
.ex-last-badge{
  background:var(--surface-2);border:1px solid var(--border);border-radius:7px;
  padding:5px 8px;font-size:11px;text-align:right;line-height:1.35;max-width:120px;
}
.repeat-last-btn{
  background:none;border:none;color:var(--push);font-size:10.5px;display:flex;align-items:center;gap:3px;
  cursor:pointer;padding:2px 0;font-family:'IBM Plex Sans',sans-serif;
}
.share-chart-btn{
  background:none;border:none;color:var(--muted);font-size:11.5px;display:flex;align-items:center;gap:5px;
  cursor:pointer;padding:8px 0 0;font-family:'IBM Plex Sans',sans-serif;margin:0 auto;
}
.share-chart-btn:disabled{opacity:0.5;}
.muted-sm{color:var(--muted);font-size:9.5px;display:block;text-transform:lowercase;}
.suggestion{
  display:flex;align-items:center;gap:6px;font-size:12px;margin-top:8px;padding:7px 10px;border-radius:7px;
}
.suggestion.up{background:rgba(198,144,46,0.15);color:var(--push);}
.suggestion.hold{background:var(--surface-2);color:var(--muted);}
.suggestion.pr{background:rgba(198,144,46,0.28);color:var(--push);border:1px solid rgba(198,144,46,0.5);font-weight:600;box-shadow:0 0 0 3px rgba(198,144,46,0.08);}
.suggestion.deload{background:rgba(177,90,52,0.16);color:var(--legs);border:1px solid rgba(177,90,52,0.35);}

.set-grid{margin-top:12px;}
.set-grid-head, .set-grid-row{
  display:grid;grid-template-columns:32px 1fr 1fr;gap:8px;align-items:center;margin-bottom:8px;
}
.set-grid-head{font-size:11px;grid-template-columns:32px 1fr 1fr auto;}
.set-grid-row.has-side{grid-template-columns:32px 1fr 1fr auto;}
.set-input{padding:12px 9px;text-align:center;font-size:calc(15px * var(--font-scale, 1));}
.side-btn{
  background:var(--surface-2);border:1px solid var(--border);color:var(--muted);border-radius:8px;
  width:32px;height:38px;font-size:12px;cursor:pointer;font-family:'IBM Plex Mono',monospace;flex-shrink:0;
}

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
.btn-primary.btn-saved{background:var(--pull);color:#1E1A16;}
.btn-secondary{
  width:100%;background:var(--surface-2);color:var(--text);border:1px solid var(--border);border-radius:9px;padding:10px;
  font-size:13px;display:flex;align-items:center;justify-content:center;gap:6px;cursor:pointer;
  font-family:'IBM Plex Sans',sans-serif;margin-top:8px;
}
.export-hint{font-size:12px;margin-bottom:4px;}
.storage-usage-row{font-size:11.5px;margin-top:6px;}
.cloud-email{color:var(--text);word-break:break-all;}
.sync-age-warn{color:var(--legs);font-size:12px;margin:6px 0 0;}
.password-field{position:relative;}
.password-field .input{padding-right:40px;}
.password-toggle{
  position:absolute;top:50%;right:6px;transform:translateY(-50%);
  background:none;border:none;color:var(--muted);cursor:pointer;
  width:32px;height:32px;display:flex;align-items:center;justify-content:center;padding:0;
}
.phase-date-row{display:flex;flex-direction:column;gap:8px;margin-top:8px;}
.phase-date-row input{min-width:0;}
.phase-date-label{margin-top:0;margin-bottom:4px;}

.meal-row{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-top:1px solid var(--border);}
.meal-row:first-of-type{border-top:none;}
.meal-name{font-size:13.5px;}
.meal-macros{font-size:11.5px;margin-top:2px;}

.favorite-row{gap:10px;}
.favorite-info{min-width:0;flex:1;}
.favorite-actions{display:flex;gap:6px;flex-shrink:0;}
.favorite-add{color:var(--push);border-color:var(--push);}
.favorite-rename-input{flex:1;}

.empty-state{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:28px 18px;text-align:center;}
.empty-title{font-family:'Fraunces',serif;font-size:18px;font-weight:650;margin-bottom:6px;}

.tone-down{color:var(--pull);}
.tone-up{color:var(--legs);}

.phase-card{padding:12px 0;border-top:1px solid var(--border);}
.phase-card:first-of-type{border-top:none;padding-top:0;}
.phase-card-head{display:flex;align-items:center;gap:8px;margin-bottom:8px;}
.phase-name{font-family:'Fraunces',serif;font-weight:650;font-size:14.5px;}
.phase-ongoing-tag{
  background:rgba(76,139,130,0.16);color:var(--pull);border:1px solid rgba(76,139,130,0.35);
  border-radius:20px;padding:1px 8px;font-size:10px;font-family:'IBM Plex Sans',sans-serif;
}
.phase-stat-row{display:flex;justify-content:space-between;align-items:baseline;font-size:12.5px;padding:4px 0;gap:10px;}
.goal-verdict{margin-top:10px;padding:9px 12px;border-radius:9px;font-size:12.5px;font-weight:500;}
.goal-verdict.good{background:rgba(76,139,130,0.15);color:var(--pull);}
.goal-verdict.warn{background:rgba(177,90,52,0.15);color:var(--legs);}
.goal-verdict.neutral{background:var(--surface-2);color:var(--muted);}

.hist-row{display:grid;grid-template-columns:60px 60px 1fr auto;gap:8px;align-items:center;font-size:12.5px;padding:7px 0;border-top:1px solid var(--border);}
.hist-row:first-of-type{border-top:none;}
.hist-tag{font-weight:500;}
.hist-swap-dot{font-size:6px;vertical-align:super;margin-left:2px;}

.tabbar{
  position:fixed;bottom:0;left:50%;transform:translateX(-50%);
  width:100%;max-width:480px;
  background:var(--surface);border-top:1px solid var(--border);
  display:flex;padding:8px 6px calc(12px + env(safe-area-inset-bottom));
}
.tab-btn{
  flex:1;background:none;border:none;color:var(--muted);display:flex;flex-direction:column;align-items:center;gap:3px;
  font-size:10.5px;padding:8px 0;min-height:44px;cursor:pointer;font-family:'IBM Plex Sans',sans-serif;
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

.streak-badge{
  display:flex;align-items:center;gap:3px;background:rgba(198,144,46,0.15);color:var(--push);
  border-radius:20px;padding:4px 9px;font-size:11.5px;font-weight:600;
}

.water-row{display:flex;align-items:center;justify-content:space-between;gap:10px;}
.water-btn{
  background:var(--surface-2);border:1px solid var(--border);color:var(--text);
  width:40px;height:40px;border-radius:9px;display:flex;align-items:center;justify-content:center;
  cursor:pointer;flex-shrink:0;
}
.water-btn:disabled{opacity:0.35;cursor:default;}
.water-count{display:flex;align-items:center;gap:6px;color:var(--upper);font-size:15px;font-weight:500;}

.progress-photo{width:100%;border-radius:10px;display:block;margin-bottom:10px;border:1px solid var(--border);}
.photo-compare-row{display:flex;gap:10px;margin-top:10px;}
.photo-compare-col{flex:1;min-width:0;}

.e1rm-note{font-size:11px;margin-top:3px;}

.rest-timer-row{
  margin-top:12px;padding-top:12px;border-top:1px solid var(--border);
  display:flex;align-items:center;gap:8px;flex-wrap:wrap;
}
.rest-timer-label{display:flex;align-items:center;gap:4px;font-size:12px;}
.rest-timer-btn{
  background:var(--surface-2);border:1px solid var(--border);color:var(--text);border-radius:20px;
  padding:5px 12px;font-size:12px;cursor:pointer;font-family:'IBM Plex Sans',sans-serif;
}
.rest-timer-active{
  display:flex;align-items:center;gap:5px;background:rgba(198,144,46,0.15);color:var(--push);
  border-radius:20px;padding:6px 14px;font-size:15px;font-weight:600;
}
.rest-timer-active.rest-timer-done{background:rgba(76,139,130,0.18);color:var(--pull);}
.rest-timer-cancel{
  background:none;border:none;color:var(--muted);font-size:12px;text-decoration:underline;
  cursor:pointer;padding:0;font-family:'IBM Plex Sans',sans-serif;
}

.pr-hist-row{grid-template-columns:60px 1fr auto;}
.pr-hist-name{font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;}
.pr-hist-weight{display:flex;align-items:center;gap:4px;color:var(--push);font-weight:600;}

.superset-connector{
  display:flex;align-items:center;gap:5px;color:var(--upper);font-size:10.5px;
  margin:-14px -14px 10px;padding:6px 14px;background:rgba(91,122,153,0.12);border-bottom:1px solid var(--border);
  border-radius:12px 12px 0 0;
}
.ex-linked-prev{margin-top:-6px;}
.superset-toggle{
  background:none;border:none;color:var(--muted);font-size:10.5px;display:flex;align-items:center;gap:4px;
  cursor:pointer;padding:4px 0 0;font-family:'IBM Plex Sans',sans-serif;
}
.superset-toggle.active{color:var(--upper);}

.warmup-block{margin-top:10px;}
.warmup-toggle{
  background:none;border:none;color:var(--muted);font-size:11.5px;display:flex;align-items:center;gap:5px;
  cursor:pointer;padding:0;font-family:'IBM Plex Sans',sans-serif;
}
.warmup-steps{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;font-size:12px;color:var(--text);}
.warmup-steps span{background:var(--surface-2);border:1px solid var(--border);border-radius:7px;padding:4px 8px;}

.workout-duration{display:flex;align-items:center;gap:5px;font-size:12px;margin-top:-6px;}

.rir-felt-row{
  margin-top:12px;padding-top:12px;border-top:1px solid var(--border);
  display:flex;align-items:center;gap:6px;flex-wrap:wrap;
}
.rir-felt-label{font-size:11.5px;}
.rir-felt-chip{
  background:var(--surface-2);border:1px solid var(--border);color:var(--text);border-radius:20px;
  width:30px;height:30px;font-size:12px;cursor:pointer;font-family:'IBM Plex Sans',sans-serif;
}
.rir-felt-chip.active{color:#1E1A16;background:var(--push);border-color:var(--push);font-weight:600;}

.pain-row{margin-top:10px;}
.pain-toggle{
  background:none;border:none;color:var(--muted);font-size:11.5px;display:flex;align-items:center;gap:5px;
  cursor:pointer;padding:0;font-family:'IBM Plex Sans',sans-serif;
}
.pain-toggle.active{color:var(--legs);}
.pain-input{margin-top:8px;}

.supplement-list{display:flex;flex-wrap:wrap;gap:8px;}
.supplement-chip{
  background:var(--surface-2);border:1px solid var(--border);color:var(--muted);border-radius:20px;
  padding:8px 14px;font-size:12.5px;display:flex;align-items:center;gap:6px;cursor:pointer;
  font-family:'IBM Plex Sans',sans-serif;
}
.supplement-chip.active{color:var(--pull);border-color:var(--pull);background:rgba(76,139,130,0.12);}

.heatmap-grid{display:flex;gap:3px;overflow-x:auto;padding-bottom:4px;}
.heatmap-col{display:flex;flex-direction:column;gap:3px;flex-shrink:0;}
.heatmap-cell{width:11px;height:11px;border-radius:2.5px;}
.heatmap-cell-empty{background:transparent;}

.treino-toolbar{display:flex;gap:8px;flex-wrap:wrap;margin-top:-4px;}
.treino-toolbar-btn{
  background:var(--surface-2);border:1px solid var(--border);color:var(--text);border-radius:20px;
  padding:7px 13px;font-size:12px;display:flex;align-items:center;gap:5px;cursor:pointer;
  font-family:'IBM Plex Sans',sans-serif;
}
.treino-toolbar-btn.active{color:var(--push);border-color:var(--push);background:rgba(198,144,46,0.12);}

.undo-toast{
  position:fixed;left:50%;transform:translateX(-50%);bottom:calc(84px + env(safe-area-inset-bottom));
  z-index:60;background:var(--surface-2);border:1px solid var(--border);color:var(--text);
  border-radius:10px;padding:10px 14px;display:flex;align-items:center;gap:14px;font-size:13px;
  box-shadow:0 8px 24px -8px var(--card-shadow-lg);max-width:calc(100% - 32px);
}
.undo-toast button{
  background:none;border:none;color:var(--push);font-weight:600;font-size:13px;cursor:pointer;padding:0;
  font-family:'IBM Plex Sans',sans-serif;flex-shrink:0;
}

.notif-pref-list{margin-top:12px;padding-top:12px;border-top:1px solid var(--border);display:flex;flex-direction:column;gap:8px;}
.notif-pref-row{display:flex;align-items:center;justify-content:space-between;gap:8px;}
.notif-pref-toggle{
  background:none;border:none;color:var(--muted);font-size:13px;display:flex;align-items:center;gap:8px;
  cursor:pointer;padding:0;font-family:'IBM Plex Sans',sans-serif;text-align:left;
}
.notif-pref-dot{width:9px;height:9px;border-radius:50%;background:var(--border);flex-shrink:0;}
.notif-pref-toggle.active{color:var(--text);}
.notif-pref-toggle.active .notif-pref-dot{background:var(--pull);}

.tip-toggle{
  background:var(--surface-2);border:1px solid var(--border);color:var(--muted);border-radius:50%;
  width:16px;height:16px;font-size:10px;line-height:1;cursor:pointer;padding:0;margin-left:4px;
  display:inline-flex;align-items:center;justify-content:center;font-family:'IBM Plex Sans',sans-serif;vertical-align:1px;
}
.tip-text{font-size:11.5px;color:var(--muted);margin-top:4px;line-height:1.4;font-style:italic;}

.share-card-svg-wrap{margin-top:12px;}
.share-card-svg-wrap svg{width:100%;height:auto;border-radius:16px;display:block;}

.tour-card{
  background:var(--bg);width:100%;max-width:360px;border-radius:18px;padding:28px 24px;
  border:1px solid var(--border);text-align:center;position:relative;margin:16px;
}
.tour-skip{position:absolute;top:10px;right:10px;width:32px;height:32px;}
.tour-icon{
  width:56px;height:56px;border-radius:50%;background:rgba(198,144,46,0.15);color:var(--push);
  display:flex;align-items:center;justify-content:center;margin:0 auto 16px;
}
.tour-title{font-family:'Fraunces',serif;font-size:20px;font-weight:650;margin-bottom:8px;}
.tour-text{font-size:13.5px;color:var(--muted);line-height:1.5;margin-bottom:18px;}
.tour-dots{display:flex;justify-content:center;gap:6px;margin-bottom:18px;}
.tour-dot{width:6px;height:6px;border-radius:50%;background:var(--border);}
.tour-dot.active{background:var(--push);width:16px;border-radius:4px;}

.changelog-list{margin:0;padding-left:18px;font-size:12.5px;line-height:1.8;color:var(--text);}

.mic-btn{
  background:var(--surface-2);border:1px solid var(--border);color:var(--muted);border-radius:20px;
  width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;padding:0;
}
.mic-btn.listening{color:var(--legs);border-color:var(--legs);animation:cloud-pulse 1s ease-in-out infinite;}
`;
