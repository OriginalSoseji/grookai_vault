begin;

create or replace function public.card_print_identity_normalize_optional_text_v1(p_value text)
returns text
language sql
immutable
as $$
  select case
    when p_value is null then null
    when btrim(p_value) = '' then null
    else btrim(p_value)
  end
$$;

create or replace function public.card_print_identity_normalize_printed_name_v1(p_value text)
returns text
language sql
immutable
as $$
  select case
    when p_value is null then null
    when btrim(p_value) = '' then null
    else lower(regexp_replace(btrim(p_value), '\s+', ' ', 'g'))
  end
$$;

create or replace function public.card_print_identity_select_set_code_v1(
  p_card_print_set_code text,
  p_sets_code text
)
returns text
language sql
immutable
as $$
  select coalesce(
    public.card_print_identity_normalize_optional_text_v1(p_card_print_set_code),
    public.card_print_identity_normalize_optional_text_v1(p_sets_code)
  )
$$;

create or replace function public.card_print_identity_select_printed_number_v1(
  p_number text,
  p_number_plain text
)
returns text
language sql
immutable
as $$
  select coalesce(
    public.card_print_identity_normalize_optional_text_v1(p_number),
    public.card_print_identity_normalize_optional_text_v1(p_number_plain)
  )
$$;

create or replace function public.card_print_identity_normalize_variant_key_current_v1(p_variant_key text)
returns text
language sql
immutable
as $$
  select coalesce(public.card_print_identity_normalize_optional_text_v1(p_variant_key), 'base')
$$;

create or replace function public.card_print_identity_approved_hash_dimension_keys_v1(
  p_identity_domain text,
  p_identity_key_version text
)
returns text[]
language sql
immutable
as $$
  select case
    when p_identity_domain = 'pokemon_eng_standard' and p_identity_key_version = 'pokemon_eng_standard:v1' then
      array['variant_key_current']::text[]
    when p_identity_domain = 'pokemon_ba' and p_identity_key_version = 'pokemon_ba:v1' then
      array[]::text[]
    when p_identity_domain = 'pokemon_eng_special_print' and p_identity_key_version = 'pokemon_eng_special_print:v1' then
      array[
        'distribution_mark',
        'release_marking',
        'stamp_program',
        'stamp_text',
        'variant_key_current'
      ]::text[]
    when p_identity_domain = 'pokemon_jpn' and p_identity_key_version = 'pokemon_jpn:v1' then
      array[
        'edition_marking',
        'language_code',
        'rarity_policy',
        'release_context',
        'variant_key_current'
      ]::text[]
    else
      array[]::text[]
  end
$$;

create or replace function public.card_print_identity_ordered_domain_dimensions_v1(
  p_identity_domain text,
  p_identity_key_version text,
  p_identity_payload jsonb
)
returns jsonb
language sql
immutable
as $$
  with approved(key_name) as (
    select unnest(
      public.card_print_identity_approved_hash_dimension_keys_v1(
        p_identity_domain,
        p_identity_key_version
      )
    )
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_array(
        approved.key_name,
        coalesce(coalesce(p_identity_payload, '{}'::jsonb) -> approved.key_name, 'null'::jsonb)
      )
      order by approved.key_name
    ),
    '[]'::jsonb
  )
  from approved
$$;

create or replace function public.card_print_identity_serialize_key_v1(
  p_identity_domain text,
  p_identity_key_version text,
  p_set_code_identity text,
  p_printed_number text,
  p_normalized_printed_name text,
  p_source_name_raw text,
  p_identity_payload jsonb
)
returns text
language plpgsql
immutable
as $$
declare
  v_identity_domain text := public.card_print_identity_normalize_optional_text_v1(p_identity_domain);
  v_identity_key_version text := public.card_print_identity_normalize_optional_text_v1(p_identity_key_version);
  v_set_code_identity text := public.card_print_identity_normalize_optional_text_v1(p_set_code_identity);
  v_printed_number text := public.card_print_identity_normalize_optional_text_v1(p_printed_number);
  v_normalized_printed_name text := public.card_print_identity_normalize_optional_text_v1(p_normalized_printed_name);
  v_source_name_raw text := public.card_print_identity_normalize_optional_text_v1(p_source_name_raw);
begin
  if v_identity_domain is null then
    raise exception 'card_print_identity_serialize_key_v1: identity_domain is required';
  end if;

  if v_identity_key_version is null then
    raise exception 'card_print_identity_serialize_key_v1: identity_key_version is required';
  end if;

  if v_set_code_identity is null then
    raise exception 'card_print_identity_serialize_key_v1: set_code_identity is required';
  end if;

  if v_printed_number is null then
    raise exception 'card_print_identity_serialize_key_v1: printed_number is required';
  end if;

  return jsonb_build_array(
    jsonb_build_array('identity_domain', v_identity_domain),
    jsonb_build_array('identity_key_version', v_identity_key_version),
    jsonb_build_array('set_code_identity', v_set_code_identity),
    jsonb_build_array('printed_number', v_printed_number),
    jsonb_build_array('normalized_printed_name', v_normalized_printed_name),
    jsonb_build_array('source_name_raw', v_source_name_raw),
    jsonb_build_array(
      'domain_dimensions',
      public.card_print_identity_ordered_domain_dimensions_v1(
        v_identity_domain,
        v_identity_key_version,
        coalesce(p_identity_payload, '{}'::jsonb)
      )
    )
  )::text;
