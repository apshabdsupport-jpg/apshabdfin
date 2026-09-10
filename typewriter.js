/* ===== APSHABD — TYPEWRITER LOCATION PROMPT ===== */
;(function () {
  'use strict';

  /* ── Configuration ── */
  // Default cycles every script the brand ships in. City pages
  // override this via data-words, because each one only loads its
  // own Noto font — listing a script the page hasn't loaded renders
  // as tofu boxes on systems without a system fallback for it.
  const DEFAULT_WORDS = ['location', 'இடம்', 'जगह', 'ಸ್ಥಳ', 'স্থান', 'స్థలం'];
  const TYPE_SPEED   = 100;   // ms per character typing
  const ERASE_SPEED  = 60;    // ms per character erasing
  const PAUSE_AFTER  = 1500;  // ms pause after full word is typed
  const PAUSE_BEFORE = 400;   // ms pause before typing next word

  /* ── Find the container ── */
  const section = document.querySelector('.typewriter-section');
  if (!section) return;

  const wordEl  = section.querySelector('.tw-word');
  if (!wordEl) return;
  // The wrapper carries the language too, so the per-script optical size in
  // CSS applies to the cursor as well as the word. :lang() inherits, so the
  // per-script font-family rules on .tw-word still match.
  const wrapEl = wordEl.closest('.tw-word-wrap') || wordEl;

  const attr  = (section.getAttribute('data-words') || '').trim();
  const WORDS = attr
    ? attr.split('|').map(s => s.trim()).filter(Boolean)
    : DEFAULT_WORDS;
  if (!WORDS.length) return;
  const LANGUAGE_CODES = ['en', 'ta', 'hi', 'kn', 'bn', 'te'];
  const languageForWord = (word) => {
    if (/[\u0B80-\u0BFF]/u.test(word)) return 'ta';
    if (/[\u0900-\u097F]/u.test(word)) return 'hi';
    if (/[\u0C80-\u0CFF]/u.test(word)) return 'kn';
    if (/[\u0980-\u09FF]/u.test(word)) return 'bn';
    if (/[\u0C00-\u0C7F]/u.test(word)) return 'te';
    return LANGUAGE_CODES[wordIndex] || 'en';
  };

  let wordIndex = 0;
  let charIndex = 0;
  let isErasing = false;

  /* ── Type / Erase loop ── */
  function tick() {
    const currentWord = WORDS[wordIndex];
    const lang = languageForWord(currentWord);
    wordEl.lang = lang;
    wrapEl.lang = lang;

    if (!isErasing) {
      // Typing forward. Index by code point so Indic scripts don't
      // get sliced mid-character.
      charIndex++;
      wordEl.textContent = [...currentWord].slice(0, charIndex).join('');

      if (charIndex >= [...currentWord].length) {
        // Finished typing — pause, then start erasing
        setTimeout(() => {
          isErasing = true;
          charIndex = [...currentWord].length;
          tick();
        }, PAUSE_AFTER);
        return;
      }

      setTimeout(tick, TYPE_SPEED);
    } else {
      // Erasing backward
      charIndex--;
      wordEl.textContent = [...currentWord].slice(0, charIndex).join('');

      if (charIndex <= 0) {
        // Finished erasing — move to next word
        isErasing = false;
        charIndex = 0;
        wordIndex = (wordIndex + 1) % WORDS.length;
        setTimeout(tick, PAUSE_BEFORE);
        return;
      }

      setTimeout(tick, ERASE_SPEED);
    }
  }

  /* ── Reveal on scroll ── */
  section.classList.add('tw-hidden');

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          section.classList.remove('tw-hidden');
          section.classList.add('tw-visible');
          revealObserver.unobserve(entry.target);
          // Start typing after reveal animation
          setTimeout(tick, 600);
        }
      });
    },
    { threshold: 0.2 }
  );

  revealObserver.observe(section);
})();
