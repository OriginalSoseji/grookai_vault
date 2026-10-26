import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  openPricingCompletionQueueV1, pricingCompletionDigestV1, pricingCompletionKeyV1,
  readPricingCompletionQueueSnapshotJsonV1,
} from '../../backend/pricing/pricing_completion_queue_v1.mjs';

const NOW = 1791849600000;
function fixture(t, trustedVerifier) {
  const directory = mkdtempSync(join(tmpdir(), 'pricing-queue-contract-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return { directory, queue: openPricingCompletionQueueV1({ directory, trustedVerifier }) };
}
function observation(overrides = {}) {
  return {
    identity: { kind: 'source', provider: 'tcgplayer', category: '3', productId: '214239',
      subtype: 'Holofoil', currency: 'USD', condition: 'NM' },
    reason: 'missing_active_source_mapping', evidence: { rowDigest: 'a'.repeat(64), groupId: '100' },
    sourceRunId: 'source-run-1', scope: 'pokemon:swshp', priority: 90,
    owner: 'pokemon-identity-owner', nextAction: 'Verify exact Master identity and prepare bounded mapping proposal.',
    ...overrides,
  };
}
// Retained pre-streaming implementation is an independent compatibility oracle.
function legacyCanonical(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map(legacyCanonical);
  if (typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) throw new Error('non-JSON value');
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, legacyCanonical(value[key])]));
}
function legacyDigest(value) { return createHash('sha256').update(JSON.stringify(legacyCanonical(value))).digest('hex'); }
function claim(queue, now = NOW) {
  return queue.claim({ owner: 'planner', runId: 'claim-run-1', now, leaseMs: 10000 });
}
// This synthetic verifier models the separately trusted controller. It deliberately
// ignores untrusted worker success fields; production must independently read and
// authenticate the publication and app records, not install this fixture callback.
function fixtureVerifier({ item, now }) {
  return {
    version: 'pricing-completion-verification-v1', key: item.key,
    sourceDigest: item.sourceDigest, sourceRunId: item.sourceRunId,
    claimRunId: item.lease.runId, generation: item.generation,
    verifierPrincipal: 'independent-reader', producerPrincipal: 'bounded-publisher', verifiedAt: now,
    publication: { key: item.key, sourceDigest: item.sourceDigest, sourceRunId: item.sourceRunId,
      printingId: item.identity.printingId ?? 'printing-42', currency: item.identity.currency,
      condition: item.identity.condition, price: 3.5, provenanceId: 'publication-9',
      evidenceDigest: 'a'.repeat(64), publishedAt: now - 1 },
    appRead: { key: item.key, printingId: item.identity.printingId ?? 'printing-42',
      currency: item.identity.currency, condition: item.identity.condition, price: 3.5,
      provenanceId: 'publication-9', evidenceDigest: 'b'.repeat(64), observedAt: now,
      route: 'get_market_pricing_read_model_v1' },
  };
}

test('resume and duplicate ingestion preserve stable identity, firstSeen and attempts', t => {
  const { queue, directory } = fixture(t);
  assert.deepEqual(queue.ingest([observation(), observation()], { now: NOW }), { inserted: 1, unchanged: 0, reopened: 0 });
  const [first] = claim(queue);
  queue.defer({ key: first.key, leaseToken: first.lease.token, reason: 'no authority', nextAction: 'Acquire source authority.', now: NOW + 1 });
  const resumed = openPricingCompletionQueueV1({ directory });
  assert.deepEqual(resumed.ingest([observation()], { now: NOW + 2 }), { inserted: 0, unchanged: 1, reopened: 0 });
  const [item] = resumed.snapshot().items;
  assert.equal(item.firstSeen, NOW);
  assert.equal(item.lastSeen, NOW + 2);
  assert.equal(item.attempts, 1);
  assert.equal(item.state, 'retry');
  assert.equal(item.nextAction, 'Acquire source authority.');
});