end;
$$;

create or replace function public.card_print_identity_hash_v1(
  p_identity_domain text,
  p_identity_key_version text,
  p_set_code_identity text,
  p_printed_number text,
  p_normalized_printed_name text,
  p_source_name_raw text,
  p_identity_payload jsonb
)
returns text
language sql
immutable
as $$
  select encode(
    digest(
      public.card_print_identity_serialize_key_v1(
        p_identity_domain,
        p_identity_key_version,
        p_set_code_identity,
        p_printed_number,
        p_normalized_printed_name,
        p_source_name_raw,
        p_identity_payload
      ),
      'sha256'
    ),
    'hex'
  )
$$;

create or replace function public.card_print_identity_backfill_projection_v1(
  p_set_source jsonb,
  p_card_print_set_code text,
  p_sets_code text,
  p_number text,
  p_number_plain text,
  p_name text,
  p_variant_key text,
  p_printed_total integer,
  p_printed_set_abbrev text
)
returns jsonb
language plpgsql
immutable
as $$
declare
  v_set_source_domain text := public.card_print_identity_normalize_optional_text_v1(p_set_source ->> 'domain');
  v_set_code_identity text := public.card_print_identity_select_set_code_v1(p_card_print_set_code, p_sets_code);
  v_printed_number text := public.card_print_identity_select_printed_number_v1(p_number, p_number_plain);
  v_normalized_printed_name text := public.card_print_identity_normalize_printed_name_v1(p_name);
  v_taxonomy_class text;
  v_identity_domain text;
  v_identity_key_version text;
  v_identity_payload jsonb;
begin
  if v_set_source_domain = 'tcg_pocket' then
    return jsonb_build_object(
      'status', 'excluded',
      'taxonomy_class', 'EXCLUDED_NONCANON_DOMAIN',
      'excluded_domain', 'tcg_pocket',
      'exclusion_reason', 'NON_CANON_DOMAIN:tcg_pocket'
    );
  end if;

  if v_set_source_domain is not null
     and v_set_source_domain not in (
       'pokemon_eng_standard',
       'pokemon_ba',
       'pokemon_eng_special_print',
       'pokemon_jpn'
     ) then
    return jsonb_build_object(
      'status', 'blocked',
      'taxonomy_class', 'BLOCKED_UNKNOWN_DOMAIN',
      'block_reason', 'UNKNOWN_SET_SOURCE_DOMAIN:' || v_set_source_domain
    );
  end if;

  v_taxonomy_class := 'SUPPORTED_CANON_DOMAIN';

  if v_set_code_identity is null then
    return jsonb_build_object(
      'status', 'blocked',
      'taxonomy_class', v_taxonomy_class,
      'block_reason', 'MISSING_SET_CODE_IDENTITY'
    );
  end if;

  if v_printed_number is null then
    return jsonb_build_object(
      'status', 'blocked',
      'taxonomy_class', v_taxonomy_class,
      'block_reason', 'MISSING_PRINTED_NUMBER'
    );
  end if;

  if v_normalized_printed_name is null then
    return jsonb_build_object(
      'status', 'blocked',
      'taxonomy_class', v_taxonomy_class,
      'block_reason', 'MISSING_NORMALIZED_PRINTED_NAME'
    );
  end if;

  if lower(v_set_code_identity) like 'ba-%' then
    return jsonb_build_object(
      'status', 'blocked',
      'taxonomy_class', v_taxonomy_class,
      'block_reason', 'EXISTING_BA_ROWS_REQUIRE_BA_PHASE'
    );
  end if;

  if v_set_source_domain in ('pokemon_ba', 'pokemon_eng_special_print', 'pokemon_jpn') then
    return jsonb_build_object(
      'status', 'blocked',
      'taxonomy_class', v_taxonomy_class,
      'block_reason', 'DOMAIN_PRESENT_BUT_NOT_BACKFILLABLE_IN_PHASE8:' || v_set_source_domain
    );
  end if;

  v_identity_domain := 'pokemon_eng_standard';
  v_identity_key_version := 'pokemon_eng_standard:v1';
  v_identity_payload := jsonb_strip_nulls(
    jsonb_build_object(
      'variant_key_current', public.card_print_identity_normalize_variant_key_current_v1(p_variant_key),
      'printed_total', p_printed_total,
      'printed_set_abbrev', public.card_print_identity_normalize_optional_text_v1(p_printed_set_abbrev)
    )
  );

  return jsonb_build_object(
    'status', 'ready',
    'taxonomy_class', v_taxonomy_class,
    'identity_domain', v_identity_domain,
    'identity_key_version', v_identity_key_version,
    'set_code_identity', v_set_code_identity,
    'printed_number', v_printed_number,
    'normalized_printed_name', v_normalized_printed_name,
    'source_name_raw', null,
    'identity_payload', v_identity_payload,
    'identity_key_hash',
      public.card_print_identity_hash_v1(
        v_identity_domain,
        v_identity_key_version,
        v_set_code_identity,
        v_printed_number,
        v_normalized_printed_name,
        null,
        v_identity_payload
      )
  );
end;
$$;

drop trigger if exists trg_card_print_identity_updated_at on public.card_print_identity;

create trigger trg_card_print_identity_updated_at
before update on public.card_print_identity
for each row
execute function public.set_timestamp_updated_at();

commit;
