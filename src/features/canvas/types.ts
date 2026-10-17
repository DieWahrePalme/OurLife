export type ItemKind = 'text' | 'sticker' | 'tape' | 'photo' | 'todo' | 'focus' | 'mood' | 'goal' | 'drawing';

export interface Task {
  text: string;
  done: boolean;
}

export interface CanvasItem {
  id: string;
  kind: ItemKind;
  /** Top-left corner of the item, in page pixels. */
  x: number;
  y: number;
  scale: number;
  /** Degrees. */
  rotation: number;
  color: string;
  /** Text, sticker glyph, or photo file location, depending on kind. */
  content: string;
  /** Width divided by height, only for photos. */
  aspect?: number;
  /** Checklist rows, only for to-do blocks. */
  tasks?: Task[];
  /** Change to a goal (kind "goal"); content holds the goal id. */
  amount?: number;
  /** Box width in page pixels at scale 1, for text, focus and to-do blocks. Missing = automatic. */
  width?: number;
  /** Handwriting style of a text item. Missing = "hand". */
  font?: TextFont;
  /** Size of a text item. Missing = "m". */
  textSize?: TextSize;
  /** Text on a highlighter stripe. */
  mark?: boolean;
  /** A few words on the white strip under a photo. */
  caption?: string;
  /** Print of a washi tape. Missing = plain. */
  pattern?: TapePattern;
  /** A locked item ignores touches, so items on top of or under it can be moved freely. Shared with the other phone. */
  locked?: boolean;
}

export type TapePattern = 'plain' | 'dots' | 'stripes' | 'grid' | 'floral';
export const TAPE_PATTERNS: readonly TapePattern[] = ['plain', 'dots', 'stripes', 'grid', 'floral'];
export const TAPE_PATTERN_LABEL: Readonly<Record<TapePattern, string>> = {
  plain: 'Plain tape',
  dots: 'Dotted tape',
  stripes: 'Striped tape',
  grid: 'Grid tape',
  floral: 'Floral tape',
};
/** The rolls in the pencil case. */
export const TAPE_ROLLS: readonly { pattern: TapePattern; color: string }[] = [
  { pattern: 'plain', color: '#D9568A' },
  { pattern: 'dots', color: '#8A5CD0' },
  { pattern: 'stripes', color: '#2F9E6F' },
  { pattern: 'grid', color: '#F07A2A' },
  { pattern: 'floral', color: '#E8749A' },
];

export type TextFont = 'hand' | 'print' | 'marker';
export type TextSize = 's' | 'm' | 'l';

export const TEXT_FONTS: readonly TextFont[] = ['hand', 'print', 'marker'];
export const TEXT_SIZES: readonly TextSize[] = ['s', 'm', 'l'];

export const FONT_FAMILY: Readonly<Record<TextFont, string>> = {
  hand: 'Caveat_700Bold',
  print: 'Lora_600SemiBold',
  marker: 'PermanentMarker_400Regular',
};
/** Line height as a multiple of the font size; fonts differ in how tall their letters stand. */
export const FONT_LINE_HEIGHT: Readonly<Record<TextFont, number>> = { hand: 1.4, print: 1.4, marker: 1.35 };
export const FONT_LABEL: Readonly<Record<TextFont, string>> = { hand: 'Hand', print: 'Print', marker: 'Marker' };
export const SIZE_PIXELS: Readonly<Record<TextSize, number>> = { s: 22, m: 30, l: 44 };
export const HIGHLIGHT_COLOR = 'rgba(255, 224, 102, 0.8)';

export const ITEM_KINDS: readonly ItemKind[] = ['text', 'sticker', 'tape', 'photo', 'todo', 'focus', 'mood', 'goal', 'drawing'];

/** Pen colours. Each one reads at 4.5:1 or better on every paper (white, cream, ivory). */
export const PEN_COLORS = ['#2F5FC4', '#B83A6E', '#7447BC', '#2E2B3A', '#1E7A50', '#C2410C'] as const;
/** Washi tape keeps its bright colours: tape is decoration, not text. */
export const TAPE_COLORS = ['#D9568A', '#8A5CD0', '#2F9E6F', '#F07A2A'] as const;

/**
 * Items saved before the darker pens carry the old bright colours. They are shown in the new ones; the saved
 * value is never rewritten.
 */
const LEGACY_PEN_COLORS: Readonly<Record<string, string>> = {
  '#3D6FD8': '#2F5FC4',
  '#D9568A': '#B83A6E',
  '#8A5CD0': '#7447BC',
  '#2F9E6F': '#1E7A50',
  '#F07A2A': '#C2410C',
};

/** The colour to draw ink (text, borders) in for a saved item colour. */
export function penInk(color: string): string {
  return LEGACY_PEN_COLORS[color.toUpperCase()] ?? color;
}
export const DEFAULT_PEN_COLOR = PEN_COLORS[0];

/** Longest caption of a photo. */
export const MAX_CAPTION = 60;

export const MIN_SCALE = 0.4;
export const MAX_SCALE = 4;

/** Width limits of a text box (page pixels at scale 1). */
export const MIN_BOX_WIDTH = 70;
export const MAX_BOX_WIDTH = 340;
