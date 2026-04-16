-- ============================================================
-- GrantKit — Supabase Migration (v1)
-- Run this in Supabase SQL Editor (or via supabase db push).
-- Self-contained: extensions → tables → indexes → triggers → RLS → views → seed.
-- ============================================================

-- ─── Extensions ──────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─── Tables ──────────────────────────────────────────────────────────────────

-- Country lookup
CREATE TABLE IF NOT EXISTS countries (
  code       TEXT PRIMARY KEY,                -- ISO 3166-1 alpha-2
  name       TEXT NOT NULL,                   -- English name
  name_ka    TEXT,                            -- Georgian name
  name_fr    TEXT,
  name_es    TEXT,
  name_ru    TEXT,
  group_code TEXT                             -- 'US', 'UK', 'EU'
);

-- States / nations / provinces
CREATE TABLE IF NOT EXISTS regions (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT    NOT NULL REFERENCES countries(code),
  name         TEXT    NOT NULL,
  name_ka      TEXT
);

-- Hierarchical category tree (dot-notation IDs)
CREATE TABLE IF NOT EXISTS categories (
  id            TEXT    PRIMARY KEY,          -- e.g. 'GRANT.STARTUP'
  parent_id     TEXT    REFERENCES categories(id),
  resource_type TEXT    NOT NULL,             -- 'GRANT', 'SOCIAL', 'MEDICAL'
  name          TEXT    NOT NULL,
  name_ka       TEXT,
  name_fr       TEXT,
  name_es       TEXT,
  name_ru       TEXT,
  icon          TEXT,
  sort_order    INTEGER DEFAULT 0,
  is_active     BOOLEAN DEFAULT true
);

-- Main resources table
CREATE TABLE IF NOT EXISTS resources (
  id                   UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type        TEXT           NOT NULL CHECK (resource_type IN ('GRANT','SOCIAL','MEDICAL')),
  title                TEXT           NOT NULL,
  title_ka             TEXT,
  title_fr             TEXT,
  title_es             TEXT,
  title_ru             TEXT,
  slug                 TEXT           UNIQUE NOT NULL,
  description          TEXT           NOT NULL,
  description_ka       TEXT,
  description_fr       TEXT,
  description_es       TEXT,
  description_ru       TEXT,
  amount_min           INTEGER,                   -- in cents
  amount_max           INTEGER,                   -- in cents
  currency             TEXT           DEFAULT 'USD',
  deadline             TIMESTAMPTZ,
  start_date           TIMESTAMPTZ,
  end_date             TIMESTAMPTZ,
  is_rolling           BOOLEAN        DEFAULT false,
  status               TEXT           NOT NULL DEFAULT 'OPEN'
                         CHECK (status IN ('OPEN','CLOSED','UPCOMING','ONGOING','ARCHIVED')),
  eligibility          TEXT           NOT NULL DEFAULT 'INDIVIDUAL'
                         CHECK (eligibility IN ('INDIVIDUAL','ORGANIZATION','BOTH')),
  eligibility_details  TEXT,
  target_groups        TEXT[]         DEFAULT '{}',
  latitude             DOUBLE PRECISION,
  longitude            DOUBLE PRECISION,
  location_point       GEOGRAPHY(POINT, 4326),
  address              TEXT,
  clinical_trial_phase TEXT
                         CHECK (clinical_trial_phase IN ('PHASE_1','PHASE_2','PHASE_3','PHASE_4')),
  nct_id               TEXT,
  disease_areas        TEXT[]         DEFAULT '{}',
  source_url           TEXT,
  source_name          TEXT,
  application_url      TEXT,
  is_verified          BOOLEAN        DEFAULT false,
  is_featured          BOOLEAN        DEFAULT false,
  view_count           INTEGER        DEFAULT 0,
  created_at           TIMESTAMPTZ    DEFAULT NOW(),
  updated_at           TIMESTAMPTZ    DEFAULT NOW(),
  published_at         TIMESTAMPTZ,
  search_vector        TSVECTOR
);

-- Many-to-many: resource ↔ category
CREATE TABLE IF NOT EXISTS resource_categories (
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
  category_id TEXT REFERENCES categories(id) ON DELETE CASCADE,
  is_primary  BOOLEAN DEFAULT false,
  PRIMARY KEY (resource_id, category_id)
);

