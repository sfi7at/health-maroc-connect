
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE TABLE public.medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name text NOT NULL,
  dosage text,
  form text,
  presentation text,
  dci text,
  laboratory text,
  therapeutic_class text,
  sub_class text,
  packaging text,
  specification text,
  schedule_table text,
  shelf_life text,
  public_price numeric(10,2),
  indication text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT medications_brand_dci_unique UNIQUE (brand_name, dci)
);

GRANT SELECT ON public.medications TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.medications TO authenticated;
GRANT ALL ON public.medications TO service_role;

ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Medications are publicly viewable when active"
  ON public.medications FOR SELECT
  USING (is_active = true OR public.has_any_admin_role(auth.uid()));

CREATE POLICY "Admins and content managers can insert medications"
  ON public.medications FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'content_manager'));

CREATE POLICY "Admins and content managers can update medications"
  ON public.medications FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'content_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'content_manager'));

CREATE POLICY "Admins can delete medications"
  ON public.medications FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX medications_brand_trgm_idx ON public.medications USING gin (lower(brand_name) extensions.gin_trgm_ops);
CREATE INDEX medications_dci_trgm_idx ON public.medications USING gin (lower(coalesce(dci,'')) extensions.gin_trgm_ops);
CREATE INDEX medications_class_idx ON public.medications (therapeutic_class);
CREATE INDEX medications_sub_class_idx ON public.medications (sub_class);
CREATE INDEX medications_active_idx ON public.medications (is_active);

CREATE TRIGGER medications_set_updated_at
  BEFORE UPDATE ON public.medications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.medications
  (brand_name, dosage, form, presentation, dci, laboratory, therapeutic_class, sub_class, packaging, specification, schedule_table, shelf_life, public_price, indication)
