begin;

-- Operational receipts contain no CSV, notes, prices, bearer tokens or email.
-- Terminal rows are append-only through the API. Account deletion may cascade.
create table if not exists public.vault_import_receipts_v1 (
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  contract_version integer not null default 1 check (contract_version = 1),
  payload_sha256 text not null check (payload_sha256 ~ '^[0-9a-f]{64}$'),
  status text not null check (status in ('succeeded','failed')),
  stage text not null check (stage = 'vault_write'),
  started_at timestamptz not null,
  completed_at timestamptz not null,
  error_code text,
  error_detail text,
  result jsonb not null check (jsonb_typeof(result) = 'object'),
  primary key (user_id, request_id),
  check (completed_at >= started_at),
  check ((status = 'succeeded' and error_code is null and error_detail is null)
      or (status = 'failed' and error_code is not null and error_detail is not null))
);
alter table public.vault_import_receipts_v1 enable row level security;
alter table public.vault_import_receipts_v1 force row level security;
revoke all on public.vault_import_receipts_v1 from public, anon, authenticated, service_role;
grant select on public.vault_import_receipts_v1 to service_role;

create or replace function public.admin_import_vault_receipted_v1(
  p_user_id uuid, p_request_id uuid, p_rows jsonb
) returns jsonb language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  started timestamptz := clock_timestamp();
  fingerprint text;
  prior public.vault_import_receipts_v1%rowtype;
  outcome jsonb;
  failure_code text;
  failure_detail text;
begin
  if p_user_id is null or p_request_id is null then
    raise exception 'import_request_identity_required';
  end if;
  -- Bound work before admission. The authenticated Edge route applies stricter
  -- row/metadata validation. Invalid transport requests are not admitted jobs.
  if jsonb_typeof(p_rows) is distinct from 'array' then
    raise exception 'invalid_import_targets';
  end if;
  if jsonb_array_length(p_rows) not between 1 and 5000
     or octet_length(p_rows::text) > 2097152 then
    raise exception 'invalid_import_targets';
  end if;
  select encode(extensions.digest(convert_to(
    jsonb_agg(value order by value->>'cardId')::text, 'UTF8'), 'sha256'), 'hex')
    into fingerprint from jsonb_array_elements(p_rows);

  -- Same lock order as the original writer. Serialize receipt reuse and copy
  -- changes together, including callers using the original desired-total RPC.
  perform public.ensure_vault_owner_v1(p_user_id);
  perform 1 from public.vault_owners where user_id=p_user_id for update;
  if not found then raise exception 'import_owner_unavailable'; end if;
  select * into prior from public.vault_import_receipts_v1
    where user_id=p_user_id and request_id=p_request_id;
  if found then
    if prior.payload_sha256 <> fingerprint then
      return jsonb_build_object('success',false,'error','import_request_conflict','requestId',p_request_id);
    end if;
    return prior.result;
  end if;

  -- Catch outside the write subtransaction: a late failure rolls back every
  -- copy/anchor change while the terminal failure receipt can still commit.
  begin
    outcome := public.admin_import_vault_targets_v1(p_user_id,p_rows)
      || jsonb_build_object('success',true,'requestId',p_request_id);
  exception when others then
    get stacked diagnostics failure_code = returned_sqlstate, failure_detail = message_text;
    -- Never persist arbitrary database details that may contain input values.
    if failure_detail not in ('invalid_import_targets','invalid_import_quantity',
      'import_quantity_limit','duplicate_import_target','import_owner_unavailable',
      'import_card_identity_mismatch','invalid_import_condition') then
      failure_detail := 'database_write_failed';
    end if;
    outcome := jsonb_build_object('success',false,'requestId',p_request_id,
      'error',case when failure_code='GV001' then 'vault_paused' else 'import_outcome_unconfirmed' end);
  end;
  insert into public.vault_import_receipts_v1
    (user_id,request_id,payload_sha256,status,stage,started_at,completed_at,error_code,error_detail,result)
    values (p_user_id,p_request_id,fingerprint,
      case when failure_code is null then 'succeeded' else 'failed' end,
      'vault_write',started,greatest(started,clock_timestamp()),failure_code,failure_detail,outcome);
  -- Receipt insertion and successful copies share a transaction. Receipt-write
  -- failure cannot leave unrecorded committed copies from this route.
  return outcome;
end;
$$;
revoke all on function public.admin_import_vault_receipted_v1(uuid,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.admin_import_vault_receipted_v1(uuid,uuid,jsonb) to service_role;
commit;
