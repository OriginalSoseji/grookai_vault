import { isUsablePublicImageUrl } from "@/lib/publicCardImage";

type StorageReference = {
  bucket: string;
  objectPath: string;
};

function trimPublicUrl(value: string) {
  try {
    const url = new URL(value.trim());
    url.hash = "";
    return url.toString();
  } catch {
    return value.trim();
  }
}

function parseStorageReference(value: string): StorageReference | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const publicUrlMatch = trimmed.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/i);
  if (publicUrlMatch) {
    return {
      bucket: decodeURIComponent(publicUrlMatch[1]),
      objectPath: publicUrlMatch[2],
    };
  }

  const normalized = trimmed
    .replace(/^\/+/, "")
    .replace(/^storage\/v1\/object\/public\//i, "");
  const [bucket, ...rest] = normalized.split("/").filter(Boolean);

  if (!bucket || rest.length === 0) {
    return null;
  }

  return {
    bucket,
    objectPath: rest.join("/"),
  };
}

export function resolveSharedCardPublicImageUrl(storagePath: string | null | undefined) {
  if (!storagePath) {
    return null;
  }

  const trimmed = storagePath.trim();
  if (!trimmed) {
    return null;
  }

  if (isUsablePublicImageUrl(trimmed)) {
    if (/\/storage\/v1\/object\/public\//i.test(trimmed)) {
      return trimPublicUrl(trimmed);
    }
  }

  const reference = parseStorageReference(trimmed);
  if (!reference) {
    return null;
  }

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "").trim().replace(/\/$/, "");
  if (!supabaseUrl) {
    return null;
  }

  const encodedPath = reference.objectPath
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(reference.bucket)}/${encodedPath}`;
}
