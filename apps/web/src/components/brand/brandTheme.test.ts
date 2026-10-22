import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { BRAND_THEMES } from "./brandTheme.ts";

function luminance(hex: string) {
  const channels = hex.slice(1).match(/../g)!.map((channel) => {
    const value = Number.parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(a: string, b: string) {
  const [dark, light] = [luminance(a), luminance(b)].sort((x, y) => x - y);
  return (light + 0.05) / (dark + 0.05);
}

for (const [name, theme] of Object.entries(BRAND_THEMES)) {
  test(`${name} interactions match the logo and remain readable in both modes`, () => {
    assert.ok(theme.logoFill.includes(theme.accent), "The interface accent must come from the logo palette");
    assert.ok(contrast(theme.accent, "#080b09") >= 4.5, "Dark-mode action labels must meet AA contrast");
    assert.ok(contrast(theme.lightAccent, "#ffffff") >= 4.5, "Light-mode action labels must meet AA contrast");
    assert.ok(contrast(theme.lightAccent, "#f4f5ed") >= 4.5, "Light-mode links must meet AA contrast");
  });
}

test("seasonal treatments retain the approved original emblem sources", () => {
  const approved = {
    "grookai-logo-512.png": "989b6dd9aad8f7d3a846c06190c09261a161f4bb5df1a79c16a3dbc25ddd01ad",
    "grookai-logo-64.png": "cf83493f5e977d1f62241cc9a5c97e5502b57218c622b120287d4360bdbc3289",
  };
  for (const [asset, hash] of Object.entries(approved)) {
    const source = readFileSync(new URL(`../../../public/${asset}`, import.meta.url));
    assert.equal(createHash("sha256").update(source).digest("hex"), hash);
  }
});
