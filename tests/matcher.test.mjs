import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { matchTitle, normalizeTitle } from '../src/matcher.mjs';

const dataset = JSON.parse(await readFile(new URL('../docs/titles.json', import.meta.url), 'utf8'));

test('normalizes punctuation consistently', () => {
  assert.equal(normalizeTitle(' Chainsaw-Man: Reze Arc! '), 'chainsaw man reze arc');
});
test('matches the Reze movie alias', () => {
  assert.equal(matchTitle(dataset, { title: 'Chainsaw Man Reze Arc', type: 'movie' }).koTitle, '극장판 체인소 맨: 레제편');
});
test('matches second season separately', () => {
  assert.equal(matchTitle(dataset, { title: '100 Kanojo Season 2', season: 2 }).matched, true);
});
test('does not force a mismatched content type', () => {
  assert.equal(matchTitle(dataset, { title: '100 Kanojo Season 2', type: 'movie' }).reason, 'constraint-mismatch');
});
test('unknown titles remain unmatched', () => {
  assert.deepEqual(matchTitle(dataset, { title: 'unknown' }), { matched: false, reason: 'not-found' });
});
test('rejects conflicting provider IDs', () => {
  const sample = { ...dataset, indexes: { ...dataset.indexes, ids: { 'anilist:1': 'a', 'mal:2': 'b' } } };
  assert.equal(matchTitle(sample, { anilistId: 1, malId: 2 }).reason, 'conflicting-ids');
});
test('rejects ambiguous aliases', () => {
  const sample = { ...dataset, indexes: { ...dataset.indexes, aliases: { ...dataset.indexes.aliases, shared: ['chainsaw-man-reze-arc', '100-girlfriends-season-2'] } } };
  assert.equal(matchTitle(sample, { title: 'shared' }).reason, 'ambiguous');
});
test('returns reviewed status so callers can require verified entries', () => {
  assert.equal(matchTitle(dataset, { title: '100 Kanojo Season 2' }).reviewed, false);
});
