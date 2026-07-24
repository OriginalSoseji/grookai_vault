\set ON_ERROR_STOP on
\pset pager off
\timing on

-- Local-only upper-bound probe for the Collaborative Binders V1 contract.
-- The transaction is rolled back so this script leaves no fixture data.
begin;
set local search_path = public, extensions, pg_catalog;
set local statement_timeout = '30s';

update public.binder_feature_flags
set enabled = true
where flag_key in (
  'schema_internal',
  'personal',
  'shared',
  'public',
  'community',
  'custom'
);

insert into auth.users (
  id,
  email,
  is_sso_user,
  is_anonymous,
  created_at,
  updated_at
) values
  (
    'ba000000-0000-0000-0000-000000000001',
    'binder-load-owner@example.test',
    false,
    false,
    now(),
    now()
  ),
  (
    'ba000000-0000-0000-0000-000000000002',
    'binder-load-contributor@example.test',
    false,
    false,
    now(),
    now()
  );

-- Fill the Binder to the V1 active-member ceiling. The owner and primary
-- contributor above are joined by 48 read-only collaborators.
insert into auth.users (
  id,
  email,
  is_sso_user,
  is_anonymous,
  created_at,
  updated_at
)
select
  md5('binder-load-user-' || member_number::text)::uuid,
  'binder-load-member-' || member_number::text || '@example.test',
  false,
  false,
  now(),
  now()
from generate_series(3, 50) member_number;

insert into public.sets (id, game, code, name)
values (
  'ba100000-0000-0000-0000-000000000001',
  'pokemon',
  'BLD',
  'Binder Load Probe'
);

create temporary table binder_load_cards (
  sequence_number integer primary key,
  card_print_id uuid not null unique
) on commit drop;

insert into binder_load_cards (sequence_number, card_print_id)
select
  sequence_number,
  md5('binder-load-card-' || sequence_number::text)::uuid
from generate_series(1, 1000) sequence_number;

insert into public.card_prints (
  id,
  game_id,
  set_id,
  name,
  number,
  set_code,
  gv_id,
  image_source,
  image_path
)
select
  cards.card_print_id,
  (select id from public.games where code = 'pokemon'),
  'ba100000-0000-0000-0000-000000000001',
  'Binder Load Card ' || cards.sequence_number::text,
  cards.sequence_number::text,
  'BLD',
  'GV-BLD-' || lpad(cards.sequence_number::text, 4, '0'),
  'identity',
  'binder-load/GV-BLD-' || lpad(cards.sequence_number::text, 4, '0') || '/front.webp'
from binder_load_cards cards;

insert into public.vault_owners (
  user_id,
  owner_code,
  next_instance_index
) values (
  'ba000000-0000-0000-0000-000000000002',
  'BLD1',
  25001
);

insert into public.binders (
  id,
  public_id,
  owner_user_id,
  title,
  target_kind,
  checklist_mode,
  read_access,
  discoverability,
  join_policy,
  contribution_policy
) values (
  'ba200000-0000-0000-0000-000000000001',
  'ba210000-0000-0000-0000-000000000001',
  'ba000000-0000-0000-0000-000000000001',
  'Binder 25K Load Probe',
  'custom',
  'custom',
  'public',
  'listed',
  'closed',
  'members_direct'
);

insert into public.binder_members (
  id,
  binder_id,
  user_id,
  role,
  state,
  membership_epoch,
  joined_at,
  content_scope,
  content_consent_epoch,
  content_consent_revision
) values
  (
    'ba300000-0000-0000-0000-000000000001',
    'ba200000-0000-0000-0000-000000000001',
    'ba000000-0000-0000-0000-000000000001',
    'owner',
    'active',
    1,
    now(),
    'public',
    1,
    1
  ),
  (
    'ba300000-0000-0000-0000-000000000002',
    'ba200000-0000-0000-0000-000000000001',
    'ba000000-0000-0000-0000-000000000002',
    'contributor',
    'active',
    1,
    now(),
    'public',
    1,
    1
  );

insert into public.binder_members (
  id,
  binder_id,
  user_id,
  role,
  state,
  membership_epoch,
  joined_at
)
select
  md5('binder-load-member-' || member_number::text)::uuid,
  'ba200000-0000-0000-0000-000000000001',
  md5('binder-load-user-' || member_number::text)::uuid,
  'viewer',
  'active',
  1,
  now()
