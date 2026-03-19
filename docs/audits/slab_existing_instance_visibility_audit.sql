-- SLAB EXISTING INSTANCE VISIBILITY AUDIT
-- Founder email: ccabrl@gmail.com
-- Cert number: 106183226

-- 1. founder user lookup by email
select
  id,
  email,
  created_at
from auth.users
where lower(email) = lower('ccabrl@gmail.com');

-- 2. slab cert lookup by cert number
select
  id,
  cert_number,
  normalized_cert_number,
  card_print_id,
  grader,
  grade,
  created_at,
  updated_at
from public.slab_certs
where normalized_cert_number = '106183226';

-- 3. linked instance lookup for founder + cert
with founder as (
  select id
  from auth.users
  where lower(email) = lower('ccabrl@gmail.com')
),
cert as (
  select id
  from public.slab_certs
  where normalized_cert_number = '106183226'
)
select
  vii.id,
  vii.user_id,
  vii.card_print_id,
  vii.slab_cert_id,
  vii.legacy_vault_item_id,
  vii.archived_at,
  vii.created_at,
  vii.is_graded,
  vii.grade_company,
  vii.grade_value,
  vii.grade_label,
  vii.gv_vi_id
from public.vault_item_instances vii
join founder f on f.id = vii.user_id
join cert c on c.id = vii.slab_cert_id
order by vii.created_at desc;

-- 4. linked anchor lookup for those linked instances
with founder as (
  select id
  from auth.users
  where lower(email) = lower('ccabrl@gmail.com')
),
cert as (
  select id
  from public.slab_certs
  where normalized_cert_number = '106183226'
),
linked_instances as (
  select legacy_vault_item_id
  from public.vault_item_instances
  where user_id = (select id from founder)
    and slab_cert_id = (select id from cert)
)
select
  vi.id,
  vi.user_id,
  vi.card_id,
  vi.gv_id,
  vi.archived_at,
  vi.created_at,
  vi.is_graded,
  vi.grade_company,
  vi.grade_value,
  vi.grade_label,
  vi.condition_label,
  vi.qty
from public.vault_items vi
where vi.id in (
  select legacy_vault_item_id
  from linked_instances
  where legacy_vault_item_id is not null
)
order by vi.created_at desc;

-- 5. per-card active raw/slab breakdown for the linked card_print_id
with founder as (
  select id
  from auth.users
  where lower(email) = lower('ccabrl@gmail.com')
),
cert as (
  select id, card_print_id
  from public.slab_certs
  where normalized_cert_number = '106183226'
),
card_slabs as (
  select id
  from public.slab_certs
  where card_print_id = (select card_print_id from cert)
)
select
  (select card_print_id from cert) as card_print_id,
  count(*) filter (
    where vii.archived_at is null
      and vii.card_print_id = (select card_print_id from cert)
      and vii.slab_cert_id is null
  ) as raw_count,
  count(*) filter (
    where vii.archived_at is null
      and vii.slab_cert_id in (select id from card_slabs)
  ) as slab_count,
  count(*) filter (
    where vii.archived_at is null
      and (
        (vii.card_print_id = (select card_print_id from cert) and vii.slab_cert_id is null)
        or vii.slab_cert_id in (select id from card_slabs)
      )
  ) as total_count
from public.vault_item_instances vii
where vii.user_id = (select id from founder);

-- 6. whether the slab instance has a null/invalid anchor
with founder as (
  select id
  from auth.users
  where lower(email) = lower('ccabrl@gmail.com')
),
cert as (
  select id
  from public.slab_certs
  where normalized_cert_number = '106183226'
)
select
  vii.id as instance_id,
  vii.legacy_vault_item_id,
  vi.id as resolved_anchor_id,
  case
    when vii.legacy_vault_item_id is null then 'NULL_ANCHOR'
    when vi.id is null then 'BROKEN_ANCHOR'
    else 'OK'
  end as anchor_status
from public.vault_item_instances vii
left join public.vault_items vi
  on vi.id = vii.legacy_vault_item_id
where vii.user_id = (select id from founder)
  and vii.slab_cert_id = (select id from cert);

-- 7. whether the slab would be included by current web read assumptions
-- Card detail summary includes slab only when:
--   slab_certs.card_print_id matches current card
--   and at least one active founder vault_item_instances row exists with slab_cert_id in that card's slab cert set
with founder as (
  select id
  from auth.users
  where lower(email) = lower('ccabrl@gmail.com')
),
cert as (
  select id, card_print_id
  from public.slab_certs
  where normalized_cert_number = '106183226'
),
card_slabs as (
  select id
  from public.slab_certs
  where card_print_id = (select card_print_id from cert)
),
active_founder_slab_instances as (
  select *
  from public.vault_item_instances
  where user_id = (select id from founder)
    and archived_at is null
    and slab_cert_id in (select id from card_slabs)
),
active_founder_card_rows as (
  select *
  from public.vault_item_instances
  where user_id = (select id from founder)
    and archived_at is null
)
select
  (select card_print_id from cert) as card_print_id,
  exists(select 1 from active_founder_slab_instances) as visible_in_card_detail_summary,
  exists(
    select 1
    from active_founder_card_rows vii
    where coalesce(vii.card_print_id, (
      select sc.card_print_id
      from public.slab_certs sc
      where sc.id = vii.slab_cert_id
    )) = (select card_print_id from cert)
  ) as visible_in_vault_card_aggregate,
  (
    select count(*)
    from active_founder_slab_instances
  ) as active_slab_instances_for_card;
