// Exact438 adds current inventory export to qualified portfolio437; receipt delivery stays deferred.
import assert from 'node:assert/strict';
import {portfolioHistoryRelease,portfolioHistoryReleaseSources} from './product_portfolio_history_release_scope_v1.mjs';
export const inventoryExportRelease=Object.freeze({
 root:'C:/gv_product_inventory_export_20261008',
 evidence:'C:/grookai_vault_operator_artifacts/product_inventory_export_20261008',target:portfolioHistoryRelease.target,deferred:portfolioHistoryRelease.deferred,
 migrations:Object.freeze({'20261009010000_inventory_export_v1.sql':'6928c25a7878e3e3daad7f5c55ad70bc210c86afc8539e77b13575019a15d36c'}),
});
export function inventoryExportReleaseSources(sources,baseline){
 assert.equal(Object.keys(sources).length,439);
 assert.equal(new Set(Object.keys(sources).map(n=>n.split('_')[0])).size,439);
 for(const[name,digest]of Object.entries(inventoryExportRelease.migrations))assert.equal(sources[name],digest,name);
 const parent=Object.fromEntries(Object.entries(sources).filter(([name])=>!Object.hasOwn(inventoryExportRelease.migrations,name)));
 return {...portfolioHistoryReleaseSources(parent,baseline),...inventoryExportRelease.migrations};
}
