/* ===== PIN DROP SILENCE — CINEMATIC INTRO JS ===== */

(function () {
  'use strict';

  const INTRO_DURATION = 6200; // seven cities + final logo
  const FADE_MS = 800;         // must match introFadeOut in intro.css

  // ── Build the intro DOM ──────────────────────────────────────
  function buildIntro() {
    const overlay = document.createElement('div');
    overlay.className = 'intro-overlay';
    overlay.id = 'introOverlay';

    overlay.innerHTML = `
      <!-- Film grain -->
      <div class="intro-grain" aria-hidden="true"></div>
      <!-- Vignette -->
      <div class="intro-vignette" aria-hidden="true"></div>
      <!-- Scanlines -->
      <div class="intro-scanlines" aria-hidden="true"></div>

      <!-- Camera flashes -->
      <div class="intro-flash flash-1" aria-hidden="true"></div>
      <div class="intro-flash flash-2" aria-hidden="true"></div>
      <div class="intro-flash flash-3" aria-hidden="true"></div>
      <div class="intro-flash flash-4" aria-hidden="true"></div>

      <!-- Rotating rings -->
      <div class="intro-ring ring-1" aria-hidden="true"></div>
      <div class="intro-ring ring-2" aria-hidden="true"></div>

      <!-- Reticle crosshair -->
      <div class="intro-reticle" aria-hidden="true"></div>

      <!-- Route line + dot markers -->
      <div class="intro-route" aria-hidden="true">
        <div class="intro-route-line"></div>
        <div class="intro-dot-marker"></div>
        <div class="intro-dot-marker"></div>
        <div class="intro-dot-marker"></div>
        <div class="intro-dot-marker"></div>
        <div class="intro-dot-marker"></div>
        <div class="intro-dot-marker"></div>
        <div class="intro-dot-marker"></div>
      </div>

      <!-- Floating particles -->
      <div class="intro-particles" aria-hidden="true">
        <div class="intro-particle"></div>
        <div class="intro-particle"></div>
        <div class="intro-particle"></div>
        <div class="intro-particle"></div>
        <div class="intro-particle"></div>
        <div class="intro-particle"></div>
        <div class="intro-particle"></div>
        <div class="intro-particle"></div>
        <div class="intro-particle"></div>
        <div class="intro-particle"></div>
        <div class="intro-particle"></div>
        <div class="intro-particle"></div>
      </div>

      <!-- Travel lines -->
      <div class="intro-travel-line" aria-hidden="true"></div>
      <div class="intro-travel-line" aria-hidden="true"></div>
      <div class="intro-travel-line" aria-hidden="true"></div>

      <!-- City slides stage -->
      <div class="intro-stage" aria-hidden="true">
        <!-- City 1: Chennai -->
        <div class="intro-city">
          <span class="intro-city-num">01</span>
          <div class="intro-city-name">CHENNAI</div>
          <div class="intro-city-script">அமைதி</div>
          <div class="intro-city-coords">13.0827°N · 80.2707°E</div>
        </div>
        <!-- City 2: Mumbai -->
        <div class="intro-city">
          <span class="intro-city-num">02</span>
          <div class="intro-city-name">MUMBAI</div>
          <div class="intro-city-script">शांतता</div>
          <div class="intro-city-coords">19.0760°N · 72.8777°E</div>
        </div>
        <!-- City 3: Delhi -->
        <div class="intro-city">
          <span class="intro-city-num">03</span>
          <div class="intro-city-name">DELHI</div>
          <div class="intro-city-script">ख़ामोशी</div>
          <div class="intro-city-coords">28.7041°N · 77.1025°E</div>
        </div>
        <!-- City 4: Pune -->
        <div class="intro-city">
          <span class="intro-city-num">04</span>
          <div class="intro-city-name">PUNE</div>
          <div class="intro-city-script">शांतता</div>
          <div class="intro-city-coords">18.5204°N · 73.8567°E</div>
        </div>
        <!-- City 5: Bangalore -->
        <div class="intro-city">
          <span class="intro-city-num">05</span>
          <div class="intro-city-name">BANGALORE</div>
          <div class="intro-city-script">ಮೌನ</div>
          <div class="intro-city-coords">12.9716°N · 77.5946°E</div>
        </div>
        <!-- City 6: Kolkata -->
        <div class="intro-city">
          <span class="intro-city-num">06</span>
          <div class="intro-city-name">KOLKATA</div>
          <div class="intro-city-script">নীরবতা</div>
          <div class="intro-city-coords">22.5726°N · 88.3639°E</div>
        </div>
        <!-- City 7: Hyderabad -->
        <div class="intro-city">
          <span class="intro-city-num">07</span>
          <div class="intro-city-name">HYDERABAD</div>
          <div class="intro-city-script">నిశ్శబ్దం</div>
          <div class="intro-city-coords">17.3850°N · 78.4867°E</div>
        </div>
      </div>

      <!-- Final logo reveal -->
      <div class="intro-final" aria-hidden="true">
        <img src="./assets/brand/legacy-logo-media/ChatGPT Image Jul 21, 2026, 11_10_57 PM.png" alt="" class="intro-final-logo" />
        <div class="intro-final-brand">PIN DROP SILENCE</div>
        <div class="intro-final-sub">SEVEN CITIES · ONE SILENCE</div>
      </div>

      <!-- HUD labels -->
      <div class="intro-label-tl">
        <span>EST. 2026</span>
        <span>INDIA STREETWEAR</span>
      </div>

      <div class="intro-counter" id="introCounter">01 / 07</div>

      <div class="intro-tagline">
        <span>QUIET ACTION.</span>
        <span>LOUD IMPACT.</span>
      </div>

      <!-- Progress bar -->
      <div class="intro-progress" aria-hidden="true"></div>

      <!-- Skip button -->
      <button class="intro-skip" id="introSkip" aria-label="Skip intro">SKIP ▸</button>
    `;

    return overlay;
  }

  // ── Counter animation ────────────────────────────────────────
  function animateCounter(counterEl) {
    const schedule = [
      { text: '01 / 07', time: 0    },
      { text: '02 / 07', time: 800  },
      { text: '03 / 07', time: 1600 },
      { text: '04 / 07', time: 2400 },
      { text: '05 / 07', time: 3200 },
      { text: '06 / 07', time: 4000 },
      { text: '07 / 07', time: 4750 },
    ];

    const timers = [];
    schedule.forEach(item => {
      const t = setTimeout(() => {
        counterEl.textContent = item.text;
      }, item.time);
      timers.push(t);
    });
    return timers;
  }

  // ── Scramble effect for city names ───────────────────────────
  const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ░▒▓█✦◆';

  function scrambleText(el, delay) {
    setTimeout(() => {
      const original = el.textContent.trim();
      let frame = 0;
      const total = 12;
      const interval = setInterval(() => {
        el.textContent = original.split('').map((ch, i) => {
          if (ch === ' ') return ' ';
          if (frame / total > i / original.length) return ch;
          return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
        }).join('');
        if (++frame > total) {
          el.textContent = original;
          clearInterval(interval);
        }
      }, 30);
    }, delay);
  }

  // ── Audio pulse (subtle, optional) ───────────────────────────
  function createPulse() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = 60;
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.3);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 2);
    } catch (e) {
      // Audio not available — gracefully ignore
    }
  }

  // ── Init ─────────────────────────────────────────────────────
  function init() {
    document.body.classList.add('intro-active');

    const overlay = buildIntro();
    document.body.prepend(overlay);

    const counterEl = document.getElementById('introCounter');
    const skipBtn = document.getElementById('introSkip');

    // Start counter
    const timers = animateCounter(counterEl);

    // Scramble city names with staggered delays
    const cityNames = overlay.querySelectorAll('.intro-city-name');
    const delays = [100, 900, 1700, 2500, 3300, 4100, 4850];
    cityNames.forEach((name, i) => {
      scrambleText(name, delays[i]);
    });

    // Try subtle audio
    setTimeout(createPulse, 200);

    // ── End intro ──────────────────────────────────────────────
    let ended = false;
    function endIntro() {
      if (ended) return;          // skip + auto-end could both fire
      ended = true;
      timers.forEach(clearTimeout);
      overlay.classList.add('done');
      document.body.classList.remove('intro-active');

      // Remove once the fade has actually finished.
      setTimeout(() => { overlay.remove(); }, FADE_MS);
    }

    // Auto-end when the content finishes; the fade runs on top of it.
    const autoEnd = setTimeout(endIntro, INTRO_DURATION);

    // Skip button
    if (skipBtn) {
      skipBtn.addEventListener('click', () => {
        clearTimeout(autoEnd);
        endIntro();
      });
    }

    // Also skip on Escape key
    function onKey(e) {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        clearTimeout(autoEnd);
        endIntro();
        document.removeEventListener('keydown', onKey);
      }
    }
    document.addEventListener('keydown', onKey);
  }

  // ── Run on DOM ready ─────────────────────────────────────────
  function start() {
    // Only show intro once per session (not when navigating back from city pages)
    if (sessionStorage.getItem('pds-intro-seen')) return;
    sessionStorage.setItem('pds-intro-seen', '1');
    init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
