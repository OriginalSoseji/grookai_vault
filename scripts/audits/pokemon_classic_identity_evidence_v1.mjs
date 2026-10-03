import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {qualifyClassicIdentities} from '../../backend/catalog/pokemon_classic_identity_evidence_v1.mjs';
const args=new Map(process.argv.slice(2).map(a=>{const m=a.match(/^--(source-dir|namespace|out-dir)=(.+)$/);assert.ok(m);return[m[1],m[2]];}));
assert.equal(args.size,3);const root=args.get('source-dir'),out=args.get('out-dir');
const receipts=JSON.parse(fs.readFileSync(path.join(root,'source-acquisition.json')));
const keys=['bulbapedia','pkmncards-clv','pkmncards-clc','pkmncards-clb'];
const sources=keys.map(key=>{const r=receipts.find(r=>r.key===key);assert.ok(r);return{...r,bytes:fs.readFileSync(path.join(root,key+'.html'))};});
const namespace=JSON.parse(fs.readFileSync(args.get('namespace')));
const result=qualifyClassicIdentities({sources,namespace});
// All qualification completes before any artifact is emitted. No active Master write.
fs.mkdirSync(out);fs.mkdirSync(path.join(out,'source_snapshots'));fs.mkdirSync(path.join(out,'source_fixtures'));
const save=(f,v)=>fs.writeFileSync(path.join(out,f),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
for(const s of sources)fs.writeFileSync(path.join(out,'source_snapshots',s.key+'.html.gz'),gzipSync(s.bytes),{flag:'wx'});
save('identity-package.json',result);save('source_fixtures/classic-identity.json',{version:result.version,records:result.records});
save('namespace-snapshot.json',namespace);save('complete.json',{status:'whole102_identity_qualification_passed_finish_incomplete',identities:result.cards.length,source_records:result.records.length,finish_admissions:0,active_master_changed:false,production_writes:0,fingerprint:result.fingerprint});
console.log(JSON.stringify({out,identities:result.cards.length,source_records:result.records.length,finish_admissions:0,write_ready:false}));
