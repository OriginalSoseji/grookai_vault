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

function isTagBoundaryV1(character) {
  return character === ">" || character === "/" || /\s/.test(character ?? "");
}

function findTagEndV1(value, start) {
  let quote = null;
  for (let index = start; index < value.length; index += 1) {
    const character = value[index];
    if (quote) {
      if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === ">") return index;
  }
  return -1;
}

function findElementTagV1(lowerHtml, tagName, fromIndex, closing) {
  const prefix = closing ? `</${tagName}` : `<${tagName}`;
  let index = lowerHtml.indexOf(prefix, fromIndex);
  while (index >= 0) {
    if (isTagBoundaryV1(lowerHtml[index + prefix.length])) return index;
    index = lowerHtml.indexOf(prefix, index + prefix.length);
  }
  return -1;
}

function removeElementBlocksV1(value, tagName) {
  const lowerHtml = value.toLowerCase();
  const chunks = [];
  let cursor = 0;
  while (cursor < value.length) {
    const openStart = findElementTagV1(lowerHtml, tagName, cursor, false);
    if (openStart < 0) {
      chunks.push(value.slice(cursor));
      break;
    }
    chunks.push(value.slice(cursor, openStart), " ");
    const openEnd = findTagEndV1(value, openStart);
    if (openEnd < 0) break;
    const closeStart = findElementTagV1(lowerHtml, tagName, openEnd + 1, true);
    if (closeStart < 0) break;
    const closeEnd = findTagEndV1(value, closeStart);
    if (closeEnd < 0) break;
    cursor = closeEnd + 1;
  }
  return chunks.join("");
}

export function removeOnePieceOfficialExecutableHtmlV1(value) {
  return ["script", "style"].reduce(
    (html, tagName) => removeElementBlocksV1(html, tagName),
    String(value ?? ""),
  );
}
