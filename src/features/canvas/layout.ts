import { FONT_LINE_HEIGHT, SIZE_PIXELS, type CanvasItem, type ItemKind } from './types';

/**
 * Geometry of items on the page, in page pixels. An item's x / y is the top-left corner of its box at scale 1;
 * it is enlarged and turned about its middle. `Size` is that box (width and height at scale 1, frame included).
 */
export interface Size {
  w: number;
  h: number;
}

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface Point {
  x: number;
  y: number;
}

const DEG_TO_RAD = Math.PI / 180;

/** The part of each box that must stay on the page after a drag, as a share of its width and height. */
const KEEP_ON_PAGE = 1 / 3;
const SCAN_STEP = 16;
const SCAN_MARGIN = 10;
const BELOW_GAP = 14;

/** Size guesses for items that were not measured yet (a new item before it is drawn). */
const FIXED_SIZES: Partial<Record<ItemKind, Size>> = {
  tape: { w: 135, h: 49 },
  sticker: { w: 85, h: 85 },
  mood: { w: 150, h: 62 },
  goal: { w: 170, h: 58 },
};
const CARD_WIDTH = 234;
const TEXT_CHAR_WIDTH = 12;
const TEXT_MAX_WIDTH = 272;
const TASK_HEIGHT = 44;
const PHOTO_WIDTH = 216;
const PHOTO_EXTRA_HEIGHT = 46;
const IMAGE_STICKER_WIDTH = 152;

export function estimateSize(item: Pick<CanvasItem, 'kind' | 'content' | 'aspect' | 'tasks' | 'width' | 'font' | 'textSize'>): Size {
  switch (item.kind) {
    case 'photo':
      return { w: PHOTO_WIDTH, h: 200 / (item.aspect ?? 1) + PHOTO_EXTRA_HEIGHT };
    case 'todo':
      return { w: (item.width ?? 210) + 24, h: 60 + TASK_HEIGHT * Math.max(item.tasks?.length ?? 1, 1) };
    case 'focus':
      return { w: (item.width ?? 210) + 24, h: 110 };
    case 'text': {
      const pixels = SIZE_PIXELS[item.textSize ?? 'm'];
      const natural = item.content.length * TEXT_CHAR_WIDTH * (pixels / SIZE_PIXELS.m);
      const w = item.width ? item.width + 12 : Math.min(TEXT_MAX_WIDTH, Math.max(natural, 60));
      const lines = Math.max(Math.ceil(natural / Math.max(w - 12, 40)), 1);
      return { w, h: lines * pixels * FONT_LINE_HEIGHT[item.font ?? 'hand'] + 12 };
    }
    case 'sticker': {
      const isPicture = item.content.startsWith('http') || item.content.startsWith('storage:') || /^(file|data|blob):/i.test(item.content);
      return isPicture ? { w: IMAGE_STICKER_WIDTH, h: IMAGE_STICKER_WIDTH / (item.aspect ?? 1) + 12 } : (FIXED_SIZES.sticker as Size);
    }
    default:
      return FIXED_SIZES[item.kind] ?? { w: CARD_WIDTH, h: 80 };
  }
}

export function centreOf(item: CanvasItem, size: Size): Point {
  return { x: item.x + size.w / 2, y: item.y + size.h / 2 };
}

/** The smallest upright rectangle around the item as it is drawn (enlarged and turned). */
export function boundsOf(item: CanvasItem, size: Size): Rect {
  const centre = centreOf(item, size);
  const angle = item.rotation * DEG_TO_RAD;
  const w = size.w * item.scale;
  const h = size.h * item.scale;
  const halfW = (Math.abs(w * Math.cos(angle)) + Math.abs(h * Math.sin(angle))) / 2;
  const halfH = (Math.abs(w * Math.sin(angle)) + Math.abs(h * Math.cos(angle))) / 2;
  return { left: centre.x - halfW, top: centre.y - halfH, right: centre.x + halfW, bottom: centre.y + halfH };
}

