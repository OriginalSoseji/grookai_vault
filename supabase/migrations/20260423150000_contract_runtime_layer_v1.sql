begin;

create table if not exists public.contract_violations (
  id uuid primary key default gen_random_uuid(),
  contract_name text not null,
  violation_type text not null,
  severity text not null check (severity in ('hard_fail', 'quarantine')),
  execution_name text not null,
  actor_type text not null,
  actor_id text null,
  source_worker text null,
  source_api text null,
  source_payload_hash text not null,
  payload_snapshot jsonb not null,
  reason text not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz null,
  resolved_by text null,
  resolution_notes text null
);

create index if not exists idx_contract_violations_contract_created_at
  on public.contract_violations (contract_name, created_at desc);

create index if not exists idx_contract_violations_execution_created_at
  on public.contract_violations (execution_name, created_at desc);

create index if not exists idx_contract_violations_payload_hash
  on public.contract_violations (source_payload_hash);

comment on table public.contract_violations is
  'Append-only contract runtime evidence ledger for blocked or quarantined canon-affecting writes.';

create or replace function public.guard_contract_violations_append_only_v1()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'contract_violations is append-only';
  end if;

  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id
      or new.contract_name is distinct from old.contract_name
      or new.violation_type is distinct from old.violation_type
      or new.severity is distinct from old.severity
      or new.execution_name is distinct from old.execution_name
      or new.actor_type is distinct from old.actor_type
      or new.actor_id is distinct from old.actor_id
      or new.source_worker is distinct from old.source_worker
      or new.source_api is distinct from old.source_api
      or new.source_payload_hash is distinct from old.source_payload_hash
      or new.payload_snapshot is distinct from old.payload_snapshot
      or new.reason is distinct from old.reason
      or new.created_at is distinct from old.created_at then
      raise exception 'contract_violations historical evidence is immutable';
    end if;

    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_contract_violations_append_only_v1 on public.contract_violations;
create trigger trg_contract_violations_append_only_v1
before update or delete on public.contract_violations
for each row
execute function public.guard_contract_violations_append_only_v1();

create table if not exists public.quarantine_records (
  id uuid primary key default gen_random_uuid(),
  source_system text not null,
  execution_name text not null,
  contract_name text not null,
  quarantine_reason text not null,
  source_payload_hash text not null,
  payload_snapshot jsonb not null,
  canonical_write_blocked boolean not null default true check (canonical_write_blocked = true),
  created_at timestamptz not null default now(),
  resolved_at timestamptz null,
  resolved_by text null,
  resolution_outcome text null,
  resolution_notes text null
);

create index if not exists idx_quarantine_records_contract_created_at
  on public.quarantine_records (contract_name, created_at desc);

create index if not exists idx_quarantine_records_execution_created_at
  on public.quarantine_records (execution_name, created_at desc);

create index if not exists idx_quarantine_records_payload_hash
  on public.quarantine_records (source_payload_hash);

comment on table public.quarantine_records is
  'Append-only preservation lane for ambiguous or conflicting payloads that are blocked from canon.';

create or replace function public.guard_quarantine_records_append_only_v1()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'quarantine_records is append-only';
  end if;

  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id
      or new.source_system is distinct from old.source_system
      or new.execution_name is distinct from old.execution_name
      or new.contract_name is distinct from old.contract_name
      or new.quarantine_reason is distinct from old.quarantine_reason
      or new.source_payload_hash is distinct from old.source_payload_hash
      or new.payload_snapshot is distinct from old.payload_snapshot
      or new.canonical_write_blocked is distinct from old.canonical_write_blocked
      or new.created_at is distinct from old.created_at then
      raise exception 'quarantine_records historical evidence is immutable';
    end if;

    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_quarantine_records_append_only_v1 on public.quarantine_records;
create trigger trg_quarantine_records_append_only_v1
before update or delete on public.quarantine_records
for each row
execute function public.guard_quarantine_records_append_only_v1();

commit;
