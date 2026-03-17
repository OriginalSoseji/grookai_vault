-- COMPATIBILITY IDENTITY V2 — PHASE 1 VALIDATION
-- Replace <USER_UUID> before running.
--
-- This file compares the current web collector grouping model against the
-- Phase 1 instance-first one-row-per-card derivation.
-- Representative anchor rule:
--   1. prefer active anchors directly linked through active instances
--   2. if none exist, allow fallback only when exactly one active anchor exists
--   3. zero active anchors => no safe representative anchor
--   4. multiple active anchors with no linked anchor => ambiguous, reject

-- ---------------------------------------------------------------------------
-- Shared CTEs
-- ---------------------------------------------------------------------------

with active_instances as (
  select
    vii.id,
    vii.user_id,
    vii.gv_vi_id,
    vii.card_print_id,
    vii.slab_cert_id,
    vii.legacy_vault_item_id,
    vii.created_at,
    vii.archived_at,
    coalesce(vii.card_print_id, sc.card_print_id) as resolved_card_print_id
  from public.vault_item_instances vii
  left join public.slab_certs sc
    on sc.id = vii.slab_cert_id
  where vii.user_id = '<USER_UUID>'
    and vii.archived_at is null
),
active_buckets as (
  select
    vi.id,
    vi.user_id,
    vi.card_id,
    vi.gv_id,
    vi.created_at
  from public.vault_items vi
  where vi.user_id = '<USER_UUID>'
    and vi.archived_at is null
),
current_model_rows as (
  select
    case
      when ai.slab_cert_id is not null then 'slab:' || ai.slab_cert_id::text
      else 'raw:' || ai.resolved_card_print_id::text
    end as current_row_key,
    ai.resolved_card_print_id as card_print_id,
    ai.slab_cert_id,
    ai.legacy_vault_item_id,
    coalesce(ab.id, ai.legacy_vault_item_id) as compatibility_anchor
  from active_instances ai
  left join active_buckets ab
    on ab.card_id = ai.resolved_card_print_id
  where ai.resolved_card_print_id is not null
    and coalesce(ab.id, ai.legacy_vault_item_id) is not null
),
anchor_scores as (
  select
    ai.resolved_card_print_id as card_print_id,
    ab.id as vault_item_id,
    count(*) filter (where ai.legacy_vault_item_id = ab.id) as attached_instance_count,
    count(*) over (partition by ai.resolved_card_print_id, ab.id) as duplicate_guard
  from active_instances ai
  join active_buckets ab
    on ab.card_id = ai.resolved_card_print_id
  where ai.resolved_card_print_id is not null
  group by ai.resolved_card_print_id, ab.id
),
ranked_anchors as (
  select
    card_print_id,
    vault_item_id,
    attached_instance_count,
    row_number() over (
      partition by card_print_id
      order by attached_instance_count desc, vault_item_id asc
    ) as rn
  from anchor_scores
),
new_model_rows as (
  select
    ai.resolved_card_print_id as card_print_id,
    count(*) as total_count,
    count(*) filter (where ai.slab_cert_id is null) as raw_count,
    count(*) filter (where ai.slab_cert_id is not null) as slab_count,
    case
      when max(coalesce(ra.attached_instance_count, 0)) > 0
        then max(case when ra.rn = 1 then ra.vault_item_id end)
      when count(distinct ab.id) = 1
        then min(ab.id)
      else null
    end as representative_vault_item_id,
    count(distinct ab.id) as eligible_anchor_count,
    max(coalesce(ra.attached_instance_count, 0)) as max_linked_anchor_count
  from active_instances ai
  left join active_buckets ab
    on ab.card_id = ai.resolved_card_print_id
  left join ranked_anchors ra
    on ra.card_print_id = ai.resolved_card_print_id
  where ai.resolved_card_print_id is not null
  group by ai.resolved_card_print_id
)

-- ---------------------------------------------------------------------------
-- 1. OLD VS NEW CARD ROW COUNT
-- ---------------------------------------------------------------------------

select
  (select count(distinct current_row_key) from current_model_rows) as current_visible_row_count,
  (select count(*) from new_model_rows) as new_visible_row_count;

-- ---------------------------------------------------------------------------
-- 2. DISAPPEARING CARD CHECK
-- Cards visible in current model but missing in the new model.
-- Expect: zero rows
-- ---------------------------------------------------------------------------

with current_cards as (
  select distinct card_print_id
  from current_model_rows
),
new_cards as (
  select card_print_id
  from new_model_rows
)
select current_cards.card_print_id
from current_cards
left join new_cards
  on new_cards.card_print_id = current_cards.card_print_id
where new_cards.card_print_id is null
order by current_cards.card_print_id;

-- ---------------------------------------------------------------------------
-- 3. DUPLICATE CARD CHECK
-- A one-row-per-card Phase 1 model must not emit duplicate rows.
-- Expect: zero rows
-- ---------------------------------------------------------------------------

select
  card_print_id,
  count(*) as row_count
from new_model_rows
group by card_print_id
having count(*) > 1
order by card_print_id;

-- ---------------------------------------------------------------------------
-- 4. MIXED OWNERSHIP CHECK
-- Cards where raw and slab coexist.
-- ---------------------------------------------------------------------------

select
  card_print_id,
  total_count,
  raw_count,
  slab_count
from new_model_rows
where raw_count > 0
  and slab_count > 0
order by card_print_id;

-- ---------------------------------------------------------------------------
-- 5. REPRESENTATIVE ANCHOR CHECK
-- Flags rows with no safe active representative anchor.
-- Linked anchor is preferred. Single active-anchor fallback is allowed.
-- Multi-anchor fallback without a linked anchor is forbidden.
-- Expect: representative_vault_item_id not null for all rendered rows
-- ---------------------------------------------------------------------------

select
  nmr.card_print_id,
  nmr.representative_vault_item_id,
  nmr.eligible_anchor_count,
  nmr.max_linked_anchor_count,
  case
    when nmr.representative_vault_item_id is null then true
    else false
  end as missing_safe_anchor
from new_model_rows nmr
order by missing_safe_anchor desc, nmr.card_print_id;

-- ---------------------------------------------------------------------------
-- 6. SLAB VISIBILITY CHECK
-- Current slab metadata source fields for active slab-backed rows.
-- ---------------------------------------------------------------------------

select
  ai.resolved_card_print_id as card_print_id,
  ai.gv_vi_id,
  sc.grader,
  sc.grade,
  sc.cert_number
from active_instances ai
join public.slab_certs sc
  on sc.id = ai.slab_cert_id
where ai.slab_cert_id is not null
order by ai.resolved_card_print_id, ai.created_at desc;
