begin;

-- Public catalog search remains available, but legacy price fields are not
-- licensing-safe for anonymous callers. Signed-in clients may retain the
-- compatibility fields while product surfaces migrate through the governed
-- pricing read model.
create or replace view public.v_card_search with (security_invoker = true) as
select
  cp.id,
  cp.name,
  cp.set_code,
  cp.number,
  cp.number as number_raw,
  regexp_replace(coalesce(cp.number, ''::text), '[^0-9]'::text, ''::text, 'g'::text) as number_digits,
  case
    when regexp_replace(coalesce(cp.number, ''::text), '[^0-9]'::text, ''::text, 'g'::text) <> ''::text
      then lpad(regexp_replace(coalesce(cp.number, ''::text), '[^0-9]'::text, ''::text, 'g'::text), 3, '0'::text)
    else null::text
  end as number_padded,
  case
    when cp.number ~ '\d+\s*/\s*\d+'::text
      then (lpad(regexp_replace(cp.number, '^\D*?(\d+).*$'::text, '\1'::text), 3, '0'::text) || '/'::text) || regexp_replace(cp.number, '^.*?/(\d+).*$'::text, '\1'::text)
    else null::text
  end as number_slashed,
  coalesce(cp.rarity, null::text) as rarity,
  nullif(btrim(coalesce(cp.image_url, cp.image_alt_url, cp.representative_image_url)), '') as image_url,
  nullif(btrim(coalesce(cp.image_url, cp.image_alt_url, cp.representative_image_url)), '') as thumb_url,
  nullif(btrim(coalesce(cp.image_url, cp.image_alt_url, cp.representative_image_url)), '') as image_best,
  case
    when auth.role() in ('authenticated', 'service_role') then pr.latest_price_cents
    else null::integer
  end as latest_price_cents,
  case
    when auth.role() in ('authenticated', 'service_role') and pr.latest_price_cents is not null
      then pr.latest_price_cents::numeric / 100.0
    else null::numeric
  end as latest_price,
  lower(cp.name) as name_lc,
  null::numeric as search_rank,
  cp.representative_image_url,
  cp.image_status,
  cp.image_note,
  nullif(btrim(coalesce(cp.image_url, cp.image_alt_url, cp.representative_image_url)), '') as display_image_url,
  case
    when nullif(btrim(coalesce(cp.image_url, cp.image_alt_url)), '') is not null then 'exact'
    when nullif(btrim(cp.representative_image_url), '') is not null then 'representative'
    else 'missing'
  end as display_image_kind
from public.card_prints cp
left join lateral (
  select round(coalesce(p.price_mid, p.price_high, p.price_low) * 100::numeric)::integer as latest_price_cents
  from public.latest_card_prices_v p
  where p.card_id = cp.id
  order by
    case
      when lower(coalesce(p.condition, ''::text)) = any (array['nm'::text, 'near mint'::text, 'lp'::text, 'lightly played'::text, 'raw'::text]) then 0
      else 1
    end,
    p.observed_at desc nulls last
  limit 1
) pr on auth.role() in ('authenticated', 'service_role');

comment on view public.v_card_search is
  'Stable app-facing search view. Catalog fields remain public; legacy price compatibility fields are redacted for anonymous callers.';

grant select on table public.v_card_search to anon, authenticated;

commit;
