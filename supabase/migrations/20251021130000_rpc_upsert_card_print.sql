-- Idempotent RPC to upsert into public.card_prints by (set_code, number)
-- Falls back to INSERT/UPDATE without relying on a unique constraint.
-- SECURITY DEFINER so authenticated clients and Edge Functions without service key can write safely.

create or replace function public.upsert_card_print(
  in p_set_code text,
  in p_number   text,
  in p_name     text,
  in p_image_url text default null
)
returns public.card_prints
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_row public.card_prints;
begin
  -- Normalize inputs
  p_set_code := nullif(trim(p_set_code), '');
  p_number   := nullif(trim(p_number), '');
  if p_set_code is null or p_number is null then
    raise exception 'missing set_code/number';
  end if;

  -- Try to find an existing row by set_code+number (case-insensitive on number)
  select id into v_id
  from public.card_prints
  where set_code = p_set_code
    and lower(coalesce(number,'')) = lower(p_number)
  limit 1;

  if v_id is null then
    -- Insert
    insert into public.card_prints (set_code, number, name, image_url)
    values (p_set_code, p_number, coalesce(nullif(p_name,''),'Card'), nullif(p_image_url,''))
    returning * into v_row;
  else
    -- Update minimal fields, preserving curated data
    update public.card_prints cp
    set name = coalesce(cp.name, coalesce(nullif(p_name,''),'Card')),
        image_url = coalesce(cp.image_url, nullif(p_image_url,'')),
        updated_at = now()
    where cp.id = v_id
    returning * into v_row;
  end if;

  return v_row;
end;
$$;

grant execute on function public.upsert_card_print(text, text, text, text) to authenticated;

