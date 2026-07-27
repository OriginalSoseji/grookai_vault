-- Restore the Japanese master-identity evidence and family-review surfaces
-- that exist in production but were created outside repository migrations.
-- This migration is schema-only and intentionally performs no row mutation.

begin;

create or replace function public.set_master_identity_graph_jpn_review_tables_updated_at_v1()
returns trigger
language plpgsql
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

create table if not exists public.card_print_identity_source_evidence (
  id uuid not null default gen_random_uuid(),
  card_print_identity_id uuid not null,
  card_print_id uuid not null,
  acquisition_key text not null,
  source_key text not null,
  evidence_key_hash text not null,
  evidence_subject jsonb not null default '{}'::jsonb,
  evidence_payload jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint card_print_identity_source_evidence_pkey
    primary key (id),
  constraint card_print_identity_source_evidence_card_print_identity_id_fkey
    foreign key (card_print_identity_id)
    references public.card_print_identity(id)
    on delete cascade,
  constraint card_print_identity_source_evidence_card_print_id_fkey
    foreign key (card_print_id)
    references public.card_prints(id)
    on delete cascade,
  constraint card_print_identity_source_evidence_subject_object_chk
    check (jsonb_typeof(evidence_subject) = 'object'::text),
  constraint card_print_identity_source_evidence_payload_object_chk
    check (jsonb_typeof(evidence_payload) = 'object'::text)
);

create table if not exists public.card_print_family_review_queue (
  id uuid not null default gen_random_uuid(),
  card_print_identity_id uuid not null,
  card_print_id uuid not null,
  acquisition_key text not null,
  family_status text not null,
  family_candidate_source text not null,
  normalized_family_candidate text not null,
  review_status text not null default 'pending'::text,
  family_link_promotion_allowed boolean not null default false,
  review_key_hash text not null,
  evidence_subject jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint card_print_family_review_queue_pkey
    primary key (id),
  constraint card_print_family_review_queue_card_print_identity_id_fkey
    foreign key (card_print_identity_id)
    references public.card_print_identity(id)
    on delete cascade,
  constraint card_print_family_review_queue_card_print_id_fkey
    foreign key (card_print_id)
    references public.card_prints(id)
    on delete cascade,
  constraint card_print_family_review_queue_evidence_subject_object_chk
    check (jsonb_typeof(evidence_subject) = 'object'::text),
  constraint card_print_family_review_queue_review_status_chk
    check (
      review_status = any (
        array[
          'pending'::text,
          'accepted_for_future_promotion'::text,
          'approved_for_family_link_promotion'::text,
          'rejected'::text,
          'superseded'::text
        ]
      )
    ),
  constraint card_print_family_review_queue_promotion_allowed_status_chk
    check (
      family_link_promotion_allowed = false
      or review_status = any (
        array[
          'accepted_for_future_promotion'::text,
          'approved_for_family_link_promotion'::text
        ]
      )
    )
);

-- If either table already existed, fail closed on incomplete column recovery
-- instead of silently accepting a partial out-of-band schema.
do $block$
declare
  missing_columns text;
begin
  select string_agg(expected.column_name, ', ' order by expected.column_name)
  into missing_columns
  from (
    values
      ('card_print_identity_source_evidence', 'id'),
      ('card_print_identity_source_evidence', 'card_print_identity_id'),
      ('card_print_identity_source_evidence', 'card_print_id'),
      ('card_print_identity_source_evidence', 'acquisition_key'),
      ('card_print_identity_source_evidence', 'source_key'),
      ('card_print_identity_source_evidence', 'evidence_key_hash'),
      ('card_print_identity_source_evidence', 'evidence_subject'),
      ('card_print_identity_source_evidence', 'evidence_payload'),
      ('card_print_identity_source_evidence', 'active'),
      ('card_print_identity_source_evidence', 'created_at'),
      ('card_print_identity_source_evidence', 'updated_at'),
      ('card_print_family_review_queue', 'id'),
      ('card_print_family_review_queue', 'card_print_identity_id'),
      ('card_print_family_review_queue', 'card_print_id'),
      ('card_print_family_review_queue', 'acquisition_key'),
      ('card_print_family_review_queue', 'family_status'),
      ('card_print_family_review_queue', 'family_candidate_source'),
      ('card_print_family_review_queue', 'normalized_family_candidate'),
      ('card_print_family_review_queue', 'review_status'),
      ('card_print_family_review_queue', 'family_link_promotion_allowed'),
      ('card_print_family_review_queue', 'review_key_hash'),
      ('card_print_family_review_queue', 'evidence_subject'),
      ('card_print_family_review_queue', 'active'),
      ('card_print_family_review_queue', 'reviewed_by'),
      ('card_print_family_review_queue', 'reviewed_at'),
      ('card_print_family_review_queue', 'created_at'),
      ('card_print_family_review_queue', 'updated_at')
  ) as expected(table_name, column_name)
  where not exists (
    select 1
    from information_schema.columns columns
    where columns.table_schema = 'public'
      and columns.table_name = expected.table_name
      and columns.column_name = expected.column_name
  );

  if missing_columns is not null then
    raise exception
      'MASTER_IDENTITY_GRAPH_JPN_REVIEW_SCHEMA_REPAIR_V1 missing required columns: %',
      missing_columns;
  end if;
