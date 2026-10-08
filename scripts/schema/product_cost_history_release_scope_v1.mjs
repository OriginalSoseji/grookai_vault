// Exact436 adds historical correction authority to qualified discount435.
import assert from 'node:assert/strict';
import {discountRelease,discountReleaseSources} from './product_discount_release_scope_v1.mjs';
export const costHistoryRelease=Object.freeze({
 root:'C:/gv_product_cost_history_20261008',
 evidence:'C:/grookai_vault_operator_artifacts/product_cost_history_20261008',
 target:discountRelease.target,
 deferred:discountRelease.deferred,
 migrations:Object.freeze({'20261008190000_vendor_sale_cost_corrections_v1.sql':'1bf69a916c66ef5beb704b37cbc5a4f1a2fb7721cf56e0034dbf4833be6ae4f8'}),
});
export function costHistoryReleaseSources(sources,baseline){
 assert.equal(Object.keys(sources).length,437);
 assert.equal(new Set(Object.keys(sources).map(n=>n.split('_')[0])).size,437);
 for(const[name,digest]of Object.entries(costHistoryRelease.migrations))assert.equal(sources[name],digest,name);
 const parent=Object.fromEntries(Object.entries(sources).filter(([name])=>!Object.hasOwn(costHistoryRelease.migrations,name)));
 return {...discountReleaseSources(parent,baseline),...costHistoryRelease.migrations};
}
