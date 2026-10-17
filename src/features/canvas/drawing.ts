/**
 * A drawing is one item of kind "drawing". Its strokes are kept as short path strings in the item's `content` (JSON), in
 * a small box of their own. An item may not be bigger than the database allows (20 KB), so a drawing is capped.
 */
export interface Stroke {
  /** Pen colour. */
  c: string;
  /** Line width in page pixels. */
  w: number;
  /** SVG path: "M x y L x y ...", relative to the drawing's box. */
  d: string;
}

export interface DrawingData {
  /** Size of the drawing's box, in page pixels at scale 1. */
  w: number;
  h: number;
  strokes: readonly Stroke[];
}

/** The text of a drawing stays well below the database limit for one item. */
export const MAX_DRAWING_CHARS = 11_000;
/** Points closer together than this (page pixels) are dropped: invisible, and it keeps drawings small. */
const MIN_POINT_DISTANCE = 1.8;

export const STROKE_WIDTHS = { thin: 2.5, medium: 5, thick: 10 } as const;
export type StrokeWidthKey = keyof typeof STROKE_WIDTHS;

export interface Point {
  x: number;
  y: number;
}

/** Drops points that are practically the same as the one before. */
export function simplify(points: readonly Point[]): Point[] {
  const kept: Point[] = [];
  for (const point of points) {
    const last = kept[kept.length - 1];
    if (!last || Math.hypot(point.x - last.x, point.y - last.y) >= MIN_POINT_DISTANCE) kept.push(point);
  }
  const final = points[points.length - 1];
  if (final && kept[kept.length - 1] !== final) kept.push(final);
  return kept;
}

const round = (value: number): number => Math.round(value * 10) / 10;

/** A path through the points; a single tap becomes a dot (a very short line). */
export function pathOf(points: readonly Point[], dx: number, dy: number): string {
  if (points.length === 0) return '';
  const first = points[0];
  const parts = [`M${round(first.x - dx)} ${round(first.y - dy)}`];
  if (points.length === 1) parts.push(`L${round(first.x - dx + 0.1)} ${round(first.y - dy)}`);
  for (const point of points.slice(1)) parts.push(`L${round(point.x - dx)} ${round(point.y - dy)}`);
  return parts.join('');
}

export function encodeDrawing(data: DrawingData): string {
  return JSON.stringify(data);
}

/** Reads a drawing back. Anything that does not look right gives null (synced items are untrusted data). */
export function parseDrawing(content: string): DrawingData | null {
  try {
    const parsed: unknown = JSON.parse(content);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const value = parsed as Record<string, unknown>;
    if (typeof value.w !== 'number' || typeof value.h !== 'number' || !Array.isArray(value.strokes)) return null;
    if (value.w <= 0 || value.h <= 0 || value.w > 2000 || value.h > 2000) return null;
    const strokes: Stroke[] = [];
    for (const entry of value.strokes) {
      const stroke = entry as Record<string, unknown>;
      if (typeof stroke?.c !== 'string' || typeof stroke.w !== 'number' || typeof stroke.d !== 'string') return null;
      // Only path commands made of letters M and L and numbers: nothing else is drawn.
      if (!/^[ML0-9.\- ]*$/.test(stroke.d)) return null;
      strokes.push({ c: stroke.c, w: stroke.w, d: stroke.d });
    }
    return { w: value.w, h: value.h, strokes };
  } catch {
    return null;
  }
}

export interface BuiltDrawing {
  /** Where the box sits on the page (top-left, page pixels). */
  left: number;
  top: number;
  data: DrawingData;
}

/** Builds the box and the strokes of a drawing from strokes given in page coordinates. */
export function buildDrawing(strokes: readonly { color: string; width: number; points: readonly Point[] }[]): BuiltDrawing | null {
  const all = strokes.flatMap((stroke) => stroke.points);
  if (all.length === 0) return null;
  const pad = Math.max(...strokes.map((stroke) => stroke.width)) / 2 + 1;
  const left = Math.min(...all.map((p) => p.x)) - pad;
  const top = Math.min(...all.map((p) => p.y)) - pad;
  const right = Math.max(...all.map((p) => p.x)) + pad;
  const bottom = Math.max(...all.map((p) => p.y)) + pad;
  return {
    left,
    top,
    data: {
      w: Math.ceil(right - left),
      h: Math.ceil(bottom - top),
      strokes: strokes.map((stroke) => ({ c: stroke.color, w: stroke.width, d: pathOf(simplify(stroke.points), left, top) })),
    },
  };
}
