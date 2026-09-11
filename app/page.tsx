"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import styles from "./relax.module.css";

const CELL_COUNT = 96;
const SAVE_KEY = "stillgarden-v1";
const SENSORY_KEY = "stillgarden-sensory";
const DEW_PER_PATCH = 2;
const GLIMMER_BONUS = 8;

const moods = ["Moss", "Rain", "Bloom", "Dusk"] as const;

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

const environments = [
  { id: "meadow", name: "Quiet Meadow", description: "open earth and morning haze", unlockGardens: 0, glow: "#d7e0cc", surface: "#8a927b" },
  { id: "shallows", name: "Rain Shallows", description: "water gathers between smooth stones", unlockGardens: 3, glow: "#c9dce1", surface: "#738b91" },
  { id: "grove", name: "Lantern Grove", description: "deep shade with pockets of warm light", unlockGardens: 7, glow: "#dfd2ae", surface: "#68735f" },
  { id: "moonpond", name: "Moon Pond", description: "dark water and pale reflections", unlockGardens: 12, glow: "#c9c6db", surface: "#686b7c" },
  { id: "glasshouse", name: "Glasshouse", description: "soft condensation and filtered sun", unlockGardens: 18, glow: "#d7e4d9", surface: "#768c82" },
] as const;

const LEVEL_THRESHOLDS = [0, 50, 140, 260, 420, 620, 860, 1140, 1480, 1880, 2340, 2860];

type ThemeId = (typeof themes)[number]["id"];
type RelicId = (typeof relics)[number]["id"];
type Environment = (typeof environments)[number];

type GameState = {
  stage: number;
  restored: number[];
  dew: number;
  lifetimeRestored: number;
  completedGardens: number;
  ownedThemes: ThemeId[];
  equippedTheme: ThemeId;
  discoveredRelics: RelicId[];
  recentDiscovery: RelicId | null;
};

type Action =
  | { type: "hydrate"; state: GameState }
  | { type: "restore"; index: number }
  | { type: "advance" }
  | { type: "buy"; themeId: ThemeId }
  | { type: "equip"; themeId: ThemeId }
  | { type: "dismissDiscovery" };

const initialState: GameState = {
  stage: 1,
  restored: [],
  dew: 0,
  lifetimeRestored: 0,
  completedGardens: 0,
  ownedThemes: ["fern"],
  equippedTheme: "fern",
  discoveredRelics: [],
  recentDiscovery: null,
};

function levelFor(total: number) {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i += 1) {
    if (total >= LEVEL_THRESHOLDS[i]) level = i + 1;
  }
  return level;
}

function environmentFor(completedGardens: number): Environment {
  let current: Environment = environments[0];
  for (const environment of environments) {
    if (completedGardens >= environment.unlockGardens) current = environment;
  }
  return current;
}

function isGlimmerCell(index: number, stage: number) {
  return (index * 17 + stage * 11) % 31 === 0;
}

function restorationTargets(index: number, stage: number) {
  const targets = new Set<number>([index]);
  const add = (value: number) => {
    if (value >= 0 && value < CELL_COUNT) targets.add(value);
  };

  if (index % 7 === stage % 7) add(index + (index % 2 === 0 ? 1 : -1));

  if ((index * 5 + stage) % 19 === 0) {
    add(index - 2);
    add(index - 1);
    add(index + 1);
    add(index + 2);
  }

  return [...targets];
}

