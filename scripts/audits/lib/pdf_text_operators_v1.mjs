const PDF_NUMBER_RE = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;
const TEXT_OPERATOR_RE = /(?:Tm|TJ|Tj)\b/g;
const PDF_OCTAL_REPLACEMENTS = new Map([
  ["222", "'"],
  ["226", "-"],
  ["227", "-"],
  ["251", "(c)"],
  ["256", "(r)"],
  ["351", "é"],
  ["034", ""],
  ["035", ""],
  ["036", ""],
  ["037", ""],
]);

function isEscapedAt(text, index) {
  let slashCount = 0;
  for (let cursor = index - 1; cursor >= 0 && text[cursor] === "\\"; cursor -= 1) {
    slashCount += 1;
  }
  return slashCount % 2 === 1;
}

function enclosedOperand(text, operatorIndex, opening, closing) {
  let end = operatorIndex;
  while (end > 0 && /\s/.test(text[end - 1])) end -= 1;
  if (text[end - 1] !== closing || isEscapedAt(text, end - 1)) return null;

  let depth = 0;
  for (let cursor = end - 1; cursor >= 0; cursor -= 1) {
    if (isEscapedAt(text, cursor)) continue;
    if (text[cursor] === closing) {
      depth += 1;
    } else if (text[cursor] === opening) {
      depth -= 1;
      if (depth === 0) return text.slice(cursor, end);
    }
  }
  return null;
}

function textMatrixCoordinates(text, operatorIndex) {
  const prefix = text.slice(Math.max(0, operatorIndex - 512), operatorIndex).trimEnd();
  const tokens = prefix.split(/\s+/).slice(-6);
  if (tokens.length !== 6 || !tokens.every((token) => PDF_NUMBER_RE.test(token))) {
    return null;
  }
  return { x: Number(tokens[4]), y: Number(tokens[5]) };
}

export function decodePdfString(value) {
  const input = String(value ?? "");
  let decoded = "";
  for (let cursor = 0; cursor < input.length; cursor += 1) {
    const character = input[cursor];
    if (character !== "\\" || cursor + 1 >= input.length) {
      decoded += character;
      continue;
    }

    const escaped = input[cursor + 1];
    if (escaped === "(" || escaped === ")" || escaped === "\\") {
      decoded += escaped;
      cursor += 1;
      continue;
    }
    if (/[0-7]/.test(escaped)) {
      let end = cursor + 1;
      while (end < input.length && end <= cursor + 3 && /[0-7]/.test(input[end])) {
        end += 1;
      }
      const octal = input.slice(cursor + 1, end);
      decoded += PDF_OCTAL_REPLACEMENTS.get(octal) ?? "";
      cursor = end - 1;
      continue;
    }
    decoded += character;
  }
  return decoded.replace(/\s+/g, " ").trim();
}

export function decodePdfArrayText(value) {
  const text = String(value ?? "");
  const parts = [];
  let cursor = 0;
  while (cursor < text.length) {
    if (text[cursor] !== "(" || isEscapedAt(text, cursor)) {
      cursor += 1;
      continue;
    }
    let depth = 1;
    let end = cursor + 1;
    for (; end < text.length; end += 1) {
      if (isEscapedAt(text, end)) continue;
      if (text[end] === "(") depth += 1;
      if (text[end] === ")") depth -= 1;
      if (depth === 0) break;
    }
    if (depth !== 0) break;
    parts.push(decodePdfString(text.slice(cursor + 1, end)));
    cursor = end + 1;
  }
  return parts.join("").replace(/\s+/g, " ").trim();
}

export function extractPdfTextItems(streamText) {
  const text = String(streamText ?? "");
  if (!text.includes("Tj") && !text.includes("TJ")) return [];

  const items = [];
  let x = null;
  let y = null;
  for (const match of text.matchAll(TEXT_OPERATOR_RE)) {
    const operator = match[0];
    const operatorIndex = match.index;
    if (operator === "Tm") {
      const coordinates = textMatrixCoordinates(text, operatorIndex);
      if (coordinates) ({ x, y } = coordinates);
      continue;
    }

    const operand = operator === "TJ"
      ? enclosedOperand(text, operatorIndex, "[", "]")
      : enclosedOperand(text, operatorIndex, "(", ")");
    if (!operand) continue;
    const decoded = operator === "TJ"
      ? decodePdfArrayText(operand)
      : decodePdfString(operand.slice(1, -1));
    if (decoded && Number.isFinite(x) && Number.isFinite(y)) {
      items.push({ x, y, text: decoded });
    }
  }
  return items;
}