from generate_series(3, 50) member_number;

do $$
begin
  if (
    select count(*)
    from public.binder_members
    where binder_id = 'ba200000-0000-0000-0000-000000000001'
      and state = 'active'
  ) <> 50 then
    raise exception 'load_probe_active_member_count_mismatch';
  end if;
end;
$$;

insert into public.binder_custom_revisions (
  id,
  binder_id,
  revision,
  created_by_user_id
) values (
  'ba400000-0000-0000-0000-000000000001',
  'ba200000-0000-0000-0000-000000000001',
  1,
  'ba000000-0000-0000-0000-000000000001'
);

insert into public.binder_custom_slots (
  id,
  revision_id,
  binder_id,
  definition_revision,
  card_print_id,
  position,
  required_quantity,
  active
)
select
  md5('binder-load-slot-' || cards.sequence_number::text)::uuid,
  'ba400000-0000-0000-0000-000000000001',
  'ba200000-0000-0000-0000-000000000001',
  1,
  cards.card_print_id,
  cards.sequence_number - 1,
  1,
  true
from binder_load_cards cards;

create temporary table binder_load_instances (
  sequence_number integer primary key,
  vault_item_instance_id uuid not null unique,
  gv_vi_id text not null unique,
  card_print_id uuid not null
) on commit drop;

insert into binder_load_instances (
  sequence_number,
  vault_item_instance_id,
  gv_vi_id,
  card_print_id
)
select
  series.sequence_number,
  md5('binder-load-instance-' || series.sequence_number::text)::uuid,
  public.generate_gv_vi_id_v1('BLD1', series.sequence_number),
  cards.card_print_id
from generate_series(1, 25000) as series(sequence_number)
join binder_load_cards cards
  on cards.sequence_number = ((series.sequence_number - 1) % 1000) + 1;

insert into public.vault_item_instances (
  id,
  user_id,
  gv_vi_id,
  card_print_id
)
select
  instances.vault_item_instance_id,
  'ba000000-0000-0000-0000-000000000002',
  instances.gv_vi_id,
  instances.card_print_id
from binder_load_instances instances;

insert into public.binder_contributions (
  id,
  public_action_ref,
  binder_id,
  contributor_member_id,
  contributor_user_id,
  contributor_membership_epoch,
  vault_item_instance_id,
  state,
  snapshot_gv_vi_id,
  snapshot_card_print_id,
  source,
  added_by_user_id,
  activated_at
)
select
  md5('binder-load-contribution-' || instances.sequence_number::text)::uuid,
  md5('binder-load-action-' || instances.sequence_number::text)::uuid,
  'ba200000-0000-0000-0000-000000000001',
  'ba300000-0000-0000-0000-000000000002',
  'ba000000-0000-0000-0000-000000000002',
  1,
  instances.vault_item_instance_id,
  'active',
  instances.gv_vi_id,
  instances.card_print_id,
  'bulk',
  'ba000000-0000-0000-0000-000000000002',
  now()
from binder_load_instances instances;

analyze public.binder_custom_slots;
analyze public.binder_contributions;
analyze public.binder_members;
analyze public.vault_item_instances;

do $$
declare
  v_started_at timestamptz := clock_timestamp();
  v_elapsed_ms numeric;
  v_progress public.binder_progress_state%rowtype;
begin
  v_progress := public.binder_progress_recalculate_v1(
    'ba200000-0000-0000-0000-000000000001',
    'service',
    null,
    'canonical_catalog',
    'binder-load-progress'
  );
  v_elapsed_ms := extract(
    epoch from clock_timestamp() - v_started_at
  ) * 1000;

  if v_progress.total_slots <> 1000
     or v_progress.member_completed_slots <> 1000
     or v_progress.active_contribution_count <> 25000 then
    raise exception
      'load_probe_progress_mismatch: total=%, completed=%, contributions=%',
      v_progress.total_slots,
      v_progress.member_completed_slots,
      v_progress.active_contribution_count;
  end if;

  if v_elapsed_ms > 5000 then
    raise exception
      'load_probe_progress_too_slow: % ms exceeds 5000 ms',
      round(v_elapsed_ms, 2);
  end if;

  raise notice
    'BINDER_LOAD progress_recalculate_ms=% slots=% contributions=%',
    round(v_elapsed_ms, 2),
    v_progress.total_slots,
    v_progress.active_contribution_count;
