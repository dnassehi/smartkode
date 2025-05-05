// icpcMatcher.js
import stringSimilarity from 'string-similarity'; // installer f.eks. via npm

// Du kan justere vektene her:
const WEIGHTS = {
  exact:    100,  // perfekt match
  substring: 50,  // beskrivelse inneholder søkeordet
  fuzzy:    30,   // fuzzy match (Levenshtein)
  chapterBoost: 20 // ekstra hvis koden er i relevant kapittel
};

// Stop‐ord (kan utvides dynamisk)
const STOP_KEYWORDS = new Set([
  'aktivitet','diagnose','plan','analyse'
]);

export function matchKeywordToCodes(kw, codes, options = {}) {
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
}