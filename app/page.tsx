"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./relax.module.css";

const CELL_COUNT = 96;
const SAVE_KEY = "stillgarden-v2";
const LEGACY_SAVE_KEY = "stillgarden-v1";
const SENSORY_KEY = "stillgarden-sensory";
const DEW_PER_PATCH = 2;
const GLIMMER_BONUS = 8;

const themes = [
  { id: "fern", name: "Fern", description: "soft greens and pale stone", unlockLevel: 1, cost: 0, accent: "#6f8f74", accent2: "#b7c7a7", ground: "#ecebe6" },
  { id: "wildflower", name: "Wildflower", description: "dusty rose with tiny blooms", unlockLevel: 2, cost: 120, accent: "#a37483", accent2: "#d7b8bd", ground: "#f1e9e7" },
  { id: "stonewater", name: "Stonewater", description: "cool mineral blue and mist", unlockLevel: 3, cost: 220, accent: "#668899", accent2: "#abc3ca", ground: "#e9eeef" },
  { id: "sunclay", name: "Sunclay", description: "warm earth with gold light", unlockLevel: 4, cost: 320, accent: "#a67a5f", accent2: "#d7bb8f", ground: "#f0e9df" },
  { id: "moonmoss", name: "Moonmoss", description: "violet dusk and silver leaves", unlockLevel: 5, cost: 460, accent: "#77748e", accent2: "#b6aec7", ground: "#e9e7ee" },
] as const;

const relics = [
  { id: "dewpearl", name: "Dew Pearl", note: "A clear drop that never falls.", unlockGardens: 1 },
  { id: "quietseed", name: "Quiet Seed", note: "Warm in the hand, even at dusk.", unlockGardens: 2 },
  { id: "rainglass", name: "Rain Glass", note: "Keeps the sound of a distant shower.", unlockGardens: 5 },
  { id: "moonbell", name: "Moon Bell", note: "It moves, but never rings loudly.", unlockGardens: 8 },
  { id: "sunstone", name: "Sun Stone", note: "A small piece of late-afternoon light.", unlockGardens: 12 },
  { id: "starmoss", name: "Star Moss", note: "Tiny silver points appear after dark.", unlockGardens: 18 },
] as const;

const curios = [
  { id: "glass-acorn", name: "Glass Acorn" },
  { id: "moth-coin", name: "Moth Coin" },
  { id: "tiny-key", name: "Tiny Key" },
  { id: "amber-bead", name: "Amber Bead" },
  { id: "river-button", name: "River Button" },
  { id: "weather-charm", name: "Weather Charm" },
] as const;

const environments = [
  { id: "meadow", name: "Quiet Meadow", unlockGardens: 0, glow: "#d7e0cc", surface: "#8a927b" },
  { id: "shallows", name: "Rain Shallows", unlockGardens: 3, glow: "#c9dce1", surface: "#738b91" },
  { id: "grove", name: "Lantern Grove", unlockGardens: 7, glow: "#dfd2ae", surface: "#68735f" },
  { id: "moonpond", name: "Moon Pond", unlockGardens: 12, glow: "#c9c6db", surface: "#686b7c" },
  { id: "glasshouse", name: "Glasshouse", unlockGardens: 18, glow: "#d7e4d9", surface: "#768c82" },
] as const;

const fieldModes = [
  { id: "meadow", name: "Soft Meadow", note: "A free sweep. Hidden leaves are the main surprise." },
  { id: "breeze", name: "Breeze Lines", note: "Wind-marked patches carry a sweep sideways through the row." },
  { id: "rain", name: "Rain Pockets", note: "Blue pools burst outward when your sweep reaches them." },
  { id: "roots", name: "Rootweave", note: "Root knots loosen on the first stroke and bloom on the second." },
] as const;

const species = [
  { id: "clover", name: "Cloud Clover", rarity: 1, growMs: 45_000, color: "#82a277", note: "A forgiving first grower." },
  { id: "fern", name: "Button Fern", rarity: 1, growMs: 65_000, color: "#5f8068", note: "Unfurls in compact spirals." },
  { id: "poppy", name: "Dust Poppy", rarity: 1, growMs: 80_000, color: "#b97f82", note: "Papery petals and warm seeds." },
  { id: "rainmint", name: "Rainmint", rarity: 2, growMs: 105_000, color: "#6f98a0", note: "Cool leaves with silver edges." },
  { id: "moonbell", name: "Moonbell", rarity: 2, growMs: 130_000, color: "#8583a2", note: "A pale bell that opens late." },
  { id: "sunreed", name: "Sunreed", rarity: 2, growMs: 155_000, color: "#b79561", note: "Tall stems that hold warm light." },
  { id: "roseclover", name: "Rose Clover", rarity: 3, growMs: 170_000, color: "#ad7f8d", note: "A clover-poppy cross." , parents: ["clover", "poppy"] },
  { id: "mossmint", name: "Mossmint", rarity: 3, growMs: 185_000, color: "#688c77", note: "Fern softness with rainmint scent.", parents: ["fern", "rainmint"] },
  { id: "duskbell", name: "Dusk Bell", rarity: 3, growMs: 200_000, color: "#777792", note: "Moonbell crossed with rainmint.", parents: ["moonbell", "rainmint"] },
  { id: "emberpetal", name: "Ember Petal", rarity: 3, growMs: 215_000, color: "#b37d69", note: "Sunreed warmth in poppy petals.", parents: ["sunreed", "poppy"] },
  { id: "miststar", name: "Mist Star", rarity: 4, growMs: 230_000, color: "#8c96a7", note: "A quiet clover-moonbell hybrid.", parents: ["clover", "moonbell"] },
  { id: "goldfern", name: "Gold Fern", rarity: 4, growMs: 245_000, color: "#9a936b", note: "Sunreed light caught in fern fronds.", parents: ["sunreed", "fern"] },
  { id: "wildstar", name: "Wild Star", rarity: 5, growMs: 280_000, color: "#9a86a8", note: "A rare mutation from uncertain crosses." },
] as const;

