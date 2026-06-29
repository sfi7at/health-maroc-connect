
-- Enum for content types
DO $$ BEGIN
  CREATE TYPE public.content_type AS ENUM ('article','news','campaign','faq','guide','emergency','seasonal','announcement','city_info');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.article_status AS ENUM ('draft','published','scheduled','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend articles
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS excerpt text,
  ADD COLUMN IF NOT EXISTS content_type public.content_type NOT NULL DEFAULT 'article',
  ADD COLUMN IF NOT EXISTS status public.article_status NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS seo_description text,
  ADD COLUMN IF NOT EXISTS reading_time_minutes integer,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS city_id uuid REFERENCES public.cities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS share_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS click_count integer NOT NULL DEFAULT 0;

-- Backfill status from is_published
UPDATE public.articles SET status = 'published' WHERE is_published = true AND status = 'draft';

CREATE INDEX IF NOT EXISTS idx_articles_status ON public.articles(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_content_type ON public.articles(content_type, status);
CREATE INDEX IF NOT EXISTS idx_articles_featured ON public.articles(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_articles_city ON public.articles(city_id);

-- Article views (analytics)
CREATE TABLE IF NOT EXISTS public.article_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  viewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text,
  duration_seconds integer,
  referrer text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_article_views_article ON public.article_views(article_id, created_at DESC);

GRANT SELECT, INSERT ON public.article_views TO authenticated;
GRANT SELECT, INSERT ON public.article_views TO anon;
GRANT ALL ON public.article_views TO service_role;

ALTER TABLE public.article_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "article_views insert anyone" ON public.article_views
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.articles a WHERE a.id = article_id AND a.status = 'published')
  );

CREATE POLICY "article_views admin read" ON public.article_views
  FOR SELECT TO authenticated
  USING (public.has_any_admin_role(auth.uid()));

-- FAQs
CREATE TABLE IF NOT EXISTS public.faqs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question text NOT NULL,
  answer text NOT NULL,
  category text,
  language public.article_language NOT NULL DEFAULT 'fr',
  sort_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.faqs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.faqs TO authenticated;
GRANT ALL ON public.faqs TO service_role;

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "faqs public read" ON public.faqs
  FOR SELECT USING (is_published = true OR public.has_any_admin_role(auth.uid()));

CREATE POLICY "faqs admin write" ON public.faqs
  FOR ALL TO authenticated
  USING (public.has_any_admin_role(auth.uid()))
  WITH CHECK (public.has_any_admin_role(auth.uid()));

CREATE TRIGGER trg_faqs_updated BEFORE UPDATE ON public.faqs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
