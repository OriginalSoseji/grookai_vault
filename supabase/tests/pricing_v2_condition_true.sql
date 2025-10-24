-- Ensure no PriceCharting rows surface publicly
select count(*) = 0 as no_pc
from public.latest_card_prices_v
where lower(source) = 'pricecharting';

