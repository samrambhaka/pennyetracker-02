-- Offline MBTiles storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('offline-maps', 'offline-maps', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for offline-maps bucket
CREATE POLICY "Admins read offline-maps"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'offline-maps' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins upload offline-maps"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'offline-maps' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins update offline-maps"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'offline-maps' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins delete offline-maps"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'offline-maps' AND public.is_admin(auth.uid()));

-- Public read of offline mbtiles metadata (path + uploaded_at + size as JSON text)
CREATE OR REPLACE FUNCTION public.get_public_offline_mbtiles_meta()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT value FROM public.app_settings WHERE key = 'offline_mbtiles' LIMIT 1;
$$;

-- Public signed URL fetcher via supabase storage (returns signed URL)
-- Note: signed URL is generated client-side via the admin/server fn; this function
-- just exposes the metadata. The signed URL itself is created server-side by the
-- TanStack server function using the service role.
