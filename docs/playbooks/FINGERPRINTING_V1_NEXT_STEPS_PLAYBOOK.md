# FINGERPRINTING V1 — NEXT STEPS PLAYBOOK (Post-Checkpoint)

Status: ACTIVE PLAYBOOK  
Checkpoint: **Fingerprinting V1 normalization & trust boundary established**  
Scope: Implement hash extraction + matching + optional apply-mode artifact uploads + deterministic deploy scripts  
Non-goals: Reintroduce centering grading logic, add heavy native deps to Node, add schema/migrations

---

## 0) Current Ground Truth (Checkpoint Summary)

At checkpoint, the system is correct and honest:

- `backend/condition/fingerprint_worker_v1.mjs`:
  - Downloads snapshot images
  - Calls AI border detector via `detectOuterBorderAI({ imageBuffer, timeoutMs })`
  - Rejects fake full-frame quads upstream (AI now returns ok:false)
  - Skips quad validation + warp when AI returns ok:false
  - Calls `/warp-card` via `warpCardAI()` when AI returns ok:true
  - Produces canonical 1024×1428 normalized buffers in-memory in dry-run
  - Uses deterministic partial semantics (one face ok => partial)
  - Dry-run is side-effect-free: no DB, no storage

- AI service is canonicalized in repo:
  - `backend/ai_border_service/app.py`
  - `backend/ai_border_service/requirements.txt`

- Droplet service (165.227.51.242:7788) runs uvicorn `app:app`.
  - `/detect-card-border` accepts raw bytes and base64 JSON
  - `/warp-card` exists and returns warped JPEG

Current limitation (expected):
- Front face may fail AI border (ok:false) depending on image.
- Hashing/matching not implemented yet.

---

## 1) Next Milestones

### Milestone A — Hash Extraction V1 (Deterministic, Pure Node)
Compute stable fingerprints from normalized images:
- dHash 64-bit
- pHash 64-bit
Store in `condition_snapshot_analyses.measurements` under `features.<face>`

### Milestone B — Matching V1 (Same user only)
Use prior `v1_fingerprint` analyses for the same user:
- shortlist by pHash hamming
- compute combined score (pHash + dHash), per-face, average over available faces
- decision same/different/uncertain with constants

### Milestone C — Apply-mode uploads (Optional)
Upload normalized JPEGs + debug json only in apply-mode:
- `condition-scans/<snapshot_id>/derived/fingerprint/front_normalized.jpg`
- `condition-scans/<snapshot_id>/derived/fingerprint/back_normalized.jpg`
- `condition-scans/<snapshot_id>/derived/fingerprint/fingerprint_debug.json`

Dry-run never uploads.

### Milestone D — Deterministic deploy scripts for AI service
No more manual edits on droplet:
- `scripts/deploy_ai_border_service.ps1`
- `scripts/deploy_ai_border_service.sh`

---

## 2) Contracts (Do Not Violate)

### 2.1 Determinism
- Fixed resize sizes
- Fixed grayscale conversion
- Fixed hash bit ordering
- No randomness
- No “best guess” on failures

### 2.2 Idempotency
- `analysis_key` must be stable per `(snapshot_id, analysis_version, worker_version_tag)`
- reruns must not create duplicates

### 2.3 Fail Closed
- If a face has no normalized image => no hashes for that face
- If no hashes => match must be `uncertain` with confidence 0.0

### 2.4 No heavy Node native deps
No opencv in Node. Use pure JS + `sharp` (already present in repo workers).

---

## 3) Implementation Plan — Hashing + Matching

### 3.1 Add a new file: `backend/condition/fingerprint_hashes_v1.mjs`

Create this file exactly:

