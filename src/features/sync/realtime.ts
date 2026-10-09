import { supabase } from '@/lib/supabase';

export type SyncedTable = 'day_items' | 'goals';

/**
 * Calls onChange whenever the table changes. Returns the unsubscribe function.
 * No server-side filter: Realtime does not deliver deletes for filtered subscriptions,
 * and row security already limits what this phone may receive.
 */
export function subscribeToTable(table: SyncedTable, onChange: () => void): () => void {
  if (!supabase) return () => undefined;
  const client = supabase;
  const channel = client
    .channel(`${table}-${Math.random().toString(36).slice(2, 10)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, onChange)
    .subscribe();
  return () => {
    client.removeChannel(channel);
  };
}
