import { sellerObjectLookup } from './ebay_seller_object_fingerprints_v1.mjs';
export { captureSellerObjectsSql } from './ebay_seller_object_fingerprints_v1.mjs';
const literal = value => "'" + value.replaceAll("'", "''") + "'";
export const sellerClaimIdentity = 'public.ebay_seller_operation_claim_v1(uuid, uuid, uuid, text, bigint, text, uuid)';
export const sellerClaimBaseIdentity = 'public.ebay_seller_operation_claim_base480_v1(uuid, uuid, uuid, text, bigint, text, uuid)';
export const sellerCompleteIdentity = 'public.ebay_seller_operation_complete_v1(uuid, uuid, uuid, jsonb, text)';
export const sellerCompleteBaseIdentity = 'public.ebay_seller_operation_complete_base480_v1(uuid, uuid, uuid, jsonb, text)';
export function sellerRecoveryGuardSql(specs, originalHashes) {
  const pairs = [[sellerClaimIdentity,sellerClaimBaseIdentity],[sellerCompleteIdentity,sellerCompleteBaseIdentity]];
  if (!Array.isArray(specs) || specs.length !== 81 || pairs.some(([identity,base]) =>
      !/^[a-f0-9]{64}$/.test(originalHashes?.[identity]) || !specs.some(s => s.identity === identity)
      || !specs.some(s => s.identity === base))) throw Error('Incomplete seller recovery capture');
  const bases = new Set(pairs.map(([,base]) => base));
  const checks = specs.map(spec => {
    if (!/^[a-f0-9]{64}$/.test(spec.hash)) throw Error('Missing recovery fingerprint');
    const expected = [spec.hash, ...(originalHashes[spec.identity] ? [originalHashes[spec.identity]] : [])];
    return `actual:=${sellerObjectLookup(spec.kind,spec.identity)}; ${bases.has(spec.identity) ? '' : "if actual is null then raise exception 'ebay_seller_recovery_missing_dependency'; end if;"} if actual is not null and actual not in (${expected.map(literal).join(',')}) then raise exception 'ebay_seller_recovery_${spec.kind}_drift'; end if;`;
  });
  const signatures = specs.filter(s => s.kind === 'function').map(s => literal(s.identity));
  const baseChecks = pairs.map(([identity,base]) => `if ${sellerObjectLookup('function',base)} is null and ${sellerObjectLookup('function',identity)} is distinct from ${literal(originalHashes[identity])} then raise exception 'ebay_seller_recovery_base_missing'; end if;`).join('\n');
  return `-- BEGIN EXACT SELLER RECOVERY GUARDS\nset local search_path=pg_catalog,public,extensions;\ndo $seller_recovery_guards$ declare actual text; begin\n${baseChecks}\nif exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'ebay_seller_%_v1' and format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes)) not in (${signatures.join(',')})) then raise exception 'ebay_seller_recovery_overload_drift'; end if;\n${checks.join('\n')}\nend $seller_recovery_guards$;\n-- END EXACT SELLER RECOVERY GUARDS\n`;
}
