ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS purpose_tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS need_tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS detail_tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS country_codes TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_resources_purpose ON resources USING GIN(purpose_tags);
CREATE INDEX IF NOT EXISTS idx_resources_need ON resources USING GIN(need_tags);
CREATE INDEX IF NOT EXISTS idx_resources_detail ON resources USING GIN(detail_tags);
CREATE INDEX IF NOT EXISTS idx_resources_countries ON resources USING GIN(country_codes);
