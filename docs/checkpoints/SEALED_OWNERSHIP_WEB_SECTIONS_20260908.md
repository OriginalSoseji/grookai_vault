# Sealed Ownership Web Section Acceptance

Date: 2026-09-08. Branch: `fix/sealed-web-section-acceptance`.
Base: `f82c5904610eab457380f422ac10de0cae9766a3`.

This checkpoint supersedes the browser-blocked status in the earlier native
acceptance checkpoint. It does not supersede production activation restrictions.

## Release state

PR #442 merged into main `004cc6efaf39fb2c1a44bf68cc7d9fb1e3a19956`.
Its unpriced lot repair passed normal full checks (701 Flutter tests and 3,151
contracts); Vercel deployment `dpl_42tMhU7Mai2fhqypReFKEVdhwVYA` became READY.
Receipt: `C:/grookai_vault_operator_artifacts/sealed_ownership/20260908_lot_repair_release/`.
That is not evidence that TestFlight 316 contains the repair.

## New browser verification and repair

The Chrome CUA connection worked using a newly created task tab. Do not reuse
the old detached debugger tab as proof that browser access is unavailable.

- Production MTG search returned the four 10th Edition products. All four
  product images were loaded with positive natural dimensions and self-hosted
  Supabase URLs. Screenshot capture timed out; this is DOM loading evidence.
- Local Vault showed 22 sealed copies, all unpriced, without a false zero total.
- A local opened/damaged copy retained its separate USD25 asking price and
  appeared on the Wall. Assignment to a custom section saved correctly.
- The shared section then hid the copy because its server viewer ID was null,
  despite authenticated client hydration. The fix uses the existing effective
  viewer ID and remounts the panel on viewer/section changes. The same section
  then displayed the expected copy through the existing governed RPC.
- Card-grid empty states now explicitly say cards, rather than claiming the
  whole mixed collection is empty. Card-only section counts remain card-only.
- Browser sale for USD23.75 removed the exact copy from the section and reduced
  Vault count to 21. History retained its price and counterparty.
- Browser trade retained consideration and USD5.25 cash received. Independent
  local SQL readback confirmed both dispositions and 20 active copies.

This patch changes no schema, grants, flags, pricing or ownership records in
production. Local fixture images deliberately lack current qualified evidence;
their unavailable placeholders are not accepted media-rendering proof.

## Verification and cleanup

- 83 targeted ownership/public-section tests passed.
- Web TypeScript and changed-component lint passed; diff check passed.
- Local harness stopped and port3157 has no listener.
- Isolated database55430 replayed all392 migrations; 35 rollback checks passed.
- Final readback: zero sealed copies, zero request rows, zero synthetic users.
- Populated local54330 and production were not mutated.

Artifacts:
`C:/grookai_vault_operator_artifacts/sealed_ownership/20260908_web_section_acceptance/`.
Replay:
`C:/grookai_vault_operator_artifacts/sealed_ownership/2026-09-08T16-25-09-734Z_replay/`.

## Scheduled failures discovered separately

Pokemon Sealed Health run34243597535 succeeded at refresh and health readback
but failed GitHub artifact finalization with intermediary HTTP403. Preserve
the distinction between refresh health and failed audit delivery.

Pricing observation run34242326938 failed the real seven-cycle gate: six runs
classified unhealthy and six terminal alerts. Current164,129 prices passed
freshness/provenance checks with95.293% coverage; latest healthy publication
was September7. Downloaded original observation artifacts are preserved under
the browser audit directory. Do not declare pricing operations healthy solely
because today's prices still render. No production rerun was performed here.

## Remaining gates

1. Release this small section fix through normal review and CI; its local
   browser proof is not proof of deployed web or native behavior.
2. Finish enabled browser media/share/print/bulk-removal acceptance and native
   iOS verification. Native devices were not rebuilt during this browser pass.
3. Resolve production canary scope. The existing server ownership switch is
   global, not account-scoped; keep it off. Do not reuse consumed migration
   approvals for a new capability or enable it as a supposed one-owner canary.
4. Complete bounded production lifecycle/readback under the resulting governed
   scope, then activate and monitor. Default-off deployment is not completion.
5. Diagnose the pricing observation failures and restore reliable artifact
   delivery separately; do not weaken those gates to make runs green.
