# Pokemon Language Master Index Automation V1 Checkpoint

## Status

`OPERATIONAL_AND_LAUNCH_SAFE_WITH_EXPLICIT_LANGUAGE_EXPANSION_DEBT`

Pokemon source discovery is now Master-Index-first and runs unattended every
day. Every observed source row is either stored in a language-scoped candidate
index or preserved as a source anomaly. Raw provider rows never write directly
to canonical identity.

This checkpoint closes the launch-week automation gate. It does not claim that
all languages have canonical promotion authority. English and Japanese have
independent admission adapters; the other sixteen registered language scopes
remain candidate-only until comparable independent evidence rules are built.

## Context

New Pokemon sets and cards were being discovered after canonical reconciliation
had already started. That ordering allowed a source gap to look like a writer
problem even when the language Master Index had not yet made an owner decision.
It also made provider defects easy to mistake for absent cards.

The governing order is now:

```text
source evidence
  -> persistent language candidate index
  -> source anomaly quarantine when malformed or contradictory
  -> independent language admission adapter
  -> Master Index reconciliation
  -> bounded canonical promotion candidate
  -> source-specific writer
```

## Problem

The system needed to ensure that:

- new sets and cards are checked daily;
- every configured Pokemon language has an explicit state;
- all usable provider rows are retained without granting them canonical truth;
- provider defects fail closed without discarding evidence;
- only independently corroborated Master Index deltas reach canonical writers;
- changed data is reviewed by repository contracts before becoming the next
  persistent baseline;
- discovery and promotion remain operationally observable and reconcilable.

## Risk

The primary risk was not missing a provider row for one day. The primary risk
was allowing a single volatile source to create, remove, rename, or reassign a
canonical card identity.

Secondary risks were:

- silently truncating a language after the first malformed row;
- losing historical anomalies when a provider temporarily stopped returning
  them;
- accepting duplicate source coordinates as separate facts;
- merging generated candidate data without running the required repository
  guard;
- allowing test fixtures to read the repository's changing production baseline;
- dispatching a writer after an incomplete or unreconciled refresh.

## Decision

The candidate index is persistent evidence, not canonical authority.

- Every language source row is normalized into a stable candidate record.
- Malformed, orphaned, duplicate, or colliding rows are stored separately as
  `source_anomalies` with stable fingerprints.
- An anomaly has zero canonical authority.
- An unobserved historical anomaly remains issue-visible until revalidated; it
  does not disappear only because a provider omitted it on a later run.
- Candidate changes are proposed through a generated data pull request.
- The generated pull request must complete the repository Guard before merge.
- Discovery runs read-only after merge.
- Promotion consumes only admitted candidates, never raw source gaps.
- A zero-target promotion is a valid result and performs zero writes.

## Implementation

The implementation is anchored by:

- `backend/catalog/pokemon_language_master_index_v1.mjs`
- `scripts/workers/pokemon_language_master_index_refresh_v1.mjs`
- `.github/workflows/pokemon-master-index-refresh.yml`
- `tests/contracts/pokemon_language_master_index_v1.test.mjs`

The workflow runs daily at `03:37 UTC` and supports a bounded manual dispatch.
Its durable stages are:

1. fetch and normalize all registered language sources;
2. write candidate cards, sets, manifests, and source anomalies;
3. run the full contract suite against the proposed data branch;
4. open a data-only pull request when facts changed;
5. approve and wait for the required generated-PR Guard;
6. merge only after that Guard succeeds;
7. dispatch read-only universal discovery and bounded promotion;
8. reconcile health issues and preserve run artifacts.

The official TCGdex GitHub dataset is a governed fallback for provider access;
it is parsed with the same language and anomaly boundaries as the API source.

## Pull Requests And Producers