end;
$$;

create temporary table binder_load_metrics (
  operation text not null,
  sample_number integer not null,
  elapsed_ms numeric not null,
  primary key (operation, sample_number)
) on commit drop;

grant select, insert on binder_load_metrics to authenticated;

set local role authenticated;
set local request.jwt.claim.sub = 'ba000000-0000-0000-0000-000000000001';

do $$
declare
  v_started_at timestamptz := clock_timestamp();
  v_elapsed_ms numeric;
  v_result jsonb;
begin
  v_result := public.binder_checklist_v1(
    'ba210000-0000-0000-0000-000000000001',
    'all',
    50,
    null
  );
  v_elapsed_ms := extract(
    epoch from clock_timestamp() - v_started_at
  ) * 1000;

  if jsonb_array_length(v_result -> 'items') <> 50 then
    raise exception 'load_probe_member_page_mismatch';
  end if;

  if v_elapsed_ms > 1000 then
    raise exception
      'load_probe_member_page_too_slow: % ms exceeds 1000 ms',
      round(v_elapsed_ms, 2);
  end if;

  raise notice
    'BINDER_LOAD member_checklist_50_ms=%',
    round(v_elapsed_ms, 2);
end;
$$;

do $$
declare
  v_started_at timestamptz := clock_timestamp();
  v_elapsed_ms numeric;
  v_result jsonb;
begin
  v_result := public.binder_public_checklist_v1(
    'ba210000-0000-0000-0000-000000000001',
    50,
    null
  );
  v_elapsed_ms := extract(
    epoch from clock_timestamp() - v_started_at
  ) * 1000;

  if jsonb_array_length(v_result -> 'items') <> 50 then
    raise exception 'load_probe_public_page_mismatch';
  end if;

  if v_elapsed_ms > 1500 then
    raise exception
      'load_probe_public_page_too_slow: % ms exceeds 1500 ms',
      round(v_elapsed_ms, 2);
  end if;

  raise notice
    'BINDER_LOAD public_checklist_50_ms=%',
    round(v_elapsed_ms, 2);
end;
$$;

-- Warm each representative read path, then retain 20 timed samples.
-- The local target mirrors the Binder contract's p95 budget of 750 ms.
do $$
declare
  v_sample integer;
  v_started_at timestamptz;
  v_result jsonb;
