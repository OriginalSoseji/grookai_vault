# Pricing completion SQL qualification V1

The next qualification stage executes both exporters against real PostgreSQL 17
inside the offline Windows Sandbox. A fresh loopback-only cluster contains
synthetic source, publication and catalog data. It has no production credentials,
host database connection, Docker socket or retained production/lab data.

The official EDB PostgreSQL 17.11-5 Windows archive was acquired afresh over
verified HTTPS; its SHA-256 is
`80379b2c04d51c30225532e0ae04509899141e9957ed096fe749d7fd9df8f82f`.
Only `pgsql/bin`, `pgsql/lib` and `pgsql/share` were extracted, with destination
checks. Required Microsoft runtime DLLs were copied only after valid Microsoft
Authenticode signature checks. PostgreSQL and repository code execute only in
the guest. Candidate pg dependencies are copied as data and run only there;
no host package installation or lifecycle script is invoked.

`tests/database/pricing_completion_export_fixture_v1.sql` creates a deliberately
minimal schema projection. The integration suite installs the unchanged
`get_market_pricing_read_model_v1` definition from migration
`20261001203000_jungle_edition_price_reader_integration_v1.sql`. Its Jungle helper
is a conservative fixture stub; this does not qualify Jungle pricing. Missing
production migrations/triggers/extensions and scale remain unqualified.

The integration suite requires explicit `PRICING_COMPLETION_SQL_TESTS=offline-disposable`
and `PRICING_COMPLETION_TEST_DB_URL` naming a fresh loopback database with the
`pricing_completion_fixture_` prefix. It refuses populated databases and existing
fixture roles; failed runs must be retained, not reset or silently reused.

The reader must connect directly as a restricted login, with no privileged
membership. An administrator connection followed by SET ROLE is not sufficient
evidence of an isolated service account. Validate positive export, exact source
and publication bindings, current RPC behavior, real rollback and denied write,
role-escalation and unrelated-read attempts. Fixture qualification is separate
from production RLS, inherited PUBLIC function grants, permissions, query plans,
environment maturity and deployed service identity.

A production read service still needs a dedicated immutable runtime, verified
TLS, environment qualification, a narrowly scoped login and explicit read policies.
It may read only the thirteen source/catalog tables used by the fixed exporter and
execute the reviewed exact-price RPC. Research/preparation receives exported
artifacts, not that service's credential. Account/policy provisioning and production
deployment are not performed by this fixture or authorized by its results.

The corrected fixture includes `games` and the real `card_prints.game_id` foreign
key. The earlier fixture's invented `card_prints.game` column did not qualify
the original Master query for production. Preserve its historical receipts.
The v3 fixture passes 40 Master contracts and 10 real PostgreSQL checks; it is
still a minimal projection rather than a complete migration replay. Production
catalog labels and Japanese set-family routing remain separate intake issues.
