import { useEffect, useRef, useState } from 'react';

import { getSpaceId } from '@/features/sync/context';

import { isCloudPhoto, MissingLocalFileError, uploadPhoto } from './photo-cloud';
import type { CanvasItem } from './types';

const RETRY_DELAY_MS = 15_000;
const MAX_REASON_LENGTH = 90;

const isHttp = (content: string) => /^https?:/i.test(content);
const isFileUri = (content: string) => /^file:/i.test(content);

/** A photo, or a pasted sticker, that still only exists as a file on this phone. */
function isLocalImage(item: CanvasItem): boolean {
  if (isCloudPhoto(item.content) || isHttp(item.content)) return false;
  return item.kind === 'photo' || (item.kind === 'sticker' && isFileUri(item.content));
}

function reasonOf(error: unknown): string {
  const message = error instanceof Error ? error.message : typeof error === 'object' && error !== null && 'message' in error ? String((error as { message: unknown }).message) : '';
  return message.slice(0, MAX_REASON_LENGTH);
}

export interface PhotoSync {
  /** Pictures on their way to the cloud right now. */
  sharing: number;
  /** Why the last upload failed, or null. Failed uploads are retried on their own. */
  failure: string | null;
}

/**
 * Every new photo or pasted sticker is first only a file on this phone. This sends it to the cloud (so the other
 * phone sees it) and swaps the item over to the cloud copy. A failed upload is tried again every few seconds.
 * A picture whose file lives on another phone is left alone: that phone sends it.
 */
export function usePhotoResync(
  items: readonly CanvasItem[],
  canEdit: boolean,
  update: (id: string, patch: Partial<CanvasItem>) => void,
): PhotoSync {
  const running = useRef<Set<string>>(new Set());
  const notHere = useRef<Set<string>>(new Set());
  const retryAt = useRef<Map<string, number>>(new Map());
  const failures = useRef<Map<string, string>>(new Map());
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [sharing, setSharing] = useState(0);
  const [failure, setFailure] = useState<string | null>(null);
  const [round, setRound] = useState(0);

  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    const spaceId = getSpaceId();
    if (!canEdit || !spaceId) return;
    const now = Date.now();
    const showFailure = () => setFailure(failures.current.values().next().value ?? null);

    for (const item of items) {
      if (!isLocalImage(item) || running.current.has(item.id) || notHere.current.has(item.id)) continue;
      if ((retryAt.current.get(item.id) ?? 0) > now) continue;
      running.current.add(item.id);
      setSharing(running.current.size);
      uploadPhoto(spaceId, item.id, item.content)
        .then((content) => {
          failures.current.delete(item.id);
          retryAt.current.delete(item.id);
          update(item.id, { content });
        })
        .catch((error: unknown) => {
          if (error instanceof MissingLocalFileError) {
            notHere.current.add(item.id);
            return;
          }
          failures.current.set(item.id, reasonOf(error));
          retryAt.current.set(item.id, Date.now() + RETRY_DELAY_MS);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => setRound((value) => value + 1), RETRY_DELAY_MS);
        })
        .finally(() => {
          running.current.delete(item.id);
          setSharing(running.current.size);
          showFailure();
        });
    }
  }, [items, canEdit, update, round]);

  // A removed picture needs no more retries or messages.
  useEffect(() => {
    const present = new Set(items.map((item) => item.id));
    let changed = false;
    for (const id of [...failures.current.keys()]) {
      if (present.has(id) && isLocalImage(items.find((item) => item.id === id) as CanvasItem)) continue;
      failures.current.delete(id);
      retryAt.current.delete(id);
      changed = true;
    }
    if (changed) setFailure(failures.current.values().next().value ?? null);
  }, [items]);

  return { sharing, failure };
}
