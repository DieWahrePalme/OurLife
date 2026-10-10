import { supabase } from '@/lib/supabase';

export interface SpaceInfo {
  id: string;
  name: string;
  startDate: string;
  pairCode: string;
}

export interface Member {
  userId: string;
  nickname: string;
  joinedAt: string;
}

export interface NewSpaceSetup {
  spaceName: string;
  startDate: string;
  memberName: string;
}

export const DEFAULT_SPACE_NAME = 'Our space';
const SPACE_COLUMNS = 'id, name, start_date, pair_code';

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
  const { id, name, start_date: startDate, pair_code: pairCode } = row;
  if (typeof id !== 'string' || typeof startDate !== 'string' || typeof pairCode !== 'string') return null;
  return { id, name: typeof name === 'string' && name ? name : DEFAULT_SPACE_NAME, startDate, pairCode };
}

/** The space this phone belongs to, or null if it has not paired yet. */
export async function fetchMySpace(userId: string): Promise<SpaceInfo | null> {
  const member = await client().from('space_members').select('space_id').eq('user_id', userId).maybeSingle();
  if (member.error) throw member.error;
  if (!member.data) return null;
  const space = await client()
    .from('spaces')
    .select(SPACE_COLUMNS)
    .eq('id', member.data.space_id)
    .maybeSingle();
  if (space.error) throw space.error;
  return readSpace(space.data);
}

export async function createSpaceOnServer(setup: NewSpaceSetup): Promise<SpaceInfo> {
  const { data, error } = await client().rpc('create_space', {
    start_date: setup.startDate,
    space_name: setup.spaceName,
    member_name: setup.memberName,
  });
  if (error) throw error;
  const row: unknown = Array.isArray(data) ? data[0] : data;
  const answer = typeof row === 'object' && row !== null ? (row as Record<string, unknown>) : null;
  const made = readSpace(
    answer ? { id: answer.space_id, name: setup.spaceName.trim(), start_date: setup.startDate, pair_code: answer.pair_code } : null,
  );
  if (!made) throw new Error('Unexpected answer from the server');
  return made;
}

/** Returns null when the code is wrong or the space is full. */
export async function joinSpaceOnServer(code: string, memberName: string): Promise<SpaceInfo | null> {
  const { data, error } = await client().rpc('join_space', { code, member_name: memberName });
  if (error) throw error;
  if (typeof data !== 'string') return null;
  const space = await client().from('spaces').select(SPACE_COLUMNS).eq('id', data).maybeSingle();
  if (space.error) throw space.error;
  return readSpace(space.data);
}

export async function updateStartDateOnServer(spaceId: string, startDate: string): Promise<void> {
  const { error } = await client().from('spaces').update({ start_date: startDate }).eq('id', spaceId);
  if (error) throw error;
}

export async function updateSpaceNameOnServer(spaceId: string, name: string): Promise<void> {
  const { error } = await client().from('spaces').update({ name }).eq('id', spaceId);
  if (error) throw error;
}

export async function fetchMembers(spaceId: string): Promise<Member[]> {
  const { data, error } = await client()
    .from('space_members')
    .select('user_id, nickname, joined_at')
    .eq('space_id', spaceId)
    .order('joined_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).flatMap((row) =>
    typeof row.user_id === 'string' && typeof row.joined_at === 'string'
      ? [{ userId: row.user_id, nickname: typeof row.nickname === 'string' ? row.nickname : '', joinedAt: row.joined_at }]
      : [],
  );
}

export async function renameMemberOnServer(userId: string, nickname: string): Promise<void> {
  const { error } = await client().from('space_members').update({ nickname }).eq('user_id', userId);
  if (error) throw error;
}

export async function removeMemberOnServer(userId: string): Promise<void> {
  const { error } = await client().rpc('remove_member', { target_user: userId });
  if (error) throw error;
}

/** Makes the old code useless and returns the new one. */
export async function rotatePairCodeOnServer(): Promise<string> {
  const { data, error } = await client().rpc('rotate_pair_code');
  if (error) throw error;
  if (typeof data !== 'string') throw new Error('Unexpected answer from the server');
  return data;
}
