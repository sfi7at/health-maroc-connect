
-- =====================================================================
-- HELPERS
-- =====================================================================
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- =====================================================================
-- MASTER / REFERENCE TABLES
-- =====================================================================

-- Countries (future expansion)
CREATE TABLE IF NOT EXISTS public.countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  iso2 text UNIQUE NOT NULL,
  iso3 text UNIQUE,
  name_fr text NOT NULL,
  name_ar text,
  name_en text,
  phone_code text,
  currency_code text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.countries TO anon, authenticated;
GRANT ALL ON public.countries TO service_role;
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "countries_public_read" ON public.countries FOR SELECT USING (true);
CREATE POLICY "countries_admin_write" ON public.countries FOR ALL TO authenticated
  USING (public.has_any_admin_role(auth.uid())) WITH CHECK (public.has_any_admin_role(auth.uid()));
CREATE TRIGGER trg_countries_updated BEFORE UPDATE ON public.countries
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Languages
CREATE TABLE IF NOT EXISTS public.languages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name_fr text NOT NULL,
  name_ar text,
  name_en text,
  native_name text,
  is_rtl boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.languages TO anon, authenticated;
GRANT ALL ON public.languages TO service_role;
ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "languages_public_read" ON public.languages FOR SELECT USING (true);
CREATE POLICY "languages_admin_write" ON public.languages FOR ALL TO authenticated
  USING (public.has_any_admin_role(auth.uid())) WITH CHECK (public.has_any_admin_role(auth.uid()));

-- Prefectures (parallel to provinces)
CREATE TABLE IF NOT EXISTS public.prefectures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id uuid REFERENCES public.regions(id) ON DELETE SET NULL,
  name_fr text NOT NULL,
  name_ar text,
  code text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.prefectures TO anon, authenticated;
GRANT ALL ON public.prefectures TO service_role;
ALTER TABLE public.prefectures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prefectures_public_read" ON public.prefectures FOR SELECT USING (true);
CREATE POLICY "prefectures_admin_write" ON public.prefectures FOR ALL TO authenticated
  USING (public.has_any_admin_role(auth.uid())) WITH CHECK (public.has_any_admin_role(auth.uid()));

-- Postal codes
CREATE TABLE IF NOT EXISTS public.postal_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  city_id uuid REFERENCES public.cities(id) ON DELETE CASCADE,
  district_id uuid REFERENCES public.districts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (code, city_id)
);
GRANT SELECT ON public.postal_codes TO anon, authenticated;
GRANT ALL ON public.postal_codes TO service_role;
ALTER TABLE public.postal_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "postal_codes_public_read" ON public.postal_codes FOR SELECT USING (true);
CREATE POLICY "postal_codes_admin_write" ON public.postal_codes FOR ALL TO authenticated
  USING (public.has_any_admin_role(auth.uid())) WITH CHECK (public.has_any_admin_role(auth.uid()));

-- Sub-specialties
CREATE TABLE IF NOT EXISTS public.sub_specialties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specialty_id uuid NOT NULL REFERENCES public.specialties(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name_fr text NOT NULL,
  name_ar text,
  name_en text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (specialty_id, slug)
);
GRANT SELECT ON public.sub_specialties TO anon, authenticated;
GRANT ALL ON public.sub_specialties TO service_role;
ALTER TABLE public.sub_specialties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sub_specialties_public_read" ON public.sub_specialties FOR SELECT USING (true);
CREATE POLICY "sub_specialties_admin_write" ON public.sub_specialties FOR ALL TO authenticated
  USING (public.has_any_admin_role(auth.uid())) WITH CHECK (public.has_any_admin_role(auth.uid()));

