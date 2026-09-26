export const COPY_PHOTO_MAX_BYTES = 4 * 1024 * 1024;
export const COPY_PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";
export function copyPhotoType(bytes: Uint8Array): string | null {
  if (bytes.length < 12 || bytes.length > COPY_PHOTO_MAX_BYTES) return null;
  if ([137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v)) return "image/png";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg";
  if ([82,73,70,70].every((v,i) => bytes[i] === v) && [87,69,66,80].every((v,i) => bytes[i+8] === v)) return "image/webp";
  return null;
}
