# RLS/Grants Matrix (public schema)

| Object                      | READ (SELECT)         | WRITE (INSERT/UPDATE/DELETE) | EXECUTE |
|-----------------------------|-----------------------|-------------------------------|---------|
| view `wall_feed_v`          | anon, authenticated   | service_role only             | n/a     |
| rpc `wall_feed_list`        | n/a                   | n/a                           | anon, authenticated |
| table `listings`            | service_role only     | service_role only             | n/a     |
| table `listing_photos`      | service_role only     | service_role only             | n/a     |
| pricing/health base tables  | service_role only     | service_role only             | n/a     |

Notes
- Views/RPCs are exposed read-only to anon/auth.
- Base tables remain locked down (service_role).

