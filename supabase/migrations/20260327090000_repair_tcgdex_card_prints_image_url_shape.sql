-- Purpose:
-- Repair malformed bare TCGdex asset URLs stored in public.card_prints.image_url.
--
-- Scope:
-- - public.card_prints.image_url only
-- - no canon impact
-- - no mapping impact
-- - no ingestion impact
--
-- Narrow target:
-- - image_url starts with https://assets.tcgdex.net/en/
-- - image_url does not already end with /high.webp
--
-- This migration is idempotent by target selection and does not touch any other
-- table, column, or already-valid TCGdex asset URL.

begin;

update public.card_prints
set image_url = rtrim(image_url, '/') || '/high.webp'
where image_url like 'https://assets.tcgdex.net/en/%'
  and image_url not like '%/high.webp';

commit;
