create or replace function public.refresh_latest_card_prices_mv()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    perform 1
    from pg_indexes
    where schemaname=''public''
      and tablename=''latest_card_prices_mv''
      and indexname=''uq_latest_card_prices_mv'';

    if found then
      execute ''refresh materialized view concurrently public.latest_card_prices_mv'';
    else
      execute ''refresh materialized view public.latest_card_prices_mv'';
    end if;
  exception when others then
    execute ''refresh materialized view public.latest_card_prices_mv'';
  end;
end
$$;

grant execute on function public.refresh_latest_card_prices_mv() to authenticated, service_role;

create or replace function public.job_log(p_job_id uuid, p_level text, p_message text, p_meta jsonb default null)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.job_logs(job_id, level, message, meta)
  values (p_job_id, coalesce(p_level,''info''), p_message, p_meta);
$$;

grant execute on function public.job_log(uuid, text, text, jsonb) to service_role;

create or replace function public.enqueue_refresh_latest_card_prices()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.jobs
    where name = ''refresh_latest_card_prices_mv''
      and status in (''queued'',''running'')
  ) then
    insert into public.jobs(name, payload, status, scheduled_at)
    values ('',
      ''refresh_latest_card_prices_mv'',
      jsonb_build_object(''reason'', tg_op),
      ''queued'',
      now()
    );
  end if;
  return null;
end
$$;

drop trigger if exists trg_queue_refresh_latest_card_prices on public.card_prices;
create trigger trg_queue_refresh_latest_card_prices
after insert or update or delete on public.card_prices
for each statement
execute function public.enqueue_refresh_latest_card_prices();

create or replace function public.process_jobs(p_limit int default 25)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.jobs%rowtype;
  v_handled int := 0;
begin
  loop
    with next as (
      select id from public.jobs
      where status = ''queued'' and scheduled_at <= now()
      order by scheduled_at asc, created_at asc
      limit 1
      for update skip locked
    )
    update public.jobs j
       set status=''running'', started_at=now(), attempts=j.attempts+1
     where j.id in (select id from next)
     returning j.* into v_job;

    if not found then exit; end if;

    begin
      perform public.job_log(v_job.id, ''info'', ''Starting job'', jsonb_build_object(''name'', v_job.name));

      if v_job.name = ''refresh_latest_card_prices_mv'' then
        perform public.refresh_latest_card_prices_mv();
      else
        perform public.job_log(v_job.id, ''warning'', ''Unknown job name; marking finished'', jsonb_build_object(''name'', v_job.name));
      end if;

      update public.jobs set status=''finished'', finished_at=now() where id=v_job.id;
      v_handled := v_handled + 1;

    exception when others then
      update public.jobs
         set status = case when attempts < max_attempts then ''queued'' else ''failed'' end,
             last_error = left(sqlerrm, 1000),
             scheduled_at = now() + interval ''1 minute''
       where id = v_job.id;
      perform public.job_log(v_job.id, ''error'', ''Job failed'', jsonb_build_object(''error'', sqlerrm));
    end;

    exit when v_handled >= p_limit;
  end loop;
  return v_handled;
end
$$;

grant execute on function public.process_jobs(int) to service_role;
