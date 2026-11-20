import crypto from 'node:crypto';
import {parse} from 'parse5';
import {evaluateXyPromoCandidate} from './xy_promo_rarity_candidate_v1.mjs';
export function articleText(html){
 const pieces=[];
 function visit(node){
  if(node.tagName==='script'||node.tagName==='style')return;
  if(node.nodeName==='#text')pieces.push(node.value);
  for(const child of node.childNodes??[])visit(child);
 }
 visit(parse(html));
 return pieces.join(' ').replace(/\s+/g,' ');
}
const ARTICLES=Object.freeze({
 XY177:{url:'https://bulbapedia.bulbagarden.net/wiki/Karen_%28The_Best_of_XY_183%29',
  sha256:'20ce442161dd36d238fb8e39aaa44a0c8755af492887c354f346047a5ae91f31',name:'Karen'},
 XY198:{url:'https://bulbapedia.bulbagarden.net/wiki/M_Camerupt-EX_%28XY_Promo_198%29',
  sha256:'649c5d6044f8afc2c7db3b59761c27e997cb44b0d53ab7c721a1e215bfb5c07e',name:'M Camerupt-EX'},
});
export function reviewXyPromoFamily(input,receipt,bytes){
 const candidate=evaluateXyPromoCandidate(input);if(candidate.status!=='candidate_only')return candidate;
 const number=input.parent.number,expected=ARTICLES[number];
 if(!expected||!Buffer.isBuffer(bytes)||receipt?.status!==200||receipt.url!==expected.url||receipt.bytes!==bytes.length||
    receipt.sha256!==expected.sha256||crypto.createHash('sha256').update(bytes).digest('hex')!==expected.sha256)
  return {status:'checklist_receipt_mismatch'};
 const text=articleText(bytes.toString('utf8'));
 if(input.parent.name!==expected.name||!new RegExp(`English card no\\.\\s+${number}\\b`).test(text)||
    !new RegExp(`English card no\\.\\s+${number}a\\b`).test(text)||!/XY Black Star Promos/.test(text))
  return {status:'checklist_fact_mismatch'};
 return {status:'family_corroborated_review_only',number,source_url:expected.url,source_sha256:expected.sha256,
  source_scope:'XY Black Star Promo family and number; no artwork or rarity-precedence decision',
  preserved_conflict:{parent:'Common',tcgdex_trait:'Common',pokemonapi:'Promo',tcgplayer:'Promo'}};
}
