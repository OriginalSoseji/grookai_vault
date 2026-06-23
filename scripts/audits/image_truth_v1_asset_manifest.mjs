import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const OUTPUT_DIR = 'docs/audits/image_truth_v1';
const SOURCE_PACKET_JSON = path.join(OUTPUT_DIR, 'image_truth_missing_display_source_packet_v1.json');
const ASSET_MANIFEST_JSON = path.join(OUTPUT_DIR, 'image_truth_missing_display_asset_manifest_v1.json');
const ASSET_MANIFEST_MD = path.join(OUTPUT_DIR, 'image_truth_missing_display_asset_manifest_v1.md');
const IMAGE_SOURCE_STATUSES = new Set(['source_url_preserved', 'representative_source_url_preserved']);
const FETCH_TIMEOUT_MS = 20000;
const BROWSER_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

function clean(value) {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeNumber(value) {
  return String(value ?? '').trim().toLowerCase().replace(/^0+(?=\d)/, '');
}

function normalizeFinish(value) {
  const normalized = String(value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (normalized === 'reverse_holo') return 'reverse';
  if (normalized === 'cosmos_holo') return 'cosmos';
  if (normalized === 'poke_ball_reverse') return 'pokeball';
  if (normalized === 'master_ball_reverse') return 'masterball';
  return normalized;
}

function expectedFinishText(row) {
  const finish = normalizeFinish(row.finish_key);
  if (finish === 'reverse') return 'reverse holo';
  if (finish === 'cosmos') return 'cosmos holo';
  if (finish === 'cracked_ice') return 'cracked ice holo';
  if (finish === 'normal') return null;
  return finish.replace(/_/g, ' ');
}

function imageAltMatches(row, alt) {
  const normalizedAlt = normalizeText(alt);
  if (!normalizedAlt) return false;
  if (!normalizedAlt.includes(normalizeText(row.card_name))) return false;
  if (!normalizedAlt.includes(normalizeNumber(row.number))) return false;
  const finishText = expectedFinishText(row);
  if (finishText && !normalizedAlt.includes(finishText)) return false;
  return true;
}

function imageAltMatchesMeeGrassReverse(row, alt) {
  if (String(row.set_code ?? '').toLowerCase() !== 'mee') return false;
  if (normalizeFinish(row.finish_key) !== 'reverse') return false;
  if (normalizeNumber(row.number) !== '1') return false;
  if (normalizeText(row.card_name) !== 'basic grass energy') return false;
  const normalizedAlt = normalizeText(alt);
  return normalizedAlt.includes('basis energy grass')
    && normalizedAlt.includes('reverse holo')
    && normalizedAlt.includes('1')
    && normalizedAlt.includes('pokemon mega evolution energy');
}

async function fetchHtmlWithPowerShell(url) {
  if (process.platform !== 'win32') return null;
  const command = [
    '& {',
    'param($u)',
    '$ProgressPreference = "SilentlyContinue";',
    '[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12;',
    '$response = Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 20;',
    '[Console]::Out.Write($response.Content)',
    '}',
  ].join(' ');
  const result = await execFileAsync('powershell.exe', ['-NoProfile', '-Command', command, url], {
    maxBuffer: 4 * 1024 * 1024,
    timeout: 30000,
  });
  return result.stdout;
}

async function fetchHtmlWithCurl(url) {
  if (process.platform !== 'win32') return null;
  const result = await execFileAsync('curl.exe', [
    '--ssl-no-revoke',
    '-L',
    '--max-time',
    '30',
    '-A',
    BROWSER_USER_AGENT,
    url,
  ], {
    maxBuffer: 8 * 1024 * 1024,
    timeout: 45000,
  });
  return result.stdout;
}

function isCloudflareChallengeHtml(html) {
  const normalized = String(html ?? '').toLowerCase();
  return normalized.includes('just a moment') && normalized.includes('challenge-platform');
}

async function fetchHtml(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent': 'GrookaiImageTruthAudit/1.0 (+audit-only; source-image-manifest)',
        accept: 'text/html',
      },
    });
    if (response.ok) {
      const html = await response.text();
      if (!isCloudflareChallengeHtml(html)) return html;
    }
  } catch {
    // Fall through to PowerShell on Windows, which uses the OS certificate store.
  } finally {
    clearTimeout(timeout);
  }
  let html = await fetchHtmlWithPowerShell(url);
  if (html && !isCloudflareChallengeHtml(html)) return html;
  html = await fetchHtmlWithCurl(url);
  if (html && !isCloudflareChallengeHtml(html)) return html;
  return html;
}

async function fetchJson(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'user-agent': 'GrookaiImageTruthAudit/1.0 (+audit-only; source-image-manifest)',
        accept: 'application/json',
      },
    });
    if (response.ok) return await response.json();
  } catch {
    // Fall through to text fetch for Windows certificate compatibility.
  }
  const text = await fetchHtml(url);
  return JSON.parse(text);
}

