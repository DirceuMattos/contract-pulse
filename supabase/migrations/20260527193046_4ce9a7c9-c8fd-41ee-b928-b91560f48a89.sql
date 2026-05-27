INSERT INTO storage.buckets (id, name, public) VALUES ('hr-avatars', 'hr-avatars', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "hr-avatars public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'hr-avatars');

CREATE POLICY "hr-avatars authenticated insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'hr-avatars');

CREATE POLICY "hr-avatars authenticated update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'hr-avatars');

CREATE POLICY "hr-avatars authenticated delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'hr-avatars');