-- Generic catalog: medical services, equipment, departments, categories
CREATE TABLE IF NOT EXISTS public.medical_services_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL, name_fr text NOT NULL, name_ar text, name_en text,
  category text, icon text, description text,
  is_active boolean NOT NULL DEFAULT true, sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.medical_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL, name_fr text NOT NULL, name_ar text, name_en text,
  category text, is_active boolean NOT NULL DEFAULT true, sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.hospital_departments_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL, name_fr text NOT NULL, name_ar text, name_en text,
  icon text, is_active boolean NOT NULL DEFAULT true, sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.pharmacy_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL, name_fr text NOT NULL, name_ar text, name_en text,
  icon text, is_active boolean NOT NULL DEFAULT true, sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.laboratory_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL, name_fr text NOT NULL, name_ar text, name_en text,
  icon text, is_active boolean NOT NULL DEFAULT true, sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.facility_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL, name_fr text NOT NULL, name_ar text, name_en text,
  icon text, is_active boolean NOT NULL DEFAULT true, sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.consultation_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL, name_fr text NOT NULL, name_ar text, name_en text,
  icon text, default_duration_minutes int, is_active boolean NOT NULL DEFAULT true, sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.emergency_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL, name_fr text NOT NULL, name_ar text, name_en text,
  phone_number text, icon text, color text,
  is_active boolean NOT NULL DEFAULT true, sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.campaign_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL, name_fr text NOT NULL, name_ar text, name_en text,
  icon text, is_active boolean NOT NULL DEFAULT true, sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.article_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL, name_fr text NOT NULL, name_ar text, name_en text,
  icon text, is_active boolean NOT NULL DEFAULT true, sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.notification_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL, name_fr text NOT NULL, name_ar text, name_en text,
  icon text, is_active boolean NOT NULL DEFAULT true, sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Apply standard RLS+grants to the generic catalogs
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'medical_services_catalog','medical_equipment','hospital_departments_catalog',
    'pharmacy_categories','laboratory_categories','facility_categories',
    'consultation_types','emergency_categories','campaign_categories',
    'article_categories','notification_categories'
  ]) LOOP
    EXECUTE format('GRANT SELECT ON public.%I TO anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "%I_public_read" ON public.%I FOR SELECT USING (true)', t, t);
    EXECUTE format('CREATE POLICY "%I_admin_write" ON public.%I FOR ALL TO authenticated USING (public.has_any_admin_role(auth.uid())) WITH CHECK (public.has_any_admin_role(auth.uid()))', t, t);
  END LOOP;
END $$;

-- Insurance
CREATE TABLE IF NOT EXISTS public.insurance_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name_fr text NOT NULL, name_ar text, name_en text,
  short_code text,
  logo_url text,
  website text,
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.insurance_companies TO anon, authenticated;
GRANT ALL ON public.insurance_companies TO service_role;
ALTER TABLE public.insurance_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insurance_companies_public_read" ON public.insurance_companies FOR SELECT USING (true);
CREATE POLICY "insurance_companies_admin_write" ON public.insurance_companies FOR ALL TO authenticated
  USING (public.has_any_admin_role(auth.uid())) WITH CHECK (public.has_any_admin_role(auth.uid()));
CREATE TRIGGER trg_ins_companies_updated BEFORE UPDATE ON public.insurance_companies
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE IF NOT EXISTS public.provider_insurance (
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  insurance_id uuid NOT NULL REFERENCES public.insurance_companies(id) ON DELETE CASCADE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider_id, insurance_id)
);
GRANT SELECT ON public.provider_insurance TO anon, authenticated;
GRANT INSERT, DELETE ON public.provider_insurance TO authenticated;
GRANT ALL ON public.provider_insurance TO service_role;
ALTER TABLE public.provider_insurance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prov_ins_public_read" ON public.provider_insurance FOR SELECT USING (true);
CREATE POLICY "prov_ins_owner_or_admin" ON public.provider_insurance FOR ALL TO authenticated
  USING (public.owns_provider(auth.uid(), provider_id) OR public.has_any_admin_role(auth.uid()))
  WITH CHECK (public.owns_provider(auth.uid(), provider_id) OR public.has_any_admin_role(auth.uid()));

-- Permissions / Role permissions
CREATE TABLE IF NOT EXISTS public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name_fr text NOT NULL, description text,
  category text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.permissions TO authenticated;
GRANT ALL ON public.permissions TO service_role;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "permissions_auth_read" ON public.permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "permissions_admin_write" ON public.permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role app_role NOT NULL,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role, permission_id)
);
GRANT SELECT ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "role_perm_auth_read" ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "role_perm_admin_write" ON public.role_permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Subscription Plans
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name_fr text NOT NULL, name_ar text, name_en text,
  price_mad numeric(10,2) NOT NULL DEFAULT 0,
  billing_cycle text NOT NULL DEFAULT 'monthly',
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscription_plans TO anon, authenticated;
GRANT ALL ON public.subscription_plans TO service_role;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscription_plans_public_read" ON public.subscription_plans FOR SELECT USING (true);
CREATE POLICY "subscription_plans_admin_write" ON public.subscription_plans FOR ALL TO authenticated
  USING (public.has_any_admin_role(auth.uid())) WITH CHECK (public.has_any_admin_role(auth.uid()));