test('borrowed ingestion detaches inserted and changed evidence and all returned snapshots', t => {
  const {queue,directory}=fixture(t);
  const row=observation({evidence:{z:{values:[1,{name:'龍😀'}]},a:'initial'}});
  queue.ingest([row],{now:NOW});
  const first=readFileSync(join(directory,'queue.json'));
  row.evidence.z.values[1].name='caller changed'; row.identity.productId='different';
  const read=queue.snapshot(); read.items[0].evidence.z.values.push('returned mutation');
  assert.deepEqual(readFileSync(join(directory,'queue.json')),first);
  assert.equal(queue.snapshot().items[0].evidence.z.values[1].name,'龍😀');
  const changed=observation({evidence:{nested:{stage:'changed'},holes:[,true,,false],negativeZero:-0}});
  assert.equal(queue.ingest([changed],{now:NOW+1}).reopened,1);
  changed.evidence.nested.stage='later';
  const stored=queue.snapshot().items[0];
  assert.deepEqual(stored.evidence,JSON.parse(JSON.stringify(legacyCanonical({nested:{stage:'changed'},holes:[,true,,false],negativeZero:-0}))));
  assert.equal(stored.sourceDigest,legacyDigest(stored.evidence));
  assert.equal(stored.history[1].action,'source_changed');
});

test('late invalid evidence cannot run toJSON or alter an existing queue', t => {
  const {queue,directory}=fixture(t); queue.ingest([observation()],{now:NOW});
  const before=readFileSync(join(directory,'queue.json'));
  let hookCalls=0;
  const cycle={}; cycle.self=cycle;
  for(const invalid of [{toJSON(){hookCalls++;return {};}},{nested:{toJSON(){hookCalls++;return 'x';}}},
    {value:undefined},{value:()=>1},{value:new Date()},Object.create(null),cycle]) {
    assert.throws(()=>queue.ingest([observation({evidence:{changed:true}}),
      observation({identity:{...observation().identity,productId:'second'},evidence:invalid})],{now:NOW+1}),/non-JSON|cyclic/);
    assert.deepEqual(readFileSync(join(directory,'queue.json')),before);
    assert.equal(existsSync(join(directory,'writer.lock')),false);
  }
  assert.equal(hookCalls,0);
});

test('correctly checksummed malformed stored evidence is rejected without replacing snapshot bytes', t => {
  const {queue,directory}=fixture(t); queue.ingest([observation()],{now:NOW});
  const file=join(directory,'queue.json'); const original=JSON.parse(readFileSync(file,'utf8'));
  for(const evidence of [null,[],{oversized:'x'.repeat(131073)}]) {
    const envelope=JSON.parse(JSON.stringify(original)); envelope.state.items[0].evidence=evidence;
    envelope.digest=legacyDigest(envelope.state); const bytes=JSON.stringify(envelope); writeFileSync(file,bytes);
    assert.throws(()=>queue.ingest([observation()],{now:NOW+1}),/evidence must be an object|evidence too large/);
    assert.equal(readFileSync(file,'utf8'),bytes);
    assert.equal(existsSync(join(directory,'writer.lock')),false);
  }
});

test('non-enumerable toJSON getters are ignored and cannot hide oversized canonical evidence', t => {
  const {queue,directory}=fixture(t);let hookCalls=0;
  function evidence(value){const row={value};Object.defineProperty(row,'toJSON',{enumerable:false,get(){hookCalls++;return ()=>{hookCalls++;return {};};}});return row;}
  const valid=evidence('safe');queue.ingest([observation({evidence:valid})],{now:NOW});
  assert.deepEqual(queue.snapshot().items[0].evidence,{value:'safe'});
  const before=readFileSync(join(directory,'queue.json'));
  assert.throws(()=>queue.ingest([observation({evidence:evidence('x'.repeat(131073))})],{now:NOW+1}),/evidence too large/);
  assert.equal(hookCalls,0);assert.deepEqual(readFileSync(join(directory,'queue.json')),before);
});

