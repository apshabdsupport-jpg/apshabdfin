/* ═══════════════════════════════════════════════════════
   PIN DROP SILENCE — CITY ORBIT JS
   Builds the holographic figure (a stack of cross-section
   slices, like a volumetric scan) and rotates the ring of
   city cards as the page scrolls through the pinned stage.
═══════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const track = document.getElementById('orbitTrack');
  const scene = document.getElementById('orbitScene');
  const ring  = document.getElementById('orbitRing');
  if (!track || !scene || !ring) return;

  const cards = [...ring.querySelectorAll('.orbit-card')];
  const N     = cards.length;
  const STEP  = 360 / N;                 // 45° with 8 cards
  const LAST  = (N - 1) * STEP;          // full sweep ends on the final card

  const readNum  = document.getElementById('orbitNum');
  const readName = document.getElementById('orbitName');
  const readItem = document.getElementById('orbitItem');
  const readCta  = document.getElementById('orbitCta');
  const ticksBox = document.getElementById('orbitTicks');

  // chest print fonts, matching the card watermark classes
  const FONTS = {
    tamil: "'Noto Sans Tamil', sans-serif",
    dev:   "'Noto Sans Devanagari', sans-serif",
    kan:   "'Noto Sans Kannada', sans-serif",
    ben:   "'Noto Sans Bengali', sans-serif",
    tel:   "'Noto Sans Telugu', sans-serif",
    body:  "'Space Grotesk', sans-serif",
  };

  /* ── THE FIGURE ──────────────────────────────────────
     Horizontal slices tracing a standing human: head, neck,
     torso, then arms and legs as their own columns. Every
     slice is an ellipse outline in currentColor, so the
     whole figure retints with the front city.             */

  // [cy, rx] down the centre column (cx 100)
  const CORE = [
    [26,10],[34,16],[42,20],[50,22],[58,21],[66,18],[73,13],[79,8],   // head
    [86,6],[92,8],                                                    // neck
    [100,24],[107,36],[114,41],[122,40],[132,38],[142,36],[152,34],   // shoulders/chest
    [162,31],[172,28],[182,27],                                       // waist
    [192,29],[202,32],[212,34],[222,34],[232,33],                     // hips
  ];
  // [cy, rx] per leg, mirrored at cx 100±17
  const LEG = [
    [246,14],[260,13],[274,12],[288,11],[302,11],[316,10],[330,10],
    [344,9],[358,9],[372,8],[386,8],[400,7],[414,7],[428,6],[442,6],
    [456,6],[468,5],[478,10],
  ];
  // [cy, offset-from-centre, rx] per arm, mirrored
  const ARM = [
    [112,45,7],[124,48,6],[136,50,6],[148,51,5],[160,52,5],[172,52,5],
    [184,51,4],[196,50,4],[208,49,4],[220,48,4],[232,47,4],[243,47,5],
  ];

  let garment = null, chestWord = null;   // set by buildFigure, used by setFront

  function buildFigure() {
    const NS  = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 200 500');
    svg.setAttribute('aria-hidden', 'true');

    const slice = (cx, cy, rx, bright) => {
      const el = document.createElementNS(NS, 'ellipse');
      el.setAttribute('cx', cx);
      el.setAttribute('cy', cy);
      el.setAttribute('rx', rx);
      el.setAttribute('ry', Math.max(2, rx * 0.24).toFixed(1));
      el.setAttribute('fill', 'none');
      el.setAttribute('stroke', 'currentColor');
      el.setAttribute('stroke-width', bright ? '1.6' : '1.1');
      el.setAttribute('opacity', bright ? '0.95' : '0.55');
      svg.appendChild(el);
    };

    CORE.forEach(([cy, rx], i) => slice(100, cy, rx, i % 3 === 0));
    LEG.forEach(([cy, rx], i) => {
      slice(83,  cy, rx, i % 3 === 0);
      slice(117, cy, rx, i % 3 === 0);
    });
    ARM.forEach(([cy, d, rx], i) => {
      slice(100 - d, cy, rx, i % 3 === 0);
      slice(100 + d, cy, rx, i % 3 === 0);
    });

    // faint vertical axis, like the projector's registration line
    const axis = document.createElementNS(NS, 'line');
    axis.setAttribute('x1', 100); axis.setAttribute('y1', 14);
    axis.setAttribute('x2', 100); axis.setAttribute('y2', 486);
    axis.setAttribute('stroke', 'currentColor');
    axis.setAttribute('stroke-width', '0.6');
    axis.setAttribute('opacity', '0.28');
    axis.setAttribute('stroke-dasharray', '2 5');
    svg.appendChild(axis);

    /* The garment: a heavyweight tee projected onto the scan, with the
       front city's word on the chest. Retinted + reprinted per city. */
    garment = document.createElementNS(NS, 'g');

    const tee = document.createElementNS(NS, 'path');
    tee.setAttribute('d',
      'M 60,102 Q 74,94 86,95 Q 100,110 114,95 Q 126,94 140,102 ' +
      'L 154,144 L 134,152 L 129,132 C 132,168 134,200 135,234 ' +
      'L 65,234 C 66,200 68,168 71,132 L 66,152 L 46,144 Z');
    tee.setAttribute('fill', 'currentColor');
    tee.setAttribute('fill-opacity', '0.08');
    tee.setAttribute('stroke', 'currentColor');
    tee.setAttribute('stroke-width', '1.8');
    tee.setAttribute('stroke-linejoin', 'round');
    tee.setAttribute('opacity', '0.95');
    garment.appendChild(tee);

    // seam hints: collar + hem stitch lines
    const hem = document.createElementNS(NS, 'path');
    hem.setAttribute('d', 'M 66,228 L 134,228');
    hem.setAttribute('stroke', 'currentColor');
    hem.setAttribute('stroke-width', '0.7');
    hem.setAttribute('stroke-dasharray', '3 3');
    hem.setAttribute('opacity', '0.5');
    garment.appendChild(hem);

    chestWord = document.createElementNS(NS, 'text');
    chestWord.setAttribute('x', '100');
    chestWord.setAttribute('y', '164');
    chestWord.setAttribute('text-anchor', 'middle');
    chestWord.setAttribute('fill', 'currentColor');
    chestWord.setAttribute('font-weight', '700');
    garment.appendChild(chestWord);

    svg.appendChild(garment);

    const holo = document.getElementById('orbitHolo');
    holo.insertBefore(svg, holo.firstChild);
  }

  function printChest(card) {
    const word = card.dataset.word || '';
    chestWord.textContent = word;
    chestWord.setAttribute('font-family', FONTS[card.dataset.font] || FONTS.body);
    // the "+" on the YOUR CITY pass reads as a print placeholder — make it big
    chestWord.setAttribute('font-size',
      word.length === 1 ? '30' : word.length > 6 ? '13' : '16');

    // re-materialize: the projector re-draws the garment
    if (garment.animate) {
      garment.animate(
        [{ opacity: 0 }, { opacity: 1, offset: 0.4 }, { opacity: 0.35, offset: 0.55 },
         { opacity: 1, offset: 0.7 }, { opacity: 1 }],
        { duration: 420, easing: 'steps(6)' }
      );
    }
  }

  /* ── TICKS ─────────────────────────────────────────── */
  const ticks = cards.map(() => {
    const t = document.createElement('span');
    t.className = 'orbit-tick';
    ticksBox.appendChild(t);
    return t;
  });

  /* ── SCROLL → ROTATION ─────────────────────────────── */
  let start = 0, scrollable = 1, frontIdx = -1;

  function measure() {
    const rect = track.getBoundingClientRect();
    start      = rect.top + window.scrollY;
    scrollable = Math.max(1, track.offsetHeight - window.innerHeight);
  }

  function setFront(idx) {
    if (idx === frontIdx) return;
    frontIdx = idx;
    const card = cards[idx];

    cards.forEach((c, i) => c.classList.toggle('is-front', i === idx));
    ticks.forEach((t, i) => t.classList.toggle('on', i <= idx));

    readNum.textContent  = card.dataset.num;
    readName.textContent = card.dataset.city;
    readItem.textContent = card.dataset.item;

    // the buy bar follows the front city — one stable, always-flat target
    readCta.textContent = card.dataset.cta + ' →';
    readCta.setAttribute('href', card.getAttribute('href'));

    // retint the whole stage — hologram, cone, base, ticks, buy bar.
    // Set on the sticky container: the readout is a sibling of the
    // scene, so the scene itself is too low in the tree to reach it.
    const c = card.style.getPropertyValue('--c').trim();
    if (c) sticky.style.setProperty('--holo-c', c);

    printChest(card);
  }

  const sticky = scene.closest('.orbit-sticky');

  function update() {
    const p   = Math.min(1, Math.max(0, (window.scrollY - start) / scrollable));
    const rot = -p * LAST;
    ring.style.transform = `rotateY(${rot}deg)`;

    // Entrance ramp: 0 while the section is still below the fold,
    // 1 by the time the stage pins. The stage rises and fades in
    // over the approach instead of snapping to attention.
    const vh    = window.innerHeight;
    const top   = track.getBoundingClientRect().top;
    const enter = Math.min(1, Math.max(0, (vh - top) / (vh * 0.85)));
    sticky.style.setProperty('--enter', enter.toFixed(3));

    cards.forEach((card, i) => {
      // where this card sits relative to dead-front, in degrees
      let world = (i * STEP + rot) % 360;
      if (world > 180)  world -= 360;
      if (world < -180) world += 360;
      const cos = Math.cos(world * Math.PI / 180);

      const op = Math.max(0, (cos + 0.25) / 1.25);
      card.style.opacity       = op.toFixed(3);
      card.style.pointerEvents = op < 0.45 ? 'none' : '';
      card.tabIndex            = op < 0.45 ? -1 : 0;
      card.querySelector('.oc-in').style.transform =
        `scale(${(0.85 + 0.15 * Math.max(0, cos)).toFixed(3)})`;
    });

    setFront(Math.round(p * (N - 1)));
  }

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { update(); ticking = false; });
  }, { passive: true });

  window.addEventListener('resize', () => { measure(); update(); }, { passive: true });

  // Keyboard: focusing a card scrolls the ring around to it
  cards.forEach((card, i) => {
    card.addEventListener('focus', () => {
      if (i === frontIdx) return;
      window.scrollTo({ top: start + (i / (N - 1)) * scrollable, behavior: 'smooth' });
    });
  });

  /* ── TOUCH: SWIPE TO SPIN ────────────────────────────
     On phones the vertical scroll is a clumsy way to steer a
     carousel, so touch gets direct control: drag the ring left or
     right and it follows the thumb, snapping to the nearest city on
     release. A quick flick advances one city. The swipe drives the
     same scroll position the orbit already reads, so scroll and
     swipe can never disagree about which city is front.           */
  (function bindSwipe() {
    let dragging = false, pid = null;
    let startX = 0, lastX = 0, lastT = 0, startScroll = 0, moved = 0, vx = 0;
    let snapTimer = null;

    // Timer-driven snap: browsers pause compositor smooth-scrolls in
    // background/embedded contexts, so drive the ease ourselves.
    function snapTo(top) {
      clearInterval(snapTimer);
      const from = window.scrollY, dist = top - from, t0 = performance.now();
      if (Math.abs(dist) < 1) return;
      const D = 450;
      snapTimer = setInterval(() => {
        const t = Math.min(1, (performance.now() - t0) / D);
        const e = 1 - Math.pow(1 - t, 3);        // ease-out cubic
        window.scrollTo(0, from + dist * e);
        if (t >= 1) clearInterval(snapTimer);
      }, 16);
    }

    const pinned = () => {
      const r = track.getBoundingClientRect();
      return r.top <= 1 && r.bottom >= window.innerHeight - 1;
    };

    scene.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse') return;      // touch & pen only
      if (!pinned()) return;
      dragging = true; pid = e.pointerId; moved = 0; vx = 0;
      clearInterval(snapTimer);                 // re-grab cancels a snap
      startX = lastX = e.clientX;
      startScroll = window.scrollY;
      lastT = performance.now();
      try { scene.setPointerCapture(pid); } catch (err) {}
      // page-level smooth scroll would lag the finger
      document.documentElement.style.scrollBehavior = 'auto';
    });

    scene.addEventListener('pointermove', e => {
      if (!dragging || e.pointerId !== pid) return;
      const dx = e.clientX - startX;
      moved = Math.max(moved, Math.abs(dx));
      const now = performance.now();
      vx = (e.clientX - lastX) / Math.max(1, now - lastT);
      lastX = e.clientX; lastT = now;
      // ~150px of thumb travel = one city
      const K = (scrollable / (N - 1)) / 150;
      window.scrollTo(0, startScroll - dx * K);
    });

    function release(e) {
      if (!dragging || e.pointerId !== pid) return;
      dragging = false;
      try { scene.releasePointerCapture(pid); } catch (err) {}
      pid = null;

      // snap to the nearest city — a flick carries one further
      const p = (window.scrollY - start) / scrollable;
      let idx = Math.round(p * (N - 1));
      // a real flick reads 1–4 px/ms; a finger that stops before
      // lifting reads ~0 — .25 separates them even on slow devices
      if (Math.abs(vx) > 0.25 && moved > 12) idx += vx < 0 ? 1 : -1;
      idx = Math.max(0, Math.min(N - 1, idx));
      snapTo(start + (idx / (N - 1)) * scrollable);
      setTimeout(() => { document.documentElement.style.scrollBehavior = ''; }, 600);
    }
    scene.addEventListener('pointerup', release);
    scene.addEventListener('pointercancel', release);

    // a drag must not fire the card link it started on
    scene.addEventListener('click', e => {
      if (moved > 10) { e.preventDefault(); e.stopPropagation(); moved = 0; }
    }, true);
  })();

  buildFigure();
  measure();
  update();
})();
