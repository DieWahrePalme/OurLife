import { supabase } from '@/lib/supabase';

export interface SpaceInfo {
  id: string;
  startDate: string;
  pairCode: string;
}

function client() {
  if (!supabase) throw new Error('Cloud is not configured');
  return supabase;
}

/** Every phone signs in anonymously once; the session is kept on the phone. Returns the user id. */
export async function ensureSession(): Promise<string> {
  const current = await client().auth.getSession();
  if (current.error) throw current.error;
  if (current.data.session) return current.data.session.user.id;
  const created = await client().auth.signInAnonymously();
  if (created.error || !created.data.user) throw created.error ?? new Error('Sign-in failed');
  return created.data.user.id;
}

function readSpace(row: Record<string, unknown> | null): SpaceInfo | null {
  if (!row) return null;
  const { id, start_date: startDate, pair_code: pairCode } = row;
  if (typeof id !== 'string' || typeof startDate !== 'string' || typeof pairCode !== 'string') return null;
  return { id, startDate, pairCode };
}

/** The space this phone belongs to, or null if it has not paired yet. */
export async function fetchMySpace(userId: string): Promise<SpaceInfo | null> {
  const member = await client().from('space_members').select('space_id').eq('user_id', userId).maybeSingle();
  if (member.error) throw member.error;
  if (!member.data) return null;
  const space = await client()
    .from('spaces')
    .select('id, start_date, pair_code')
    .eq('id', member.data.space_id)
    .maybeSingle();
  if (space.error) throw space.error;
  return readSpace(space.data);
}

export async function createSpaceOnServer(startDate: string): Promise<SpaceInfo> {
  const { data, error } = await client().rpc('create_space', { start_date: startDate });
  if (error) throw error;
  const row: unknown = Array.isArray(data) ? data[0] : data;
  const made = readSpace(
    typeof row === 'object' && row !== null
      ? { id: (row as Record<string, unknown>).space_id, start_date: startDate, pair_code: (row as Record<string, unknown>).pair_code }
      : null,
  );
  if (!made) throw new Error('Unexpected answer from the server');
  return made;
}

/** Returns null when the code is wrong or the space already has two people. */
export async function joinSpaceOnServer(code: string): Promise<SpaceInfo | null> {
  const { data, error } = await client().rpc('join_space', { code });
  if (error) throw error;
  if (typeof data !== 'string') return null;
  const space = await client().from('spaces').select('id, start_date, pair_code').eq('id', data).maybeSingle();
  if (space.error) throw space.error;
  return readSpace(space.data);
}

export async function updateStartDateOnServer(spaceId: string, startDate: string): Promise<void> {
  const { error } = await client().from('spaces').update({ start_date: startDate }).eq('id', spaceId);
  if (error) throw error;
}
