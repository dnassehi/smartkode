// main-transcribe.js
console.log('🔧 main-transcribe.js starter');

const { initTranscribeLanguage } = require('./js/languageLoaderUsage.js');
const { initGuideOverlay }    = require('./js/ui.js');
const { matchKeywordToCodes }  = require('./js/icpcMatcher.js');
const stringSimilarity         = require('string-similarity');
const icpcData = require('./js/icpc-2.json').data;

// Node.js-moduler for filsystem og database (gjennom Electron)
const fs = require('fs');
const sqlite3 = require('sqlite3');

// Les OpenAI API-nøkkel fra fil (API.txt)
let apiKey = "";
try {
  const keyData = fs ? fs.readFileSync('API.txt', 'utf8') : null;
  if (keyData) apiKey = keyData.toString().trim();
} catch (err) {
  console.warn("Kunne ikke lese API.txt:", err);
}
if (!apiKey) {
  alert("API-nøkkel mangler. Sørg for at filen API.txt eksisterer og inneholder nøkkelen.");
  window.location.href = "index.html";
}

const OPENAI_API_KEY = apiKey; // allerede lastet fra API.txt
const MODEL = 'gpt-4o-mini';

/**
 * Bruk OpenAI til å forenkle et rått nøkkelord til ett enkelt token.
 * @param {string} raw – råt nøkkelord (f.eks. "diabetisk kontroll")
 * @returns {Promise<string>} – forenklet token (f.eks. "diabetes")
 */
async function simplifyKeyword(raw) {
  const prompt = `Du er en hjelpefunksjon som tar et sammensatt søkeord fra en klinisk notat-assistent og returnerer ett enkelt søketoken.  
Eksempel:  
- "diabetisk kontroll" → "diabetes"  
- "HbA1c 54" → "hba1c"  
- "blodtrykk 168/95" → "blodtrykk"  
Returner bare selve token, uten andre ord eller tegn.  
Søkeord: "${raw}"  
Token:`;
  
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0
    })
  });
  const { choices } = await res.json();
  const tok = choices?.[0]?.message?.content?.trim();
  return tok || raw.toLowerCase().replace(/\W+/g,' ').split(' ')[0];
}

/**
 * Asynkron versjon av searchLocalCodes som først forenkler tokens via GPT.
 */
