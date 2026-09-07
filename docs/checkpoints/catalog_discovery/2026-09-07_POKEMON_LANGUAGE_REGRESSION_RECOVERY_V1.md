# Pokemon Language Regression Recovery - 2026-09-07

## Scope

Repair candidate-source continuity, not canonical identity or publication.
Implementation branch: `fix/pokemon-language-regression-recovery-v1`.
Base main: `cdd69317aaafabcb3b4f35d3a3e6f74631ff287e`.
The root application checkout was not changed. No database access, Storage
writes, paid AI, candidate publication, or new app build was needed.

## Repair

The Korean TCGdex API succeeds but returns only 239 of the 1,363 baseline cards.
Previously fallback ran only when the API was unavailable. Now the existing
catastrophic-drop guard may invoke one pinned official GitHub fallback. The
fallback must pass the same count, language and identity checks. It does not
become canonical authority. Healthy responses and direct coordinate conflicts
do not invoke fallback; offline fixtures cannot access the network.

The raw rejected source and fallback are retained outside apply's candidate
directory. Recovery metadata links exact source hashes and the source commit.
Scheduled issue reconciliation keeps primary API regression visible even when
candidate continuity recovers successfully.

## Live Evidence

Artifact root:
`C:/grookai_vault_operator_artifacts/catalog/20260907_language_regression_recovery/`.

Command from `C:/grookai_vault_pokemon_sealed`:

```powershell
node --use-system-ca scripts/workers/pokemon_language_master_index_refresh_v1.mjs --mode=plan --languages=ko,de,zh-cn --concurrency=3 --out-dir=C:/grookai_vault_operator_artifacts/catalog/20260907_language_regression_recovery/live_plan
```

Readback at `2026-09-07T14:13:37.070Z`:

| Scope | Candidate cards | Retained sets | Quarantined anomalies | Result |
| --- | ---: | ---: | ---: | --- |
| Korean | 1,363 | 103 | 0 | Pinned GitHub recovery; API returned 239 |
| German | 20,310 | 169 | 250 | Existing orphan rows remain quarantined |
| Simplified Chinese | 877 | 55 | 2 | Existing conflicting source ownership retained |

Korean has 11 currently observed sets and 92 retained sets needing revalidation.
German has 20,060 observed cards and 250 retained cards needing revalidation.
These counts do not imply complete language catalogs or independent admission.

- GitHub source: `tcgdex/cards-database`, commit
  `1c30c50253756bafecf0f065fc377f77016ad12f`.
- Plan fingerprint:
  `24354ca20f75468a8be6d8311d2ed18cf43505e2378f9a175a079e761e47969e`.
- `plan.json` and `summary.json` exact SHA-256:
  `c669fd65da85799893af822a668bed4d4a7f32111c20b9179123dabdcc20783d`.
- Rejected primary raw SHA-256:
  `69c674aea9a02f2e1f8a790c61f6504908ed799591e705086c90e9f748ca029a`.
- Fallback raw SHA-256:
  `2bc731480bae17f7ba65314a46dd63812d9c303a633a2b92722e32cba6c42904`.
- `verify_recovery.mjs` independently compared all nine decompressed card/set/
  anomaly arrays to their checked-in baselines: exact equality, no lost rows.
- `verification.json` records all 17 generated artifact hashes, raw hash parity,
  plan/summary parity and unchanged candidate content. No apply was executed.

## Verification

- Language contracts: 21/21 pass, including eight new recovery cases.
- Combined English/language/Japanese/discovery contracts: 79/79 pass.
- Four additional English human-fixture contracts pass.
- Worker syntax and `git diff --check` pass.
- Live source plan: all three selected scopes ready, no source-error scopes,
  no candidate/registry content changes, all 252 anomalies preserved.
- PR 434 review added failure-path evidence retention: a returned unavailable
  fallback is saved and hashed before its status is rejected. A missing snapshot
  or transport failure cannot manufacture evidence. Live successful-path source
  results above are unchanged; the added regression check verifies write/hash
  ordering before status rejection.
- Full local shipcheck passed the secret-packaging guard, then stopped at the
  isolated checkout's missing `SUPABASE_DB_URL`. Targeted checks above passed;
  command-local hook bypass did not change hook configuration. GitHub runtime,
  drift, Windows and security checks remain the merge gates.

## Remaining Work

1. Ship this narrow repair through the existing PR checks. The daily workflow
   will use it after merge; a local successful plan is not proof of a scheduled
   run. No full multi-lane workflow was manually dispatched by this task.
2. Keep issue 260 open. Korean API completeness still needs upstream repair;
   successful fallback must not hide that condition.
3. German ownerless records and Simplified Chinese CSV1C conflicts need reliable
   source evidence. Do not infer ownership or grant canonical authority.
4. Preserve the other gates in `docs/checkpoints/SEALED_CLIENT_CLOSEOUT_20260907.md`:
   genuine fresh pricing, missing source images, separate MTG `slz` apply,
   unavailable collectible adapters, sealed Vault and anonymous licensing,
   device acceptance and broader app performance.

Background removal remains deferred. This checkpoint does not declare the
entire product or catalog list complete.
