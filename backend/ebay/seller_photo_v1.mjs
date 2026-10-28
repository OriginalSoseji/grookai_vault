import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { EbaySellerApiError } from './seller_client_v1.mjs';

const fail = code => { throw new EbaySellerApiError(code); };

// Caller must obtain bytes from the SQL-authorized owner's private copy photo.
// No URL, filesystem path or catalog image is accepted here.
export async function prepareSellerPhoto(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0
      || bytes.byteLength > 16 * 1024 * 1024) fail('seller_photo_size_invalid');
  try {
    const options = { limitInputPixels: 32_000_000, failOn: 'warning' };
    const metadata = await sharp(bytes, options).metadata();
    if (!['jpeg', 'png'].includes(metadata.format)
        || (metadata.pages ?? 1) !== 1) fail('seller_photo_format_invalid');
    if (!metadata.width || !metadata.height
        || Math.max(metadata.width, metadata.height) < 600) {
      fail('seller_photo_too_small');
    }
    const { data, info } = await sharp(bytes, options)
      .autoOrient()
      .resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 92 })
      // Sharp omits EXIF, GPS, XMP and other metadata by default.
      .toBuffer({ resolveWithObject: true });
    if (data.byteLength > 8 * 1024 * 1024) fail('seller_photo_size_invalid');
    return {
      bytes: data, width: info.width, height: info.height, mime: 'image/jpeg',
      sha256: createHash('sha256').update(data).digest('hex'),
    };
  } catch (error) {
    if (error instanceof EbaySellerApiError) throw error;
    fail('seller_photo_invalid');
  }
}
