"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./relax.module.css";
import rareStyles from "./rare.module.css";
import {
  MAX_POTS,
  MAX_TOOL_LEVEL,
  activeCellsFor,
  chooseShapeId,
  fieldShapes,
  keeperProgress,
  potUpgradeCost,
  toolUpgradeCost,
  viewportKind,
  type FieldShape,
  type ShapeId,
  type ViewportKind,
} from "./gameRules";

const SAVE_KEY = "stillgarden-v4";
const LEGACY_SAVE_KEYS = ["stillgarden-v3", "stillgarden-v2", "stillgarden-v1"];
const SENSORY_KEY = "stillgarden-sensory";
const DEW_PER_PATCH = 1;
const GLIMMER_BONUS = 4;
const GROWTH_SCALE = 12;
const BREED_COST = 90;

const themes = [
  { id: "fern", name: "Fern", description: "soft greens and pale stone", unlockLevel: 1, cost: 0, accent: "#6f8f74", accent2: "#b7c7a7", ground: "#e8e0cf" },
  { id: "wildflower", name: "Wildflower", description: "dusty rose with tiny blooms", unlockLevel: 6, cost: 600, accent: "#a37483", accent2: "#d7b8bd", ground: "#eee0d6" },
  { id: "stonewater", name: "Stonewater", description: "cool mineral blue and mist", unlockLevel: 14, cost: 2200, accent: "#668899", accent2: "#abc3ca", ground: "#e1e5df" },
  { id: "sunclay", name: "Sunclay", description: "warm earth with gold light", unlockLevel: 26, cost: 6500, accent: "#a67a5f", accent2: "#d7bb8f", ground: "#eadbc8" },
  { id: "moonmoss", name: "Moonmoss", description: "violet dusk and silver leaves", unlockLevel: 40, cost: 14000, accent: "#77748e", accent2: "#b6aec7", ground: "#e3dedf" },
] as const;

const relics = [
  { id: "dewpearl", name: "Dew Pearl", note: "A clear drop that never falls.", unlockGardens: 3 },
  { id: "quietseed", name: "Quiet Seed", note: "Warm in the hand, even at dusk.", unlockGardens: 10 },
  { id: "rainglass", name: "Rain Glass", note: "Keeps the sound of a distant shower.", unlockGardens: 25 },
  { id: "moonbell", name: "Moon Bell", note: "It moves, but never rings loudly.", unlockGardens: 60 },
  { id: "sunstone", name: "Sun Stone", note: "A small piece of late-afternoon light.", unlockGardens: 120 },
  { id: "starmoss", name: "Star Moss", note: "Tiny silver points appear after dark.", unlockGardens: 240 },
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
  { id: "shallows", name: "Rain Shallows", unlockGardens: 8, glow: "#c9dce1", surface: "#738b91" },
  { id: "grove", name: "Lantern Grove", unlockGardens: 24, glow: "#dfd2ae", surface: "#68735f" },
  { id: "moonpond", name: "Moon Pond", unlockGardens: 60, glow: "#c9c6db", surface: "#686b7c" },
  { id: "glasshouse", name: "Glasshouse", unlockGardens: 120, glow: "#d7e4d9", surface: "#768c82" },
] as const;

const fieldModes = [
  { id: "meadow", name: "soft bed" },
  { id: "breeze", name: "wind bed" },
  { id: "rain", name: "rain bed" },
  { id: "roots", name: "root bed" },
] as const;

const species = [
  { id: "clover", name: "Cloud Clover", rarity: 1, growMs: 45_000, color: "#82a277", note: "A forgiving first grower.", parents: null, kind: "wild", unlockStage: 1, odds: 20 },
  { id: "fern", name: "Button Fern", rarity: 1, growMs: 65_000, color: "#5f8068", note: "Unfurls in compact spirals.", parents: null, kind: "wild", unlockStage: 1, odds: 20 },
  { id: "poppy", name: "Dust Poppy", rarity: 1, growMs: 80_000, color: "#b97f82", note: "Papery petals and warm seeds.", parents: null, kind: "wild", unlockStage: 3, odds: 8 },
  { id: "rainmint", name: "Rainmint", rarity: 2, growMs: 105_000, color: "#6f98a0", note: "Cool leaves with silver edges.", parents: null, kind: "wild", unlockStage: 8, odds: 14 },
  { id: "moonbell", name: "Moonbell", rarity: 2, growMs: 130_000, color: "#8583a2", note: "A pale bell that opens late.", parents: null, kind: "wild", unlockStage: 15, odds: 20 },
  { id: "sunreed", name: "Sunreed", rarity: 2, growMs: 155_000, color: "#b79561", note: "Tall stems that hold warm light.", parents: null, kind: "wild", unlockStage: 30, odds: 28 },
  { id: "embermoss", name: "Ember Moss", rarity: 3, growMs: 170_000, color: "#9b795f", note: "Warm moss that glows at the edges.", parents: null, kind: "wild", unlockStage: 50, odds: 45 },
  { id: "pearlgrass", name: "Pearl Grass", rarity: 3, growMs: 185_000, color: "#96a89f", note: "Small silver beads form along each blade.", parents: null, kind: "wild", unlockStage: 80, odds: 75 },
  { id: "frostvine", name: "Frost Vine", rarity: 3, growMs: 205_000, color: "#8ba7aa", note: "Pale veins creep across dark leaves.", parents: null, kind: "wild", unlockStage: 120, odds: 120 },
  { id: "blushcap", name: "Blush Cap", rarity: 4, growMs: 225_000, color: "#b28b91", note: "A soft coral cap found in quiet soil.", parents: null, kind: "wild", unlockStage: 180, odds: 300 },
  { id: "starthistle", name: "Star Thistle", rarity: 5, growMs: 260_000, color: "#8d8aaa", note: "Its points catch light like tiny stars.", parents: null, kind: "wild", unlockStage: 300, odds: 900 },
  { id: "nightorchid", name: "Night Orchid", rarity: 6, growMs: 320_000, color: "#635d7d", note: "Almost black until moonlight finds it.", parents: null, kind: "wild", unlockStage: 500, odds: 5000 },
  { id: "roseclover", name: "Rose Clover", rarity: 2, growMs: 150_000, color: "#ad7f8d", note: "A clover-poppy cross.", parents: ["clover", "poppy"], kind: "hybrid", unlockStage: 1, odds: 0 },
  { id: "mossmint", name: "Mossmint", rarity: 2, growMs: 165_000, color: "#688c77", note: "Fern softness with rainmint scent.", parents: ["fern", "rainmint"], kind: "hybrid", unlockStage: 1, odds: 0 },
  { id: "duskbell", name: "Dusk Bell", rarity: 3, growMs: 190_000, color: "#777792", note: "Moonbell crossed with rainmint.", parents: ["moonbell", "rainmint"], kind: "hybrid", unlockStage: 1, odds: 0 },
  { id: "emberpetal", name: "Ember Petal", rarity: 3, growMs: 205_000, color: "#b37d69", note: "Sunreed warmth in poppy petals.", parents: ["sunreed", "poppy"], kind: "hybrid", unlockStage: 1, odds: 0 },
  { id: "miststar", name: "Mist Star", rarity: 3, growMs: 215_000, color: "#8c96a7", note: "A quiet clover-moonbell hybrid.", parents: ["clover", "moonbell"], kind: "hybrid", unlockStage: 1, odds: 0 },
  { id: "goldfern", name: "Gold Fern", rarity: 3, growMs: 225_000, color: "#9a936b", note: "Sunreed light caught in fern fronds.", parents: ["sunreed", "fern"], kind: "hybrid", unlockStage: 1, odds: 0 },
  { id: "frostbell", name: "Frost Bell", rarity: 4, growMs: 240_000, color: "#8798ac", note: "A bell with translucent, icy edges.", parents: ["frostvine", "moonbell"], kind: "hybrid", unlockStage: 1, odds: 0 },
  { id: "pearlreed", name: "Pearl Reed", rarity: 4, growMs: 250_000, color: "#9e9e88", note: "Tall pearl nodes along a reed stem.", parents: ["pearlgrass", "sunreed"], kind: "hybrid", unlockStage: 1, odds: 0 },
  { id: "embervine", name: "Ember Vine", rarity: 4, growMs: 260_000, color: "#9c7866", note: "A warm vine with cool mint veins.", parents: ["embermoss", "rainmint"], kind: "hybrid", unlockStage: 1, odds: 0 },
  { id: "blushfern", name: "Blush Fern", rarity: 4, growMs: 270_000, color: "#a38389", note: "Pink-tipped fronds fold inward at dusk.", parents: ["blushcap", "fern"], kind: "hybrid", unlockStage: 1, odds: 0 },
  { id: "starclover", name: "Star Clover", rarity: 5, growMs: 290_000, color: "#8888a1", note: "Four leaves, each carrying a pale point.", parents: ["starthistle", "clover"], kind: "hybrid", unlockStage: 1, odds: 0 },
  { id: "nightmint", name: "Night Mint", rarity: 5, growMs: 310_000, color: "#696b81", note: "Dark leaves release a cool silver mist.", parents: ["nightorchid", "rainmint"], kind: "hybrid", unlockStage: 1, odds: 0 },
  { id: "wildstar", name: "Wild Star", rarity: 4, growMs: 240_000, color: "#9a86a8", note: "A spontaneous star-shaped mutation.", parents: null, kind: "mutation", unlockStage: 1, odds: 100 },
  { id: "prismleaf", name: "Prism Leaf", rarity: 4, growMs: 250_000, color: "#8fa4a6", note: "Its surface splits light into pale bands.", parents: null, kind: "mutation", unlockStage: 1, odds: 160 },
  { id: "ghostbloom", name: "Ghost Bloom", rarity: 5, growMs: 270_000, color: "#b1b2bd", note: "A nearly colourless flower that appears overnight.", parents: null, kind: "mutation", unlockStage: 1, odds: 300 },
  { id: "clockfern", name: "Clock Fern", rarity: 5, growMs: 285_000, color: "#7b8b78", note: "Its fronds uncurl in even intervals.", parents: null, kind: "mutation", unlockStage: 1, odds: 550 },
  { id: "aurorapod", name: "Aurora Pod", rarity: 5, growMs: 300_000, color: "#8d9ca3", note: "The pod changes colour as it ripens.", parents: null, kind: "mutation", unlockStage: 1, odds: 900 },
  { id: "voidlily", name: "Void Lily", rarity: 6, growMs: 330_000, color: "#595b6c", note: "A dark centre seems deeper than the flower itself.", parents: null, kind: "mutation", unlockStage: 1, odds: 1500 },
  { id: "glassheart", name: "Glass Heart", rarity: 6, growMs: 350_000, color: "#9caeb1", note: "A translucent heart-shaped leaf.", parents: null, kind: "mutation", unlockStage: 1, odds: 2500 },
  { id: "eclipseorchid", name: "Eclipse Orchid", rarity: 6, growMs: 390_000, color: "#4f4a61", note: "A near-impossible mutation with a silver rim.", parents: null, kind: "mutation", unlockStage: 1, odds: 5000 },
] as const;