end;
$block$;

-- Reconcile constraints only when their exact named contract is absent.
do $block$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'card_print_identity_source_evidence_pkey'
      and conrelid =
        'public.card_print_identity_source_evidence'::regclass
  ) then
    alter table public.card_print_identity_source_evidence
      add constraint card_print_identity_source_evidence_pkey
      primary key (id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname =
      'card_print_identity_source_evidence_card_print_identity_id_fkey'
      and conrelid =
        'public.card_print_identity_source_evidence'::regclass
  ) then
    alter table public.card_print_identity_source_evidence
      add constraint
        card_print_identity_source_evidence_card_print_identity_id_fkey
      foreign key (card_print_identity_id)
      references public.card_print_identity(id)
      on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'card_print_family_review_queue_pkey'
      and conrelid =
        'public.card_print_family_review_queue'::regclass
  ) then
    alter table public.card_print_family_review_queue
      add constraint card_print_family_review_queue_pkey
      primary key (id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'card_print_identity_source_evidence_card_print_id_fkey'
      and conrelid =
        'public.card_print_identity_source_evidence'::regclass
  ) then
    alter table public.card_print_identity_source_evidence
      add constraint card_print_identity_source_evidence_card_print_id_fkey
      foreign key (card_print_id)
      references public.card_prints(id)
      on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname =
      'card_print_identity_source_evidence_subject_object_chk'
      and conrelid =
        'public.card_print_identity_source_evidence'::regclass
  ) then
    alter table public.card_print_identity_source_evidence
      add constraint
        card_print_identity_source_evidence_subject_object_chk
      check (jsonb_typeof(evidence_subject) = 'object'::text);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname =
      'card_print_identity_source_evidence_payload_object_chk'
      and conrelid =
        'public.card_print_identity_source_evidence'::regclass
  ) then
    alter table public.card_print_identity_source_evidence
      add constraint
        card_print_identity_source_evidence_payload_object_chk
      check (jsonb_typeof(evidence_payload) = 'object'::text);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname =
      'card_print_family_review_queue_card_print_identity_id_fkey'
      and conrelid =
        'public.card_print_family_review_queue'::regclass
  ) then
    alter table public.card_print_family_review_queue
      add constraint
        card_print_family_review_queue_card_print_identity_id_fkey
      foreign key (card_print_identity_id)
      references public.card_print_identity(id)
      on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'card_print_family_review_queue_card_print_id_fkey'
      and conrelid =
        'public.card_print_family_review_queue'::regclass
  ) then
    alter table public.card_print_family_review_queue
      add constraint card_print_family_review_queue_card_print_id_fkey
      foreign key (card_print_id)
      references public.card_prints(id)
      on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname =
      'card_print_family_review_queue_evidence_subject_object_chk'
      and conrelid =
        'public.card_print_family_review_queue'::regclass
  ) then
    alter table public.card_print_family_review_queue
      add constraint
        card_print_family_review_queue_evidence_subject_object_chk
      check (jsonb_typeof(evidence_subject) = 'object'::text);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'card_print_family_review_queue_review_status_chk'
      and conrelid =
        'public.card_print_family_review_queue'::regclass
  ) then
    alter table public.card_print_family_review_queue
      add constraint card_print_family_review_queue_review_status_chk
      check (
        review_status = any (
          array[
            'pending'::text,
            'accepted_for_future_promotion'::text,
            'approved_for_family_link_promotion'::text,
            'rejected'::text,
            'superseded'::text
          ]
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname =
      'card_print_family_review_queue_promotion_allowed_status_chk'
      and conrelid =
        'public.card_print_family_review_queue'::regclass
  ) then
    alter table public.card_print_family_review_queue
      add constraint
        card_print_family_review_queue_promotion_allowed_status_chk
      check (
        family_link_promotion_allowed = false
        or review_status = any (
          array[
            'accepted_for_future_promotion'::text,
            'approved_for_family_link_promotion'::text
          ]
        )
      );
  end if;
end;
$block$;

create index if not exists
  idx_card_print_identity_source_evidence_card_print_id_v1
  on public.card_print_identity_source_evidence (card_print_id);

create index if not exists
  idx_card_print_identity_source_evidence_hash_v1
  on public.card_print_identity_source_evidence (evidence_key_hash);

create index if not exists
  idx_card_print_identity_source_evidence_source_key_v1
  on public.card_print_identity_source_evidence (source_key, active);

create unique index if not exists
  uq_card_print_identity_source_evidence_active_lane_v1
  on public.card_print_identity_source_evidence (
    card_print_identity_id,
    source_key,
    acquisition_key
  )
  where active;

create index if not exists
  idx_card_print_family_review_queue_card_print_id_v1
  on public.card_print_family_review_queue (card_print_id);

create index if not exists
  idx_card_print_family_review_queue_hash_v1
  on public.card_print_family_review_queue (review_key_hash);

create index if not exists
  idx_card_print_family_review_queue_status_v1
  on public.card_print_family_review_queue (review_status, active);

create unique index if not exists
  uq_card_print_family_review_queue_active_key_v1
  on public.card_print_family_review_queue (
    card_print_identity_id,
    family_candidate_source,
    normalized_family_candidate
  )
  where active;

drop trigger if exists
  trg_card_print_identity_source_evidence_updated_at_v1
  on public.card_print_identity_source_evidence;

create trigger trg_card_print_identity_source_evidence_updated_at_v1
before update on public.card_print_identity_source_evidence
for each row
execute function
  public.set_master_identity_graph_jpn_review_tables_updated_at_v1();

drop trigger if exists
  trg_card_print_family_review_queue_updated_at_v1
  on public.card_print_family_review_queue;

create trigger trg_card_print_family_review_queue_updated_at_v1
before update on public.card_print_family_review_queue
for each row
execute function
  public.set_master_identity_graph_jpn_review_tables_updated_at_v1();

alter table public.card_print_identity_source_evidence
  enable row level security;
alter table public.card_print_family_review_queue
  enable row level security;

drop policy if exists
  card_print_identity_source_evidence_deny_anon_v1
  on public.card_print_identity_source_evidence;
create policy card_print_identity_source_evidence_deny_anon_v1
  on public.card_print_identity_source_evidence
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists
  card_print_identity_source_evidence_deny_authenticated_v1
  on public.card_print_identity_source_evidence;
create policy card_print_identity_source_evidence_deny_authenticated_v1
  on public.card_print_identity_source_evidence
  for all
  to authenticated
  using (false)
  with check (false);

drop policy if exists
  card_print_family_review_queue_deny_anon_v1
  on public.card_print_family_review_queue;
create policy card_print_family_review_queue_deny_anon_v1
  on public.card_print_family_review_queue
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists
  card_print_family_review_queue_deny_authenticated_v1
  on public.card_print_family_review_queue;
create policy card_print_family_review_queue_deny_authenticated_v1
  on public.card_print_family_review_queue
  for all
  to authenticated
  using (false)
  with check (false);

revoke all on table
  public.card_print_identity_source_evidence
  from public, anon, authenticated, service_role;
revoke all on table
  public.card_print_family_review_queue
  from public, anon, authenticated, service_role;

grant select, insert, update on table
  public.card_print_identity_source_evidence
  to service_role;
grant select, insert, update on table
  public.card_print_family_review_queue
  to service_role;

comment on table public.card_print_identity_source_evidence is
  'MASTER_IDENTITY_GRAPH_JPN_V1: append-only source evidence lanes attached to card_print_identity rows. Internal service-role surface only.';

comment on table public.card_print_family_review_queue is
  'MASTER_IDENTITY_GRAPH_JPN_V1: review-only family candidate queue attached to card_print_identity rows. Inserts must not promote family links.';

commit;
