// main-transcribe.js – Oppdatert versjon med lokal SQLite database (erstatter MySQL)
console.log('🔧 main-transcribe.js starter');

import { initTranscribeLanguage } from './languageLoaderUsage.js';
import { initGuideOverlay } from './ui.js';

// Node.js-moduler for filsystem og database (gjennom Electron)
const fs = window.require ? window.require('fs') : undefined;
const sqlite3 = window.require ? window.require('sqlite3') : undefined;

// Tilstand for lydopptak og valgt prompt
let mediaRecorder;
let audioChunks = [];
let recordingInterval;
let isPaused = false;
let selectedPromptIndex = 0;

// Prompt-mal for notat (P-SOAP)
const promptTemplates = [
  `Du er en medisinsk sekretær med spesialisering i journalføring for pasientjournaler. Din oppgave er å omskrive følgende transkriberte samtale mellom lege og pasient til et strukturert, profesjonelt journalnotat etter P-SOAP-modellen.

P-SOAP står for:
- **P (Presentasjon):** Kort oppsummering av henvendelsesårsak og relevant medisinsk bakgrunn.
- **S (Subjektivt):** Pasientens beskrivelser av symptomer, sykdomsforløp, funksjon og opplevelser.
- **O (Objektivt):** Kliniske funn fra undersøkelse, laboratorieprøver, bildediagnostikk, målte parametre.
- **A (Analyse/Vurdering):** Legens vurdering av situasjonen, differensialdiagnoser, tentativ eller bekreftet diagnose.
- **P (Plan):** Videre tiltak, behandlingsopplegg, undersøkelser eller oppfølging.

**Viktige krav til skrivestil:**
- Bruk klart, medisinsk presist og konsist språk som er egnet for dokumentasjon i pasientjournal.
- Unngå direkte tale, fyllord og uformelle uttrykk.
- Bruk faglig korrekt terminologi.
- Strukturer alltid notatet strengt i P-SOAP-rekkefølge.
- Medikamentnavn, sykdomsnavn og medisinske uttrykk skal sjekkes for korrekt skrivemåte og oppdatert informasjon i følgende kilder:
  - https://sml.snl.no
  - https://www.felleskatalogen.no/medisin
  - https://bestpractice.bmj.com/
  - https://fhi.no
  - https://legehandboka.no
  - https://helsedirektoratet.no/retningslinjer
  - https://www.brukerhandboken.no/
- Dersom du er usikker på et faguttrykk eller en behandlingsanbefaling, skal du konsultere en av ovennevnte kilder før du fullfører journalnotatet.

**Spesialinstruksjoner:**
- Identifiser og korriger eventuelle feiltolkninger eller feilaktig medisinsk bruk av ord i transkripsjonen.
- Dersom samtalen inneholder flere samtidige problemstillinger, lag en egen P-SOAP-struktur for hver problemstilling.

Samtale:
  `
];

// Les OpenAI API-nøkkel fra fil (API.txt)
let apiKey = "";
try {
  const keyData = fs ? fs.readFileSync('API.txt', 'utf8') : null;
  if (keyData) {
    apiKey = keyData.toString().trim();
  }
} catch (err) {
  console.warn("Kunne ikke lese API.txt:", err);
}
if (!apiKey) {
  alert("API-nøkkel mangler. Sørg for at filen API.txt eksisterer og inneholder nøkkelen.");
  window.location.href = "index.html";
}

// Initialiser app når DOM er ferdig lastet
window.addEventListener('DOMContentLoaded', () => {
  console.log('✅ DOM ferdig lastet');
  initTranscribeLanguage();
  initGuideOverlay();
  setupEventListeners();
});

