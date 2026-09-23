import artistNames from "./pokemonArtistNames.json";

const normalize = (value: string) => value.normalize("NFKC").toLocaleLowerCase("en");
const ignored = new Set(["art", "artist", "illustrator", "card", "cards", "pokemon", "project", "studio"]);
const artists = artistNames.artists.map((name) => ({ name, tokens: normalize(name).split(/\s+/) }));

// Correction is deliberately limited to a single edit in a full, multiword
// credit. A partial name or a near tie must never silently choose an artist.
function oneEditApart(a: string, b: string) {
  if (a === b || Math.abs(a.length - b.length) > 1) return false;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] === b[i]) continue;
    return a.length === b.length
      ? a.slice(i + 1) === b.slice(i + 1)
      : a.length > b.length
        ? a.slice(i + 1) === b.slice(i)
        : a.slice(i) === b.slice(i + 1);
  }
  return false;
}

export type CombinedArtistIntent = {
  artist: string;
  names: string[];
  matchedText: string;
  start: number;
  end: number;
  correction?: { original: string; corrected: string };
};

export function recognizeLiteralArtist(query: string): CombinedArtistIntent | null {
  // A correction undo keeps the artist criterion and restores its exact spelling.
  // Equality reads avoid turning that action into an unrestricted catalog scan.
  const literal = query.match(/\b(?:artist|illustrator):\s*"([^"\n]+)"/i);
  if (literal) {
    const artist = literal[1].trim();
    if (artist) return { artist, names: [artist], matchedText: literal[0],
      start: literal.index!, end: literal.index! + literal[0].length };
  }
  return null;
}

export function recognizeCombinedArtist(query: string, allowCorrection = true): CombinedArtistIntent | null {
  // Unqualified quoted text is literal, never an inferred artist.
  const searchable = query.replace(/"[^"\n]*"/g, (value) => " ".repeat(value.length));
  const words = [...searchable.matchAll(/[^\s,]+/g)].map((match) => ({
    value: normalize(match[0]), start: match.index!, end: match.index! + match[0].length,
  }));
  const matches: Array<{ start: number; end: number; names: string[]; correction?: string; rank: number }> = [];
  for (let start = 0; start < words.length; start++) {
    for (const artist of artists) {
      const length = artist.tokens.length;
      if (start + length > words.length) continue;
      const tokens = words.slice(start, start + length).map((word) => word.value);
      const exact = tokens.every((token, index) => token === artist.tokens[index]);
      const edits = tokens.filter((token, index) => token !== artist.tokens[index]);
      const corrected = allowCorrection && length >= 2 && edits.length === 1 &&
        tokens.every((token, index) => token === artist.tokens[index] ||
          (token.length >= 4 && oneEditApart(token, artist.tokens[index])));
      if ((exact && artist.name.length >= 3 && !ignored.has(normalize(artist.name))) || corrected) {
        matches.push({ start, end: start + length, names: [artist.name],
          correction: corrected && !exact ? artist.name : undefined, rank: exact ? 3 : 2 });
      }
    }
  }
  // Exact full credits outrank corrections; longer credits outrank their parts.
  matches.sort((a, b) => b.rank - a.rank || (b.end - b.start) - (a.end - a.start));
  let match = matches[0];
  if (match?.correction && matches.some((other) => other !== match && other.rank === match.rank &&
    other.start === match.start && other.end === match.end && other.names[0] !== match.names[0])) return null;
  if (!match) {
    for (let index = 0; index < words.length; index++) {
      const token = words[index].value;
      if (token.length < 3 || ignored.has(token)) continue;
      const names = artists.filter((artist) => artist.tokens.length >= 2 &&
        (artist.tokens[0] === token || artist.tokens.at(-1) === token)).map((artist) => artist.name);
      if (names.length) {
        match = { start: index, end: index + 1, names, rank: 1 };
        break;
      }
    }
  }
  if (!match) return null;
  let start = words[match.start].start;
  const end = words[match.end - 1].end;
  const original = query.slice(start, end);
  const prefix = query.slice(0, start).match(/\b(?:(?:illustrated|drawn|art)\s+by|artist|illustrator)\s*:?\s*$/i);
  if (prefix) start -= prefix[0].length;
  return {
    artist: match.names.length === 1 ? match.names[0] : original,
    names: match.names,
    matchedText: query.slice(start, end), start, end,
    correction: match.correction ? { original, corrected: match.correction } : undefined,
  };
}