CREATE TRIGGER trg_sub_plans_updated BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =====================================================================
-- IMPORT CENTER / MDM OPERATIONAL TABLES
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  dataset text NOT NULL,
  source_filename text,
  source_storage_path text,
  source_format text,
  status text NOT NULL DEFAULT 'pending',
  total_rows int NOT NULL DEFAULT 0,
  inserted_count int NOT NULL DEFAULT 0,
  updated_count int NOT NULL DEFAULT 0,
  rejected_count int NOT NULL DEFAULT 0,
  duplicate_count int NOT NULL DEFAULT 0,
  mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  options jsonb NOT NULL DEFAULT '{}'::jsonb,
  report jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz,
  finished_at timestamptz,
  duration_ms int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.import_jobs TO authenticated;
GRANT ALL ON public.import_jobs TO service_role;
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "import_jobs_admin_all" ON public.import_jobs FOR ALL TO authenticated
  USING (public.has_any_admin_role(auth.uid())) WITH CHECK (public.has_any_admin_role(auth.uid()));
CREATE TRIGGER trg_import_jobs_updated BEFORE UPDATE ON public.import_jobs
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_import_jobs_status ON public.import_jobs(status);
CREATE INDEX idx_import_jobs_dataset ON public.import_jobs(dataset);

CREATE TABLE IF NOT EXISTS public.import_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  dataset text NOT NULL,
  mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_shared boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dataset, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.import_mappings TO authenticated;
GRANT ALL ON public.import_mappings TO service_role;
ALTER TABLE public.import_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "import_mappings_admin_all" ON public.import_mappings FOR ALL TO authenticated
  USING (public.has_any_admin_role(auth.uid())) WITH CHECK (public.has_any_admin_role(auth.uid()));
CREATE TRIGGER trg_import_mappings_updated BEFORE UPDATE ON public.import_mappings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE IF NOT EXISTS public.import_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.import_jobs(id) ON DELETE CASCADE,
  row_number int,
  severity text NOT NULL DEFAULT 'error',
  field text,
  message text NOT NULL,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.import_errors TO authenticated;
GRANT ALL ON public.import_errors TO service_role;
ALTER TABLE public.import_errors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "import_errors_admin_all" ON public.import_errors FOR ALL TO authenticated
  USING (public.has_any_admin_role(auth.uid())) WITH CHECK (public.has_any_admin_role(auth.uid()));
CREATE INDEX idx_import_errors_job ON public.import_errors(job_id);

-- Edit requests: anyone authenticated can suggest, admins moderate
CREATE TABLE IF NOT EXISTS public.edit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  field text,
  current_value text,
  proposed_value text,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.edit_requests TO authenticated;
GRANT ALL ON public.edit_requests TO service_role;
ALTER TABLE public.edit_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "edit_requests_user_insert" ON public.edit_requests FOR INSERT TO authenticated
  WITH CHECK (submitted_by = auth.uid());
CREATE POLICY "edit_requests_user_read" ON public.edit_requests FOR SELECT TO authenticated
  USING (submitted_by = auth.uid() OR public.has_any_admin_role(auth.uid()));
CREATE POLICY "edit_requests_admin_update" ON public.edit_requests FOR UPDATE TO authenticated
  USING (public.has_any_admin_role(auth.uid())) WITH CHECK (public.has_any_admin_role(auth.uid()));
CREATE POLICY "edit_requests_admin_delete" ON public.edit_requests FOR DELETE TO authenticated
  USING (public.has_any_admin_role(auth.uid()));
CREATE TRIGGER trg_edit_req_updated BEFORE UPDATE ON public.edit_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_edit_requests_status ON public.edit_requests(status);
CREATE INDEX idx_edit_requests_entity ON public.edit_requests(entity_type, entity_id);

-- Claim requests
CREATE TABLE IF NOT EXISTS public.claim_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claimant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  full_name text,
  professional_license text,
  business_registration text,
  identity_document_url text,
  license_document_url text,
  business_document_url text,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.claim_requests TO authenticated;
GRANT ALL ON public.claim_requests TO service_role;
ALTER TABLE public.claim_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "claim_requests_insert" ON public.claim_requests FOR INSERT TO authenticated
  WITH CHECK (claimant_id = auth.uid());
CREATE POLICY "claim_requests_read" ON public.claim_requests FOR SELECT TO authenticated
  USING (claimant_id = auth.uid() OR public.has_any_admin_role(auth.uid()));
CREATE POLICY "claim_requests_admin_update" ON public.claim_requests FOR UPDATE TO authenticated
  USING (public.has_any_admin_role(auth.uid())) WITH CHECK (public.has_any_admin_role(auth.uid()));