function normalizeSave(raw: unknown): GameState {
  if (!raw || typeof raw !== "object") return initialState;
  const saved = raw as Partial<GameState>;
  const stage = Number.isFinite(saved.stage) ? Math.max(1, Number(saved.stage)) : 1;
  const restored = Array.isArray(saved.restored)
    ? [...new Set(saved.restored.filter((n): n is number => Number.isInteger(n) && n >= 0 && n < CELL_COUNT))]
    : [];

  const inferredLifetime = (stage - 1) * CELL_COUNT + restored.length;
  const lifetimeRestored = Number.isFinite(saved.lifetimeRestored) ? Math.max(0, Number(saved.lifetimeRestored)) : inferredLifetime;
  const completedGardens = Number.isFinite(saved.completedGardens) ? Math.max(0, Number(saved.completedGardens)) : Math.max(0, stage - 1);
  const dew = Number.isFinite(saved.dew) ? Math.max(0, Number(saved.dew)) : inferredLifetime * DEW_PER_PATCH + completedGardens * 40;

  const validThemeIds = new Set<ThemeId>(themes.map((theme) => theme.id));
  const ownedThemes: ThemeId[] = Array.isArray(saved.ownedThemes)
    ? saved.ownedThemes.filter((id): id is ThemeId => validThemeIds.has(id as ThemeId))
    : ["fern"];
  if (!ownedThemes.includes("fern")) ownedThemes.unshift("fern");

  const equippedTheme: ThemeId =
    typeof saved.equippedTheme === "string" &&
    validThemeIds.has(saved.equippedTheme as ThemeId) &&
    ownedThemes.includes(saved.equippedTheme as ThemeId)
      ? (saved.equippedTheme as ThemeId)
      : "fern";

  const validRelicIds = new Set<RelicId>(relics.map((relic) => relic.id));
  const savedRelics: RelicId[] = Array.isArray(saved.discoveredRelics)
    ? saved.discoveredRelics.filter((id): id is RelicId => validRelicIds.has(id as RelicId))
    : [];
  const retroactiveRelics = relics
    .filter((relic) => completedGardens >= relic.unlockGardens)
    .map((relic) => relic.id);
  const discoveredRelics = [...new Set<RelicId>([...savedRelics, ...retroactiveRelics])];

  return {
    stage,
    restored,
    dew,
    lifetimeRestored,
    completedGardens,
    ownedThemes,
    equippedTheme,
    discoveredRelics,
    recentDiscovery: null,
  };
}

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "hydrate":
      return action.state;
    case "restore": {
      const current = new Set(state.restored);
      if (current.has(action.index)) return state;

      const fresh = restorationTargets(action.index, state.stage).filter((target) => !current.has(target));
      fresh.forEach((target) => current.add(target));
      const glimmers = fresh.filter((target) => isGlimmerCell(target, state.stage)).length;

      return {
        ...state,
        restored: Array.from(current),
        dew: state.dew + fresh.length * DEW_PER_PATCH + glimmers * GLIMMER_BONUS,
        lifetimeRestored: state.lifetimeRestored + fresh.length,
        recentDiscovery: null,
      };
    }
    case "advance": {
      if (state.restored.length !== CELL_COUNT) return state;
      const completedGardens = state.completedGardens + 1;
      const discovered = relics.find(
        (relic) => relic.unlockGardens === completedGardens && !state.discoveredRelics.includes(relic.id),
      );
      const completionBonus = 40 + Math.min((state.stage - 1) * 5, 40);
      const discoveryBonus = discovered ? 30 : 0;
      return {
        ...state,
        stage: state.stage + 1,
        restored: [],
        dew: state.dew + completionBonus + discoveryBonus,
        completedGardens,
        discoveredRelics: discovered ? [...state.discoveredRelics, discovered.id] : state.discoveredRelics,
        recentDiscovery: discovered?.id ?? null,
      };
    }
    case "buy": {
      const theme = themes.find((item) => item.id === action.themeId);
      if (!theme || state.ownedThemes.includes(theme.id)) return state;
      if (levelFor(state.lifetimeRestored) < theme.unlockLevel || state.dew < theme.cost) return state;
      return {
        ...state,
        dew: state.dew - theme.cost,
        ownedThemes: [...state.ownedThemes, theme.id],
        equippedTheme: theme.id,
      };
    }
    case "equip":
      return state.ownedThemes.includes(action.themeId) ? { ...state, equippedTheme: action.themeId } : state;
    case "dismissDiscovery":
      return { ...state, recentDiscovery: null };
    default:
      return state;
  }
}

