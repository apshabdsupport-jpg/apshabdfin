/* ═══════════════════════════════════════════════════════
   PDS — PIN CURSOR (shared, all pages)
   Injects its own DOM. Desktop + fine pointer only.
═══════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var fine   = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!fine || reduce) return;

  var root = document.documentElement;
  var body = document.body;

  // Build cursor DOM
  var ring = document.createElement('div');
  ring.className = 'pds-ring';
  ring.setAttribute('aria-hidden', 'true');
  var arc = document.createElement('div');
  arc.className = 'pds-ring-arc';
  var label = document.createElement('span');
  label.className = 'pds-ring-label';
  ring.appendChild(arc);
  ring.appendChild(label);

  var dot = document.createElement('div');
  dot.className = 'pds-dot';
  dot.setAttribute('aria-hidden', 'true');

  body.appendChild(ring);
  body.appendChild(dot);

  root.classList.add('pds-cursor-on');
  body.classList.add('pds-out'); // hidden until first move

  var mx = window.innerWidth / 2, my = window.innerHeight / 2;
  var rx = mx, ry = my;

  document.addEventListener('mousemove', function (e) {
    mx = e.clientX; my = e.clientY;
    dot.style.left = mx + 'px';
    dot.style.top  = my + 'px';
    body.classList.remove('pds-out');
  }, { passive: true });

  // Ring trails the pin with a soft lag
  (function trail() {
    rx += (mx - rx) * 0.16;
    ry += (my - ry) * 0.16;
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';
    requestAnimationFrame(trail);
  })();

  // Hover states via delegation (works for injected elements too)
  var HOVER = 'a, button, [data-cursor], .card, .cta, .city-card, .city-row';
  var TEXT  = 'input[type="text"], input[type="email"], input:not([type]), textarea';

  document.addEventListener('mouseover', function (e) {
    if (!(e.target instanceof Element)) return;
    var t   = e.target.closest(HOVER);
    var txt = e.target.closest(TEXT);

    body.classList.toggle('pds-text', !!txt);
    body.classList.toggle('pds-hover', !!t && !txt);

    var tag = (t && !txt) ? (t.getAttribute('data-cursor') || '') : '';
    label.textContent = tag;
    body.classList.toggle('pds-label', tag.length > 0);
  }, { passive: true });

  // Press feedback + pin-drop ripple
  document.addEventListener('mousedown', function (e) {
    body.classList.add('pds-down');
    drop(e.clientX, e.clientY);
  }, { passive: true });

  document.addEventListener('mouseup', function () {
    body.classList.remove('pds-down');
  }, { passive: true });

  function drop(x, y) {
    for (var i = 0; i < 2; i++) {
      var r = document.createElement('div');
      r.className = 'pds-ripple';
      r.style.left = x + 'px';
      r.style.top  = y + 'px';
      r.style.animationDelay = (i * 120) + 'ms';
      body.appendChild(r);
      r.addEventListener('animationend', function () {
        if (this.parentNode) this.parentNode.removeChild(this);
      });
    }
  }

  // Hide when the mouse leaves the window
  document.addEventListener('mouseleave', function () {
    body.classList.add('pds-out');
  });
  document.addEventListener('mouseenter', function () {
    body.classList.remove('pds-out');
  });
  window.addEventListener('blur', function () {
    body.classList.add('pds-out');
  });
})();
