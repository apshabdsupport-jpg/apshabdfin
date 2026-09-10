/* ═══════════════════════════════════════════════════════
   PDS — 3D EFFECTS ENGINE
   Parallax depth · Particles · Shine · 3D Reveals
═══════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouchDevice = window.matchMedia('(hover: none)').matches;

  /* ── 1. AMBIENT FLOATING PARTICLES ───────────────────── */
  function spawnParticles(count = 10) {
    const container = document.createElement('div');
    container.className = 'particles-container';
    container.setAttribute('aria-hidden', 'true');
    document.body.appendChild(container);

    // Get accent color from CSS custom property, fallback to gold
    const cs = getComputedStyle(document.documentElement);
    const acc = cs.getPropertyValue('--acc')?.trim() || cs.getPropertyValue('--yellow')?.trim() || '#f5b301';

    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'particle';

      const size = 1.5 + Math.random() * 3; // 1.5–4.5px
      const x = Math.random() * 100;
      const z = -100 + Math.random() * 200;  // depth scatter
      const dur = 18 + Math.random() * 30;   // 18–48s to cross screen
      const delay = -(Math.random() * dur);   // stagger start
      const opacity = 0.12 + Math.random() * 0.25;

      p.style.cssText = `
        width: ${size}px; height: ${size}px;
        left: ${x}%;
        background: ${acc};
        box-shadow: 0 0 ${size * 2}px ${acc};
        --pz: ${z}px;
        --ps: ${(1 + z / 400).toFixed(2)};
        --po: ${opacity.toFixed(2)};
        animation-duration: ${dur.toFixed(1)}s;
        animation-delay: ${delay.toFixed(1)}s;
      `;
      container.appendChild(p);
    }
  }

  /* ── 2. HERO DEPTH PARALLAX (mouse-driven) ───────────── */
  function initHeroDepth() {
    const layers = document.querySelectorAll('[data-depth]');
    if (!layers.length) return;

    // One style write per frame, not one per mouse event. A fast
    // mouse fires far more often than the screen refreshes, and
    // writing transforms on every event is what made the headline
    // judder instead of glide.
    let cx = 0, cy = 0, queued = false;

    function paint() {
      queued = false;
      layers.forEach(el => {
        const depth = parseFloat(el.dataset.depth) || 0;
        const tx = cx * depth * 15;
        const ty = cy * depth * 10;
        const rY = cx * depth * 2;
        const rX = -cy * depth * 1.5;
        // Big Z spread so the headline lines sit at genuinely
        // different distances, not just different speeds.
        el.style.transform = `translate3d(${tx}px, ${ty}px, ${depth * 55}px) rotateY(${rY}deg) rotateX(${rX}deg)`;
      });
    }

    document.addEventListener('mousemove', e => {
      cx = (e.clientX / window.innerWidth  - 0.5) * 2; // -1 → 1
      cy = (e.clientY / window.innerHeight - 0.5) * 2;
      if (!queued) { queued = true; requestAnimationFrame(paint); }
    }, { passive: true });
  }

  /* ── 3. 3D TILT ON HOVER ─────────────────────────────── */
  function initTilt3D() {
    document.querySelectorAll('.tilt-3d, [data-3d-tilt]').forEach(el => {
      const intensity = parseFloat(el.dataset['3dTilt']) || 8;

      el.addEventListener('mousemove', e => {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const rotX = ((e.clientY - cy) / (rect.height / 2)) * -intensity;
        const rotY = ((e.clientX - cx) / (rect.width / 2)) * intensity;
        el.style.transform = `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(12px) scale(1.02)`;
        el.style.boxShadow = `${-rotY * 1.5}px ${rotX + 20}px 40px rgba(0,0,0,.25), 0 4px 12px rgba(0,0,0,.15)`;
      });

      el.addEventListener('mouseleave', () => {
        el.style.transform = '';
        el.style.boxShadow = '';
      });
    });
  }

  /* ── 4. CARD SHINE SWEEP ─────────────────────────────── */
  function initCardShine() {
    document.querySelectorAll('.card').forEach(card => {
      // Inject shine overlay if not present
      if (!card.querySelector('.card-shine')) {
        const shine = document.createElement('div');
        shine.className = 'card-shine';
        card.style.position = 'relative';
        card.appendChild(shine);
      }

      const shine = card.querySelector('.card-shine');

      card.addEventListener('mousemove', e => {
        const rect = card.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        shine.style.background = `radial-gradient(circle at ${x}% ${y}%, rgba(255,255,255,.15) 0%, rgba(255,255,255,.05) 30%, transparent 60%)`;
        shine.style.opacity = '1';
      });

      card.addEventListener('mouseleave', () => {
        shine.style.opacity = '0';
      });
    });
  }

  /* ── 5. 3D SECTION REVEALS ───────────────────────────── */
  function initReveals3D() {
    const sections = document.querySelectorAll('.section, .wait-section');
    sections.forEach(el => {
      if (!el.classList.contains('reveal-3d')) {
        el.classList.add('reveal-3d');
      }
    });

    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });

    document.querySelectorAll('.reveal-3d').forEach(el => io.observe(el));
  }

  /* ── 6. SCROLL PERSPECTIVE SHIFT ─────────────────────── */
  function initScrollPerspective() {
    let ticking = false;

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
          const pct = maxScroll > 0 ? scrollY / maxScroll : 0;

          // Shift perspective origin subtly based on scroll
          const originY = 40 + pct * 20; // 40% → 60%
          document.body.style.setProperty('--scroll-pct', pct.toFixed(3));

          // Apply to perspective-wrap if present
          const wrap = document.querySelector('.perspective-wrap');
          if (wrap) {
            wrap.style.perspectiveOrigin = `50% ${originY}%`;
          }

          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  /* ── 7. MARQUEE 3D ───────────────────────────────────── */
  function initMarquee3D() {
    document.querySelectorAll('.marquee').forEach(m => {
      m.classList.add('marquee-3d');
    });
  }

  /* ── 8. FOOTER 3D PULSE ──────────────────────────────── */
  function initFooter3D() {
    document.querySelectorAll('.footer-big').forEach(fb => {
      fb.classList.add('footer-3d-pulse');
      fb.style.transformStyle = 'preserve-3d';
    });
  }

  /* ── 9. STICKER / HERO-STICKER 3D FLOAT ──────────────── */
  function initStickerFloat() {
    // The hero sticker is driven by cinematic.js (float + mouse
    // tumble in one transform), so only the city tiles float here.
    const sticker = document.querySelector('.logo-tile');
    if (!sticker) return;
    sticker.classList.add('float-3d');
  }

  /* ── INIT ─────────────────────────────────────────────── */
  function boot() {
    // Ambient particles removed: ten perpetually-animating dots over
    // every page kept the compositor awake for decoration nobody was
    // looking at, and the drifting specks read as dust on the screen.
    // spawnParticles() is kept above in case a single-scene use comes back.

    // Mouse-dependent effects — desktop only
    if (!isTouchDevice && !reduce) {
      initHeroDepth();
      initTilt3D();
      initCardShine();
    }

    // Scroll-driven effects — everyone
    if (!reduce) {
      initReveals3D();
      initScrollPerspective();
      initMarquee3D();
      initFooter3D();
      initStickerFloat();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