```js
// backend/condition/fingerprint_hashes_v1.mjs
import sharp from 'sharp';

/**
 * Convert a Buffer image to grayscale raw pixels at width x height.
 * Deterministic: force grayscale, remove alpha, output raw.
 */
async function toGrayRaw(imageBuffer, width, height) {
  const { data, info } = await sharp(imageBuffer)
    .resize(width, height, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (!info || info.width !== width || info.height !== height) {
    throw new Error(`gray_raw_bad_shape:${info?.width}x${info?.height}`);
  }
  // data is Uint8 values [0..255], length = width*height
  return data;
}

/**
 * 64-bit dHash:
 * - resize to 9x8
 * - compare adjacent pixels horizontally (8 comparisons per row, 8 rows) => 64 bits
 * Return hex string length 16.
 */
export async function computeDHash64(imageBuffer) {
  const w = 9, h = 8;
  const px = await toGrayRaw(imageBuffer, w, h);

  let bits = BigInt(0);
  let bitIndex = 0n;

  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < 8; x++) {
      const a = px[row + x];
      const b = px[row + x + 1];
      const bit = a < b ? 1n : 0n;
      bits = (bits << 1n) | bit;
      bitIndex++;
    }
  }

  return bits.toString(16).padStart(16, '0');
}

/**
 * 64-bit pHash:
 * - resize to 32x32 grayscale
 * - run 2D DCT on 32x32
 * - take top-left 8x8 DCT coefficients (including DC)
 * - compute median of these 64 values (excluding DC is common, but we keep it deterministic and include all)
 * - set bit = coeff > median
 * Return hex string length 16.
 *
 * NOTE: This is deterministic but slower than dHash. Acceptable for V1.
 */
function dct1d(vec) {
  const N = vec.length;
  const out = new Array(N).fill(0);
  const factor = Math.PI / N;

  for (let k = 0; k < N; k++) {
    let sum = 0;
    for (let n = 0; n < N; n++) {
      sum += vec[n] * Math.cos((n + 0.5) * k * factor);
    }
    out[k] = sum;
  }
  return out;
}

function dct2d(matrix) {
  const N = matrix.length;
  // DCT rows
  const rows = new Array(N);
  for (let i = 0; i < N; i++) rows[i] = dct1d(matrix[i]);

  // DCT cols
  const out = Array.from({ length: N }, () => new Array(N).fill(0));
  for (let j = 0; j < N; j++) {
    const col = new Array(N);
    for (let i = 0; i < N; i++) col[i] = rows[i][j];
    const colDct = dct1d(col);
    for (let i = 0; i < N; i++) out[i][j] = colDct[i];
  }
  return out;
}

export async function computePHash64(imageBuffer) {
  const N = 32;
  const px = await toGrayRaw(imageBuffer, N, N);

  // Convert to 2D float matrix
  const mat = Array.from({ length: N }, (_, y) =>
    Array.from({ length: N }, (_, x) => px[y * N + x])
  );

  const coeff = dct2d(mat);

  // top-left 8x8
  const vals = [];
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) vals.push(coeff[y][x]);
  }

  // median
  const sorted = [...vals].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  let bits = BigInt(0);
  for (let i = 0; i < vals.length; i++) {
    bits = (bits << 1n) | (vals[i] > median ? 1n : 0n);
  }

  return bits.toString(16).padStart(16, '0');
}

/** Hamming distance for 64-bit hex hashes */
export function hamming64(hexA, hexB) {
  if (typeof hexA !== 'string' || typeof hexB !== 'string' || hexA.length !== 16 || hexB.length !== 16) {
    throw new Error('bad_hash_input');
  }
  const a = BigInt('0x' + hexA);
  const b = BigInt('0x' + hexB);
  let x = a ^ b;
  let dist = 0;
  while (x) {
    dist += Number(x & 1n);
    x >>= 1n;
  }
  return dist;
}
````

Failure handling:

* If sharp fails or data shape mismatch => throw; caller must convert to face failure flags `hash_failed`.

---

### 3.2 Update `fingerprint_worker_v1.mjs` to compute hashes after warp success

Patch logic:

* After a face `status === 'ok'` and you have `frontNormBuf`/`backNormBuf`,
  compute:

```js
import { computeDHash64, computePHash64 } from './fingerprint_hashes_v1.mjs';
```

Per face:

* `phash = await computePHash64(normBuf)`
* `dhash = await computeDHash64(normBuf)`

Store into measurements:

```json
"features": {
  "front": { "phash":"...", "dhash":"..." },
  "back":  { "phash":"...", "dhash":"..." }
}
```

If hashing fails:

* mark that face failed with flags `hash_failed` + error message token
* do NOT fake hashes

---

### 3.3 Implement Matching V1 (same user only, hashes-only)

Add new helper file:
`backend/condition/fingerprint_match_v1.mjs`

```js
// backend/condition/fingerprint_match_v1.mjs
import { hamming64 } from './fingerprint_hashes_v1.mjs';

