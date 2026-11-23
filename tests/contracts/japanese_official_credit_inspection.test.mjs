import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectOfficialJapaneseCredits } from '../../scripts/audits/japanese_master_index_v4/official_jp_credit_inspection_v1.mjs';

function page(authors, components = '') {
  return `<html><h1 class="Heading1">ピカチュウ</h1><div class="subtext">001 / 100</div>${authors}${components}</html>`;
}

test('one listed artist is available as a review-only single credit', () => {
  const result = inspectOfficialJapaneseCredits(page('<div class="author"><a href="#">A &amp; B</a></div>'), '1');
  assert.equal(result.status, 'single_listed_illustrator');
  assert.deepEqual(result.illustrator_names, ['A & B']);
  assert.equal(result.single_illustrator, 'A & B');
  assert.equal(result.mutation_authority, false);
});

test('multiple nested official artists are preserved and never reduced to one credit', () => {
  const html = page('<div class="author"><h4>イラストレーター</h4><div class="author-list"><a href="#">First</a><a href="#">Second</a><a href="#">Third</a></div></div>');
  const result = inspectOfficialJapaneseCredits(html, '2');
  assert.deepEqual(result.illustrator_names, ['First', 'Second', 'Third']);
  assert.equal(result.status, 'multiple_illustrators_require_review');
  assert.equal(result.single_illustrator, null);
});

test('multipart cards require component review even with one listed artist', () => {
  const html = page('<div class="author"><a href="#">Artist</a></div>', '<div class="subtext-set">001 / 100</div><div class="subtext-set">002 / 100</div>');
  const result = inspectOfficialJapaneseCredits(html, '3');
  assert.deepEqual(result.illustrator_names, ['Artist']);
  assert.equal(result.status, 'multipart_requires_component_review');
  assert.equal(result.single_illustrator, null);
});

test('missing or empty author extraction cannot supply a credit', () => {
  for (const authors of ['', '<div class="author"><a href="#"> </a></div>']) {
    const result = inspectOfficialJapaneseCredits(page(authors), '4');
    assert.equal(result.status, 'no_illustrator_extracted');
    assert.equal(result.single_illustrator, null);
  }
});
