begin;

-- The incoming snapshot is fully revalidated immediately before this lineage
-- lookup. The originating decision was also fully validated by the decision
-- statement trigger when it was inserted. Keep this lookup focused on proving
-- that the immutable snapshot points to that exact publishable decision.
create or replace function public.guard_mtg_tcgplayer_finish_price_batch_v1()
returns trigger language plpgsql set search_path = '' as $$
declare row_data jsonb; matched boolean;
begin
  for row_data in
    select to_jsonb(incoming) from new_mtg_finish_price_rows incoming
    where incoming.mtg_printing_mapping_id is not null
      and (tg_table_name = 'market_price_publication_snapshots'
        or to_jsonb(incoming)->>'eligible' = 'true')
  loop
    if row_data->>'policy_version' <> 'TCGPLAYER_MARKET_PUBLICATION_POLICY_V1_3'
      or not public.mtg_tcgplayer_finish_price_row_valid_v1(row_data)
    then raise exception 'mtg_finish_price_mapping_invalid'; end if;
    if tg_table_name = 'market_price_qualification_decisions' then
      select exists (
        select 1 from public.market_price_pipeline_candidates candidate
        where candidate.id = (row_data->>'pipeline_candidate_id')::uuid
          and candidate.run_id = (row_data->>'run_id')::uuid
          and candidate.mtg_printing_mapping_id =
            (row_data->>'mtg_printing_mapping_id')::uuid
          and candidate.source_observation_id =
            (row_data->>'source_observation_id')::uuid
          and public.mtg_tcgplayer_finish_price_row_valid_v1(candidate.candidate_payload)
      ) into matched;
    else
      select exists (
        select 1 from public.market_price_qualification_decisions decision_row
        where decision_row.id = (row_data->>'qualification_decision_id')::uuid
          and decision_row.run_id = (row_data->>'run_id')::uuid
          and decision_row.source_observation_id =
            (row_data->>'source_observation_id')::uuid
          and decision_row.card_printing_id =
            (row_data->>'card_printing_id')::uuid
          and decision_row.mtg_printing_mapping_id =
            (row_data->>'mtg_printing_mapping_id')::uuid
          and decision_row.eligible
          and decision_row.decision = 'publish'
          and decision_row.publication_lane = 'current'
      ) into matched;
    end if;
    if not matched then raise exception 'mtg_finish_price_lineage_invalid'; end if;
  end loop;
  return null;
end;
$$;

revoke all on function public.guard_mtg_tcgplayer_finish_price_batch_v1() from public;

commit;