| Work | Pull request | Merge SHA |
|---|---|---|
| Language Master Index automation | [#259](https://github.com/OriginalSoseji/grookai_vault/pull/259) | `56a5955ea1e89d2e1fc2f62c65ce111e4b22a884` |
| Source anomaly preservation and generated-PR Guard | [#262](https://github.com/OriginalSoseji/grookai_vault/pull/262) | `861ce96218ebbd05f687320d5b104f24fad5d15b` |
| Production-baseline test isolation | [#264](https://github.com/OriginalSoseji/grookai_vault/pull/264) | `296f654f3b9a1b9041042a3ce1e02dca4861fa1a` |
| First repaired persistent language-data refresh | [#265](https://github.com/OriginalSoseji/grookai_vault/pull/265) | `7a3bacc7cc0612414e765bd93024a4a2650da87f` |

The production workflow was produced from frozen SHA
`296f654f3b9a1b9041042a3ce1e02dca4861fa1a`. The later data merge SHA is the
result of that run, not its producer.

## Fail-Closed Proof

The first post-repair production refresh correctly stopped before opening a
data pull request. Its fixture test had read the newly changed repository
baseline, so a real German anomaly set made a one-row fixture assertion fail.

The repair gave the fixture an explicit temporary baseline. It did not change
provider facts, admission rules, or production output. The full contract suite
then passed before the paid or mutating boundaries were retried.

Failure issue [#263](https://github.com/OriginalSoseji/grookai_vault/issues/263)
was automatically closed by the successful final refresh. This proves the
workflow alerts on failure and reconciles the alert after recovery.

## Final Production Proof

- Refresh run:
  [33075783669](https://github.com/OriginalSoseji/grookai_vault/actions/runs/33075783669)
- Producer SHA: `296f654f3b9a1b9041042a3ce1e02dca4861fa1a`
- Generated data pull request: `#265`
- Generated data head SHA: `1f34ed0f28fd5342dfb0ea97ae2521418ed26df9`
- Generated pull-request Guard run: `33076366969`
- Guard conclusion: `success`
- Merged data SHA: `7a3bacc7cc0612414e765bd93024a4a2650da87f`
- Downstream discovery run:
  [33076496998](https://github.com/OriginalSoseji/grookai_vault/actions/runs/33076496998)
- Downstream promotion run:
  [33076498949](https://github.com/OriginalSoseji/grookai_vault/actions/runs/33076498949)
- Required live language failures: `0`
- Source fetch errors: `0`
- Reconciliation mismatches: `0`
- Database writes: `0`
- Storage writes: `0`

The generated data pull request's required Guard passed before merge. Its five
CodeQL jobs also completed successfully.

## Language Coverage

The final persistent registry contains `18` explicit language scopes. Fourteen
are populated and four explicitly report `provider_no_cards`.

| Language | State | Sets | Candidate cards | Source anomalies |
|---|---|---:|---:|---:|
| German (`de`) | candidate ready | 153 | 20,058 | 250 |
| English (`en`) | candidate ready | 218 | 23,546 | 0 |
| Spanish (`es`) | candidate ready | 154 | 15,320 | 0 |
| Mexican Spanish (`es-mx`) | candidate ready | 9 | 1,467 | 0 |
| French (`fr`) | candidate ready | 200 | 21,913 | 0 |
| Indonesian (`id`) | candidate ready | 70 | 2,788 | 0 |
| Italian (`it`) | candidate ready | 191 | 15,551 | 0 |
| Japanese (`ja`) | candidate ready | 184 | 12,781 | 0 |
| Korean (`ko`) | candidate ready | 95 | 239 | 0 |
| Dutch (`nl`) | provider has no cards | 0 | 0 | 0 |
| Polish (`pl`) | provider has no cards | 0 | 0 | 0 |
| Portuguese (`pt`) | candidate ready | 123 | 13,873 | 0 |
| Brazilian Portuguese (`pt-br`) | candidate ready | 11 | 1,124 | 0 |
| Portugal Portuguese (`pt-pt`) | provider has no cards | 0 | 0 | 0 |
| Russian (`ru`) | provider has no cards | 0 | 0 | 0 |
| Thai (`th`) | candidate ready | 72 | 2,921 | 0 |
| Simplified Chinese (`zh-cn`) | candidate ready | 55 | 877 | 2 |
| Traditional Chinese (`zh-tw`) | candidate ready | 98 | 7,436 | 0 |
| **Total** | **18 scopes** |  | **139,894** | **252** |

All `20,308` German source card rows were accounted for: `20,058` normal
candidates plus `250` orphan rows whose referenced source sets were absent.
Simplified Chinese preserved two colliding set rows for source ID `CSV1C` as
anomalies. None of these `252` rows has canonical authority.

## Reconciliation And Promotion Readback

The read-only discovery reported:

- `18` initialized language scopes;
- `139,894` normal candidate cards;
- `252` quarantined source anomalies;
- `2` languages with admission adapters;
- `16` candidate-only language scopes;
- `61` Master Index evidence-update candidates (`58` English, `3` Japanese);
- `0` canonical promotion candidates.

The promotion supervisor completed with:

- selected targets: `0`;
- completed targets: `0`;
- failed targets: `0`;
- deferred targets: `0`;
- image candidates: `0`;
- database mutations: `0`.

The `61` update candidates are an evidence queue, not failed writes. They remain
visible in issue
[#255](https://github.com/OriginalSoseji/grookai_vault/issues/255) until the
language-specific admission rules prove them.

Source adapter debt and anomalies remain visible in issue
[#260](https://github.com/OriginalSoseji/grookai_vault/issues/260).

## Tests

- Full repository contract suite: `2,375/2,375` passed after each final repair.
- Focused catalog suite: `74/74` passed.
- Source-integrity replay: passed for actual German and Simplified Chinese
  provider payloads.
- Release secret guard: passed.
- Syntax/import checks: passed.
- `git diff --check`: passed.
- Generated data pull-request Guard: passed.
- Generated data pull-request CodeQL: five jobs passed.

## Artifact Hashes

| Artifact | SHA-256 |
|---|---|
| Language refresh summary | `08c8a896758d7204aeeca855817be122fadd4069ed0e85efc600cdb10e9c0ba3` |
| Generated PR Guard readback | `f0f9d0c716e710a8258f597fabf40d06f1ba1d2275cda4c09e41022e98a4c6d3` |
| Automatic merge readback | `b5be67020819bf4c2b3761dcb074954ed607fde0f1712edee72f7e4d6271a955` |
| Downstream dispatch readback | `01e9b4dba44f526d7e33e0eefa586fc34a23ab52a4120e7ff5686f061d4c36d4` |
| Discovery summary | `d5659a34cc460914e3c9bee1e13f6eb49fa0c2779faca8bf0b24f5d5ded429eb` |
| Promotion summary | `5c5c277f5df7ff0c10297af0d1b6b16c14ca6f231b7c32d854d59437696b07f1` |

## Current Truths

- Every configured Pokemon language is checked daily and has an explicit state.
- New provider rows are automatically persisted as candidate evidence or source
  anomalies.
- A missing candidate baseline no longer silently disables a required language.
- English and Japanese can automatically admit a new identity only when their
  independent evidence contracts pass.
- Candidate-only languages do not write canonical rows.
- A provider anomaly remains visible and non-authoritative.
- Discovery is read-only.
- Promotion can execute safely with zero targets and zero writes.
- Generated candidate data cannot merge before its required Guard succeeds.
- The primary repository's existing dirty worktree was not used or modified for
  this project closeout.

## Invariants

- Master Index before canonical reconciliation.
- Evidence before identity.
- Language scope is part of every candidate coordinate.
- One provider never becomes canonical truth by repetition or volume.
- Raw source gaps never become canonical writer input.
- Duplicate, orphaned, malformed, and colliding rows are preserved, not deleted.
- Candidate data cannot mutate pricing, publication, images, Storage, Vault, or
  child printings.
- No automatic process may invent translations, printed names, set ownership,
  or card coordinates that the evidence does not prove.
- No alert is closed until a later successful run proves recovery.

## Remaining Work

### Launch-blocking

None for daily Pokemon language candidate capture. This checkpoint does not
replace the app's separate release, pricing, security, performance, and store
submission gates.

### Non-launch-blocking

1. Reconcile or obtain corrected upstream evidence for the `250` German orphan
   rows and two Simplified Chinese set collisions.
2. Build independent admission adapters for candidate-only languages in
   business-priority order. Do not copy the English policy blindly.
3. Resolve the `61` English/Japanese evidence-update candidates as independent
   authority becomes available.
4. Add alternate sources for `nl`, `pl`, `pt-pt`, and `ru` if those language
   catalogs are in product scope; the current provider explicitly returns no
   cards for them.
5. Continue normal image self-hosting and printing reconciliation only after a
   card has passed its separate identity gate.

## Exact Next Gate

Observe the next scheduled `03:37 UTC` run from current `main`.

It passes when:

- all 18 scopes report an explicit state;
- no required live language fails;
- no source error silently replaces a prior baseline;
- unchanged facts produce no data pull request, or a bounded real delta produces
  one guarded data pull request;
- discovery and promotion dispatch after the accepted baseline;
- artifact counts, hashes, issues, and merged facts reconcile;
- no candidate-only row receives canonical authority;
- no database or Storage write occurs without an admitted promotion target.

This observation is launch-week monitoring, not another architecture project.
Do not delay the English Pokemon app launch solely to build canonical promotion
adapters for every international language.
