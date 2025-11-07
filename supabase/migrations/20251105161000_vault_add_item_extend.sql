-- Extend RPC: vault_add_item to accept qty, condition_label, grade_label
-- Backward compatible: keeps legacy params with defaults; callers omitting new fields still work.

create or replace function public.vault_add_item(
  p_user_id uuid,
  p_card_id text,
  p_grade text default null,
  p_condition text default null,
  p_qty integer default 1,
  p_condition_label text default null,
  p_grade_label text default null
)
returns uuid
language plpgsql
security definer
as $$
declare v_id uuid;
begin
  insert into public.vault_items(
    user_id,
    card_id,
    grade,
    condition,
    qty,
    condition_label,
    grade_label
  )
  values (
    p_user_id,
    p_card_id,
    p_grade,
    p_condition,
    greatest(1, coalesce(p_qty, 1)),
    p_condition_label,
    p_grade_label
  )
  returning id into v_id;
  return v_id;
end $$;

-- Best-effort grants
do $$ begin
  begin execute 'grant execute on function public.vault_add_item(uuid,text,text,text,integer,text,text) to authenticated'; exception when others then null; end;
end $$;

