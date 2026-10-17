import { loadAllDays } from '@/features/canvas/storage';
import { ITEM_KINDS, type CanvasItem, type ItemKind } from '@/features/canvas/types';
import { supabase } from '@/lib/supabase';
import type { MoodKey } from '@/features/canvas/moods';
import { MOODS } from '@/features/canvas/moods';

/**
 * Just enough of an item to draw a tiny version of its page: where it is, how big, what colour. The words written on a
 * page are never read for Home, only the kind of each item (and the mood or photo reference of those two kinds).
 */
export interface SketchItem {
  id: string;
  kind: ItemKind;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  color: string;
  aspect?: number;
  width?: number;
  /** The mood key of a mood, or the file reference of a photo. */
  content?: string;
}

/** What Home needs to know about a day: has it content, how did the day feel, and what does the page look like. */
export interface DaySummary {
  filled: boolean;
  /** The mood used most on the day. */
  mood?: MoodKey;
  /** Up to two different moods of the day (most used first); the dot shows both. */
  moods?: readonly MoodKey[];
  /** The items of the page, bottom to top, for the little page. */
  sketch: readonly SketchItem[];
  /** Ids of all items on the day (to see what is new since the last visit). */
  ids: readonly string[];
}

export type DaySummaries = Readonly<Record<number, DaySummary>>;

type MoodVotes = Map<number, Map<MoodKey, number>>;

const isMoodKey = (value: unknown): value is MoodKey => MOODS.some((m) => m.key === value);
const MOODS_SHOWN = 2;
const PAGE_SIZE = 1000;

function addVote(votes: MoodVotes, dayNumber: number, mood: unknown): void {
  if (!isMoodKey(mood)) return;
  const forDay = votes.get(dayNumber) ?? new Map<MoodKey, number>();
  forDay.set(mood, (forDay.get(mood) ?? 0) + 1);
  votes.set(dayNumber, forDay);
}

/** The moods used on a day, most used first; on a tie the one that was added first. At most two. */
function leadingMoods(forDay: Map<MoodKey, number> | undefined): MoodKey[] {
  if (!forDay) return [];
  return [...forDay.entries()]
    .map(([mood, count], index) => ({ mood, count, index }))
    .sort((a, b) => b.count - a.count || a.index - b.index)
    .slice(0, MOODS_SHOWN)
    .map((entry) => entry.mood);
}

function build(sketches: Map<number, SketchItem[]>, votes: MoodVotes): DaySummaries {
  const result: Record<number, DaySummary> = {};
  for (const [dayNumber, sketch] of sketches) {
    const moods = leadingMoods(votes.get(dayNumber));
    result[dayNumber] = { filled: true, mood: moods[0], moods, sketch, ids: sketch.map((item) => item.id) };
  }
  return result;
}

function sketchOf(item: CanvasItem): SketchItem {
  const keepsContent = item.kind === 'mood' || item.kind === 'photo';
  return {
    id: item.id,
    kind: item.kind,
    x: item.x,
    y: item.y,
    scale: item.scale,
    rotation: item.rotation,
    color: item.color,
    aspect: item.aspect,
    width: item.width,
    content: keepsContent ? item.content : undefined,
  };
}

export async function loadLocalSummaries(): Promise<DaySummaries> {
  const days = await loadAllDays();
  const votes: MoodVotes = new Map();
  const sketches = new Map<number, SketchItem[]>();
  for (const day of days) {
    if (day.items.length === 0) continue;
    sketches.set(day.dayNumber, day.items.map(sketchOf));
    for (const item of day.items) if (item.kind === 'mood') addVote(votes, day.dayNumber, item.content);
  }
  return build(sketches, votes);
}

interface GeometryRow {
  id: string;
  day_number: number;
  kind: string | null;
  x: string | null;
  y: string | null;
  scale: string | null;
  rotation: string | null;
  color: string | null;
  aspect: string | null;
  width: string | null;
  z: string | null;
}

interface ContentRow {
  id: string;
  content: string | null;
}

const GEOMETRY_COLUMNS =
  'id, day_number, kind:data->>kind, x:data->>x, y:data->>y, scale:data->>scale, rotation:data->>rotation, color:data->>color, aspect:data->>aspect, width:data->>width, z:data->>z';

/** The server hands out at most 1000 rows per request; this asks again until everything is there. */
async function allRows<Row>(spaceId: string, columns: string, onlyKinds?: readonly string[]): Promise<Row[]> {
  if (!supabase) throw new Error('Cloud is not configured');
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabase.from('day_items').select(columns).eq('space_id', spaceId);
    if (onlyKinds) query = query.in('data->>kind', [...onlyKinds]);
    const { data, error } = await query.order('day_number').order('id').range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = (data ?? []) as unknown as Row[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

const toNumber = (value: string | null, fallback: number): number => {
  const parsed = value === null ? Number.NaN : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/** Reads where things are and what kind they are, never the words on a page. */
export async function loadCloudSummaries(spaceId: string): Promise<DaySummaries> {
  const [geometry, contents] = await Promise.all([
    allRows<GeometryRow>(spaceId, GEOMETRY_COLUMNS),
    allRows<ContentRow>(spaceId, 'id, content:data->>content', ['mood', 'photo']),
  ]);
  const contentOf = new Map(contents.map((row) => [row.id, row.content ?? undefined]));
  const byDay = new Map<number, (SketchItem & { z: number })[]>();
  const votes: MoodVotes = new Map();
  for (const row of geometry) {
    const kind = row.kind as ItemKind;
    if (!ITEM_KINDS.includes(kind)) continue;
    const content = contentOf.get(row.id);
    const item = {
      id: row.id,
      kind,
      x: toNumber(row.x, 0),
      y: toNumber(row.y, 0),
      scale: toNumber(row.scale, 1),
      rotation: toNumber(row.rotation, 0),
      color: row.color ?? '#2E2B3A',
      aspect: row.aspect === null ? undefined : toNumber(row.aspect, 1),
      width: row.width === null ? undefined : toNumber(row.width, 0),
      content,
      z: toNumber(row.z, 0),
    };
    byDay.set(row.day_number, [...(byDay.get(row.day_number) ?? []), item]);
    if (kind === 'mood') addVote(votes, row.day_number, content);
  }
  const sketches = new Map<number, SketchItem[]>();
  for (const [dayNumber, items] of byDay) {
    sketches.set(
      dayNumber,
      items.sort((a, b) => a.z - b.z).map(({ z: _z, ...item }) => item),
    );
  }
  // Rows of kinds this version does not know still make the day "filled".
  for (const row of geometry) if (!sketches.has(row.day_number)) sketches.set(row.day_number, []);
  return build(sketches, votes);
}
