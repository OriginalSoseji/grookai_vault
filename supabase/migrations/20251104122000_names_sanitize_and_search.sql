-- 20251104122000_names_sanitize_and_search.sql
-- Name sanitation + stable search fields (compatible with current schema)

-- 1) Helpers
create or replace function public.strip_control(text) returns text language sql immutable as $$
  select translate($1,
    chr(0)||chr(1)||chr(2)||chr(3)||chr(4)||chr(5)||chr(6)||chr(7)||
    chr(8)||chr(9)||chr(10)||chr(11)||chr(12)||chr(13)||chr(14)||chr(15)||
    chr(16)||chr(17)||chr(18)||chr(19)||chr(20)||chr(21)||chr(22)||chr(23)||
    chr(24)||chr(25)||chr(26)||chr(27)||chr(28)||chr(29)||chr(30)||chr(31)||
    chr(127),
    repeat(' ', 33)
  );
$$;

create or replace function public.squash_ws(text) returns text language sql immutable as $$
  select btrim(regexp_replace($1, '\s+', ' ', 'g'));
$$;

create or replace function public.fix_mojibake_common(t text) returns text language sql immutable as $$
  select regexp_replace(
           regexp_replace(
             regexp_replace(
               regexp_replace(
                 regexp_replace(t, 'ÃƒÂ©', 'Ã©', 'g'),
                              'ÃƒÂ¨', 'Ã¨', 'g'),
                            'ÃƒÂ¡', 'Ã¡', 'g'),
                          'ÃƒÂ±', 'Ã±', 'g'),
                        'Ã¢â‚¬â„¢', 'â€™', 'g')
$$;

create or replace function public.fix_mojibake_more(t text) returns text language sql immutable as $$
  select regexp_replace(
           regexp_replace(
             regexp_replace(
               regexp_replace(
                 regexp_replace(
                   regexp_replace(t, 'â€“', '–', 'g'),
                                'â€”', '—', 'g'),
                              'â€œ', '“', 'g'),
                            'â€\x9d', '”', 'g'),
                          'Â', '', 'g'),
           'Ãœ', 'Ü', 'g');
$$;

-- 2) Unaccent for search
create extension if not exists unaccent;

-- 3) Clean view (does not alter base table) — guarded for local envs without catalog
do $$
begin
  if exists (
    select 1 from information_schema.tables where table_schema='public' and table_name='card_prints'
  ) then
    drop view if exists public.card_prints_clean cascade;
    create or replace view public.card_prints_clean as
    select
      cp.*,
      public.squash_ws(public.strip_control(public.fix_mojibake_more(public.fix_mojibake_common(cp.name)))) as name_display,
      public.unaccent(
        public.squash_ws(public.strip_control(public.fix_mojibake_more(public.fix_mojibake_common(cp.name))))
      ) as name_search
    from public.card_prints cp;
  else
    drop view if exists public.card_prints_clean cascade;
    create or replace view public.card_prints_clean as
    select
      null::uuid as id,
      null::text as set_code,
      null::text as collector_number,
      null::text as lang,
      null::text as name,
      null::text as image_url,
      null::text as image_alt_url,
      null::text as name_display,
      null::text as name_search
    where false;
  end if;
end $$;

comment on view public.card_prints_clean is
  'card_prints with sanitized name_display and unaccented name_search';

-- 4) Stable app-facing search view — guarded with shim when catalog is absent
do $$
begin
  if exists (
    select 1 from information_schema.tables where table_schema='public' and table_name='card_prints'
  ) then
    drop view if exists public.v_card_search cascade;
    if exists (
      select 1 from information_schema.views where table_schema='public' and table_name='latest_card_prices_v'
    ) then
      create view public.v_card_search as
      with base as (
        select
          cp.id::uuid as id,
          cpc.name_display as name,
          cp.set_code as set_code,
          -- number variants
          cp.number as number_raw,
          regexp_replace(coalesce(cp.number,''), '[^0-9]', '', 'g')          as number_digits,
          case when regexp_replace(coalesce(cp.number,''), '[^0-9]', '', 'g') <> ''
               then lpad(regexp_replace(coalesce(cp.number,''), '[^0-9]', '', 'g'), 3, '0') end as number_padded,
          case when cp.number ~ '\\d+\\s*/\\s*\\d+'
               then lpad(regexp_replace(cp.number, '^\\D*?(\\d+).*$', '\\1'), 3, '0') || '/' || regexp_replace(cp.number, '^.*?/(\\d+).*$', '\\1') end as number_slashed,
          -- images
          coalesce(cp.image_url, cp.image_alt_url) as thumb_url,
          coalesce(cp.image_url, cp.image_alt_url) as image_url,
          lower(cpc.name_search) as name_lc
        from public.card_prints cp
        join public.card_prints_clean cpc on cpc.id = cp.id
      )
      select
        b.*,
        pr.latest_price_cents,
        case when pr.latest_price_cents is not null then pr.latest_price_cents / 100.0 end as latest_price
      from base b
      left join lateral (
        select round(coalesce(price_mid, price_high, price_low) * 100)::int as latest_price_cents
        from public.latest_card_prices_v p
        where p.card_id = b.id
        order by
          case when lower(coalesce(p.condition,'')) in ('nm','near mint','lp','lightly played','raw') then 0 else 1 end,
          observed_at desc nulls last
        limit 1
      ) pr on true;
    else
      create view public.v_card_search as
      select
        cp.id::uuid as id,
        cpc.name_display as name,
        cp.set_code as set_code,
        cp.number as number_raw,
        regexp_replace(coalesce(cp.number,''), '[^0-9]', '', 'g')          as number_digits,
        case when regexp_replace(coalesce(cp.number,''), '[^0-9]', '', 'g') <> ''
             then lpad(regexp_replace(coalesce(cp.number,''), '[^0-9]', '', 'g'), 3, '0') end as number_padded,
        case when cp.number ~ '\\d+\\s*/\\s*\\d+'
             then lpad(regexp_replace(cp.number, '^\\D*?(\\d+).*$', '\\1'), 3, '0') || '/' || regexp_replace(cp.number, '^.*?/(\\d+).*$', '\\1') end as number_slashed,
        coalesce(cp.image_url, cp.image_alt_url) as thumb_url,
        coalesce(cp.image_url, cp.image_alt_url) as image_url,
        lower(cpc.name_search) as name_lc,
        null::int as latest_price_cents,
        null::numeric as latest_price
      from public.card_prints cp
      join public.card_prints_clean cpc on cpc.id = cp.id;
    end if;
  else
    drop view if exists public.v_card_search cascade;
    create view public.v_card_search as
    select
      null::uuid as id,
      null::text as name,
      null::text as set_code,
      null::text as number_raw,
      null::text as number_digits,
      null::text as number_padded,
      null::text as number_slashed,
      null::text as thumb_url,
      null::text as image_url,
      null::text as name_lc,
      null::int as latest_price_cents,
      null::numeric as latest_price
    where false;
  end if;
end $$;

grant select on public.v_card_search to anon, authenticated;
