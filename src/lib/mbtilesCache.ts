import { get, set, del } from "idb-keyval";

const KEY = "offline_mbtiles_v1";

export type MbtilesCacheEntry = {
  uploaded_at: string;
  size: number;
  blob: Blob;
};

export async function loadCachedMbtiles(): Promise<MbtilesCacheEntry | null> {
  try {
    return (await get<MbtilesCacheEntry>(KEY)) ?? null;
  } catch {
    return null;
  }
}

export async function saveCachedMbtiles(entry: MbtilesCacheEntry): Promise<void> {
  try {
    await set(KEY, entry);
  } catch {
    /* quota / private mode — ignore */
  }
}

export async function clearCachedMbtiles(): Promise<void> {
  try {
    await del(KEY);
  } catch {
    /* ignore */
  }
}

/** Fetch the mbtiles blob, using the IndexedDB cache when uploaded_at matches. */
export async function getOrFetchMbtiles(
  signedUrl: string,
  uploaded_at: string,
  size: number,
): Promise<Blob> {
  const cached = await loadCachedMbtiles();
  if (cached && cached.uploaded_at === uploaded_at) return cached.blob;
  const res = await fetch(signedUrl);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const blob = await res.blob();
  await saveCachedMbtiles({ uploaded_at, size, blob });
  return blob;
}