async function searchLocalCodes(rawTerm) {
  // 1) Bryt ned rå-term i potensielle tokens
  const parts = rawTerm
    .toLowerCase()
    .replace(/\//g,' ')
    .split(/\s+/)
    .filter(Boolean);

  // 2) Forenkle hvert token via GPT
  const simplifiedTokens = await Promise.all(parts.map(simplifyKeyword));

  // 3) Utfør ellers samme logikk som før, men mot simplifiedTokens:
  const strictSet = new Set();
  simplifiedTokens.forEach(t => {
    icpcData.forEach(entry => {
      const inc    = (entry.inclusion   || '').toLowerCase();
      const more   = (entry.moreInfo    || '').toLowerCase();
      const exc    = (entry.exclusion   || '').toLowerCase();
      const nameN  = (entry.nameNorwegian || '').toLowerCase();
      const text60 = (entry.textMax60     || '').toLowerCase();
      if (!exc.includes(t) && (
           nameN.includes(t) ||
           text60.includes(t) ||
           inc.includes(t) ||
           more.includes(t)
         )) {
        strictSet.add(entry);
      }
    });
  });

  let results = Array.from(strictSet);
  // 4) Fuzzy-fallback om ingen presise treff (som før)
  if (results.length === 0) {
    const fuzzy = [];
    simplifiedTokens.forEach(t => {
      icpcData.forEach(entry => {
        const nameN  = (entry.nameNorwegian || '').toLowerCase();
        const text60 = (entry.textMax60     || '').toLowerCase();
        const score  = Math.max(
          stringSimilarity.compareTwoStrings(t, nameN),
          stringSimilarity.compareTwoStrings(t, text60)
        );
        if (score >= 0.3) fuzzy.push({ entry, score });
      });
    });
    const seen = new Set();
    results = fuzzy
      .sort((a,b) => b.score - a.score)
      .filter(x => {
        const code = x.entry.codeValue;
        if (seen.has(code)) return false;
        seen.add(code);
        return true;
      })
      .slice(0,5)
      .map(x => x.entry);
  }

  // 5) Returnér som før
  return results.map(e => ({
    code: e.codeValue,
    term: e.textMax60 || e.nameNorwegian
  }));
}

// Tilstand for lydopptak og valgt prompt
let mediaRecorder;
let audioChunks = [];
let recordingInterval;
let isPaused = false;
let selectedPromptIndex = 0;

// Prompt-mal for notat (P-SOAP)
function buildPsoapPrompt(transcriptText) {
  return `Du er en medisinsk dokumentasjonsmodell med følgende oppgave:
1. Generer et journalnotat strukturert etter P-SOAP (Presentasjon, Subjektivt, Objektivt, Analyse, Plan).
2. Inkluder kun informasjon som er eksakt nevnt i transkripsjonen.
3. Ikke tilføye, anta eller gjette noe som ikke står i transkripsjonen.
4. Forbedre grammatikk, stavemåte og flyt uten å endre innhold.
5. Hvis et P-SOAP-felt ikke er nevnt, sett det til en tom streng.
6. Returner **kun** et gyldig JSON-objekt med disse feltene (uten ekstra tekst):
{
  "Presentasjon": "<tekst>",
  "Subjektivt": "<tekst>",
  "Objektivt": "<tekst>",
  "Analyse": "<tekst>",
  "Plan": "<tekst>"
}

Transkripsjon:
"${transcriptText}"`;
}

// Hjelpefunksjon: Bruk GPT til å hente medisinske nøkkelord fra notat
async function fetchKeywordsFromGpt(noteText) {
  const prompt = `Du er en medisinsk assistent. Ekstraher de viktigste symptomene, plagene eller diagnosene fra følgende P-SOAP-notat. Returner kun et gyldig JSON-objekt på norsk med format: { "keywords":["ord1","ord2",...] }\n\nNotat:\n"""${noteText}"""`;
  let data;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }]
      })
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error?.message || `OpenAI feilet med status ${res.status}`);
    }
    data = await res.json();
  } catch (err) {
    console.error("fetchKeywordsFromGpt → fetch/res.json feilet:", err);
    throw err;
  }

  // Hent ut tekstinnholdet fra AI
  const content = data.choices?.[0]?.message?.content || "";
  console.log("fetchKeywordsFromGpt → rå AI-svar:", content);

  // Strip ut JSON-objektet som tekst
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) {
    console.error("fetchKeywordsFromGpt → fant ingen JSON i AI-svaret");
    throw new Error("Kunne ikke finne JSON-objekt i AI-svaret");
  }

  // Parse akkurat JSON-biten
  let parsed;
  try {
    parsed = JSON.parse(match[0]);
  } catch (err) {
    console.error("fetchKeywordsFromGpt → JSON.parse feilet på:", match[0], err);
    throw new Error("Kunne ikke tolke nøkkelord fra AI som gyldig JSON");
  }

  // Valider at det finnes en liste
  if (!parsed.keywords || !Array.isArray(parsed.keywords)) {
    console.error("fetchKeywordsFromGpt → mangler keywords-array eller feil type:", parsed);
    throw new Error("AI-svaret inneholder ikke en gyldig 'keywords'-liste");
  }

  return parsed.keywords;
}

// Initialiser app når DOM er ferdig lastet
window.addEventListener('DOMContentLoaded', () => {
  initTranscribeLanguage();
  initGuideOverlay();
  setupEventListeners();
});

