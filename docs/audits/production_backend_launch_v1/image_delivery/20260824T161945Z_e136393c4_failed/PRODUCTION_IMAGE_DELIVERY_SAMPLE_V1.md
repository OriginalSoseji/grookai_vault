# PRODUCTION_IMAGE_DELIVERY_SAMPLE_V1

- Observed: `2026-08-24T16:18:41.242Z`
- Commit: `e136393c47a9941a5e2b4a846566f697f9a0f9d9`
- Status: **FAILED**
- Eligible self-hosted rows: `164227`
- Selection hash: `6508e595c15cc96a4c89dec1a94c18afdc41f9b454ef84bdd57bae85f5cfe5ac`

| Probe | Sample | Failures | Observed failure | 95% upper bound | p95 latency |
| --- | ---: | ---: | ---: | ---: | ---: |
| Direct Storage HEAD | 3000 | 0 | 0.0000% | 0.0998% | 674.0 ms |
| Direct Storage full body | 100 | 0 | 0.0000% | 2.9513% | 879.4 ms |
| Production web proxy HEAD | 100 | 69 | 69.0000% | 77.2203% | 778.0 ms |

## Boundaries

- Database: one read-only catalog query.
- Storage: authenticated HEAD/GET reads only.
- Web: public image-proxy HEAD reads only.
- Database writes, Storage writes, pointer changes, canonical changes, and user-data changes: none.
