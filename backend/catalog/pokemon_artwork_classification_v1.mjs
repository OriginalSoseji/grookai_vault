import {parse} from 'parse5';
import {createHash,randomUUID} from 'node:crypto';

export const artworkSource = 'grookai_catalog_artwork_reference_v1';
export const bodyHash = body => createHash('sha256').update(body).digest('hex');

export async function runArtworkBuild(store, work) {
  const run={run_id:randomUUID(),version:'pokemon_artwork_classification:v1',purpose:'catalog_artwork_metadata_build',
    started_at:new Date().toISOString(),status:'running',stage:'verify_bindings'};
  try{await store.saveRun(run);}catch(error){error.artwork_run_id=run.run_id;error.artwork_stage='start_run_receipt';throw error;}
  let summary;
  try {
    summary=await work(run);
  } catch(error) {
    error.artwork_run_id=run.run_id;error.artwork_stage=run.stage;
    const error_code=/^[A-Z][A-Z0-9_]+$/.test(error.message??'')?error.message:'ARTWORK_BUILD_FAILED';
    await store.saveRun({...run,status:'failed',finished_at:new Date().toISOString(),error_code,
      error_detail:`Artwork metadata build stopped during ${run.stage}; existing staged originals are retained.`});
    throw error;
  }
  // A terminal persistence error is uncertain. Do not write a contradictory
  // failed terminal after a success may already have reached the DB.
  try{await store.saveRun({...run,status:'succeeded',finished_at:new Date().toISOString(),summary});}
  catch(error){error.artwork_run_id=run.run_id;error.artwork_stage='terminal_receipt';error.artwork_terminal_uncertain=true;throw error;}
  return summary;
}
const normalized = value => String(value ?? '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const text = node => node.nodeName === '#text' ? node.value : (node.childNodes ?? []).map(text).join(' ');
const attr = (node, name) => node.attrs?.find(item => item.name === name)?.value;
function find(node, predicate, result = []) {
  if (predicate(node)) result.push(node);
  for (const child of node.childNodes ?? []) find(child, predicate, result);
  return result;
}

// Only the provider's own structured Details fields count. Auction titles,
// prices, search snippets and the surrounding page cannot classify artwork.
export function readArtworkReference(receipt) {
  const url = new URL(receipt.url);
  if (url.origin !== 'https://www.pricecharting.com' || !/^\/game\/pokemon-[a-z0-9-]+\/[a-z0-9'-]+$/.test(decodeURIComponent(url.pathname)) ||
      url.search || url.hash || typeof receipt.body_text !== 'string' || Buffer.byteLength(receipt.body_text) > 4 * 1024 * 1024 ||
      bodyHash(receipt.body_text) !== receipt.body_sha256) throw Error('ARTWORK_REFERENCE_INTEGRITY');
  const root = parse(receipt.body_text);
  const headings = find(root, node => node.tagName === 'h1' && attr(node, 'id') === 'product_name');
  if (headings.length !== 1) throw Error('ARTWORK_REFERENCE_HEADING');
  const heading = headings[0], links = find(heading, node => node.tagName === 'a' && attr(node, 'href')?.startsWith('/console/pokemon-'));
  if (links.length !== 1) throw Error('ARTWORK_REFERENCE_SET');
  const title = (heading.childNodes ?? []).filter(node => node.nodeName === '#text').map(text).join(' ').replace(/\s+/g, ' ').trim();
  const match = /^(.*?)\s+#(\d+)$/.exec(title);
  if (!match) throw Error('ARTWORK_REFERENCE_NAME_NUMBER');
  const fields = new Map();
  const details=find(root,node=>node.tagName==='table'&&attr(node,'id')==='attribute');
  if(details.length!==1)throw Error('ARTWORK_REFERENCE_DETAILS');
  for (const tr of find(details[0], node => node.tagName === 'tr')) {
    const cells = (tr.childNodes ?? []).filter(node => node.tagName === 'td');
    if (cells.length !== 2 || !attr(cells[0], 'class')?.split(/\s+/).includes('title')) continue;
    const key = text(cells[0]).replace(/\s+/g, ' ').trim();
    if (!['Notes:', 'Card Number:', 'TCGPlayer ID:'].includes(key)) continue;
    if (fields.has(key)) throw Error('ARTWORK_REFERENCE_DUPLICATE_FIELD');
    fields.set(key, text(cells[1]).replace(/\s+/g, ' ').trim());
  }
  const number = fields.get('Card Number:')?.match(/^#(\d+)$/)?.[1];
  const product = fields.get('TCGPlayer ID:');
  if (!number || Number(number) !== Number(match[2]) || !/^\d+$/.test(product ?? '')) throw Error('ARTWORK_REFERENCE_COORDINATES');
  return {name: match[1], number, set_name: text(links[0]).replace(/^\s*Pokemon\s+/i, '').replace(/\s+/g, ' ').trim(),
    product_id: product, notes: fields.get('Notes:') ?? '', source_url: receipt.url, body_sha256: receipt.body_sha256};
}

export function classifyArtworkReference({receipt, parent, catalog, mappings, setName}) {
  const reference = readArtworkReference(receipt);
  const hold = reason => ({state: 'held', reason, card_print_id: parent.id});
  if (!catalog?.identity_active || !catalog.identity_consistent || !catalog.publicly_visible ||
      catalog.identity_domain !== 'pokemon_eng_standard' || parent.identity_domain !== catalog.identity_domain ||
      ['name', 'gv_id', 'set_code', 'number'].some(key => parent[key] !== catalog[key])) return hold('CATALOG_IDENTITY');
  const owners = mappings.filter(mapping => mapping.source === 'tcgplayer' && mapping.active && mapping.external_id === reference.product_id);
  if (owners.length !== 1 || owners[0].card_print_id !== parent.id ||
      normalized(reference.name) !== normalized(parent.name) || Number(reference.number) !== Number(parent.number) ||
      normalized(reference.set_name) !== normalized(setName)) return hold('SOURCE_COORDINATES');
  if (normalized(reference.notes) !== 'full art') return hold('NO_EXPLICIT_FULL_ART');
  return {state: 'classified', row: {card_print_id: parent.id, gv_id: parent.gv_id, name: parent.name,
    set_code: parent.set_code, number: parent.number, rarity: parent.rarity,
    variant_key: parent.variant_key ?? '', printed_identity_modifier: parent.printed_identity_modifier ?? null,
    category: 'Full Art', evidence: {source_url: reference.source_url, body_sha256: reference.body_sha256,
      source_field: 'Details.Notes', source_value: reference.notes, product_id: reference.product_id,
      mapping_id: String(owners[0].id), identity_id: catalog.identity_id, identity_key_hash: catalog.identity_key_hash}}};
}

export function classifyCatalogProductArtwork({product, group, parent, catalog, mappings, setName}) {
  const hold=reason=>({state:'held',reason,card_print_id:parent.id});
  const raw=product.raw_payload, name=/^(.*?)\s+\(Full Art\)$/i.exec(raw?.name??'');
  if(!name||product.category_id!==3||raw.categoryId!==3||!product.source_active||product.catalog_metadata_status!=='current')return hold('NO_EXPLICIT_FULL_ART');
  const number=raw.extendedData?.filter(field=>field.name==='Number');
  const groupName=normalized(group?.name).replace(/^(?:sm|xy|swsh|sv\d+) /,'');
  const owners=mappings.filter(row=>row.source==='tcgplayer'&&row.active&&row.external_id===String(raw.productId));
  if(!catalog?.identity_active||!catalog.identity_consistent||!catalog.publicly_visible||catalog.identity_domain!=='pokemon_eng_standard'||
      ['name','gv_id','set_code','number'].some(key=>parent[key]!==catalog[key])||
      product.product_id!==raw.productId||product.group_id!==raw.groupId||group?.group_id!==raw.groupId||groupName!==normalized(setName)||
      number?.length!==1||!/^\d+\/\d+$/.test(number[0].value)||Number(number[0].value.split('/')[0])!==Number(parent.number)||
      normalized(name[1])!==normalized(parent.name)||owners.length!==1||owners[0].card_print_id!==parent.id)return hold('SOURCE_COORDINATES');
  const url=new URL(product.source_url);
  if(url.origin!=='https://www.tcgplayer.com'||!url.pathname.startsWith(`/product/${raw.productId}/`))return hold('SOURCE_COORDINATES');
  return {state:'classified',row:{card_print_id:parent.id,gv_id:parent.gv_id,name:parent.name,set_code:parent.set_code,number:parent.number,rarity:parent.rarity,
    variant_key:parent.variant_key??'',printed_identity_modifier:parent.printed_identity_modifier??null,category:'Full Art',
    evidence:{source_url:url.href,body_sha256:bodyHash(JSON.stringify(raw)),source_field:'name',source_value:raw.name,
      product_id:String(raw.productId),mapping_id:String(owners[0].id),identity_id:catalog.identity_id,identity_key_hash:catalog.identity_key_hash}}};
}
