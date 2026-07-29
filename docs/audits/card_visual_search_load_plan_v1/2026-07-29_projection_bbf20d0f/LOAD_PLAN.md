# Card Visual Search Load Plan V1

Date: 2026-07-29

Status: PLAN ONLY; MIGRATION UNAPPLIED; NO DATABASE CONNECTION

## Target Counts

- Releases: `1`
- Artworks: `9,532`
- Printings: `9,702`
- Documents: `28,596`
- Evidence rows: `357,413`
- Candidate-index entries: `321,937`
- Active release pointers: `0`

## Boundary

This artifact plans chunks and reconciliation only. It does not connect to the
database, apply the migration, serialize/load index rows, activate a release,
generate embeddings, or expose search.

## Exact Next Gate

After human calibration approval, apply the migration in a governed database
gate, load one staged release without activation, and reconcile every count and
hash.
