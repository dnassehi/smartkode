// js/icpcFallbackMapper.js

const fetch = window.fetch;        // innebygd i renderer
const HEADERS = {                   // gjenbruk dine headers
  'Accept': 'application/json',
  'Accept-Language': 'nb'
};

// Cacheliste for å slippe å spørre samme id flere ganger
const mappingCache   = new Map();
const parentsCache   = new Map();

/**
 * Henter ICPC-mapping på ett SNOMED‐ID om den finnes, ellers null.
 */
async function fetchDirectMapping(conceptId) {
  // Hvis vi har cacha mapping, returner den (også om den er null)
  if (mappingCache.has(conceptId)) {
    return mappingCache.get(conceptId);
  }
  const url = `https://fat.kote.helsedirektoratet.no/api/snomed/${conceptId}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    console.warn(`fetchDirectMapping(${conceptId}) feilet: ${res.status}`);
    mappingCache.set(conceptId, null);
    return null;
  }
  const data = await res.json();
  // data kan være et objekt med en liste over mappings under e.g. data.mappings
  // Eller API-et returnerer én mapping-objekt hvis den finnes:
  //   { system:'ICPC-2', targetId:'T90', … }
  // Du må tilpasse denne sjekken til faktisk struktur.
  const mapping = Array.isArray(data.mappings)
    ? data.mappings.find(m => m.system === 'ICPC-2')
    : (data.system === 'ICPC-2' ? data : null);

  mappingCache.set(conceptId, mapping);
  return mapping;
}

/**
 * Henter parent‐IDer for ett SNOMED‐concept. 
 * Forutsetter et FAT-endepunkt som /api/snomed/{id}/parents som gir { items: [ { conceptId, ... } ] }
 */
async function fetchParents(conceptId) {
  if (parentsCache.has(conceptId)) {
    return parentsCache.get(conceptId);
  }
  const url = `https://fat.kote.helsedirektoratet.no/api/snomed/${conceptId}/parents`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    console.warn(`fetchParents(${conceptId}) feilet: ${res.status}`);
    parentsCache.set(conceptId, []);
    return [];
  }
  const payload = await res.json();
  // Anta payload.items er array av obj med .conceptId
  const parents = Array.isArray(payload.items)
    ? payload.items.map(i => i.conceptId)
    : [];
  parentsCache.set(conceptId, parents);
  return parents;
}

/**
 * Rekursiv funksjon som forsøker å finne først‐opp mapping
 * på conceptId eller noe av dets foreldre, best‐first.
 */
async function findNearestMapping(conceptId, visited = new Set()) {
  if (visited.has(conceptId)) return null;
  visited.add(conceptId);

  // 1) Prøv direkte mapping
  const direct = await fetchDirectMapping(conceptId);
  if (direct) {
    return direct;
  }

  // 2) Hent foreldre
  const parents = await fetchParents(conceptId);
  for (const parentId of parents) {
    const mapping = await findNearestMapping(parentId, visited);
    if (mapping) {
      return mapping;
    }
  }

  // 3) Ingen mapping i dette sub‐treet
  return null;
}

module.exports = {
  findNearestMapping
};
