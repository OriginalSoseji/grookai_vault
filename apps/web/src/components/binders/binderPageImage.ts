type Slot = { title: string; subtitle: string | null; imageUrl: string | null };

/** User-reviewed checklist image. This never exports ownership or member data. */
export async function renderBinderPageImage(slots: Slot[], columns: number, rows: number, page: number, pages: number) {
  await document.fonts.ready;
  const images = await Promise.all(slots.map(slot => new Promise<HTMLImageElement | null>(resolve => {
    if (!slot.imageUrl) return resolve(null);
    const image = new Image(); image.crossOrigin = "anonymous";
    const timer = setTimeout(() => resolve(null), 8000);
    image.onload = () => { clearTimeout(timer); resolve(image); };
    image.onerror = () => { clearTimeout(timer); resolve(null); };
    image.src = slot.imageUrl;
  })));
  const canvas = document.createElement("canvas"); canvas.width = 1080;
  const margin = 32, gap = 9, width = (1080 - margin * 2 - gap * (columns - 1)) / columns;
  const art = width * 7 / 5, cell = art + 100;
  canvas.height = Math.ceil(130 + rows * (cell + gap));
  const ctx = canvas.getContext("2d"); if (!ctx) throw Error("Image unavailable");
  const family = getComputedStyle(document.body).fontFamily;
  ctx.fillStyle = "#080B09"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#F4F5ED"; ctx.font = `700 28px ${family}`;
  ctx.fillText(`Binder checklist · Page ${page + 1} of ${pages}`, margin, 48);
  for (let i = 0; i < columns * rows; i++) {
    const x = margin + (i % columns) * (width + gap), y = 80 + Math.floor(i / columns) * (cell + gap);
    ctx.fillStyle = "#151915"; ctx.fillRect(x, y, width, art);
    const slot = slots[i]; if (!slot) continue;
    const image = images[i];
    if (image) { const scale = Math.min(width / image.naturalWidth, art / image.naturalHeight); ctx.drawImage(image, x + (width - image.naturalWidth * scale) / 2, y + (art - image.naturalHeight * scale) / 2, image.naturalWidth * scale, image.naturalHeight * scale); }
    else { ctx.fillStyle = "#B7BCAE"; ctx.font = `16px ${family}`; ctx.fillText("Artwork unavailable", x + 8, y + art / 2, width - 16); }
    ctx.fillStyle = "#F4F5ED"; ctx.font = `700 18px ${family}`;
    lines(ctx, `Pocket ${page * columns * rows + i + 1} · ${slot.title}`, x, y + art + 24, width, 22, 2);
    ctx.fillStyle = "#B7BCAE"; ctx.font = `16px ${family}`;
    lines(ctx, slot.subtitle ?? "", x, y + art + 65, width, 19, 2);
  }
  ctx.fillStyle = "#B7BCAE"; ctx.font = `18px ${family}`;
  ctx.fillText("Checklist requirements · Ownership not shown", margin, canvas.height - 18);
  return new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(Error("Image unavailable")), "image/png"));
}
function lines(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, height: number, maximum: number) {
  let current = "", row = 0;
  for (const word of text.split(/\s+/)) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width > width && current) { ctx.fillText(current, x, y + row++ * height, width); current = word; if (row >= maximum) return; }
    else current = next;
  }
  if (row < maximum) ctx.fillText(current, x, y + row * height, width);
}
