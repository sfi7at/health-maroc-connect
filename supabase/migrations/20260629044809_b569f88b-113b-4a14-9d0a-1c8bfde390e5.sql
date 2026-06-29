
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'pharmacy_on_duty';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'campaign';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'article';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'doctor_availability';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'lab_results';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'ai_suggestion';

DO $$ BEGIN
  CREATE TYPE public.notification_priority AS ENUM ('low','normal','high','urgent','critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.notification_status AS ENUM ('pending','sent','delivered','opened','clicked','failed','ignored');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS priority public.notification_priority NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS status public.notification_status NOT NULL DEFAULT 'sent',
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS action_url text,
  ADD COLUMN IF NOT EXISTS action_label text,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'in_app',
  ADD COLUMN IF NOT EXISTS dedupe_key text,
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric,
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_attempts smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS clicked_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS notifications_user_dedupe_key
  ON public.notifications(user_id, dedupe_key) WHERE dedupe_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON public.notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_priority_idx
  ON public.notifications(priority, created_at DESC);

CREATE TABLE IF NOT EXISTS public.notification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('delivered','opened','clicked','dismissed','failed')),
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.notification_events TO authenticated;
GRANT ALL ON public.notification_events TO service_role;
ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users insert own events" ON public.notification_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users view own events" ON public.notification_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all events" ON public.notification_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS notification_events_notif_idx ON public.notification_events(notification_id);

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth_key text NOT NULL,
  user_agent text,
  enabled boolean NOT NULL DEFAULT true,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own push subs" ON public.push_subscriptions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.check_notification_rate_limit(
  _user_id uuid, _type public.notification_type, _window_minutes int DEFAULT 60, _max_count int DEFAULT 20
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*) < _max_count
  FROM public.notifications
  WHERE user_id = _user_id
    AND type = _type
    AND created_at > now() - (_window_minutes || ' minutes')::interval;
$$;
