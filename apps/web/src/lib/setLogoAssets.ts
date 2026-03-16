import "server-only";

import { readdir } from "fs/promises";
import path from "path";
import { cache } from "react";

const SET_LOGO_EXTENSION = ".png";
const SET_LOGO_DIRECTORY = path.join(process.cwd(), "public", "set-logos");

const getAvailableSetLogoCodes = cache(async () => {
  try {
    const entries = await readdir(SET_LOGO_DIRECTORY, { withFileTypes: true });
    return new Set(
      entries
        .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(SET_LOGO_EXTENSION))
        .map((entry) => entry.name.slice(0, -SET_LOGO_EXTENSION.length).toLowerCase()),
    );
  } catch {
    return new Set<string>();
  }
});

function normalizeSetCode(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

export async function getSetLogoAssetPathMap(setCodes: string[]) {
  const availableCodes = await getAvailableSetLogoCodes();
  const pathMap = new Map<string, string>();

  for (const setCode of setCodes) {
    const normalizedCode = normalizeSetCode(setCode);
    if (!normalizedCode || !availableCodes.has(normalizedCode)) {
      continue;
    }

    pathMap.set(normalizedCode, `/set-logos/${normalizedCode}${SET_LOGO_EXTENSION}`);
  }

  return pathMap;
}
