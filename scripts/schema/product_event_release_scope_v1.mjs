// Exact additive release identity. Deferred delivery remains outside the package.
import assert from 'node:assert/strict';
import {dealRelease,dealReleaseSources} from './product_deal_release_scope_v1.mjs';
export const eventRelease=Object.freeze({
 root:'C:/gv_product_event_closeout_20261008',
 evidence:'C:/grookai_vault_operator_artifacts/product_event_closeout_20261008',
 target:dealRelease.target,
 deferred:dealRelease.deferred,
 migration:'20261008130000_vendor_events_v1.sql',
 sha256:'7cb18bbeecd9af2b32d9adb77ae92877d74da40a989a7d9d7e373d003f635ff4',
});
export function eventReleaseSources(sources,baseline){
 assert.equal(Object.keys(sources).length,434);
 assert.equal(new Set(Object.keys(sources).map(n=>n.split('_')[0])).size,434);
 assert.equal(sources[eventRelease.migration],eventRelease.sha256);
 const parent=Object.fromEntries(Object.entries(sources).filter(([name])=>name!==eventRelease.migration));
 const exact=dealReleaseSources(parent,baseline);
 return {...exact,[eventRelease.migration]:eventRelease.sha256};
}
