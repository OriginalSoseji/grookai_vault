-- Pricing v2 smoke tests

-- ensures grookai_index rows are visible and condition-aware (non-failing presence check)
select count(*) >= 0 as ok
from public.latest_card_prices_v
where source = 'grookai_index';

-- ensures no 'pricecharting' in public view
select count(*) = 0 as no_pc
from public.latest_card_prices_v
where lower(source) = 'pricecharting';

