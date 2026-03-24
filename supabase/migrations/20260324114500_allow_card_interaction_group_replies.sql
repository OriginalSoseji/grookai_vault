begin;

drop policy if exists card_interactions_insert_sender on public.card_interactions;

create policy card_interactions_insert_sender
on public.card_interactions
for insert
to authenticated
with check (
  auth.uid() = sender_user_id
  and auth.uid() <> receiver_user_id
  and (
    exists (
      select 1
      from public.v_card_stream_v1 stream
      where stream.vault_item_id = card_interactions.vault_item_id
        and stream.owner_user_id = card_interactions.receiver_user_id
        and stream.card_print_id = card_interactions.card_print_id
    )
    or exists (
      select 1
      from public.card_interactions existing
      where existing.vault_item_id = card_interactions.vault_item_id
        and existing.card_print_id = card_interactions.card_print_id
        and (
          (
            existing.sender_user_id = card_interactions.sender_user_id
            and existing.receiver_user_id = card_interactions.receiver_user_id
          )
          or (
            existing.sender_user_id = card_interactions.receiver_user_id
            and existing.receiver_user_id = card_interactions.sender_user_id
          )
        )
    )
  )
);

commit;
