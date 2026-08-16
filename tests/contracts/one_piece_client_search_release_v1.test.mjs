import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const cardModel = fs.readFileSync("lib/models/card_print.dart", "utf8");
const app = fs.readFileSync("lib/main.dart", "utf8");
const vault = fs.readFileSync("lib/main_vault.dart", "utf8");
const artwork = fs.readFileSync("lib/widgets/card_surface_artwork.dart", "utf8");
const zoom = fs.readFileSync("lib/widgets/card_zoom_viewer.dart", "utf8");

test("mobile catalog search defaults to Pokemon and explicitly scopes One Piece", () => {
  assert.match(cardModel, /this\.gameScope = 'pokemon'/);
  assert.match(cardModel, /gameScope == 'one_piece'/);
  assert.match(cardModel, /\.from\('games'\)[\s\S]*\.eq\('code', _normalizeCatalogGameScope\(gameScope\)\)/);
  assert.ok(
    cardModel.match(/\.eq\('game_id', gameId\)/g)?.length >= 8,
    "all local catalog search branches must constrain card or set rows by game_id",
  );
  assert.match(cardModel, /trimmed\.isNotEmpty && gameScope == 'pokemon'/);
});

test("catalog and Vault pickers expose the same explicit game selector", () => {
  for (const source of [app, vault]) {
    assert.match(source, /value: 'pokemon'/);
    assert.match(source, /value: 'one_piece'/);
    assert.match(source, /gameScope: _gameScope/);
    assert.match(source, /_handleGameScopeChanged/);
  }
});

test("mobile sends auth only to the governed canonical card image endpoint", () => {
  assert.match(artwork, /isCanonicalCardImageUrl\(url\)/);
  assert.match(artwork, /'Authorization': 'Bearer \$token'/);
  assert.match(artwork, /httpHeaders: requestHeaders\(imageUrl\)/);
  assert.match(zoom, /isCanonicalCardImageUrl\(imageUrl\)/);
  assert.match(zoom, /headers: _canonicalCardImageHeaders\(imageUrl\)/);
  assert.match(zoom, /httpHeaders: _canonicalCardImageHeaders\(url\)/);
});
