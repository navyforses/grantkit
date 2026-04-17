-- ===================================================================
-- GrantKit — Smart Search & Personalization Tags
-- Run in Supabase SQL Editor after deploying Phase 1.
-- ===================================================================

-- === EXTENSIONS ===
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- === TAG COLUMNS (for personalized dashboard) ===
ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS purpose_tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS need_tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS detail_tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS country_codes TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_resources_purpose ON resources USING GIN(purpose_tags);
CREATE INDEX IF NOT EXISTS idx_resources_need ON resources USING GIN(need_tags);
CREATE INDEX IF NOT EXISTS idx_resources_detail ON resources USING GIN(detail_tags);
CREATE INDEX IF NOT EXISTS idx_resources_countries ON resources USING GIN(country_codes);

-- === MULTILINGUAL SEARCH VIEW ===
CREATE OR REPLACE VIEW resources_searchable AS
SELECT
  r.*,
  (
    setweight(to_tsvector('simple', coalesce(r.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(r.title_ka, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(r.title_fr, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(r.title_es, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(r.title_ru, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(r.description, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(r.description_ka, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(r.description_fr, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(r.description_es, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(r.description_ru, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(r.source_name, '')), 'C')
  ) AS multilingual_vector
FROM resources r;

-- === SMART SEARCH FUNCTION ===
CREATE OR REPLACE FUNCTION smart_search(
  search_terms TEXT[],
  filter_country TEXT DEFAULT NULL,
  filter_status TEXT DEFAULT 'OPEN',
  result_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID, resource_type TEXT, title TEXT, title_ka TEXT, title_fr TEXT,
  title_es TEXT, title_ru TEXT, description TEXT, slug TEXT,
  amount_min INTEGER, amount_max INTEGER, currency TEXT,
  deadline TIMESTAMPTZ, status TEXT, source_url TEXT, source_name TEXT,
  eligibility TEXT, is_featured BOOLEAN, relevance_score REAL
)
LANGUAGE plpgsql AS $$
DECLARE
  combined_query tsquery := to_tsquery('simple', '');
  term TEXT;
BEGIN
  FOREACH term IN ARRAY search_terms LOOP
    IF trim(term) = '' THEN CONTINUE; END IF;
    IF combined_query::text = '' THEN
      combined_query := plainto_tsquery('simple', trim(term));
    ELSE
      combined_query := combined_query || plainto_tsquery('simple', trim(term));
    END IF;
  END LOOP;

  RETURN QUERY
  SELECT rs.id, rs.resource_type, rs.title, rs.title_ka, rs.title_fr,
    rs.title_es, rs.title_ru, rs.description, rs.slug,
    rs.amount_min, rs.amount_max, rs.currency,
    rs.deadline, rs.status, rs.source_url, rs.source_name,
    rs.eligibility, rs.is_featured,
    (ts_rank(rs.multilingual_vector, combined_query, 32) * 10.0 +
     CASE WHEN rs.is_featured THEN 0.5 ELSE 0.0 END)::REAL
  FROM resources_searchable rs
  WHERE rs.multilingual_vector @@ combined_query
    AND (filter_status IS NULL OR rs.status = filter_status)
    AND rs.published_at IS NOT NULL AND rs.status != 'ARCHIVED'
  ORDER BY relevance_score DESC, rs.is_featured DESC NULLS LAST,
    rs.deadline ASC NULLS LAST
  LIMIT result_limit;
END; $$;

-- === FUZZY FALLBACK ===
CREATE OR REPLACE FUNCTION fuzzy_search(search_text TEXT, result_limit INTEGER DEFAULT 10)
RETURNS TABLE (id UUID, title TEXT, slug TEXT, similarity_score REAL)
LANGUAGE sql AS $$
  SELECT r.id, r.title, r.slug,
    greatest(
      similarity(r.title, search_text),
      similarity(coalesce(r.title_ka, ''), search_text),
      similarity(coalesce(r.title_fr, ''), search_text),
      similarity(coalesce(r.title_es, ''), search_text),
      similarity(coalesce(r.title_ru, ''), search_text)
    )::REAL
  FROM resources r
  WHERE r.published_at IS NOT NULL AND r.status != 'ARCHIVED'
    AND (r.title % search_text OR coalesce(r.title_ka,'') % search_text
      OR coalesce(r.title_fr,'') % search_text
      OR coalesce(r.title_es,'') % search_text
      OR coalesce(r.title_ru,'') % search_text)
  ORDER BY similarity_score DESC LIMIT result_limit;
$$;

-- === TRIGRAM INDEXES ===
CREATE INDEX IF NOT EXISTS idx_title_trgm ON resources USING GIN(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_title_ka_trgm ON resources USING GIN(title_ka gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_title_fr_trgm ON resources USING GIN(title_fr gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_title_es_trgm ON resources USING GIN(title_es gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_title_ru_trgm ON resources USING GIN(title_ru gin_trgm_ops);
