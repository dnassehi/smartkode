# Smartkode

**Smartkode** er en lokal Electron-app som kombinerer tale-til-tekst, strukturert notatgenerering (P-SOAP) og ICPC-2-koding for kliniske konsultasjoner. Den er laget for klinikere som ønsker en rask, sikker og presis måte å dokumentere konsultasjoner på — alt lokalt på din egen maskin.

## 🚀 Funksjonalitet

- 🎤 **Taleopptak og transkripsjon** med OpenAI Whisper (via API)
- 📝 **Notatgenerering** i strukturert P-SOAP-format via GPT (GPT-4o mini)
- 🧠 **Forslag til ICPC-2 koder** basert på journalinnhold (AI-generert)
- 🗂️ **Lokal SQLite-database** for lagring av valgte og foreslåtte koder
- 🔐 **Helt lokal kjøring** – ingen backend, ingen datalagring på eksterne servere

## 🛠️ Teknologi og avhengigheter

- [Electron](https://www.electronjs.org/)
- [OpenAI Whisper API](https://platform.openai.com/docs/guides/speech-to-text)
- [OpenAI GPT API](https://platform.openai.com/docs/guides/gpt)
- [SQLite3](https://www.sqlite.org/)
- [xlsx](https://www.npmjs.com/package/xlsx)

## 📦 Installasjon

1. **Klon repoet**:

   ```bash
   git clone https://github.com/ditt-brukernavn/smartkode.git
   cd smartkode

2. **Installer avhengigheter**:

   ```bash
   npm install
   ```

3. **Legg til nødvendige filer**:

   * `API.txt` – inneholder din personlige OpenAI API-nøkkel (kun én linje).
   * `Fil 1 2025 - ICPC-2 koderegister med utvidet termsett (flere linjer per kode).xlsx` – ICPC-2 koderegister.
   * *(Valgfritt)* `ID.txt` – inneholder lege-ID for å logge kodevalg.

4. **Kjør appen**:

   ```bash
   npm start
   ```

## 🖥️ Bruk

1. Klikk på **"Start opptak"** for å begynne innspilling.
2. Klikk **"Stopp og transkribér"** når opptaket er ferdig.
3. Klikk **"Generér notat"** for å opprette et strukturert P-SOAP-notat.
4. Skriv inn relevante ICPC-2-koder manuelt, eller la AI foreslå koder.
5. Klikk **"Ferdig"** for å lagre valgte koder i lokal database.

## 📁 Filstruktur

* `electron-main.js`: Starter appen og laster direkte `transcribe.html`.
* `transcribe.html`: Brukergrensesnittet (kun transkripsjonssiden).
* `main-transcribe.js`: All logikk for opptak, transkripsjon, notatgenerering og koding. [i egen \js mappe]
* `languageLoaderUsage.js`: Støtte for norsk/engelsk språk og hjelpetekst. [i egen \js mappe]
* `ui.js`: Håndtering av guide-overlay. [i egen \js mappe]
* `API.txt`: Inneholder OpenAI API-nøkkel (leses lokalt).
* `package.json`: Avhengigheter og pakkerutiner for Windows.

## 🧠 P-SOAP Notatstruktur

Appen genererer notater etter følgende rekkefølge:

* **P** – Presentasjon
* **S** – Subjektivt
* **O** – Objektivt
* **A** – Analyse/Vurdering
* **P** – Plan

Prompten inneholder krav til presis språkbruk, bruk av kilder som Felleskatalogen og Legehandboka, og er spesielt tilpasset klinisk dokumentasjon.

## 🔒 Personvern

* Lyd behandles lokalt og sendes kun til OpenAI via kryptert API-kall.
* Ingen data lagres på servere.
* ICPC-2 koder lagres kun i en lokal SQLite-database.
* API-nøkkelen lagres aldri permanent.

## 🧪 Testing og pakking

For å pakke appen for Windows:

```bash
npm run package-win
```

## 📄 Lisens

Creative commons.

---

> Utviklet med fokus på sikkerhet, fart og brukervennlighet for travle klinikere.