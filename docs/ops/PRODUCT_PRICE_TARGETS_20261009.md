# Price targets: local implementation and verification

Current root: `C:/gv_product_inventory_export_20261008`. Evidence root:
`C:/grookai_vault_operator_artifacts/product_inventory_export_20261008/price-alert-draft-v1`.
This is part of the full DeckTradr overhaul. It is not a completed overhaul,
production deployment, activation or proof of physical notification delivery.

## Implemented behavior

Web and native Account entries provide exact-printing search, decimal USD targets,
edit/restart, pause, qualified reference/status and explicit uncertain-save retry.
Private responses and mutation transport remain bound to their original owner.
Backend persistence, one-event-per-revision evaluation, queued-delivery invalidation
and private evaluation success/failure records follow
[PRICE_TARGETS_V1](../contracts/PRICE_TARGETS_V1.md).

## Evidence available

All references below are relative to the evidence root; preserve their original
inputs, failed attempts and populated databases.

| Proof | Result | Receipt |
|---|---|---|
| Actual owner RPC and retry | 8 passed | `rpc-1791568922193/result.json` |
| Governed reference with committed outbox | 8 passed | `durable-crossing-1791569800392/result.json` |
| Actual Auth production browser | 8 passed | `browser-1791570627485/result.json` |
| Actual native SDK/Auth transport | 5 passed | `native-auth-1791570720461/result.json` |
| Native exact values, ownership and recovery | 25 passed | `native/tests-v2.log` |
| Native widgets and small-screen layout | 3 passed | `native/widget-tests-v4.log` |
| Full native analysis/test suite | 2,786 passed; 5 skips | `checks-native-1791570874338/result.json` |
| Populated audit extension, 442→443 | Passed, prior rows identical | `evaluation-audit-upgrade-1791571271934/result.json` |
| Audit failure rollback, success and retry | 7 passed | `evaluation-audit-runtime-1791571332362/result.json` |

The first full Node run at `checks-node-1791570864974` reported 8,977 passed, two
failures and ten skips. Both failures were historical release fixtures admitting
the later precision migration. Corrected fixtures and new rejection cases pass
eight focused checks. Full rerun `checks-node-1791571442602` passes 8,981 with ten
skips. The original failed run remains preserved. Subsequent order account-safety
changes have separate qualification; this run does not cover those later changes.

Direct SQL replay was subsequently hardened in `idempotency-v2`. Two complete
reapplications preserve every prior row and ledger entry, produce zero raw and
normalized schema difference across 1,278 security objects, and preserve the audit
wrapper: `idempotency-v2/reapply-1791571797276/result.json`. Its first producer failed
before any SQL changes because it read the snapshot result's wrong field; retain
that failed attempt. Post-reapply failure/retry runtime again passes seven cases
at `evaluation-audit-runtime-1791571852356/result.json`. Source integration is recorded
in `idempotency-v2/integration.json`. Earlier SQL-source proofs are historical.

The latest read-only production receipt is outside this subdirectory at
`../schema-reconciliation-1791571063485/result.json`: production430 matches its
known precision release with zero normalized drift. Current wider source443
includes the deferred receipt migration. Exact release442 omits that migration.
Fresh exact442 replay and no-op push pass at `release-full-442-v2/replay-result.json`.
Populated430→442 upgrade passes at `release-upgrade-442-v2/upgrade-result.json`,
retaining339 prior tables and three owned copies. `exact-costs.json` independently
checks exact decimal strings, currencies and notes against the export. Independent
shadow comparison passes at `release-shadow-442-v2/receipt.json`: zero raw and
normalized differences,1,268 matched security objects. Older438/439 and first442
receipts are historical. No populated fixture is reset.

Following the separate order privacy repair, price browser8 passes again at
`browser-1791572884401/result.json`. Native source remains unchanged; a current
Android443 proof APK is built at `../ui-1791523581076/device-1791572600164` from415
inputs. Its SHA256 is0bd8cf81285b69fa3a12ef8e3a76748096ad2139dd52148b01cc29ac6422ef0a.
It has not been installed or physically accepted; Samsung still reports locked.

## Replay and diagnose the audit proof

`evaluation-audit-upgrade-v1.mjs` checks the loopback database, internal network,
disabled controls, migration manifest and all prior row hashes before extending
the existing local lab. It applies through `supabase db push --local`, performs
a second no-op push and verifies exact retention. Its consumed intent cannot be
reused to apply another migration.

`evaluation-audit-runtime-v1.mjs` creates a fresh synthetic owner through local
Auth, saves two matching targets, locks unrelated pending targets and installs a
temporary trigger that fails only the second owned outbox insert. It proves the
entire core transaction rolls back while one failure receipt commits. After
removing that owned trigger, explicit retry commits exactly two events; another
evaluation produces no duplicates. It checks private permissions, immutable
receipts and an independent connection read, restores controls off and verifies
every prior table's rows remain. No provider, production or external message call
is made. Never run these fixture writers against production.

Read-only operational diagnosis after a separately authorized release:

```sql
begin read only;
select edit_enabled, evaluate_enabled from public.price_target_control;
select id, started_at, finished_at, status, requested_limit, checked, triggered,
       error_code, error_detail
from public.price_target_evaluation_runs
order by started_at desc limit 50;
select event_type, (sent_at is not null) as sent,
       (send_started_at is not null) as send_started, failure_reason, count(*)
from public.notification_outbox
where event_type = 'price_target_reached'
group by event_type, (sent_at is not null), (send_started_at is not null), failure_reason;
rollback;
```

Error details are private operator data. An absent run is not a successful run.
Check server configuration and invocation failures before concluding there were
no matching targets. No rollout switch is enabled by this runbook. Do not retry
a provider delivery manually without its existing delivery/idempotency contract.

## Remaining acceptance

Finish final combined ordinary/managed-commit and release-source qualification.
Test the current native source on the Samsung when the existing unlock hold
clears. Physical OS export save and current native store/price-alert acceptance
remain unverified. iOS still needs the two already-requested Mac-local actions.
Keep every historical APK, installed app and database. The supported buyer/seller
journey and measured competitor/uncoached-user comparison remain separate open
items in the canonical overhaul plan.