CREATE POLICY "claim_requests_admin_delete" ON public.claim_requests FOR DELETE TO authenticated
  USING (public.has_any_admin_role(auth.uid()));
CREATE TRIGGER trg_claim_req_updated BEFORE UPDATE ON public.claim_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_claim_requests_status ON public.claim_requests(status);

-- Record versions (version history / rollback)
CREATE TABLE IF NOT EXISTS public.record_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  version int NOT NULL DEFAULT 1,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  change_reason text,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.record_versions TO authenticated;
GRANT ALL ON public.record_versions TO service_role;
ALTER TABLE public.record_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "record_versions_insert" ON public.record_versions FOR INSERT TO authenticated
  WITH CHECK (changed_by = auth.uid() OR public.has_any_admin_role(auth.uid()));
CREATE POLICY "record_versions_admin_read" ON public.record_versions FOR SELECT TO authenticated
  USING (public.has_any_admin_role(auth.uid()));
CREATE INDEX idx_record_versions_entity ON public.record_versions(entity_type, entity_id);

-- Data quality scores
CREATE TABLE IF NOT EXISTS public.mdm_quality_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  score int NOT NULL DEFAULT 0,
  signals jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id)
);
GRANT SELECT ON public.mdm_quality_scores TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.mdm_quality_scores TO authenticated;
GRANT ALL ON public.mdm_quality_scores TO service_role;
ALTER TABLE public.mdm_quality_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mdm_quality_public_read" ON public.mdm_quality_scores FOR SELECT USING (true);
CREATE POLICY "mdm_quality_admin_write" ON public.mdm_quality_scores FOR ALL TO authenticated
  USING (public.has_any_admin_role(auth.uid())) WITH CHECK (public.has_any_admin_role(auth.uid()));

-- =====================================================================
-- SEED REFERENCE DATA (idempotent)
-- =====================================================================

INSERT INTO public.countries (iso2, iso3, name_fr, name_ar, name_en, phone_code, currency_code, sort_order) VALUES
  ('MA','MAR','Maroc','المغرب','Morocco','+212','MAD',1)
ON CONFLICT (iso2) DO NOTHING;

INSERT INTO public.languages (code, name_fr, name_ar, name_en, native_name, is_rtl, sort_order) VALUES
  ('fr','Français','الفرنسية','French','Français',false,1),
  ('ar','Arabe','العربية','Arabic','العربية',true,2),
  ('en','Anglais','الإنجليزية','English','English',false,3),
  ('tzm','Tamazight','الأمازيغية','Tamazight','ⵜⴰⵎⴰⵣⵉⵖⵜ',false,4)
ON CONFLICT (code) DO NOTHING;

-- 12 Regions of Morocco
INSERT INTO public.regions (name_fr, name_ar, code) VALUES
  ('Tanger-Tétouan-Al Hoceïma','طنجة تطوان الحسيمة','01'),
  ('L''Oriental','الشرق','02'),
  ('Fès-Meknès','فاس مكناس','03'),
  ('Rabat-Salé-Kénitra','الرباط سلا القنيطرة','04'),
  ('Béni Mellal-Khénifra','بني ملال خنيفرة','05'),
  ('Casablanca-Settat','الدار البيضاء سطات','06'),
  ('Marrakech-Safi','مراكش آسفي','07'),
  ('Drâa-Tafilalet','درعة تافيلالت','08'),
  ('Souss-Massa','سوس ماسة','09'),
  ('Guelmim-Oued Noun','كلميم واد نون','10'),
  ('Laâyoune-Sakia El Hamra','العيون الساقية الحمراء','11'),
  ('Dakhla-Oued Ed-Dahab','الداخلة وادي الذهب','12')
ON CONFLICT DO NOTHING;

-- Facility categories
INSERT INTO public.facility_categories (slug, name_fr, name_ar, name_en, sort_order) VALUES
  ('doctor','Médecin','طبيب','Doctor',1),
  ('dentist','Dentiste','طبيب أسنان','Dentist',2),
  ('pharmacy','Pharmacie','صيدلية','Pharmacy',3),
  ('hospital','Hôpital','مستشفى','Hospital',4),
  ('clinic','Clinique','عيادة','Clinic',5),
  ('laboratory','Laboratoire','مختبر','Laboratory',6),
  ('blood_center','Centre de don','مركز التبرع','Blood Center',7)
ON CONFLICT (slug) DO NOTHING;