/**
 * Similarity score from hamming distance (0..64) => (0..1)
 */
function hamSim(dist) {
  return 1 - dist / 64;
}

/**
 * Compute per-face score based on phash + dhash.
 * score = 0.55*ph + 0.45*dh
 */
function faceScore(faceA, faceB) {
  const ph = hamSim(hamming64(faceA.phash, faceB.phash));
  const dh = hamSim(hamming64(faceA.dhash, faceB.dhash));
  return 0.55 * ph + 0.45 * dh;
}

/**
 * Combine faces:
 * - if both faces available on both sides, average
 * - else use whichever face pair exists
 */
export function scoreMatch({ cand, cur }) {
  const scores = [];

  if (cur.front && cand.front) scores.push(faceScore(cur.front, cand.front));
  if (cur.back && cand.back) scores.push(faceScore(cur.back, cand.back));

  if (scores.length === 0) return { score: 0, reason: 'no_face_overlap' };

  const score = scores.reduce((a, b) => a + b, 0) / scores.length;
  return { score, reason: 'ok' };
}

export function decisionFromScore(score) {
  if (score >= 0.85) return 'same';
  if (score <= 0.50) return 'different';
  return 'uncertain';
}
```

---

### 3.4 Pull candidate fingerprints from DB (same user)

In `fingerprint_worker_v1.mjs` (apply and dry-run both), after hashes are computed:

* fetch prior analyses (limit 50) for the same user_id:

SQL via supabase client:

```js
const { data: candidates } = await supabase
  .from('condition_snapshot_analyses')
  .select('snapshot_id, measurements')
  .eq('user_id', userId)
  .eq('analysis_version', analysisVersion)
  .order('created_at', { ascending: false })
  .limit(50);
```

Then parse `measurements.fingerprint.features` from each candidate.

Shortlist:

* If current has front: sort by phash hamming front; else by back.
* Take top N=20.

Compute best:

* for each candidate, compute `scoreMatch`
* pick best score.

Write into `measurements.fingerprint.match`:

```json
"match": {
  "decision": "same|different|uncertain",
  "confidence_0_1": 0.0,
  "best_candidate_snapshot_id": null,
  "debug": {
    "score": 0.0,
    "reason": "ok|no_face_overlap"
  }
}
```

Set confidence to the score if decision != uncertain, else 0.

Failure handling:

* if candidate parsing fails => skip that candidate (do not crash whole worker)
* if no candidates => decision uncertain, confidence 0

---

## 4) Optional: Apply-mode artifact uploads (not dry-run)

### 4.1 Add safe upload helper reuse

Reuse the pattern from centering worker: `uploadBufferToStorage`.
If fingerprint worker already has its own upload helper, reuse it.
If not, copy the same helper function (do not introduce new behavior).

Upload only when `--dry-run false`.

Paths:

* `${snapshotId}/derived/fingerprint/front_normalized.jpg`
* `${snapshotId}/derived/fingerprint/back_normalized.jpg`
* `${snapshotId}/derived/fingerprint/fingerprint_debug.json`

Bucket:

* `images.bucket ?? 'condition-scans'`

Update `artifacts` in measurements with these paths when uploaded.

Failure handling:

* If upload fails => mark flag `upload_failed` but do not fail the whole analysis.

---

## 5) Deploy Scripts (Stop Manual Restart)

### 5.1 PowerShell deploy script (Windows)

Create: `scripts/deploy_ai_border_service.ps1`

```powershell
param(
  [string]$Host = "165.227.51.242",
  [string]$User = "grookai",
  [string]$RemoteDir = "/opt/grookai-ai",
  [int]$Port = 7788
)

