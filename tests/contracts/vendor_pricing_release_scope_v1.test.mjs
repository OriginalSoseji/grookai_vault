import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {validateVendorPricingReleaseArgs,validateVendorPricingReleaseSources} from '../../scripts/schema/verify_vendor_pricing_release_v1.mjs';
const manifest=JSON.parse(fs.readFileSync(new URL('../../docs/audits/vendor_pricing_20261112/release-manifest-v1.json',import.meta.url)));
const files=Object.fromEntries(Object.keys({...manifest.history,...manifest.candidates}).map(name=>[name,fs.readFileSync(new URL('../../supabase/migrations/'+name,import.meta.url))]));
test('release gate permits the one new candidate after the approved493 history',()=>{
 assert.equal(validateVendorPricingReleaseSources(files,manifest).length,494);
 const approved=JSON.parse(fs.readFileSync(new URL('../../docs/audits/square_commerce_20261111/release-manifest-v6.json',import.meta.url)));
 assert.deepEqual(manifest.history,{...approved.history,...approved.candidates});
});
test('changed historical bytes, extra pending versions and missing files fail closed',()=>{
 const historical=Object.keys(manifest.history)[0];
 for(const mutation of [{...files,[historical]:Buffer.from('changed')},{...files,'20261112180100_unapproved.sql':Buffer.from('select 1;')},Object.fromEntries(Object.entries(files).slice(1))])assert.throws(()=>validateVendorPricingReleaseSources(mutation,manifest));
});
test('release audit cannot escape its fixed private directory or accept other phases',()=>{
 assert.equal(validateVendorPricingReleaseArgs(['AuditLinkedSchema','--out-dir=C:/grookai_vault_operator_artifacts/vendor_rules_labels_20261112/release-gate-test']).phase,'AuditLinkedSchema');
 for(const args of [['Apply','--out-dir=C:/grookai_vault_operator_artifacts/vendor_rules_labels_20261112/release-gate-test'],['PrePush','--out-dir=C:/other/release-gate-test'],['PrePush','--out-dir=C:/grookai_vault_operator_artifacts/vendor_rules_labels_20261112/../release-gate-test'],['PrePush','--out-dir=C:/grookai_vault_operator_artifacts/vendor_rules_labels_20261112/release-gate-test','--reset']])assert.throws(()=>validateVendorPricingReleaseArgs(args));
});
