import { loadAllDays } from '@/features/canvas/storage';
import { supabase } from '@/lib/supabase';
import type { MoodKey } from '@/features/canvas/moods';
import { MOODS } from '@/features/canvas/moods';

/** What the day grid needs to know about a day: has it content, and how did the day feel. */
export interface DaySummary {
  filled: boolean;
  mood?: MoodKey;
}

export type DaySummaries = Readonly<Record<number, DaySummary>>;

type MoodVotes = Map<number, Map<MoodKey, number>>;

const isMoodKey = (value: unknown): value is MoodKey => MOODS.some((m) => m.key === value);

function addVote(votes: MoodVotes, dayNumber: number, mood: unknown): void {
  if (!isMoodKey(mood)) return;
  const forDay = votes.get(dayNumber) ?? new Map<MoodKey, number>();
  forDay.set(mood, (forDay.get(mood) ?? 0) + 1);
  votes.set(dayNumber, forDay);
}

/** The mood used most on a day; on a tie the one that was added first. */
function leadingMood(forDay: Map<MoodKey, number> | undefined): MoodKey | undefined {
  if (!forDay) return undefined;
  let best: MoodKey | undefined;
  let bestCount = 0;
  for (const [mood, count] of forDay) {
    if (count > bestCount) {
      best = mood;
      bestCount = count;
    }
  }
  return best;
}

function build(filledDays: Iterable<number>, votes: MoodVotes): DaySummaries {
  const result: Record<number, DaySummary> = {};
  for (const dayNumber of filledDays) result[dayNumber] = { filled: true, mood: leadingMood(votes.get(dayNumber)) };
  return result;
}

export async function loadLocalSummaries(): Promise<DaySummaries> {
  const days = await loadAllDays();
  const votes: MoodVotes = new Map();
  const filled: number[] = [];
  for (const day of days) {
    if (day.items.length === 0) continue;
    filled.push(day.dayNumber);
    for (const item of day.items) if (item.kind === 'mood') addVote(votes, day.dayNumber, item.content);
  }
  return build(filled, votes);
}

/** Only day numbers and moods are read, never the content of the pages. */
export async function loadCloudSummaries(spaceId: string): Promise<DaySummaries> {
  if (!supabase) throw new Error('Cloud is not configured');
  const [days, moods] = await Promise.all([
    supabase.from('day_items').select('day_number').eq('space_id', spaceId),
    supabase.from('day_items').select('day_number, mood:data->>content').eq('space_id', spaceId).eq('data->>kind', 'mood'),
  ]);
  if (days.error) throw days.error;
  if (moods.error) throw moods.error;
  const votes: MoodVotes = new Map();
  for (const row of moods.data ?? []) addVote(votes, row.day_number as number, row.mood);
  return build(new Set((days.data ?? []).map((row) => row.day_number as number)), votes);
}
