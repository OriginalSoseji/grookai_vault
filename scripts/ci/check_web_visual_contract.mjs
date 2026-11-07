import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const css = read('apps/web/src/app/launch-identity.css');
const theme = read('apps/web/src/components/brand/brandTheme.ts');
const tile = read('apps/web/src/components/sets/PublicSetTile.tsx');
const sets = read('apps/web/src/lib/publicSets.ts');
const page = read('apps/web/src/app/sets/page.tsx');
const checks = [
  ['active Winter theme', /ACTIVE_BRAND_THEME\s*=\s*"winter"/.test(theme)],
  ['matching seasonal primary colors', (css.match(/--gv-primary: var/g) ?? []).length === 2],
  ['positive logo spacing', /\.gv-brand-lockup\s*\{[^}]*gap: 8px;/.test(css) && !/margin-inline:\s*-8px\s+-6px/.test(css)],
  ['upright set artwork', !tile.includes('rotate-')],
  ['set-level artwork selection restored', /const rowHeroImage = getSetLevelHeroImage\(row\)/.test(sets) && /hero_image_url: heroImageUrl/.test(sets) && !sets.includes('presentation.representative_cover_url')],
  ['no rarity-ranked staging covers', !page.includes("from(\"card_prints\")") && !page.includes('rank(a.rarity)')],
];
for (const name of ['30th', 'me02.5', 'me05']) {
  const file = path.join(root, `apps/web/public/set-logos/${name}.png`);
  checks.push([`bundled ${name} set logo`, fs.existsSync(file) && fs.readFileSync(file).subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))]);
}
const failed = checks.filter(([, passed]) => !passed).map(([name]) => name);
if (failed.length) throw new Error(`Website visual contract drift: ${failed.join(', ')}. Integrate the canonical visual/artwork restoration before publishing.`);
console.log('Website visual contract passed: Winter, logo spacing, upright set/package artwork and bundled logos.');
