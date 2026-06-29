
-- =========================================================================
-- HEALTHLINK MAROC — COMPLETE BACKEND
-- =========================================================================

-- ---------- ROLES ----------
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'citizen';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'blood_donor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'doctor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'dentist';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'pharmacist';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'laboratory';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'clinic';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'hospital';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'blood_center';

-- ---------- ENUMS ----------
DO $$ BEGIN
  CREATE TYPE public.provider_category AS ENUM
    ('doctor','dentist','pharmacy','laboratory','clinic','hospital','blood_center');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.blood_group AS ENUM
    ('A+','A-','B+','B-','AB+','AB-','O+','O-');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.blood_request_urgency AS ENUM ('low','normal','high','critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.blood_request_status AS ENUM ('open','fulfilled','expired','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.blood_response_status AS ENUM ('pending','accepted','declined','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.appointment_status AS ENUM
    ('pending','approved','rejected','cancelled','completed','no_show');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.notification_type AS ENUM
    ('push','email','blood_request','appointment','emergency','medical_tip','system');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.article_language AS ENUM ('fr','ar','en');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- COMMON TRIGGER ----------
-- public.set_updated_at() already exists.

-- =========================================================================
-- GEOGRAPHY (MOROCCO)
-- =========================================================================
CREATE TABLE public.regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_fr text NOT NULL,
  name_ar text,
  code text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.regions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.regions TO authenticated;
GRANT ALL ON public.regions TO service_role;
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "regions readable" ON public.regions FOR SELECT USING (true);
CREATE POLICY "regions admin write" ON public.regions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.provinces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id uuid NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  name_fr text NOT NULL,
  name_ar text,
  code text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_provinces_region ON public.provinces(region_id);
GRANT SELECT ON public.provinces TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provinces TO authenticated;
GRANT ALL ON public.provinces TO service_role;
ALTER TABLE public.provinces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "provinces readable" ON public.provinces FOR SELECT USING (true);
CREATE POLICY "provinces admin write" ON public.provinces FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  province_id uuid NOT NULL REFERENCES public.provinces(id) ON DELETE CASCADE,
  name_fr text NOT NULL,
  name_ar text,
  latitude numeric(10,6),
  longitude numeric(10,6),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cities_province ON public.cities(province_id);
GRANT SELECT ON public.cities TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cities TO authenticated;
GRANT ALL ON public.cities TO service_role;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cities readable" ON public.cities FOR SELECT USING (true);
CREATE POLICY "cities admin write" ON public.cities FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.districts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  name_fr text NOT NULL,
  name_ar text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_districts_city ON public.districts(city_id);
GRANT SELECT ON public.districts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.districts TO authenticated;
GRANT ALL ON public.districts TO service_role;
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "districts readable" ON public.districts FOR SELECT USING (true);
CREATE POLICY "districts admin write" ON public.districts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =========================================================================
-- SPECIALTIES
-- =========================================================================
CREATE TABLE public.specialties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name_fr text NOT NULL,
  name_ar text,
  category public.provider_category,
  icon text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.specialties TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.specialties TO authenticated;
GRANT ALL ON public.specialties TO service_role;
ALTER TABLE public.specialties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "specialties readable" ON public.specialties FOR SELECT USING (true);
CREATE POLICY "specialties admin write" ON public.specialties FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =========================================================================
-- PROVIDERS (generic healthcare provider)
-- =========================================================================
CREATE TABLE public.providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  category public.provider_category NOT NULL,
  name text NOT NULL,
  slug text UNIQUE,
  description text,
  address text,
  city_id uuid REFERENCES public.cities(id) ON DELETE SET NULL,
  district_id uuid REFERENCES public.districts(id) ON DELETE SET NULL,
  latitude numeric(10,6),
  longitude numeric(10,6),
  phone text,
  email text,
  website text,
  working_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  profile_image text,
  cover_image text,
  is_verified boolean NOT NULL DEFAULT false,
  is_premium boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  average_rating numeric(3,2) NOT NULL DEFAULT 0,
  reviews_count integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_providers_category ON public.providers(category);
CREATE INDEX idx_providers_city ON public.providers(city_id);
CREATE INDEX idx_providers_owner ON public.providers(owner_id);
CREATE INDEX idx_providers_verified ON public.providers(is_verified) WHERE is_verified;
GRANT SELECT ON public.providers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.providers TO authenticated;
GRANT ALL ON public.providers TO service_role;
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "providers public read" ON public.providers FOR SELECT
  USING (is_active = true OR owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "providers owner insert" ON public.providers FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "providers owner update" ON public.providers FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "providers admin delete" ON public.providers FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_providers_updated BEFORE UPDATE ON public.providers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.provider_specialties (
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  specialty_id uuid NOT NULL REFERENCES public.specialties(id) ON DELETE CASCADE,
  PRIMARY KEY (provider_id, specialty_id)
);
GRANT SELECT ON public.provider_specialties TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_specialties TO authenticated;
GRANT ALL ON public.provider_specialties TO service_role;
ALTER TABLE public.provider_specialties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ps readable" ON public.provider_specialties FOR SELECT USING (true);
CREATE POLICY "ps owner manage" ON public.provider_specialties FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.providers p WHERE p.id = provider_id
            AND (p.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin')))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.providers p WHERE p.id = provider_id
            AND (p.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin')))
  );

-- Provider ownership helper (security definer)
CREATE OR REPLACE FUNCTION public.owns_provider(_user_id uuid, _provider_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.providers WHERE id = _provider_id AND owner_id = _user_id);
$$;

-- =========================================================================
-- BLOOD DONATION
-- =========================================================================
CREATE TABLE public.blood_donors (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  blood_group public.blood_group NOT NULL,
  birth_date date,
  weight_kg numeric(5,2),
  city_id uuid REFERENCES public.cities(id) ON DELETE SET NULL,
  contact_phone text,                -- private
  contact_email text,                -- private
  is_available boolean NOT NULL DEFAULT true,
  last_donation_at date,
  total_donations integer NOT NULL DEFAULT 0,
  notes text,
  notify_push boolean NOT NULL DEFAULT true,
  notify_email boolean NOT NULL DEFAULT true,
  notify_sms boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_blood_donors_group_city ON public.blood_donors(blood_group, city_id) WHERE is_available;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blood_donors TO authenticated;
GRANT ALL ON public.blood_donors TO service_role;
ALTER TABLE public.blood_donors ENABLE ROW LEVEL SECURITY;
-- Donors can read their own row; admins read all; others can't read private contact info via this table
CREATE POLICY "donor self read" ON public.blood_donors FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "donor self insert" ON public.blood_donors FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "donor self update" ON public.blood_donors FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "donor self delete" ON public.blood_donors FOR DELETE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_blood_donors_updated BEFORE UPDATE ON public.blood_donors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Public-safe view of donors (no contact details)
CREATE OR REPLACE VIEW public.blood_donors_public AS
  SELECT id, blood_group, city_id, is_available, last_donation_at, total_donations, created_at
  FROM public.blood_donors
  WHERE is_available = true;
GRANT SELECT ON public.blood_donors_public TO anon, authenticated;

CREATE TABLE public.blood_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_name text NOT NULL,
  blood_group public.blood_group NOT NULL,
  units_needed integer NOT NULL DEFAULT 1 CHECK (units_needed > 0),
  hospital_name text,
  city_id uuid REFERENCES public.cities(id) ON DELETE SET NULL,
  address text,
  contact_phone text NOT NULL,
  urgency public.blood_request_urgency NOT NULL DEFAULT 'normal',
  status public.blood_request_status NOT NULL DEFAULT 'open',
  notes text,
  needed_by timestamptz,
  is_emergency boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_blood_requests_status ON public.blood_requests(status, blood_group, city_id);
GRANT SELECT ON public.blood_requests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blood_requests TO authenticated;
GRANT ALL ON public.blood_requests TO service_role;
ALTER TABLE public.blood_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blood requests readable" ON public.blood_requests FOR SELECT USING (true);
CREATE POLICY "blood requests insert auth" ON public.blood_requests FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid());
CREATE POLICY "blood requests owner update" ON public.blood_requests FOR UPDATE TO authenticated
  USING (requester_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (requester_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "blood requests owner delete" ON public.blood_requests FOR DELETE TO authenticated
  USING (requester_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_blood_requests_updated BEFORE UPDATE ON public.blood_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.blood_request_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.blood_requests(id) ON DELETE CASCADE,
  donor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.blood_response_status NOT NULL DEFAULT 'pending',
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, donor_id)
);
CREATE INDEX idx_brr_request ON public.blood_request_responses(request_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blood_request_responses TO authenticated;
GRANT ALL ON public.blood_request_responses TO service_role;
ALTER TABLE public.blood_request_responses ENABLE ROW LEVEL SECURITY;
-- A donor sees only their own responses; requester sees responses on their request; admin sees all.
CREATE POLICY "brr visible" ON public.blood_request_responses FOR SELECT TO authenticated USING (
  donor_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.blood_requests br WHERE br.id = request_id AND br.requester_id = auth.uid())
  OR public.has_role(auth.uid(),'admin')
);
CREATE POLICY "brr donor insert" ON public.blood_request_responses FOR INSERT TO authenticated
  WITH CHECK (donor_id = auth.uid());
CREATE POLICY "brr donor or requester update" ON public.blood_request_responses FOR UPDATE TO authenticated
  USING (
    donor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.blood_requests br WHERE br.id = request_id AND br.requester_id = auth.uid())
    OR public.has_role(auth.uid(),'admin')
  )
  WITH CHECK (
    donor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.blood_requests br WHERE br.id = request_id AND br.requester_id = auth.uid())
    OR public.has_role(auth.uid(),'admin')
  );
CREATE TRIGGER trg_brr_updated BEFORE UPDATE ON public.blood_request_responses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.donation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  donated_at date NOT NULL,
  location text,
  city_id uuid REFERENCES public.cities(id) ON DELETE SET NULL,
  blood_center_id uuid REFERENCES public.providers(id) ON DELETE SET NULL,
  units integer NOT NULL DEFAULT 1 CHECK (units > 0),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_donation_history_donor ON public.donation_history(donor_id, donated_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.donation_history TO authenticated;
GRANT ALL ON public.donation_history TO service_role;
ALTER TABLE public.donation_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "donation history self" ON public.donation_history FOR ALL TO authenticated
  USING (donor_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (donor_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- Blood compatibility reference
CREATE TABLE public.blood_compatibility (
  donor public.blood_group NOT NULL,
  recipient public.blood_group NOT NULL,
  PRIMARY KEY (donor, recipient)
);
GRANT SELECT ON public.blood_compatibility TO anon, authenticated;
GRANT ALL ON public.blood_compatibility TO service_role;
ALTER TABLE public.blood_compatibility ENABLE ROW LEVEL SECURITY;
CREATE POLICY "compat readable" ON public.blood_compatibility FOR SELECT USING (true);
CREATE POLICY "compat admin write" ON public.blood_compatibility FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Seed compatibility matrix (reference data, not healthcare records)
INSERT INTO public.blood_compatibility (donor, recipient) VALUES
('O-','O-'),('O-','O+'),('O-','A-'),('O-','A+'),('O-','B-'),('O-','B+'),('O-','AB-'),('O-','AB+'),
('O+','O+'),('O+','A+'),('O+','B+'),('O+','AB+'),
('A-','A-'),('A-','A+'),('A-','AB-'),('A-','AB+'),
('A+','A+'),('A+','AB+'),
('B-','B-'),('B-','B+'),('B-','AB-'),('B-','AB+'),
('B+','B+'),('B+','AB+'),
('AB-','AB-'),('AB-','AB+'),
('AB+','AB+');

-- =========================================================================
-- MEDICAL PROFILE
-- =========================================================================
CREATE TABLE public.medical_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  blood_group public.blood_group,
  height_cm numeric(5,2),
  weight_kg numeric(5,2),
  date_of_birth date,
  gender text,
  chronic_conditions text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medical_profiles TO authenticated;
GRANT ALL ON public.medical_profiles TO service_role;
ALTER TABLE public.medical_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mp self" ON public.medical_profiles FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_mp_updated BEFORE UPDATE ON public.medical_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.allergies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  severity text,
  reaction text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_allergies_user ON public.allergies(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.allergies TO authenticated;
GRANT ALL ON public.allergies TO service_role;
ALTER TABLE public.allergies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allergies self" ON public.allergies FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.vaccinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  dose text,
  vaccinated_at date,
  next_due_at date,
  provider text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_vacc_user ON public.vaccinations(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vaccinations TO authenticated;
GRANT ALL ON public.vaccinations TO service_role;
ALTER TABLE public.vaccinations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vacc self" ON public.vaccinations FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.medical_conditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  diagnosed_at date,
  status text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_mc_user ON public.medical_conditions(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medical_conditions TO authenticated;
GRANT ALL ON public.medical_conditions TO service_role;
ALTER TABLE public.medical_conditions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mc self" ON public.medical_conditions FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  relation text,
  phone text NOT NULL,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ec_user ON public.emergency_contacts(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emergency_contacts TO authenticated;
GRANT ALL ON public.emergency_contacts TO service_role;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ec self" ON public.emergency_contacts FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.medical_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  storage_path text NOT NULL,
  mime_type text,
  size_bytes bigint,
  category text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_md_user ON public.medical_documents(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medical_documents TO authenticated;
GRANT ALL ON public.medical_documents TO service_role;
ALTER TABLE public.medical_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "md self" ON public.medical_documents FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prescribed_by uuid REFERENCES public.providers(id) ON DELETE SET NULL,
  prescribed_at date NOT NULL DEFAULT CURRENT_DATE,
  medication text NOT NULL,
  dosage text,
  frequency text,
  duration text,
  notes text,
  storage_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rx_user ON public.prescriptions(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prescriptions TO authenticated;
GRANT ALL ON public.prescriptions TO service_role;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rx self" ON public.prescriptions FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.medical_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES public.providers(id) ON DELETE SET NULL,
  title text NOT NULL,
  report_date date,
  summary text,
  storage_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_mr_user ON public.medical_reports(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medical_reports TO authenticated;
GRANT ALL ON public.medical_reports TO service_role;
ALTER TABLE public.medical_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mr self" ON public.medical_reports FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- =========================================================================
-- FAVORITES
-- =========================================================================
CREATE TABLE public.favorites (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, provider_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "favorites self" ON public.favorites FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- =========================================================================
-- REVIEWS
-- =========================================================================
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  photos text[] NOT NULL DEFAULT '{}',
  provider_response text,
  provider_response_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_id, author_id)
);
CREATE INDEX idx_reviews_provider ON public.reviews(provider_id);
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews readable" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "reviews author insert" ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());
CREATE POLICY "reviews author or provider update" ON public.reviews FOR UPDATE TO authenticated
  USING (
    author_id = auth.uid()
    OR public.owns_provider(auth.uid(), provider_id)
    OR public.has_role(auth.uid(),'admin')
  )
  WITH CHECK (
    author_id = auth.uid()
    OR public.owns_provider(auth.uid(), provider_id)
    OR public.has_role(auth.uid(),'admin')
  );
CREATE POLICY "reviews author delete" ON public.reviews FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_reviews_updated BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- APPOINTMENTS
-- =========================================================================
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  scheduled_for timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 30,
  reason text,
  status public.appointment_status NOT NULL DEFAULT 'pending',
  notes text,
  cancelled_reason text,
  reminder_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_appt_patient ON public.appointments(patient_id, scheduled_for DESC);
CREATE INDEX idx_appt_provider ON public.appointments(provider_id, scheduled_for DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "appt visible" ON public.appointments FOR SELECT TO authenticated
  USING (
    patient_id = auth.uid()
    OR public.owns_provider(auth.uid(), provider_id)
    OR public.has_role(auth.uid(),'admin')
  );
CREATE POLICY "appt patient insert" ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (patient_id = auth.uid());
CREATE POLICY "appt update" ON public.appointments FOR UPDATE TO authenticated
  USING (
    patient_id = auth.uid()
    OR public.owns_provider(auth.uid(), provider_id)
    OR public.has_role(auth.uid(),'admin')
  )
  WITH CHECK (
    patient_id = auth.uid()
    OR public.owns_provider(auth.uid(), provider_id)
    OR public.has_role(auth.uid(),'admin')
  );
CREATE POLICY "appt delete" ON public.appointments FOR DELETE TO authenticated
  USING (
    patient_id = auth.uid()
    OR public.owns_provider(auth.uid(), provider_id)
    OR public.has_role(auth.uid(),'admin')
  );
CREATE TRIGGER trg_appt_updated BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- PHARMACIES ON DUTY
-- =========================================================================
CREATE TABLE public.pharmacies_on_duty (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  city_id uuid NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  province_id uuid REFERENCES public.provinces(id) ON DELETE SET NULL,
  duty_date date NOT NULL,
  day_shift boolean NOT NULL DEFAULT false,
  night_shift boolean NOT NULL DEFAULT false,
  is_emergency boolean NOT NULL DEFAULT false,
  is_verified boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_id, duty_date)
);
CREATE INDEX idx_pod_city_date ON public.pharmacies_on_duty(city_id, duty_date);
GRANT SELECT ON public.pharmacies_on_duty TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacies_on_duty TO authenticated;
GRANT ALL ON public.pharmacies_on_duty TO service_role;
ALTER TABLE public.pharmacies_on_duty ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pod readable" ON public.pharmacies_on_duty FOR SELECT USING (true);
CREATE POLICY "pod owner or admin write" ON public.pharmacies_on_duty FOR ALL TO authenticated
  USING (public.owns_provider(auth.uid(), provider_id) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.owns_provider(auth.uid(), provider_id) OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_pod_updated BEFORE UPDATE ON public.pharmacies_on_duty
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- ARTICLES (Health News)
-- =========================================================================
CREATE TABLE public.articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  content text,
  cover_image text,
  category text,
  tags text[] NOT NULL DEFAULT '{}',
  language public.article_language NOT NULL DEFAULT 'fr',
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text,
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_articles_pub ON public.articles(is_published, published_at DESC);
GRANT SELECT ON public.articles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.articles TO authenticated;
GRANT ALL ON public.articles TO service_role;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "articles public read" ON public.articles FOR SELECT
  USING (is_published = true OR author_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "articles admin or author write" ON public.articles FOR ALL TO authenticated
  USING (author_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (author_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_articles_updated BEFORE UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- NOTIFICATIONS
-- =========================================================================
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.notification_type NOT NULL DEFAULT 'system',
  title text NOT NULL,
  body text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notif_user ON public.notifications(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif self read" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "notif self update" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notif self delete" ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "notif admin insert" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  push_enabled boolean NOT NULL DEFAULT true,
  email_enabled boolean NOT NULL DEFAULT true,
  sms_enabled boolean NOT NULL DEFAULT false,
  blood_requests boolean NOT NULL DEFAULT true,
  appointments boolean NOT NULL DEFAULT true,
  emergencies boolean NOT NULL DEFAULT true,
  medical_tips boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "np self" ON public.notification_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_np_updated BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- ADMIN AUDIT LOG
-- =========================================================================
CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_created ON public.admin_audit_log(created_at DESC);
GRANT SELECT, INSERT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit admin read" ON public.admin_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "audit admin insert" ON public.admin_audit_log FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =========================================================================
-- REALTIME
-- =========================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.blood_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.blood_request_responses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
