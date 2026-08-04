-- PUBLIC_CARD_PRINTING_OPTIONS_TRUTH_BOUNDARY_V1
--
-- Keeps canonical child-printing rows intact while preventing active printing
-- truth quarantines from being offered as public/selectable finishes.

begin;

drop function if exists public.get_public_card_printing_options_v1(uuid[], integer, integer);

create or replace function public.get_public_card_printing_options_v1(
  p_card_print_ids uuid[],
  p_limit integer default 1000,
  p_offset integer default 0
)
returns table (
  id uuid,
  card_print_id uuid,
  printing_gv_id text,
  finish_key text,
  finish_label text,
  finish_sort_order integer,
  finish_is_active boolean,
  image_source text,
  image_path text,
  image_url text,
  image_alt_url text,
  image_status text,
  image_note text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_card_print_ids uuid[];
begin
  v_card_print_ids := array(
    select distinct requested_id
    from unnest(coalesce(p_card_print_ids, array[]::uuid[])) as requested(requested_id)
    where requested_id is not null
    order by requested_id
  );

  if cardinality(v_card_print_ids) > 250 then
    raise exception 'At most 250 card print ids may be requested.'
      using errcode = '22023';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 1000 then
    raise exception 'p_limit must be between 1 and 1000.'
      using errcode = '22023';
  end if;

  if p_offset is null or p_offset < 0 then
    raise exception 'p_offset must be zero or greater.'
      using errcode = '22023';
  end if;

  return query
  select
    cp.id,
    cp.card_print_id,
    cp.printing_gv_id,
    cp.finish_key,
    fk.label as finish_label,
    fk.sort_order as finish_sort_order,
    fk.is_active as finish_is_active,
    cp.image_source,
    cp.image_path,
    cp.image_url,
    cp.image_alt_url,
    cp.image_status,
    cp.image_note
  from public.card_printings cp
  join public.finish_keys fk
    on fk.key = cp.finish_key
  where cp.card_print_id = any(v_card_print_ids)
    and fk.is_active = true
    and not exists (
      select 1
      from public.card_printing_truth_reviews review
      where review.card_printing_id = cp.id
        and review.active = true
        and review.public_visibility in (
          'hidden_pending_review',
          'hidden_unsupported'
        )
    )
  order by cp.card_print_id, fk.sort_order, fk.label, cp.id
  limit p_limit
  offset p_offset;
end;
$$;

comment on function public.get_public_card_printing_options_v1(uuid[], integer, integer) is
  'Bounded public child-printing read model. Excludes inactive finishes and active printing-truth quarantines without mutating canonical rows.';

revoke all on function public.get_public_card_printing_options_v1(uuid[], integer, integer)
  from public;
grant execute on function public.get_public_card_printing_options_v1(uuid[], integer, integer)
  to anon, authenticated, service_role;

do $$
declare
  v_target_id constant uuid := '467efb22-34ee-4122-a783-e45ff5798ee7'::uuid;
  v_parent_id constant uuid := '02e11652-ab5a-466b-858b-8e7b8fb322b0'::uuid;
begin
  if exists (
    select 1
    from public.card_printings cp
    where cp.id = v_target_id
      and cp.card_print_id = v_parent_id
      and cp.finish_key = 'normal'
      and cp.printing_gv_id = 'GV-PK-CEC-215-STD'
  ) then
    insert into public.card_printing_truth_reviews (
      card_printing_id,
      review_status,
      public_visibility,
      active,
      reason,
      confidence,
      evidence_sources_checked,
      evidence_sources_for_finish,
      expected_finish_keys,
      evidence,
      source_report_path,
      reviewed_by,
      reviewed_at
    )
    select
      v_target_id,
      'conflicting',
      'hidden_pending_review',
      true,
      'TCGdex identifies the card variant as normal while TCGPlayer market evidence for sm12-215 exposes holofoil only. Preserve the canonical row and hide it from selectable public finish options pending governed review.',
      'high',
      array['tcgdex_card_api', 'pokemon_tcg_api_tcgplayer_prices'],
      array['pokemon_tcg_api_tcgplayer_prices'],
      array['holo'],
      jsonb_build_object(
        'card', jsonb_build_object(
          'gv_id', 'GV-PK-CEC-215',
          'name', 'Blastoise & Piplup-GX',
          'set_code', 'sm12',
          'number', '215'
        ),
        'candidate', jsonb_build_object(
          'card_printing_id', v_target_id,
          'printing_gv_id', 'GV-PK-CEC-215-STD',
          'finish_key', 'normal',
          'provenance_source', 'tcgdex',
          'provenance_ref', 'sm12-215'
        ),
        'source_observations', jsonb_build_array(
          jsonb_build_object(
            'source', 'tcgdex_card_api',
            'url', 'https://api.tcgdex.net/v2/en/cards/sm12-215',
            'claim', 'variants.normal=true and variants.holo=false'
          ),
          jsonb_build_object(
            'source', 'pokemon_tcg_api_tcgplayer_prices',
            'url', 'https://api.pokemontcg.io/v2/cards/sm12-215',
            'claim', 'tcgplayer.prices contains holofoil and does not contain normal or reverseHolofoil'
          )
        ),
        'decision', 'hide_pending_review_without_canonical_mutation'
      ),
      'docs/audits/app_store_connect_feedback_v1/APP_STORE_CONNECT_FEEDBACK_AUDIT_V1.md',
      'codex_release_audit',
      now()
    where not exists (
      select 1
      from public.card_printing_truth_reviews review
      where review.card_printing_id = v_target_id
        and review.active = true
    );
  end if;
end;
$$;

commit;
