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
- [String-similarity](https://npm.io/package/string-similarity)
- [Helsedirektoatets Front API for Terminologi API](https://fat.kote.helsedirektoratet.no/index.html)

## 📦 Installasjon

1. **Klon repoet**:

   ```bash
   git clone https://github.com/dnassehi/smartkode.git
   cd smartkode

2. **Installer avhengigheter**:

   ```bash
   npm install
   ```

3. **Nødvendige filer**:

   * `API.txt` – lim inn din personlige OpenAI API-nøkkel (kun én linje).
   * `ID.txt` – inneholder lege-ID for å logge kodevalg.

4. **Kjør appen**:

   ```bash
   npm start
   ```

## 🖥️ Bruk

1. Klikk på **"Start opptak"** for å begynne innspilling.
2. Klikk **"Stopp og transkribér"** når opptaket er ferdig.
3. Klikk **"Generér notat"** for å opprette et strukturert P-SOAP-notat.
4. Input relevante ICPC-2-koder manuelt (et bokstav og to siffer, f.eks. N01). Bruk mellomrom mellom kodene. 
5. La AI foreslå ICPC-2 koder.
6. Velg/avvelg ICPC-2 koder (eget input og KI-forslag).
6. Klikk **"Ferdig"** for å lagre valgte koder i lokal database (icpc_codes.db opprettes automatisk).

## 📁 Filstruktur

* `electron-main.js`: Starter appen og laster direkte `transcribe.html`.
* `transcribe.html`: Brukergrensesnittet (kun transkripsjonssiden).
* `main-transcribe.js`: All logikk for opptak, transkripsjon, notatgenerering og koding.
* `languageLoaderUsage.js`: Støtte for norsk/engelsk språk og hjelpetekst.
* `ui.js`: Håndtering av guide-overlay.
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

MIT lisens.

---

> Utviklet med tanke på forskning.