VALUES
  ('Doliprane', '1000 mg', 'Comprimé', 'B/8', 'Paracétamol', 'Sanofi Maroc', 'Antalgiques', 'Antalgiques non opioïdes', 'Blister', 'en ALU/PVC', 'Liste II', '36 mois', 18.50, 'Traitement symptomatique de la douleur et de la fièvre.'),
  ('Efferalgan', '500 mg', 'Comprimé effervescent', 'B/16', 'Paracétamol', 'UPSA Maroc', 'Antalgiques', 'Antalgiques non opioïdes', 'Tube', 'en polypropylène', 'Liste II', '24 mois', 22.00, 'Douleurs légères à modérées et états fébriles.'),
  ('Aspégic', '500 mg', 'Poudre pour solution buvable', 'B/20 sachets', 'Acétylsalicylate de lysine', 'Sanofi Maroc', 'Antalgiques', 'Salicylés', 'Sachet', 'en papier/aluminium', 'Liste II', '36 mois', 25.00, 'Traitement symptomatique des douleurs et de la fièvre.'),
  ('Ibuprofène Mylan', '400 mg', 'Comprimé pelliculé', 'B/30', 'Ibuprofène', 'Mylan Maroc', 'Anti-inflammatoires', 'AINS', 'Blister', 'en ALU/PVC', 'Liste I', '36 mois', 32.00, 'Traitement des douleurs et inflammations.'),
  ('Voltarène', '50 mg', 'Comprimé gastro-résistant', 'B/30', 'Diclofénac sodique', 'Novartis Maroc', 'Anti-inflammatoires', 'AINS', 'Blister', 'en ALU/PVC', 'Liste I', '36 mois', 48.00, 'Rhumatismes inflammatoires, arthrose, lombalgies.'),
  ('Augmentin', '1 g', 'Comprimé pelliculé', 'B/16', 'Amoxicilline + Acide clavulanique', 'GSK Maroc', 'Antibiotiques', 'Bêta-lactamines', 'Blister', 'en ALU/ALU', 'Liste I', '24 mois', 95.00, 'Infections bactériennes des voies respiratoires, ORL, urinaires.'),
  ('Clamoxyl', '500 mg', 'Gélule', 'B/12', 'Amoxicilline', 'GSK Maroc', 'Antibiotiques', 'Bêta-lactamines', 'Blister', 'en ALU/PVC', 'Liste I', '36 mois', 42.00, 'Infections bactériennes sensibles à l''amoxicilline.'),
  ('Zithromax', '500 mg', 'Comprimé pelliculé', 'B/3', 'Azithromycine', 'Pfizer Maroc', 'Antibiotiques', 'Macrolides', 'Blister', 'en ALU/PVC', 'Liste I', '36 mois', 110.00, 'Infections ORL, respiratoires et génitales.'),
  ('Ventoline', '100 µg/dose', 'Solution pour inhalation', 'Flacon 200 doses', 'Salbutamol', 'GSK Maroc', 'Bronchodilatateurs', 'Bêta-2 mimétiques', 'Aérosol doseur', 'en aluminium pressurisé', 'Liste I', '24 mois', 38.00, 'Traitement de la crise d''asthme et bronchospasme.'),
  ('Symbicort Turbuhaler', '160/4.5 µg', 'Poudre pour inhalation', 'B/120 doses', 'Budésonide + Formotérol', 'AstraZeneca', 'Bronchodilatateurs', 'Corticoïdes + Bêta-2', 'Inhalateur', 'plastique', 'Liste I', '24 mois', 285.00, 'Traitement de fond de l''asthme et BPCO.'),
  ('Amlor', '5 mg', 'Gélule', 'B/30', 'Amlodipine', 'Pfizer Maroc', 'Antihypertenseurs', 'Inhibiteurs calciques', 'Blister', 'en ALU/PVC', 'Liste I', '36 mois', 68.00, 'Hypertension artérielle, angine de poitrine.'),
  ('Coversyl', '5 mg', 'Comprimé pelliculé', 'B/30', 'Périndopril', 'Servier Maroc', 'Antihypertenseurs', 'IEC', 'Blister', 'en ALU/ALU', 'Liste I', '36 mois', 92.00, 'Hypertension artérielle, insuffisance cardiaque.'),
  ('Glucophage', '1000 mg', 'Comprimé pelliculé', 'B/30', 'Metformine', 'Merck Maroc', 'Antidiabétiques', 'Biguanides', 'Blister', 'en ALU/PVC', 'Liste I', '60 mois', 45.00, 'Diabète de type 2 chez l''adulte et l''enfant.'),
  ('Diamicron MR', '60 mg', 'Comprimé à libération modifiée', 'B/30', 'Gliclazide', 'Servier Maroc', 'Antidiabétiques', 'Sulfamides hypoglycémiants', 'Blister', 'en ALU/PVC', 'Liste I', '36 mois', 78.00, 'Diabète de type 2.'),
  ('Crestor', '10 mg', 'Comprimé pelliculé', 'B/30', 'Rosuvastatine', 'AstraZeneca', 'Hypolipémiants', 'Statines', 'Blister', 'en ALU/ALU', 'Liste I', '36 mois', 165.00, 'Hypercholestérolémie, prévention cardiovasculaire.'),
  ('Inexium', '40 mg', 'Comprimé gastro-résistant', 'B/28', 'Ésoméprazole', 'AstraZeneca', 'Antiulcéreux', 'IPP', 'Blister', 'en ALU/ALU', 'Liste I', '36 mois', 145.00, 'Reflux gastro-œsophagien, ulcère gastroduodénal.'),
  ('Motilium', '10 mg', 'Comprimé pelliculé', 'B/40', 'Dompéridone', 'Janssen-Cilag', 'Antiémétiques', 'Antagonistes dopaminergiques', 'Blister', 'en ALU/PVC', 'Liste I', '36 mois', 52.00, 'Nausées et vomissements.'),
  ('Smecta', '3 g', 'Poudre pour suspension buvable', 'B/30 sachets', 'Diosmectite', 'Ipsen Pharma', 'Antidiarrhéiques', 'Adsorbants intestinaux', 'Sachet', 'en papier/aluminium', 'Liste II', '36 mois', 38.00, 'Diarrhée aiguë et chronique.'),
  ('Xyzall', '5 mg', 'Comprimé pelliculé', 'B/20', 'Lévocétirizine', 'UCB Pharma', 'Antihistaminiques', 'Anti-H1 de 2e génération', 'Blister', 'en ALU/PVC', 'Liste II', '36 mois', 62.00, 'Rhinite allergique, urticaire chronique.'),
  ('Lexomil', '6 mg', 'Comprimé sécable', 'B/30', 'Bromazépam', 'Roche Maroc', 'Anxiolytiques', 'Benzodiazépines', 'Blister', 'en ALU/PVC', 'Liste I', '60 mois', 28.00, 'Traitement symptomatique de l''anxiété.');