function decodeHtml(value) {
  return String(value ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function extractImages(html) {
  const images = [];
  const imgRegex = /<img\b[^>]*>/gi;
  const attrRegex = /\b(src|alt)=["']([^"']*)["']/gi;
  for (const [tag] of String(html ?? '').matchAll(imgRegex)) {
    const image = {};
    for (const [, key, value] of tag.matchAll(attrRegex)) {
      image[key.toLowerCase()] = decodeHtml(value);
    }
    if (image.src) images.push(image);
  }
  return images;
}

function htmlTitle(html) {
  const match = String(html ?? '').match(/<title[^>]*>([^<]+)<\/title>/i);
  return clean(match?.[1]?.replace(/\s+/g, ' '));
}

function isPriceChartingSource(url) {
  return String(url ?? '').startsWith('https://www.pricecharting.com/');
}

function isPriceChartingMfbRepresentativeSource(source) {
  return source?.source_key === 'pricecharting_mfb_representative_card_page'
    && String(source?.source_url ?? '').startsWith('https://www.pricecharting.com/game/pokemon-my-first-battle/');
}

function isTcgCollectorMfbRepresentativeSource(source) {
  return source?.source_key === 'tcgcollector_mfb_representative_card_page'
    && String(source?.source_url ?? '').startsWith('https://www.tcgcollector.com/cards/');
}

function isTcgCollectorCardVariantSource(source) {
  return source?.source_key === 'tcgcollector_card_variants'
    && String(source?.source_url ?? '').startsWith('https://www.tcgcollector.com/cards/');
}

function isTcgdexApiCardSource(url) {
  return String(url ?? '').startsWith('https://api.tcgdex.net/v2/en/cards/');
}

function isTcgplayerSource(url) {
  return String(url ?? '').startsWith('https://www.tcgplayer.com/product/');
}

function isPkmncardsSource(url) {
  return String(url ?? '').startsWith('https://pkmncards.com/card/');
}

function isPkmnCollectorsSource(url) {
  return String(url ?? '').startsWith('https://www.pkmncollectors.com/cards/');
}

function isReverseHoloSource(url) {
  return String(url ?? '').startsWith('https://reverseholo.app/sets/');
}

function isCardTraderSource(url) {
  return String(url ?? '').startsWith('https://www.cardtrader.com/');
}

function tcgplayerProductId(url) {
  return String(url ?? '').match(/\/product\/(\d+)/)?.[1] ?? null;
}

async function fetchImageHeadWithPowerShell(url) {
  if (process.platform !== 'win32') return null;
  const command = [
    '& {',
    'param($u)',
    '$ProgressPreference = "SilentlyContinue";',
    '[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12;',
    '$response = Invoke-WebRequest -Uri $u -Method Head -UseBasicParsing -TimeoutSec 20;',
    '[Console]::Out.Write(($response.StatusCode.ToString()) + "`n" + ($response.Headers["Content-Type"] -join ","))',
    '}',
  ].join(' ');
  const result = await execFileAsync('powershell.exe', ['-NoProfile', '-Command', command, url], {
    maxBuffer: 128 * 1024,
    timeout: 30000,
  });
  const [statusCode, contentType] = String(result.stdout ?? '').split(/\r?\n/);
  return {
    ok: statusCode === '200' && String(contentType ?? '').toLowerCase().includes('image/'),
    statusCode,
    contentType,
  };
}

async function fetchImageHeadWithCurl(url) {
  if (process.platform !== 'win32') return null;
  const result = await execFileAsync('curl.exe', ['--ssl-no-revoke', '-L', '-I', '--max-time', '20', '-A', BROWSER_USER_AGENT, url], {
    maxBuffer: 128 * 1024,
    timeout: 30000,
  });
  const output = String(result.stdout ?? '');
  const statusCode = output.match(/HTTP\/\S+\s+(\d+)/i)?.[1] ?? null;
  const contentType = output.match(/^content-type:\s*(.+)$/im)?.[1]?.trim() ?? null;
  return {
    ok: statusCode === '200' && String(contentType ?? '').toLowerCase().includes('image/'),
    statusCode,
    contentType,
  };
}

async function verifyImageUrl(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'user-agent': 'GrookaiImageTruthAudit/1.0 (+audit-only; source-image-manifest)',
        accept: 'image/*',
      },
    });
    return {
      ok: response.ok && String(response.headers.get('content-type') ?? '').toLowerCase().includes('image/'),
      statusCode: String(response.status),
      contentType: response.headers.get('content-type'),
    };
  } catch {
    // Fall through to PowerShell on Windows, which uses the OS certificate store.
  } finally {
    clearTimeout(timeout);
  }
  const powershellResult = await fetchImageHeadWithPowerShell(url);
  if (powershellResult?.ok) return powershellResult;
  try {
    const curlResult = await fetchImageHeadWithCurl(url);
    if (curlResult?.ok) return curlResult;
  } catch {
    // Keep the original PowerShell result for reporting.
  }
  return powershellResult;
}

function reverseHoloFinishLabel(finishKey) {
  const finish = normalizeFinish(finishKey);
  if (finish === 'holo') return 'HOLO';
  if (finish === 'reverse') return 'REVERSE';
  if (finish === 'cosmos') return 'COSMOS';
  if (finish === 'normal') return 'NORMAL';
  return finish.toUpperCase().replace(/_/g, ' ');
}

