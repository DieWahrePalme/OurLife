import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

export const PHOTO_BUCKET = 'photos';
const BUCKET = PHOTO_BUCKET;
/** Photos in the cloud are stored as "storage:<path>" in the item, so any phone can find them. */
const REF_PREFIX = 'storage:';
const MAX_BYTES = 10 * 1024 * 1024;
const LINK_LIFETIME_SECONDS = 3600;
/** Renew a link a little before it runs out. */
const LINK_RENEW_MARGIN_MS = 60_000;

const EXTENSION_BY_TYPE: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'heic',
};

/** The reference stored in an item for a file in the bucket. */
export function cloudRef(path: string): string {
  return `${REF_PREFIX}${path}`;
}

export function isCloudPhoto(content: string): boolean {
  return content.startsWith(REF_PREFIX);
}

function pathOf(content: string): string {
  return content.slice(REF_PREFIX.length);
}

/** Uploads a local image to `path` in the private bucket. Returns the reference to store in an item. */
export async function uploadImage(path: string, localUri: string): Promise<string> {
  if (!supabase) throw new Error('Cloud is not configured');
  const blob = await (await fetch(localUri)).blob();
  if (!EXTENSION_BY_TYPE[blob.type]) throw new Error('This image type is not supported');
  if (blob.size > MAX_BYTES) throw new Error('This image is too large (10 MB at most)');
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: blob.type, upsert: false });
  if (error) throw error;
  return cloudRef(path);
}

/** Uploads a picked photo to `<space_id>/<item_id>.<ext>`. Returns the reference to store in the item. */
export async function uploadPhoto(spaceId: string, itemId: string, localUri: string): Promise<string> {
  const blob = await (await fetch(localUri)).blob();
  const extension = EXTENSION_BY_TYPE[blob.type];
  if (!extension) throw new Error('This photo type is not supported');
  return uploadImage(`${spaceId}/${itemId}.${extension}`, localUri);
}

/** Best effort: a photo left behind in the bucket is harmless, so failures are ignored. */
export async function deletePhoto(content: string): Promise<void> {
  if (!supabase || !isCloudPhoto(content)) return;
  await supabase.storage.from(BUCKET).remove([pathOf(content)]).catch(() => undefined);
}

/** Removes every photo file of a space (used when the last person leaves). Throws if the bucket cannot be read. */
export async function deleteAllPhotos(spaceId: string): Promise<void> {
  if (!supabase) return;
  const bucket = supabase.storage.from(BUCKET);
  // The space folder, and the sticker folder an earlier test build used.
  for (const folder of [spaceId, `${spaceId}/stickers`]) {
    const { data, error } = await bucket.list(folder, { limit: 1000 });
    if (error) throw error;
    const paths = (data ?? []).filter((entry) => entry.id !== null).map((entry) => `${folder}/${entry.name}`);
    if (paths.length > 0) {
      const removed = await bucket.remove(paths);
      if (removed.error) throw removed.error;
    }
  }
}

interface CachedLink {
  url: string;
  expiresAt: number;
}

const linkCache = new Map<string, CachedLink>();

async function signedLink(path: string): Promise<string | null> {
  if (!supabase) return null;
  const cached = linkCache.get(path);
  if (cached && cached.expiresAt - Date.now() > LINK_RENEW_MARGIN_MS) return cached.url;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, LINK_LIFETIME_SECONDS);
  if (error || !data) return null;
  linkCache.set(path, { url: data.signedUrl, expiresAt: Date.now() + LINK_LIFETIME_SECONDS * 1000 });
  return data.signedUrl;
}

/** Synced items are untrusted data: an http(s) address in a photo would load from any server (a tracking pixel). */
function isLocalUri(content: string): boolean {
  return !/^https?:/i.test(content);
}

/** The address an image can load from: a local file as is, a cloud photo through a short-lived private link. */
export function usePhotoUri(content: string): string | null {
  const [uri, setUri] = useState<string | null>(isCloudPhoto(content) ? null : isLocalUri(content) ? content : null);

  useEffect(() => {
    if (!isCloudPhoto(content)) {
      setUri(isLocalUri(content) ? content : null);
      return undefined;
    }
    let cancelled = false;
    signedLink(pathOf(content)).then((link) => {
      if (!cancelled) setUri(link);
    });
    return () => {
      cancelled = true;
    };
  }, [content]);

  return uri;
}
