/** KLIPY: the big GIF and sticker library (successor of Tenor). Docs: https://docs.klipy.com */

export type LibraryKind = 'stickers' | 'gifs';

export interface LibraryItem {
  id: string;
  title: string;
  /** Small animated picture for the grid. */
  previewUrl: string;
  /** What gets stored in the page item. KLIPY's own address, unchanged (their rules forbid copying files). */
  url: string;
  /** Width divided by height. */
  aspect: number;
}

export interface LibraryPage {
  items: LibraryItem[];
  hasNext: boolean;
}

const API_BASE = 'https://api.klipy.com/api/v1';
const MEDIA_PREFIX = 'https://static.klipy.com/';
const PER_PAGE = 24;
const CONTENT_FILTER = 'medium';
const PREVIEW_SIZES = ['sm', 'xs', 'md'] as const;
const PAGE_SIZES = ['md', 'sm', 'hd'] as const;
const FORMATS = ['webp', 'gif', 'png'] as const;

const apiKey = process.env.EXPO_PUBLIC_KLIPY_KEY ?? '';

/** Without a key the library tabs stay hidden and only emoji stickers are offered. */
export const klipyAvailable = apiKey.length > 0;

/** Only KLIPY's own media address is ever loaded, even if a synced page item says otherwise. */
export function isKlipyUrl(value: string): boolean {
  return value.startsWith(MEDIA_PREFIX);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

interface PickedFile {
  url: string;
  width: number;
  height: number;
}

function pickFile(file: Record<string, unknown>, sizes: readonly string[]): PickedFile | null {
  for (const size of sizes) {
    const bySize = asRecord(file[size]);
    if (!bySize) continue;
    for (const format of FORMATS) {
      const entry = asRecord(bySize[format]);
      if (!entry) continue;
      const { url, width, height } = entry;
      if (typeof url === 'string' && isKlipyUrl(url) && typeof width === 'number' && typeof height === 'number' && width > 0 && height > 0) {
        return { url, width, height };
      }
    }
  }
  return null;
}

function readItem(raw: unknown): LibraryItem | null {
  const row = asRecord(raw);
  const file = asRecord(row?.file);
  if (!row || !file) return null;
  const preview = pickFile(file, PREVIEW_SIZES);
  const page = pickFile(file, PAGE_SIZES);
  if (!preview || !page) return null;
  return {
    id: String(row.id),
    title: typeof row.title === 'string' ? row.title : '',
    previewUrl: preview.url,
    url: page.url,
    aspect: page.width / page.height,
  };
}

/** Trending (no search words) or search results, one page at a time, in the order KLIPY returns them. */
export async function fetchLibrary(kind: LibraryKind, query: string, page: number): Promise<LibraryPage> {
  const search = query.trim();
  const params = new URLSearchParams({ page: String(page), per_page: String(PER_PAGE), content_filter: CONTENT_FILTER });
  if (search) params.set('q', search);
  const response = await fetch(`${API_BASE}/${encodeURIComponent(apiKey)}/${kind}/${search ? 'search' : 'trending'}?${params}`);
  if (!response.ok) throw new Error(`KLIPY answered ${response.status}`);
  const body = asRecord(await response.json());
  const data = asRecord(body?.data);
  if (!body || body.result !== true || !data || !Array.isArray(data.data)) throw new Error('Unexpected answer from KLIPY');
  return {
    items: data.data.flatMap((raw) => {
      const item = readItem(raw);
      return item ? [item] : [];
    }),
    hasNext: data.has_next === true,
  };
}