$ErrorActionPreference = "Stop"

Write-Host "Deploying AI border service to $User@$Host:$RemoteDir"

scp "backend/ai_border_service/app.py" "$User@$Host:$RemoteDir/app.py"
scp "backend/ai_border_service/requirements.txt" "$User@$Host:$RemoteDir/requirements.txt"

ssh "$User@$Host" @"
set -e
cd $RemoteDir
source venv/bin/activate
pip install -r requirements.txt
sudo fuser -k ${Port}/tcp || true
nohup uvicorn app:app --host 0.0.0.0 --port ${Port} --log-level info > $RemoteDir/uvicorn.log 2>&1 &
sleep 1
ss -lntp | grep ${Port} || (echo "uvicorn not listening" && exit 1)
echo "DEPLOY_OK"
"@
```

Failure handling:

* If SSH fails: stop
* If `pip install` fails: stop and read `uvicorn.log`
* If port not listening: stop

### 5.2 Bash deploy script (optional)

Create: `scripts/deploy_ai_border_service.sh` similarly.

---

## 6) Verification Checklist (Mandatory)

### 6.1 AI service endpoints

From Windows:

* `/docs` should load:
  `http://165.227.51.242:7788/docs`

* `/warp-card` should return 200 with full-frame quad:
  (use `Invoke-WebRequest` or Node fetch)

### 6.2 Fingerprinting dry-run

Run:

```powershell
node backend/condition/fingerprint_worker_v1.mjs --snapshot-id bfd50b7e-459e-47bd-b717-aef4f766d705 --analysis-version v1_fingerprint --dry-run true --debug true --emit-result-json true
```

Expected after hash+match:

* back face ok + normalized_size
* if front fails AI, it should fail as `ai_border_failed` (not aspect)
* hashes exist for any ok faces
* match decision exists (uncertain if no candidates)

### 6.3 Fingerprinting apply

Run apply only after dry-run passes:

```powershell
node backend/condition/fingerprint_worker_v1.mjs --snapshot-id <uuid> --analysis-version v1_fingerprint --dry-run false --debug true
```

Verify DB:

```sql
select analysis_version, created_at
from condition_snapshot_analyses
where snapshot_id = '<uuid>' and analysis_version='v1_fingerprint'
order by created_at desc;
```

---

## 7) Common Failure Modes & Fixes

### 7.1 `/warp-card` returns 404

* Droplet isn’t running latest app.py
* Run deploy script; confirm grep contains warp endpoint

### 7.2 AI returns ok:false (invalid polygon)

* This is acceptable; fingerprint remains partial
* Improve AI service contour detection later; do not loosen downstream gates

### 7.3 Hash failures

* Usually sharp decode issue; ensure imageBuffer is valid JPEG
* If warp returns JPEG bytes, hashing should work; if not, log error token

### 7.4 Matching errors

* Candidate measurement shape drift
* Skip malformed candidates, never crash

---

## 8) Stop Condition / Hard Stop Gate

If any of these occur, stop and audit before proceeding:

* dry-run writes to DB or storage
* match decision reports same/different without hashes
* hashes computed on non-normalized images
* AI service drift (droplet file differs from repo)

---

## 9) Suggested Next Checkpoint Name

**CHECKPOINT — Fingerprinting V1 Hash+Match (Hashes Stable, Matching Deterministic, Apply Safe)**

```
