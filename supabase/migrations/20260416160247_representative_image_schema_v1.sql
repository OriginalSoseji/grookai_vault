alter table public.card_prints
  add column if not exists representative_image_url text null;

alter table public.card_prints
  add column if not exists image_note text null;

comment on column public.card_prints.representative_image_url is
  'lawful shared or fallback image URL used when exact variant-specific imagery is unavailable';

comment on column public.card_prints.image_note is
  'optional operator-facing note describing image state, provenance, or representative-image caveats';

comment on column public.card_prints.image_status is
  'image state for exact vs representative handling; target statuses are exact / representative_shared / representative_shared_collision / representative_shared_stamp / missing / unresolved, while legacy ok / placeholder / user_uploaded remain temporarily allowed for compatibility';

alter table public.card_prints
  drop constraint if exists card_prints_image_status_check;

alter table public.card_prints
  add constraint card_prints_image_status_check
    check (
      image_status is null
      or image_status = any (
        array[
          'exact'::text,
          'representative_shared'::text,
          'representative_shared_collision'::text,
          'representative_shared_stamp'::text,
          'missing'::text,
          'unresolved'::text,
          'ok'::text,
          'placeholder'::text,
          'user_uploaded'::text
        ]
      )
    );

update public.card_prints
set image_status = 'exact'
where (image_status is null or btrim(image_status) = '' or image_status = 'ok')
  and (
    (image_source = 'identity' and image_path is not null and btrim(image_path) <> '')
    or (image_url is not null and btrim(image_url) <> '')
    or (image_alt_url is not null and btrim(image_alt_url) <> '')
  );

update public.card_prints
set image_status = 'missing'
where (image_status is null or btrim(image_status) = '')
  and coalesce(btrim(image_url), '') = ''
  and coalesce(btrim(image_alt_url), '') = ''
  and coalesce(btrim(image_path), '') = ''
  and coalesce(btrim(representative_image_url), '') = '';
