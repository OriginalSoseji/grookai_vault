import {captureObjectsSql,objectLookup} from './reviewed_intake_object_fingerprints_v1.mjs';
export function captureDateObjectsSql(){
  const original=captureObjectsSql().trim().replace(/;$/,'');
  const lookup=objectLookup('function','public.vault_intake_acquisition_instant_v1(date, jsonb)');
  return "select jsonb_agg(item order by item->>'kind',item->>'identity') from jsonb_array_elements(("+original+") || jsonb_build_array(jsonb_build_object('kind','function','identity','public.vault_intake_acquisition_instant_v1(date, jsonb)','hash',"+lookup+"))) item;";
}