-- Emergency categories with Moroccan numbers
INSERT INTO public.emergency_categories (slug, name_fr, name_ar, phone_number, color, sort_order) VALUES
  ('samu','SAMU','الإسعاف','141','#ef4444',1),
  ('police','Police','الشرطة','19','#0ea5e9',2),
  ('gendarmerie','Gendarmerie Royale','الدرك الملكي','177','#10b981',3),
  ('civil_protection','Protection Civile','الوقاية المدنية','15','#f59e0b',4),
  ('fire','Pompiers','الإطفاء','15','#dc2626',5)
ON CONFLICT (slug) DO NOTHING;

-- Consultation types
INSERT INTO public.consultation_types (slug, name_fr, name_ar, name_en, default_duration_minutes, sort_order) VALUES
  ('in_person','En cabinet','بالعيادة','In person',30,1),
  ('video','Téléconsultation vidéo','استشارة بالفيديو','Video',30,2),
  ('home','Visite à domicile','زيارة منزلية','Home visit',60,3),
  ('phone','Téléphone','هاتف','Phone',20,4)
ON CONFLICT (slug) DO NOTHING;

-- Pharmacy / laboratory / hospital department categories
INSERT INTO public.pharmacy_categories (slug, name_fr, name_ar, sort_order) VALUES
  ('community','Officine de quartier','صيدلية الحي',1),
  ('hospital','Pharmacie hospitalière','صيدلية المستشفى',2),
  ('on_duty','Pharmacie de garde','صيدلية الحراسة',3)
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.laboratory_categories (slug, name_fr, name_ar, sort_order) VALUES
  ('blood','Analyses sanguines','تحاليل الدم',1),
  ('urine','Analyses urinaires','تحاليل البول',2),
  ('hormones','Hormones','هرمونات',3),
  ('imaging','Imagerie','تصوير',4),
  ('genetics','Génétique','وراثة',5)
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.hospital_departments_catalog (slug, name_fr, name_ar, sort_order) VALUES
  ('emergency','Urgences','المستعجلات',1),
  ('cardiology','Cardiologie','أمراض القلب',2),
  ('pediatrics','Pédiatrie','طب الأطفال',3),
  ('maternity','Maternité','الولادة',4),
  ('icu','Réanimation','الإنعاش',5),
  ('surgery','Chirurgie','الجراحة',6),
  ('radiology','Radiologie','الأشعة',7)
ON CONFLICT (slug) DO NOTHING;

-- Insurance companies (Morocco)
INSERT INTO public.insurance_companies (slug, name_fr, name_ar, short_code, sort_order) VALUES
  ('cnss','CNSS','الصندوق الوطني للضمان الاجتماعي','CNSS',1),
  ('cnops','CNOPS','الصندوق الوطني لمنظمات الاحتياط الاجتماعي','CNOPS',2),
  ('ramed','RAMED / AMO Tadamon','نظام المساعدة الطبية','RAMED',3),
  ('saham','Saham Assurance','سهام للتأمين','SAHAM',4),
  ('wafa','Wafa Assurance','وفا للتأمين','WAFA',5),
  ('axa','AXA Assurance Maroc','أكسا للتأمين','AXA',6),
  ('rma','RMA Watanya','الراء ام ا الوطنية','RMA',7),
  ('mamda','MAMDA','مامدا','MAMDA',8)
ON CONFLICT (slug) DO NOTHING;

-- Permissions
INSERT INTO public.permissions (code, name_fr, category) VALUES
  ('providers.read','Lire les prestataires','providers'),
  ('providers.write','Modifier les prestataires','providers'),
  ('providers.verify','Vérifier les prestataires','providers'),
  ('imports.run','Lancer des imports','imports'),
  ('imports.read','Consulter les imports','imports'),
  ('claims.review','Approuver les revendications','claims'),
  ('edits.review','Approuver les corrections','edits'),
  ('users.manage','Gérer les utilisateurs','users'),
  ('settings.write','Modifier les paramètres','settings')
ON CONFLICT (code) DO NOTHING;

-- Subscription plans
INSERT INTO public.subscription_plans (slug, name_fr, price_mad, billing_cycle, features, sort_order) VALUES
  ('free','Gratuit',0,'monthly','["Profil de base","RDV illimités"]'::jsonb,1),
  ('premium','Premium',299,'monthly','["Mise en avant","Photos illimitées","Support prioritaire"]'::jsonb,2),
  ('enterprise','Entreprise',999,'monthly','["Multi-cabinets","API","Account manager"]'::jsonb,3)
ON CONFLICT (slug) DO NOTHING;