const LEVEL_THRESHOLDS = [0, 50, 140, 260, 420, 620, 860, 1140, 1480, 1880, 2340, 2860];

type ThemeId = (typeof themes)[number]["id"];
type RelicId = (typeof relics)[number]["id"];
type CurioId = (typeof curios)[number]["id"];
type SpeciesId = (typeof species)[number]["id"];
type FieldMode = (typeof fieldModes)[number];
type ViewId = "field" | "grow" | "collection";

type Plot = {
  species: SpeciesId | null;
  plantedAt: number;
  readyAt: number;
  watered: boolean;
  fertilized: boolean;
};

type GameState = {
  stage: number;
  restored: number[];
  dew: number;
  lifetimeRestored: number;
  completedGardens: number;
  ownedThemes: ThemeId[];
  equippedTheme: ThemeId;
  discoveredRelics: RelicId[];
  seeds: Record<SpeciesId, number>;
  discoveredSpecies: SpeciesId[];
  harvested: Record<SpeciesId, number>;
  plots: Plot[];
  potsUnlocked: number;
  shovelLevel: number;
  waterLevel: number;
  fertilizer: number;
  curios: CurioId[];
  revealedCaches: number[];
  crackedRoots: number[];
};

type FindEvent = { kind: "dew" | "seed" | "curio"; label: string; detail: string };

type RestoreResult = {
  state: GameState;
  changed: boolean;
  restoredCount: number;
  glimmerCount: number;
  finds: FindEvent[];
  message?: string;
};

const emptySeeds = () => Object.fromEntries(species.map((item) => [item.id, 0])) as Record<SpeciesId, number>;
const emptyHarvested = () => Object.fromEntries(species.map((item) => [item.id, 0])) as Record<SpeciesId, number>;
const emptyPlot = (): Plot => ({ species: null, plantedAt: 0, readyAt: 0, watered: false, fertilized: false });

function createInitialState(): GameState {
  const seeds = emptySeeds();
  seeds.clover = 2;
  seeds.fern = 1;
  return {
    stage: 1,
    restored: [],
    dew: 0,
    lifetimeRestored: 0,
    completedGardens: 0,
    ownedThemes: ["fern"],
    equippedTheme: "fern",
    discoveredRelics: [],
    seeds,
    discoveredSpecies: ["clover", "fern"],
    harvested: emptyHarvested(),
    plots: [emptyPlot(), emptyPlot(), emptyPlot(), emptyPlot()],
    potsUnlocked: 2,
    shovelLevel: 1,
    waterLevel: 1,
    fertilizer: 2,
    curios: [],
    revealedCaches: [],
    crackedRoots: [],
  };
}

function seeded(seed: number) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function levelFor(total: number) {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i += 1) if (total >= LEVEL_THRESHOLDS[i]) level = i + 1;
  return level;
}

function environmentFor(completedGardens: number) {
  let current = environments[0];
  for (const environment of environments) if (completedGardens >= environment.unlockGardens) current = environment;
  return current;
}

function modeFor(stage: number): FieldMode {
  return fieldModes[(stage - 1) % fieldModes.length];
}

function uniqueStageCells(stage: number, salt: number, count: number) {
  const picked: number[] = [];
  let step = 0;
  while (picked.length < count && step < 500) {
    const index = Math.floor(seeded(stage * 101 + salt * 997 + step * 37) * CELL_COUNT);
    if (!picked.includes(index)) picked.push(index);
    step += 1;
  }
  return picked;
}

function cacheCellsFor(state: GameState) {
  return uniqueStageCells(state.stage, 41, Math.min(8, 4 + state.shovelLevel));
}

function specialCellsFor(stage: number) {
  return uniqueStageCells(stage, 83, 6);
}

function isGlimmerCell(index: number, stage: number) {
  return (index * 17 + stage * 11) % 31 === 0;
}

function availableBaseSeeds(stage: number): SpeciesId[] {
  const bases: SpeciesId[] = ["clover", "fern", "poppy", "rainmint", "moonbell", "sunreed"];
  return bases.slice(0, Math.min(bases.length, 2 + Math.floor(stage / 2)));
}

function rewardForCache(state: GameState, cacheIndex: number, ordinal: number): { state: GameState; event: FindEvent } {
  const roll = seeded(state.stage * 313 + cacheIndex * 17 + state.shovelLevel * 43);
  if (ordinal === 0 || roll < 0.3 + state.shovelLevel * 0.035) {
    const pool = availableBaseSeeds(state.stage);
    const seedId = pool[Math.floor(seeded(state.stage * 73 + cacheIndex * 29) * pool.length)] ?? "clover";
    const item = species.find((entry) => entry.id === seedId)!;
    return {
      state: {
        ...state,
        seeds: { ...state.seeds, [seedId]: state.seeds[seedId] + 1 },
        discoveredSpecies: state.discoveredSpecies.includes(seedId) ? state.discoveredSpecies : [...state.discoveredSpecies, seedId],
      },
      event: { kind: "seed", label: `${item.name} seed`, detail: "hidden under the leaves" },
    };
  }

  if ((ordinal === 1 && state.stage > 1) || roll > 0.87) {
    const curio = curios[Math.floor(seeded(cacheIndex * 91 + state.stage * 7) * curios.length)] ?? curios[0];
    const alreadyOwned = state.curios.includes(curio.id);
    return {
      state: alreadyOwned
        ? { ...state, dew: state.dew + 35 }
        : { ...state, curios: [...state.curios, curio.id] },
      event: alreadyOwned
        ? { kind: "dew", label: "+35 Dew", detail: `a familiar ${curio.name} dissolved into Dew` }
        : { kind: "curio", label: curio.name, detail: "a rare buried curio" },
    };
  }

  const amount = 18 + Math.floor(seeded(cacheIndex * 59 + state.stage * 23) * 26) + state.shovelLevel * 3;
  return {
    state: { ...state, dew: state.dew + amount },
    event: { kind: "dew", label: `+${amount} Dew`, detail: "a pocket collected from beneath the leaves" },
  };
}

