# Native import recovery batch — September 27

Latest continuation: [standalone migration and Android qualification](AUDIT_NATIVE_IMPORT_QUALIFICATION_20260927.md).
The dependency now passes current-main baseline comparison, fresh 407 replay,
retained-data upgrade and real Android emulator recovery. Build407 is installed
locally. The sections below preserve the earlier implementation checkpoint;
their 406-only and no-emulator status is historical, not the current state.

## Result and source boundary

Implemented the next substantive native repair: collection import now sends one
authenticated desired-total batch, verifies saved copies, retains its preview
after interruption and can retry without replaying additive deltas. Metadata and
slab-only ownership are preserved. Server-side preview-owner validation closes
the account-switch race as well as the normal client-side mismatch.

Branch `fix/native-import-recovery-20260927`, worktree
`C:/grookai_vault_native_import_20260927`, based on current main
`f44dcfeaca56d6d0cd9f446420cee238d12485e1` (released web PR524). The older staged
native/data candidate in `C:/grookai_vault_audit_release_20260927` is untouched.
This is a local candidate, not a deployed repair or new installed APK.

No migration, reset, production write, Edge deployment, native distribution,
commit or push was performed. The branch still has main's 406 migrations. The
new endpoint depends on the pending atomic import RPC; it must not be released
independently ahead of that dependency. See
`docs/contracts/NATIVE_IMPORT_RECOVERY_V1.md`.

## Verification

- Flutter recovery suite: nine cases, including the real import screen's choose
  CSV → interrupted save → Retry import → verified completion flow. Transport
  is mocked in Flutter tests. Covers metadata, zero-add retry, slab-only counts,
  maintenance, absent endpoint, bad readback, changed account and signed-out access.
- Real local endpoint acceptance: seven scenarios, eight Node tests including
  parent, all pass. Uses actual shared Auth helpers under Deno, local Supabase
  Auth, REST and the existing 411 candidate database. Checks invalid token,
  owner mismatch, batch save/metadata, discarded response/retry with identical
  copy IDs, competing imports, late canonical failure/whole rollback and
  independent SQL plus authenticated/other-owner readback.
- Endpoint validation/authorization suite: 28 passed, including body/quantity
  limits, metadata validation, account binding, malformed outcomes and no legacy
  fallback on a missing RPC.
- Complete Flutter suite: 758 passed. Full Node contracts: 5,565 passed, four
  skipped, zero failures. Changed-file analysis and Deno type check passed.

The endpoint harness listens only on 127.0.0.1:57450 and is stopped at completion.
The retained `audit-vault-pause-411-20260927` lab remains on its internal Docker
network, DB57040/API57041, with `max_worker_processes=0` and zero cron executions.
Its migrations/configuration were hash-checked against the original freeze.
Only fresh synthetic accounts/catalog/copies were added. All previously existing
rows in 11 snapshotted tables, including the pause control, were unchanged.
The final test account owns 15 copies. Preserve it and all earlier fixtures.

Private evidence:
`C:/grookai_vault_operator_artifacts/native_import_recovery_20260927/`.
Final DB run: `acceptance-1790540636951/result.json` and `database-final.log`.
The private manifest records exact source and evidence hashes.

Failed harness attempts are retained. Two pre-write guards incorrectly assumed
the mechanism disabling cron; inspection confirmed the actual zero-worker setting.
Two Deno starts lacked cached runtime modules; caching used trusted system CAs,
with no TLS bypass. One synthetic seed reused a set/number identity and was
corrected to distinct numbers; its account/catalog row remains preserved. The
first two widget attempts did not wait for the SDK's real JSON isolate inside
Flutter's fake clock; the final test waits through `runAsync`. No failed result
is counted as passing.
The first broad Node run also exposed missing web dependencies in this new
worktree; it was stopped, retained, and restarted after linking the existing
matching web dependency installation. No dependency versions were changed.

## Remaining release work

1. Qualify the atomic import RPC on the current 406 baseline and integrate it with
   the native endpoint/client release. The prior 411 lab has old 404 plus seven
   audit migrations; it does not prove a current-main combined migration replay.
   Check whether this additive import RPC can ship as its own bounded package
   instead of forcing unrelated slab migrations into its release. Follow strict
   linked-schema, exact-pending, replay and remote-apply gates before any apply.
   Source review found its owner/instance helpers already on main and no calls
   to the pending slab receipt/identity helpers; a fresh 406-plus-import replay
   must establish that isolation before it is treated as release evidence.
2. Build and exercise the resulting native candidate on Android and iOS. This
   batch has Flutter widget evidence, not emulator, physical-device or iOS proof.
   The previously installed 408 APK does not contain this repair.
3. Retire/drain old multi-request writers when performing the broader data
   cutover. This repair makes the new import route atomic; it does not supply
   a global admission switch for old installed apps or retire their endpoint.
4. Complete remaining slab/provider work and native repairs from the preserved
   candidate. PSA's earlier 403 and zero reviewed mappings remain open.
5. Update the audit's five deliverables with released versus locally verified
   outcomes. Preserve original inventory/evidence and show device gaps explicitly.

The web batch remains released at PR524. The broader audit remains open; this
checkpoint does not mark unknown cases as passing or replace frozen evidence.
