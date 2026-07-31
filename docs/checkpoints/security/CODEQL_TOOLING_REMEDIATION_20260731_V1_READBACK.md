# CodeQL Tooling Remediation 20260731 V1 Readback

## Context

- Repository: `OriginalSoseji/grookai_vault`
- Producing pull request: `#163`
- Producing default-branch commit: `21b173c3740c9bc60ae69d3176b472016cbb28db`
- Default-branch CodeQL run: `30671725858`
- Run conclusion: `success`
- Baseline open alerts: `526`
- Open alerts after code repair: `494`
- Open alerts after evidence adjudication: `448`

This readback is the authoritative post-merge evidence for
`CODEQL_TOOLING_REMEDIATION_20260731_V1`. It records GitHub's default-branch
analysis and alert state, not projected local results.

## Default-Branch Proof

All five CodeQL analyses completed successfully on the producing commit:

- Actions
- C/C++
- JavaScript/TypeScript
- Python
- Ruby

The JavaScript/TypeScript analysis completed at `2026-07-31T23:15:25Z`.

## Fixed Findings

GitHub marked all `31` planned findings fixed on `main`:

- TLS certificate verification: alerts `479` through `500` (`22`)
- ReDoS in identity suffix normalization: alerts `556` through `563` (`8`)
- ReDoS in PDF text extraction: alert `566` (`1`)

The final one-pass PDF escape parser also closed the prior double-escaping
finding introduced during PR validation. The post-merge open count therefore
fell by `32`, from `526` to `494`, with no replacement TLS or ReDoS alert.

## Evidence Adjudication

Exactly `46` alerts were dismissed as `won't fix` after alert-by-alert path and
rule verification:

- `js/functionality-from-untrusted-source`: `38`
- `js/xss-through-dom`: `8`

Alert IDs:

`83-90`, `501-538`

Every dismissed alert is confined to one of these immutable third-party HTML
evidence locations:

- `docs/audits/new_set_release_ingestion_v1/20260714_abyss_eye_pitch_black/raw_sources/abyss_eye_jp/*.html`
- `docs/audits/english_master_index_source_exhaustion_v1/justinbasil_prize_pack_finish_acquisition_v1/cache/*.html`

Dismissal rationale recorded in GitHub:

> Non-executable third-party HTML retained byte-for-byte under docs/audits for
> source provenance. It is never imported, bundled, served, or executed by
> Grookai. Owned scripts remain fully scanned; see
> CODEQL_TOOLING_REMEDIATION_20260731_V1.

No alert under `scripts/**`, `backend/**`, `apps/**`, or `supabase/**` was
dismissed in this adjudication.

## Remaining Owned-Code Backlog

### By rule

| Rule | Open alerts |
|---|---:|
| `js/incomplete-sanitization` | 275 |
| `js/double-escaping` | 87 |
| `js/incomplete-url-substring-sanitization` | 25 |
| `js/identity-replacement` | 24 |
| `js/incomplete-hostname-regexp` | 17 |
| `js/bad-tag-filter` | 14 |
| `js/incomplete-multi-character-sanitization` | 5 |
| `js/incomplete-url-scheme-check` | 1 |
| **Total** | **448** |

### By scope

| Scope | Open alerts |
|---|---:|
| `scripts/audits/**` | 422 |
| `backend/warehouse/**` | 24 |
| `backend/identity/**` | 1 |
| `scripts/ingest/**` | 1 |
| **Total** | **448** |

## Current Truths

- Runtime security findings repaired in PR `#161` remain separate from this
  owned maintenance-tool backlog.
- PR `#163` closed the planned TLS and ReDoS findings on the default branch.
- Downloaded evidence is classified explicitly; owned executable code remains
  fully scanned.
- `448` is the authoritative open count after repair and adjudication.
- This pass did not write to the database, deploy Supabase changes, alter
  production configuration, or change the active pricing canary.
- The repository is not CodeQL-clean. The remaining findings require further
  repair or individual adjudication.

## Invariants

- Do not exclude `scripts/audits/**` from CodeQL; those scripts can fetch data,
  connect to production, and perform guarded writes.
- Do not dismiss owned executable code merely because it is historical or
  manually invoked.
- Do not treat third-party evidence classification as permission to serve or
  execute those files.
- Do not weaken URL, hostname, TLS, or output-encoding checks to reduce alert
  counts.
- Do not modify production data during static-analysis remediation.

## Explicit Next Gate

Inventory and repair the reusable URL and hostname validation families:

- `js/incomplete-url-substring-sanitization` (`25`)
- `js/incomplete-hostname-regexp` (`17`)
- `js/incomplete-url-scheme-check` (`1`)

The next pass must add focused contract tests, run the full contract suite, and
require a merged default-branch CodeQL readback before claiming those findings
closed. Physical iPhone verification and timed pricing-canary gates continue
independently and remain incomplete.
