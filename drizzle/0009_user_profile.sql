ALTER TABLE users
  ADD COLUMN targetCountry VARCHAR(8),
  ADD COLUMN purposes TEXT,
  ADD COLUMN purposeDetails TEXT,
  ADD COLUMN needs TEXT,
  ADD COLUMN needDetails TEXT,
  ADD COLUMN profileCompletedAt TIMESTAMP;
