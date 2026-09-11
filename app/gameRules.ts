export type ViewportKind = "portrait" | "balanced" | "landscape";

export type ShapeId =
  | "classic"
  | "portrait-blob"
  | "portrait-keyhole"
  | "triangle"
  | "wide-blob"
  | "wide-islands"
  | "diamond"
  | "ring"
  | "courtyard";

export type FieldShape = {
  id: ShapeId;
  name: string;
  cols: number;
  rows: number;
  kind: ViewportKind | "legacy";
};

export const fieldShapes: Record<ShapeId, FieldShape> = {
  classic: { id: "classic", name: "old kitchen bed", cols: 12, rows: 8, kind: "legacy" },
  "portrait-blob": { id: "portrait-blob", name: "long moss bed", cols: 9, rows: 12, kind: "portrait" },
  "portrait-keyhole": { id: "portrait-keyhole", name: "keyhole bed", cols: 9, rows: 12, kind: "portrait" },
  triangle: { id: "triangle", name: "corner bed", cols: 11, rows: 10, kind: "portrait" },
  "wide-blob": { id: "wide-blob", name: "long border", cols: 15, rows: 7, kind: "landscape" },
  "wide-islands": { id: "wide-islands", name: "stepping beds", cols: 14, rows: 7, kind: "landscape" },
  diamond: { id: "diamond", name: "diamond bed", cols: 11, rows: 11, kind: "balanced" },
  ring: { id: "ring", name: "ring garden", cols: 11, rows: 11, kind: "balanced" },
  courtyard: { id: "courtyard", name: "courtyard bed", cols: 12, rows: 9, kind: "balanced" },
};

function rowRange(cols: number, row: number, width: number) {
  const start = Math.floor((cols - width) / 2);
  return [start, start + width] as const;
}

export function activeCellsFor(shape: FieldShape): number[] {
  const active: number[] = [];
  const add = (row: number, col: number) => {
    if (row >= 0 && row < shape.rows && col >= 0 && col < shape.cols) active.push(row * shape.cols + col);
  };

  if (shape.id === "classic") return Array.from({ length: shape.cols * shape.rows }, (_, i) => i);

  for (let row = 0; row < shape.rows; row += 1) {
    for (let col = 0; col < shape.cols; col += 1) {
      let on = true;
      if (shape.id === "portrait-blob") {
        const widths = [5, 7, 8, 9, 9, 9, 9, 9, 8, 8, 7, 5];
        const [start, end] = rowRange(shape.cols, row, widths[row] ?? 7);
        on = col >= start && col < end;
        if ((row === 3 && col === 0) || (row === 8 && col === 8)) on = false;
      } else if (shape.id === "portrait-keyhole") {
        const widths = [5, 7, 9, 9, 9, 7, 5, 5, 5, 5, 5, 5];
        const [start, end] = rowRange(shape.cols, row, widths[row] ?? 5);
        on = col >= start && col < end;
        if (row >= 2 && row <= 4 && col >= 3 && col <= 5) on = false;
      } else if (shape.id === "triangle") {
        const widths = [1, 3, 3, 5, 5, 7, 7, 9, 9, 11];
        const [start, end] = rowRange(shape.cols, row, widths[row] ?? 11);
        on = col >= start && col < end;
      } else if (shape.id === "wide-blob") {
        const widths = [11, 13, 15, 15, 15, 13, 11];
        const [start, end] = rowRange(shape.cols, row, widths[row] ?? 13);
        on = col >= start && col < end;
        if ((row === 1 && col === 13) || (row === 5 && col === 1)) on = false;
      } else if (shape.id === "wide-islands") {
        on = true;
        if ((row === 2 || row === 3 || row === 4) && (col === 6 || col === 7)) on = false;
        if (row === 0 && (col < 2 || col > 11)) on = false;
        if (row === 6 && (col < 1 || col > 12)) on = false;
      } else if (shape.id === "diamond") {
        on = Math.abs(col - 5) + Math.abs(row - 5) <= 5;
      } else if (shape.id === "ring") {
        const dx = (col - 5) / 5;
        const dy = (row - 5) / 5;
        const dist = dx * dx + dy * dy;
        on = dist <= 1.08 && dist >= 0.18;
      } else if (shape.id === "courtyard") {
        on = true;
        if (row >= 3 && row <= 5 && col >= 4 && col <= 7) on = false;
        if (row === 0 && (col === 0 || col === 11)) on = false;
        if (row === 8 && (col < 2 || col > 9)) on = false;
      }
      if (on) add(row, col);
    }
  }
  return active;
}

export function viewportKind(width: number, height: number): ViewportKind {
  const ratio = width / Math.max(1, height);
  if (ratio < 0.78) return "portrait";
  if (ratio > 1.22) return "landscape";
  return "balanced";
}

export function chooseShapeId(kind: ViewportKind, stage: number): ShapeId {
  const pools: Record<ViewportKind, ShapeId[]> = {
    portrait: ["portrait-blob", "portrait-keyhole", "triangle", "portrait-blob", "diamond"],
    balanced: ["diamond", "ring", "courtyard", "portrait-keyhole", "wide-islands"],
    landscape: ["wide-blob", "wide-islands", "courtyard", "ring", "wide-blob"],
  };
  const pool = pools[kind];
  return pool[Math.abs(stage * 7 + 3) % pool.length];
}

export function keeperThreshold(level: number) {
  if (level <= 1) return 0;
  return Math.round(180 * Math.pow(level - 1, 2.05));
}

export function keeperLevel(total: number) {
  let level = 1;
  while (level < 100 && total >= keeperThreshold(level + 1)) level += 1;
  return level;
}

export function keeperProgress(total: number) {
  const level = keeperLevel(total);
  const start = keeperThreshold(level);
  const end = keeperThreshold(level + 1);
  return { level, start, end, fraction: Math.max(0, Math.min(1, (total - start) / Math.max(1, end - start))) };
}

export function toolUpgradeCost(level: number, base: number) {
  return Math.round(base * Math.pow(level, 2.15) / 10) * 10;
}

export const MAX_TOOL_LEVEL = 12;
export const MAX_POTS = 8;

export function potUpgradeCost(unlocked: number) {
  if (unlocked < 2) return 0;
  return Math.round(180 * Math.pow(unlocked - 1, 2.25) / 10) * 10;
}
