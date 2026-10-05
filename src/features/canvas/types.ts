export type ItemKind = 'text' | 'sticker' | 'tape' | 'photo';

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
}

export const PEN_COLORS = ['#3D6FD8', '#D9568A', '#8A5CD0', '#2E2B3A', '#2F9E6F', '#F07A2A'] as const;
export const DEFAULT_PEN_COLOR = PEN_COLORS[0];

export const MIN_SCALE = 0.4;
export const MAX_SCALE = 4;
