// Retain OCR provenance: weak noise cannot create or veto a printed identity.
import { readPrintedFooter } from './scanPrintedIdentityV9.mjs';
export const STRONG_WORD_CONFIDENCE = 75;
export const REPEAT_WORD_CONFIDENCE = 35;

function tokens(data, threshold) {
  const found = new Map();
  for (const block of data.blocks ?? []) for (const paragraph of block.paragraphs ?? []) for (const line of paragraph.lines ?? []) {
    // Unknown spans are explicit separators; never join digits across them or
    // manufacture a language mark by joining words from different OCR lines.
    const text = (line.words ?? []).map(word => Number.isFinite(word.confidence) && word.confidence >= threshold ? word.text : ' [?] ').join(' ');
    const read = readPrintedFooter(text);
    for (const row of read.fractions) found.set('fraction:' + row.number.key + '/' + row.total.key, { kind: 'fraction', text: row.number.key + '/' + row.total.key });
    for (const row of read.promos) found.set('promo:' + row.key, { kind: 'promo', text: row.key });
    for (const code of read.setCodes) found.set('set:' + code, { kind: 'set', text: code + ' EN' });
  }
  return found;
}

export function qualifiedFooter(reads) {
  const strong = new Map(), repeated = new Map();
  for (const read of reads) {
    for (const [key, token] of tokens(read.data, STRONG_WORD_CONFIDENCE)) strong.set(key, token);
    for (const [key, token] of tokens(read.data, REPEAT_WORD_CONFIDENCE)) {
      const entry = repeated.get(key) ?? { ...token, crops: new Set() };
      entry.crops.add(read.crop); repeated.set(key, entry);
    }
  }
  const strongKinds = new Set([...strong.values()].map(token => token.kind));
  const accepted = [...strong.values()];
  for (const [key, token] of repeated) if (!strong.has(key) && !strongKinds.has(token.kind) && token.crops.size >= 2) accepted.push(token);
  return accepted.map(token => token.text).join(' | ');
}
