begin;

create or replace function public.operations_supersede_catalog_reviews_v1(
  p_replacement_work_item_id uuid,
  p_review_work_item_keys text[]
)
returns table (
  replacement_work_item_id uuid,
  matched_review_count integer,
  superseded_review_count integer
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_replacement public.founder_work_items%rowtype;
  v_review public.founder_work_items%rowtype;
  v_review_key text;
  v_agent_key text;
  v_replacement_target_key text;
  v_replacement_target_prefix text;
  v_replacement_set_key text;
  v_review_game_code text;
  v_review_set_key text;
  v_matched integer := 0;
  v_superseded integer := 0;
begin
  perform public.operations_require_service_role_v1();

  if p_replacement_work_item_id is null then
    raise exception 'catalog_replacement_work_item_required';
  end if;
  if coalesce(cardinality(p_review_work_item_keys), 0) not between 1 and 16 then
    raise exception 'catalog_review_work_item_keys_invalid';
  end if;

  select * into v_replacement
  from public.founder_work_items
  where id = p_replacement_work_item_id
  for update;
  if not found then raise exception 'catalog_replacement_work_item_not_found'; end if;

  select agent_key into v_agent_key
  from public.operations_agents
  where id = v_replacement.agent_id;

  if v_replacement.domain <> 'catalog'
     or v_replacement.action_type <> 'execute_registered_outcome_workflow_v1'
     or coalesce((v_replacement.command_policy ->> 'execution_enabled')::boolean, false) is not true
     or v_replacement.state not in (
       'ready_for_review', 'deferred', 'approved', 'queued', 'running', 'succeeded'
     ) then
    raise exception 'executable_catalog_replacement_required';
  end if;

  v_replacement_target_key := lower(btrim(v_replacement.scope ->> 'target_key'));
  if array_length(string_to_array(v_replacement_target_key, ':'), 1) <> 2 then
    raise exception 'catalog_replacement_target_key_invalid';
  end if;
  v_replacement_target_prefix := split_part(v_replacement_target_key, ':', 1);
  v_replacement_set_key := split_part(v_replacement_target_key, ':', 2);

  for v_review_key in
    select distinct btrim(candidate_key)
    from unnest(p_review_work_item_keys) as candidate_key
  loop
    if v_review_key is null
       or v_review_key !~ '^catalog-set:[a-z0-9_.-]+:[a-z0-9_.-]+:[a-z0-9_.-]+$' then
      raise exception 'catalog_review_work_item_key_invalid';
    end if;

    select * into v_review
    from public.founder_work_items
    where work_item_key = v_review_key
    order by version desc
    limit 1
    for update;
    if not found then continue; end if;
    v_matched := v_matched + 1;

    if v_review.id = v_replacement.id
       or v_review.domain <> 'catalog'
       or v_review.work_item_type <> 'catalog_set_candidate_review'
       or v_review.action_type <> 'review_catalog_set_candidate'
       or coalesce((v_review.command_policy ->> 'execution_enabled')::boolean, true) is not false then
      raise exception 'catalog_review_work_item_boundary_mismatch';
    end if;

    v_review_game_code := lower(btrim(v_review.scope ->> 'game_code'));
    v_review_set_key := lower(btrim(coalesce(
      nullif(v_review.scope ->> 'source_set_id', ''),
      nullif(v_review.scope ->> 'source_code', '')
    )));
    if v_review_set_key is null
       or v_review_set_key = ''
       or v_review_set_key <> v_replacement_set_key
       or not (
         (v_review_game_code = 'pokemon'
           and v_replacement_target_prefix in ('pokemon_en', 'pokemon_jpn'))
         or (v_review_game_code = 'one_piece'
           and v_replacement_target_prefix = 'one_piece')
         or (v_review_game_code = 'mtg'
           and v_replacement_target_prefix = 'mtg')
       ) then
      raise exception 'catalog_review_replacement_target_mismatch';
    end if;

    if v_review.state = 'superseded' then continue; end if;
    if v_review.state not in ('ready_for_review', 'deferred', 'repair_requested') then
      continue;
    end if;

    update public.founder_work_items
    set state = 'superseded',
        state_reason = 'executable_catalog_outcome_published',
        updated_at = now()
    where id = v_review.id;

    insert into public.founder_work_item_events (
      work_item_id, event_type, actor_type, actor_key, payload
    ) values (
      v_review.id,
      'superseded',
      'agent',
      v_agent_key,
      jsonb_build_object(
        'replacement_work_item_id', v_replacement.id,
        'replacement_work_item_key', v_replacement.work_item_key,
        'replacement_plan_fingerprint', v_replacement.plan_fingerprint,
        'reason', 'executable_catalog_outcome_published'
      )
    );
    v_superseded := v_superseded + 1;
  end loop;

  return query select v_replacement.id, v_matched, v_superseded;
end;
$$;

revoke all on function public.operations_supersede_catalog_reviews_v1(uuid, text[])
  from public, anon, authenticated;
grant execute on function public.operations_supersede_catalog_reviews_v1(uuid, text[])
  to service_role;

comment on function public.operations_supersede_catalog_reviews_v1(uuid, text[]) is
'Service-only queue hygiene. Supersedes unresolved review-only catalog proposals after a matching executable outcome exists; preserves immutable history and performs no canonical catalog writes.';

commit;
