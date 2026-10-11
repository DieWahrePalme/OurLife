import { useEffect, useRef } from 'react';

import { getSpaceId } from '@/features/sync/context';

import { isCloudPhoto, uploadPhoto } from './photo-cloud';
import type { CanvasItem } from './types';

const isHttp = (content: string) => /^https?:/i.test(content);
const isFileUri = (content: string) => /^file:/i.test(content);

/** A photo, or a pasted sticker, that still only exists as a file on this phone. */
function isLocalImage(item: CanvasItem): boolean {
  if (isCloudPhoto(item.content) || isHttp(item.content)) return false;
  return item.kind === 'photo' || (item.kind === 'sticker' && isFileUri(item.content));
}

/**
 * A photo that only exists as a file on this phone (the upload failed or the phone was offline)
 * is sent again when the page is open. Once it is in the cloud, both phones see it.
 * Each photo is tried once per visit; a phone without the file simply fails quietly.
 */
export function usePhotoResync(
  items: readonly CanvasItem[],
  canEdit: boolean,
  update: (id: string, patch: Partial<CanvasItem>) => void,
): void {
  const tried = useRef<Set<string>>(new Set());

  useEffect(() => {
    const spaceId = getSpaceId();
    if (!canEdit || !spaceId) return;
    for (const item of items) {
      if (!isLocalImage(item) || tried.current.has(item.id)) continue;
      tried.current.add(item.id);
      uploadPhoto(spaceId, item.id, item.content)
        .then((content) => update(item.id, { content }))
        .catch(() => undefined);
    }
  }, [items, canEdit, update]);
}
