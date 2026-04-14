begin;

create or replace function public.public_collector_follow_counts_v1(
  p_user_id uuid
)
returns table (
  following_count bigint,
  follower_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    (
      select count(*)::bigint
      from public.collector_follows cf
      where cf.follower_user_id = p_user_id
    ) as following_count,
    (
      select count(*)::bigint
      from public.collector_follows cf
      where cf.followed_user_id = p_user_id
    ) as follower_count
$$;

revoke all on function public.public_collector_follow_counts_v1(uuid) from public;
grant execute on function public.public_collector_follow_counts_v1(uuid) to anon;
grant execute on function public.public_collector_follow_counts_v1(uuid) to authenticated;

commit;
