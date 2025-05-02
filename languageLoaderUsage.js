// languageLoaderUsage.js
const translations = {
    en: {
      // Forside (index.html) texts
      headerTitle: "Smartkode",  // Updated app name
      headerSubtitle: "Advanced AI-Powered Speech-to-Text, Note Generation and ICPC-2 Coding for Healthcare Consultations",
      startText: "To get started, please enter your OpenAI API key:",
      enterButton: "Enter Transcription Tool",
      adMessage: "This tool is free to use and relies on ad revenue. Please consent to personalized ads to support the service.",
      apiGuideHeader: "API Guide",
      priceInfoHeader: "Price Information",
      securityInfoHeader: "Security Information",
      aboutHeader: "About",
      apiGuideContent: `<h2>API Guide</h2>
          <ol>
            <li>Obtain an OpenAI API key from your OpenAI account. Ensure you have a billing plan or sufficient credit.</li>
            <li>Enter the API key in the field above and click "Enter Transcription Tool".</li>
            <li>The tool will use your key to transcribe audio (Whisper API) and generate notes (GPT). All usage is billed to your OpenAI account.</li>
          </ol>`,
      priceInfoContent: `<h2>Price Information</h2>
          <p>Transcription uses OpenAI Whisper API (~$0.006 per minute of audio). Note generation uses GPT (e.g., GPT-3.5-Turbo at ~$0.002 per 1k tokens). Each note typically costs just a few cents.</p>`,
      securityInfoContent: `<h2>Security Information</h2>
          <p>Your audio is recorded locally and sent securely to OpenAI's API for transcription. No audio or text is stored on any server (the application has no backend). Your API key is stored only in your browser session. For sensitive data, ensure you trust the OpenAI API and handle the generated notes according to privacy regulations.</p>`,
      aboutContent: `<h2>About</h2>
          <p><em>Smartkode</em> was developed as a free tool for clinicians and others who need quick, secure speech-to-text with note generation and coding. All AI processing is done via OpenAI services on your machine.</p>`,
  
      // Transcription page (transcribe.html) texts
      backToFrontpage: "Back to frontpage",
      guideLinkText: "Read first! ➔ Guide",
      recordingAreaTitle: "Recording Area",
      recordingTimerLabel: "Recording Timer:",
      completionTimerLabel: "Completion Timer:",
      startRecording: "Start Recording",
      pauseRecording: "Pause Recording",
      resumeRecording: "Resume Recording",
      stopRecording: "Stop & Complete",
      welcomeMessage: `Welcome! Click "Start Recording" to begin.`,
      noteGenerationTitle: "Note Generation",
      generateNote: "Generate Note",
      noteTimerLabel: "Note Generation Timer:",
      customPromptTitle: "Custom Prompt",        // Not visible (feature removed)
      promptSlotLabel: "Prompt Slot:",           // Not visible
      guideOverlayContent: `<h2>Guide &amp; Instructions</h2>
          <ol>
            <li><strong>Start recording:</strong> Allow microphone access, then click "Start Recording" to capture audio. You can pause/resume if needed.</li>
            <li><strong>Transcription:</strong> Click "Stop &amp; Complete" to send the audio to OpenAI Whisper and transcribe it. The transcribed text will appear on screen.</li>
            <li><strong>Note generation:</strong> Optionally, select a prompt style (if any) and then click "Generate Note" to have GPT summarize the transcript into a structured clinical note.</li>
            <li><strong>Edit note:</strong> The generated note will be displayed below. You can edit it manually if needed before finalizing.</li>
            <li><strong>Coding:</strong> After the note is ready, enter any relevant ICPC-2 codes (if you have some in mind) and click "Next". The system will suggest additional codes based on the note. Select one or more codes (from those you entered and/or the suggestions) and click "Done" to save them.</li>
          </ol>
          <p><strong>Note:</strong> Audio is processed via OpenAI (cost ~$0.006/min), and notes via GPT (minor token cost). Selected ICPC-2 codes are stored locally in your database. No other data is stored externally; everything runs on your computer.</p>`
    },
  
    no: {
      headerTitle: "Smartkode",
      headerSubtitle: "Avansert KI-drevet tale-til-tekst, notatgenerering og ICPC-2 koding for helsekonsultasjoner",
      startText: "For å komme i gang, oppgi din OpenAI API-nøkkel:",
      enterButton: "Gå til transkripsjonsverktøy",
      adMessage: "Dette verktøyet er gratis i bruk og finansieres kun av annonseinntekter. Vennligst samtykk til personlige annonser for å støtte tjenesten.",
      apiGuideHeader: "API-veiledning",
      priceInfoHeader: "Prisinformasjon",
      securityInfoHeader: "Sikkerhetsinformasjon",
      aboutHeader: "Om",
      apiGuideContent: `<h2>API-veiledning</h2>
          <ol>
            <li>Skaff en OpenAI API-nøkkel fra din OpenAI-konto og forsikre deg om at betaling er konfigurert eller at du har nok kreditt.</li>
            <li>Skriv inn API-nøkkelen i feltet ovenfor og klikk "Gå til transkripsjonsverktøy".</li>
            <li>Verktøyet bruker nøkkelen din til å transkribere lyd (Whisper API) og generere notater (GPT). All bruk belastes din OpenAI-konto.</li>
          </ol>`,
      priceInfoContent: `<h2>Prisinformasjon</h2>
          <p>Transkripsjon bruker OpenAIs Whisper API (ca. $0,006 per minutt lyd). Notatgenerering bruker GPT (f.eks. GPT-3.5-Turbo ca. $0,002 per 1000 tokens). Hvert notat koster vanligvis kun noen få øre.</p>`,
      securityInfoContent: `<h2>Sikkerhetsinformasjon</h2>
          <p>Lydopptaket gjøres lokalt og sendes kryptert til OpenAIs API for transkripsjon. Ingen lyd eller tekst lagres på noen ekstern server. API-nøkkelen din lagres kun i nettleserens sesjon. For sensitiv informasjon: stol bare på OpenAI hvis det er i tråd med personvernkrav, og behandle genererte notater konfidensielt.</p>`,
      aboutContent: `<h2>Om verktøyet</h2>
          <p><em>Smartkode</em> er utviklet som et gratis verktøy for klinikere og andre som trenger rask og sikker tale-til-tekst med notatskaping og koding. All KI-behandling skjer via OpenAIs tjenester på din maskin.</p>`,
  
      backToFrontpage: "Tilbake til forsiden",
      guideLinkText: "Les først ➔ Guide",
      recordingAreaTitle: "Opptaksområde",
      recordingTimerLabel: "Opptakstid:",
      completionTimerLabel: "Transkripsjonstid:",
      startRecording: "Start opptak",
      pauseRecording: "Sett på pause",
      resumeRecording: "Gjenoppta opptak",
      stopRecording: "Stopp og transkribér",
      welcomeMessage: `Velkommen! Klikk "Start opptak" for å begynne.`,
      noteGenerationTitle: "Notatgenerering",
      generateNote: "Generér notat",
      noteTimerLabel: "Notatgenereringstid:",
      customPromptTitle: "Egendefinert prompt",    // Ikke synlig
      promptSlotLabel: "Promptvalg:",             // Ikke synlig
      guideOverlayContent: `<h2>Guide &amp; Instruksjoner</h2>
          <ol>
            <li><strong>Start opptak:</strong> Tillat mikrofontilgang og klikk "Start opptak" for å ta opp lyd. Du kan sette på pause underveis.</li>
            <li><strong>Transkripsjon:</strong> Klikk "Stopp og transkribér" for å sende lyden til OpenAI Whisper og få teksten frem. Den transkriberte teksten vises på skjermen.</li>
            <li><strong>Notatgenerering:</strong> Om ønskelig kan du velge en bestemt stil for notatet, og deretter klikke "Generér notat" for å la GPT oppsummere transkripsjonen i et strukturert P-SOAP-notat.</li>
            <li><strong>Rediger notat:</strong> Det genererte notatet vises nederst. Du kan redigere det manuelt ved behov før du går videre.</li>
            <li><strong>Koding:</strong> Etter at notatet er klart, kan du skrive inn relevante ICPC-2 koder og klikke "Neste". Verktøyet foreslår da automatisk koder basert på notatet. Velg én eller flere koder (blant de du skrev og/eller de foreslåtte) og klikk "Ferdig" for å lagre dem.</li>
          </ol>
          <p><strong>Merk:</strong> Lyd behandles via OpenAI (kostnad ca. $0,006/min), og notater via GPT (liten token-kostnad). Valgte ICPC-2 koder lagres lokalt i din database. Ingen øvrige data lagres utenfor din maskin; alt kjører lokalt.</p>`
    }
  };
  
  // Hjelpefunksjon for å sette tekst hvis element finnes
  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
  }
  
  // Initialiser språk for forsiden (index.html)
  export function initIndexLanguage() {
    const select = document.getElementById('lang-select');
    if (!select) return;
    // Tving norsk som start-språk
    const savedLang = localStorage.getItem('selectedLanguage');
    const defaultLang = 'no';  // Alltid norsk som standard (ignorer lagret verdi)
    select.value = defaultLang;
    applyTranslations(defaultLang);
    // (Språkvalg er skjult, så hendelse for change er unødvendig, men beholdes hvis utvidelse trengs)
    select.addEventListener('change', () => {
      const lang = select.value;
      localStorage.setItem('selectedLanguage', lang);
      applyTranslations(lang);
    });
  }
  
  // Initialiser språk for transkripsjonssiden (transcribe.html)
  export function initTranscribeLanguage() {
    const select = document.getElementById('lang-select');
    if (!select) return;
    const savedLang = localStorage.getItem('selectedLanguage');
    const defaultLang = 'no';  // Bruk norsk som standard uansett
    select.value = defaultLang;
    applyTranslations(defaultLang);
    select.addEventListener('change', () => {
      const lang = select.value;
      localStorage.setItem('selectedLanguage', lang);
      applyTranslations(lang);
    });
  }
  
  // Funksjon for å anvende oversettelser til alle UI-elementer
  function applyTranslations(langCode) {
    const lang = translations[langCode] || translations['no'];
    // Forside-elementer
    setText('header-title', lang.headerTitle);
    setText('header-subtitle', lang.headerSubtitle);
    setText('start-text', lang.startText);
    setText('enterTranscriptionBtn', lang.enterButton);
    setText('ad-revenue-message', lang.adMessage);
    setText('apiGuideHeader', lang.apiGuideHeader);
    setText('priceInfoHeader', lang.priceInfoHeader);
    setText('securityInfoHeader', lang.securityInfoHeader);
    setText('aboutHeader', lang.aboutHeader);
    // Fyll skjulte seksjoner med HTML-innhold
    ['apiGuideContent','priceInfoContent','securityInfoContent','aboutContent'].forEach(secId => {
      const hiddenDiv = document.getElementById(secId);
      if (hiddenDiv && lang[secId]) {
        hiddenDiv.innerHTML = lang[secId];
      }
    });
    // Transkripsjonsside-elementer
    setText('back-link', lang.backToFrontpage);
    setText('guide-link', lang.guideLinkText);
    setText('recordingAreaTitle', lang.recordingAreaTitle);
    setText('recordingTimer', `${lang.recordingTimerLabel} 0 sec`);   // sek/sekund er allerede med i label
    setText('completionTimer', `${lang.completionTimerLabel} 0 sec`);
    setText('startBtn', lang.startRecording);
    const pauseBtn = document.getElementById('pauseResumeBtn');
    if (pauseBtn) pauseBtn.innerText = lang.pauseRecording;
    setText('stopBtn', lang.stopRecording);
    setText('transcriptOutput', lang.welcomeMessage);
    setText('noteGenerationTitle', lang.noteGenerationTitle);
    setText('generateNoteBtn', lang.generateNote);
    setText('noteTimer', `${lang.noteTimerLabel} 0 sec`);
    setText('customPromptTitle', lang.customPromptTitle);
    // Oppdater prompt-slot label tekst hvis den finnes (ikke synlig i UI nå)
    const promptInstr = document.getElementById('promptInstruction');
    if (promptInstr) {
      promptInstr.firstChild.textContent = `${lang.promptSlotLabel} `;
    }
    // Guide-innhold i overlay
    const guideContentDiv = document.getElementById('guideOverlayContent');
    if (guideContentDiv && lang.guideOverlayContent) {
      guideContentDiv.innerHTML = lang.guideOverlayContent;
    }
  }
  