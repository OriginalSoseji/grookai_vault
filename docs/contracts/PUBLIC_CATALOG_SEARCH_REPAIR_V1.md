# Public Catalog Search Repair V1

Date: 2026-09-12

Follow-up to the founder's request to remove account gates from MTG and One
Piece catalog browsing. The bounded database transition passed from 7a8beccff;
the live set pages now expose 946 MTG and 61 One Piece sets. Browser testing
found a separate, hard-coded search API login requirement.

Replace only that API requirement with the existing request-scoped
`catalog_game_visible_to_request_v1` RPC. A public release allows anonymous
search, a signed-in release requires an authenticated caller, a hidden release
remains hidden, and an unavailable/malformed RPC response fails closed. No
service-role reader is introduced. Pricing sorts and ownership remain private.

Production candidate scope is the live 598e17a4 application plus this focused
search repair; do not include the uncommitted presentation/image work. Preserve
live deployment dpl_FUV4PYKkv2DKBxpxmqJtWTQVj9u1 as the immediate rollback.
Do not replace the protected preview or the original pre-redesign recovery.
Use the existing complete shipcheck before freezing, build once with automatic
domain assignment disabled, verify the candidate before promotion, and verify
live search and pricing denial afterward. Restore the original domain-assignment
setting after verification. No database, Storage or mobile mutation is included.
