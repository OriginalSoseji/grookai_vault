begin;

alter table public.card_prints
add column if not exists printed_identity_modifier text;

create unique index if not exists uq_card_prints_identity_v2
on public.card_prints (
  set_id,
  number_plain,
  coalesce(printed_identity_modifier, ''),
  coalesce(variant_key, '')
)
where set_id is not null
  and number_plain is not null;

-- validation precheck: must return 0 rows
select
  set_id,
  number_plain,
  printed_identity_modifier,
  variant_key,
  count(*) as row_count
from public.card_prints
where set_id is not null
  and number_plain is not null
group by set_id, number_plain, printed_identity_modifier, variant_key
having count(*) > 1;

commit;