function applyRestore(source: GameState, index: number): RestoreResult {
  if (source.restored.includes(index)) return { state: source, changed: false, restoredCount: 0, glimmerCount: 0, finds: [] };

  const mode = modeFor(source.stage);
  const specials = specialCellsFor(source.stage);
  const isSpecial = specials.includes(index);

  if (mode.id === "roots" && isSpecial && !source.crackedRoots.includes(index)) {
    return {
      state: { ...source, crackedRoots: [...source.crackedRoots, index] },
      changed: true,
      restoredCount: 0,
      glimmerCount: 0,
      finds: [],
      message: "root loosened · one more stroke",
    };
  }

  const restored = new Set(source.restored);
  const targets = new Set<number>([index]);
  const add = (value: number) => { if (value >= 0 && value < CELL_COUNT) targets.add(value); };
  const row = Math.floor(index / 12);
  const addSameRow = (value: number) => { if (value >= row * 12 && value < row * 12 + 12) add(value); };

  if ((index * 5 + source.stage) % 19 === 0) add(index + (index % 2 === 0 ? 1 : -1));
  if (mode.id === "breeze" && isSpecial) {
    addSameRow(index - 2); addSameRow(index - 1); addSameRow(index + 1); addSameRow(index + 2);
  }
  if (mode.id === "rain" && isSpecial) {
    add(index - 12); add(index + 12); addSameRow(index - 1); addSameRow(index + 1);
  }
  if (mode.id === "roots" && isSpecial) {
    add(index - 12); add(index + 12); addSameRow(index - 1); addSameRow(index + 1);
  }

  const fresh = [...targets].filter((target) => !restored.has(target));
  fresh.forEach((target) => restored.add(target));
  const glimmerCount = fresh.filter((target) => isGlimmerCell(target, source.stage)).length;
  let next: GameState = {
    ...source,
    restored: [...restored],
    dew: source.dew + fresh.length * DEW_PER_PATCH + glimmerCount * GLIMMER_BONUS,
    lifetimeRestored: source.lifetimeRestored + fresh.length,
  };

  const caches = cacheCellsFor(source);
  const finds: FindEvent[] = [];
  for (const target of fresh) {
    const ordinal = caches.indexOf(target);
    if (ordinal >= 0 && !next.revealedCaches.includes(target)) {
      const rewarded = rewardForCache(next, target, ordinal);
      next = { ...rewarded.state, revealedCaches: [...rewarded.state.revealedCaches, target] };
      finds.push(rewarded.event);
    }
  }

  const chainLabel = mode.id === "breeze" ? "wind line" : mode.id === "rain" ? "rain burst" : mode.id === "roots" ? "root bloom" : "bloom chain";
  return {
    state: next,
    changed: true,
    restoredCount: fresh.length,
    glimmerCount,
    finds,
    message: fresh.length > 2 ? `${chainLabel} · ${fresh.length} patches` : undefined,
  };
}

function normalizeState(raw: unknown): GameState {
  const base = createInitialState();
  if (!raw || typeof raw !== "object") return base;
  const saved = raw as Partial<GameState> & { stage?: number; restored?: number[] };
  const validSpecies = new Set(species.map((item) => item.id));
  const validThemes = new Set(themes.map((item) => item.id));
  const validRelics = new Set(relics.map((item) => item.id));
  const validCurios = new Set(curios.map((item) => item.id));
  const seeds = emptySeeds();
  const harvested = emptyHarvested();
  if (saved.seeds) for (const [key, value] of Object.entries(saved.seeds)) if (validSpecies.has(key as SpeciesId)) seeds[key as SpeciesId] = Math.max(0, Number(value) || 0);
  else { seeds.clover = 2; seeds.fern = 1; }
  if (saved.harvested) for (const [key, value] of Object.entries(saved.harvested)) if (validSpecies.has(key as SpeciesId)) harvested[key as SpeciesId] = Math.max(0, Number(value) || 0);

  const stage = Math.max(1, Number(saved.stage) || 1);
  const restored = Array.isArray(saved.restored) ? [...new Set(saved.restored.filter((n): n is number => Number.isInteger(n) && n >= 0 && n < CELL_COUNT))] : [];
  const completedGardens = Math.max(0, Number(saved.completedGardens) || stage - 1);
  const lifetimeRestored = Math.max(0, Number(saved.lifetimeRestored) || (stage - 1) * CELL_COUNT + restored.length);
  const discoveredRelics = relics.filter((item) => completedGardens >= item.unlockGardens).map((item) => item.id);
  const savedRelics = Array.isArray(saved.discoveredRelics) ? saved.discoveredRelics.filter((id): id is RelicId => validRelics.has(id as RelicId)) : [];

  return {
    ...base,
    ...saved,
    stage,
    restored,
    completedGardens,
    lifetimeRestored,
    dew: Math.max(0, Number(saved.dew) || 0),
    ownedThemes: Array.isArray(saved.ownedThemes) ? saved.ownedThemes.filter((id): id is ThemeId => validThemes.has(id as ThemeId)) : ["fern"],
    equippedTheme: typeof saved.equippedTheme === "string" && validThemes.has(saved.equippedTheme as ThemeId) ? saved.equippedTheme as ThemeId : "fern",
    discoveredRelics: [...new Set([...savedRelics, ...discoveredRelics])],
    seeds,
    harvested,
    discoveredSpecies: Array.isArray(saved.discoveredSpecies) ? saved.discoveredSpecies.filter((id): id is SpeciesId => validSpecies.has(id as SpeciesId)) : ["clover", "fern"],
    plots: Array.isArray(saved.plots) ? [0, 1, 2, 3].map((i) => saved.plots?.[i] ?? emptyPlot()) : [emptyPlot(), emptyPlot(), emptyPlot(), emptyPlot()],
    potsUnlocked: Math.min(4, Math.max(2, Number(saved.potsUnlocked) || 2)),
    shovelLevel: Math.min(3, Math.max(1, Number(saved.shovelLevel) || 1)),
    waterLevel: Math.min(3, Math.max(1, Number(saved.waterLevel) || 1)),
    fertilizer: Math.max(0, Number(saved.fertilizer) || 0),
    curios: Array.isArray(saved.curios) ? saved.curios.filter((id): id is CurioId => validCurios.has(id as CurioId)) : [],
    revealedCaches: Array.isArray(saved.revealedCaches) ? saved.revealedCaches : [],
    crackedRoots: Array.isArray(saved.crackedRoots) ? saved.crackedRoots : [],
  };
}

