/* ═══════════════════════════════════════════════════════
   PDS — CINEMATIC ENGINE
   One rAF loop drives the camera, the deck depth, and the
   card tilt so nothing fights over a transform.
═══════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine   = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  var clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
  var lerp  = function (a, b, t) { return a + (b - a) * t; };

  /* ── FILM FRAME ─────────────────────────────────────── */
  function buildFrame() {
    if (reduce) return;
    var f = document.createElement('div');
    f.className = 'cine-frame';
    f.setAttribute('aria-hidden', 'true');
    var v = document.createElement('div');
    v.className = 'cine-vignette';
    f.appendChild(v);
    document.body.appendChild(f);
    requestAnimationFrame(function () { f.classList.add('on'); });
  }

  /* ── HERO CAMERA RIG ────────────────────────────────── */
  // Wrap .hero-inner so the dolly composes with the existing
  // mouse parallax instead of overwriting it.
  var cam = null;
  function buildCam() {
    var inner = document.querySelector('.hero-inner');
    if (inner && inner.parentNode) {
      // Home page — one wrapper already holds the content.
      cam = document.createElement('div');
      cam.className = 'hero-cam';
      inner.parentNode.insertBefore(cam, inner);
      cam.appendChild(inner);
      return;
    }

    // City pages — hero children sit directly in .hero, so collect the
    // real content (skipping decorative aria-hidden layers, which are
    // absolutely positioned and would reflow if reparented).
    var heroEl = document.querySelector('.hero');
    if (!heroEl) return;
    var kids = [].slice.call(heroEl.children).filter(function (el) {
      return el.getAttribute('aria-hidden') !== 'true';
    });
    if (!kids.length) return;

    cam = document.createElement('div');
    cam.className = 'hero-cam hero-cam--stack';
    heroEl.insertBefore(cam, kids[0]);
    kids.forEach(function (el) { cam.appendChild(el); });
  }

  var video = document.querySelector('.hero-video');
  var hero  = document.querySelector('.hero');

  function updateCamera() {
    if (!hero) return;
    var vh = window.innerHeight;
    var y  = window.scrollY;
    // 0 at rest, 1 when the hero has fully passed
    var p = clamp(y / (vh * 0.9), 0, 1);

    if (cam) {
      var scale   = 1 - p * 0.14;          // pull back
      var push    = -p * 260;              // into the screen
      var rise    = -p * 60;
      var rot     = p * 7;                 // tip away from viewer
      cam.style.transform =
        'translate3d(0,' + rise.toFixed(1) + 'px,' + push.toFixed(0) + 'px) ' +
        'rotateX(' + rot.toFixed(2) + 'deg) scale(' + scale.toFixed(3) + ')';
      cam.style.opacity = (1 - p * 1.05).toFixed(3);
      cam.style.filter  = p > 0.02 ? 'blur(' + (p * 5).toFixed(2) + 'px)' : 'none';
    }

    if (video) {
      // Slow push-in on the plate, opposite direction to the rig
      var vs = 1 + p * 0.22;
      video.style.transform = 'scale(' + vs.toFixed(3) + ') translateY(' + (p * 22).toFixed(1) + 'px)';
    }
  }

  /* ── CITY DECK: DEPTH + TILT ────────────────────────── */
  var cards = [].slice.call(document.querySelectorAll('.city-card'));
  var state = cards.map(function () {
    return { bury: 0, tx: 0, ty: 0, ctx: 0, cty: 0, last: '' };
  });

  function measureDeck() {
    var vh = window.innerHeight;
    for (var i = 0; i < cards.length; i++) {
      var next = cards[i + 1];
      var b = 0;
      if (next) {
        var nr = next.getBoundingClientRect();
        var cr = cards[i].getBoundingClientRect();
        // 0 while the next card is still below the fold,
        // 1 once it has risen flush over this one.
        var start = vh;
        var end   = cr.top + 30;
        if (start - end > 1) b = clamp((start - nr.top) / (start - end), 0, 1);
      }
      state[i].bury = b;
    }
  }

  // Returns true while anything is still easing, so the frame loop
  // knows whether it has a reason to run again.
  function paintDeck() {
    var busy = false;
    for (var i = 0; i < cards.length; i++) {
      var s = state[i];
      // ease the hover tilt toward its target
      s.ctx = lerp(s.ctx, s.tx, 0.12);
      s.cty = lerp(s.cty, s.ty, 0.12);
      // Snap once it's close enough, so idle cards stop writing styles.
      if (Math.abs(s.ctx - s.tx) < 0.01) s.ctx = s.tx;
      if (Math.abs(s.cty - s.ty) < 0.01) s.cty = s.ty;

      var b     = s.bury;
      var scale = 1 - b * 0.07;
      var push  = -b * 140;
      var rise  = -b * 18;
      var rotB  = b * 4;

      var t =
        'translate3d(0,' + rise.toFixed(1) + 'px,' + push.toFixed(0) + 'px) ' +
        'rotateX(' + (rotB + s.cty).toFixed(2) + 'deg) ' +
        'rotateY(' + s.ctx.toFixed(2) + 'deg) ' +
        'scale(' + scale.toFixed(3) + ')';

      // Skip the write when nothing moved — otherwise every card
      // restyles on every frame even while the page sits idle.
      if (t === s.last) continue;
      s.last = t;
      busy = true;
      cards[i].style.transform = t;
      cards[i].style.setProperty('--bury', (b * 0.55).toFixed(3));
    }
    return busy;
  }

  function bindCardTilt() {
    if (!fine || reduce) return;
    cards.forEach(function (card, i) {
      card.addEventListener('mousemove', function (e) {
        var r  = card.getBoundingClientRect();
        var nx = (e.clientX - (r.left + r.width  / 2)) / (r.width  / 2); // -1 → 1
        var ny = (e.clientY - (r.top  + r.height / 2)) / (r.height / 2);
        state[i].tx =  nx * 4;
        state[i].ty = -ny * 3;
        // inner layers drift at their own rates → depth inside the card
        card.style.setProperty('--mx', nx.toFixed(3));
        card.style.setProperty('--my', ny.toFixed(3));
        dirty = true;
      }, { passive: true });

      card.addEventListener('mouseenter', function () {
        card.style.setProperty('--hov', '1');
      }, { passive: true });

      card.addEventListener('mouseleave', function () {
        state[i].tx = 0; state[i].ty = 0;
        card.style.setProperty('--mx', '0');
        card.style.setProperty('--my', '0');
        card.style.setProperty('--hov', '0');
        dirty = true;
      }, { passive: true });
    });
  }

  /* ── SCROLL-ROTATED PANELS ──────────────────────────── */
  // Each element pivots through the page plane as it crosses
  // the viewport: tipped toward you below, away above.
  var panels = [];
  function collectPanels() {
    var add = function (sel, rotX, rotY, z, persp) {
      [].slice.call(document.querySelectorAll(sel)).forEach(function (el) {
        panels.push({ el: el, rx: rotX, ry: rotY, z: z, p: persp || 0 });
      });
    };
    add('.story-block', 9, 0, 90);
    add('.wait-inner',  7, 0, 70);
    // The marquee track owns its own scrolling animation, so the
    // tilt goes on the container with a self-contained perspective.
    add('.marquee', 7, 0, 0, 700);
    add('.footer-big', 0, 8, 60);
    // City pages: the product grid swings as a slab. (.section-head,
    // .wait and .card are skipped — they own a .reveal transform.)
    add('.grid', 6, 0, 55);

    // These CSS animations would override the inline transforms below.
    var fb = document.querySelector('.footer-big');
    if (fb) fb.classList.remove('footer-3d-pulse');
  }

  function updatePanels() {
    var vh = window.innerHeight;
    for (var i = 0; i < panels.length; i++) {
      var p = panels[i];
      var r = p.el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) continue;   // offscreen
      var mid = r.top + r.height / 2;
      // -1 (below the fold) → 0 (centered) → 1 (above)
      var t = clamp((vh / 2 - mid) / (vh / 2 + r.height / 2), -1, 1);
      p.el.style.transform =
        (p.p ? 'perspective(' + p.p + 'px) ' : '') +
        'rotateX(' + (t * p.rx).toFixed(2) + 'deg) ' +
        'rotateY(' + (t * p.ry).toFixed(2) + 'deg) ' +
        'translateZ(' + (-Math.abs(t) * p.z).toFixed(0) + 'px)';
    }
  }

  /* ── NAV LIFT ───────────────────────────────────────── */
  var nav = document.querySelector('.nav');
  function updateNav() {
    if (!nav) return;
    if (window.scrollY > 40) nav.classList.add('lifted');
    else nav.classList.remove('lifted');
  }

  /* ── HERO STICKER — float + 3D mouse tumble ─────────── */
  var sticker = document.getElementById('heroSticker');
  var stkX = 0, stkY = 0;
  function bindSticker() {
    if (!sticker || !fine || reduce) return;
    // The CSS float animation would override our inline transform,
    // so we drive the float ourselves instead.
    sticker.classList.remove('float-3d');
    document.addEventListener('mousemove', function (e) {
      stkX = (e.clientX / window.innerWidth  - 0.5) * 2;
      stkY = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  function paintSticker(now) {
    if (!sticker || !fine || reduce) return false;
    // Stop animating once the hero has scrolled away. heroGone is
    // refreshed from the dirty pass, so this costs no layout read.
    if (heroGone) return false;
    var bob = Math.sin(now / 1400) * 7;
    var yaw = Math.cos(now / 2600) * 3;
    sticker.style.transform =
      'perspective(900px) rotate(-15deg) ' +
      'translate3d(' + (stkX * -20).toFixed(1) + 'px,' + (stkY * -14 + bob).toFixed(1) + 'px,0) ' +
      'rotateY(' + (stkX * 22 + yaw).toFixed(2) + 'deg) ' +
      'rotateX(' + (stkY * -16).toFixed(2) + 'deg)';
    return true;                       // the bob never settles on its own
  }

  /* ── CITY-PAGE CARD DEPTH ───────────────────────────── */
  // Same trick as the city deck: the card clips its contents, so the
  // depth comes from inner layers drifting at different rates.
  function bindProductCards() {
    if (!fine || reduce) return;
    [].slice.call(document.querySelectorAll('.card')).forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', ((e.clientX - (r.left + r.width  / 2)) / (r.width  / 2)).toFixed(3));
        card.style.setProperty('--my', ((e.clientY - (r.top  + r.height / 2)) / (r.height / 2)).toFixed(3));
      }, { passive: true });
      card.addEventListener('mouseleave', function () {
        card.style.setProperty('--mx', '0');
        card.style.setProperty('--my', '0');
      }, { passive: true });
    });
  }

  /* ── PAGE WIPE ──────────────────────────────────────── */
  function buildWipe(color, name) {
    var w = document.createElement('div');
    w.className = 'cine-wipe';
    w.style.setProperty('--wipe', color);
    w.setAttribute('aria-hidden', 'true');
    if (name) {
      var n = document.createElement('span');
      n.className = 'cine-wipe-name';
      n.textContent = name;
      w.appendChild(n);
    }
    document.body.appendChild(w);
    return w;
  }

  function bindWipeLinks() {
    if (reduce) return;
    cards.forEach(function (card) {
      card.addEventListener('click', function (e) {
        // let modified clicks (new tab, etc.) behave normally
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        var href = card.getAttribute('href');
        if (!href || href.charAt(0) === '#') return;
        e.preventDefault();

        var color = (card.style.getPropertyValue('--c') || '#f5b301').trim();
        var nameEl = card.querySelector('.city-name');
        var w = buildWipe(color, nameEl ? nameEl.textContent.trim() : '');
        w.classList.add('cover');

        try { sessionStorage.setItem('pdsWipe', color); } catch (err) {}

        var went = false;
        var go = function () { if (!went) { went = true; window.location.href = href; } };
        w.addEventListener('animationend', go);
        setTimeout(go, 900); // safety net
      });
    });
  }

  // Arriving on a city page — retract the panel we left with.
  function playArrival() {
    if (reduce) return;
    var color;
    try { color = sessionStorage.getItem('pdsWipe'); } catch (err) { return; }
    if (!color) return;
    try { sessionStorage.removeItem('pdsWipe'); } catch (err) {}

    var w = buildWipe(color, '');
    w.classList.add('reveal');
    w.addEventListener('animationend', function () {
      if (w.parentNode) w.parentNode.removeChild(w);
    });
  }

  /* Title sweep removed — the sliding band looked like screen glare. */
  function bindSweep() {}

  /* ── LOOP ───────────────────────────────────────────── */
  var dirty = true, running = false, heroGone = false;
  function tick(now) {
    if (dirty) {
      updateCamera();
      measureDeck();
      updatePanels();
      updateNav();
      heroGone = !!(hero && hero.getBoundingClientRect().bottom < 0);
      dirty = false;
    }
    var busy = paintDeck();              // eases the tilt smoothly
    if (paintSticker(now || 0)) busy = true;

    // Suspend instead of burning a frame forever on an idle page.
    // Anything that can start motion calls wake().
    if (busy || dirty) requestAnimationFrame(tick);
    else running = false;
  }

  function wake() {
    dirty = true;
    if (running || document.hidden) return;
    running = true;
    requestAnimationFrame(tick);
  }

  /* ── REVEAL SAFETY NET ──────────────────────────────────
     Every section starts at opacity:0 and waits on an
     IntersectionObserver. If IO is blocked, throttled, or the tab
     never composites before the visitor looks at it, the page would
     sit blank forever. Force anything still hidden into view. */
  function revealSafetyNet() {
    var SEL = '.reveal, .reveal-3d, .section-anim, .reveal-card, .clip-reveal';
    setTimeout(function () {
      [].slice.call(document.querySelectorAll(SEL)).forEach(function (el) {
        if (!el.classList.contains('in')) el.classList.add('in');
      });
      var tw = document.querySelector('.typewriter-section.tw-hidden');
      if (tw) { tw.classList.remove('tw-hidden'); tw.classList.add('tw-visible'); }
    }, 2600);
  }

  function boot() {
    playArrival();
    revealSafetyNet();
    if (reduce) return;

    buildFrame();
    buildCam();
    collectPanels();
    bindCardTilt();
    bindProductCards();
    bindSticker();
    bindWipeLinks();
    bindSweep();

    window.addEventListener('scroll', wake, { passive: true });
    window.addEventListener('resize', wake, { passive: true });
    // Pointer motion feeds the tilt and sticker parallax, so it has to
    // be able to restart a suspended loop too.
    if (fine) document.addEventListener('mousemove', wake, { passive: true });
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) wake();
    });

    wake();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