test('ingestion validates numeric array entries even when an iterator omits a late invalid row', t => {
  const {queue,directory}=fixture(t);queue.ingest([observation()],{now:NOW});
  const before=readFileSync(join(directory,'queue.json'));
  const rows=[observation({evidence:{changed:true}}),observation({evidence:{invalid:undefined}})];
  rows[Symbol.iterator]=function*(){yield this[0];};
  assert.throws(()=>queue.ingest(rows,{now:NOW+1}),/non-JSON/);
  assert.deepEqual(readFileSync(join(directory,'queue.json')),before);
});

test('input accessor changes to borrowed evidence fail atomically at admission', t => {
  const {queue,directory}=fixture(t); queue.ingest([observation()],{now:NOW});
  const before=readFileSync(join(directory,'queue.json'));
  const first=observation({evidence:{value:'before'}});
  const second=observation({identity:{...observation().identity,productId:'second'}});
  Object.defineProperty(second,'evidence',{get(){first.evidence.value='after';return {safe:true};}});
  assert.throws(()=>queue.ingest([first,second],{now:NOW+1}),/evidence changed during ingestion/);
  assert.deepEqual(readFileSync(join(directory,'queue.json')),before);
  assert.equal(existsSync(join(directory,'writer.lock')),false);
});

test('identity dimensions cannot collide and key order is canonical', () => {
  const identity = observation().identity;
  const variants = [identity, { ...identity, subtype: 'Reverse Holofoil' }, { ...identity, category: '1' },
    { ...identity, currency: 'EUR' }, { ...identity, condition: 'LP' }, { ...identity, provider: 'other' },
    { kind: 'master', printingId: 'print-1', currency: 'USD', condition: 'NM' }];
  assert.equal(new Set(variants.map(pricingCompletionKeyV1)).size, variants.length);
  assert.equal(pricingCompletionKeyV1(identity), pricingCompletionKeyV1(Object.fromEntries(Object.entries(identity).reverse())));
  assert.throws(() => pricingCompletionKeyV1({ ...identity, subtype: '' }), /identity.subtype/);
  assert.throws(() => pricingCompletionKeyV1({ ...identity, unknown: 'hidden' }), /unexpected identity/);
});

test('streaming digest is byte-compatible with legacy canonical JSON edge cases', () => {
  const sparse = new Array(5); sparse[2] = ['\ud800','\udc00','\ud83d\ude00'];
  const numericKeys=Object.fromEntries(['9','100','2','01','4294967295','4294967294','0','-0','a','A','1e0','__proto__'].map((key,index)=>[key,index]));
  const cases=[null,true,false,-0,0,Number.MIN_VALUE,Number.MAX_VALUE,1e-7,1e21,0.1,
    '', 'quote" slash\\ newline\n\u0000\u2028\u2029é龍😀\ud800X\udc00', sparse,numericKeys,
    {z:numericKeys,a:{'é':1,'龍':2,'😀':3,'\ud800':4},large:Array.from({length:9000},(_,n)=>({n,text:'é龍😀\\\n'}))}];
  for(const value of cases)assert.equal(pricingCompletionDigestV1(value),legacyDigest(value));
  const shared={a:1};assert.equal(pricingCompletionDigestV1([shared,shared]),legacyDigest([shared,shared]));
  for(const value of [undefined,NaN,Infinity,-Infinity,1n,()=>0,Symbol('x'),new Date(),Object.create(null),{a:undefined},[undefined],{a:NaN}]) {
    assert.throws(()=>legacyDigest(value));assert.throws(()=>pricingCompletionDigestV1(value));
  }
  const cycle={};cycle.self=cycle;assert.throws(()=>pricingCompletionDigestV1(cycle),/cyclic/);
});