export default function RelaxPage() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [dragging, setDragging] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [showCollection, setShowCollection] = useState(false);
  const [sensoryOn, setSensoryOn] = useState(false);
  const [pulseCells, setPulseCells] = useState<Set<number>>(() => new Set());
  const [feedback, setFeedback] = useState<string | null>(null);
  const [completionBurst, setCompletionBurst] = useState(false);
  const advancing = useRef(false);
  const audioContext = useRef<AudioContext | null>(null);
  const pulseTimers = useRef<number[]>([]);
  const feedbackTimer = useRef<number | null>(null);

  const restoredSet = useMemo(() => new Set(state.restored), [state.restored]);
  const cells = useMemo(() => Array.from({ length: CELL_COUNT }, (_, index) => index), []);
  const complete = state.restored.length === CELL_COUNT;
  const progress = Math.round((state.restored.length / CELL_COUNT) * 100);
  const mood = moods[(state.stage - 1) % moods.length];
  const theme = themes.find((item) => item.id === state.equippedTheme) ?? themes[0];
  const environment = environmentFor(state.completedGardens);
  const level = levelFor(state.lifetimeRestored);
  const currentThreshold = LEVEL_THRESHOLDS[Math.min(level - 1, LEVEL_THRESHOLDS.length - 1)];
  const nextThreshold = LEVEL_THRESHOLDS[Math.min(level, LEVEL_THRESHOLDS.length - 1)];
  const levelProgress = level >= LEVEL_THRESHOLDS.length
    ? 100
    : Math.round(((state.lifetimeRestored - currentThreshold) / Math.max(1, nextThreshold - currentThreshold)) * 100);

  const nextTheme = themes.find((item) => item.unlockLevel > level);
  const nextRelic = relics.find((item) => item.unlockGardens > state.completedGardens);
  const nextEnvironment = environments.find((item) => item.unlockGardens > state.completedGardens);

  const nextReward = useMemo(() => {
    const candidates: Array<{ kind: string; name: string; detail: string; effort: number }> = [];
    if (nextTheme) {
      const threshold = LEVEL_THRESHOLDS[nextTheme.unlockLevel - 1] ?? state.lifetimeRestored;
      const remaining = Math.max(0, threshold - state.lifetimeRestored);
      candidates.push({ kind: "style", name: nextTheme.name, detail: `${remaining} patches until Keeper ${nextTheme.unlockLevel}`, effort: remaining });
    }
    if (nextRelic) {
      const gardensAway = nextRelic.unlockGardens - state.completedGardens;
      const effort = Math.max(0, (gardensAway - 1) * CELL_COUNT + (CELL_COUNT - state.restored.length));
      candidates.push({ kind: "relic", name: nextRelic.name, detail: `${gardensAway} garden${gardensAway === 1 ? "" : "s"} away`, effort });
    }
    if (nextEnvironment) {
      const gardensAway = nextEnvironment.unlockGardens - state.completedGardens;
      const effort = Math.max(0, (gardensAway - 1) * CELL_COUNT + (CELL_COUNT - state.restored.length));
      candidates.push({ kind: "world", name: nextEnvironment.name, detail: `${gardensAway} garden${gardensAway === 1 ? "" : "s"} until the world changes`, effort });
    }
    return candidates.sort((a, b) => a.effort - b.effort)[0] ?? {
      kind: "garden",
      name: "Open-ended garden",
      detail: "Keep tending at your own pace",
      effort: 0,
    };
  }, [nextEnvironment, nextRelic, nextTheme, state.completedGardens, state.lifetimeRestored, state.restored.length]);

  const recentRelic = state.recentDiscovery
    ? relics.find((relic) => relic.id === state.recentDiscovery) ?? null
    : null;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) dispatch({ type: "hydrate", state: normalizeSave(JSON.parse(raw)) });
      setSensoryOn(localStorage.getItem(SENSORY_KEY) === "on");
    } catch {
      // Local settings should never block the relaxation loop.
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const { recentDiscovery: _recentDiscovery, ...save } = state;
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  }, [hydrated, state]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(SENSORY_KEY, sensoryOn ? "on" : "off");
  }, [hydrated, sensoryOn]);

  useEffect(() => () => {
    pulseTimers.current.forEach((timer) => window.clearTimeout(timer));
    if (feedbackTimer.current !== null) window.clearTimeout(feedbackTimer.current);
  }, []);

  useEffect(() => {
    if (!complete || advancing.current) return;
    advancing.current = true;
    setCompletionBurst(true);
    playCompletionFeedback();
    const timer = window.setTimeout(() => {
      dispatch({ type: "advance" });
      setCompletionBurst(false);
      advancing.current = false;
    }, 1450);
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
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
  }

  function haptic(pattern: number | number[]) {
    if (!sensoryOn || typeof navigator === "undefined" || !("vibrate" in navigator)) return;
    navigator.vibrate(pattern);
  }

  function playPatchFeedback(glimmer: boolean, chainSize: number) {
    if (!sensoryOn) return;
    if (glimmer) {
      tone(540, 0.16, 0.025);
      tone(810, 0.2, 0.017, 0.045);
      haptic([8, 22, 12]);
    } else if (chainSize > 1) {
      tone(390, 0.12, 0.018);
      tone(520, 0.14, 0.014, 0.035);
      haptic(10);
    } else {
      tone(330, 0.09, 0.012);
      haptic(5);
    }
  }

  function playCompletionFeedback() {
    if (!sensoryOn) return;
    tone(392, 0.28, 0.018);
    tone(523, 0.32, 0.015, 0.07);
    tone(659, 0.38, 0.012, 0.15);
    haptic([10, 35, 12, 35, 18]);
  }

  function flashCells(indices: number[]) {
    setPulseCells((current) => {
      const next = new Set(current);
      indices.forEach((index) => next.add(index));
      return next;
    });
    const timer = window.setTimeout(() => {
      setPulseCells((current) => {
        const next = new Set(current);
        indices.forEach((index) => next.delete(index));
        return next;
      });
    }, 520);
    pulseTimers.current.push(timer);
  }

  function showFeedback(text: string) {
    setFeedback(text);
    if (feedbackTimer.current !== null) window.clearTimeout(feedbackTimer.current);
    feedbackTimer.current = window.setTimeout(() => setFeedback(null), 850);
  }

  function restoreCell(index: number) {
    if (restoredSet.has(index)) return;
    const fresh = restorationTargets(index, state.stage).filter((target) => !restoredSet.has(target));
    if (!fresh.length) return;
    const glimmerCount = fresh.filter((target) => isGlimmerCell(target, state.stage)).length;
    const gain = fresh.length * DEW_PER_PATCH + glimmerCount * GLIMMER_BONUS;
    flashCells(fresh);
    playPatchFeedback(glimmerCount > 0, fresh.length);
    if (glimmerCount > 0) showFeedback(`glimmer +${gain} Dew`);
    else if (fresh.length > 1) showFeedback(`bloom chain · ${fresh.length} patches`);
    dispatch({ type: "restore", index });
  }

  function updatePointer(event: React.PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--pointer-x", `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty("--pointer-y", `${event.clientY - rect.top}px`);
  }

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
        touchAction: "pan-y",
      } as React.CSSProperties}
      onPointerUp={() => setDragging(false)}
      onPointerCancel={() => setDragging(false)}
    >
      <div className={styles.ambient} aria-hidden="true" />
      <section className={styles.game} aria-label="Stillgarden relaxation game">
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Stillgarden · {mood} · {environment.name}</p>
            <h1>Garden {state.stage}</h1>
          </div>
          <div className={styles.headerActions}>
            <button
              className={styles.sensoryButton}
              type="button"
              aria-pressed={sensoryOn}
              onClick={() => setSensoryOn((value) => !value)}
            >
              sensory {sensoryOn ? "on" : "off"}
            </button>
            <div className={styles.wallet} aria-label={`${state.dew} Dew`}>
              <span className={styles.dewDrop} aria-hidden="true" />
              <strong>{state.dew}</strong>
              <span>Dew</span>
            </div>
          </div>
        </header>

        <div className={styles.progression}>
          <div className={styles.levelBlock}>
            <div className={styles.levelLine}>
              <span>Keeper level {level}</span>
              <span>{state.lifetimeRestored} patches tended</span>
            </div>
            <div className={styles.levelTrack} aria-hidden="true">
              <div className={styles.levelFill} style={{ width: `${Math.max(0, Math.min(100, levelProgress))}%` }} />
            </div>
          </div>
          <button className={styles.collectionButton} type="button" onClick={() => setShowCollection((value) => !value)}>
            {showCollection ? "close collection" : "collection"}
          </button>
        </div>

        <div className={styles.rewardForecast} aria-label="Next reward">
          <span className={styles.rewardKind}>{nextReward.kind}</span>
          <div>
            <strong>{nextReward.name}</strong>
            <span>{nextReward.detail}</span>
          </div>
          <div className={styles.environmentPill}>
            <span>world</span>
            <strong>{environment.name}</strong>
          </div>
        </div>

        {showCollection && (
          <section className={styles.collection} aria-label="Garden collection">
            <div className={styles.collectionHeading}>
              <div>
                <p className={styles.eyebrow}>Garden styles</p>
                <h2>Make the calm yours.</h2>
              </div>
              <p>Styles use Dew. Relics arrive from milestones and never need to be bought.</p>
            </div>
            <div className={styles.themeRail}>
              {themes.map((item) => {
                const owned = state.ownedThemes.includes(item.id);
                const equipped = state.equippedTheme === item.id;
                const unlocked = level >= item.unlockLevel;
                const affordable = state.dew >= item.cost;
                return (
                  <article
                    className={`${styles.themeCard} ${equipped ? styles.themeCardActive : ""}`}
                    key={item.id}
                    style={{ "--card-accent": item.accent, "--card-accent-2": item.accent2, "--card-ground": item.ground } as React.CSSProperties}
                  >
                    <div className={styles.themePreview} aria-hidden="true"><span /><span /><span /></div>
                    <div className={styles.themeCopy}><strong>{item.name}</strong><span>{item.description}</span></div>
                    {equipped ? (
                      <button type="button" disabled className={styles.themeAction}>equipped</button>
                    ) : owned ? (
                      <button type="button" className={styles.themeAction} onClick={() => dispatch({ type: "equip", themeId: item.id })}>equip</button>
                    ) : !unlocked ? (
                      <button type="button" disabled className={styles.themeAction}>level {item.unlockLevel}</button>
                    ) : (
                      <button type="button" disabled={!affordable} className={styles.themeAction} onClick={() => dispatch({ type: "buy", themeId: item.id })}>{item.cost} Dew</button>
                    )}
                  </article>
                );
              })}
            </div>

            <div className={styles.relicHeading}>
              <div>
                <p className={styles.eyebrow}>Found objects</p>
                <h3>{state.discoveredRelics.length} of {relics.length} discovered</h3>
              </div>
              {nextRelic && <span>next after garden {nextRelic.unlockGardens}</span>}
            </div>
            <div className={styles.relicShelf}>
              {relics.map((relic) => {
                const found = state.discoveredRelics.includes(relic.id);
                return (
                  <article className={`${styles.relicCard} ${found ? styles.relicFound : ""}`} key={relic.id}>
                    <div className={styles.relicGlyph} data-relic={relic.id} aria-hidden="true"><span /></div>
                    <div>
                      <strong>{found ? relic.name : "Undiscovered"}</strong>
                      <span>{found ? relic.note : `Complete garden ${relic.unlockGardens}`}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        <div className={styles.meta}>
          <span>{progress}% restored</span>
          <span>{state.completedGardens} gardens completed</span>
        </div>
        <div className={styles.progressTrack} aria-hidden="true"><div className={styles.progressFill} style={{ width: `${progress}%` }} /></div>

        <div className={styles.boardWrap}>
          <div
            className={`${styles.board} ${complete ? styles.complete : ""}`}
            data-environment={environment.id}
            data-dragging={dragging ? "true" : "false"}
            data-settling={completionBurst ? "true" : "false"}
            style={{ touchAction: "none" } as React.CSSProperties}
            onPointerDown={(event) => {
              updatePointer(event);
              event.currentTarget.setPointerCapture(event.pointerId);
              setDragging(true);
            }}
            onPointerUp={() => setDragging(false)}
            onPointerCancel={() => setDragging(false)}
            onPointerMove={(event) => {
              updatePointer(event);
              if (!dragging) return;
              const element = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
              const value = element?.closest<HTMLElement>("[data-cell]")?.dataset.cell;
              if (value !== undefined) restoreCell(Number(value));
            }}
          >
            {cells.map((index) => {
              const isRestored = restoredSet.has(index);
              const glimmer = isGlimmerCell(index, state.stage);
              const pulsing = pulseCells.has(index);
              return (
                <button
                  key={index}
                  type="button"
                  data-cell={index}
                  data-restored={isRestored ? "true" : "false"}
                  data-glimmer={glimmer ? "true" : "false"}
                  data-pulse={pulsing ? "true" : "false"}
                  className={styles.cell}
                  onPointerDown={() => restoreCell(index)}
                  onPointerEnter={() => { if (dragging) restoreCell(index); }}
                  aria-label={isRestored ? "Restored patch" : glimmer ? "Glimmer patch, worth bonus Dew" : `Restore patch for ${DEW_PER_PATCH} Dew`}
                ><span className={styles.sprout} aria-hidden="true" /></button>
              );
            })}
          </div>

          {feedback && <div className={styles.touchFeedback} aria-live="polite">{feedback}</div>}
          {completionBurst && (
            <div className={styles.settleMessage} aria-live="polite">
              <span>garden settled</span>
              <strong>complete</strong>
            </div>
          )}
        </div>

        {recentRelic && (
          <div className={styles.discovery} aria-live="polite">
            <div className={styles.relicGlyph} data-relic={recentRelic.id} aria-hidden="true"><span /></div>
            <div>
              <p className={styles.eyebrow}>Something was left behind</p>
              <strong>{recentRelic.name}</strong>
              <span>{recentRelic.note} +30 Dew.</span>
            </div>
            <button type="button" onClick={() => dispatch({ type: "dismissDiscovery" })}>keep tending</button>
          </div>
        )}

        <div className={styles.footerCopy}>
          {complete ? (
            <p className={styles.completeText}>The garden is settling.</p>
          ) : progress < 4 ? (
            <p>Sweep slowly. Glimmer patches hold extra Dew.</p>
          ) : levelProgress >= 80 && level < LEVEL_THRESHOLDS.length ? (
            <p>Almost Keeper {level + 1}. Another layer is close.</p>
          ) : nextEnvironment && nextEnvironment.unlockGardens - state.completedGardens === 1 ? (
            <p>Finish this garden and the world will change.</p>
          ) : (
            <p>Restore, discover, personalise. There is nothing to lose.</p>
          )}
        </div>
      </section>
    </main>
  );
}
