// Remove dark background connected to the crop edge, retaining enclosed ink.
// Pure pixel operation: no catalog tokens, digit substitutions or text templates.
export function enclosedInk(gray, width, height, threshold) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || gray.length !== width * height) throw new Error('Invalid grayscale crop.');
  const mask = Uint8Array.from(gray, value => value < threshold ? 0 : 255);
  const seen = new Uint8Array(mask.length), queue = [];
  for (let i = 0; i < mask.length; i++) {
    if (i < width || i >= width * (height - 1) || i % width === 0 || i % width === width - 1) {
      if (!mask[i] && !seen[i]) { seen[i] = 1; queue.push(i); }
    }
  }
  for (let p = 0; p < queue.length; p++) {
    const i = queue[p];
    for (const j of [i % width ? i - 1 : -1, i % width < width - 1 ? i + 1 : -1, i - width, i + width]) {
      if (j >= 0 && j < mask.length && !mask[j] && !seen[j]) { seen[j] = 1; queue.push(j); }
    }
  }
  for (const i of queue) mask[i] = 255;
  return mask;
}
