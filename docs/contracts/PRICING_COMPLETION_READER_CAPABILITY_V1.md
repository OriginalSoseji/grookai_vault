# Pricing completion reader capability V1

Status: blocked proposal, not an applied migration or qualified production role.
The production route should use immutable, reviewed operator exports feeding the
credential-free worker while a direct reader cannot satisfy this boundary.

The proposed SQL is
`docs/audits/pricing/pricing_completion_reader_20261013/proposed_reader_capability_v1.sql`.
It is a review artifact. It must not be installed as a migration or used to
activate a login. No production permission changes were performed for this work.

The dedicated role is `grookai_pricing_reader_v1`. It starts NOLOGIN, NOINHERIT,
NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOREPLICATION and NOBYPASSRLS, with no role
memberships or password. An existing same-named role is a hard failure, not an
invitation to adopt or repair it. It receives SELECT only on the exact ten tables
read by the legacy mapping planner and executor: sets, card_prints,
card_print_identity, external_mappings, tcgcsv_source_groups,
tcgcsv_source_products, tcgcsv_source_sync_runs,
tcgcsv_source_price_daily_observations, market_price_current_publication and
market_price_publication_snapshots. This capability is not a Master pricing RPC
or games/card_printings export capability and is not a general catalog reader.

RLS must enumerate hidden and suppressed collision targets. Four existing
restrictive SELECT predicates are pinned and wrapped in a CASE that bypasses the
old expression only when both current_user and session_user equal the dedicated
reader. Every other session retains the original ELSE expression. Administrator
SET ROLE is insufficient. The proposal adds one exact-role permissive SELECT
policy per table, without granting BYPASSRLS or changing public app visibility.

Two reviewed SECURITY DEFINER visibility entry functions require EXECUTE grants
even when their CASE branches are not selected. A real PostgreSQL 17 probe in the
offline fixture established that an unselected CASE function still causes an
EXECUTE permission error. The proposal pins the two entry functions and two
transitive visibility functions by their captured full-definition MD5 and header.
MD5 here detects drift against independently captured definitions; it is not a
cryptographic source-authenticity claim. No broad function grant is allowed.

NOINHERIT does not suppress PUBLIC privileges. Accepted fixed operator metadata
`mapping-read-capabilities-v2.json`, SHA-256
`f0e8d74bc0009db5d32107fa94bf2f001f672f8c53d0217ae7ae13b725b3aa46`,
captured October 14 UTC (October 13 local), confirms PUBLIC database TEMP and
PUBLIC USAGE on net, with callable net HTTP and worker routines. The proposed
role is absent. These inherited capabilities fail the intended read-only and
network boundary. The SQL deliberately raises before creating the role on PUBLIC
TEMP/CREATE; its later effective checks also reject unrelated app routines,
relation/column privileges and sequences. No unrelated PUBLIC ACL is revoked.

The candidate has not passed a complete positive provisioning fixture. The only
completed fixture proof for this bounded proposal is the CASE/function ACL
negative probe, in new database
`grookai_mapping_authority_reader_20261013_v1`. The probe's temporary login was
disabled. Earlier databases and labs remain preserved. This limited proof does
not demonstrate full RLS row coverage, successful activation, planner execution,
or production least privilege. The known PUBLIC blocker made a full rehearsal
of this currently unusable route unnecessary.

Any renewed direct-reader effort must first independently review the complete
effective capability graph, including PUBLIC CONNECT into other databases,
schema/object ownership, grant options, parameter ACLs, extension and system
routine behavior, default grants, role administration edges and RLS helper
dependencies. The proposed SQL is conservative but is not a complete verifier
of cross-database or extension behavior. It is not an activation gate by itself.
Non-superuser role creators can receive an incoming administration edge; this
must be recorded separately from the prohibited memberships held by the reader.

Credential activation is a separate operator boundary: fresh metadata, exact
approved role attributes, no unexpected effective rights, verified TLS, direct
login and real `assertMappingReaderSessionV1` checks are required. An actual
fixture must prove full hidden-row census and unchanged other-role visibility,
then deliberately disable default_transaction_read_only and prove table writes,
DDL, TEMP, escalation, private reads and dangerous routines remain denied by ACLs.
Transaction read-only settings alone are not the security boundary. Source and
runtime release qualification remain separate from this database capability.
