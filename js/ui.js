function initInfoModals() {}
function initGuideOverlay() {
  const guideLink = document.getElementById('guide-link');
  const guideOverlay = document.getElementById('guideOverlay');
  const closeBtn = document.getElementById('closeGuideBtn');
  if (guideLink && guideOverlay && closeBtn) {
    guideLink.addEventListener('click', () => guideOverlay.style.display = 'block');
    closeBtn.addEventListener('click', () => guideOverlay.style.display = 'none');
  }
}

// Eksporter alle
module.exports = {
  initInfoModals,
  initGuideOverlay,
  // … andre funksjoner …
};