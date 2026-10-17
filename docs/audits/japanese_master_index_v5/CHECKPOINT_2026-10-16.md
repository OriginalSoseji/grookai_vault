# Japanese Master Index V5 checkpoint

Checkpoint date: 2026-10-16

Branch: `catalog/jpn-master-index-v5-official-global-catalog`

Starting commit: `4c0489f161c69660e968eec195e783b9d0701f3b`

## Current state

The branch preserves a complete point-in-time capture of the official Japanese
Pokemon card search index. The health artifact reports:

- generated at `2026-07-28T00:30:00Z`;
- 594 captured search-result pages;
- 23,165 unique official card IDs;
- 23,098 cards with an image-derived set code;
- 67 cards without an image-derived set code;
- status `complete`;
- source request delay of 750 ms.

The capture is intentionally read-only. It made no database, storage, pricing,
production, detail-page, or image-download writes.

Primary preserved artifacts:

- `official_global_catalog/official_jp_global_card_discovery_v1.json.gz`
- `official_global_catalog/official_jp_global_catalog_health_v1.json`
- `official_global_catalog/raw/global_search_page_0001_v1.json` through page
  0594, with matching HTTP evidence files

Primary implementation:

- `scripts/audits/japanese_master_index_v5/official_global_catalog_harvest_v1.mjs`
- `scripts/audits/japanese_master_index_v5/official_global_catalog_reconcile_v1.mjs`
- the other product/detail discovery scripts in the same directory

## Why work stopped

This branch does not contain a Japanese-catalog-specific scheduled GitHub
Actions workflow. The latest Actions activity on the branch was the push on
2026-08-05. `Contracts Drift Gate` passed, while `Contracts Runtime Protection`
failed in its focused contracts test suite.

Failed run:

- https://github.com/OriginalSoseji/grookai_vault/actions/runs/31019183831

The run reported 1,061 tests: 1,047 passed, 8 failed, and 6 were skipped. The
eight failing replay/evidence contracts were:

1. global catalog and reconciliation replay deterministically offline;
2. official coordinate harvest replays deterministically offline;
3. official product detail snapshots preserve verified official evidence;
4. detail-page parsing replays deterministically from preserved HTML;
5. official detail search harvest replays without source access;
6. official product link snapshots are complete and hash-verified;
7. live detail snapshots retain exact source hashes;
8. official product search harvest replays from preserved snapshots.

The branch is therefore preserved and resumable, but it is not currently
performing continuous discovery.

## Safe resume sequence

Use a clean worktree on this branch.

1. Confirm the preserved capture still replays deterministically:

   ```powershell
   node scripts/audits/japanese_master_index_v5/official_global_catalog_harvest_v1.mjs --offline --quiet
   git diff --exit-code -- docs/audits/japanese_master_index_v5/official_global_catalog
   ```

2. Reproduce and repair the eight failed contracts before publishing refreshed
   canonical evidence.

3. Probe the current official endpoint into a disposable output directory:

   ```powershell
   node scripts/audits/japanese_master_index_v5/official_global_catalog_harvest_v1.mjs --output-root=.tmp/jpn-global-catalog-probe --max-pages=1
   ```

4. After reviewing the probe and the official site's current access policy,
   capture the current complete index into a disposable directory:

   ```powershell
   node scripts/audits/japanese_master_index_v5/official_global_catalog_harvest_v1.mjs --output-root=.tmp/jpn-global-catalog-refresh
   ```

5. Compare the refreshed page count, hit count, card IDs, set-code coverage,
   and content fingerprint with the preserved V1 artifacts. Promote refreshed
   evidence only after the replay contracts pass.

6. If continuous discovery is still desired, add an explicitly reviewed
   scheduled workflow. Keep network capture read-only, retain the 750 ms minimum
   delay (or increase it), upload review artifacts, and require a human-reviewed
   commit or pull request before canonical files change.

## Important caveat

Running the harvest against the canonical output root will reuse the preserved
raw snapshots. A real freshness check must use a new directory under `.tmp`, as
shown above, so the collector performs new requests without overwriting the
checkpoint evidence.
