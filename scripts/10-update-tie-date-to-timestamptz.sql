-- Ensure tie dates are stored with timezone information (UTC canonical storage)
ALTER TABLE ties
  ALTER COLUMN tie_date TYPE timestamptz
  USING (tie_date AT TIME ZONE 'UTC');
