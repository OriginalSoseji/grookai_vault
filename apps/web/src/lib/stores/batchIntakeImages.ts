import { BATCH_FILE_LIMIT, type BatchAsset } from "./batchIntake";
import { imageDecodeDeadline } from "./batchImageDeadline";

let heicDecoderTimedOut = false;

export const BATCH_IMAGE_ACCEPT = ".jpg,.jpeg,.png,.webp,.heic,.heif";
export async function decodeIntakeImage(file: Blob, name: string, rotation = 0): Promise<Blob> {
  if (!file.size || file.size > BATCH_FILE_LIMIT) throw new Error("Choose an image up to 20 MB.");
  let input = file;
  const header = new Uint8Array(await file.slice(0, 40).arrayBuffer());
  const brand = new TextDecoder("ascii").decode(header);
  const heic = brand.slice(4, 8) === "ftyp" && /heic|heix|hevc|hevx|mif1|msf1/.test(brand.slice(8));
  const jpeg = header[0] === 255 && header[1] === 216 && header[2] === 255;
  const png = [137,80,78,71,13,10,26,10].every((v, i) => header[i] === v);
  const webp = brand.startsWith("RIFF") && brand.slice(8, 12) === "WEBP";
  if (!heic && !jpeg && !png && !webp) throw new Error(`${name}: unsupported or damaged image. Use JPEG, PNG, WebP or HEIC.`);
  if (heic) {
    if (heicDecoderTimedOut) throw new Error("HEIC conversion needs a reload. Your original is retained; use a JPEG copy to continue now.");
    const converted = await imageDecodeDeadline((async () => {
      const { default: convert } = await import("heic2any");
      return convert({ blob: file, toType: "image/jpeg", quality: 0.92, multiple: true });
    })(), () => { heicDecoderTimedOut = true; });
    if (Array.isArray(converted) && converted.length !== 1) throw new Error("Use a single still image, not a multi-image HEIC file.");
    input = Array.isArray(converted) ? converted[0] : converted;
  }
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(input, { imageOrientation: "from-image" }); }
  catch { throw new Error("This image could not be read. Replace it with a valid JPEG, PNG, WebP or HEIC scan."); }
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 40_000_000) throw new Error("Choose an image smaller than 40 megapixels.");
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale), height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = rotation % 180 ? height : width; canvas.height = rotation % 180 ? width : height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image conversion is unavailable in this browser.");
    context.fillStyle = "#fff"; context.fillRect(0, 0, canvas.width, canvas.height);
    context.translate(canvas.width / 2, canvas.height / 2); context.rotate(rotation * Math.PI / 180);
    context.drawImage(bitmap, -width / 2, -height / 2, width, height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("Image conversion failed.")), "image/jpeg", 0.88));
    if (blob.size > 4 * 1024 * 1024) throw new Error("Converted image exceeds 4 MB. Use a smaller scan.");
    return blob;
  } finally { bitmap.close(); }
}
export async function intakeAsset(file: File): Promise<BatchAsset> {
  if (!file.size || file.size > BATCH_FILE_LIMIT) throw new Error(`${file.name}: choose an image up to 20 MB.`);
  const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", await file.arrayBuffer()))].map(v => v.toString(16).padStart(2, "0")).join("");
  const asset: BatchAsset = { id: crypto.randomUUID(), name: file.name, hash, original: file, preview: null, error: null };
  try { asset.preview = await decodeIntakeImage(file, file.name); }
  catch (error) { asset.error = error instanceof Error ? error.message : "Image conversion failed."; }
  return asset;
}
