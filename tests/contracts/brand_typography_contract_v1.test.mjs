import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

function fontWeight(path) {
  const font = readFileSync(new URL(path, root));
  for (let index = 0; index < font.readUInt16BE(4); index++) {
    const entry = 12 + index * 16;
    if (font.toString('ascii', entry, entry + 4) === 'OS/2') {
      return font.readUInt16BE(font.readUInt32BE(entry + 8) + 4);
    }
  }
  assert.fail('Bundled font must expose its authored weight');
}

test('web bundles the authored Roboto weights including real Black 900', () => {
  const layout = read('apps/web/src/app/layout.tsx');
  for (const [name, weight] of Object.entries({ Thin: 100, Light: 300, Regular: 400, Medium: 500, Bold: 700, Black: 900 })) {
    const asset = `Roboto-${name}.ttf`;
    const authoredWeight = fontWeight(`apps/web/src/app/fonts/Roboto/${asset}`);
    // The approved legacy Roboto Thin source uses 250 in its OS/2 metadata.
    if (name === 'Thin') assert.ok([100, 250].includes(authoredWeight));
    else assert.equal(authoredWeight, weight);
    assert.ok(layout.includes(`./fonts/Roboto/${asset}`));
  }
  assert.match(layout, /from "next\/font\/local"/);
  assert.match(layout, /roboto\.variable/);
  assert.match(read('apps/web/src/app/launch-identity.css'), /body\s*\{[^}]*font-family: var\(--font-roboto\), Roboto, sans-serif/s);
});

test('canonical lowercase wordmarks share Roboto Black on both responsive headers', () => {
  const brand = read('apps/web/src/components/brand/BrandText.tsx');
  assert.match(brand, /includeVault \? "grookai vault" : "grookai"/);
  assert.match(brand, /fontFamily: "var\(--font-roboto\), Roboto, sans-serif", fontWeight: 900/);
  assert.match(read('apps/web/src/app/layout.tsx'), /applicationName: "grookai vault"/);
  for (const name of ['SiteHeader', 'DesktopApplicationShell']) {
    assert.match(read(`apps/web/src/components/layout/${name}.tsx`), /<BrandLockup\s*\/>/);
  }
});

test('the active seasonal theme owns the logo and matching interface accent', () => {
  const layout = read('apps/web/src/app/layout.tsx');
  const brand = read('apps/web/src/components/brand/BrandText.tsx');
  const css = read('apps/web/src/app/launch-identity.css');
  assert.match(layout, /data-brand-theme=\{ACTIVE_BRAND_THEME\}/);
  assert.match(layout, /style=\{activeBrandStyle\}/);
  assert.match(brand, /fill=\{ACTIVE_BRAND_PALETTE\.logoFill\}/);
  assert.match(css, /--gv-primary: var\(--gv-brand-accent,/);
  assert.match(css, /--gv-primary: var\(--gv-brand-accent-light,/);
  assert.match(css, /mask-image: url\("\/grookai-logo-512.png"\)/);
});