test('bounded snapshot decoder matches native JSON across token and UTF-8 boundaries', t => {
  const {directory}=fixture(t),file=join(directory,'decoder.json');
  const cases=['null','true','false','-0','1e-7','1E+21','1e400','[]','{}',
    '{"__proto__":{"safe":true},"constructor":1,"2":2,"10":10,"01":1,"a":0,"a":4}',
    ' \r\n\t{"a":[true,false,null,-0,1.23e+4],"b":{"c":"龍😀é\\n\\t\\uD800\\uDC00\\\\\\\""}} \n',
    JSON.stringify({padding:'a'.repeat(65520),unicode:'龍😀é'.repeat(100),escaped:'\\"\n\u0000',end:[1,2,3]})];
  for(const text of cases){
    writeFileSync(file,text);const expected=JSON.parse(text);
    for(const chunkBytes of [1,2,3,7,31,65536]){
      const actual=readPricingCompletionQueueSnapshotJsonV1(file,{chunkBytes});
      assert.deepEqual(actual,expected);
      assert.equal(JSON.stringify(actual),JSON.stringify(expected));
      if(actual&&typeof actual==='object'&&!Array.isArray(actual))assert.equal(Object.getPrototypeOf(actual),Object.prototype);
    }
  }
  assert.equal(Object.prototype.safe,undefined);
});

test('bounded snapshot decoder rejects malformed grammar and every truncated compound prefix', t => {
  const {directory}=fixture(t),file=join(directory,'decoder.json');
  const malformed=['',' ','[1,]','[,1]','{"a":1,}','{"a" 1}','{"a":}','{"a":1 "b":2}',
    '[true false]','01','+1','.1','1.','1e','1e+','undefined','NaN','Infinity','true false',
    'null{}','[]{}','[1]x','"unclosed','"bad\\x"','"bad\\u123X"','"raw\nnewline"','\ufeff{}','{}\u00a0'];
  const compound='{"x":[1,{"y":"龍\\\\\\\"\\uD800"}],"z":true}';
  for(let i=0;i<compound.length;i++)malformed.push(compound.slice(0,i));
  for(const text of malformed){
    assert.throws(()=>JSON.parse(text));writeFileSync(file,text);
    for(const chunkBytes of [1,7,65536])assert.throws(()=>readPricingCompletionQueueSnapshotJsonV1(file,{chunkBytes}));
  }
});

test('bounded snapshot UTF-8 replacement semantics match the prior readFileSync parser', t => {
  const {directory}=fixture(t),file=join(directory,'decoder.json');
  for(const middle of [[0xff],[0xe2,0x82],[0xf0,0x9f,0x98,0x80],[0xed,0xa0,0x80],[0xc0,0xaf]]){
    const bytes=Buffer.concat([Buffer.from('{"x":"'),Buffer.from(middle),Buffer.from('"}')]);
    writeFileSync(file,bytes);const expected=JSON.parse(bytes.toString('utf8'));
    for(const chunkBytes of [1,2,3,65536])assert.deepEqual(readPricingCompletionQueueSnapshotJsonV1(file,{chunkBytes}),expected);
  }
});

test('bounded snapshot writer preserves legacy JSON bytes and checksums across Unicode chunk boundaries', t => {
  const {queue,directory}=fixture(t);
  const evidence={numeric:Object.fromEntries(['10','2','01','4294967294','4294967295'].map(key=>[key,key])),
    unicode:'龍😀é'.repeat(5000),lone:'\ud800/\udc00',negativeZero:-0,holes:[,true,,false]};
  const rows=Array.from({length:24},(_,i)=>observation({identity:{...observation().identity,productId:String(500000+i)},evidence}));
  queue.ingest(rows,{now:NOW});
  const bytes=readFileSync(join(directory,'queue.json'),'utf8'),envelope=JSON.parse(bytes);
  assert.ok(Buffer.byteLength(bytes)>1000000);
  assert.equal(bytes,JSON.stringify({digest:legacyDigest(envelope.state),state:envelope.state}));
  assert.equal(envelope.digest,legacyDigest(envelope.state));
  assert.equal(queue.summary({now:NOW}).unresolved,24);
  assert.equal(claim(queue).length,24);
});