/** True when the point lies on the item's (turned) box. */
export function itemContains(item: CanvasItem, size: Size, point: Point): boolean {
  const centre = centreOf(item, size);
  const angle = -item.rotation * DEG_TO_RAD;
  const dx = point.x - centre.x;
  const dy = point.y - centre.y;
  const localX = dx * Math.cos(angle) - dy * Math.sin(angle);
  const localY = dx * Math.sin(angle) + dy * Math.cos(angle);
  return Math.abs(localX) <= (size.w * item.scale) / 2 && Math.abs(localY) <= (size.h * item.scale) / 2;
}

function overlapArea(a: Rect, b: Rect): number {
  const width = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const height = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return width > 0 && height > 0 ? width * height : 0;
}

export interface FreeSpot {
  /** Top-left corner for the new item, at scale 1. */
  x: number;
  y: number;
  /** False when every place overlaps something (the item then goes below the others). */
  free: boolean;
}

/**
 * The place in `region` (what is on screen, as page pixels) where a new item of `size` covers the least of what is
 * already there. A page with room gives an empty spot; a full page puts the item below the last one.
 */
export function findFreeSpot(taken: readonly Rect[], size: Size, region: Rect, page: Size): FreeSpot {
  const minX = Math.max(region.left, 0) + SCAN_MARGIN;
  const maxX = Math.min(region.right, page.w) - size.w - SCAN_MARGIN;
  const minY = Math.max(region.top, 0) + SCAN_MARGIN;
  const maxY = Math.min(region.bottom, page.h) - size.h - SCAN_MARGIN;
  const middle: Point = { x: (region.left + region.right) / 2, y: (region.top + region.bottom) / 2 };

  let best: { x: number; y: number; score: number; distance: number } | null = null;
  if (maxX >= minX && maxY >= minY) {
    for (let y = minY; y <= maxY + 0.5; y += SCAN_STEP) {
      for (let x = minX; x <= maxX + 0.5; x += SCAN_STEP) {
        const candidate: Rect = { left: x, top: y, right: x + size.w, bottom: y + size.h };
        const score = taken.reduce((sum, rect) => sum + overlapArea(candidate, rect), 0);
        const distance = Math.hypot(x + size.w / 2 - middle.x, y + size.h / 2 - middle.y);
        if (best === null || score < best.score || (score === best.score && distance < best.distance)) {
          best = { x, y, score, distance };
        }
      }
    }
  }
  if (best !== null && best.score === 0) return { x: best.x, y: best.y, free: true };

  // No empty place on screen: below the last item if the page still has room there, else where it covers the least.
  const lowest = taken.reduce((bottom, rect) => Math.max(bottom, rect.bottom), 0);
  if (lowest + BELOW_GAP + size.h + SCAN_MARGIN <= page.h) {
    const x = Math.min(Math.max(middle.x - size.w / 2, SCAN_MARGIN), Math.max(page.w - size.w - SCAN_MARGIN, SCAN_MARGIN));
    return { x, y: lowest + BELOW_GAP, free: false };
  }
  if (best !== null) return { x: best.x, y: best.y, free: false };
  return { x: Math.max((page.w - size.w) / 2, SCAN_MARGIN), y: Math.max((page.h - size.h) / 2, SCAN_MARGIN), free: false };
}

/**
 * Moves an item back so that at least a third of its width and height is still on the page.
 * Only used at the end of a drag, resize or turn; saved items are never moved on load.
 */
export function keepOnPage(item: CanvasItem, size: Size, page: Size): Pick<CanvasItem, 'x' | 'y'> {
  const bounds = boundsOf(item, size);
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;
  const shift = (low: number, high: number, extent: number, limit: number): number => {
    const keep = extent * KEEP_ON_PAGE;
    if (high < keep) return keep - high;
    if (low > limit - keep) return limit - keep - low;
    return 0;
  };
  return {
    x: item.x + shift(bounds.left, bounds.right, width, page.w),
    y: item.y + shift(bounds.top, bounds.bottom, height, page.h),
  };
}
