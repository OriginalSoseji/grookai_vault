-- SLAB MIXED ROW QUANTITY AUDIT
-- Founder email: ccabrl@gmail.com
-- Card print id: 5557ba0d-6aa7-451f-8195-2a300235394e
-- Cert number: 106183226

-- 1. founder user lookup by email
select
  id,
  email,
  created_at
from auth.users
where lower(email) = lower('ccabrl@gmail.com');

-- 2. slab cert lookup for the known cert
select
  id,
  cert_number,
  card_print_id,
  grader,
  grade,
  created_at,
  updated_at
from public.slab_certs
where normalized_cert_number = '106183226';

-- 3. active raw/slab/total owned-object truth for the affected card
with founder as (
  select id
  from auth.users
  where lower(email) = lower('ccabrl@gmail.com')
),
card_slabs as (
  select id
  from public.slab_certs
  where card_print_id = '5557ba0d-6aa7-451f-8195-2a300235394e'
)
select
  '5557ba0d-6aa7-451f-8195-2a300235394e'::uuid as card_print_id,
  count(*) filter (
    where vii.archived_at is null
      and vii.card_print_id = '5557ba0d-6aa7-451f-8195-2a300235394e'::uuid
      and vii.slab_cert_id is null
  ) as raw_count,
  count(*) filter (
    where vii.archived_at is null
      and vii.slab_cert_id in (select id from card_slabs)
  ) as slab_count,
  count(*) filter (
    where vii.archived_at is null
      and (
        (vii.card_print_id = '5557ba0d-6aa7-451f-8195-2a300235394e'::uuid and vii.slab_cert_id is null)
        or vii.slab_cert_id in (select id from card_slabs)
      )
  ) as total_count
from public.vault_item_instances vii
where vii.user_id = (select id from founder);

-- 4. active raw instances for the card
with founder as (
  select id
  from auth.users
  where lower(email) = lower('ccabrl@gmail.com')
)
select
  id,
  gv_vi_id,
  card_print_id,
  slab_cert_id,
  legacy_vault_item_id,
  archived_at,
  created_at
from public.vault_item_instances
where user_id = (select id from founder)
  and card_print_id = '5557ba0d-6aa7-451f-8195-2a300235394e'::uuid
  and slab_cert_id is null
  and archived_at is null
order by created_at desc;

-- 5. active slab instances for the card
with founder as (
  select id
  from auth.users
  where lower(email) = lower('ccabrl@gmail.com')
),
card_slabs as (
  select id
  from public.slab_certs
  where card_print_id = '5557ba0d-6aa7-451f-8195-2a300235394e'::uuid
)
select
  id,
  gv_vi_id,
  card_print_id,
  slab_cert_id,
  legacy_vault_item_id,
  archived_at,
  created_at,
  grade_company,
  grade_value,
  grade_label,
  is_graded
from public.vault_item_instances
where user_id = (select id from founder)
  and slab_cert_id in (select id from card_slabs)
  and archived_at is null
order by created_at desc;

-- 6. active anchors for the card
with founder as (
  select id
  from auth.users
  where lower(email) = lower('ccabrl@gmail.com')
)
select
  id,
  user_id,
  card_id,
  gv_id,
  archived_at,
  created_at,
  is_graded,
  grade_company,
  grade_value,
  grade_label,
  condition_label,
  qty
from public.vault_items
where user_id = (select id from founder)
  and card_id = '5557ba0d-6aa7-451f-8195-2a300235394e'::uuid
order by created_at desc;

-- 7. read-model-facing truth that explains why Qty 2 shows today
with founder as (
  select id
  from auth.users
  where lower(email) = lower('ccabrl@gmail.com')
),
active_instances as (
  select
    vii.card_print_id,
    vii.slab_cert_id,
    vii.created_at,
    vii.gv_vi_id,
    vii.legacy_vault_item_id
  from public.vault_item_instances vii
  where vii.user_id = (select id from founder)
    and vii.archived_at is null
),
slab_meta as (
  select
    sc.id,
    sc.card_print_id,
    sc.grader,
    sc.grade,
    sc.cert_number
  from public.slab_certs sc
  where sc.card_print_id = '5557ba0d-6aa7-451f-8195-2a300235394e'::uuid
)
select
  coalesce(ai.card_print_id, sm.card_print_id) as derived_card_print_id,
  count(*) as total_count,
  count(*) filter (where ai.slab_cert_id is null) as raw_count,
  count(*) filter (where ai.slab_cert_id is not null) as slab_count,
  bool_or(ai.slab_cert_id is not null) as is_slab_flag,
  max(sm.grader) filter (where ai.slab_cert_id is not null) as primary_grader,
  max(sm.grade::text) filter (where ai.slab_cert_id is not null) as primary_grade,
  max(sm.cert_number) filter (where ai.slab_cert_id is not null) as primary_cert_number
from active_instances ai
left join slab_meta sm
  on sm.id = ai.slab_cert_id
where coalesce(ai.card_print_id, sm.card_print_id) = '5557ba0d-6aa7-451f-8195-2a300235394e'::uuid
group by coalesce(ai.card_print_id, sm.card_print_id);
