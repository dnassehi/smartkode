// icpcMatcher.js
const stringSimilarity = require('string-similarity'); // installer f.eks. via npm

// Du kan justere vektene her:
const WEIGHTS = {
  exact:    100,  // perfekt match
  substring: 80,  // beskrivelse inneholder søkeordet
  fuzzy:    10,   // fuzzy match (Levenshtein)
  chapterBoost: 30 // ekstra hvis koden er i relevant kapittel
};

// Stop‐ord (kan utvides dynamisk)
const STOP_KEYWORDS = new Set([
  'aktivitet','diagnose','plan','analyse'
]);

function matchKeywordToCodes(kw, codes, options = {}) {
  const term = kw.toLowerCase().trim();
  if (STOP_KEYWORDS.has(term)) return [];

  // Hent kontekst fra options om du vil prioritere visse kapitler
  const { preferredChapters = [] } = options;

  // Gi hvert code-objekt en score
  const scored = codes.map(c => {
    let score = 0;
    const desc = c.term.toLowerCase();

    if (desc === term) {
      score += WEIGHTS.exact;
    } else if (desc.includes(term)) {
      score += WEIGHTS.substring;
    } else {
      // fuzzy match via string-similarity
      const sim = stringSimilarity.compareTwoStrings(term, desc);
      score += sim * WEIGHTS.fuzzy;
    }

    // boost hvis koden starter på et kapittel vi foretrekker
    for (const chap of preferredChapters) {
      if (c.code.startsWith(chap)) {
        score += WEIGHTS.chapterBoost;
        break;
      }
    }

    return { codeObj: c, score };
  });

  // Sortér etter score og returnér
  scored.sort((a, b) => b.score - a.score);
  return scored.map(s => s.codeObj);

  // Viser topp N resultarer. N er tallet etter ||
  const maxResults = options.maxResults || 10;

  const result = scored
    .filter(s => s.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(s => s.codeObj);

  return result;

  // Debug-logging
  scored.forEach(s => {
    console.log(`KW="${term}" → ${s.codeObj.code}: score=${s.score.toFixed(2)}`);
  });
}

// Eksporter alle
module.exports = {
  matchKeywordToCodes,
  // … andre funksjoner …
};