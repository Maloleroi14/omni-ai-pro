CREATE INDEX IF NOT EXISTS idx_session_recordings_started_at ON public.session_recordings (started_at DESC);
DELETE FROM public.session_recordings WHERE started_at < now() - interval '14 days';