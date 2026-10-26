-- Initial responses were identified by the absence of a previous status.
DELETE FROM participation_audit WHERE previous_status IS NULL AND new_status IS NOT NULL;

ALTER TABLE participation_audit ALTER COLUMN new_status DROP NOT NULL;

-- Clear both sides of fields that did not change, preserving changes to NULL.
UPDATE participation_audit SET
  previous_status = CASE WHEN previous_status IS DISTINCT FROM new_status THEN previous_status ELSE NULL END,
  new_status = CASE WHEN previous_status IS DISTINCT FROM new_status THEN new_status ELSE NULL END,
  previous_comment = CASE WHEN previous_comment IS DISTINCT FROM new_comment THEN previous_comment ELSE NULL END,
  new_comment = CASE WHEN previous_comment IS DISTINCT FROM new_comment THEN new_comment ELSE NULL END,
  previous_is_in_lineup = CASE WHEN previous_is_in_lineup IS DISTINCT FROM new_is_in_lineup THEN previous_is_in_lineup ELSE NULL END,
  new_is_in_lineup = CASE WHEN previous_is_in_lineup IS DISTINCT FROM new_is_in_lineup THEN new_is_in_lineup ELSE NULL END;

DELETE FROM participation_audit
WHERE previous_status IS NOT DISTINCT FROM new_status
  AND previous_comment IS NOT DISTINCT FROM new_comment
  AND previous_is_in_lineup IS NOT DISTINCT FROM new_is_in_lineup;