function setupEventListeners() {
  console.log('🔗 Binder knappehendelser');
  // Hent referanser til alle relevante DOM-elementer
  const startBtn = document.getElementById('startBtn');
  const pauseResumeBtn = document.getElementById('pauseResumeBtn');
  const stopBtn = document.getElementById('stopBtn');
  const generateNoteBtn = document.getElementById('generateNoteBtn');
  const transcriptOutput = document.getElementById('transcriptOutput');

  const noteOutput = document.getElementById('noteOutput');
  // Funksjon for å justere høyden på notat-tekstområdet
  function adjustNoteHeight() {
    noteOutput.style.height = 'auto';
    noteOutput.style.height = Math.max(noteOutput.scrollHeight, 100) + 'px';
  }
  // Auto-tilpass tekstområde ved brukerinput
  noteOutput.addEventListener('input', adjustNoteHeight);

  const recordingTimerEl = document.getElementById('recordingTimer');
  const completionTimerEl = document.getElementById('completionTimer');
  const noteTimerEl = document.getElementById('noteTimer');
  const icpcSection = document.getElementById('icpc-section');
  const icpcInput = document.getElementById('icpcInput');
  const icpcNextBtn = document.getElementById('icpcNextBtn');
  const icpcSuggestionsDiv = document.getElementById('icpcSuggestions');
  const icpcSuggestionsList = document.getElementById('icpcSuggestionsList');
  const icpcDoneBtn = document.getElementById('icpcDoneBtn');

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
    const prompt = `${promptTemplates[selectedPromptIndex]}${transcriptText}`;
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
      } else {
        const noteText = data.choices?.[0]?.message?.content || "";
        noteOutput.value = noteText.trim();
        adjustNoteHeight();
        // Vis ICPC-2 kodingsseksjonen når notatet er klart
        if (icpcSection) {
          icpcSection.style.display = 'block';
        }
      }
    })
    .catch(err => {
      clearInterval(noteInterval);
      generateNoteBtn.disabled = false;
      noteOutput.value = "Feil under notatgenerering.";
      adjustNoteHeight();
      console.error("Note generation error:", err);
    });
  });

  // Event: Neste (hent forslag til ICPC-2 koder)
  icpcNextBtn.addEventListener('click', () => {
    const noteText = noteOutput.value || "";
    if (!noteText.trim()) {
      alert("Notatet er tomt eller ikke generert ennå.");
      return;
    }
    // Hent koder som legen selv har skrevet inn
    const doctorInputCodes = icpcInput.value.trim().toUpperCase().split(/\s+/).filter(code => /^[A-Z]\d{2}$/.test(code));
    // Forbered OpenAI-prompt for nøkkelorduttrekk fra notatet
    const keywordPrompt = `Du er en medisinsk ekspert som skal analysere et pasientjournalnotat skrevet i P-SOAP-format (Presentasjon, Subjektivt, Objektivt, Analyse, Plan).

Oppgaven din:
- Identifiser de viktigste medisinske nøkkelordene i notatet (for eksempel symptomer, kliniske funn, tentativ diagnose).
- Foreta en vurdering basert på klinisk skjønn om hva som er hovedårsak(ene) til kontakten og ranger de etter hver andre.
- Begrens listen til de 1-10 viktigste nøkkelord.
- Svar kun med en kommaseparert liste over disse nøkkelordene, og ingen annen tekst.

Notat:
"${noteText}"`;
    // Vis indikasjon på at forslag hentes
    icpcSuggestionsList.innerHTML = "<em>Henter forslag...</em>";
    icpcSuggestionsDiv.style.display = 'block';

    // Kall OpenAI API for nøkkelord (Chat Completion)
    fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "user", content: keywordPrompt }
        ]
      })
    })
    .then(response => response.json())
    .then(data => {
      // Fjern tidligere forslag fra listen
      icpcSuggestionsList.innerHTML = "";
      if (data.error) {
        icpcSuggestionsList.textContent = `Feil ved henting av forslag: ${data.error.message || ''}`;
        return;
      }
      const suggestionText = data.choices?.[0]?.message?.content || "";
      // Ekstraher nøkkelord fra GPT-svaret (kommaseparert liste til array)
      const rawKeywords = suggestionText.replace(/(\r\n|\r)/g, '\n').split(/[,\n]+/);
      const keywords = rawKeywords.map(k => k.replace(/^[\s\-\d\.]+/, '').trim()).filter(k => k);
      // Last inn ICPC-2 koderegister (Excel) hvis det ikke allerede er lastet
      if (!window.codeDescriptions) {
        try {
          const xlsx = window.require ? window.require('xlsx') : undefined;
          if (!xlsx) throw new Error("xlsx library not found");
          const workbook = xlsx.readFile('Fil 1 2025 - ICPC-2 koderegister med utvidet termsett (flere linjer per kode).xlsx');
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });
          window.codeDescriptions = {};
          rows.forEach(row => {
            const kode = row["Kode"] || row["Kode "];      // håndter eventuell UTF-8 mellomrom i nøkkel
            const tekst = row["Kodetekst "] || row["Kodetekst"] || row["Term"] || row["Termtekst"] || row["Beskrivelse"];
            if (kode && tekst && !window.codeDescriptions[kode] && kode !== "Kode") {
              window.codeDescriptions[kode] = tekst.trim();
            }
          });
        } catch (err) {
          console.error("Kunne ikke lese koderegisteret:", err);
          alert("Kunne ikke lese ICPC-2 koderegister (Excel). Forslag vises uten beskrivelser.");
          window.codeDescriptions = {};
        }
      }
      const matchedCodes = findCodesInRegistry(keywords);
      // Lagre koder for senere bruk
      window.latestAiCodes = matchedCodes;
      window.latestDoctorInputCodes = doctorInputCodes;
      // Kombiner legens egne koder med treff fra registeret, fjern duplikater
      const allCodesSet = new Set([...doctorInputCodes, ...matchedCodes]);
      // Bygg liste med avkryssingsbokser for hver unik kode
      allCodesSet.forEach(code => {
        if (!code) return;
        const desc = window.codeDescriptions[code] || "(Ingen beskrivelse)";
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = code;
        if (doctorInputCodes.includes(code)) {
          // Forhåndsvelg koder som legen skrev inn selv
          checkbox.checked = true;
        }
        const label = document.createElement('label');
        label.style.display = 'block';
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(` ${code} – ${desc}`));
        icpcSuggestionsList.appendChild(label);
      });
      // Sørg for at forslag-seksjonen (med "Ferdig"-knapp) vises
      icpcSuggestionsDiv.style.display = 'block';
    })
    .catch(err => {
      console.error("Feil ved henting av kodeforslag:", err);
      icpcSuggestionsList.textContent = "En feil oppstod under henting av kodeforslag.";
      icpcSuggestionsDiv.style.display = 'block';
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
            icpcSection.style.display = 'none';
            icpcSuggestionsDiv.style.display = 'none';
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
