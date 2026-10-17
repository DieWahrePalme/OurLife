import type { CanvasItem, TapePattern, TextFont, TextSize } from './types';

/** An item of a page template, placed on the 360 x 580 page. The pen colour of the phone is used where no colour is given. */
interface Blueprint {
  kind: CanvasItem['kind'];
  x: number;
  y: number;
  scale?: number;
  rotation?: number;
  content: string;
  color?: string;
  tasks?: string[];
  font?: TextFont;
  textSize?: TextSize;
  mark?: boolean;
  pattern?: TapePattern;
}

export interface PageTemplate {
  id: string;
  name: string;
  hint: string;
  items: readonly Blueprint[];
}

export const TEMPLATES: readonly PageTemplate[] = [
  {
    id: 'three-lines',
    name: 'Today in three lines',
    hint: 'A headline, one focus and a short to-do list.',
    items: [
      { kind: 'tape', x: 120, y: 18, rotation: -3, content: '', color: '#D9568A', pattern: 'floral' },
      { kind: 'text', x: 34, y: 66, rotation: -2, content: 'Today I felt…', textSize: 'l' },
      { kind: 'focus', x: 62, y: 190, rotation: 1.5, content: 'The one thing that mattered' },
      { kind: 'todo', x: 56, y: 340, rotation: -1.5, content: '', tasks: ['Morning', 'Afternoon', 'Evening'] },
    ],
  },
  {
    id: 'memory',
    name: 'A moment to keep',
    hint: 'A big title, tape in the corners and a few stickers.',
    items: [
      { kind: 'tape', x: -14, y: 16, rotation: -38, content: '', color: '#8A5CD0', pattern: 'dots' },
      { kind: 'tape', x: 238, y: 520, rotation: -38, content: '', color: '#2F9E6F', pattern: 'stripes' },
      { kind: 'text', x: 28, y: 190, rotation: -4, content: 'A moment I want to keep', font: 'marker', textSize: 'l' },
      { kind: 'sticker', x: 248, y: 96, rotation: 8, content: '✨', scale: 1.3 },
      { kind: 'sticker', x: 40, y: 430, rotation: -8, content: '❤️', scale: 1.4 },
      { kind: 'text', x: 150, y: 440, content: 'Where? With whom?', font: 'print', textSize: 's' },
    ],
  },
  {
    id: 'plan',
    name: 'Plan the day',
    hint: 'Focus, to-do list and how you feel.',
    items: [
      { kind: 'focus', x: 36, y: 36, rotation: -1, content: 'What matters most today?' },
      { kind: 'todo', x: 36, y: 190, rotation: 1, content: '', tasks: ['First thing', 'Second thing', 'Third thing'] },
      { kind: 'mood', x: 170, y: 440, rotation: 4, content: 'happy' },
      { kind: 'tape', x: 24, y: 460, rotation: 6, content: '', color: '#F07A2A', pattern: 'grid' },
    ],
  },
  {
    id: 'us',
    name: 'Us, today',
    hint: 'Two highlighted lines, one for each of you.',
    items: [
      { kind: 'text', x: 70, y: 56, rotation: -3, content: 'Us, today', textSize: 'l' },
      { kind: 'text', x: 40, y: 190, content: 'Me:', mark: true, font: 'print' },
      { kind: 'text', x: 40, y: 330, content: 'You:', mark: true, font: 'print' },
      { kind: 'sticker', x: 250, y: 440, rotation: 10, content: '💛', scale: 1.5 },
      { kind: 'tape', x: 110, y: 10, rotation: 2, content: '', color: '#E8749A', pattern: 'plain' },
    ],
  },
];

/** Turns a template into items for the page. */
export function itemsFromTemplate(template: PageTemplate, penColor: string, newId: () => string): CanvasItem[] {
  return template.items.map((blueprint) => ({
    id: newId(),
    kind: blueprint.kind,
    x: blueprint.x,
    y: blueprint.y,
    scale: blueprint.scale ?? 1,
    rotation: blueprint.rotation ?? 0,
    color: blueprint.color ?? penColor,
    content: blueprint.content,
    tasks: blueprint.tasks?.map((text) => ({ text, done: false })),
    font: blueprint.font,
    textSize: blueprint.textSize,
    mark: blueprint.mark,
    pattern: blueprint.pattern,
  }));
}
