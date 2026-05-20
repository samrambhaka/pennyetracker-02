import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type OfflineMbtilesMeta = {
  path: string;
  size: number;
  uploaded_at: string;
  filename?: string | null;
};

/**
 * Returns the currently configured offline mbtiles signed URL + metadata, or
 * null if no offline map has been uploaded. Publicly callable so unauthenticated
 * /map/* pages can fall back to the offline map.
 */
export const getOfflineMbtilesSignedUrl = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ url: string; meta: OfflineMbtilesMeta } | null> => {
    const { data: setting, error } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", "offline_mbtiles")
      .maybeSingle();
    if (error) throw error;
    const raw = (setting?.value as string | null) ?? null;
    if (!raw) return null;
    let meta: OfflineMbtilesMeta;
    try {
      meta = JSON.parse(raw);
    } catch {
      return null;
    }
    if (!meta.path) return null;
    const { data: signed, error: sErr } = await supabaseAdmin.storage
      .from("offline-maps")
      .createSignedUrl(meta.path, 60 * 60); // 1h
    if (sErr || !signed?.signedUrl) return null;
    return { url: signed.signedUrl, meta };
  },
);