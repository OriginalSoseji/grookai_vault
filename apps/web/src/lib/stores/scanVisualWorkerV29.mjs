// Disposable feature-cache worker. Frozen V25 retrieval / V23 geometry / V20
// ambiguity rules. No credentials, network requests, fallback or scan writes.
import net from 'node:net';
import tls from 'node:tls';
const deny = () => { throw new Error('Visual worker network access is disabled.'); };
globalThis.fetch = deny;
for (const transport of [net, tls]) for (const key of ['connect', 'createConnection']) transport[key] = deny;
let phase = 'start', catalog, byId, cv, ids, preparedScan, risk, verify, manifest;
const progress = stage => process.send({ version: 'v24', kind: 'progress', stage });
function failed() { phase = 'failed'; preparedScan?.dispose(); preparedScan = undefined; process.send?.({ version: 'v24', kind: 'failed' }); }
process.on('message', async message => {
  try {
    if (message?.version !== 'v24') throw new Error('Invalid protocol.');
    if (phase === 'start' && message.kind === 'start') {
      phase = 'preparing';
      if (!(message.bytes instanceof Uint8Array) || !message.bytes.length || message.bytes.length > 4 * 1024 * 1024) throw new Error('Invalid scan.');
      progress('catalog');
      const { loadVisualCatalogV24 } = await import('./scanVisualCatalogV24.mjs'); catalog = loadVisualCatalogV24(new URL('./scanExpandedCatalogV13.json.gz', import.meta.url)); byId = new Map(catalog.map(r => [r.id, r]));
      const { loadFeatureManifestV29 } = await import('./scanFeatureManifestV29.mjs'); manifest = loadFeatureManifestV29(new URL('./scanExpandedFeaturesV29.json.gz', import.meta.url), byId);
      progress('index');
      const { prepareVisualIndex, VISUAL_VERSION } = await import('./visualMatchCore.mjs');
      const { shortlistVisualReferencesV25: shortlistVisualReferences } = await import('./scanShortlistV25.mjs');
      const { prepareReferenceRiskV20 } = await import('./scanReferenceRiskV20.mjs'); risk = prepareReferenceRiskV20(catalog);
      progress('shortlist');
      ids = await shortlistVisualReferences(message.bytes, prepareVisualIndex({ version: VISUAL_VERSION, references: catalog }), catalog);
      progress('opencv');
      const { loadFeatureRuntimeV29 } = await import('./scanFeatureRuntimeV29.mjs'); ({ cv } = await loadFeatureRuntimeV29());
      progress('geometry');
      const geometry = await import('./scanGeometryV23.mjs'); verify = geometry.verifyGeometryV23;
      preparedScan = await geometry.prepareGeometryImage(cv, message.bytes);
      progress('prepared');
      phase = 'references'; process.send({ version: 'v24', kind: 'references', ids });
    } else if (phase === 'references' && message.kind === 'references') {
      phase = 'matching';
      const { validateFeaturePacketsV29 } = await import('./scanFeatureDeliveryV29.mjs');
      const packets = validateFeaturePacketsV29(message.packets, ids, byId, manifest), candidates = [];
      const { decodeReferenceFeaturesV28 } = await import('./scanReferenceFeaturesV28.mjs');
      const { selectUnambiguousGeometry } = await import('./scanReferenceRiskV20.mjs');
      for (const packet of packets) {
        const reference = decodeReferenceFeaturesV28(cv, packet.bytes, manifest.get(packet.id));
        try { const result = verify(cv, reference, preparedScan); if (result) candidates.push({ id: packet.id, ...result }); }
        finally { reference.dispose(); }
      }
      const result = selectUnambiguousGeometry(candidates, risk);
      preparedScan.dispose(); preparedScan = undefined; phase = 'complete';
      process.send({ version: 'v24', kind: 'result', result: { status: result.status, candidates: result.candidates.map(({ id, rotation }) => ({ id, rotation })) } });
    } else throw new Error('Unexpected worker message.');
  } catch { failed(); }
});