function setupEventListeners() {
  const startBtn = document.getElementById('startBtn');
  const pauseResumeBtn = document.getElementById('pauseResumeBtn');
  const stopBtn = document.getElementById('stopBtn');
  const generateNoteBtn = document.getElementById('generateNoteBtn');
  const transcriptOutput = document.getElementById('transcriptOutput');
  const recordingTimerEl = document.getElementById('recordingTimer');
  const completionTimerEl = document.getElementById('completionTimer');
  const noteTimerEl = document.getElementById('noteTimer');
  const icpcSection = document.getElementById('icpc-section');
  const icpcNextBtn = document.getElementById('icpcNextBtn');
  const icpcSuggestionsDiv = document.getElementById('icpcSuggestions');
  const icpcSuggestionsList = document.getElementById('icpcSuggestionsList');
  const icpcDoneBtn = document.getElementById('icpcDoneBtn');
  const icpcInput = document.getElementById('icpcInput');
  const noteOutput = document.getElementById('noteOutput');
  // Justerer høyden på notat-tekstområdet dynamisk
  function adjustNoteHeight() {
    noteOutput.style.height = 'auto';
    noteOutput.style.height = Math.max(noteOutput.scrollHeight, 100) + 'px';
  }
// Kjør funksjonen når brukeren skriver i notatet
  noteOutput.addEventListener('input', adjustNoteHeight);

  // === Event: Neste (hent forslag til ICPC-2 koder) ===
  icpcNextBtn.addEventListener('click', async () => {
    const noteText = noteOutput.value.trim();
    if (!noteText) return alert('Notat mangler');
    const doctorInputCodes = icpcInput.value
      .toUpperCase()
      .split(/\s+/)
      .filter(c => /^[A-Z]\d{2}$/.test(c));
  
    icpcSuggestionsList.innerHTML = '<em>Henter forslag...</em>';
    icpcSuggestionsDiv.style.display = 'block';
  
    try {
      // 1. Hent nøkkelord
      const keywords = await fetchKeywordsFromGpt(noteText);
      // 2. Søk og velg koder
      //const matcherOptions = { preferredChapters: ['L'] }; // henger sammen med kode nedenfor
      const suggestions = [];
      for (const kw of keywords) {
        // Her bruker vi ICPC-kallet
        const codes = await searchLocalCodes(kw);
        const matched = matchKeywordToCodes(kw, codes); // sett ev. inn matcherOptions etter codes
        if (matched.length) {
          // du kan ta flere, f.eks. top 2: matched.slice(0,2)
          suggestions.push(matched[0])
        }
      }
      //2b. Husk siste AI-forslag globalt
      window.latestAiCodes = suggestions.map(c => c.code);
      // 3. Unike koder
      const uniqueCodes = [...new Set([...doctorInputCodes, ...suggestions.map(s => s.code)])];
      // 4. Presenter checkboxer
      icpcSuggestionsList.innerHTML = '';  
      uniqueCodes.forEach(code => {
        const aiEntry = suggestions.find(s => s.code === code);
        let desc;
        if (aiEntry) {
          desc = aiEntry.term;
        } else {
          const icpcEntry = icpcData.find(e =>
            e.codeValue.trim().toUpperCase() === code
          );
          desc = icpcEntry
            ? icpcEntry.nameNorwegian
            : '(ingen beskrivelse)';
  }
  // Deretter bygger du label/checkbox slik du gjorde før:
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.value = code;
  if (doctorInputCodes.includes(code)) cb.checked = true;
  const label = document.createElement('label');
  label.style.display = 'block';
  label.appendChild(cb);
  label.appendChild(document.createTextNode(` ${code} – ${desc}`));
  icpcSuggestionsList.appendChild(label);
});
    } catch (error) {
      console.error("Feil ved henting av ICPC-koder:", error);
      icpcSuggestionsList.textContent = `Feil: ${error.message}`;
    }});

  // Event: Start opptak
  startBtn.addEventListener('click', async () => {
    console.log('▶️ Start opptak trykket');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
    } catch (err) {
      alert("Tilgang til mikrofon nektet eller ikke tilgjengelig.");
      return;
    }
    audioChunks = [];
    isPaused = false;
    mediaRecorder.ondataavailable = e => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };
    mediaRecorder.onstop = handleRecordingStop;
    mediaRecorder.onpause = () => { isPaused = true; };
    mediaRecorder.onresume = () => { isPaused = false; };
    mediaRecorder.start();
    // Oppdater knappetilstand og UI ved opptaksstart
    startBtn.disabled = true;
    pauseResumeBtn.disabled = false;
    stopBtn.disabled = false;
    transcriptOutput.textContent = "...";
    recordingTimerEl.textContent = "Opptakstid: 0 sek";
    let recSeconds = 0;
    recordingInterval = setInterval(() => {
      if (!isPaused) {
        recSeconds++;
        recordingTimerEl.textContent = `Opptakstid: ${recSeconds} sek`;
      }
    }, 1000);
  });

  // Event: Pause/Gjenoppta opptak
  pauseResumeBtn.addEventListener('click', () => {
    if (!mediaRecorder) return;
    if (!isPaused) {
      mediaRecorder.pause();
      pauseResumeBtn.innerText = "Gjenoppta opptak";
    } else {
      mediaRecorder.resume();
      pauseResumeBtn.innerText = "Sett på pause";
    }
  });

  // Event: Stopp opptak (og start transkripsjon)
  stopBtn.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
  });

  // Eventuelle prompt-slot valg (deaktivert funksjonalitet, men beholder lytter)
  document.querySelectorAll('#prompt-slots span').forEach(span => {
    span.addEventListener('click', () => {
      const slot = parseInt(span.getAttribute('data-slot')) - 1;
      selectedPromptIndex = slot;
      document.querySelectorAll('#prompt-slots .active').forEach(el => el.classList.remove('active'));
      span.classList.add('active');
    });
  });

  // Event: Generér notat (P-SOAP) fra transkripsjon
  generateNoteBtn.addEventListener('click', () => {
    const transcriptText = transcriptOutput.textContent;
    if (!transcriptText || transcriptText.trim() === "" || transcriptText === "...") {
      alert("Ingen transkripsjon tilgjengelig for notatgenerering.");
      return;
    }
    // Bygg brukerprompt basert på valgt mal (P-SOAP) og transkribert tekst
    const prompt = buildPsoapPrompt(transcriptText);
    noteOutput.value = "...";
    adjustNoteHeight();
    generateNoteBtn.disabled = true;
    noteTimerEl.textContent = "Notatgenereringstid: 0 sek";
    let noteSeconds = 0;
    const noteInterval = setInterval(() => {
      noteSeconds++;
      noteTimerEl.textContent = `Notatgenereringstid: ${noteSeconds} sek`;
    }, 1000);

    // Kall OpenAI API (Chat Completion) for å generere notat
    fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "user", content: prompt }
        ]
      })
    })
    .then(response => response.json())
    .then(data => {
      clearInterval(noteInterval);
      generateNoteBtn.disabled = false;
      if (data.error) {
        noteOutput.value = `Feil: ${data.error.message || 'Kunne ikke generere notat.'}`;
        adjustNoteHeight();
        return;
      }
      let parsed;
      try {
        parsed = JSON.parse(data.choices[0].message.content);
      } catch (err) {
        console.error("JSON parse error:", err);
        noteOutput.value = "Feil: Kunne ikke tolke svar fra AI som JSON.";
        adjustNoteHeight();
        return;
      }
      // Bygg kort P/S/O/A/P-tekst
      const lines = [
        `P: ${parsed.Presentasjon || ""}`,
        `S: ${parsed.Subjektivt || ""}`,
        `O: ${parsed.Objektivt || ""}`,
        `A: ${parsed.Analyse || ""}`,
        `P: ${parsed.Plan || ""}`
      ];
      noteOutput.value = lines.join("\n\n");
      adjustNoteHeight();
      if (icpcSection) icpcSection.style.display = 'block';
    })
    .catch(err => {
      clearInterval(noteInterval);
      generateNoteBtn.disabled = false;
      noteOutput.value = "Feil under notatgenerering.";
      adjustNoteHeight();
      console.error("Note generation error:", err);
    });
  });

  // Event: Ferdig (lagre ICPC-2 koder i lokal database)
  icpcDoneBtn.addEventListener('click', () => {
    const checkboxes = icpcSuggestionsList.querySelectorAll('input[type=checkbox]:checked');
    const selectedCodes = Array.from(checkboxes).map(cb => cb.value);
    const doctorInputCodes = icpcInput.value.trim().toUpperCase().split(/\s+/).filter(code => /^[A-Z]\d{2}$/.test(code));
    const doctorInputSet = new Set(doctorInputCodes);
    let aiCodes = [];
    if (window.latestAiCodes && Array.isArray(window.latestAiCodes)) {
      aiCodes = window.latestAiCodes;
    } else {
      const allCheckboxCodes = Array.from(icpcSuggestionsList.querySelectorAll('input[type=checkbox]')).map(cb => cb.value);
      aiCodes = allCheckboxCodes.filter(code => !doctorInputSet.has(code));
    }
    const aiCodesSet = new Set(aiCodes);
    // Hvis ingen koder finnes i noen kategori, avbryt
    if (selectedCodes.length === 0 && doctorInputSet.size === 0 && aiCodesSet.size === 0) {
      alert("Ingen koder funnet.");
      icpcSection.style.display = 'none';
      icpcSuggestionsDiv.style.display = 'none';
      icpcSuggestionsList.innerHTML = "";
      icpcInput.value = "";
      return;
    }
    // Les inn lege-ID fra lokal fil (ID.txt)
    let doctorId = "UKJENT";
    try {
      const idData = fs ? fs.readFileSync('ID.txt', 'utf8') : null;
      if (idData) {
        doctorId = idData.toString().trim();
      }
    } catch (err) {
      console.warn("Kunne ikke lese ID.txt:", err);
    }
    // Koble til lokal SQLite database
    if (!sqlite3) {
      console.error("SQLite3-modul ikke funnet. Ingen data ble lagret.");
      alert("Kunne ikke koble til database (sqlite3-modul mangler).");
      return;
    }
    const db = new sqlite3.Database('icpc_codes.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
      if (err) {
        console.error("DB Connection error:", err);
        alert("Kunne ikke koble til lokal database.");
        return;
      }
      console.log("Koblet til SQLite database.");
      // Sørg for at tabellen eksisterer
      db.run(`CREATE TABLE IF NOT EXISTS icpc_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        doctor_id TEXT,
        timestamp TEXT,
        code TEXT,
        source TEXT
      )`, (err) => {
        if (err) {
          console.error("DB table creation error:", err);
        }
      });
      // Sett inn legens egne koder (lege_input)
      const doctorCodesArray = Array.from(doctorInputSet);
      const aiCodesArray = Array.from(aiCodesSet);
      const totalInserts = doctorCodesArray.length + aiCodesArray.length + selectedCodes.length;
      let completedInserts = 0;
      const finalizeInsertion = () => {
        completedInserts++;
        if (completedInserts === totalInserts) {
          db.close((err) => {
            if (err) {
              console.error("Feil ved lukking av database:", err);
            } else {
              console.log("Databaseforbindelse lukket.");
            }
            alert("Valgte koder er lagret.");
            // icpcSection.style.display = 'none';
            // icpcSuggestionsDiv.style.display = 'none';
            icpcSuggestionsList.innerHTML = "";
            icpcInput.value = "";
          });
        }
      };
      doctorCodesArray.forEach(code => {
        db.run('INSERT INTO icpc_codes (doctor_id, timestamp, code, source) VALUES (?, datetime("now"), ?, ?)', [doctorId, code, 'lege_input'], (err) => {
          if (err) {
            console.error(`DB insert error (lege_input) for code ${code}:`, err);
          }
          finalizeInsertion();
        });
      });
      // Sett inn AI-forslåtte koder (auto_forslag)
      aiCodesArray.forEach(code => {
        db.run('INSERT INTO icpc_codes (doctor_id, timestamp, code, source) VALUES (?, datetime("now"), ?, ?)', [doctorId, code, 'auto_forslag'], (err) => {
          if (err) {
            console.error(`DB insert error (auto_forslag) for code ${code}:`, err);
          }
          finalizeInsertion();
        });
      });
      // Sett inn valgte koder (lege_valgt)
      selectedCodes.forEach(code => {
        db.run('INSERT INTO icpc_codes (doctor_id, timestamp, code, source) VALUES (?, datetime("now"), ?, ?)', [doctorId, code, 'lege_valgt'], (err) => {
          if (err) {
            console.error(`DB insert error (lege_valgt) for code ${code}:`, err);
          }
          finalizeInsertion();
        });
      });
    });
  });
}

