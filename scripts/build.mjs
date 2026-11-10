import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeTitle } from '../src/matcher.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const input = JSON.parse(await readFile(path.join(root, 'data/titles.json'), 'utf8'));
const output = path.join(root, 'docs');
const types = new Set(['tv', 'movie', 'ova', 'ona', 'special']);
const sources = new Set(['manual', 'verified']);
if (input.schemaVersion !== 1 || !Array.isArray(input.entries)) throw new Error('Invalid source schema');

const entries = [];
const uniqueKeys = new Set();
const ids = Object.create(null);
const aliases = Object.create(null);

for (const entry of input.entries) {
  if (typeof entry.key !== 'string' || !/^[a-z0-9-]+$/.test(entry.key) || uniqueKeys.has(entry.key)) {
    throw new Error('Missing, invalid or duplicate key: ' + entry.key);
  }
  uniqueKeys.add(entry.key);
  if (!types.has(entry.type) || !(entry.season === null || (Number.isInteger(entry.season) && entry.season > 0))) {
    throw new Error('Invalid type/season: ' + entry.key);
  }
  if (typeof entry.titles?.ko !== 'string' || !entry.titles.ko.trim()) {
    throw new Error('Missing Korean title: ' + entry.key);
  }
  if (!sources.has(entry.source) || typeof entry.reviewed !== 'boolean') {
    throw new Error('Invalid provenance: ' + entry.key);
  }
  if (!Array.isArray(entry.aliases) || entry.aliases.some(alias => typeof alias !== 'string' || !alias.trim())) {
    throw new Error('Invalid aliases: ' + entry.key);
  }
  if (entry.ids == null || typeof entry.ids !== 'object' || Array.isArray(entry.ids)) {
    throw new Error('Invalid ids object: ' + entry.key);
  }
  for (const [provider, id] of Object.entries(entry.ids)) {
    if (!['anilist', 'mal', 'tmdb'].includes(provider) || !/^[1-9][0-9]*$/.test(String(id))) {
      throw new Error('Invalid ID: ' + entry.key);
    }
    const indexKey = `${provider}:${id}`;
    if (Object.hasOwn(ids, indexKey)) throw new Error('Duplicate ID: ' + indexKey);
    ids[indexKey] = entry.key;
  }
  const searchable = [...Object.values(entry.titles), ...entry.aliases];
  for (const alias of new Set(searchable.map(normalizeTitle).filter(Boolean))) {
    (aliases[alias] ??= []).push(entry.key);
  }
  entries.push(entry);
}

entries.sort((a, b) => a.key.localeCompare(b.key));
const sortedIds = Object.fromEntries(Object.entries(ids).sort(([a], [b]) => a.localeCompare(b)));
const sortedAliases = Object.fromEntries(Object.entries(aliases).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => [key, value.sort()]));
const dataset = { schemaVersion: 1, count: entries.length, entries, indexes: { ids: sortedIds, aliases: sortedAliases } };
await mkdir(output, { recursive: true });
await writeFile(path.join(output, 'titles.json'), JSON.stringify(dataset, null, 2) + '\n');
await writeFile(path.join(output, 'health.json'), JSON.stringify({ ok: true, schemaVersion: 1, count: entries.length }, null, 2) + '\n');
console.log(`Built ${entries.length} entries`);
