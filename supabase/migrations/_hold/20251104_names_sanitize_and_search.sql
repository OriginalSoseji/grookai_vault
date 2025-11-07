-- 20251104_names_sanitize_and_search.sql
-- 1) Helper: strip ASCII control chars (keeps visible Unicode)
create or replace function public.strip_control(text) returns text language sql immutable as $$
  select translate($1,
    -- 0x00..0x1F and 0x7F
    chr(0)||chr(1)||chr(2)||chr(3)||chr(4)||chr(5)||chr(6)||chr(7)||
    chr(8)||chr(9)||chr(10)||chr(11)||chr(12)||chr(13)||chr(14)||chr(15)||
    chr(16)||chr(17)||chr(18)||chr(19)||chr(20)||chr(21)||chr(22)||chr(23)||
    chr(24)||chr(25)||chr(26)||chr(27)||chr(28)||chr(29)||chr(30)||chr(31)||
    chr(127),
    repeat(' ', 33)  -- map to spaces, then we'll trim/squash
  );
$$;

-- 2) Helper: squash runs of whitespace to single space and trim
create or replace function public.squash_ws(text) returns text language sql immutable as $$
  select btrim(regexp_replace($1, '\s+', ' ', 'g'));
$$;

-- 3) Helper: fix common mojibake sequences (UTF-8 misread as Latin-1)
-- Only replaces well-known patterns (Ã© -> é, â€™ -> ’, â€“ -> – , Â -> (remove), etc.)
create or replace function public.fix_mojibake_common(t text) returns text
language sql immutable as $$
  select regexp_replace(
           regexp_replace(
             regexp_replace(
               regexp_replace(
                 regexp_replace(
                   t,
                   'Ã©', 'é', 'g'),
                 'Ã¨', 'è', 'g'),
               'Ã¡', 'á', 'g'),
             'Ã±', 'ñ', 'g'),
           'â€™', '’', 'g')
$$;

-- More common pairs (stack them safely)
create or replace function public.fix_mojibake_more(t text) returns text
language sql immutable as $$
  select
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(
                  t,
                  'â€“', '–', 'g'),
                'â€”', '—', 'g'),
              'â€œ', '“', 'g'),
            'â€\x9d', '”', 'g'),
          'â€œ', '“', 'g'),
        'Â', '', 'g'),   -- stray "Â" left from bad decode
      'Ãœ', 'Ü', 'g');
$$;

-- 4) Optional: unaccent for search (display keeps accents)
create extension if not exists unaccent;

-- 5) Add computed clean fields to card_prints (via view to avoid touching base table)
-- If you already have a view, adapt names accordingly.
create or replace view public.card_prints_clean as
select
  cp.*,
  -- visible name for UI (fix common mojibake + strip control/squash)
  public.squash_ws(public.strip_control(public.fix_mojibake_more(public.fix_mojibake_common(cp.name)))) as name_display,
  -- search-friendly ascii fold
  public.unaccent(
    public.squash_ws(public.strip_control(public.fix_mojibake_more(public.fix_mojibake_common(cp.name))))
  ) as name_search
from public.card_prints cp;

comment on view public.card_prints_clean is
  'card_prints with sanitized name_display for UI and unaccented name_search for queries';

-- 6) Rebuild stable app-facing search view using the clean view
create or replace view public.v_card_search as
select
  cpc.id::uuid               as id,
  cpc.name_display           as name,
  cpc.set_code               as set_code,

  -- number variants (null-safe)
  cpc.number_raw,
  cpc.number_digits,
  cpc.number_padded,
  cpc.number_slashed,

  -- images: always present columns, may be null (client must handle)
  coalesce(cpc.thumb_720x960_url, cpc.thumb_url) as thumb_url,
  coalesce(cpc.image_url, cpc.thumb_720x960_url, cpc.thumb_url) as image_url,

  cpc.latest_price_cents,
  case when cpc.latest_price_cents is not null
       then cpc.latest_price_cents / 100.0 end  as latest_price,

  -- query helpers
  lower(cpc.name_search)                         as name_lc
from public.card_prints_clean cpc;

grant select on public.v_card_search to anon, authenticated;