const RARITY_NAMES = ["", "Common", "Uncommon", "Rare", "Epic", "Legendary", "Mythic"] as const;

type ThemeId = (typeof themes)[number]["id"];
type RelicId = (typeof relics)[number]["id"];
type CurioId = (typeof curios)[number]["id"];
type SpeciesId = (typeof species)[number]["id"];
type FieldMode = (typeof fieldModes)[number];
type Environment = (typeof environments)[number];
type ViewId = "field" | "grow" | "collection";
type GrowView = "pots" | "shed";
type Plot = { species: SpeciesId | null; plantedAt: number; readyAt: number; watered: boolean; fertilized: boolean };
type DiscoveryRecord = { at: number; source: string };
type GameState = {
  stage: number;
  shapeId: ShapeId;
  restored: number[];
  dew: number;
  lifetimeRestored: number;
  completedGardens: number;
  ownedThemes: ThemeId[];
  equippedTheme: ThemeId;
  discoveredRelics: RelicId[];
  seeds: Record<SpeciesId, number>;
  discoveredSpecies: SpeciesId[];
  discoveryLog: Partial<Record<SpeciesId, DiscoveryRecord>>;
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
type FindEvent = { kind: "dew" | "seed" | "curio" | "mutation"; label: string; detail: string; rarity: number; odds?: number; color?: string };
type RestoreResult = { state: GameState; changed: boolean; restoredCount: number; glimmerCount: number; finds: FindEvent[]; message?: string };

const emptySeeds = () => Object.fromEntries(species.map((item) => [item.id, 0])) as Record<SpeciesId, number>;
const emptyHarvested = () => Object.fromEntries(species.map((item) => [item.id, 0])) as Record<SpeciesId, number>;
const emptyPlot = (): Plot => ({ species: null, plantedAt: 0, readyAt: 0, watered: false, fertilized: false });

function createInitialState(): GameState {
  const seeds = emptySeeds();
  seeds.clover = 2;
  seeds.fern = 1;
  return {
    stage: 1,
    shapeId: "classic",
    restored: [],
    dew: 0,
    lifetimeRestored: 0,
    completedGardens: 0,
    ownedThemes: ["fern"],
    equippedTheme: "fern",
    discoveredRelics: [],
    seeds,
    discoveredSpecies: ["clover", "fern"],
    discoveryLog: {},
    harvested: emptyHarvested(),
    plots: Array.from({ length: MAX_POTS }, emptyPlot),
    potsUnlocked: 2,
    shovelLevel: 1,
    waterLevel: 1,
    fertilizer: 2,
    curios: [],
    revealedCaches: [],
    crackedRoots: [],
  };
}

function seeded(seed: number) { const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453; return value - Math.floor(value); }
function rarityName(rarity: number) { return RARITY_NAMES[Math.max(1, Math.min(6, rarity))] ?? "Rare"; }
function environmentFor(completedGardens: number): Environment { let current: Environment = environments[0]; for (const environment of environments) if (completedGardens >= environment.unlockGardens) current = environment; return current; }
function modeFor(stage: number): FieldMode { return fieldModes[(stage - 1) % fieldModes.length]; }
function wildSpeciesForStage(stage: number) { return species.filter((item) => item.kind === "wild" && item.unlockStage <= stage); }
function growthTime(item: (typeof species)[number]) { return item.growMs * GROWTH_SCALE; }

function uniqueFromActive(active: number[], stage: number, salt: number, count: number) {
  const picked: number[] = [];
  let step = 0;
  while (picked.length < Math.min(count, active.length) && step < 1000) {
    const index = active[Math.floor(seeded(stage * 101 + salt * 997 + step * 37) * active.length)];
    if (index !== undefined && !picked.includes(index)) picked.push(index);
    step += 1;
  }
  return picked;
}

function cacheCellsFor(state: GameState, shape: FieldShape) {
  const active = activeCellsFor(shape);
  const count = Math.min(10, 4 + Math.floor((state.shovelLevel - 1) / 2));
  return uniqueFromActive(active, state.stage, 41, count);
}
function specialCellsFor(stage: number, shape: FieldShape) { return uniqueFromActive(activeCellsFor(shape), stage, 83, 6); }
function bumpCellsFor(stage: number, shape: FieldShape) { return uniqueFromActive(activeCellsFor(shape), stage, 137, stage < 8 ? 1 : 2); }
function isGlimmerCell(index: number, stage: number) { return (index * 17 + stage * 11) % 37 === 0; }

function neighbors(index: number, shape: FieldShape, diagonal = false) {
  const active = new Set(activeCellsFor(shape));
  const row = Math.floor(index / shape.cols);
  const col = index % shape.cols;
  const offsets = diagonal
    ? [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]
    : [[-1,0],[0,-1],[0,1],[1,0]];
  return offsets.map(([dr, dc]) => (row + dr) * shape.cols + col + dc).filter((value, i) => {
    const [dr, dc] = offsets[i];
    const r = row + dr; const c = col + dc;
    return r >= 0 && r < shape.rows && c >= 0 && c < shape.cols && active.has(value);
  });
}

function recordDiscovery(state: GameState, id: SpeciesId, source: string) {
  if (state.discoveryLog[id]) return state.discoveryLog;
  return { ...state.discoveryLog, [id]: { at: Date.now(), source } };
}

function grantSeed(state: GameState, seedId: SpeciesId, odds: number, source = "found under the soil"): { state: GameState; event: FindEvent } {
  const item = species.find((entry) => entry.id === seedId)!;
  const first = !state.discoveredSpecies.includes(seedId);
  return {
    state: {
      ...state,
      seeds: { ...state.seeds, [seedId]: state.seeds[seedId] + 1 },
      discoveredSpecies: first ? [...state.discoveredSpecies, seedId] : state.discoveredSpecies,
      discoveryLog: first ? recordDiscovery(state, seedId, source) : state.discoveryLog,
    },
    event: { kind: "seed", label: `${item.name} seed`, detail: `a ${rarityName(item.rarity).toLowerCase()} wild seed`, rarity: item.rarity, odds, color: item.color },
  };
}

function rewardForCache(state: GameState, cacheIndex: number): { state: GameState; event: FindEvent } {
  const roll = seeded(state.stage * 313 + cacheIndex * 17 + state.shovelLevel * 43);
  const wild = [...wildSpeciesForStage(state.stage)].sort((a, b) => b.odds - a.odds);
  let cursor = 0;
  for (const item of wild) { cursor += 1 / item.odds; if (roll < cursor) return grantSeed(state, item.id, item.odds); }
  if (roll < .42) {
    const commonPool = wild.filter((item) => item.rarity <= 2);
    const pick = commonPool[Math.floor(seeded(state.stage * 73 + cacheIndex * 29) * commonPool.length)] ?? species[0];
    return grantSeed(state, pick.id, Math.max(5, pick.odds));
  }
  if (roll > .94) {
    const curio = curios[Math.floor(seeded(cacheIndex * 91 + state.stage * 7) * curios.length)] ?? curios[0];
    const alreadyOwned = state.curios.includes(curio.id);
    return {
      state: alreadyOwned ? { ...state, dew: state.dew + 25 } : { ...state, curios: [...state.curios, curio.id] },
      event: alreadyOwned ? { kind: "dew", label: "+25 Dew", detail: `a familiar ${curio.name} became Dew`, rarity: 1 } : { kind: "curio", label: curio.name, detail: "a buried curio", rarity: 3, odds: 90 },
    };
  }
  const amount = 10 + Math.floor(seeded(cacheIndex * 59 + state.stage * 23) * 18) + Math.floor(state.shovelLevel / 2);
  return { state: { ...state, dew: state.dew + amount }, event: { kind: "dew", label: `+${amount} Dew`, detail: "a pocket hidden in the soil", rarity: 1 } };
}

function applyRestore(source: GameState, index: number): RestoreResult {
  const shape = fieldShapes[source.shapeId] ?? fieldShapes.classic;
  const active = new Set(activeCellsFor(shape));
  if (!active.has(index) || source.restored.includes(index)) return { state: source, changed: false, restoredCount: 0, glimmerCount: 0, finds: [] };
  const mode = modeFor(source.stage);
  const specials = specialCellsFor(source.stage, shape);
  const bumps = bumpCellsFor(source.stage, shape);
  const isSpecial = specials.includes(index);
  if (mode.id === "roots" && isSpecial && !source.crackedRoots.includes(index)) return { state: { ...source, crackedRoots: [...source.crackedRoots, index] }, changed: true, restoredCount: 0, glimmerCount: 0, finds: [], message: "root loosened · one more stroke" };

  const restored = new Set(source.restored.filter((cell) => active.has(cell)));
  const targets = new Set<number>([index]);
  const add = (value: number) => { if (active.has(value)) targets.add(value); };
  const row = Math.floor(index / shape.cols);
  const col = index % shape.cols;
  const sameRow = (offset: number) => { const c = col + offset; if (c >= 0 && c < shape.cols) add(row * shape.cols + c); };

  if ((index * 5 + source.stage) % 23 === 0) sameRow(index % 2 === 0 ? 1 : -1);
  if (bumps.includes(index)) {
    for (const value of neighbors(index, shape, true)) add(value);
    const far = [[-2,0],[2,0],[0,-2],[0,2]];
    for (const [dr, dc] of far) { const r = row + dr; const c = col + dc; if (r >= 0 && r < shape.rows && c >= 0 && c < shape.cols) add(r * shape.cols + c); }
  } else if (mode.id === "breeze" && isSpecial) {
    [-2,-1,1,2].forEach(sameRow);
  } else if ((mode.id === "rain" || mode.id === "roots") && isSpecial) {
    for (const value of neighbors(index, shape, false)) add(value);
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
  const caches = cacheCellsFor(source, shape);
  const finds: FindEvent[] = [];
  for (const target of fresh) if (caches.includes(target) && !next.revealedCaches.includes(target)) {
    const rewarded = rewardForCache(next, target);
    next = { ...rewarded.state, revealedCaches: [...rewarded.state.revealedCaches, target] };
    finds.push(rewarded.event);
  }
  const message = bumps.includes(index)
    ? `mound opened · ${fresh.length} patches`
    : fresh.length > 2
      ? `${mode.id === "breeze" ? "wind line" : mode.id === "rain" ? "rain burst" : mode.id === "roots" ? "root bloom" : "soft chain"} · ${fresh.length}`
      : undefined;
  return { state: next, changed: true, restoredCount: fresh.length, glimmerCount, finds, message };
}

function normalizeState(raw: unknown): GameState {
  const base = createInitialState();
  if (!raw || typeof raw !== "object") return base;
  const saved = raw as Partial<GameState> & { stage?: number; restored?: number[] };
  const validSpecies = new Set(species.map((item) => item.id));
  const validThemes = new Set(themes.map((item) => item.id));
  const validRelics = new Set(relics.map((item) => item.id));
  const validCurios = new Set(curios.map((item) => item.id));
  const validShape = typeof saved.shapeId === "string" && saved.shapeId in fieldShapes ? saved.shapeId as ShapeId : "classic";
  const shape = fieldShapes[validShape];
  const active = new Set(activeCellsFor(shape));
  const finite = (value: unknown, fallback: number) => { const n = Number(value); return Number.isFinite(n) ? n : fallback; };
  const seeds = emptySeeds();
  const harvested = emptyHarvested();
  if (saved.seeds) for (const [key, value] of Object.entries(saved.seeds)) if (validSpecies.has(key as SpeciesId)) seeds[key as SpeciesId] = Math.max(0, finite(value, 0));
  else { seeds.clover = 2; seeds.fern = 1; }
  if (saved.harvested) for (const [key, value] of Object.entries(saved.harvested)) if (validSpecies.has(key as SpeciesId)) harvested[key as SpeciesId] = Math.max(0, finite(value, 0));
  const stage = Math.max(1, Math.floor(finite(saved.stage, 1)));
  const restored = Array.isArray(saved.restored) ? [...new Set(saved.restored.filter((n): n is number => Number.isInteger(n) && active.has(n)))] : [];
  const completedGardens = Math.max(0, Math.floor(finite(saved.completedGardens, stage - 1)));
  const lifetimeRestored = Math.max(0, Math.floor(finite(saved.lifetimeRestored, completedGardens * 80 + restored.length)));
  const milestoneRelics = relics.filter((item) => completedGardens >= item.unlockGardens).map((item) => item.id);
  const savedRelics = Array.isArray(saved.discoveredRelics) ? saved.discoveredRelics.filter((id): id is RelicId => validRelics.has(id as RelicId)) : [];
  const plots = Array.from({ length: MAX_POTS }, (_, i) => {
    const rawPlot = saved.plots?.[i];
    if (!rawPlot?.species || !validSpecies.has(rawPlot.species as SpeciesId)) return emptyPlot();
    const plantedAt = Math.max(0, finite(rawPlot.plantedAt, 0));
    const readyAt = Math.max(plantedAt, finite(rawPlot.readyAt, plantedAt));
    return { species: rawPlot.species as SpeciesId, plantedAt, readyAt, watered: Boolean(rawPlot.watered), fertilized: Boolean(rawPlot.fertilized) };
  });
  const discoveryLog: Partial<Record<SpeciesId, DiscoveryRecord>> = {};
  if (saved.discoveryLog && typeof saved.discoveryLog === "object") for (const [key, value] of Object.entries(saved.discoveryLog)) {
    if (!validSpecies.has(key as SpeciesId) || !value || typeof value !== "object") continue;
    const record = value as Partial<DiscoveryRecord>;
    const at = finite(record.at, 0);
    if (at > 0) discoveryLog[key as SpeciesId] = { at, source: typeof record.source === "string" ? record.source.slice(0, 160) : "recorded in the garden" };
  }
  return {
    ...base,
    ...saved,
    stage,
    shapeId: validShape,
    restored,
    completedGardens,
    lifetimeRestored,
    dew: Math.max(0, finite(saved.dew, 0)),
    ownedThemes: Array.isArray(saved.ownedThemes) ? saved.ownedThemes.filter((id): id is ThemeId => validThemes.has(id as ThemeId)) : ["fern"],
    equippedTheme: typeof saved.equippedTheme === "string" && validThemes.has(saved.equippedTheme as ThemeId) ? saved.equippedTheme as ThemeId : "fern",
    discoveredRelics: [...new Set([...savedRelics, ...milestoneRelics])],
    seeds,
    harvested,
    discoveredSpecies: Array.isArray(saved.discoveredSpecies) ? saved.discoveredSpecies.filter((id): id is SpeciesId => validSpecies.has(id as SpeciesId)) : ["clover", "fern"],
    discoveryLog,
    plots,
    potsUnlocked: Math.min(MAX_POTS, Math.max(2, Math.floor(finite(saved.potsUnlocked, 2)))),
    shovelLevel: Math.min(MAX_TOOL_LEVEL, Math.max(1, Math.floor(finite(saved.shovelLevel, 1)))),
    waterLevel: Math.min(MAX_TOOL_LEVEL, Math.max(1, Math.floor(finite(saved.waterLevel, 1)))),
    fertilizer: Math.max(0, Math.floor(finite(saved.fertilizer, 0))),
    curios: Array.isArray(saved.curios) ? saved.curios.filter((id): id is CurioId => validCurios.has(id as CurioId)) : [],
    revealedCaches: Array.isArray(saved.revealedCaches) ? saved.revealedCaches.filter((n) => active.has(n)) : [],
    crackedRoots: Array.isArray(saved.crackedRoots) ? saved.crackedRoots.filter((n) => active.has(n)) : [],
  };
}

function formatTime(ms: number) { if (ms <= 0) return "ready"; const seconds = Math.ceil(ms / 1000); const hours = Math.floor(seconds / 3600); const minutes = Math.floor((seconds % 3600) / 60); if (hours) return `${hours}h ${minutes}m`; if (minutes) return `${minutes}m ${seconds % 60}s`; return `${seconds}s`; }
function formatRecorded(record?: DiscoveryRecord) { if (!record?.at) return "before this journal began"; return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(record.at); }
function pairKey(a: SpeciesId, b: SpeciesId) { return [a, b].sort().join("+"); }
function rollMutation(multiplier = 1): { id: SpeciesId; odds: number } | null { const pool = species.filter((item) => item.kind === "mutation").sort((a, b) => b.odds - a.odds); const roll = Math.random(); let cursor = 0; for (const item of pool) { const adjustedOdds = Math.max(2, Math.round(item.odds / multiplier)); cursor += 1 / adjustedOdds; if (roll < cursor) return { id: item.id, odds: adjustedOdds }; } return null; }

export default function Home() {
  const [game, setGame] = useState<GameState>(() => createInitialState());
  const gameRef = useRef(game);
  const [hydrated, setHydrated] = useState(false);
  const [view, setView] = useState<ViewId>("field");
  const [growView, setGrowView] = useState<GrowView>("pots");
  const [potPage, setPotPage] = useState(0);
  const [journalPage, setJournalPage] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [sensoryOn, setSensoryOn] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [findEvent, setFindEvent] = useState<FindEvent | null>(null);
  const [rareReveal, setRareReveal] = useState<FindEvent | null>(null);
  const [flow, setFlow] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [parentA, setParentA] = useState<SpeciesId>("clover");
  const [parentB, setParentB] = useState<SpeciesId>("fern");
  const [breedingResult, setBreedingResult] = useState<string | null>(null);
  const [completionBurst, setCompletionBurst] = useState(false);
  const [viewport, setViewport] = useState({ width: 390, height: 844, kind: "portrait" as ViewportKind });
  const [boardSpace, setBoardSpace] = useState({ width: 320, height: 500 });
  const boardWrapRef = useRef<HTMLDivElement | null>(null);
  const flowRef = useRef(0);
  const flowMilestones = useRef(new Set<number>());
  const advancing = useRef(false);
  const feedbackTimer = useRef<number | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const commit = (next: GameState) => { gameRef.current = next; setGame(next); };

  useEffect(() => { gameRef.current = game; }, [game]);
  useEffect(() => {
    const measure = () => {
      const width = window.visualViewport?.width ?? window.innerWidth;
      const height = window.visualViewport?.height ?? window.innerHeight;
      const kind = viewportKind(width, height);
      setViewport({ width, height, kind });
      const current = gameRef.current;
      if (current.restored.length === 0 && current.shapeId !== "classic" && fieldShapes[current.shapeId].kind !== kind) commit({ ...current, shapeId: chooseShapeId(kind, current.stage) });
    };
    measure();
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    return () => { window.removeEventListener("resize", measure); window.visualViewport?.removeEventListener("resize", measure); };
  }, []);
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const old = { htmlOverflow: html.style.overflow, bodyOverflow: body.style.overflow, overscroll: body.style.overscrollBehavior, touch: body.style.touchAction };
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    body.style.touchAction = "none";
    return () => { html.style.overflow = old.htmlOverflow; body.style.overflow = old.bodyOverflow; body.style.overscrollBehavior = old.overscroll; body.style.touchAction = old.touch; };
  }, []);
  useEffect(() => {
    try {
      let raw = localStorage.getItem(SAVE_KEY);
      if (!raw) for (const key of LEGACY_SAVE_KEYS) { raw = localStorage.getItem(key); if (raw) break; }
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<GameState>;
        let normalized = normalizeState(parsed);
        if (!parsed.shapeId && normalized.restored.length === 0) normalized = { ...normalized, shapeId: chooseShapeId(viewportKind(window.innerWidth, window.innerHeight), normalized.stage) };
        commit(normalized);
      } else commit({ ...createInitialState(), shapeId: chooseShapeId(viewportKind(window.innerWidth, window.innerHeight), 1) });
      setSensoryOn(localStorage.getItem(SENSORY_KEY) === "on");
    } catch {} finally { setHydrated(true); }
  }, []);
  useEffect(() => { if (hydrated) localStorage.setItem(SAVE_KEY, JSON.stringify(game)); }, [game, hydrated]);
  useEffect(() => { if (hydrated) localStorage.setItem(SENSORY_KEY, sensoryOn ? "on" : "off"); }, [sensoryOn, hydrated]);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  useEffect(() => {
    if (!boardWrapRef.current) return;
    const observer = new ResizeObserver(([entry]) => setBoardSpace({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(boardWrapRef.current);
    return () => observer.disconnect();
  }, [view]);

  const shape = fieldShapes[game.shapeId] ?? fieldShapes.classic;
  const activeCells = useMemo(() => activeCellsFor(shape), [shape.id]);
  const activeSet = useMemo(() => new Set(activeCells), [activeCells]);
  const restoredSet = useMemo(() => new Set(game.restored.filter((cell) => activeSet.has(cell))), [game.restored, activeSet]);
  const cells = useMemo(() => Array.from({ length: shape.cols * shape.rows }, (_, index) => index), [shape.cols, shape.rows]);
  const mode = modeFor(game.stage);
  const environment = environmentFor(game.completedGardens);
  const theme = themes.find((item) => item.id === game.equippedTheme) ?? themes[0];
  const keeper = keeperProgress(game.lifetimeRestored);
  const progress = Math.round(restoredSet.size / Math.max(1, activeCells.length) * 100);
  const complete = restoredSet.size === activeCells.length;
  const caches = cacheCellsFor(game, shape);
  const specials = specialCellsFor(game.stage, shape);
  const bumps = bumpCellsFor(game.stage, shape);
  const activePlants = game.plots.slice(0, game.potsUnlocked).filter((plot) => plot.species).length;
  const readyPlants = game.plots.slice(0, game.potsUnlocked).filter((plot) => plot.species && plot.readyAt <= now).length;
  const boardRatio = shape.cols / shape.rows;
  const fittedBoard = useMemo(() => {
    const availableW = Math.max(80, boardSpace.width - 4);
    const availableH = Math.max(80, boardSpace.height - 4);
    let width = availableW;
    let height = width / boardRatio;
    if (height > availableH) { height = availableH; width = height * boardRatio; }
    return { width: Math.floor(width), height: Math.floor(height) };
  }, [boardSpace, boardRatio]);

  useEffect(() => {
    if (!complete || advancing.current) return;
    advancing.current = true;
    setCompletionBurst(true);
    tone(392,.2,.018); tone(523,.28,.014,.06); tone(659,.32,.011,.13);
    const timer = window.setTimeout(() => {
      const current = gameRef.current;
      const completedGardens = current.completedGardens + 1;
      const relic = relics.find((item) => item.unlockGardens === completedGardens && !current.discoveredRelics.includes(item.id));
      const bonus = 20 + Math.min(80, Math.round(Math.sqrt(current.stage) * 6)) + (relic ? 100 : 0);
      const nextStage = current.stage + 1;
      commit({
        ...current,
        stage: nextStage,
        shapeId: chooseShapeId(viewport.kind, nextStage),
        restored: [],
        completedGardens,
        dew: current.dew + bonus,
        discoveredRelics: relic ? [...current.discoveredRelics, relic.id] : current.discoveredRelics,
        revealedCaches: [],
        crackedRoots: [],
      });
      showFeedback(relic ? `${relic.name} · +${bonus} Dew` : `plot finished · +${bonus} Dew`);
      setCompletionBurst(false);
      advancing.current = false;
    }, 1100);
    return () => window.clearTimeout(timer);
  }, [complete, viewport.kind]);

  function getAudioContext() { if (!sensoryOn || typeof window === "undefined") return null; if (!audioContext.current) { const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext; if (!AudioContextClass) return null; audioContext.current = new AudioContextClass(); } if (audioContext.current.state === "suspended") void audioContext.current.resume(); return audioContext.current; }
  function tone(frequency: number, duration: number, volume: number, delay = 0) { const context = getAudioContext(); if (!context) return; const start = context.currentTime + delay; const oscillator = context.createOscillator(); const gain = context.createGain(); oscillator.type = "sine"; oscillator.frequency.setValueAtTime(frequency, start); gain.gain.setValueAtTime(.0001, start); gain.gain.exponentialRampToValueAtTime(volume, start + .012); gain.gain.exponentialRampToValueAtTime(.0001, start + duration); oscillator.connect(gain); gain.connect(context.destination); oscillator.start(start); oscillator.stop(start + duration + .03); }
  function vibrate(pattern: number | number[]) { if (sensoryOn && typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern); }
  function showFeedback(text: string) { setFeedback(text); if (feedbackTimer.current !== null) window.clearTimeout(feedbackTimer.current); feedbackTimer.current = window.setTimeout(() => setFeedback(null), 1200); }
  function presentDiscovery(event: FindEvent) { showFeedback(`${event.label} · ${event.detail}`); if ((event.odds ?? 0) >= 200) { setRareReveal(event); tone(392,.18,.017); tone(587,.28,.015,.07); tone(880,.42,.012,.16); vibrate([12,35,18,45,28]); } else if (event.kind === "curio" || (event.odds ?? 0) >= 40) { setFindEvent(event); tone(event.kind === "curio" ? 760 : 610,.2,.018); vibrate([8,18,10]); } }
  function growthPulse(seconds: number) { const current = gameRef.current; const t = Date.now(); const plots = current.plots.map((plot) => plot.species && plot.readyAt > t ? { ...plot, readyAt: Math.max(t, plot.readyAt - seconds * 1000) } : plot); commit({ ...current, plots }); showFeedback(`flow · plants gain ${seconds}s`); }
  function beginSweep() { flowRef.current = 0; flowMilestones.current = new Set(); setFlow(0); setDragging(true); }
  function endSweep() { setDragging(false); }
  function restoreCell(index: number, source: "player" | "pet" = "player") {
    const before = gameRef.current;
    const result = applyRestore(before, index);
    if (!result.changed) return;
    commit(result.state);
    if (result.message) showFeedback(result.message);
    if (result.finds.length) presentDiscovery(result.finds[result.finds.length - 1]);
    else if (result.glimmerCount) showFeedback(`glimmer · +${result.glimmerCount * GLIMMER_BONUS} Dew`);
    if (source === "pet" && result.restoredCount > 0) {
      const previous = new Set(before.restored);
      const cells = result.state.restored.filter((cell) => !previous.has(cell));
      window.dispatchEvent(new CustomEvent("stillgarden-pet-restored", { detail: { cells } }));
    }
    if (source === "player" && result.restoredCount > 0) {
      flowRef.current += result.restoredCount;
      setFlow(flowRef.current);
      for (const threshold of [16, 32, 48]) if (flowRef.current >= threshold && !flowMilestones.current.has(threshold)) { flowMilestones.current.add(threshold); growthPulse(threshold === 16 ? 6 : threshold === 32 ? 10 : 15); }
    }
  }
  useEffect(() => {
    const restoreFromPet = (event: Event) => {
      const index = Number((event as CustomEvent<{ index?: number }>).detail?.index);
      if (Number.isInteger(index)) restoreCell(index, "pet");
    };
    window.addEventListener("stillgarden-pet-restore", restoreFromPet);
    return () => window.removeEventListener("stillgarden-pet-restore", restoreFromPet);
  }, [sensoryOn]);

  function plantSeed(plotIndex: number, seedId: SpeciesId) {
    const current = gameRef.current;
    if (plotIndex >= current.potsUnlocked || current.plots[plotIndex].species || current.seeds[seedId] <= 0) return;
    const item = species.find((entry) => entry.id === seedId)!;
    const plantedAt = Date.now();
    const plots = current.plots.map((plot, index) => index === plotIndex ? { species: seedId, plantedAt, readyAt: plantedAt + growthTime(item), watered: false, fertilized: false } : plot);
    commit({ ...current, plots, seeds: { ...current.seeds, [seedId]: current.seeds[seedId] - 1 } });
    showFeedback(`${item.name} planted`);
  }
  function waterPlot(plotIndex: number) {
    const current = gameRef.current; const plot = current.plots[plotIndex];
    if (!plot.species || plot.watered || plot.readyAt <= Date.now()) return;
    const reduction = Math.min(.5, .16 + (current.waterLevel - 1) * .025);
    const t = Date.now(); const remaining = plot.readyAt - t;
    const plots = current.plots.map((item, index) => index === plotIndex ? { ...item, watered: true, readyAt: t + remaining * (1 - reduction) } : item);
    commit({ ...current, plots }); showFeedback(`watered · ${Math.round(reduction * 100)}% shorter`);
  }
  function fertilizePlot(plotIndex: number) {
    const current = gameRef.current; const plot = current.plots[plotIndex];
    if (!plot.species || plot.fertilized || current.fertilizer <= 0 || plot.readyAt <= Date.now()) return;
    const t = Date.now(); const remaining = plot.readyAt - t;
    const plots = current.plots.map((item, index) => index === plotIndex ? { ...item, fertilized: true, readyAt: t + remaining * .72 } : item);
    commit({ ...current, plots, fertilizer: current.fertilizer - 1 }); showFeedback("fertilized · growth shortened");
  }
  function harvestPlot(plotIndex: number) {
    const current = gameRef.current; const plot = current.plots[plotIndex];
    if (!plot.species || plot.readyAt > Date.now()) return;
    const plant = species.find((item) => item.id === plot.species)!;
    const reward = 6 + plant.rarity * 4;
    const mutation = rollMutation(plot.fertilized ? 1.45 : 1);
    const plots = current.plots.map((item, index) => index === plotIndex ? emptyPlot() : item);
    let next: GameState = { ...current, plots, dew: current.dew + reward, harvested: { ...current.harvested, [plant.id]: current.harvested[plant.id] + 1 }, seeds: { ...current.seeds, [plant.id]: current.seeds[plant.id] + 1 }, discoveredSpecies: current.discoveredSpecies.includes(plant.id) ? current.discoveredSpecies : [...current.discoveredSpecies, plant.id], discoveryLog: current.discoveredSpecies.includes(plant.id) ? current.discoveryLog : recordDiscovery(current, plant.id, "first harvested") };
    if (mutation) {
      const mutated = species.find((item) => item.id === mutation.id)!;
      const first = !next.discoveredSpecies.includes(mutated.id);
      next = { ...next, seeds: { ...next.seeds, [mutated.id]: next.seeds[mutated.id] + 1 }, discoveredSpecies: first ? [...next.discoveredSpecies, mutated.id] : next.discoveredSpecies, discoveryLog: first ? recordDiscovery(next, mutated.id, `mutation from ${plant.name}`) : next.discoveryLog };
      commit(next);
      presentDiscovery({ kind: "mutation", label: `${mutated.name} mutation`, detail: `${plant.name} produced a changed seed`, rarity: mutated.rarity, odds: mutation.odds, color: mutated.color });
      return;
    }
    commit(next); showFeedback(`${plant.name} harvested · +${reward} Dew`);
  }
  function breed() {
    const current = gameRef.current; const needA = parentA === parentB ? 2 : 1;
    if (current.harvested[parentA] < needA || current.harvested[parentB] < 1 || current.dew < BREED_COST) { setBreedingResult(`Need harvested parents and ${BREED_COST} Dew.`); return; }
    const match = species.find((item) => item.parents && pairKey(item.parents[0] as SpeciesId, item.parents[1] as SpeciesId) === pairKey(parentA, parentB));
    const mutation = rollMutation(1.2);
    let outcome: SpeciesId; let mutationOdds: number | null = null;
    if (mutation) { outcome = mutation.id; mutationOdds = mutation.odds; }
    else if (match && Math.random() < .72) outcome = match.id;
    else outcome = Math.random() < .5 ? parentA : parentB;
    const harvested = { ...current.harvested }; harvested[parentA] -= 1; harvested[parentB] -= 1;
    const item = species.find((entry) => entry.id === outcome)!;
    const first = !current.discoveredSpecies.includes(outcome);
    const next = { ...current, dew: current.dew - BREED_COST, harvested, seeds: { ...current.seeds, [outcome]: current.seeds[outcome] + 1 }, discoveredSpecies: first ? [...current.discoveredSpecies, outcome] : current.discoveredSpecies, discoveryLog: first ? recordDiscovery(current, outcome, mutationOdds ? "unexpected mutation during a cross" : `crossed from ${species.find((s) => s.id === parentA)?.name} × ${species.find((s) => s.id === parentB)?.name}`) : current.discoveryLog };
    commit(next); setBreedingResult(`${item.name} seed created.`);
    if (mutationOdds) presentDiscovery({ kind: "mutation", label: `${item.name} mutation`, detail: "the cross changed unexpectedly", rarity: item.rarity, odds: mutationOdds, color: item.color });
    else showFeedback(`cross produced ${item.name}`);
  }
  function buyFertilizer() { const c = gameRef.current; if (c.dew >= 140) commit({ ...c, dew: c.dew - 140, fertilizer: c.fertilizer + 1 }); }
  function upgradeShovel() { const c = gameRef.current; const cost = toolUpgradeCost(c.shovelLevel, 260); if (c.shovelLevel < MAX_TOOL_LEVEL && c.dew >= cost) commit({ ...c, dew: c.dew - cost, shovelLevel: c.shovelLevel + 1 }); }
  function upgradeWateringCan() { const c = gameRef.current; const cost = toolUpgradeCost(c.waterLevel, 220); if (c.waterLevel < MAX_TOOL_LEVEL && c.dew >= cost) commit({ ...c, dew: c.dew - cost, waterLevel: c.waterLevel + 1 }); }
  function unlockPot() { const c = gameRef.current; const cost = potUpgradeCost(c.potsUnlocked); if (c.potsUnlocked < MAX_POTS && c.dew >= cost) commit({ ...c, dew: c.dew - cost, potsUnlocked: c.potsUnlocked + 1 }); }
  function buyTheme(themeId: ThemeId) { const c = gameRef.current; const item = themes.find((entry) => entry.id === themeId)!; if (c.ownedThemes.includes(themeId)) { commit({ ...c, equippedTheme: themeId }); return; } if (keeper.level >= item.unlockLevel && c.dew >= item.cost) commit({ ...c, dew: c.dew - item.cost, ownedThemes: [...c.ownedThemes, themeId], equippedTheme: themeId }); }

  const plantableSeeds = species.filter((item) => game.seeds[item.id] > 0);
  const breedingStock = species.filter((item) => game.harvested[item.id] > 0);
  const nextEnvironment = environments.find((item) => item.unlockGardens > game.completedGardens);
  const nextRelic = relics.find((item) => item.unlockGardens > game.completedGardens);
  const visiblePots = game.plots.slice(potPage * 4, potPage * 4 + 4);
  const potPageCount = Math.ceil(game.potsUnlocked / 4);
  const journalPerPage = viewport.width < 720 ? 1 : 2;
  const journalMaxPage = Math.max(0, Math.ceil(species.length / journalPerPage) - 1);
  const journalEntries = species.slice(journalPage * journalPerPage, journalPage * journalPerPage + journalPerPage);
  useEffect(() => { if (journalPage > journalMaxPage) setJournalPage(journalMaxPage); }, [journalPage, journalMaxPage]);

  return <main className={styles.shell} data-view={view} data-environment={environment.id} style={{ "--accent": theme.accent, "--accent-2": theme.accent2, "--ground": theme.ground, "--env-glow": environment.glow, "--env-surface": environment.surface } as React.CSSProperties}>
    <div className={styles.ambient} aria-hidden="true" />
    <section className={styles.app}>
      <header className={styles.topbar}>
        <div className={styles.brand}><span className={styles.brandLeaf}/><strong>stillgarden</strong><span>{view === "field" ? `plot ${game.stage}` : view === "grow" ? "potting room" : "field journal"}</span></div>
        <div className={styles.statusCluster}><button className={styles.sensoryButton} type="button" aria-pressed={sensoryOn} onClick={() => setSensoryOn((v) => !v)}>sound {sensoryOn ? "on" : "off"}</button><div className={styles.wallet}><span className={styles.dewDrop}/><strong>{game.dew}</strong><span>Dew</span></div></div>
      </header>
      <nav className={styles.nav} aria-label="Stillgarden sections"><button className={view === "field" ? styles.navActive : ""} onClick={() => setView("field")}>tend</button><button className={view === "grow" ? styles.navActive : ""} onClick={() => setView("grow")}>grow</button><button className={view === "collection" ? styles.navActive : ""} onClick={() => setView("collection")}>journal</button></nav>

      {view === "field" && <section className={styles.fieldView}>
        <div className={styles.fieldMeta}><div><strong>{mode.name}</strong><span>{shape.name} · {environment.name}</span></div><div><span>{caches.length - game.revealedCaches.filter((cell) => caches.includes(cell)).length} buried</span><span>flow {flow}</span></div></div>
        <div className={styles.progressLine}><span>Keeper {keeper.level}</span><div className={styles.progressTrack}><div style={{ width: `${keeper.fraction * 100}%` }}/></div><span>{progress}%</span></div>
        <div className={styles.boardWrap} ref={boardWrapRef}>
          <div className={`${styles.board} ${complete ? styles.complete : ""}`} data-testid="garden-board" data-mode={mode.id} data-dragging={dragging ? "true" : "false"} data-settling={completionBurst ? "true" : "false"} data-shape={shape.id} style={{ "--field-cols": shape.cols, "--field-rows": shape.rows, width: `${fittedBoard.width}px`, height: `${fittedBoard.height}px` } as React.CSSProperties} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); beginSweep(); }} onPointerUp={endSweep} onPointerCancel={endSweep} onPointerMove={(event) => { const rect = event.currentTarget.getBoundingClientRect(); event.currentTarget.style.setProperty("--pointer-x", `${event.clientX - rect.left}px`); event.currentTarget.style.setProperty("--pointer-y", `${event.clientY - rect.top}px`); if (!dragging) return; const target = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null; const value = target?.closest<HTMLElement>("[data-cell]")?.dataset.cell; if (value !== undefined) restoreCell(Number(value)); }}>
            {cells.map((index) => {
              if (!activeSet.has(index)) return <span key={index} className={styles.voidCell} aria-hidden="true"/>;
              const restored = restoredSet.has(index); const special = specials.includes(index); const cracked = game.crackedRoots.includes(index); const bump = bumps.includes(index);
              return <button key={index} type="button" data-cell={index} data-restored={restored ? "true" : "false"} data-special={special ? mode.id : "none"} data-bump={bump ? "true" : "false"} data-cracked={cracked ? "true" : "false"} data-glimmer={restored && isGlimmerCell(index, game.stage) ? "true" : "false"} className={styles.cell} onPointerDown={() => restoreCell(index)} onPointerEnter={() => { if (dragging) restoreCell(index); }} aria-label={bump && !restored ? "Raised mound" : restored ? "Restored patch" : "Untended patch"}><span className={styles.sprout}/><span className={styles.specialMark}/><span className={styles.bumpMark}/></button>;
            })}
          </div>
          {feedback && <div className={styles.feedback}>{feedback}</div>}
          {completionBurst && <div className={styles.settle}><span>finished</span></div>}
        </div>
        <div className={styles.fieldStatus}><span>{activeCells.length - restoredSet.size} patches left</span><span>{nextEnvironment ? `${nextEnvironment.name} · garden ${nextEnvironment.unlockGardens}` : "all landscapes found"}</span><span>{nextRelic ? `relic · garden ${nextRelic.unlockGardens}` : "relic shelf complete"}</span></div>
      </section>}

      {view === "grow" && <section className={styles.growView}>
        <div className={styles.subnav}><button className={growView === "pots" ? styles.subnavActive : ""} onClick={() => setGrowView("pots")}>pots</button><button className={growView === "shed" ? styles.subnavActive : ""} onClick={() => setGrowView("shed")}>tools + crossing</button><span>{activePlants} growing · {readyPlants} ready</span></div>
        {growView === "pots" ? <div className={styles.potsStage}>
          <div className={styles.potPager}><button disabled={potPage === 0} onClick={() => setPotPage((p) => Math.max(0, p - 1))}>‹</button><span>bench {potPage + 1}/{Math.max(1, potPageCount)}</span><button disabled={potPage >= potPageCount - 1} onClick={() => setPotPage((p) => Math.min(potPageCount - 1, p + 1))}>›</button></div>
          <div className={styles.potGrid}>{visiblePots.map((plot, offset) => { const index = potPage * 4 + offset; const unlocked = index < game.potsUnlocked; const plant = plot.species ? species.find((item) => item.id === plot.species)! : null; const remaining = plant ? Math.max(0, plot.readyAt - now) : 0; const total = plant ? Math.max(1, plot.readyAt - plot.plantedAt) : 1; const plantProgress = plant ? Math.max(0, Math.min(100, 100 - remaining / total * 100)) : 0; return <article className={`${styles.potCard} ${!unlocked ? styles.potLocked : ""}`} key={index}>{!unlocked ? <div className={styles.lockedPot}><div className={styles.potShape}/><strong>unused bench</strong><span>unlock it from the shed</span></div> : plant ? <><div className={styles.plantVisual} style={{ "--plant": plant.color, "--growth": `${plantProgress}%` } as React.CSSProperties}><span/><span/><span/></div><div className={styles.potCopy}><div><strong>{plant.name}</strong><span>{remaining <= 0 ? "ready" : formatTime(remaining)}</span></div><div className={styles.miniTrack}><span style={{ width: `${plantProgress}%` }}/></div></div><div className={styles.potActions}>{remaining <= 0 ? <button className={styles.primaryAction} onClick={() => harvestPlot(index)}>harvest</button> : <><button disabled={plot.watered} onClick={() => waterPlot(index)}>{plot.watered ? "watered" : "water"}</button><button disabled={plot.fertilized || game.fertilizer <= 0} onClick={() => fertilizePlot(index)}>{plot.fertilized ? "fed" : `feed · ${game.fertilizer}`}</button></>}</div></> : <div className={styles.emptyPot}><div className={styles.potShape}/><strong>empty pot</strong><div className={styles.seedPicker}>{plantableSeeds.length ? plantableSeeds.slice(0, 7).map((item) => <button key={item.id} onClick={() => plantSeed(index, item.id)}><span style={{ background: item.color }}/>{item.name}<em>×{game.seeds[item.id]}</em></button>) : <span>no loose seeds</span>}</div></div>}</article>; })}</div>
        </div> : <div className={styles.shedStage}><section className={styles.toolShed}><h2>workbench</h2><div className={styles.toolList}><article><span className={styles.toolIcon}>⌁</span><div><strong>Shovel · L{game.shovelLevel}/{MAX_TOOL_LEVEL}</strong><span>More buried finds every few levels.</span></div><button disabled={game.shovelLevel >= MAX_TOOL_LEVEL || game.dew < toolUpgradeCost(game.shovelLevel, 260)} onClick={upgradeShovel}>{game.shovelLevel >= MAX_TOOL_LEVEL ? "max" : `${toolUpgradeCost(game.shovelLevel, 260)} Dew`}</button></article><article><span className={styles.toolIcon}>◒</span><div><strong>Watering can · L{game.waterLevel}/{MAX_TOOL_LEVEL}</strong><span>Each level trims a little more growth time.</span></div><button disabled={game.waterLevel >= MAX_TOOL_LEVEL || game.dew < toolUpgradeCost(game.waterLevel, 220)} onClick={upgradeWateringCan}>{game.waterLevel >= MAX_TOOL_LEVEL ? "max" : `${toolUpgradeCost(game.waterLevel, 220)} Dew`}</button></article><article><span className={styles.toolIcon}>✦</span><div><strong>Fertilizer · {game.fertilizer}</strong><span>One-use growth cut and mutation boost.</span></div><button disabled={game.dew < 140} onClick={buyFertilizer}>140 Dew</button></article><article><span className={styles.toolIcon}>◡</span><div><strong>Pots · {game.potsUnlocked}/{MAX_POTS}</strong><span>Expand the bench gradually.</span></div><button disabled={game.potsUnlocked >= MAX_POTS || game.dew < potUpgradeCost(game.potsUnlocked)} onClick={unlockPot}>{game.potsUnlocked >= MAX_POTS ? "max" : `${potUpgradeCost(game.potsUnlocked)} Dew`}</button></article></div></section><section className={styles.breedingLab}><h2>seed crossing</h2><div className={styles.parentRow}><select value={parentA} onChange={(event) => setParentA(event.target.value as SpeciesId)}>{breedingStock.length ? breedingStock.map((item) => <option key={item.id} value={item.id}>{item.name} · {game.harvested[item.id]}</option>) : <option value="clover">No harvested plants</option>}</select><span>×</span><select value={parentB} onChange={(event) => setParentB(event.target.value as SpeciesId)}>{breedingStock.length ? breedingStock.map((item) => <option key={item.id} value={item.id}>{item.name} · {game.harvested[item.id]}</option>) : <option value="fern">No harvested plants</option>}</select></div><p>Known pairs favour a hybrid; a cross can still mutate.</p><button className={styles.breedButton} disabled={!breedingStock.length || game.dew < BREED_COST} onClick={breed}>cross · {BREED_COST} Dew</button>{breedingResult && <div className={styles.breedingResult}>{breedingResult}</div>}<div className={styles.themeStrip}>{themes.map((item) => { const owned = game.ownedThemes.includes(item.id); const equipped = game.equippedTheme === item.id; const unlocked = keeper.level >= item.unlockLevel; return <button key={item.id} style={{ "--swatch": item.accent } as React.CSSProperties} disabled={!owned && (!unlocked || game.dew < item.cost)} onClick={() => buyTheme(item.id)}><i/>{item.name}<small>{equipped ? "on" : owned ? "owned" : unlocked ? `${item.cost}` : `K${item.unlockLevel}`}</small></button>; })}</div></section></div>}
      </section>}

      {view === "collection" && <section className={styles.journalView}>
        <div className={styles.bookTop}><span>Field journal · {game.discoveredSpecies.length}/{species.length} flora</span><span>Keeper {keeper.level}</span></div>
        <div className={styles.book} data-testid="journal-book" data-single={journalPerPage === 1 ? "true" : "false"}>
          {journalEntries.map((item, pageIndex) => { const known = game.discoveredSpecies.includes(item.id); const record = game.discoveryLog[item.id]; return <article className={styles.bookPage} key={item.id}><div className={styles.pageNumber}>{journalPage * journalPerPage + pageIndex + 1}</div>{known ? <><div className={styles.pressedPlant} style={{ "--plant": item.color } as React.CSSProperties}><span/><span/><span/></div><p className={styles.handNote}>{item.kind}</p><h2>{item.name}</h2><p>{item.note}</p><dl><div><dt>first recorded</dt><dd>{formatRecorded(record)}</dd></div><div><dt>came from</dt><dd>{record?.source ?? "before this journal began"}</dd></div><div><dt>rarity</dt><dd>{rarityName(item.rarity)}</dd></div><div><dt>on hand</dt><dd>{game.seeds[item.id]} seeds · {game.harvested[item.id]} harvested</dd></div>{item.parents && <div><dt>cross</dt><dd>{species.find((s) => s.id === item.parents?.[0])?.name} × {species.find((s) => s.id === item.parents?.[1])?.name}</dd></div>}</dl></> : <><div className={styles.unknownSpecimen}>?</div><p className={styles.handNote}>{item.kind === "hybrid" ? "an untested cross" : item.kind === "mutation" ? "an unrecorded mutation" : "somewhere ahead"}</p><h2>not recorded</h2><p>{item.kind === "wild" ? `Wild seed appears from around garden ${item.unlockStage}.` : item.kind === "hybrid" ? "Try crossing harvested plants." : "Mutations can appear during growing and crossing."}</p></>}</article>; })}
        </div>
        <div className={styles.bookControls} data-testid="journal-controls"><button disabled={journalPage === 0} onClick={() => setJournalPage((p) => Math.max(0, p - 1))}>← earlier</button><span>{journalPage + 1} / {journalMaxPage + 1}</span><button disabled={journalPage >= journalMaxPage} onClick={() => setJournalPage((p) => Math.min(journalMaxPage, p + 1))}>later →</button></div>
      </section>}

      {findEvent && <button className={styles.findToast} onClick={() => setFindEvent(null)}><span>{rarityName(findEvent.rarity)} {findEvent.kind}</span><strong>{findEvent.label}</strong><em>{findEvent.detail}{findEvent.odds ? ` · about 1 in ${findEvent.odds}` : ""}</em></button>}
    </section>
    {rareReveal && <div className={rareStyles.rareOverlay} role="dialog" aria-modal="true" aria-label="Rare discovery"><div className={rareStyles.rareCard} style={{ "--rare-color": rareReveal.color ?? theme.accent } as React.CSSProperties}><span className={rareStyles.rareKicker}>{rarityName(rareReveal.rarity)} discovery</span><div className={rareStyles.rareOrb}><span/><span/></div><h2>{rareReveal.label}</h2><p>{rareReveal.detail}</p><div className={rareStyles.rareOdds}><span>approximate chance</span><strong>1 in {rareReveal.odds?.toLocaleString()}</strong></div><button onClick={() => setRareReveal(null)}>press into the journal</button></div></div>}
  </main>;
}
