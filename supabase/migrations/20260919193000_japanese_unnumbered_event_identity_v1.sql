begin;

-- A missing source-page field is not sufficient evidence for this identity kind.
create function public.card_print_identity_is_japanese_unnumbered_event_v1(
  p_identity_domain text,
  p_identity_key_version text,
  p_printed_number text,
  p_identity_payload jsonb
)
returns boolean
language sql
immutable
set search_path = public
as $function$
  select coalesce(
    p_identity_domain = 'pokemon_jpn'
    and p_identity_key_version = 'pokemon_jpn:unnumbered_event:v1'
    and p_printed_number is null
    and jsonb_typeof(p_identity_payload) = 'object'
    and p_identity_payload ->> 'printed_coordinate_kind' = 'unnumbered_event'
    and p_identity_payload ->> 'number_evidence_status' = 'image_confirmed_absent'
    and p_identity_payload ->> 'language_code' = 'ja'
    and p_identity_payload ->> 'variant_key_current' = 'base'
    and p_identity_payload ->> 'printed_promo_code' in ('S-P', 'SV-P')
    and jsonb_typeof(p_identity_payload #> '{release_context,observed_event}') = 'object'
    and (p_identity_payload #> '{release_context,observed_event}') ?& array['series','year','venue','place']
    and jsonb_typeof(p_identity_payload #> '{release_context,observed_event,year}') = 'number'
    and p_identity_payload #>> '{release_context,observed_event,year}' ~ '^(199[6-9]|20[0-9]{2}|2100)$'
    and (
      (p_identity_payload #>> '{release_context,observed_event,series}' = 'champions_league'
       and jsonb_typeof(p_identity_payload #> '{release_context,observed_event,venue}') = 'string'
       and nullif(btrim(p_identity_payload #>> '{release_context,observed_event,venue}'), '') is not null
       and jsonb_typeof(p_identity_payload #> '{release_context,observed_event,place}') = 'number'
       and p_identity_payload #>> '{release_context,observed_event,place}' in ('1','2','3'))
      or
      (p_identity_payload #>> '{release_context,observed_event,series}' = 'world_championships'
       and p_identity_payload #> '{release_context,observed_event,venue}' = 'null'::jsonb
       and p_identity_payload #> '{release_context,observed_event,place}' = 'null'::jsonb)
    )
    and p_identity_payload #>> '{image_identity_evidence,current_image_sha256}' ~ '^[0-9a-f]{64}$'
    and p_identity_payload #>> '{image_identity_evidence,official_image_sha256}' ~ '^[0-9a-f]{64}$'
    and p_identity_payload #>> '{image_identity_evidence,source_raw_sha256}' ~ '^[0-9a-f]{64}$'
    and p_identity_payload #>> '{image_identity_evidence,official_card_id}' ~ '^[0-9]+$'
    and p_identity_payload #>> '{image_identity_evidence,source_url}' =
      'https://www.pokemon-card.com/card-search/details.php/card/' ||
      (p_identity_payload #>> '{image_identity_evidence,official_card_id}') || '/regu/all',
    false
  );
$function$;

revoke all on function public.card_print_identity_is_japanese_unnumbered_event_v1(text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.card_print_identity_is_japanese_unnumbered_event_v1(text,text,text,jsonb) to service_role;

alter table public.card_print_identity
  add constraint card_print_identity_number_or_japanese_unnumbered_event_check
  check (
    case when identity_key_version = 'pokemon_jpn:unnumbered_event:v1' then
      public.card_print_identity_is_japanese_unnumbered_event_v1(
        identity_domain,identity_key_version,printed_number,identity_payload
      )
    else printed_number is not null end
  );

alter table public.card_print_identity alter column printed_number drop not null;

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
set search_path = public
as $function$
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

  -- This new version cannot alter the serialization of any existing version.
  if v_identity_key_version = 'pokemon_jpn:unnumbered_event:v1' then
    if not public.card_print_identity_is_japanese_unnumbered_event_v1(
      p_identity_domain,p_identity_key_version,p_printed_number,p_identity_payload
    ) or v_normalized_printed_name is null or v_source_name_raw is null then
      raise exception 'card_print_identity_serialize_key_v1: invalid unnumbered event evidence';
    end if;
    if lower(v_set_code_identity) not in ('jpn-sp','jpn-s-p','jpn-svp','jpn-sv-p')
       or replace(lower(v_set_code_identity),'-','') <>
          'jpn' || replace(lower(p_identity_payload ->> 'printed_promo_code'),'-','') then
      raise exception 'card_print_identity_serialize_key_v1: unnumbered event promo series mismatch';
    end if;
    return jsonb_build_array(
      jsonb_build_array('identity_domain', v_identity_domain),
      jsonb_build_array('identity_key_version', v_identity_key_version),
      jsonb_build_array('set_code_identity', v_set_code_identity),
      jsonb_build_array('printed_number', null::text),
      jsonb_build_array('normalized_printed_name', v_normalized_printed_name),
      jsonb_build_array('source_name_raw', v_source_name_raw),
      jsonb_build_array('domain_dimensions', jsonb_build_array(
        jsonb_build_array('language_code','ja'),
        jsonb_build_array('printed_coordinate_kind','unnumbered_event'),
        jsonb_build_array('printed_promo_code',p_identity_payload ->> 'printed_promo_code'),
        jsonb_build_array('event_series',p_identity_payload #>> '{release_context,observed_event,series}'),
        jsonb_build_array('event_year',p_identity_payload #> '{release_context,observed_event,year}'),
        jsonb_build_array('event_venue',p_identity_payload #> '{release_context,observed_event,venue}'),
        jsonb_build_array('award_place',p_identity_payload #> '{release_context,observed_event,place}'),
        jsonb_build_array('variant_key_current','base')
      ))
    )::text;
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
$function$;

comment on constraint card_print_identity_number_or_japanese_unnumbered_event_check
  on public.card_print_identity is
  'Existing versions retain required printed numbers. Only image-confirmed Japanese event identities may store a null printed number; source page omissions alone are not authority.';

commit;