begin
  perform public.binder_detail_v1(
    'ba210000-0000-0000-0000-000000000001'
  );
  perform public.binder_dashboard_v1(20, null, null);
  perform public.binder_checklist_v1(
    'ba210000-0000-0000-0000-000000000001',
    'all',
    50,
    null
  );

  for v_sample in 1..20 loop
    v_started_at := clock_timestamp();
    v_result := public.binder_detail_v1(
      'ba210000-0000-0000-0000-000000000001'
    );
    insert into binder_load_metrics (operation, sample_number, elapsed_ms)
    values (
      'detail',
      v_sample,
      extract(epoch from clock_timestamp() - v_started_at) * 1000
    );
    if v_result ->> 'ok' <> 'true'
       or (v_result #>> '{member_summary,member_count}')::integer <> 50 then
      raise exception 'load_probe_detail_result_mismatch';
    end if;

    v_started_at := clock_timestamp();
    v_result := public.binder_dashboard_v1(20, null, null);
    insert into binder_load_metrics (operation, sample_number, elapsed_ms)
    values (
      'dashboard',
      v_sample,
      extract(epoch from clock_timestamp() - v_started_at) * 1000
    );
    if v_result ->> 'ok' <> 'true'
       or jsonb_array_length(v_result -> 'items') <> 1 then
      raise exception 'load_probe_dashboard_result_mismatch';
    end if;

    v_started_at := clock_timestamp();
    v_result := public.binder_checklist_v1(
      'ba210000-0000-0000-0000-000000000001',
      'all',
      50,
      null
    );
    insert into binder_load_metrics (operation, sample_number, elapsed_ms)
    values (
      'checklist',
      v_sample,
      extract(epoch from clock_timestamp() - v_started_at) * 1000
    );
    if v_result ->> 'ok' <> 'true'
       or jsonb_array_length(v_result -> 'items') <> 50 then
      raise exception 'load_probe_checklist_result_mismatch';
    end if;
  end loop;
end;
$$;

-- Exercise lawful contribution writes as the contribution owner. Each cycle
-- withdraws one active copy and re-adds that same exact copy, returning the
-- Binder to the contracted 25,000-active-contribution ceiling.
set local request.jwt.claim.sub = 'ba000000-0000-0000-0000-000000000002';

do $$
declare
  v_sample integer;
  v_started_at timestamptz;
  v_result jsonb;
  v_contribution_id uuid := md5('binder-load-contribution-25000')::uuid;
  v_instance_id uuid := md5('binder-load-instance-25000')::uuid;
begin
  v_result := public.binder_contribution_withdraw_v1(
    v_contribution_id,
    'binder-load-withdraw-warmup'
  );
  if v_result ->> 'state' <> 'withdrawn' then
    raise exception 'load_probe_contribution_withdraw_warmup_mismatch';
  end if;
  v_result := public.binder_contribution_add_v1(
    'ba210000-0000-0000-0000-000000000001',
    v_instance_id,
    'binder-load-add-warmup',
    'manual'
  );
  if v_result ->> 'state' <> 'active' then
    raise exception 'load_probe_contribution_add_warmup_mismatch';
  end if;
  v_contribution_id := (v_result ->> 'contribution_id')::uuid;

  for v_sample in 1..20 loop
    v_started_at := clock_timestamp();
    v_result := public.binder_contribution_withdraw_v1(
      v_contribution_id,
      'binder-load-withdraw-' || v_sample::text
    );
    insert into binder_load_metrics (operation, sample_number, elapsed_ms)
    values (
      'contribution_withdraw',
      v_sample,
      extract(epoch from clock_timestamp() - v_started_at) * 1000
    );
    if v_result ->> 'state' <> 'withdrawn' then
      raise exception 'load_probe_contribution_withdraw_mismatch';
    end if;

    v_started_at := clock_timestamp();
    v_result := public.binder_contribution_add_v1(
      'ba210000-0000-0000-0000-000000000001',
      v_instance_id,
      'binder-load-add-' || v_sample::text,
      'manual'
    );
    insert into binder_load_metrics (operation, sample_number, elapsed_ms)
    values (
      'contribution_add',
      v_sample,
      extract(epoch from clock_timestamp() - v_started_at) * 1000
    );
    if v_result ->> 'state' <> 'active' then
      raise exception 'load_probe_contribution_add_mismatch';
    end if;
    v_contribution_id := (v_result ->> 'contribution_id')::uuid;
  end loop;

end;
$$;

do $$
declare
  v_row record;
begin
  for v_row in
    select
      operation,
      count(*) as sample_count,
      percentile_cont(0.95) within group (order by elapsed_ms) as p95_ms,
      max(elapsed_ms) as max_ms
    from binder_load_metrics
    group by operation
    order by operation
  loop
    if v_row.sample_count <> 20 then
      raise exception
        'load_probe_sample_count_mismatch: operation=% samples=%',
        v_row.operation,
        v_row.sample_count;
    end if;
    if v_row.p95_ms > 750 then
      raise exception
        'load_probe_p95_too_slow: operation=% p95=% ms exceeds 750 ms',
        v_row.operation,
        round(v_row.p95_ms::numeric, 2);
    end if;
    raise notice
      'BINDER_LOAD operation=% samples=% p95_ms=% max_ms=%',
      v_row.operation,
      v_row.sample_count,
      round(v_row.p95_ms::numeric, 2),
      round(v_row.max_ms::numeric, 2);
  end loop;

  if (select count(distinct operation) from binder_load_metrics) <> 5 then
    raise exception 'load_probe_operation_count_mismatch';
  end if;
end;
$$;

reset role;

do $$
begin
  if (
    select count(*)
    from public.binder_contributions
    where binder_id = 'ba200000-0000-0000-0000-000000000001'
      and state = 'active'
  ) <> 25000 then
    raise exception 'load_probe_contribution_ceiling_not_restored';
  end if;
end;
$$;

select
  'PASS' as result,
  50 as active_members,
  1000 as custom_slots,
  25000 as active_contributions,
  (
    select count(*)
    from public.binder_progress_crossings
    where binder_id = 'ba200000-0000-0000-0000-000000000001'
  ) as milestone_crossings;

rollback;