function findReverseHoloImage(row, html) {
  const name = normalizeText(row.card_name);
  const number = normalizeNumber(row.number);
  const rawNumber = String(row.number ?? '').trim();
  const finish = reverseHoloFinishLabel(row.finish_key);
  const imgRegex = /<img\b[^>]*\balt=["']([^"']+)["'][^>]*\bsrc=["'](https:\/\/tcgplayer-cdn\.tcgplayer\.com\/product\/[^"']+)["'][^>]*>/gi;
  for (const match of String(html ?? '').matchAll(imgRegex)) {
    const [, alt, src] = match;
    if (normalizeText(alt) !== name) continue;
    const block = String(html).slice(match.index, match.index + 2500);
    const normalizedBlock = block
      .replace(/<!--\s*-->/g, '')
      .replace(/\\"/g, '"')
      .replace(/\\n/g, ' ')
      .replace(/\s+/g, ' ');
    if (
      !normalizedBlock.includes(`#${number}`) &&
      !normalizedBlock.includes(`#${rawNumber}`) &&
      !normalizedBlock.includes(`"#","${row.number}`) &&
      !normalizedBlock.includes(`"#","${rawNumber}`)
    ) continue;
    if (!normalizeText(normalizedBlock).includes(name)) continue;
    if (!normalizedBlock.toUpperCase().includes(finish)) continue;
    return decodeHtml(src);
  }
  return null;
}

function titleMatchesMfbRepresentativePage(row, title) {
  const normalizedTitle = normalizeText(title);
  const name = normalizeText(row.card_name);
  if (!normalizedTitle || !name) return false;
  if (normalizedTitle.includes(' list')) return false;
  return normalizedTitle.includes(name)
    && normalizedTitle.includes('prices')
    && normalizedTitle.includes('pokemon my first battle')
    && normalizedTitle.includes('pokemon cards');
}

function findMfbPriceChartingImage(row, html) {
  const name = normalizeText(row.card_name);
  const images = extractImages(html).filter((image) => {
    if (!String(image.src ?? '').includes('storage.googleapis.com/images.pricecharting.com/')) return false;
    const alt = normalizeText(image.alt);
    return alt.includes(name) && alt.includes('pokemon my first battle');
  });
  return images.find((image) => String(image.src ?? '').endsWith('/1600.jpg'))
    ?? images.find((image) => String(image.alt ?? '').toLowerCase().includes('main image'))
    ?? images[0]
    ?? null;
}

function findTcgCollectorImage(row, html) {
  const name = normalizeText(row.card_name);
  const images = extractImages(html).filter((image) => {
    const src = String(image.src ?? '');
    if (!src.startsWith('https://static.tcgcollector.com/content/images/')) return false;
    const alt = normalizeText(image.alt);
    return alt.includes(name) && alt.includes('my first battle');
  });
  return images[0] ?? null;
}

function tagAttribute(tag, attrName) {
  const match = String(tag ?? '').match(new RegExp(`\\b${attrName}=["']([^"']*)["']`, 'i'));
  return clean(decodeHtml(match?.[1]));
}

function findTcgCollectorOgImage(html) {
  const metaTags = String(html ?? '').match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of metaTags) {
    const property = tagAttribute(tag, 'property') ?? tagAttribute(tag, 'name');
    if (String(property ?? '').toLowerCase() !== 'og:image') continue;
    const content = tagAttribute(tag, 'content');
    if (String(content ?? '').startsWith('https://static.tcgcollector.com/content/images/')) return content;
  }
  const jsonLdBlocks = String(html ?? '').match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) ?? [];
  for (const block of jsonLdBlocks) {
    const match = block.match(/"@type"\s*:\s*"ImageObject"[\s\S]*?"url"\s*:\s*"([^"]+)"/i);
    const url = clean(match?.[1]?.replace(/\\\//g, '/'));
    if (String(url ?? '').startsWith('https://static.tcgcollector.com/content/images/')) return url;
  }
  return null;
}

function tcgCollectorPageMatches(row, html, sourceUrl) {
  const title = htmlTitle(html);
  const pageText = normalizeText(title);
  const cardName = normalizeText(row.card_name);
  const setName = normalizeText(row.set_name);
  const number = normalizeNumber(row.number);
  const sourcePath = String(sourceUrl ?? '').toLowerCase();
  if (!pageText || !cardName || !setName || !number) return false;
  if (!pageText.includes(cardName)) return false;
  if (!pageText.includes(setName)) return false;
  if (pageText.includes(' list')) return false;
  if (sourcePath.match(new RegExp(`-${number}-\\d+(?:$|[/?#])`, 'i'))) return true;
  return pageText.includes(` ${number} 30`) || pageText.endsWith(` ${number} 30 international tcg tcg collector`);
}

function attachSource(asset, source, sourceAttempts = []) {
  return {
    ...asset,
    source_url: source?.source_url ?? null,
    source_key: source?.source_key ?? null,
    source_kind: source?.source_kind ?? null,
    source_attempts: sourceAttempts,
  };
}

