const NAMED_HTML_ENTITIES_V1 = Object.freeze({
  nbsp: " ",
  amp: "&",
  quot: '"',
  apos: "'",
  lt: "<",
  gt: ">",
});

const HTML_ENTITY_V1 =
  /&(?:#([0-9]+)|#x([0-9a-f]+)|(nbsp|amp|quot|apos|lt|gt));/gi;

function decodeCodePointV1(match, rawCode, radix) {
  const codePoint = Number.parseInt(rawCode, radix);
  if (
    !Number.isInteger(codePoint) ||
    codePoint < 0 ||
    codePoint > 0x10ffff ||
    (codePoint >= 0xd800 && codePoint <= 0xdfff)
  ) {
    return match;
  }
  return String.fromCodePoint(codePoint);
}

export function decodeOnePieceOfficialHtmlEntitiesV1(value) {
  return String(value ?? "").replace(
    HTML_ENTITY_V1,
    (match, decimal, hexadecimal, named) => {
      if (decimal) return decodeCodePointV1(match, decimal, 10);
      if (hexadecimal) return decodeCodePointV1(match, hexadecimal, 16);
      return NAMED_HTML_ENTITIES_V1[String(named).toLowerCase()] ?? match;
    },
  );
}
