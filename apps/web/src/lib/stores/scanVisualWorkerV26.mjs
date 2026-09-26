// Same V25 retrieval / V23 geometry. Fetch references while initializing CV and
// preparing the scan. Retain only selected identity metadata and precomputed
// full-catalog risk decisions after retrieval; no private data survives exit.
import net from 'node:net';
import tls from 'node:tls';
import { createRequire } from 'node:module';
const deny = () => { throw new Error('Visual worker network access is disabled.'); };
globalThis.fetch = deny;
for (const transport of [net, tls]) for (const key of ['connect', 'createConnection']) transport[key] = deny;
let phase = 'start', preparedScan, deliver;
const progress = stage => process.send({ version: 'v24', kind: 'progress', stage });
function failed() {
  if (phase === 'failed') return;
  phase = 'failed'; preparedScan?.dispose(); preparedScan = undefined;
  process.send?.({ version: 'v24', kind: 'failed' });
}
async function run(bytes) {
  if (!(bytes instanceof Uint8Array) || !bytes.length || bytes.length > 4 * 1024 * 1024) throw new Error('Invalid scan.');
  progress('catalog');
  const { loadVisualCatalogV24 } = await import('./scanVisualCatalogV24.mjs');
  let catalog = loadVisualCatalogV24(new URL('./scanExpandedCatalogV13.json.gz', import.meta.url));
  progress('index');
  const { prepareVisualIndex, VISUAL_VERSION } = await import('./visualMatchCore.mjs');
  const { shortlistVisualReferencesV25 } = await import('./scanShortlistV25.mjs');
  const { prepareReferenceRiskV20, selectUnambiguousGeometry } = await import('./scanReferenceRiskV20.mjs');
  let fullRisk = prepareReferenceRiskV20(catalog);
  progress('shortlist');
  const ids = await shortlistVisualReferencesV25(bytes, prepareVisualIndex({ version: VISUAL_VERSION, references: catalog }));
  const risks = new Map(ids.map(id => [id, fullRisk(id)]));
  const selected = new Set(ids), byId = new Map(catalog.filter(r => selected.has(r.id)).map(({ id, sha256 }) => [id, { id, sha256 }]));
  fullRisk = undefined; catalog = undefined;
  const packetsReady = new Promise(resolve => { deliver = resolve; });
  phase = 'references'; process.send({ version: 'v24', kind: 'references', ids });
  progress('opencv');
  const require = createRequire(import.meta.url), cv = require('@techstark/opencv-js');
  if (!cv.Mat) await new Promise(resolve => { cv.onRuntimeInitialized = resolve; });
  if (phase === 'failed') return;
  progress('geometry');
  const { prepareGeometryImage, verifyGeometryV23 } = await import('./scanGeometryV23.mjs');
  preparedScan = await prepareGeometryImage(cv, bytes);
  if (phase === 'failed') { preparedScan.dispose(); preparedScan = undefined; return; }
  progress('prepared');
  const packets = await packetsReady;
  if (phase === 'failed') return;
  phase = 'matching';
  const { validateReferencePackets } = await import('./scanReferenceDeliveryV24.mjs');
  validateReferencePackets(packets, ids, byId);
  const candidates = [];
  for (const packet of packets) {
    const reference = await prepareGeometryImage(cv, packet.bytes);
    try { if (phase === 'failed') return; const result = verifyGeometryV23(cv, reference, preparedScan); if (result) candidates.push({ id: packet.id, ...result }); }
    finally { reference.dispose(); }
  }
  const result = selectUnambiguousGeometry(candidates, id => risks.get(id) ?? { assessed: false, conflicts: [] });
  preparedScan.dispose(); preparedScan = undefined; phase = 'complete';
  process.send({ version: 'v24', kind: 'result', result: { status: result.status, candidates: result.candidates.map(({ id, rotation }) => ({ id, rotation })) } });
}
process.on('message', message => {
  if (message?.version !== 'v24') return failed();
  if (phase === 'start' && message.kind === 'start') { phase = 'preparing'; void run(message.bytes).catch(failed); }
  else if (phase === 'references' && message.kind === 'references') { phase = 'received'; deliver(message.packets); deliver = undefined; }
  else failed();
});
