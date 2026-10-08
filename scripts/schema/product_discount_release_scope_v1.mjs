// Exact435 release adds qualified discounts and durable cancellation to event433.
import assert from 'node:assert/strict';
import {eventRelease,eventReleaseSources} from './product_event_release_scope_v1.mjs';
export const discountRelease=Object.freeze({
 root:'C:/gv_product_discount_20261008',
 evidence:'C:/grookai_vault_operator_artifacts/product_discount_20261008',
 target:eventRelease.target,
 deferred:eventRelease.deferred,
 migrations:Object.freeze({
  '20261008160000_vendor_discounts_v1.sql':'a447b9e71eed6ba58fa6e7341c2acdc3b71e9f09c41961b5b033fec556f79ebe',
  '20261008170000_vendor_discount_cancellation_v1.sql':'e7803a8dff1415628c8d25813914ab3e68f2c8846f9af0f7ec036d7cff45f578',
 }),
});
export function discountReleaseSources(sources,baseline){
 assert.equal(Object.keys(sources).length,436);
 assert.equal(new Set(Object.keys(sources).map(n=>n.split('_')[0])).size,436);
 for(const[name,digest]of Object.entries(discountRelease.migrations))assert.equal(sources[name],digest,name);
 const parent=Object.fromEntries(Object.entries(sources).filter(([name])=>!Object.hasOwn(discountRelease.migrations,name)));
 return {...eventReleaseSources(parent,baseline),...discountRelease.migrations};
}
