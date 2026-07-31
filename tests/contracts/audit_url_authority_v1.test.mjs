import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  hostnameMatches,
  isHttpUrl,
  isUrlFromHostname,
  parseHttpUrl,
  resolveSameOriginHttpUrl,
} from '../../scripts/audits/lib/url_authority_v1.mjs';

test('parseHttpUrl accepts only HTTP and HTTPS URLs', () => {
  assert.equal(parseHttpUrl('https://example.com/path')?.hostname, 'example.com');
  assert.equal(parseHttpUrl('http://example.com/path')?.hostname, 'example.com');
  assert.equal(parseHttpUrl('data:text/html,hello'), null);
  assert.equal(parseHttpUrl('javascript:alert(1)'), null);
  assert.equal(parseHttpUrl('vbscript:msgbox(1)'), null);
  assert.equal(parseHttpUrl('not a url'), null);
  assert.equal(isHttpUrl('https://example.com'), true);
  assert.equal(isHttpUrl('/relative'), false);
});

test('hostnameMatches distinguishes exact hosts, subdomains, and lookalikes', () => {
  assert.equal(hostnameMatches('api.pokemontcg.io', 'api.pokemontcg.io'), true);
  assert.equal(hostnameMatches('www.tcgplayer.com', 'tcgplayer.com'), false);
  assert.equal(hostnameMatches('www.tcgplayer.com', 'tcgplayer.com', { allowSubdomains: true }), true);
  assert.equal(hostnameMatches('tcgplayer.com.evil.test', 'tcgplayer.com', { allowSubdomains: true }), false);
  assert.equal(hostnameMatches('eviltcgplayer.com', 'tcgplayer.com', { allowSubdomains: true }), false);
  assert.equal(hostnameMatches('TCGPLAYER.COM.', 'tcgplayer.com'), true);
});

test('isUrlFromHostname does not leak authority to URL lookalikes', () => {
  const secureOnly = { httpsOnly: true };
  assert.equal(isUrlFromHostname('https://api.pokemontcg.io/v2/cards', 'api.pokemontcg.io', secureOnly), true);
  assert.equal(isUrlFromHostname('http://api.pokemontcg.io/v2/cards', 'api.pokemontcg.io', secureOnly), false);
  assert.equal(isUrlFromHostname('https://api.pokemontcg.io.evil.test/v2/cards', 'api.pokemontcg.io', secureOnly), false);
  assert.equal(isUrlFromHostname('https://api.pokemontcg.io@evil.test/v2/cards', 'api.pokemontcg.io', secureOnly), false);
  assert.equal(isUrlFromHostname('https://www.pricecharting.com/game/pokemon/test', 'pricecharting.com', {
    allowSubdomains: true,
    pathPrefix: '/game/',
  }), true);
  assert.equal(isUrlFromHostname('https://www.pricecharting.com/offers/test', 'pricecharting.com', {
    allowSubdomains: true,
    pathPrefix: '/game/',
  }), false);
});

test('resolveSameOriginHttpUrl rejects dangerous and cross-origin links', () => {
  const baseUrl = 'https://grookai.example';
  assert.equal(resolveSameOriginHttpUrl('/cards/one', baseUrl, '/sets/base')?.href, 'https://grookai.example/cards/one');
  assert.equal(resolveSameOriginHttpUrl('../cards/two', baseUrl, '/sets/base/')?.href, 'https://grookai.example/sets/cards/two');
  assert.equal(resolveSameOriginHttpUrl('https://grookai.example/cards/three', baseUrl)?.pathname, '/cards/three');
  assert.equal(resolveSameOriginHttpUrl('https://evil.test/cards/one', baseUrl), null);
  assert.equal(resolveSameOriginHttpUrl('data:text/html,hello', baseUrl), null);
  assert.equal(resolveSameOriginHttpUrl('javascript:alert(1)', baseUrl), null);
  assert.equal(resolveSameOriginHttpUrl('vbscript:msgbox(1)', baseUrl), null);
});

test('repaired acquisition scripts retain explicit authority boundaries', () => {
  const apiKeyFiles = [
    'scripts/audits/card_row_enrichment_enrich11_source_mapped_trait_guarded_dry_run_v1.mjs',
    'scripts/audits/card_row_enrichment_enrich12a_residual_trait_retry_guarded_dry_run_v1.mjs',
  ];
  for (const file of apiKeyFiles) {
    const source = readFileSync(file, 'utf8');
    assert.match(source, /isUrlFromHostname\(url, 'api\.pokemontcg\.io', \{ httpsOnly: true \}\)/, file);
    assert.doesNotMatch(source, /url\.includes\('api\.pokemontcg\.io'\)/, file);
  }

  const pkmnCollectorsFiles = [
    'scripts/audits/english_master_index_pkmncollectors_futsal_acquisition_v1.mjs',
    'scripts/audits/english_master_index_pkmncollectors_sm1_energy_acquisition_v1.mjs',
    'scripts/audits/english_master_index_pkmncollectors_xya_acquisition_v1.mjs',
  ];
  for (const file of pkmnCollectorsFiles) {
    const source = readFileSync(file, 'utf8');
    assert.match(source, /target\.cardName/, file);
    assert.match(source, /target\.sourceUrl/, file);
    assert.doesNotMatch(source, /const \[cardNumber, cardName(?:, sourceUrl)?\] = target/, file);
  }

  const linkAudit = readFileSync('scripts/audits/web_cohesion_link_integrity_v1.mjs', 'utf8');
  assert.match(linkAudit, /resolveSameOriginHttpUrl\(href, baseUrl, currentPathname\)/);

  const legacyUploader = readFileSync(
    'scripts/audits/self_hosted_images_wh05b_trainer_kit_runtime_storage_upload_apply.mjs',
    'utf8',
  );
  assert.doesNotMatch(legacyUploader, /rejectUnauthorized:\s*false/);
  assert.doesNotMatch(legacyUploader, /tls_verification_disabled/);
});
