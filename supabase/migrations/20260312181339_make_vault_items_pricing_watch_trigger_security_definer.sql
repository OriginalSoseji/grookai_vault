BEGIN;

CREATE OR REPLACE FUNCTION public.vault_items_pricing_watch_user_vault_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
declare
  v_card_print_id uuid;
begin
  -- Use NEW.card_id; if it's null, there is nothing to watch.
  v_card_print_id := NEW.card_id;

  if v_card_print_id is null then
    return NEW;
  end if;

  -- Upsert a user_vault watch for this card_print_id.
  -- Rules:
  -- - watch_reason = 'user_vault'
  -- - priority: at least 95 (boost to 95 if lower)
  -- - refresh_interval_seconds: at most 600 (tighten if larger)
  -- - is_active: always true once a vault item exists
  -- - next_run_at: set to now() when first created; on update, we pull it forward
  --   if it's in the future so new vault activity can trigger a faster refresh.
  insert into public.pricing_watch as pw (
    card_print_id,
    watch_reason,
    priority,
    refresh_interval_seconds,
    next_run_at,
    is_active
  )
  values (
    v_card_print_id,
    'user_vault',
    95,
    600,
    now(),
    true
  )
  on conflict (card_print_id, watch_reason)
  do update
  set
    priority = greatest(pw.priority, 95),
    refresh_interval_seconds = least(pw.refresh_interval_seconds, 600),
    is_active = true,
    next_run_at = case
      when pw.next_run_at is null or pw.next_run_at > now() then now()
      else pw.next_run_at
    end;

  return NEW;
end;
$function$;

COMMIT;
