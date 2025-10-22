-- DEV-ONLY: Pricing pipeline sanity checks
-- A) Card prices present?
SELECT count(*) AS card_prices_count, max(observed_at) AS last_observed FROM public.card_prices;
SELECT * FROM public.card_prices ORDER BY observed_at DESC LIMIT 3;

-- B) Joins line up?
SELECT cp.card_id, cp.price_mid, cp.observed_at
FROM public.card_prices cp
JOIN public.card_prints p ON p.id = cp.card_id
ORDER BY cp.observed_at DESC
LIMIT 3;

-- C) View works?
SELECT count(*) AS latest_view_count FROM public.latest_card_prices_v;
SELECT * FROM public.latest_card_prices_v LIMIT 5;

-- D) Grants visible to anon?
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'latest_card_prices_v'
ORDER BY grantee, privilege_type;

-- E) Sample one target card_id path
WITH recent AS (
  SELECT id AS card_id FROM public.card_prints ORDER BY updated_at DESC NULLS LAST LIMIT 1
)
SELECT 'card_prints_recent' AS label, card_id FROM recent
UNION ALL
SELECT 'latest_view_hit' AS label, v.card_id FROM public.latest_card_prices_v v
WHERE v.card_id IN (SELECT card_id FROM recent);