async function extractAssetFromSource(row, source) {
  if (isTcgdexApiCardSource(source.source_url)) {
    let card;
    try {
      card = await fetchJson(source.source_url);
    } catch (error) {
      return {
        asset_status: 'asset_fetch_failed',
        asset_url: null,
        image_confidence: row.image_confidence,
        reason: `TCGdex API card fetch failed: ${error?.message ?? 'unknown error'}`,
      };
    }
    if (normalizeText(card?.name) !== normalizeText(row.card_name) || normalizeNumber(card?.localId) !== normalizeNumber(row.number)) {
      return {
        asset_status: 'asset_not_found_or_not_exact',
        asset_url: null,
        image_confidence: row.image_confidence,
        reason: 'TCGdex API card identity did not match target card name and number.',
      };
    }
    if (!clean(card?.image)) {
      return {
        asset_status: 'asset_not_found_or_not_exact',
        asset_url: null,
        image_confidence: row.image_confidence,
        reason: 'TCGdex API card record did not expose an image URL.',
      };
    }
    const assetUrl = `${String(card.image).replace(/\/$/, '')}/high.jpg`;
    let verified;
    try {
      verified = await verifyImageUrl(assetUrl);
    } catch (error) {
      return {
        asset_status: 'asset_fetch_failed',
        asset_url: null,
        image_confidence: row.image_confidence,
        reason: `TCGdex image probe failed: ${error?.message ?? 'unknown error'}`,
      };
    }
    if (!verified?.ok) {
      return {
        asset_status: 'asset_not_found_or_not_exact',
        asset_url: null,
        image_confidence: row.image_confidence,
        reason: `TCGdex high image URL did not return an image. status=${verified?.statusCode ?? 'unknown'} content_type=${verified?.contentType ?? 'unknown'}`,
      };
    }
    return {
      asset_status: 'representative_image_url_preserved',
      asset_url: assetUrl,
      image_alt: `TCGdex card image for ${card.name} ${card.localId}`,
      image_confidence: 'representative',
      reason: 'TCGdex API card image URL matched the exact card identity. It is treated as representative because the API image is card-level, not independently proven as exact finish texture.',
    };
  }

  if (isPriceChartingMfbRepresentativeSource(source)) {
    let html;
    try {
      html = await fetchHtml(source.source_url);
    } catch (error) {
      return {
        asset_status: 'asset_fetch_failed',
        asset_url: null,
        image_confidence: row.image_confidence,
        reason: error?.message ?? 'MFB PriceCharting page fetch failed.',
      };
    }
    const title = htmlTitle(html);
    if (!titleMatchesMfbRepresentativePage(row, title)) {
      return {
        asset_status: 'asset_not_found_or_not_exact',
        asset_url: null,
        image_confidence: row.image_confidence,
        reason: `MFB PriceCharting page title did not prove exact card page. title=${title ?? 'missing'}`,
      };
    }
    const match = findMfbPriceChartingImage(row, html);
    if (!match) {
      return {
        asset_status: 'asset_not_found_or_not_exact',
        asset_url: null,
        image_confidence: row.image_confidence,
        reason: 'No MFB PriceCharting image matching card name and My First Battle set was found.',
      };
    }
    let verified;
    try {
      verified = await verifyImageUrl(match.src);
    } catch (error) {
      return {
        asset_status: 'asset_fetch_failed',
        asset_url: null,
        image_confidence: row.image_confidence,
        reason: `MFB PriceCharting image probe failed: ${error?.message ?? 'unknown error'}`,
      };
    }
    if (!verified?.ok) {
      return {
        asset_status: 'asset_not_found_or_not_exact',
        asset_url: null,
        image_confidence: row.image_confidence,
        reason: `MFB PriceCharting image URL did not return an image. status=${verified?.statusCode ?? 'unknown'} content_type=${verified?.contentType ?? 'unknown'}`,
      };
    }
    return {
      asset_status: 'representative_image_url_preserved',
      asset_url: match.src,
      image_alt: match.alt,
      image_confidence: 'representative',
      reason: 'PriceCharting My First Battle product page and image matched the exact card identity. Stored as representative because it is product-level imagery, not independent finish texture proof.',
    };
  }

  if (isTcgCollectorMfbRepresentativeSource(source)) {
    const preservedImageUrl = clean(source.source_image_url);
    if (!preservedImageUrl) {
      return {
        asset_status: 'asset_not_found_or_not_exact',
        asset_url: null,
        image_confidence: row.image_confidence,
        reason: 'TCGCollector source record did not include a preserved image URL.',
      };
    }
    let verified;
    try {
      verified = await verifyImageUrl(preservedImageUrl);
    } catch (error) {
      return {
        asset_status: 'asset_fetch_failed',
        asset_url: null,
        image_confidence: row.image_confidence,
        reason: `TCGCollector image probe failed: ${error?.message ?? 'unknown error'}`,
      };
    }
    if (!verified?.ok) {
      return {
        asset_status: 'asset_not_found_or_not_exact',
        asset_url: null,
        image_confidence: row.image_confidence,
        reason: `TCGCollector image URL did not return an image. status=${verified?.statusCode ?? 'unknown'} content_type=${verified?.contentType ?? 'unknown'}`,
      };
    }
    return {
      asset_status: 'representative_image_url_preserved',
      asset_url: preservedImageUrl,
      image_alt: source.evidence_label,
      image_confidence: 'representative',
      reason: 'TCGCollector card page and image matched the exact card identity. Stored as representative because the Grookai row is the generic My First Battle trainer row while source imagery is deck-specific.',
    };
  }

  if (isTcgCollectorCardVariantSource(source)) {
    let html;
    try {
      html = await fetchHtml(source.source_url);
    } catch (error) {
      return {
        asset_status: 'asset_fetch_failed',
        asset_url: null,
        image_confidence: row.image_confidence,
        reason: `TCGCollector card page fetch failed: ${error?.message ?? 'unknown error'}`,
      };
    }
    if (!tcgCollectorPageMatches(row, html, source.source_url)) {
      return {
        asset_status: 'asset_not_found_or_not_exact',
        asset_url: null,
        image_confidence: row.image_confidence,
        reason: `TCGCollector card page did not match target card name, set, and number. title=${htmlTitle(html) ?? 'missing'}`,
      };
    }
    const assetUrl = findTcgCollectorOgImage(html);
    if (!assetUrl) {
      return {
        asset_status: 'asset_not_found_or_not_exact',
        asset_url: null,
        image_confidence: row.image_confidence,
        reason: 'TCGCollector card page did not expose a supported static image URL.',
      };
    }
    let verified;
    try {
      verified = await verifyImageUrl(assetUrl);
    } catch (error) {
      return {
        asset_status: 'asset_fetch_failed',
        asset_url: null,
        image_confidence: row.image_confidence,
        reason: `TCGCollector image probe failed: ${error?.message ?? 'unknown error'}`,
      };
    }
    if (!verified?.ok) {
      return {
        asset_status: 'asset_not_found_or_not_exact',
        asset_url: null,
        image_confidence: row.image_confidence,
        reason: `TCGCollector image URL did not return an image. status=${verified?.statusCode ?? 'unknown'} content_type=${verified?.contentType ?? 'unknown'}`,
      };
    }
    return {
      asset_status: 'representative_image_url_preserved',
      asset_url: assetUrl,
      image_alt: `TCGCollector card image for ${row.card_name} ${row.set_name} ${row.number}`,
      image_confidence: 'representative',
      reason: 'TCGCollector card page matched the target card name, set, and number, and exposed a verified static card image URL. Stored as representative because source imagery is card-level, not independently proven as exact finish texture.',
    };
  }

  if (isPriceChartingSource(source.source_url)) {
    let html;
    try {
      html = await fetchHtml(source.source_url);
    } catch (error) {
      return {
        asset_status: 'asset_fetch_failed',
        asset_url: null,
        image_confidence: row.image_confidence,
        reason: error?.message ?? 'Source page fetch failed.',
      };
    }

    const images = extractImages(html);
    const match = images.find((image) => {
      return String(image.src ?? '').includes('storage.googleapis.com/images.pricecharting.com/') && imageAltMatches(row, image.alt);
    }) ?? images.find((image) => {
      return String(image.src ?? '').includes('storage.googleapis.com/images.pricecharting.com/') && imageAltMatchesMeeGrassReverse(row, image.alt);
    });

    if (!match) {
      return {
        asset_status: 'asset_not_found_or_not_exact',
        asset_url: null,
        image_confidence: row.image_confidence,
        reason: 'No PriceCharting product image with exact alt text was found.',
      };
    }

    return {
      asset_status: 'source_image_url_preserved',
      asset_url: match.src,
      image_alt: match.alt,
      image_confidence: 'exact',
      reason: 'PriceCharting product image URL was found on the exact source page with matching alt text.',
    };
  }

  if (isTcgplayerSource(source.source_url)) {
    const productId = tcgplayerProductId(source.source_url);
    if (!productId) {
      return {
        asset_status: 'asset_not_found_or_not_exact',
        asset_url: null,
        image_confidence: row.image_confidence,
        reason: 'TCGplayer product ID could not be parsed from source URL.',
      };
    }
    const assetUrl = `https://product-images.tcgplayer.com/${productId}.jpg`;
    let verified;
    try {
      verified = await verifyImageUrl(assetUrl);
    } catch (error) {
      return {
        asset_status: 'asset_fetch_failed',
        asset_url: null,
        image_confidence: row.image_confidence,
        reason: `TCGplayer image probe failed: ${error?.message ?? 'unknown error'}`,
      };
    }
    if (!verified?.ok) {
      return {
        asset_status: 'asset_not_found_or_not_exact',
        asset_url: null,
        image_confidence: row.image_confidence,
        reason: `TCGplayer product image URL did not return an image. status=${verified?.statusCode ?? 'unknown'} content_type=${verified?.contentType ?? 'unknown'}`,
      };
    }
    return {
      asset_status: 'representative_image_url_preserved',
      asset_url: assetUrl,
      image_alt: `TCGplayer product ${productId} image for ${row.card_name} ${row.number}`,
      image_confidence: 'representative',
      reason: 'TCGplayer product image URL was verified, but product-level imagery is representative unless finish-specific visual treatment is independently proven.',
    };
  }

  if (isPkmncardsSource(source.source_url)) {
    let html;
    try {
      html = await fetchHtml(source.source_url);
    } catch (error) {
      return {
        asset_status: 'asset_fetch_failed',
        asset_url: null,
        image_confidence: row.image_confidence,
        reason: `PKMNCards page fetch failed: ${error?.message ?? 'unknown error'}`,
      };
    }
    const imageUrls = [...String(html ?? '').matchAll(/https:\/\/pkmncards\.com\/wp-content\/uploads\/[^"'<> ]+\.jpg/gi)]
      .map((match) => decodeHtml(match[0]))
      .filter((url) => !url.includes('-150x150') && !url.includes('-225x225'));
    const setToken = String(row.set_code ?? '').toUpperCase();
    const numberToken = normalizeNumber(row.number);
    const nameToken = normalizeText(row.card_name).replace(/\s+/g, '-');
    const match = imageUrls.find((url) => {
      const normalizedUrl = normalizeText(url).replace(/\s+/g, '-');
      return normalizedUrl.includes(setToken.toLowerCase())
        && normalizedUrl.includes(numberToken)
        && normalizedUrl.includes(nameToken);
    }) ?? imageUrls[0] ?? null;
    if (!match) {
      return {
        asset_status: 'asset_not_found_or_not_exact',
        asset_url: null,
        image_confidence: row.image_confidence,
        reason: 'No PKMNCards card image URL was found on the source page.',
      };
    }
    let verified;
    try {
      verified = await verifyImageUrl(match);
    } catch (error) {
      return {
        asset_status: 'asset_fetch_failed',
        asset_url: null,
        image_confidence: row.image_confidence,
        reason: `PKMNCards image probe failed: ${error?.message ?? 'unknown error'}`,
      };
    }
    if (!verified?.ok) {
      return {
        asset_status: 'asset_not_found_or_not_exact',
        asset_url: null,
        image_confidence: row.image_confidence,
        reason: `PKMNCards image URL did not return an image. status=${verified?.statusCode ?? 'unknown'} content_type=${verified?.contentType ?? 'unknown'}`,
      };
    }
    return {
      asset_status: 'representative_image_url_preserved',
      asset_url: match,
      image_alt: `PKMNCards card image for ${row.card_name} ${row.number}`,
      image_confidence: 'representative',
      reason: 'PKMNCards card image URL was verified. It is treated as representative because the image is card-level, not independently proven as exact finish/variant imagery.',
    };
  }

  if (isPkmnCollectorsSource(source.source_url)) {
    let html;
    try {
      html = await fetchHtml(source.source_url);
    } catch (error) {
      return {
        asset_status: 'asset_fetch_failed',
        asset_url: null,
        image_confidence: row.image_confidence,
        reason: `PKMNCollectors page fetch failed: ${error?.message ?? 'unknown error'}`,
      };
    }
    const images = extractImages(html).filter((image) => {
      if (!String(image.src ?? '').startsWith('https://www.pkmncollectors.com/media/cards/')) return false;
      if (String(image.src ?? '').includes('/placeholders/')) return false;
      const normalizedAlt = normalizeText(image.alt);
      return normalizedAlt.includes(normalizeText(row.card_name))
        && (normalizedAlt.includes(`#${normalizeNumber(row.number)}`) || normalizedAlt.includes(normalizeNumber(row.number)));
    });
    const match = images[0] ?? null;
    if (!match) {
      return {
        asset_status: 'asset_not_found_or_not_exact',
        asset_url: null,
        image_confidence: row.image_confidence,
        reason: 'No PKMNCollectors card image matching this card name and number was found on the source page.',
      };
    }
    let verified;
    try {
      verified = await verifyImageUrl(match.src);
    } catch (error) {
      return {
        asset_status: 'asset_fetch_failed',
        asset_url: null,
        image_confidence: row.image_confidence,
        reason: `PKMNCollectors image probe failed: ${error?.message ?? 'unknown error'}`,
      };
    }
    if (!verified?.ok) {
      return {
        asset_status: 'asset_not_found_or_not_exact',
        asset_url: null,
        image_confidence: row.image_confidence,
        reason: `PKMNCollectors image URL did not return an image. status=${verified?.statusCode ?? 'unknown'} content_type=${verified?.contentType ?? 'unknown'}`,
      };
    }
    return {
      asset_status: 'representative_image_url_preserved',
      asset_url: match.src,
      image_alt: match.alt,
      image_confidence: 'representative',
      reason: 'PKMNCollectors card image URL was verified. It is treated as representative unless exact finish/variant imagery is independently proven.',
    };
  }

  if (isCardTraderSource(source.source_url)) {
    let html;
    try {
      html = await fetchHtml(source.source_url);
    } catch (error) {
      return {
        asset_status: 'asset_fetch_failed',
        asset_url: null,
        image_confidence: row.image_confidence,
        reason: `CardTrader page fetch failed: ${error?.message ?? 'unknown error'}`,
      };
    }
    const imageUrls = [
      ...String(html ?? '').matchAll(/\bcontent=["'](https:\/\/www\.cardtrader\.com\/uploads\/blueprints\/image\/[^"']+\.(?:png|jpg|jpeg|webp))["']/gi),
      ...String(html ?? '').matchAll(/\bsrc=["'](https:\/\/www\.cardtrader\.com\/uploads\/blueprints\/image\/[^"']+\.(?:png|jpg|jpeg|webp))["']/gi),
    ].map((match) => decodeHtml(match[1]));
    const finishText = normalizeFinish(row.finish_key).replace(/_/g, '-');
    const nameToken = normalizeText(row.card_name).replace(/\s+/g, '-');
    const numberToken = normalizeNumber(row.number);
    const match = imageUrls.find((url) => {
      const normalizedUrl = normalizeText(url).replace(/\s+/g, '-');
      return normalizedUrl.includes(nameToken)
        && normalizedUrl.includes(numberToken)
        && normalizedUrl.includes(finishText);
    }) ?? null;
    if (!match) {
      return {
        asset_status: 'asset_not_found_or_not_exact',
        asset_url: null,
        image_confidence: row.image_confidence,
        reason: 'No CardTrader blueprint image URL matching this card name, number, and finish was found.',
      };
    }
    let verified;
    try {
      verified = await verifyImageUrl(match);
    } catch (error) {
      return {
        asset_status: 'asset_fetch_failed',
        asset_url: null,
        image_confidence: row.image_confidence,
        reason: `CardTrader image probe failed: ${error?.message ?? 'unknown error'}`,
      };
    }
    if (!verified?.ok) {
      return {
        asset_status: 'asset_not_found_or_not_exact',
        asset_url: null,
        image_confidence: row.image_confidence,
        reason: `CardTrader image URL did not return an image. status=${verified?.statusCode ?? 'unknown'} content_type=${verified?.contentType ?? 'unknown'}`,
      };
    }
    return {
      asset_status: 'representative_image_url_preserved',
      asset_url: match,
      image_alt: `CardTrader blueprint image for ${row.card_name} ${row.number} ${row.finish_key}`,
      image_confidence: 'representative',
      reason: 'CardTrader blueprint image URL matched the exact card and finish source row. It is treated as representative because visual finish texture is not independently proven from the image alone.',
    };
  }

  if (isReverseHoloSource(source.source_url)) {
    let html;
    try {
      html = await fetchHtml(source.source_url);
    } catch (error) {
      return {
        asset_status: 'asset_fetch_failed',
        asset_url: null,
        image_confidence: row.image_confidence,
        reason: `ReverseHolo set page fetch failed: ${error?.message ?? 'unknown error'}`,
      };
    }
    const assetUrl = findReverseHoloImage(row, html);
    if (!assetUrl) {
      return {
        asset_status: 'asset_not_found_or_not_exact',
        asset_url: null,
        image_confidence: row.image_confidence,
        reason: 'No ReverseHolo card block with matching number, name, finish, and image URL was found.',
      };
    }
    let verified;
    try {
      verified = await verifyImageUrl(assetUrl);
    } catch (error) {
      return {
        asset_status: 'asset_fetch_failed',
        asset_url: null,
        image_confidence: row.image_confidence,
        reason: `ReverseHolo image probe failed: ${error?.message ?? 'unknown error'}`,
      };
    }
    if (!verified?.ok) {
      return {
        asset_status: 'asset_not_found_or_not_exact',
        asset_url: null,
        image_confidence: row.image_confidence,
        reason: `ReverseHolo image URL did not return an image. status=${verified?.statusCode ?? 'unknown'} content_type=${verified?.contentType ?? 'unknown'}`,
      };
    }
    return {
      asset_status: 'representative_image_url_preserved',
      asset_url: assetUrl,
      image_alt: `ReverseHolo checklist image for ${row.card_name} ${row.number} ${row.finish_key}`,
      image_confidence: 'representative',
      reason: 'ReverseHolo rendered card block proved number, name, and finish, and exposed a TCGplayer image URL. Stored as representative because the raw image URL may not include the rendered finish overlay.',
    };
  }

  return {
    asset_status: 'asset_source_not_supported_yet',
    asset_url: null,
    image_confidence: row.image_confidence,
    reason: 'No supported source image extractor exists for the preserved source URL.',
  };
}

async function extractAsset(row) {
  const attempts = [];
  const sources = row.preserved_source_urls ?? [];

  for (const source of sources) {
    const asset = await extractAssetFromSource(row, source);
    attempts.push({
      source_key: source.source_key ?? null,
      source_kind: source.source_kind ?? null,
      source_url: source.source_url ?? null,
      asset_status: asset.asset_status,
      reason: asset.reason ?? null,
    });
    if (['source_image_url_preserved', 'representative_image_url_preserved'].includes(asset.asset_status)) {
      return attachSource(asset, source, attempts);
    }
  }

  const lastAttempt = attempts[attempts.length - 1] ?? null;
  return {
    asset_status: lastAttempt?.asset_status ?? 'asset_source_not_supported_yet',
    asset_url: null,
    image_confidence: row.image_confidence,
    reason: attempts.length > 0
      ? attempts.map((attempt) => `${attempt.source_key ?? 'unknown'}: ${attempt.reason ?? attempt.asset_status}`).join(' | ')
      : 'No preserved source URLs are available for image extraction.',
    source_url: sources[0]?.source_url ?? null,
    source_key: sources[0]?.source_key ?? null,
    source_kind: sources[0]?.source_kind ?? null,
    source_attempts: attempts,
  };
}

function markdownTable(rows, columns) {
  if (rows.length === 0) return '_None._';
  const header = `| ${columns.map((column) => column.label).join(' | ')} |`;
  const divider = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? '').replace(/\|/g, '\\|')).join(' | ')} |`);
  return [header, divider, ...body].join('\n');
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

async function main() {
  const sourcePacket = JSON.parse(await fs.readFile(SOURCE_PACKET_JSON, 'utf8'));
  const sourceRows = (sourcePacket.rows ?? []).filter((row) => {
    if (row.image_scope !== 'english_physical') return false;
    if (row.target_table !== 'card_printings') return false;
    if (row.parent_overwrite_allowed !== false) return false;
    if (!IMAGE_SOURCE_STATUSES.has(row.source_status)) return false;
    return true;
  });

  const concurrency = Number(process.env.IMAGE_ASSET_MANIFEST_CONCURRENCY ?? 8);
  const rows = await mapLimit(sourceRows, Number.isFinite(concurrency) && concurrency > 0 ? concurrency : 8, async (row) => {
    const asset = await extractAsset(row);
    return {
      card_printing_id: row.card_printing_id,
      printing_gv_id: row.printing_gv_id,
      card_print_id: row.card_print_id,
      parent_gv_id: row.parent_gv_id,
      image_scope: row.image_scope,
      target_table: 'card_printings',
      parent_overwrite_allowed: false,
      db_write_allowed: false,
      dry_run_ready: false,
      set_code: row.set_code,
      set_name: row.set_name,
      card_name: row.card_name,
      number: row.number,
      finish_key: row.finish_key,
      source_status: row.source_status,
      source_url: asset.source_url ?? row.preserved_source_urls?.[0]?.source_url ?? null,
      source_key: asset.source_key ?? row.preserved_source_urls?.[0]?.source_key ?? null,
      source_kind: asset.source_kind ?? row.preserved_source_urls?.[0]?.source_kind ?? null,
      source_attempts: asset.source_attempts ?? [],
      asset_status: asset.asset_status,
      asset_url: asset.asset_url,
      image_alt: asset.image_alt ?? null,
      image_confidence: asset.image_confidence,
      block_reason: asset.asset_status === 'source_image_url_preserved'
        ? 'Source image URL is preserved, but it is not normalized into Grookai storage and no dry-run proof exists.'
        : asset.reason,
    };
  });

  const report = {
    generated_at: new Date().toISOString(),
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    scope: {
      image_scope: 'english_physical',
      target_table: 'card_printings',
      parent_overwrite_allowed: false,
      source_url_required: true,
      source_image_url_required_before_normalization: true,
      normalized_asset_required_before_dry_run: true,
      dry_run_required_before_db_write: true,
    },
    source_rows: rows.length,
    source_image_url_preserved_count: rows.filter((row) => row.asset_status === 'source_image_url_preserved').length,
    representative_image_url_preserved_count: rows.filter((row) => row.asset_status === 'representative_image_url_preserved').length,
    blocked_asset_count: rows.filter((row) => !['source_image_url_preserved', 'representative_image_url_preserved'].includes(row.asset_status)).length,
    dry_run_ready_count: 0,
    rows,
  };

  await fs.writeFile(ASSET_MANIFEST_JSON, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(ASSET_MANIFEST_MD, `# Image Truth Missing-Display Asset Manifest V1

Generated: ${report.generated_at}

Status: audit only. No DB writes. No migrations.

## Guardrails

- image_scope: english_physical only
- target_table: card_printings
- parent_overwrite_allowed: false
- source_url_required: true
- representative card-identity rows may only become representative assets, not exact assets
- normalized_asset_required_before_dry_run: true
- dry_run_required_before_db_write: true

## Summary

- source rows reviewed: ${report.source_rows}
- source image URLs preserved: ${report.source_image_url_preserved_count}
- representative image URLs preserved: ${report.representative_image_url_preserved_count}
- blocked asset rows: ${report.blocked_asset_count}
- dry-run ready rows: ${report.dry_run_ready_count}

## Rows

${markdownTable(rows, [
  { label: 'set', value: (row) => row.set_code },
  { label: 'card', value: (row) => row.card_name },
  { label: 'number', value: (row) => row.number },
  { label: 'finish', value: (row) => row.finish_key },
  { label: 'source status', value: (row) => row.source_status },
  { label: 'asset status', value: (row) => row.asset_status },
  { label: 'confidence', value: (row) => row.image_confidence },
  { label: 'dry run ready', value: (row) => row.dry_run_ready },
  { label: 'asset url', value: (row) => row.asset_url ?? '-' },
])}
`);

  console.log(JSON.stringify({
    generated: [ASSET_MANIFEST_JSON, ASSET_MANIFEST_MD],
    source_rows: report.source_rows,
    source_image_url_preserved_count: report.source_image_url_preserved_count,
    representative_image_url_preserved_count: report.representative_image_url_preserved_count,
    blocked_asset_count: report.blocked_asset_count,
    dry_run_ready_count: report.dry_run_ready_count,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
