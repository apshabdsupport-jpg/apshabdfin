/* ══════════════════════════════════════════════════════════════════════════
   अPSHABD — OPENING TITLES

   Five seconds of ident over the site on arrival, then fifteen minutes of
   quiet. Everything the film actually does lives in trailer.css; this file
   decides whether it runs, builds the frames, and gets out of the way.

   Loaded blocking from <head>, on purpose and before the stylesheets. It has
   to set .ap-armed on <html> before the first paint, or the browser puts a
   frame or two of the hero on screen and the trailer lands on top of it.
   The file is small enough that the parser pause does not register; keep it
   that way, and keep it above the <link> tags — a script placed after a
   stylesheet waits for that stylesheet to load before it runs.

   The one thing to know before editing: the timeline is CSS. Nothing here
   drives a frame. The four constants below are mirrors of values in
   trailer.css and are only used to know when the film is over — change one
   and you have to change the other.
   ══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── The clock ──────────────────────────────────────────────────────────
     One showing, then locked out for fifteen minutes however many times the
     page is reloaded. The stamp is written when the film starts rather than
     when it ends, so a reload part-way through is covered too — and so a
     trailer that somehow breaks mid-run cannot put the visitor in a loop. */
  var KEY      = 'apshabd-titles-seen';
  var COOLDOWN = 15 * 60 * 1000;

  /* ── Mirrors of trailer.css ─────────────────────────────────────────── */
  var RUN       = 5000;  /* the master timeline length              */
  var EXIT      = 340;   /* @keyframes aptExit                      */
  var CITY_T0   = 420;   /* --apt-t-city                            */
  var CITY_SLOT = 230;   /* --apt-slot                              */

  var STILL     = 1700;  /* how long the reduced-motion card holds  */
  var FONT_WAIT = 700;   /* ceiling on waiting for the Indic faces  */

  /* ── The film ───────────────────────────────────────────────────────────
     All the copy in one place. The seven cities are the site's own index, in
     the site's own order, each in the script that city's own page uses. */
  var DEVA   = '"Noto Sans Devanagari", sans-serif';
  var CITIES = [
    { code: 'MAA / 01', script: 'சென்னை',     lang: 'ta', name: 'Chennai',   font: '"Noto Sans Tamil", sans-serif' },
    { code: 'BOM / 02', script: 'मुंबई',       lang: 'mr', name: 'Mumbai',    font: DEVA },
    { code: 'DEL / 03', script: 'दिल्ली',       lang: 'hi', name: 'Delhi',     font: DEVA },
    { code: 'BLR / 04', script: 'ಬೆಂಗಳೂರು',    lang: 'kn', name: 'Bangalore', font: '"Noto Sans Kannada", sans-serif' },
    { code: 'CCU / 05', script: 'কলকাতা',     lang: 'bn', name: 'Kolkata',   font: '"Noto Sans Bengali", sans-serif' },
    { code: 'HYD / 06', script: 'హైదరాబాద్',   lang: 'te', name: 'Hyderabad', font: '"Noto Sans Telugu", sans-serif' },
    { code: 'PNQ / 07', script: 'पुणे',        lang: 'mr', name: 'Pune',      font: DEVA }
  ];

  var COPY = {
    hud:  ['Indian streetwear', 'Est. MMXXVI', 'Not merch.'],
    word: 'अपशब्द',
    phon: '/ap·shabd/',
    tag:  'noun',
    /* The name is the joke and the brand voice in one line: अपशब्द is Hindi
       for a bad word. Deadpan is the register the brand doc asks for — if
       this ever needs to be warmer or ruder, it is this string. */
    def:  'a bad word.',
    line: ['Wear', 'where you’re', 'from.'],
    mark: 'assets/brand/apshabd-wordmark-cream.png',
    alt:  'अPSHABD'
  };

  /* Three frames held about a tenth of a second each behind the city cuts.
     The first is the hero image, which index.html already preloads, so it
     costs nothing; the third is the ident's own poster frame at 17KB. Only
     the second is a request this file adds. */
  var PLATES = [
    'assets/campaign/web/06-mumbai-andheri-dadar-colaba-train.jpg',
    'assets/campaign/web/01-chennai-adyar-fisherman.webp',
    'assets/video/apshabd-ident-poster.jpg'
  ];

  /* ── Storage ────────────────────────────────────────────────────────────
     localStorage throws rather than returns null when a browser has storage
     switched off entirely, so every access is guarded. If both stores are
     gone the fallback is an object that dies with the page, which means the
     trailer plays on every load — noisy, but better than a hard failure on
     the first line of the site's <head>. */
  var memory = {};

  function read(key) {
    try { return window.localStorage.getItem(key); } catch (e) {}
    try { return window.sessionStorage.getItem(key); } catch (e) {}
    return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null;
  }

  function write(key, value) {
    try { window.localStorage.setItem(key, value); return; } catch (e) {}
    try { window.sessionStorage.setItem(key, value); return; } catch (e) {}
    memory[key] = value;
  }

  function isDue() {
    var raw = read(KEY);
    if (!raw) return true;

    var stamp = parseInt(raw, 10);
    if (!isFinite(stamp)) return true;

    var age = Date.now() - stamp;
    /* A clock that has moved backwards — a timezone change, a manual set —
       would otherwise lock the trailer out for as long as the skew lasts. */
    if (age < 0) return true;

    return age >= COOLDOWN;
  }

  /* ══════════════════════════════════════════════════════════════════════
     ARM
     ══════════════════════════════════════════════════════════════════════ */

  function arm()   { document.documentElement.classList.add('ap-armed'); }
  function unarm() { document.documentElement.classList.remove('ap-armed'); }

  if (!isDue()) return;

  /* Arm only if somebody is actually here to see it. A prerendered document
     reports hidden until it is activated, and so does a tab opened in the
     background; arming either one would hold a black page behind a class
     that nothing is going to come along and remove. The cost of waiting is a
     single frame of site before the film cuts in, which is the right trade —
     the alternative failure mode is a visitor looking at nothing. */
  if (document.visibilityState !== 'hidden') arm();

  var booted = false;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  /* ══════════════════════════════════════════════════════════════════════
     BUILD
     ══════════════════════════════════════════════════════════════════════ */

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function build(plates) {
    var root = el('div', 'ap-trailer');
    root.id = 'apTrailer';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Opening titles');

    var kick  = el('div', 'ap-kick');
    var drift = el('div', 'ap-drift');
    var stage = el('div', 'ap-stage');

    /* ── Plates ── */
    var plateBox = el('div', 'ap-plates');
    plateBox.setAttribute('aria-hidden', 'true');
    plates.forEach(function (src, i) {
      var img = el('img', 'ap-plate ap-plate-' + (i + 1));
      img.src = src;
      img.alt = '';
      img.decoding = 'async';
      plateBox.appendChild(img);
    });

    /* ── Act 0 · the pin drop ── */
    var drop = el('div', 'ap-act ap-drop');
    var reticle = el('div', 'ap-reticle');
    reticle.appendChild(el('i'));
    drop.appendChild(reticle);
    drop.appendChild(el('i', 'ap-ring'));
    drop.appendChild(el('i', 'ap-pin', '✱'));

    /* ── Act 1 · seven cities ── */
    var cities = el('div', 'ap-act ap-cities');
    var ghost = el('div', 'ap-ghost', 'अ');
    ghost.setAttribute('aria-hidden', 'true');
    cities.appendChild(ghost);

    CITIES.forEach(function (city, i) {
      var slide = el('div', 'ap-city');
      slide.style.setProperty('--i', i);

      var block  = el('div', 'ap-city-block');
      var script = el('span', 'ap-city-script', city.script);
      script.lang = city.lang;
      script.style.fontFamily = city.font;

      block.appendChild(el('span', 'ap-city-code', city.code));
      block.appendChild(script);
      block.appendChild(el('span', 'ap-city-name', city.name));
      slide.appendChild(block);
      cities.appendChild(slide);
    });

    /* ── Act 2 · the name ── */
    var name = el('div', 'ap-act ap-name');
    var word = el('div', 'ap-word', COPY.word);
    word.lang = 'hi';
    word.style.fontFamily = DEVA;

    var gloss = el('div', 'ap-gloss');
    gloss.appendChild(el('em', null, COPY.tag));
    gloss.appendChild(el('span', null, COPY.def));

    name.appendChild(word);
    name.appendChild(el('div', 'ap-phon', COPY.phon));
    name.appendChild(gloss);

    /* ── Acts 3 and 4 · the lock-up ──
       One act, two rows: the mark lands first and the line drops in under it
       a second later. They share a container so the gap between them is a
       real gap and not an offset that has to be guessed per viewport. */
    var lockup = el('div', 'ap-act ap-lockup');

    var wrap = el('div', 'ap-mark-wrap');
    var logo = el('img');
    logo.src = COPY.mark;
    logo.alt = COPY.alt;
    logo.decoding = 'async';
    wrap.appendChild(logo);
    wrap.appendChild(el('i', 'ap-slash'));

    var line = el('p', 'ap-line');
    COPY.line.forEach(function (piece, i) {
      var span = el('span', null, piece);
      span.style.setProperty('--i', i);
      line.appendChild(span);
    });

    lockup.appendChild(wrap);
    lockup.appendChild(line);

    stage.appendChild(plateBox);
    stage.appendChild(drop);
    stage.appendChild(cities);
    stage.appendChild(name);
    stage.appendChild(lockup);
    drift.appendChild(stage);
    kick.appendChild(drift);

    /* ── HUD ── */
    var hud = el('div', 'ap-hud');
    hud.setAttribute('aria-hidden', 'true');
    COPY.hud.forEach(function (text) { hud.appendChild(el('span', null, text)); });
    var count = el('span', 'ap-count', pad(1) + ' / ' + pad(CITIES.length));
    hud.appendChild(count);

    var prog = el('div', 'ap-prog');
    prog.setAttribute('aria-hidden', 'true');
    prog.appendChild(el('i'));

    var skip = el('button', 'ap-skip');
    skip.type = 'button';
    skip.appendChild(el('span', null, 'Skip'));
    var chevron = el('span', null, '▸');
    chevron.setAttribute('aria-hidden', 'true');
    skip.appendChild(chevron);

    ['ap-bar ap-bar-t', 'ap-bar ap-bar-b'].forEach(function (cls) {
      var bar = el('div', cls);
      bar.setAttribute('aria-hidden', 'true');
      root.appendChild(bar);
    });

    ['ap-grain', 'ap-scan', 'ap-vig', 'ap-flash'].forEach(function (cls) {
      var layer = el('div', cls);
      layer.setAttribute('aria-hidden', 'true');
      root.appendChild(layer);
    });

    root.appendChild(kick);
    root.appendChild(hud);
    root.appendChild(prog);
    root.appendChild(skip);

    return { root: root, skip: skip, count: count };
  }

  /* ══════════════════════════════════════════════════════════════════════
     RUN
     ══════════════════════════════════════════════════════════════════════ */

  function boot() {
    if (booted) return;

    /* Nobody is looking at a background tab, and the film only gets to play
       once every fifteen minutes — so hold it until the tab is fronted
       rather than spending the one showing on an empty room. Unarm while
       waiting: the page has to stay usable for however long that is, and it
       may well be forever. */
    if (document.visibilityState === 'hidden') {
      unarm();
      document.addEventListener('visibilitychange', function onShow() {
        if (document.visibilityState === 'hidden') return;
        document.removeEventListener('visibilitychange', onShow);
        arm();
        boot();
      });
      return;
    }

    booted = true;
    arm();

    guard(run);
  }

  /* Nothing past the arm is worth a black page. If any of it throws — a
     missing asset, an API that is not here, a browser doing something
     unexpected — drop the cover and let the visitor have the site. Every
     entry point into the film goes through this, including the two that
     land asynchronously and so would otherwise escape a try around run(). */
  function guard(fn) {
    try {
      fn();
    } catch (e) {
      unarm();
      var wreck = document.getElementById('apTrailer');
      if (wreck) wreck.remove();
    }
  }

  function run() {
    var still = window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

    /* Save-Data means no photography. The film still works without it — the
       plates are texture under the cuts, not content. */
    var saveData = !!(navigator.connection && navigator.connection.saveData);
    var plates = (still || saveData) ? [] : PLATES;

    var parts = build(plates);
    var root  = parts.root;
    document.body.appendChild(root);

    if (still) return start(parts, true);

    /* The city cuts are 230ms each. If the Indic faces are still in flight
       when the first one lands, four of the seven swap font mid-cut. Ask for
       them by name — the Google stylesheet is already parsed by the time
       DOMContentLoaded fires, so these resolve against real @font-face rules
       — and give them a ceiling, because a slow connection must not hold the
       site behind a black screen. */
    var waited = false;

    function go() {
      if (waited) return;
      waited = true;
      guard(function () { start(parts, false); });
    }

    if (document.fonts && document.fonts.load) {
      CITIES.map(function (c) { return '700 1em ' + c.font.split(',')[0]; })
        .filter(function (f, i, all) { return all.indexOf(f) === i; })
        .forEach(function (face) {
          try { document.fonts.load(face, 'अ'); } catch (e) {}
        });
    }

    if (document.fonts && document.fonts.ready && document.fonts.ready.then) {
      document.fonts.ready.then(go, go);
    } else {
      go();
    }

    setTimeout(go, FONT_WAIT);
  }

  function start(parts, still) {
    var root = parts.root;

    /* The stamp goes down the moment the film starts. See KEY above. */
    write(KEY, String(Date.now()));

    var timers = [];
    var ended  = false;

    root.classList.add(still ? 'is-still' : 'is-running');

    if (!still) {
      /* The counter is the one thing not driven by the stylesheet. It is on
         the same delays as the cuts, and a frame of drift at this speed is
         not visible; anything more accurate would mean an animation per
         city for no gain. */
      CITIES.forEach(function (city, i) {
        timers.push(setTimeout(function () {
          parts.count.textContent = pad(i + 1) + ' / ' + pad(CITIES.length);
        }, CITY_T0 + i * CITY_SLOT));
      });
    }

    var teardown = [];

    function on(target, type, handler) {
      target.addEventListener(type, handler);
      teardown.push(function () { target.removeEventListener(type, handler); });
    }

    function end() {
      if (ended) return;
      ended = true;
      timers.forEach(clearTimeout);
      teardown.forEach(function (off) { off(); });

      /* Dropping .ap-armed here rather than after the fade puts the site
         back behind the overlay while it is still pulling away, so the exit
         reveals the page instead of revealing more black. It also hands
         scrolling back. */
      unarm();

      if (root.contains(document.activeElement)) document.activeElement.blur();

      root.classList.add('is-out');
      setTimeout(function () { root.remove(); }, EXIT + 60);
    }

    timers.push(setTimeout(end, still ? STILL : RUN));

    /* Three ways out, because being stuck behind this thing is the single
       worst way it can fail and one timer is one point of failure. A tab
       throttled in the background can hold a setTimeout well past its due
       time — so the progress bar, which is the only element whose animation
       runs the full 5000ms, ends the film too. Whichever lands first wins;
       end() is idempotent. */
    var master = root.querySelector('.ap-prog i');
    if (master) on(master, 'animationend', end);

    /* And if the visitor leaves mid-film, it is over. The stamp is already
       written, so they are not owed it again, and a half-run timeline
       waiting behind a hidden tab is exactly how the overlay gets stuck. */
    on(document, 'visibilitychange', function () {
      if (document.visibilityState === 'hidden') end();
    });

    /* A tap anywhere is a skip; so is the button, Escape, Enter or Space. */
    on(root, 'click', end);
    on(parts.skip, 'click', end);

    on(document, 'keydown', function (event) {
      if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
        end();
        return;
      }

      /* The dialog holds one control. Tab has nowhere else to go while the
         overlay is up, and letting focus walk behind it is how a keyboard
         user ends up typing into a page they cannot see. */
      if (event.key === 'Tab') {
        event.preventDefault();
        parts.skip.focus();
      }
    });

    try { parts.skip.focus({ preventScroll: true }); } catch (e) { parts.skip.focus(); }
  }
})();
