-- Keep public printing choices within the same catalog boundary as their parent.
-- No catalog activation, canonical row mutation, or ownership reassignment.
begin;

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
    cp.id, cp.card_print_id, cp.printing_gv_id, cp.finish_key,
    fk.label as finish_label, fk.sort_order as finish_sort_order,
    fk.is_active as finish_is_active,
    cp.image_source, cp.image_path, cp.image_url, cp.image_alt_url,
    cp.image_status, cp.image_note
  from public.card_printings cp
  join public.finish_keys fk on fk.key = cp.finish_key
  where cp.card_print_id = any(v_card_print_ids)
    and public.catalog_card_print_visible_to_request_v1(cp.card_print_id)
    and fk.is_active = true
    and not exists (
      select 1
      from public.card_printing_truth_reviews review
      where review.card_printing_id = cp.id
        and review.active = true
        and review.public_visibility in ('hidden_pending_review', 'hidden_unsupported')
    )
  order by cp.card_print_id, fk.sort_order, fk.label, cp.id
  limit p_limit
  offset p_offset;
end;
$$;

-- CREATE OR REPLACE preserves the existing owner and bounded-role EXECUTE grants.
commit;
