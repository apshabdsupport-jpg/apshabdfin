/* ══════════════════════════════════════════════════════════════════════════
   अPSHABD — MOTION

   The two things every page shares, so the index and the city pages move the
   same way:

   1. Scroll reveals. Anything marked [data-reveal] starts in its "before"
      state (motion.css, and drop.css for product cards) and settles once it
      reaches the viewport. Elements that arrive together are staggered top to
      bottom, left to right, so a grid row lands as one directed moment.

   2. Smooth wheel scrolling. A mouse wheel moves in 100px notches; this eases
      the page towards each notch instead, the way the reference shop does.
      Desktop pointers only — touch scrolling already has native momentum —
      and never under reduced motion. Keyboard, scrollbar and find-in-page
      scrolling stay native; the easing just resyncs to wherever they land.

   Loaded blocking from <head>: it has to set .motion-ready on <html> before
   the first paint, or a reveal would flash in its final state, vanish, then
   animate in. Everything that needs the DOM waits for DOMContentLoaded.

   Under reduced motion .motion-ready is never set, so nothing is hidden and
   nothing moves.
   ══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  if (!reduce.matches && 'IntersectionObserver' in window) {
    root.classList.add('motion-ready');
  }

  /* ── Smooth wheel ─────────────────────────────────────────────────────── */

  var LERP = 0.11;          /* share of the remaining distance per 60fps frame */
  var STEP_LINE = 40;       /* px per "line" for deltaMode 1 wheels (Firefox) */

  var state = {
    on: false,
    target: 0,
    current: 0,
    frame: 0,
    last: 0,
    glide: null,
    locks: 0
  };

  function maxScroll() {
    return Math.max(0, root.scrollHeight - window.innerHeight);
  }

  function clampY(y) {
    return Math.min(maxScroll(), Math.max(0, y));
  }

  function easeInOutQuart(t) {
    return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
  }

  function locked() {
    return state.locks > 0 ||
      root.classList.contains('ap-armed') ||
      (document.body && document.body.classList.contains('menu-open'));
  }

  function stop() {
    if (state.frame) window.cancelAnimationFrame(state.frame);
    state.frame = 0;
    state.last = 0;
    state.glide = null;
    state.current = state.target = window.scrollY;
  }

  function tick(now) {
    var dt = state.last ? Math.min(64, now - state.last) : 16.667;
    state.last = now;

    if (state.glide) {
      var g = state.glide;
      var t = Math.min(1, (now - g.start) / g.duration);
      state.current = g.from + (g.to - g.from) * easeInOutQuart(t);
      state.target = state.current;
      if (t === 1) {
        state.glide = null;
        if (g.done) window.setTimeout(g.done, 0);
      }
    } else {
      var k = 1 - Math.pow(1 - LERP, dt / 16.667);
      state.current += (state.target - state.current) * k;
      if (Math.abs(state.target - state.current) < 0.4) state.current = state.target;
    }

    window.scrollTo(0, state.current);

    if (state.glide || state.current !== state.target) {
      state.frame = window.requestAnimationFrame(tick);
    } else {
      state.frame = 0;
      state.last = 0;
    }
  }

  function run() {
    if (!state.frame) state.frame = window.requestAnimationFrame(tick);
  }

  /* A wheel over something that scrolls on its own — the quick-view sheet,
     a swipe strip, a long form — belongs to that element until it runs out of
     room in the direction of travel. */
  function ownScroller(node, dy) {
    for (var el = node; el && el.nodeType === 1 && el !== document.body && el !== root; el = el.parentElement) {
      if (el.hasAttribute('data-native-scroll')) return true;
      if (el.scrollHeight > el.clientHeight + 1) {
        var oy = window.getComputedStyle(el).overflowY;
        if (oy === 'auto' || oy === 'scroll') {
          if (dy < 0 ? el.scrollTop > 0 : el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true;
        }
      }
    }
    return false;
  }

  function onWheel(event) {
    if (!state.on || event.defaultPrevented || event.ctrlKey || locked()) return;
    var dy = event.deltaY;
    if (Math.abs(event.deltaX) > Math.abs(dy)) return;   /* sideways swipes stay native */
    if (ownScroller(event.target, dy)) return;

    event.preventDefault();
    if (event.deltaMode === 1) dy *= STEP_LINE;
    else if (event.deltaMode === 2) dy *= window.innerHeight;

    if (!state.frame) state.current = state.target = window.scrollY;
    state.glide = null;
    state.target = clampY(state.target + dy);
    run();
  }

  /* Native scrolling (keys, scrollbar, find-in-page) wins outright: the
     easing lets go and picks up from wherever the page ends up. */
  function onNativeScroll() {
    if (!state.frame) state.current = state.target = window.scrollY;
  }

  var SCROLL_KEYS = [' ', 'PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown'];

  function onKey(event) {
    if (state.frame && SCROLL_KEYS.indexOf(event.key) !== -1) stop();
  }

  /* Grabbing the scrollbar (or anything else) mid-glide hands control back. */
  function onPointerDown() {
    if (state.frame) stop();
  }

  function setEnabled() {
    var want = finePointer.matches && !reduce.matches;
    if (want === state.on) return;
    state.on = want;
    /* Each frame is an instant jump; a smooth scroll-behavior would turn every
       one of them into its own little animation and the page would lag. */
    root.style.scrollBehavior = want ? 'auto' : '';
    if (!want) stop();
  }

  /* ── Anchor glides ────────────────────────────────────────────────────── */

  function headerOffset() {
    var bar = document.querySelector('.site-header, .nav');
    var bottom = bar ? bar.getBoundingClientRect().bottom : 0;
    return Math.max(0, bottom) + 12;
  }

  function focusTarget(el) {
    if (!el.matches('a[href], button, input, select, textarea, [tabindex]')) {
      el.setAttribute('tabindex', '-1');
    }
    try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
  }

  function glideTo(target, done) {
    var el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return;
    var y = clampY(el.getBoundingClientRect().top + window.scrollY - headerOffset());
    var finish = function () { focusTarget(el); if (done) done(); };

    if (state.on && !locked()) {
      var from = window.scrollY;
      var distance = Math.abs(y - from);
      state.current = from;
      state.glide = {
        from: from,
        to: y,
        start: window.performance.now(),
        duration: Math.min(1500, Math.max(600, 420 + distance * 0.22)),
        done: finish
      };
      run();
    } else {
      window.scrollTo({ top: y, behavior: reduce.matches ? 'auto' : 'smooth' });
      finish();
    }
  }

  function onClick(event) {
    if (event.defaultPrevented || event.button !== 0 ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var link = event.target.closest && event.target.closest('a[href*="#"]');
    if (!link || link.target) return;

    var url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin ||
        url.pathname !== window.location.pathname ||
        url.search !== window.location.search ||
        url.hash.length < 2) return;

    var el = document.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (!el) return;

    event.preventDefault();
    if (window.location.hash !== url.hash) window.history.pushState(null, '', url.hash);
    glideTo(el);
  }

  /* ── Reveals ──────────────────────────────────────────────────────────── */

  var STAGGER = 90;   /* ms between items that arrive in the same batch */
  var MAX_STEPS = 7;

  function initReveals() {
    var items = [].slice.call(document.querySelectorAll('[data-reveal]'));
    if (!items.length) return;

    if (!root.classList.contains('motion-ready')) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      var arriving = entries
        .filter(function (entry) { return entry.isIntersecting; })
        .map(function (entry) { return entry.target; })
        .sort(function (a, b) {
          var ra = a.getBoundingClientRect();
          var rb = b.getBoundingClientRect();
          return (Math.round(ra.top / 40) - Math.round(rb.top / 40)) || (ra.left - rb.left);
        });

      arriving.forEach(function (el, index) {
        var own = parseInt(el.getAttribute('data-reveal-delay'), 10) || 0;
        var delay = own + Math.min(index, MAX_STEPS) * STAGGER;
        el.style.setProperty('--reveal-delay', delay + 'ms');
        el.classList.add('is-in');
        observer.unobserve(el);
        /* The delay is for the entrance only. Left in place it would also hold
           back every hover transition that shares the same declaration. */
        window.setTimeout(function () { el.style.removeProperty('--reveal-delay'); }, delay + 1800);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

    items.forEach(function (el) { observer.observe(el); });
  }

  /* ── Wiring ───────────────────────────────────────────────────────────── */

  window.APMotion = {
    lock: function () { state.locks += 1; stop(); },
    unlock: function () { state.locks = Math.max(0, state.locks - 1); stop(); },
    glideTo: glideTo,
    /* For content added after load (nothing yet — kept for the shop). */
    reveal: function (el) { el.classList.add('is-in'); }
  };

  function boot() {
    setEnabled();
    initReveals();
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('scroll', onNativeScroll, { passive: true });
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('resize', function () { state.target = clampY(state.target); });
    document.addEventListener('click', onClick);
    if (finePointer.addEventListener) {
      finePointer.addEventListener('change', setEnabled);
      reduce.addEventListener('change', setEnabled);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