test('snapshot corruption and missing initialized snapshot fail closed without replacing evidence', t => {
  const { queue, directory } = fixture(t);
  queue.ingest([observation()], { now: NOW });
  const path = join(directory, 'queue.json');
  const original = readFileSync(path, 'utf8');
  const envelope = JSON.parse(original);
  envelope.state.items[0].reason = 'tampered';
  const changed = JSON.stringify(envelope);
  writeFileSync(path, changed);
  assert.throws(() => queue.snapshot(), /checksum mismatch/);
  assert.equal(readFileSync(path, 'utf8'), changed);
  writeFileSync(path, '{bad JSON');
  assert.throws(() => queue.ingest([], { now: NOW }), /corrupt snapshot JSON/);
  unlinkSync(path);
  assert.throws(() => queue.snapshot(), /initialized queue snapshot missing/);
  assert.equal(existsSync(join(directory, 'writer.lock')), false);
});

test('exclusive lock blocks another queue and stale locks are never stolen', t => {
  let second;
  const { queue, directory } = fixture(t, args => {
    assert.throws(() => second.ingest([], { now: NOW }), /writer lock present/);
    return fixtureVerifier(args);
  });
  second = openPricingCompletionQueueV1({ directory });
  queue.ingest([observation()], { now: NOW });
  const [item] = claim(queue);
  queue.resolve({ key: item.key, leaseToken: item.lease.token, evidence: {}, now: NOW + 1 });
  writeFileSync(join(directory, 'writer.lock'), 'stale lock evidence', { flag: 'wx' });
  assert.throws(() => second.snapshot(), /writer lock present/);
  assert.equal(readFileSync(join(directory, 'writer.lock'), 'utf8'), 'stale lock evidence');
});

test('lease expiry records retry, delays claim and rejects old acknowledgement', t => {
  const { queue } = fixture(t);
  queue.ingest([observation()], { now: NOW });
  const [item] = claim(queue);
  assert.throws(() => queue.defer({ key: item.key, leaseToken: item.lease.token, reason: 'old', nextAction: 'retry', now: NOW + 10000 }), /stale or missing lease/);
  assert.deepEqual(claim(queue, NOW + 10000), []);
  assert.equal(queue.snapshot().items[0].state, 'retry');
  const [again] = claim(queue, NOW + 70000);
  assert.notEqual(again.lease.token, item.lease.token);
  assert.equal(again.attempts, 2);
  assert.throws(() => queue.defer({ key: item.key, leaseToken: item.lease.token, reason: 'old', nextAction: 'retry', now: NOW + 70001 }), /stale or missing lease/);
});

test('source drift reopens resolved work and invalidates outstanding leases', t => {
  const { queue } = fixture(t, fixtureVerifier);
  queue.ingest([observation()], { now: NOW });
  const [item] = claim(queue);
  queue.resolve({ key: item.key, leaseToken: item.lease.token, evidence: {}, now: NOW + 1 });
  assert.equal(queue.summary().counts.resolved, 1);
  queue.ingest([observation({ evidence: { rowDigest: 'c'.repeat(64) } })], { now: NOW + 2 });
  const [changed] = queue.snapshot().items;
  assert.equal(changed.state, 'pending');
  assert.equal(changed.firstSeen, NOW);
  assert.equal(changed.generation, 2);
  assert.equal(changed.attempts, 0);
  assert.equal(changed.totalAttempts, 1);
  assert.ok(changed.history.some(row => row.previous?.resolution));
  const [leased] = claim(queue, NOW + 3);
  queue.ingest([observation({ sourceRunId: 'source-run-2' })], { now: NOW + 4 });
  assert.throws(() => queue.resolve({ key: leased.key, leaseToken: leased.lease.token, evidence: {}, now: NOW + 5 }), /stale or missing lease/);
});

test('absence, review-required and worker success claims never count as complete', t => {
  const { queue } = fixture(t);
  queue.ingest([observation()], { now: NOW });
  queue.ingest([], { now: NOW + 1 });
  const [item] = claim(queue, NOW + 2);
  assert.throws(() => queue.resolve({ key: item.key, leaseToken: item.lease.token,
    evidence: { verified: true, success: true, receiptPath: 'C:/untrusted/receipt.json' }, now: NOW + 3 }), /trusted verifier is not configured/);
  queue.defer({ key: item.key, leaseToken: item.lease.token, reason: 'ambiguous identity', nextAction: 'Acquire printing authority.', reviewRequired: true, now: NOW + 3 });
  assert.equal(queue.summary().unresolved, 1);
  assert.equal(queue.summary().counts.review_needed, 1);
  assert.deepEqual(claim(queue, NOW + 86400000), []);
});

