export type ItemKind = 'text' | 'sticker' | 'tape' | 'photo' | 'todo' | 'focus' | 'mood' | 'goal';

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
  /** A locked item ignores touches, so items on top of or under it can be moved freely. Shared with the other phone. */
  locked?: boolean;
}

export const ITEM_KINDS: readonly ItemKind[] = ['text', 'sticker', 'tape', 'photo', 'todo', 'focus', 'mood', 'goal'];

export const PEN_COLORS = ['#3D6FD8', '#D9568A', '#8A5CD0', '#2E2B3A', '#2F9E6F', '#F07A2A'] as const;
export const DEFAULT_PEN_COLOR = PEN_COLORS[0];

export const MIN_SCALE = 0.4;
export const MAX_SCALE = 4;

/** Width limits of a text box (page pixels at scale 1). */
export const MIN_BOX_WIDTH = 70;
export const MAX_BOX_WIDTH = 340;
