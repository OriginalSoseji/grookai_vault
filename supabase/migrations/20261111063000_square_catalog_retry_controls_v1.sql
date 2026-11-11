-- Persist provider backoff across process restarts, without changing requests.
begin;
alter table grookai_square.connections add column retry_after timestamptz;
create function public.square_connection_defer_v1(p_connection uuid,p_owner uuid,p_token uuid,p_fence bigint,p_seconds integer)
returns void language plpgsql volatile security definer set search_path='' as $$
declare c grookai_square.connections;
begin
  if p_seconds is null or p_seconds not between 1 and 3600 then raise exception 'square_invalid_retry_delay'; end if;
  select * into c from grookai_square.connections where id=p_connection and owner_id=p_owner for update;
  if c.id is null or c.lease_token is distinct from p_token or p_token is null or c.lease_fence is distinct from p_fence
    or coalesce(c.lease_until<=clock_timestamp(),true) then raise exception 'square_stale_lease'; end if;
  update grookai_square.connections set retry_after=greatest(coalesce(retry_after,clock_timestamp()),
    clock_timestamp()+make_interval(secs=>p_seconds)) where id=c.id;
end $$;
create function public.square_connection_authorization_failed_v1(p_connection uuid,p_owner uuid,p_token uuid,p_fence bigint)
returns void language plpgsql volatile security definer set search_path='' as $$
declare c grookai_square.connections;
begin
  select * into c from grookai_square.connections where id=p_connection and owner_id=p_owner for update;
  if c.id is null or c.lease_token is distinct from p_token or p_token is null or c.lease_fence is distinct from p_fence
    or coalesce(c.lease_until<=clock_timestamp(),true) then raise exception 'square_stale_lease'; end if;
  update grookai_square.connections set status='reconnect_required' where id=c.id;
end $$;
create function public.square_poll_v3(p_environment text,p_limit integer default 10) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if p_environment is null or p_environment not in ('sandbox','production') or p_limit is null or p_limit not between 1 and 25
    then raise exception 'square_invalid_limit'; end if;
  return coalesce((select jsonb_agg(row) from (
    select candidate.id as "targetId",c.id as "connectionId",c.owner_id as "ownerId"
    from grookai_square.connections c cross join grookai_square.controls ctl
    cross join lateral (select t.id,t.updated_at from grookai_square.targets t
      left join grookai_square.operations op on op.target_id=t.id and op.status in ('prepared','sending','uncertain')
      where t.connection_id=c.id and (t.selected or op.id is not null)
      order by (op.id is not null) desc,t.updated_at,t.id limit 1) candidate
    where ctl.singleton and ctl.catalog_enabled and c.owner_id=any(ctl.owner_allowlist)
      and c.environment=p_environment and c.status='connected' and c.auto_sync
      and (c.retry_after is null or c.retry_after<=statement_timestamp())
    order by candidate.updated_at,c.id limit p_limit) row),'[]'::jsonb);
end $$;
revoke all on function public.square_connection_defer_v1(uuid,uuid,uuid,bigint,integer),
  public.square_connection_authorization_failed_v1(uuid,uuid,uuid,bigint),public.square_poll_v3(text,integer) from public,anon,authenticated,service_role;
grant execute on function public.square_connection_defer_v1(uuid,uuid,uuid,bigint,integer),
  public.square_connection_authorization_failed_v1(uuid,uuid,uuid,bigint),public.square_poll_v3(text,integer) to service_role;
commit;