test('retry backoff increases and review explanation survives identical source ingestion', t => {
  const { queue } = fixture(t);
  queue.ingest([observation()], { now: NOW });
  let [item] = claim(queue);
  let result = queue.defer({ key: item.key, leaseToken: item.lease.token, reason: 'provider down', nextAction: 'Retry approved provider.', now: NOW + 1 });
  assert.equal(result.nextAttemptAt, NOW + 60001);
  assert.deepEqual(claim(queue, NOW + 60000), []);
  [item] = claim(queue, NOW + 60001);
  result = queue.defer({ key: item.key, leaseToken: item.lease.token, reason: 'provider down', nextAction: 'Retry approved provider.', now: NOW + 60002 });
  assert.equal(result.nextAttemptAt, NOW + 180002);
});

test('verifier proof binds exact identity/source/run/price and independent principal', t => {
  const corruptions = [
    proof => { proof.key = 'wrong'; }, proof => { proof.sourceDigest = 'c'.repeat(64); },
    proof => { proof.sourceRunId = 'another'; }, proof => { proof.claimRunId = 'another'; },
    proof => { proof.generation += 1; }, proof => { proof.verifierPrincipal = proof.producerPrincipal; },
    proof => { proof.appRead.price = 99; }, proof => { proof.appRead.printingId = 'wrong'; },
    proof => { proof.appRead.provenanceId = 'wrong'; }, proof => { proof.appRead.currency = 'EUR'; },
    proof => { proof.publication.evidenceDigest = ''; }, proof => { proof.publication.price = 0; },
    proof => { proof.appRead.condition = 'LP'; }, proof => { proof.verifiedAt = NOW + 100; },
  ];
  for (const corrupt of corruptions) {
    const { queue } = fixture(t, args => { const proof = fixtureVerifier(args); corrupt(proof); return proof; });
    queue.ingest([observation()], { now: NOW });
    const [item] = claim(queue);
    assert.throws(() => queue.resolve({ key: item.key, leaseToken: item.lease.token, evidence: {}, now: NOW + 1 }));
    assert.equal(queue.snapshot().items[0].state, 'leased');
  }
});

test('plain success verifier and async verifier fail closed', t => {
  for (const verifier of [() => ({ verified: true }), async () => ({ verified: true })]) {
    const { queue } = fixture(t, verifier);
    queue.ingest([observation()], { now: NOW });
    const [item] = claim(queue);
    assert.throws(() => queue.resolve({ key: item.key, leaseToken: item.lease.token, evidence: {}, now: NOW + 1 }));
  }
});

test('trusted independent proof closes exact master pricing gap and remains durable', t => {
  const { queue, directory } = fixture(t, fixtureVerifier);
  queue.ingest([observation({ identity: { kind: 'master', printingId: 'master-print-1', currency: 'USD', condition: 'NM' } })], { now: NOW });
  const [item] = claim(queue);
  const result = queue.resolve({ key: item.key, leaseToken: item.lease.token, evidence: { opaqueEvidenceId: 'trusted-store-id' }, now: NOW + 1 });
  assert.equal(result.state, 'resolved');
  assert.equal(openPricingCompletionQueueV1({ directory }).summary().unresolved, 0);
  assert.ok(result.history.at(-1).proofDigest);
});

test('unknown identity dimensions cannot be completed even by structurally correct proof', t => {
  const { queue } = fixture(t, fixtureVerifier);
  queue.ingest([observation({ identity: { ...observation().identity, currency: 'XXX', condition: 'UNKNOWN' } })], { now: NOW });
  const [item] = claim(queue);
  assert.throws(() => queue.resolve({ key: item.key, leaseToken: item.lease.token, evidence: {}, now: NOW + 1 }), /unresolved identity dimensions/);
});