// Hent beskrivelse for én kode ved å søke på koden selv
async function fetchDescription(code) {
  const matches = await searchLocalCodes(code);
  // Finn eksakt match på code (case-insensitivt)
  const exact = matches.find(m => m.code.toUpperCase() === code.toUpperCase());
  return exact
    ? exact.term
    : "(Ingen beskrivelse funnet)";
}

// Funksjon for å finne ICPC-2 koder i lokalt register basert på nøkkelord
function findCodesInRegistry(keywords) {
  if (!window.codeDescriptions) {
    console.error("ICPC-2 koderegister er ikke lastet.");
    return [];
  }
  const matchedCodes = [];
  const lowerKeywords = keywords.map(kw => kw.toLowerCase());
  for (const [code, description] of Object.entries(window.codeDescriptions)) {
    const descLower = description.toLowerCase();
    for (const kw of lowerKeywords) {
      if (kw && descLower.includes(kw)) {
        matchedCodes.push(code);
        break;
      }
    }
  }
  return matchedCodes;
}

// Async funksjon: håndterer ferdig opptak (kaller OpenAI Whisper for transkripsjon)
async function handleRecordingStop() {
  clearInterval(recordingInterval);
  const pauseResumeBtn = document.getElementById('pauseResumeBtn');
  const stopBtn = document.getElementById('stopBtn');
  const startBtn = document.getElementById('startBtn');
  const transcriptOutput = document.getElementById('transcriptOutput');
  const completionTimerEl = document.getElementById('completionTimer');
  // Tilbakestill knappetilstand ved opptaksslutt
  if (pauseResumeBtn && stopBtn && startBtn) {
    pauseResumeBtn.disabled = true;
    stopBtn.disabled = true;
    startBtn.disabled = false;
    pauseResumeBtn.innerText = "Sett på pause";
  }
  // Send lydblob til OpenAI Whisper API for transkripsjon
  const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
  completionTimerEl.textContent = "Transkripsjonstid: 0 sek";
  let compSeconds = 0;
  const compInterval = setInterval(() => {
    compSeconds++;
    completionTimerEl.textContent = `Transkripsjonstid: ${compSeconds} sek`;
  }, 1000);
  try {
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');
    formData.append('model', 'whisper-1');
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}` },
      body: formData
    });
    const result = await response.json();
    clearInterval(compInterval);
    if (result.error) {
      transcriptOutput.textContent = `Feil: ${result.error.message || 'Transkripsjon mislyktes.'}`;
    } else {
      const text = result.text || "";
      transcriptOutput.textContent = text.trim();
      // Aktiver "Generér notat"-knappen når transkripsjon er ferdig
      const generateNoteBtn = document.getElementById('generateNoteBtn');
      if (generateNoteBtn) generateNoteBtn.disabled = false;
    }
  } catch (err) {
    clearInterval(compInterval);
    transcriptOutput.textContent = "Feil under transkripsjon av lyd.";
    console.error("Transcription error:", err);
  }
}
