/**
 * Title matching is deterministic and intentionally conservative.
 * Copy this module into a consuming app; GitHub Pages only hosts JSON.
 */
export function normalizeTitle(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function matchTitle(dataset, { title, anilistId, malId, tmdbId, type, season } = {}) {
  if (dataset?.schemaVersion !== 1 || !dataset.indexes?.ids || !dataset.indexes?.aliases || !Array.isArray(dataset.entries)) {
    throw new Error('Unsupported title dataset');
  }

  const keysById = [];
  for (const [provider, id] of [['anilist', anilistId], ['mal', malId], ['tmdb', tmdbId]]) {
    if (id == null || id === '') continue;
    const key = dataset.indexes.ids[`${provider}:${id}`];
    if (key) keysById.push(key);
  }
  // Conflicting IDs must never select the first arbitrary match.
  if (new Set(keysById).size > 1) return { matched: false, reason: 'conflicting-ids' };

  const idMatched = keysById.length > 0;
  const keys = idMatched
    ? [...new Set(keysById)]
    : (title ? dataset.indexes.aliases[normalizeTitle(title)] ?? [] : []);

  if (keys.length === 0) return { matched: false, reason: 'not-found' };
  const entriesByKey = new Map(dataset.entries.map(entry => [entry.key, entry]));
  const candidates = keys.map(key => entriesByKey.get(key)).filter(Boolean)
    .filter(entry => (type == null || entry.type === type) && (season == null || entry.season === Number(season)));

  if (candidates.length !== 1) {
    return { matched: false, reason: candidates.length ? 'ambiguous' : 'constraint-mismatch', candidates: candidates.map(entry => entry.key) };
  }
  const entry = candidates[0];
  return {
    matched: true, method: idMatched ? 'id' : 'exact-alias',
    key: entry.key, koTitle: entry.titles.ko, type: entry.type,
    season: entry.season, reviewed: entry.reviewed
  };
}
