# Exact mapping planner connection V1

The legacy planner accepts only the dedicated `grookai_pricing_reader_v1` login
for production. `exact_mapping_reader_connection_v1.mjs` pins the pooler username
`grookai_pricing_reader_v1.ycdxbpibncqcchqiihfz`, literal host
`aws-1-us-east-2.pooler.supabase.com`, explicit session port `5432`, and database
`postgres`. Broad `postgres` login, another role/project/host, port `6543`, encoded
role/host spelling, query parameters and fragments fail before client creation.
The reader policy rejects apply mode and `NODE_TLS_REJECT_UNAUTHORIZED=0`.
TLS verification and an authenticated stream are required. Read-only startup
options apply before the explicit read-only transaction.

After connecting, one fixed catalog SELECT requires `session_user` and
`current_user` to both equal the direct reader role (no elevated login followed
by SET ROLE), transaction/default read-only settings both on, LOGIN true and
SUPERUSER/CREATEDB/CREATEROLE/REPLICATION/BYPASSRLS/INHERIT all false. Any role
membership, missing attribute, missing row or multiple result rows rejects the
connection. Failure closes the client before planning queries; connection and
session-query errors have fixed sanitized diagnostics.

This code does **not** create the role, establish that it exists, or qualify its
effective ACL. PUBLIC grants, function execution, inherited object privileges,
RLS/table coverage and server credential/runtime confinement need independent
qualification. Safe receipt metadata explicitly says `full_acl_qualified:false`.
Other historical executor routes retain their separate role policies; the new
reader helper does not claim that every executor is confined to this account.

Loopback connections are permitted only for the existing
`grookai_mapping_authority_*` isolated fixture database convention. Both planner
receipts record `database_target.kind` as `isolated_local_fixture` or
`production_project`, including truthful verified-TLS and read-only-startup flags.
Production receipts also include the verified direct reader role and session
check; fixture receipts do not claim a production role check.
Fixture execution does not prove production readiness. Candidate matching and
mapping policies are unchanged.

The mapping executor rejects a plan explicitly labelled `isolated_local_fixture`
when apply targets production, before constructing its database client. Local
fixture applies and remote read-only comparisons remain available. Historical
receipts without this new field retain their existing separate provenance gates;
this guard does not certify or upgrade those receipts.
