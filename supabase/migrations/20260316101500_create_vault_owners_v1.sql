create table public.vault_owners (
  user_id uuid primary key references auth.users(id) on delete cascade,
  owner_code text not null unique,
  next_instance_index bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vault_owners_owner_code_not_blank
    check (btrim(owner_code) <> ''),
  constraint vault_owners_owner_code_normalized
    check (owner_code = upper(btrim(owner_code))),
  constraint vault_owners_next_instance_index_positive
    check (next_instance_index >= 1)
);

comment on table public.vault_owners is
'Vault owner namespace registry. One row per auth user; stores immutable public-safe owner_code and per-owner GVVI allocator state.';

create or replace function public.generate_owner_code_v1()
returns text
language sql
volatile
as $$
  select upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
$$;

create or replace function public.ensure_vault_owner_v1(p_user_id uuid)
returns public.vault_owners
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.vault_owners%rowtype;
  v_attempt integer := 0;
begin
  if p_user_id is null then
    raise exception 'p_user_id is required';
  end if;

  select *
  into v_row
  from public.vault_owners
  where user_id = p_user_id;

  if found then
    return v_row;
  end if;

  loop
    v_attempt := v_attempt + 1;

    if v_attempt > 20 then
      raise exception 'vault_owner_code_allocation_failed';
    end if;

    begin
      insert into public.vault_owners (
        user_id,
        owner_code
      )
      values (
        p_user_id,
        public.generate_owner_code_v1()
      )
      on conflict (user_id) do nothing
      returning *
      into v_row;

      if found then
        return v_row;
      end if;

      select *
      into v_row
      from public.vault_owners
      where user_id = p_user_id;

      if found then
        return v_row;
      end if;
    exception
      when unique_violation then
        select *
        into v_row
        from public.vault_owners
        where user_id = p_user_id;

        if found then
          return v_row;
        end if;
    end;
  end loop;
end;
$$;

revoke all on function public.generate_owner_code_v1()
from public, anon, authenticated;

grant execute on function public.generate_owner_code_v1()
to service_role;

revoke all on function public.ensure_vault_owner_v1(uuid)
from public, anon, authenticated;

grant execute on function public.ensure_vault_owner_v1(uuid)
to service_role;

create trigger trg_vault_owners_updated_at
before update on public.vault_owners
for each row
execute function public.set_timestamp_updated_at();

alter table public.vault_owners enable row level security;

drop policy if exists service_role_only on public.vault_owners;
create policy service_role_only
on public.vault_owners
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