-- Many-to-many: resource ↔ location (country + optional region)
CREATE TABLE IF NOT EXISTS resource_locations (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id  UUID    REFERENCES resources(id) ON DELETE CASCADE,
  country_code TEXT    REFERENCES countries(code),
  region_id    UUID    REFERENCES regions(id),
  is_nationwide BOOLEAN DEFAULT false
);

-- Contact information
CREATE TABLE IF NOT EXISTS resource_contacts (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id  UUID    REFERENCES resources(id) ON DELETE CASCADE,
  contact_type TEXT    NOT NULL CHECK (contact_type IN ('email','phone','website','address')),
  value        TEXT    NOT NULL,
  label        TEXT
);

-- Admin action log
CREATE TABLE IF NOT EXISTS admin_logs (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  action      TEXT    NOT NULL,
  resource_id UUID,
  details     JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Bulk-import log
CREATE TABLE IF NOT EXISTS import_logs (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  filename      TEXT    NOT NULL,
  total_rows    INTEGER,
  success_count INTEGER,
  error_count   INTEGER,
  errors        JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_resources_type   ON resources (resource_type);
CREATE INDEX IF NOT EXISTS idx_resources_status ON resources (status);
CREATE INDEX IF NOT EXISTS idx_resources_deadline ON resources (deadline);
CREATE INDEX IF NOT EXISTS idx_resources_amount_min ON resources (amount_min);
CREATE INDEX IF NOT EXISTS idx_resources_amount_max ON resources (amount_max);
CREATE INDEX IF NOT EXISTS idx_resources_search_vector ON resources USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_resources_title_trgm ON resources USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_resources_location_point ON resources USING GIST (location_point);
CREATE INDEX IF NOT EXISTS idx_resources_type_status_deadline ON resources (resource_type, status, deadline);
CREATE INDEX IF NOT EXISTS idx_resources_type_status_featured ON resources (resource_type, status, is_featured);
CREATE INDEX IF NOT EXISTS idx_resource_categories_resource ON resource_categories (resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_categories_category ON resource_categories (category_id);
CREATE INDEX IF NOT EXISTS idx_resource_locations_resource  ON resource_locations (resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_locations_country   ON resource_locations (country_code);
CREATE INDEX IF NOT EXISTS idx_regions_country ON regions (country_code);

-- ─── Triggers ────────────────────────────────────────────────────────────────

-- 1. updated_at auto-set
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_resources_updated_at ON resources;
CREATE TRIGGER trg_resources_updated_at
  BEFORE UPDATE ON resources
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 2. search_vector auto-generate (weighted multi-language)
CREATE OR REPLACE FUNCTION trigger_resources_search_vector()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', COALESCE(NEW.title,    '') || ' ' ||
                                     COALESCE(NEW.title_ka, '') || ' ' ||
                                     COALESCE(NEW.title_fr, '') || ' ' ||
                                     COALESCE(NEW.title_es, '') || ' ' ||
                                     COALESCE(NEW.title_ru, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.description,    '') || ' ' ||
                                     COALESCE(NEW.description_ka, '') || ' ' ||
                                     COALESCE(NEW.description_fr, '') || ' ' ||
                                     COALESCE(NEW.description_es, '') || ' ' ||
                                     COALESCE(NEW.description_ru, '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(NEW.source_name, '') || ' ' ||
                                     COALESCE(NEW.address,    '')), 'C');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_resources_search_vector ON resources;
CREATE TRIGGER trg_resources_search_vector
  BEFORE INSERT OR UPDATE ON resources
  FOR EACH ROW EXECUTE FUNCTION trigger_resources_search_vector();

-- 3. location_point auto-generate from lat/lng
CREATE OR REPLACE FUNCTION trigger_resources_location_point()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location_point := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::GEOGRAPHY;
  ELSE
    NEW.location_point := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_resources_location_point ON resources;
CREATE TRIGGER trg_resources_location_point
  BEFORE INSERT OR UPDATE OF latitude, longitude ON resources
  FOR EACH ROW EXECUTE FUNCTION trigger_resources_location_point();

-- 4. slug auto-generate (only if slug is empty/null on INSERT)
CREATE OR REPLACE FUNCTION trigger_resources_slug()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  base_slug TEXT;
  candidate TEXT;
  suffix    TEXT;
  counter   INT := 0;
BEGIN
  IF NEW.slug IS NOT NULL AND NEW.slug <> '' THEN
    RETURN NEW;
  END IF;

  base_slug := lower(NEW.title);
  base_slug := regexp_replace(base_slug, '[^a-z0-9\s-]', '', 'g');
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  base_slug := left(base_slug, 80);

  candidate := base_slug;
  WHILE EXISTS (SELECT 1 FROM resources WHERE slug = candidate) LOOP
    counter   := counter + 1;
    suffix    := substr(md5(random()::text), 1, 6);
    candidate := base_slug || '-' || suffix;
  END LOOP;

  NEW.slug := candidate;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_resources_slug ON resources;
CREATE TRIGGER trg_resources_slug
  BEFORE INSERT ON resources
  FOR EACH ROW EXECUTE FUNCTION trigger_resources_slug();

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE resources          ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_locations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_contacts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories          ENABLE ROW LEVEL SECURITY;
ALTER TABLE countries           ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_logs         ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY IF NOT EXISTS "public_read_resources" ON resources
  FOR SELECT USING (published_at IS NOT NULL AND status <> 'ARCHIVED');

CREATE POLICY IF NOT EXISTS "public_read_resource_categories" ON resource_categories
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "public_read_resource_locations" ON resource_locations
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "public_read_resource_contacts" ON resource_contacts
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "public_read_categories" ON categories
  FOR SELECT USING (is_active = true);

CREATE POLICY IF NOT EXISTS "public_read_countries" ON countries
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "public_read_regions" ON regions
  FOR SELECT USING (true);

-- Service role (admin) bypass — full access
CREATE POLICY IF NOT EXISTS "service_role_all_resources" ON resources
  FOR ALL USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "service_role_all_resource_categories" ON resource_categories
  FOR ALL USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "service_role_all_resource_locations" ON resource_locations
  FOR ALL USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "service_role_all_resource_contacts" ON resource_contacts
  FOR ALL USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "service_role_all_categories" ON categories
  FOR ALL USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "service_role_all_countries" ON countries
  FOR ALL USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "service_role_all_regions" ON regions
  FOR ALL USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "service_role_all_admin_logs" ON admin_logs
  FOR ALL USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "service_role_all_import_logs" ON import_logs
  FOR ALL USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');

-- ─── Views ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW resources_full AS
SELECT
  r.*,
  COALESCE(
    (
      SELECT json_agg(json_build_object(
        'id',         c.id,
        'name',       c.name,
        'name_ka',    c.name_ka,
        'name_fr',    c.name_fr,
        'name_es',    c.name_es,
        'name_ru',    c.name_ru,
        'icon',       c.icon,
        'is_primary', rc.is_primary
      ) ORDER BY rc.is_primary DESC, c.sort_order)
      FROM resource_categories rc
      JOIN categories c ON c.id = rc.category_id
      WHERE rc.resource_id = r.id
    ), '[]'::json
  ) AS categories,
  COALESCE(
    (
      SELECT json_agg(json_build_object(
        'country_code',    rl.country_code,
        'country_name',    co.name,
        'country_name_ka', co.name_ka,
        'region_id',       rl.region_id,
        'region_name',     rg.name,
        'is_nationwide',   rl.is_nationwide
      ))
      FROM resource_locations rl
      LEFT JOIN countries co ON co.code = rl.country_code
      LEFT JOIN regions   rg ON rg.id   = rl.region_id
      WHERE rl.resource_id = r.id
    ), '[]'::json
  ) AS locations
FROM resources r;

CREATE OR REPLACE VIEW resource_stats AS
SELECT
  resource_type,
  status,
  COUNT(*) AS count
FROM resources
WHERE published_at IS NOT NULL AND status <> 'ARCHIVED'
GROUP BY resource_type, status;

-- ─── Seed: Countries ─────────────────────────────────────────────────────────

INSERT INTO countries (code, name, name_ka, group_code) VALUES
  ('US', 'United States',  'აშშ',            'US'),
  ('GB', 'United Kingdom', 'გაერთიანებული სამეფო', 'UK'),
  ('EU', 'European Union', 'ევროკავშირი',     'EU'),
  ('DE', 'Germany',        'გერმანია',        'EU'),
  ('FR', 'France',         'საფრანგეთი',      'EU'),
  ('IT', 'Italy',          'იტალია',          'EU'),
  ('ES', 'Spain',          'ესპანეთი',        'EU'),
  ('NL', 'Netherlands',    'ნიდერლანდი',      'EU'),
  ('BE', 'Belgium',        'ბელგია',          'EU'),
  ('AT', 'Austria',        'ავსტრია',         'EU'),
  ('IE', 'Ireland',        'ირლანდია',        'EU'),
  ('PT', 'Portugal',       'პორტუგალია',      'EU'),
  ('SE', 'Sweden',         'შვედეთი',         'EU'),
  ('DK', 'Denmark',        'დანია',           'EU'),
  ('FI', 'Finland',        'ფინეთი',          'EU'),
  ('PL', 'Poland',         'პოლონეთი',        'EU'),
  ('CZ', 'Czech Republic', 'ჩეხეთი',          'EU')
ON CONFLICT (code) DO NOTHING;

-- ─── Seed: Regions (US States + DC + PR, UK Nations, EU-Wide) ────────────────

-- US States
INSERT INTO regions (country_code, name) VALUES
  ('US', 'Alabama'),       ('US', 'Alaska'),       ('US', 'Arizona'),
  ('US', 'Arkansas'),      ('US', 'California'),   ('US', 'Colorado'),
  ('US', 'Connecticut'),   ('US', 'Delaware'),      ('US', 'Florida'),
  ('US', 'Georgia'),       ('US', 'Hawaii'),        ('US', 'Idaho'),
  ('US', 'Illinois'),      ('US', 'Indiana'),       ('US', 'Iowa'),
  ('US', 'Kansas'),        ('US', 'Kentucky'),      ('US', 'Louisiana'),
  ('US', 'Maine'),         ('US', 'Maryland'),      ('US', 'Massachusetts'),
  ('US', 'Michigan'),      ('US', 'Minnesota'),     ('US', 'Mississippi'),
  ('US', 'Missouri'),      ('US', 'Montana'),       ('US', 'Nebraska'),
  ('US', 'Nevada'),        ('US', 'New Hampshire'), ('US', 'New Jersey'),
  ('US', 'New Mexico'),    ('US', 'New York'),      ('US', 'North Carolina'),
  ('US', 'North Dakota'),  ('US', 'Ohio'),          ('US', 'Oklahoma'),
  ('US', 'Oregon'),        ('US', 'Pennsylvania'),  ('US', 'Rhode Island'),
  ('US', 'South Carolina'),('US', 'South Dakota'),  ('US', 'Tennessee'),
  ('US', 'Texas'),         ('US', 'Utah'),          ('US', 'Vermont'),
  ('US', 'Virginia'),      ('US', 'Washington'),    ('US', 'West Virginia'),
  ('US', 'Wisconsin'),     ('US', 'Wyoming'),       ('US', 'District of Columbia'),
  ('US', 'Puerto Rico')
ON CONFLICT DO NOTHING;

-- UK Nations
INSERT INTO regions (country_code, name) VALUES
  ('GB', 'England'), ('GB', 'Scotland'), ('GB', 'Wales'), ('GB', 'Northern Ireland')
ON CONFLICT DO NOTHING;

-- EU-Wide regions (one per EU country)
INSERT INTO regions (country_code, name) VALUES
  ('EU', 'EU-Wide'),   ('DE', 'DE-Wide'), ('FR', 'FR-Wide'),
  ('IT', 'IT-Wide'),   ('ES', 'ES-Wide'), ('NL', 'NL-Wide'),
  ('BE', 'BE-Wide'),   ('AT', 'AT-Wide'), ('IE', 'IE-Wide'),
  ('PT', 'PT-Wide'),   ('SE', 'SE-Wide'), ('DK', 'DK-Wide'),
  ('FI', 'FI-Wide'),   ('PL', 'PL-Wide'), ('CZ', 'CZ-Wide')
ON CONFLICT DO NOTHING;

-- ─── Seed: Categories ────────────────────────────────────────────────────────

-- GRANT categories
INSERT INTO categories (id, parent_id, resource_type, name, name_ka, icon, sort_order) VALUES
  ('GRANT',              NULL,    'GRANT', 'Grants',              'გრანტები',            '💰', 0),
  ('GRANT.STARTUP',      'GRANT', 'GRANT', 'Startup Grants',      'სტარტაპ გრანტები',   '🚀', 1),
  ('GRANT.RESEARCH',     'GRANT', 'GRANT', 'Research Grants',     'კვლევითი გრანტები',  '🔬', 2),
  ('GRANT.EDUCATION',    'GRANT', 'GRANT', 'Education Grants',    'საგანმანათლებლო',    '🎓', 3),
  ('GRANT.MEDICAL',      'GRANT', 'GRANT', 'Medical Grants',      'სამედიცინო გრანტები','🏥', 4),
  ('GRANT.DISABILITY',   'GRANT', 'GRANT', 'Disability Grants',   'შეზღუდული შესაძ.',   '♿', 5),
  ('GRANT.PEDIATRIC',    'GRANT', 'GRANT', 'Pediatric Grants',    'პედიატრიული',        '👶', 6),
  ('GRANT.RARE_DISEASE', 'GRANT', 'GRANT', 'Rare Disease Grants', 'იშვიათი დაავადება',  '🧬', 7),
  ('GRANT.INNOVATION',   'GRANT', 'GRANT', 'Innovation Grants',   'ინოვაცია',           '💡', 8),
  ('GRANT.ARTS',         'GRANT', 'GRANT', 'Arts & Culture',      'ხელოვნება',          '🎨', 9),
  ('GRANT.COMMUNITY',    'GRANT', 'GRANT', 'Community Grants',    'საზოგადოებრივი',     '🤝', 10),
  ('GRANT.AGRICULTURE',  'GRANT', 'GRANT', 'Agriculture',         'სოფლის მეურნეობა',   '🌾', 11),
  ('GRANT.ENVIRONMENT',  'GRANT', 'GRANT', 'Environment',         'გარემოს დაცვა',      '🌍', 12),
  ('GRANT.WOMEN',        'GRANT', 'GRANT', 'Women''s Grants',     'ქალთა გრანტები',     '👩', 13),
  ('GRANT.MINORITY',     'GRANT', 'GRANT', 'Minority Grants',     'უმცირესობები',       '🌈', 14),
  ('GRANT.EMERGENCY',    'GRANT', 'GRANT', 'Emergency Grants',    'გადაუდებელი',        '🆘', 15)
ON CONFLICT (id) DO NOTHING;

-- SOCIAL categories (hierarchical)
INSERT INTO categories (id, parent_id, resource_type, name, name_ka, icon, sort_order) VALUES
  ('SOCIAL',                      NULL,             'SOCIAL', 'Social Assistance',    'სოციალური დახმარება',  '🏠', 0),
  ('SOCIAL.HOUSING',              'SOCIAL',         'SOCIAL', 'Housing',              'საცხოვრისი',           '🏘️', 1),
  ('SOCIAL.HOUSING.RENTAL',       'SOCIAL.HOUSING', 'SOCIAL', 'Rental Assistance',   'ქირის დახმარება',      '🔑', 2),
  ('SOCIAL.HOUSING.SHELTER',      'SOCIAL.HOUSING', 'SOCIAL', 'Shelters',            'თავშესაფარი',          '🛏️', 3),
  ('SOCIAL.HOUSING.TRANSITIONAL', 'SOCIAL.HOUSING', 'SOCIAL', 'Transitional Housing','გარდამავალი საცხ.',    '🏗️', 4),
  ('SOCIAL.HOUSING.REPAIR',       'SOCIAL.HOUSING', 'SOCIAL', 'Home Repair',         'სახლის რემონტი',       '🔧', 5),
  ('SOCIAL.FOOD',                 'SOCIAL',         'SOCIAL', 'Food Assistance',      'სასურსათო დახმარება',  '🍽️', 6),
  ('SOCIAL.FOOD.BANK',            'SOCIAL.FOOD',    'SOCIAL', 'Food Banks',          'სასურსათო ბანკი',      '📦', 7),
  ('SOCIAL.FOOD.MEAL',            'SOCIAL.FOOD',    'SOCIAL', 'Meal Programs',       'კვების პროგრამა',      '🥘', 8),
  ('SOCIAL.FOOD.SNAP',            'SOCIAL.FOOD',    'SOCIAL', 'SNAP/EBT',            'SNAP/EBT',             '🏷️', 9),
  ('SOCIAL.FOOD.NUTRITION',       'SOCIAL.FOOD',    'SOCIAL', 'Nutrition Programs',  'კვების პროგრამა',      '🥗', 10),
  ('SOCIAL.FINANCIAL',            'SOCIAL',         'SOCIAL', 'Financial Assistance', 'ფინანსური დახმარება',  '💵', 11),
  ('SOCIAL.FINANCIAL.UTILITY',    'SOCIAL.FINANCIAL','SOCIAL','Utility Assistance',  'კომუნალური',           '⚡', 12),
  ('SOCIAL.FINANCIAL.CASH',       'SOCIAL.FINANCIAL','SOCIAL','Cash Assistance',     'ფულადი დახმარება',     '💳', 13),
  ('SOCIAL.FINANCIAL.DEBT',       'SOCIAL.FINANCIAL','SOCIAL','Debt Relief',         'ვალის რელიფი',         '📉', 14),
  ('SOCIAL.LEGAL',                'SOCIAL',         'SOCIAL', 'Legal Aid',            'იურიდიული დახმარება',  '⚖️', 15),
  ('SOCIAL.EMPLOYMENT',           'SOCIAL',         'SOCIAL', 'Employment',           'დასაქმება',            '💼', 16),
  ('SOCIAL.CHILDCARE',            'SOCIAL',         'SOCIAL', 'Childcare',            'ბავშვთა მოვლა',        '👶', 17)
ON CONFLICT (id) DO NOTHING;

-- MEDICAL categories
INSERT INTO categories (id, parent_id, resource_type, name, name_ka, icon, sort_order) VALUES
  ('MEDICAL',              NULL,             'MEDICAL', 'Medical Research',   'სამედიცინო კვლევა',      '🔬', 0),
  ('MEDICAL.TRIAL',        'MEDICAL',        'MEDICAL', 'Clinical Trials',    'კლინიკური კვლევა',       '🧪', 1),
  ('MEDICAL.TRIAL.PHASE1', 'MEDICAL.TRIAL',  'MEDICAL', 'Phase 1 Trials',     'ფაზა 1',                 '1️⃣', 2),
  ('MEDICAL.TRIAL.PHASE2', 'MEDICAL.TRIAL',  'MEDICAL', 'Phase 2 Trials',     'ფაზა 2',                 '2️⃣', 3),
  ('MEDICAL.TRIAL.PHASE3', 'MEDICAL.TRIAL',  'MEDICAL', 'Phase 3 Trials',     'ფაზა 3',                 '3️⃣', 4),
  ('MEDICAL.TRIAL.PHASE4', 'MEDICAL.TRIAL',  'MEDICAL', 'Phase 4 Trials',     'ფაზა 4',                 '4️⃣', 5),
  ('MEDICAL.CENTER',       'MEDICAL',        'MEDICAL', 'Medical Centers',    'სამედიცინო ცენტრები',    '🏥', 6),
  ('MEDICAL.REHAB',        'MEDICAL',        'MEDICAL', 'Rehabilitation',     'რეაბილიტაცია',           '🦽', 7),
  ('MEDICAL.RESEARCH',     'MEDICAL',        'MEDICAL', 'Research Programs',  'კვლევითი პროგრამები',    '📊', 8),
  ('MEDICAL.NEURO',        'MEDICAL',        'MEDICAL', 'Neurology',          'ნევროლოგია',             '🧠', 9),
  ('MEDICAL.ONCO',         'MEDICAL',        'MEDICAL', 'Oncology',           'ონკოლოგია',              '🎗️', 10),
  ('MEDICAL.CARDIO',       'MEDICAL',        'MEDICAL', 'Cardiology',         'კარდიოლოგია',            '❤️', 11),
  ('MEDICAL.RARE',         'MEDICAL',        'MEDICAL', 'Rare Diseases',      'იშვიათი დაავადებები',    '🧬', 12),
  ('MEDICAL.PEDS',         'MEDICAL',        'MEDICAL', 'Pediatrics',         'პედიატრია',              '👶', 13),
  ('MEDICAL.MENTAL',       'MEDICAL',        'MEDICAL', 'Mental Health',      'ფსიქიკური ჯანმრთ.',      '🧘', 14),
  ('MEDICAL.AUTO',         'MEDICAL',        'MEDICAL', 'Autoimmune',         'აუტოიმუნური',            '🛡️', 15),
  ('MEDICAL.GENETIC',      'MEDICAL',        'MEDICAL', 'Genetic',            'გენეტიკური',             '🧪', 16),
  ('MEDICAL.INFECTIOUS',   'MEDICAL',        'MEDICAL', 'Infectious Diseases','ინფექციური',             '🦠', 17)
ON CONFLICT (id) DO NOTHING;
