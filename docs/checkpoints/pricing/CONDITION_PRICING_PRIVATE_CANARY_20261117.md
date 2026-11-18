# Private condition pricing preview — November 17, 2026

Current follow-up: the owner authorized using the published API without separate
permission unless an applicable restriction is explicit. The prior permission
inquiry is superseded. A broader signed-in, on-demand condition-reference reader
and web control integration now exist in source; see the
[V2 checkpoint](TCGTRACKING_CONDITION_PRICING_V2_20261117.md). Earlier private
snapshot observations below are retained as historical evidence.

## Source qualification follow-up

The November 17 public-source review and fresh Dragons Exalted GET are complete.
All 20 captured preview selections reconciled to the same published provider
snapshot: 18 positive amounts, two unavailable. API display rights and SKU
currency remain unestablished in the reviewed official pages. No provider message,
production read/write, import or deployment occurred in this follow-up.
See the [source report and prepared inquiry](../../audits/pricing/tcgtracking_source_qualification_v1/REPORT.md).
The private canary contract and activation boundaries remain unchanged.

## Implementation state

The next implementation step is complete in the isolated
`codex/tcgtracking-condition-pricing-v1` worktree. It is not committed or deployed.
No additional production writes occurred during this step.

The founder page at `/founder/pricing/conditions` selects an exact printing and
condition and requests the private versioned read endpoint. The existing founder
pricing page links to it. Backend logic revalidates mapping and printing truth,
preserves source amounts, applies source freshness, and never substitutes NM or
percentages. The client clears stale values, handles failure/retry and rejects
mismatched responses. Currency is explicitly unverified and has no dollar symbol.

Contract: [private canary V1](../../contracts/CONDITION_PRICING_PRIVATE_CANARY_V1.md).
Intake proof: [completed private batch](TCGTRACKING_CONDITION_REFERENCE_20261117.md).

## Actual coverage

The live private read at `2026-11-17T23:48:53.338Z` returned four eligible child
printings: Normal and Reverse for Blend Energy numbers 117 and 118. Across five
conditions each, 18 source amounts were available and two were unavailable.
For example, number 117 Normal returned NM 2.51 and LP 1.16 unchanged.

The earlier 128-card Dragons Exalted comparison was a source-only provider
comparison. It did not prove canonical printing-review eligibility. Other
Dragons Exalted printings, including the inspected Garchomp examples, remain
held where the existing truth/mapping gates do not pass. No identities, mappings
or reviews were created to inflate this preview's coverage.

## Verification

- All 26 targeted Node tests passed: 15 intake/reader tests, eight canary model
  and handler tests, and three tests loading the actual Next route adapter.
- Web TypeScript checking passed across the project. Targeted ESLint passed for
  the five changed TypeScript/TSX source files.
- A loopback-only browser fixture mounted the actual React component using the
  captured live private DTOs. All 20 exact printing/condition selections matched
  those DTOs. Missing prices remained unavailable; delayed responses could not
  overwrite newer selections; failed/mismatched responses cleared prices; retry
  worked. Desktop and 320px light/dark layouts passed overflow and control-size
  checks. Screenshots were inspected after applying flat 8px shared surfaces.
- This browser fixture does not prove a deployed Next page or authenticated
  production endpoint. Route authentication was tested separately using mocked
  SDK/session dependencies; the live read model used the shared backend client.

Safe fixture data, browser check source and screenshots are retained in
`docs/audits/pricing/condition_pricing_private_canary_v1/`. Large raw source
acquisitions remain in the original ignored intake artifacts.

Repeat the targeted tests from the worktree root:

```powershell
node --test tests/contracts/tcgtracking_condition_reference_v1.test.mjs tests/contracts/condition_pricing_canary_v1.test.mjs apps/web/src/lib/pricing/conditionCanaryRoute.test.mjs
```

The earlier checkpoint commit attempt was stopped by mandatory shipcheck's
runtime environment preflight (no worktree-local `SUPABASE_DB_URL`). No hook was
bypassed and full shipcheck has not passed. This step does not change that status.
The existing historical alias migration replay prerequisite also remains open;
no schema changes were introduced.

## Remaining qualification

Current market headlines, Vault totals and asking prices retain their existing
pricing path. Source-use permission, currency proof and independent official SKU
corroboration remain unresolved. The completed import is a private snapshot with
freshness expiry, not a scheduled refresh. Broader condition autoswitching in
collector surfaces and valuation needs a separately qualified release, stronger
coverage and a refresh plan. The founder preview is ready for code review.
