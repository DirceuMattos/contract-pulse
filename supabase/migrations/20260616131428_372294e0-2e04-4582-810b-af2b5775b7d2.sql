
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS logo_url text;

CREATE POLICY "Authenticated can read client-logos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'client-logos');

CREATE POLICY "Authenticated can insert client-logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'client-logos');

CREATE POLICY "Authenticated can update client-logos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'client-logos');

CREATE POLICY "Authenticated can delete client-logos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'client-logos');
