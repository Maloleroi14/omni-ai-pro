INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('published-sites', 'published-sites', true, 5242880, ARRAY['text/html'])
ON CONFLICT (id) DO NOTHING;