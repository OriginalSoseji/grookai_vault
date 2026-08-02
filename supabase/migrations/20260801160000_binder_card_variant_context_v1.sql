begin;

create or replace function public.binder_card_json_v1(
  p_card_print_id uuid,
  p_card_printing_id uuid default null
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'card_print_id', cp.id,
    'card_printing_id', cpn.id,
    'gv_id', nullif(btrim(cp.gv_id), ''),
    'name', left(coalesce(nullif(btrim(cp.name), ''), 'Unknown card'), 160),
    'set_code', nullif(btrim(cp.set_code), ''),
    'set_name', left(coalesce(nullif(btrim(s.name), ''), nullif(btrim(cp.set_code), ''), 'Unknown set'), 120),
    'number', left(nullif(btrim(cp.number), ''), 40),
    'variant_key', left(nullif(btrim(cp.variant_key), ''), 160),
    'printed_identity_modifier', left(nullif(btrim(cp.printed_identity_modifier), ''), 240),
    'rarity', left(nullif(btrim(cp.rarity), ''), 120),
    'finish_label', left(nullif(btrim(fk.label), ''), 100),
    'image_url', case
      when image.proxy_gv_id is not null then
        'https://grookaivault.com/api/canon/cards/'
          || image.proxy_gv_id
          || '/image'
      else null
    end,
    'canonical_image_url', case
      when image.proxy_gv_id is not null then
        'https://grookaivault.com/api/canon/cards/'
          || image.proxy_gv_id
          || '/image'
      else null
    end,
    'image_source', case
      when image.hosted_image then 'hosted'
      when image.proxy_gv_id is not null then 'canonical_proxy'
      else null
    end,
    'hosted_image', image.hosted_image
  ))
  from public.card_prints cp
  left join public.sets s on s.id = cp.set_id
  left join public.card_printings cpn
    on cpn.id = p_card_printing_id
   and cpn.card_print_id = cp.id
  left join public.finish_keys fk on fk.key = cpn.finish_key
  left join lateral (
    select
      coalesce(
        case
          when lower(btrim(coalesce(cpn.image_source, ''))) = 'identity'
            and nullif(btrim(cpn.image_path), '') is not null
            and nullif(btrim(cpn.printing_gv_id), '') is not null
            then btrim(cpn.printing_gv_id)
          else null
        end,
        nullif(btrim(cp.gv_id), '')
      ) as proxy_gv_id,
      case
        when lower(btrim(coalesce(cpn.image_source, ''))) = 'identity'
          and nullif(btrim(cpn.image_path), '') is not null
          and nullif(btrim(cpn.printing_gv_id), '') is not null
        then true
        when lower(btrim(coalesce(cp.image_source, ''))) = 'identity'
          and nullif(btrim(cp.image_path), '') is not null
          and nullif(btrim(cp.gv_id), '') is not null
        then true
        else false
      end as hosted_image
  ) image on true
  where cp.id = p_card_print_id;
$$;

comment on function public.binder_card_json_v1(uuid, uuid) is
  'Returns bounded canonical card context for binder read RPCs, including authoritative collector-facing variant identity.';

commit;