test('market quote scope closes only with the same independently verified TCGPlayer basis', t => {
  const { queue } = fixture(t, args => {
    const proof = fixtureVerifier(args);
    proof.publication.priceBasis = 'TCGPLAYER_MARKET';
    proof.appRead.priceBasis = 'TCGPLAYER_MARKET';
    return proof;
  });
  queue.ingest([observation({
    identity: { ...observation().identity, condition: 'NOT_CONDITION_SPECIFIC' },
    evidence: { priceBasis: 'TCGPLAYER_MARKET', physicalConditionVerified: false },
  })], { now: NOW });
  const [item] = claim(queue);
  const result = queue.resolve({ key: item.key, leaseToken: item.lease.token,
    evidence: { independentlyAcquiredEvidenceId: 'market-proof-1' }, now: NOW + 1 });
  assert.equal(result.state, 'resolved');
  assert.equal(result.identity.condition, 'NOT_CONDITION_SPECIFIC');
  assert.equal(result.evidence.physicalConditionVerified, false);
  assert.equal(result.resolution.publication.priceBasis, 'TCGPLAYER_MARKET');
  assert.equal(result.resolution.appRead.priceBasis, 'TCGPLAYER_MARKET');
});

test('market quote scope rejects absent or mismatched basis on any evidence side', t => {
  const cases = [
    { itemBasis: null, publicationBasis: 'TCGPLAYER_MARKET', appBasis: 'TCGPLAYER_MARKET' },
    { itemBasis: 'EBAY_ASK', publicationBasis: 'TCGPLAYER_MARKET', appBasis: 'TCGPLAYER_MARKET' },
    { itemBasis: 'TCGPLAYER_MARKET', publicationBasis: null, appBasis: 'TCGPLAYER_MARKET' },
    { itemBasis: 'TCGPLAYER_MARKET', publicationBasis: 'ESTIMATE', appBasis: 'TCGPLAYER_MARKET' },
    { itemBasis: 'TCGPLAYER_MARKET', publicationBasis: 'TCGPLAYER_MARKET', appBasis: null },
    { itemBasis: 'TCGPLAYER_MARKET', publicationBasis: 'TCGPLAYER_MARKET', appBasis: 'TCGPLAYER_LOW' },
  ];
  for (const row of cases) {
    const { queue } = fixture(t, args => {
      const proof = fixtureVerifier(args);
      if (row.publicationBasis !== null) proof.publication.priceBasis = row.publicationBasis;
      if (row.appBasis !== null) proof.appRead.priceBasis = row.appBasis;
      return proof;
    });
    queue.ingest([observation({ identity: { ...observation().identity, condition: 'NOT_CONDITION_SPECIFIC' },
      evidence: row.itemBasis === null ? {} : { priceBasis: row.itemBasis } })], { now: NOW });
    const [item] = claim(queue);
    assert.throws(() => queue.resolve({ key: item.key, leaseToken: item.lease.token,
      evidence: {}, now: NOW + 1 }), /market quote price basis mismatch/);
    assert.equal(queue.summary().unresolved, 1);
    assert.equal(queue.snapshot().items[0].state, 'leased');
  }
});

test('a declared market basis cannot upgrade genuinely unknown legacy dimensions', t => {
  const { queue } = fixture(t, args => {
    const proof = fixtureVerifier(args);
    proof.publication.priceBasis = proof.appRead.priceBasis = 'TCGPLAYER_MARKET';
    return proof;
  });
  queue.ingest([observation({ identity: { ...observation().identity, condition: 'UNKNOWN' },
    evidence: { priceBasis: 'TCGPLAYER_MARKET' } })], { now: NOW });
  const [item] = claim(queue);
  assert.throws(() => queue.resolve({ key: item.key, leaseToken: item.lease.token, evidence: {}, now: NOW + 1 }), /unresolved identity dimensions/);
});