function formatTime(ms: number) {
  if (ms <= 0) return "ready";
  const seconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes > 0 ? `${minutes}:${String(rest).padStart(2, "0")}` : `${seconds}s`;
}

function pairKey(a: SpeciesId, b: SpeciesId) {
  return [a, b].sort().join("+");
}

export default function Home() {
  const [game, setGame] = useState<GameState>(() => createInitialState());
  const gameRef = useRef(game);
  const [hydrated, setHydrated] = useState(false);
  const [view, setView] = useState<ViewId>("field");
  const [dragging, setDragging] = useState(false);
  const [sensoryOn, setSensoryOn] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [findEvent, setFindEvent] = useState<FindEvent | null>(null);
  const [flow, setFlow] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [parentA, setParentA] = useState<SpeciesId>("clover");
  const [parentB, setParentB] = useState<SpeciesId>("fern");
  const [breedingResult, setBreedingResult] = useState<string | null>(null);
  const [completionBurst, setCompletionBurst] = useState(false);
  const flowRef = useRef(0);
  const flowMilestones = useRef(new Set<number>());
  const advancing = useRef(false);
  const feedbackTimer = useRef<number | null>(null);
  const audioContext = useRef<AudioContext | null>(null);

  const commit = (next: GameState) => {
    gameRef.current = next;
    setGame(next);
  };

  useEffect(() => { gameRef.current = game; }, [game]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY) ?? localStorage.getItem(LEGACY_SAVE_KEY);
      if (raw) commit(normalizeState(JSON.parse(raw)));
      setSensoryOn(localStorage.getItem(SENSORY_KEY) === "on");
    } catch {
      // A broken save should never block play.
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(SAVE_KEY, JSON.stringify(game));
  }, [game, hydrated]);

  useEffect(() => {
    if (hydrated) localStorage.setItem(SENSORY_KEY, sensoryOn ? "on" : "off");
  }, [sensoryOn, hydrated]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const restoredSet = useMemo(() => new Set(game.restored), [game.restored]);
  const cells = useMemo(() => Array.from({ length: CELL_COUNT }, (_, index) => index), []);
  const mode = modeFor(game.stage);
  const environment = environmentFor(game.completedGardens);
  const theme = themes.find((item) => item.id === game.equippedTheme) ?? themes[0];
  const level = levelFor(game.lifetimeRestored);
  const progress = Math.round((game.restored.length / CELL_COUNT) * 100);
  const complete = game.restored.length === CELL_COUNT;
  const caches = cacheCellsFor(game);
  const specials = specialCellsFor(game.stage);
  const activePlants = game.plots.filter((plot) => plot.species).length;
  const readyPlants = game.plots.filter((plot) => plot.species && plot.readyAt <= now).length;

  useEffect(() => {
    if (!complete || advancing.current) return;
    advancing.current = true;
    setCompletionBurst(true);
    tone(392, 0.2, 0.018); tone(523, 0.28, 0.014, 0.06); tone(659, 0.32, 0.011, 0.13);
    const timer = window.setTimeout(() => {
      const current = gameRef.current;
      const completedGardens = current.completedGardens + 1;
      const relic = relics.find((item) => item.unlockGardens === completedGardens && !current.discoveredRelics.includes(item.id));
      const bonus = 45 + Math.min(35, current.stage * 4) + (relic ? 30 : 0);
      commit({
        ...current,
        stage: current.stage + 1,
        restored: [],
        completedGardens,
        dew: current.dew + bonus,
        discoveredRelics: relic ? [...current.discoveredRelics, relic.id] : current.discoveredRelics,
        revealedCaches: [],
        crackedRoots: [],
      });
      setFeedback(relic ? `${relic.name} discovered · +${bonus} Dew` : `garden settled · +${bonus} Dew`);
      setCompletionBurst(false);
      advancing.current = false;
    }, 1350);
    return () => window.clearTimeout(timer);
  }, [complete]);

  function getAudioContext() {
    if (!sensoryOn || typeof window === "undefined") return null;
    if (!audioContext.current) {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return null;
      audioContext.current = new AudioContextClass();
    }
    if (audioContext.current.state === "suspended") void audioContext.current.resume();
    return audioContext.current;
  }

  function tone(frequency: number, duration: number, volume: number, delay = 0) {
    const context = getAudioContext();
    if (!context) return;
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain); gain.connect(context.destination); oscillator.start(start); oscillator.stop(start + duration + 0.03);
  }

  function vibrate(pattern: number | number[]) {
    if (sensoryOn && typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
  }

  function showFeedback(text: string) {
    setFeedback(text);
    if (feedbackTimer.current !== null) window.clearTimeout(feedbackTimer.current);
    feedbackTimer.current = window.setTimeout(() => setFeedback(null), 1200);
  }

  function growthPulse(seconds: number) {
    const current = gameRef.current;
    const currentTime = Date.now();
    const plots = current.plots.map((plot) => plot.species && plot.readyAt > currentTime
      ? { ...plot, readyAt: Math.max(currentTime, plot.readyAt - seconds * 1000) }
      : plot);
    commit({ ...current, plots });
    showFeedback(`flow pulse · plants gain ${seconds}s`);
    tone(470, 0.16, 0.018); tone(620, 0.2, 0.012, 0.04); vibrate(8);
  }

  function beginSweep() {
    flowRef.current = 0;
    flowMilestones.current = new Set();
    setFlow(0);
    setDragging(true);
  }

  function endSweep() {
    setDragging(false);
  }

  function restoreCell(index: number) {
    const result = applyRestore(gameRef.current, index);
    if (!result.changed) return;
    commit(result.state);

    if (result.message) showFeedback(result.message);
    if (result.finds.length) {
      const found = result.finds[result.finds.length - 1];
      setFindEvent(found);
      showFeedback(`${found.label} · ${found.detail}`);
      tone(found.kind === "curio" ? 760 : found.kind === "seed" ? 610 : 520, 0.2, 0.02);
      vibrate([8, 18, 10]);
    } else if (result.glimmerCount) {
      showFeedback(`glimmer · +${result.glimmerCount * GLIMMER_BONUS} bonus Dew`);
      tone(560, 0.14, 0.017); tone(820, 0.18, 0.012, 0.035);
    }

    if (result.restoredCount > 0) {
      flowRef.current += result.restoredCount;
      setFlow(flowRef.current);
      for (const threshold of [12, 24, 36]) {
        if (flowRef.current >= threshold && !flowMilestones.current.has(threshold)) {
          flowMilestones.current.add(threshold);
          growthPulse(threshold === 12 ? 8 : threshold === 24 ? 12 : 18);
        }
      }
    }
  }

  function plantSeed(plotIndex: number, seedId: SpeciesId) {
    const current = gameRef.current;
    if (plotIndex >= current.potsUnlocked || current.plots[plotIndex].species || current.seeds[seedId] <= 0) return;
    const item = species.find((entry) => entry.id === seedId)!;
    const plantedAt = Date.now();
    const plots = current.plots.map((plot, index) => index === plotIndex
      ? { species: seedId, plantedAt, readyAt: plantedAt + item.growMs, watered: false, fertilized: false }
      : plot);
    commit({ ...current, plots, seeds: { ...current.seeds, [seedId]: current.seeds[seedId] - 1 } });
    showFeedback(`${item.name} planted`);
  }

  function waterPlot(plotIndex: number) {
    const current = gameRef.current;
    const plot = current.plots[plotIndex];
    if (!plot.species || plot.watered || plot.readyAt <= Date.now()) return;
    const reduction = [0, 0.18, 0.28, 0.38][current.waterLevel] ?? 0.18;
    const nowTime = Date.now();
    const remaining = plot.readyAt - nowTime;
    const plots = current.plots.map((item, index) => index === plotIndex ? { ...item, watered: true, readyAt: nowTime + remaining * (1 - reduction) } : item);
    commit({ ...current, plots });
    showFeedback(`watered · ${Math.round(reduction * 100)}% faster`);
  }

  function fertilizePlot(plotIndex: number) {
    const current = gameRef.current;
    const plot = current.plots[plotIndex];
    if (!plot.species || plot.fertilized || current.fertilizer <= 0 || plot.readyAt <= Date.now()) return;
    const nowTime = Date.now();
    const remaining = plot.readyAt - nowTime;
    const plots = current.plots.map((item, index) => index === plotIndex ? { ...item, fertilized: true, readyAt: nowTime + remaining * 0.64 } : item);
    commit({ ...current, plots, fertilizer: current.fertilizer - 1 });
    showFeedback("fertilized · 36% faster");
  }

  function harvestPlot(plotIndex: number) {
    const current = gameRef.current;
    const plot = current.plots[plotIndex];
    if (!plot.species || plot.readyAt > Date.now()) return;
    const plant = species.find((item) => item.id === plot.species)!;
    const reward = 8 + plant.rarity * 5;
    const plots = current.plots.map((item, index) => index === plotIndex ? emptyPlot() : item);
    commit({
      ...current,
      plots,
      dew: current.dew + reward,
      harvested: { ...current.harvested, [plant.id]: current.harvested[plant.id] + 1 },
      seeds: { ...current.seeds, [plant.id]: current.seeds[plant.id] + 1 },
      discoveredSpecies: current.discoveredSpecies.includes(plant.id) ? current.discoveredSpecies : [...current.discoveredSpecies, plant.id],
    });
    showFeedback(`${plant.name} harvested · +${reward} Dew +1 seed`);
    tone(590, 0.18, 0.018); tone(740, 0.22, 0.012, 0.04);
  }

  function breed() {
    const current = gameRef.current;
    const needA = parentA === parentB ? 2 : 1;
    if (current.harvested[parentA] < needA || current.harvested[parentB] < 1 || current.dew < 20) {
      setBreedingResult("Need harvested parent plants and 20 Dew.");
      return;
    }
    const match = species.find((item) => item.parents && pairKey(item.parents[0] as SpeciesId, item.parents[1] as SpeciesId) === pairKey(parentA, parentB));
    const roll = Math.random();
    let outcome: SpeciesId;
    if (roll < 0.07) outcome = "wildstar";
    else if (match && roll < 0.82) outcome = match.id;
    else outcome = Math.random() < 0.5 ? parentA : parentB;
    const harvested = { ...current.harvested };
    harvested[parentA] -= 1;
    harvested[parentB] -= 1;
    const item = species.find((entry) => entry.id === outcome)!;
    commit({
      ...current,
      dew: current.dew - 20,
      harvested,
      seeds: { ...current.seeds, [outcome]: current.seeds[outcome] + 1 },
      discoveredSpecies: current.discoveredSpecies.includes(outcome) ? current.discoveredSpecies : [...current.discoveredSpecies, outcome],
    });
    setBreedingResult(`${item.name} seed created.`);
    showFeedback(`breeding result · ${item.name}`);
  }

  function buyFertilizer() {
    const current = gameRef.current;
    if (current.dew < 55) return;
    commit({ ...current, dew: current.dew - 55, fertilizer: current.fertilizer + 1 });
  }

  function upgradeShovel() {
    const current = gameRef.current;
    const costs = [0, 140, 320];
    if (current.shovelLevel >= 3 || current.dew < costs[current.shovelLevel]) return;
    commit({ ...current, dew: current.dew - costs[current.shovelLevel], shovelLevel: current.shovelLevel + 1 });
  }

  function upgradeWateringCan() {
    const current = gameRef.current;
    const costs = [0, 120, 280];
    if (current.waterLevel >= 3 || current.dew < costs[current.waterLevel]) return;
    commit({ ...current, dew: current.dew - costs[current.waterLevel], waterLevel: current.waterLevel + 1 });
  }

  function unlockPot() {
    const current = gameRef.current;
    const costs = [0, 0, 180, 360];
    if (current.potsUnlocked >= 4 || current.dew < costs[current.potsUnlocked]) return;
    commit({ ...current, dew: current.dew - costs[current.potsUnlocked], potsUnlocked: current.potsUnlocked + 1 });
  }

  function buyTheme(themeId: ThemeId) {
    const current = gameRef.current;
    const item = themes.find((entry) => entry.id === themeId)!;
    if (current.ownedThemes.includes(themeId)) {
      commit({ ...current, equippedTheme: themeId });
      return;
    }
    if (level < item.unlockLevel || current.dew < item.cost) return;
    commit({ ...current, dew: current.dew - item.cost, ownedThemes: [...current.ownedThemes, themeId], equippedTheme: themeId });
  }

  const plantableSeeds = species.filter((item) => game.seeds[item.id] > 0);
  const breedingStock = species.filter((item) => game.harvested[item.id] > 0);
  const nextEnvironment = environments.find((item) => item.unlockGardens > game.completedGardens);
  const nextRelic = relics.find((item) => item.unlockGardens > game.completedGardens);

  return (
    <main
      className={styles.shell}
      data-environment={environment.id}
      style={{
        "--accent": theme.accent,
        "--accent-2": theme.accent2,
        "--ground": theme.ground,
        "--env-glow": environment.glow,
        "--env-surface": environment.surface,
      } as React.CSSProperties}
    >
      <div className={styles.ambient} aria-hidden="true" />
      <section className={styles.app}>
        <header className={styles.topbar}>
          <div>
            <p className={styles.eyebrow}>Stillgarden · {environment.name}</p>
            <h1>{view === "field" ? `Garden ${game.stage}` : view === "grow" ? "Growhouse" : "Collection"}</h1>
          </div>
          <div className={styles.statusCluster}>
            <button className={styles.sensoryButton} type="button" aria-pressed={sensoryOn} onClick={() => setSensoryOn((value) => !value)}>sensory {sensoryOn ? "on" : "off"}</button>
            <div className={styles.wallet}><span className={styles.dewDrop} /><strong>{game.dew}</strong><span>Dew</span></div>
          </div>
        </header>

        <nav className={styles.nav} aria-label="Stillgarden sections">
          <button className={view === "field" ? styles.navActive : ""} onClick={() => setView("field")}>Tend <span>{progress}%</span></button>
          <button className={view === "grow" ? styles.navActive : ""} onClick={() => setView("grow")}>Grow <span>{readyPlants ? `${readyPlants} ready` : `${activePlants} planted`}</span></button>
          <button className={view === "collection" ? styles.navActive : ""} onClick={() => setView("collection")}>Collection <span>{game.discoveredSpecies.length}/{species.length}</span></button>
        </nav>

        {view === "field" && (
          <section className={styles.viewPanel}>
            <div className={styles.modeCard} data-mode={mode.id}>
              <div><p className={styles.eyebrow}>today&apos;s field</p><h2>{mode.name}</h2><p>{mode.note}</p></div>
              <div className={styles.modeStats}><span>{caches.length - game.revealedCaches.length} leaf caches hidden</span><span>flow {flow}</span></div>
            </div>

            <div className={styles.progressLine}><span>{progress}% restored</span><span>Keeper {level} · {game.lifetimeRestored} tended</span></div>
            <div className={styles.progressTrack}><div style={{ width: `${progress}%` }} /></div>

            <div className={styles.boardWrap}>
              <div
                className={`${styles.board} ${complete ? styles.complete : ""}`}
                data-mode={mode.id}
                data-dragging={dragging ? "true" : "false"}
                data-settling={completionBurst ? "true" : "false"}
                onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); beginSweep(); }}
                onPointerUp={endSweep}
                onPointerCancel={endSweep}
                onPointerMove={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  event.currentTarget.style.setProperty("--pointer-x", `${event.clientX - rect.left}px`);
                  event.currentTarget.style.setProperty("--pointer-y", `${event.clientY - rect.top}px`);
                  if (!dragging) return;
                  const target = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
                  const value = target?.closest<HTMLElement>("[data-cell]")?.dataset.cell;
                  if (value !== undefined) restoreCell(Number(value));
                }}
              >
                {cells.map((index) => {
                  const restored = restoredSet.has(index);
                  const cache = caches.includes(index);
                  const revealed = game.revealedCaches.includes(index);
                  const special = specials.includes(index);
                  const cracked = game.crackedRoots.includes(index);
                  return (
                    <button
                      key={index}
                      type="button"
                      data-cell={index}
                      data-restored={restored ? "true" : "false"}
                      data-cache={cache && !revealed ? "true" : "false"}
                      data-special={special ? mode.id : "none"}
                      data-cracked={cracked ? "true" : "false"}
                      data-glimmer={isGlimmerCell(index, game.stage) ? "true" : "false"}
                      className={styles.cell}
                      onPointerDown={() => restoreCell(index)}
                      onPointerEnter={() => { if (dragging) restoreCell(index); }}
                      aria-label={restored ? "Restored patch" : cache ? "Leaf-covered patch" : "Untended patch"}
                    ><span className={styles.sprout} /><span className={styles.leaves} /><span className={styles.specialMark} /></button>
                  );
                })}
              </div>
              {feedback && <div className={styles.feedback}>{feedback}</div>}
              {completionBurst && <div className={styles.settle}><span>garden settled</span><strong>complete</strong></div>}
            </div>

            <div className={styles.fieldFooter}>
              <div><strong>Flow feeds the Growhouse.</strong><span>12 / 24 / 36 patches in one sweep send increasingly strong growth pulses to planted pots.</span></div>
              <div><strong>{nextEnvironment ? nextEnvironment.name : "Open garden"}</strong><span>{nextEnvironment ? `world changes after garden ${nextEnvironment.unlockGardens}` : "all environments discovered"}</span></div>
            </div>
          </section>
        )}

        {view === "grow" && (
          <section className={styles.viewPanel}>
            <div className={styles.growIntro}>
              <div><p className={styles.eyebrow}>real-time garden</p><h2>Plant it, leave it, come back when it is ready.</h2><p>Nothing dies and nothing expires. Sweeping well simply lets you nudge growth forward.</p></div>
              <div className={styles.growSummary}><strong>{activePlants}</strong><span>growing</span><strong>{readyPlants}</strong><span>ready</span></div>
            </div>

            <div className={styles.potGrid}>
              {game.plots.map((plot, index) => {
                const unlocked = index < game.potsUnlocked;
                const plant = plot.species ? species.find((item) => item.id === plot.species)! : null;
                const remaining = plant ? Math.max(0, plot.readyAt - now) : 0;
                const total = plant ? Math.max(1, plot.readyAt - plot.plantedAt) : 1;
                const plantProgress = plant ? Math.max(0, Math.min(100, 100 - (remaining / total) * 100)) : 0;
                return (
                  <article className={`${styles.potCard} ${!unlocked ? styles.potLocked : ""}`} key={index}>
                    {!unlocked ? (
                      <div className={styles.lockedPot}><div className={styles.potShape} /><strong>Empty bench</strong><span>Unlock another pot from the tool shed.</span></div>
                    ) : plant ? (
                      <>
                        <div className={styles.plantVisual} style={{ "--plant": plant.color, "--growth": `${plantProgress}%` } as React.CSSProperties}><span /><span /><span /></div>
                        <div className={styles.potCopy}><div><strong>{plant.name}</strong><span>{remaining <= 0 ? "ready to harvest" : formatTime(remaining)}</span></div><div className={styles.miniTrack}><span style={{ width: `${plantProgress}%` }} /></div></div>
                        <div className={styles.potActions}>
                          {remaining <= 0 ? <button className={styles.primaryAction} onClick={() => harvestPlot(index)}>harvest</button> : <>
                            <button disabled={plot.watered} onClick={() => waterPlot(index)}>{plot.watered ? "watered" : `water · L${game.waterLevel}`}</button>
                            <button disabled={plot.fertilized || game.fertilizer <= 0} onClick={() => fertilizePlot(index)}>{plot.fertilized ? "fed" : `fertilize · ${game.fertilizer}`}</button>
                          </>}
                        </div>
                      </>
                    ) : (
                      <div className={styles.emptyPot}>
                        <div className={styles.potShape} />
                        <strong>Empty pot</strong>
                        <div className={styles.seedPicker}>{plantableSeeds.length ? plantableSeeds.map((item) => <button key={item.id} onClick={() => plantSeed(index, item.id)}><span style={{ background: item.color }} />{item.name}<em>×{game.seeds[item.id]}</em></button>) : <span>Find seeds under leaves or through breeding.</span>}</div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>

            <div className={styles.growColumns}>
              <section className={styles.toolShed}>
                <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>tool shed</p><h3>Make tending more useful.</h3></div></div>
                <div className={styles.toolList}>
                  <article><span className={styles.toolIcon}>⌁</span><div><strong>Shovel · L{game.shovelLevel}</strong><span>More hidden caches and better seed odds.</span></div><button disabled={game.shovelLevel >= 3 || game.dew < ([0,140,320][game.shovelLevel] ?? 9999)} onClick={upgradeShovel}>{game.shovelLevel >= 3 ? "max" : `${[0,140,320][game.shovelLevel]} Dew`}</button></article>
                  <article><span className={styles.toolIcon}>◒</span><div><strong>Watering can · L{game.waterLevel}</strong><span>One watering permanently shortens that plant&apos;s timer.</span></div><button disabled={game.waterLevel >= 3 || game.dew < ([0,120,280][game.waterLevel] ?? 9999)} onClick={upgradeWateringCan}>{game.waterLevel >= 3 ? "max" : `${[0,120,280][game.waterLevel]} Dew`}</button></article>
                  <article><span className={styles.toolIcon}>✦</span><div><strong>Fertilizer · {game.fertilizer}</strong><span>Single-use 36% cut to remaining grow time.</span></div><button disabled={game.dew < 55} onClick={buyFertilizer}>55 Dew</button></article>
                  <article><span className={styles.toolIcon}>◡</span><div><strong>Pots · {game.potsUnlocked}/4</strong><span>More simultaneous plants, no upkeep.</span></div><button disabled={game.potsUnlocked >= 4 || game.dew < ([0,0,180,360][game.potsUnlocked] ?? 9999)} onClick={unlockPot}>{game.potsUnlocked >= 4 ? "max" : `${[0,0,180,360][game.potsUnlocked]} Dew`}</button></article>
                </div>
              </section>

              <section className={styles.breedingLab}>
                <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>seed crossing</p><h3>Breed what you have harvested.</h3></div><span>20 Dew per cross</span></div>
                <div className={styles.parentRow}>
                  <select value={parentA} onChange={(event) => setParentA(event.target.value as SpeciesId)}>{breedingStock.length ? breedingStock.map((item) => <option key={item.id} value={item.id}>{item.name} · {game.harvested[item.id]}</option>) : <option value="clover">No harvested plants yet</option>}</select>
                  <span>×</span>
                  <select value={parentB} onChange={(event) => setParentB(event.target.value as SpeciesId)}>{breedingStock.length ? breedingStock.map((item) => <option key={item.id} value={item.id}>{item.name} · {game.harvested[item.id]}</option>) : <option value="fern">No harvested plants yet</option>}</select>
                </div>
                <p>Known pairings strongly favour a hybrid; any cross has a small chance to mutate into something rarer.</p>
                <button className={styles.breedButton} disabled={!breedingStock.length || game.dew < 20} onClick={breed}>cross seeds</button>
                {breedingResult && <div className={styles.breedingResult}>{breedingResult}</div>}
              </section>
            </div>
          </section>
        )}

        {view === "collection" && (
          <section className={styles.viewPanel}>
            <div className={styles.collectionHero}><div><p className={styles.eyebrow}>living archive</p><h2>{game.discoveredSpecies.length} of {species.length} plants discovered</h2><p>Seeds, hybrids, curios, relics and garden styles all live here.</p></div><div className={styles.collectionRing}><strong>{Math.round((game.discoveredSpecies.length / species.length) * 100)}%</strong><span>flora</span></div></div>

            <section className={styles.catalogSection}>
              <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>flora</p><h3>Plant collection</h3></div><span>hybrids stay hidden until found</span></div>
              <div className={styles.speciesGrid}>{species.map((item) => { const known = game.discoveredSpecies.includes(item.id); return <article className={known ? styles.speciesKnown : ""} key={item.id}><div className={styles.speciesOrb} style={{ "--plant": known ? item.color : "#b8b5ab" } as React.CSSProperties} /><div><strong>{known ? item.name : "Unknown cross"}</strong><span>{known ? item.note : item.parents ? "Try combining harvested plants." : "Hidden seed."}</span></div><em>{known ? `rarity ${item.rarity} · seeds ${game.seeds[item.id]}` : "?"}</em></article>; })}</div>
            </section>

            <div className={styles.collectionColumns}>
              <section className={styles.catalogSection}><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>buried curios</p><h3>{game.curios.length}/{curios.length} found</h3></div></div><div className={styles.curioGrid}>{curios.map((item) => <article className={game.curios.includes(item.id) ? styles.curioFound : ""} key={item.id}><span>✧</span><strong>{game.curios.includes(item.id) ? item.name : "Unfound"}</strong></article>)}</div></section>
              <section className={styles.catalogSection}><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>milestone relics</p><h3>{game.discoveredRelics.length}/{relics.length} kept</h3></div>{nextRelic && <span>next: garden {nextRelic.unlockGardens}</span>}</div><div className={styles.relicList}>{relics.map((item) => <article className={game.discoveredRelics.includes(item.id) ? styles.relicFound : ""} key={item.id}><span /><div><strong>{game.discoveredRelics.includes(item.id) ? item.name : "Undiscovered"}</strong><em>{game.discoveredRelics.includes(item.id) ? item.note : `complete garden ${item.unlockGardens}`}</em></div></article>)}</div></section>
            </div>

            <section className={styles.catalogSection}>
              <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>garden styles</p><h3>Spend Dew on atmosphere, not power.</h3></div></div>
              <div className={styles.themeGrid}>{themes.map((item) => { const owned = game.ownedThemes.includes(item.id); const equipped = game.equippedTheme === item.id; const unlocked = level >= item.unlockLevel; return <article key={item.id} style={{ "--card-accent": item.accent, "--card-ground": item.ground } as React.CSSProperties}><div className={styles.themePreview}><span /><span /><span /></div><strong>{item.name}</strong><span>{item.description}</span><button disabled={!owned && (!unlocked || game.dew < item.cost)} onClick={() => buyTheme(item.id)}>{equipped ? "equipped" : owned ? "equip" : unlocked ? `${item.cost} Dew` : `Keeper ${item.unlockLevel}`}</button></article>; })}</div>
            </section>
          </section>
        )}

        {findEvent && <button className={styles.findToast} onClick={() => setFindEvent(null)}><span>{findEvent.kind}</span><strong>{findEvent.label}</strong><em>{findEvent.detail}</em></button>}
      </section>
    </main>
  );
}
