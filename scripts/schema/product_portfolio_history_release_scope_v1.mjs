// Exact437 adds private portfolio history to qualified cost-history436.
import assert from 'node:assert/strict';
import {costHistoryRelease,costHistoryReleaseSources} from './product_cost_history_release_scope_v1.mjs';
export const portfolioHistoryRelease=Object.freeze({
 root:'C:/gv_product_portfolio_history_20261008',
 evidence:'C:/grookai_vault_operator_artifacts/product_portfolio_history_20261008',target:costHistoryRelease.target,deferred:costHistoryRelease.deferred,
 migrations:Object.freeze({'20261008220000_portfolio_history_v1.sql':'172d6e47342a77827d0af11c3bece71e3c111b74f261e3713199427f28e19e52'}),
});
export function portfolioHistoryReleaseSources(sources,baseline){
 assert.equal(Object.keys(sources).length,438);
 assert.equal(new Set(Object.keys(sources).map(n=>n.split('_')[0])).size,438);
 for(const[name,digest]of Object.entries(portfolioHistoryRelease.migrations))assert.equal(sources[name],digest,name);
 const parent=Object.fromEntries(Object.entries(sources).filter(([name])=>!Object.hasOwn(portfolioHistoryRelease.migrations,name)));
 return {...costHistoryReleaseSources(parent,baseline),...portfolioHistoryRelease.migrations};
}