test('plans group scopes but never conflate categories or mutate queue state', t => {
  const { queue } = fixture(t);
  const base = observation();
  queue.ingest([base, observation({ identity: { ...base.identity, productId: '214240' } }),
    observation({ identity: { ...base.identity, category: '1' }, priority: 100 })], { now: NOW });
  const before = queue.snapshot();
  const groups = queue.plan({ now: NOW, limit: 3 });
  assert.equal(groups.length, 2);
  assert.equal(groups[0].category, '1');
  assert.equal(groups[1].items.length, 2);
  assert.ok(groups.every(group => group.mode === 'plan_only'));
  assert.deepEqual(queue.snapshot(), before);
  assert.equal(queue.claim({ owner: 'planner', runId: 'run', limit: 2, now: NOW }).length, 2);
  assert.throws(() => queue.claim({ owner: 'planner', runId: 'run', limit: 501, now: NOW }), /invalid limit/);
});

test('invalid duplicate import is atomic and never partially ingested', t => {
  const { queue } = fixture(t);
  assert.throws(() => queue.ingest([observation(), observation({ reason: 'different' })], { now: NOW }), /conflicting duplicate/);
  assert.equal(queue.snapshot().items.length, 0);
  assert.throws(() => queue.ingest([observation({ evidence: { invalid: undefined } })], { now: NOW }), /non-JSON/);
  assert.equal(pricingCompletionDigestV1({ b: 2, a: 1 }), pricingCompletionDigestV1({ a: 1, b: 2 }));
});

test('batch deferral commits once and a stale acknowledgement rolls the whole batch back', t => {
  const { queue } = fixture(t);
  queue.ingest([observation(), observation({ identity: { ...observation().identity, productId: '999' } })], { now: NOW });
  const claimed = claim(queue);
  const before = queue.snapshot();
  const items = claimed.map(item => ({ key: item.key, leaseToken: item.lease.token,
    reason: 'review needed', nextAction: 'Prepare exact source evidence.', reviewRequired: true }));
  assert.throws(() => queue.deferBatch({ items: [items[0], { ...items[1], leaseToken: 'stale' }], now: NOW + 1 }), /stale or missing lease/);
  assert.deepEqual(queue.snapshot(), before);
  queue.deferBatch({ items, now: NOW + 1 });
  assert.equal(queue.snapshot().revision, before.revision + 1);
  assert.equal(queue.summary().counts.review_needed, 2);
});

test('new snapshot generations cannot starve untouched rows behind repeated high-priority work', t => {
  const { queue } = fixture(t);
  const observations = Array.from({ length: 4 }, (_, i) => observation({
    identity: { ...observation().identity, productId: String(100 + i) },
    priority: i < 2 ? 100 : 0,
  }));
  queue.ingest(observations, { now: NOW });
  const firstBatch = queue.claim({ owner: 'planner', runId: 'first-claim', limit: 2, now: NOW });
  assert.ok(firstBatch.every(item => item.priority === 100));
  queue.deferBatch({ items: firstBatch.map(item => ({ key: item.key, leaseToken: item.lease.token,
    reason: 'packet prepared', nextAction: 'Review exact source.', reviewRequired: true })), now: NOW + 1 });
  // An unrelated whole-snapshot digest and new source run reopen every generation
  // conservatively. Historical attempts must still route untouched work first.
  queue.ingest(observations.map(row => ({ ...row, sourceRunId: 'new-source-run',
    evidence: { ...row.evidence, snapshotContentDigest: 'd'.repeat(64) } })), { now: NOW + 2 });
  const firstKeys = new Set(firstBatch.map(item => item.key));
  const plannedKeys = queue.plan({ limit: 2, now: NOW + 3 }).flatMap(group => group.items.map(item => item.key));
  assert.equal(plannedKeys.length, 2);
  assert.ok(plannedKeys.every(key => !firstKeys.has(key)));
  const secondBatch = queue.claim({ owner: 'planner', runId: 'second-claim', limit: 2, now: NOW + 3 });
  assert.ok(secondBatch.every(item => !firstKeys.has(item.key)));
  assert.ok(secondBatch.every(item => item.priority === 0 && item.totalAttempts === 1 && item.generation === 2));
  assert.equal(new Set([...firstBatch, ...secondBatch].map(item => item.key)).size, 4);
});
