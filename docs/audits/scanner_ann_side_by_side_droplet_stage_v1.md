# Scanner ANN Side-by-Side Droplet Stage V1

Date: 2026-05-12

## Scope

Scanner identity backend staging only.

No Flutter scanner UI, detector, OCR, Supabase schema, pricing, vault, public web, Nginx live route, or production scanner switch was changed.

## Pre-Stage Production Health

Public endpoint:

```text
https://scanner-identity.grookaivault.com/health
```

Health before staging:

- service: `scanner_v3_identity_service_v1`
- model: `Xenova/clip-vit-base-patch32`
- index source: `/opt/grookai-scanner-identity/data/scanner_v3_embedding_index_v7_plus_me_sets_plus_sv10_5w_title_v1.json`
- references: `1,138`
- reference views: `7,005`
- public route: `/scanner-v3/resolve-crops`

## Droplet Audit

Host:

```text
ubuntu-s-2vcpu-4gb-120gb-intel-sfo2-01
```

Disk:

- root filesystem: `116G`
- used before stage: about `9.4G`
- available before stage: about `106G`

Live scanner service:

- unit: `scanner-v3-identity.service`
- active: yes
- enabled: yes
- bind: `127.0.0.1:8787`
- live memory observed: about `868.5M`

Rollback artifacts present:

- `/opt/grookai-scanner-identity/data/scanner_v3_embedding_index_v7_plus_me_sets_plus_sv10_5w_title_v1.json`
- `/opt/grookai-scanner-identity/data/scanner_v3_embedding_index_v7_plus_me_sets_v1.json`

Nginx before/after stage:

- `scanner-identity.grookaivault.com` proxies `/health` to `127.0.0.1:8787/health`
- `scanner-identity.grookaivault.com` proxies `/scanner-v3/resolve-crops` to `127.0.0.1:8787/scanner-v3/resolve-crops`
- no route to stage port `8790`

## Staged Artifact

Local source artifact:

```text
.tmp/scanner_v3_ann_index_v1/full_candidate_compact_v1
```

Remote staged artifact:

```text
/opt/grookai-scanner-identity-ann-stage/data/full_candidate_compact_v1
```

Remote artifact counts from manifest:

- storage: `compact_f32_shards_v1`
- references: `24,715`
- reference views: `173,005`
- PAL / `sv02`: `295`
- shards: `7`
- skipped references: `106`
- remote extracted size: `470M`

Transfer archive:

```text
/opt/grookai-scanner-identity-ann-stage/data/full_candidate_compact_v1.tar.gz
```

## Staged Service

Unit:

```text
scanner-v3-ann-stage.service
```

Properties:

- active: yes
- enabled at boot: no
- working directory: `/opt/grookai-scanner-identity-ann-stage/app/backend`
- artifact dir: `/opt/grookai-scanner-identity-ann-stage/data/full_candidate_compact_v1`
- bind: `127.0.0.1:8790`
- max hamming: `2`
- max candidate vectors: `5,000`
- top K: `10`
- shared model cache: `/opt/grookai-scanner-identity/hf-cache`

Stage health:

- service: `scanner_v3_ann_identity_service_v1`
- references: `24,715`
- reference views: `173,005`
- PAL / `sv02`: `295`
- shard count: `7`
- storage: `compact_f32_shards_v1`
- candidate cap: `5,000`
- RSS observed: about `1.35G`

## Latency Gate

Command run from staged backend:

```bash
node identity_v3/run_scanner_v3_identity_latency_harness_v1.mjs \
  --endpoint http://127.0.0.1:8790 \
  --iterations 6 \
  --crop-count 1 \
  --top-k 10 \
  --crop-type full_card \
  --out /opt/grookai-scanner-identity-ann-stage/logs/latency_stage_v1.json
```

Results:

- OK: `true`
- cold start request: `741.71 ms`
- total p50: `504.183 ms`
- total p95: `741.71 ms`
- warm total p50: `504.183 ms`
- warm total p95: `514.816 ms`
- embedding p50: `101.333 ms`
- embedding p95: `166.79 ms`
- vector search p50: `399.206 ms`
- vector search p95: `560.986 ms`
- crop elapsed p50: `500.586 ms`
- crop elapsed p95: `728.214 ms`
- ANN candidate vector p50: `4,254`
- exact rerank vector p50: `4,254`

The staged droplet service is slower than the local workstation proof but remains below the `2s` scanner identity contract.

## PAL Self-Query

Query image:

```text
https://assets.tcgdex.net/en/sv/sv02/207/high.webp
```

Expected:

- name: `Quaxwell`
- Grookai ID: `GV-PK-PAL-207`
- set: `sv02`
- number: `207`

Stage result:

- top name: `Quaxwell`
- top Grookai ID: `GV-PK-PAL-207`
- rank 1: yes
- crop elapsed: `617.183 ms`
- vector search: `505.837 ms`
- candidate vectors: `5,000`

## Live Safety Check

After staging, public production health remained unchanged:

- service: `scanner_v3_identity_service_v1`
- index source: `/opt/grookai-scanner-identity/data/scanner_v3_embedding_index_v7_plus_me_sets_plus_sv10_5w_title_v1.json`
- references: `1,138`
- reference views: `7,005`

Nginx still routes public scanner traffic only to `127.0.0.1:8787`.

## Rollback / Cleanup

Because no live switch was performed, rollback is simply stopping the stage service:

```bash
sudo systemctl stop scanner-v3-ann-stage.service
```

Optional cleanup after explicit approval:

```bash
sudo rm -f /etc/systemd/system/scanner-v3-ann-stage.service
sudo rm -f /etc/grookai/scanner-v3-ann-stage.env
sudo systemctl daemon-reload
sudo rm -rf /opt/grookai-scanner-identity-ann-stage
```

Do not run cleanup if the stage service is still needed for promotion testing.

## Promotion Gate

No promotion has been performed.

Before live switch:

- capture current live health again
- preserve rollback artifacts
- decide whether ANN service replaces the existing unit or receives a committed production unit/env
- update Nginx only after explicit approval
- verify public `/health`
- verify public `/scanner-v3/resolve-crops`
- verify PAL count is `295`
- rerun latency harness against public endpoint
- rerun Quaxwell `GV-PK-PAL-207` self-query proof
