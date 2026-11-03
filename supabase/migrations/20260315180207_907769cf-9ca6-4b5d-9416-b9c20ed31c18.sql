CREATE POLICY "Allow public read on published-sites" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'published-sites');

CREATE POLICY "Allow authenticated insert on published-sites" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'published-sites');

CREATE POLICY "Allow anon insert on published-sites" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'published-sites');