import { supabase } from '@/lib/supabase';

import type { Goal, GoalEntry } from './types';

function client() {
  if (!supabase) throw new Error('Cloud is not configured');
  return supabase;
}

export async function fetchGoals(spaceId: string): Promise<Goal[]> {
  const { data, error } = await client()
    .from('goals')
    .select('id, name, target, unit, deadline')
    .eq('space_id', spaceId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).flatMap((row) =>
    typeof row.id === 'string' && typeof row.name === 'string' && typeof row.target === 'number'
      ? [{ id: row.id, name: row.name, target: row.target, unit: typeof row.unit === 'string' ? row.unit : '', deadline: typeof row.deadline === 'string' ? row.deadline : null }]
      : [],
  );
}

export async function insertGoal(spaceId: string, goal: Goal): Promise<void> {
  const { error } = await client()
    .from('goals')
    .upsert({ space_id: spaceId, id: goal.id, name: goal.name, target: goal.target, unit: goal.unit, deadline: goal.deadline }, { onConflict: 'space_id,id' });
  if (error) throw error;
}

export async function deleteGoal(spaceId: string, goalId: string): Promise<void> {
  const { error } = await client().from('goals').delete().eq('space_id', spaceId).eq('id', goalId);
  if (error) throw error;
}

/** Every goal chip written on any day page. */
export async function fetchGoalEntries(spaceId: string): Promise<GoalEntry[]> {
  const { data, error } = await client()
    .from('day_items')
    .select('id, day_number, data')
    .eq('space_id', spaceId)
    .eq('data->>kind', 'goal');
  if (error) throw error;
  return (data ?? []).flatMap((row) => {
    const item = row.data as Record<string, unknown> | null;
    if (!item || typeof item.content !== 'string' || typeof item.amount !== 'number') return [];
    return [{ itemId: row.id as string, goalId: item.content, dayNumber: row.day_number as number, amount: item.amount }];
  });
}
