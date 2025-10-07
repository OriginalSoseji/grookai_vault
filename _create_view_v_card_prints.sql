create or replace view public.v_card_prints as
select
  cp.id,
  cp.set_code,
  cp.number,
  cp.number_plain,
  cp.name,
  coalesce(cp.image_url, cp.image_alt_url) as image_best,
  cp.image_url,
  cp.image_alt_url,
  cp.image_source as source,
  cp.variant_key,
  cp.tcgplayer_id,
  cp.updated_at
from public.card_prints cp;
