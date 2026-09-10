/* ===== PDS — SHARED CITY JS ===== */
/* Cursor lives in cursor.js (shared across all pages) */

// ─── BG WORD PARALLAX ────────────────────────────────────────────────────────
const bgWord = document.querySelector('.bg-word');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (bgWord && !reduceMotion) {
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const depth = Math.min(y * 0.08, 60); // push deeper as user scrolls
        bgWord.style.transform = `translate(-50%, calc(-50% + ${y * 0.14}px)) rotate(${y * 0.005}deg) translateZ(${-depth}px)`;
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
  // Mouse drift with depth
  document.addEventListener('mousemove', e => {
    const dx = (e.clientX / window.innerWidth  - .5) * -30;
    const dy = (e.clientY / window.innerHeight - .5) * -20;
    const dz = (e.clientY / window.innerHeight - .5) * -15;
    bgWord.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) translateZ(${dz}px)`;
  });
}

// ─── LETTER SCRAMBLE ─────────────────────────────────────────────────────────
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#✦$%&?';
function scramble(el) {
  const original = el.dataset.text || el.textContent.trim();
  el.dataset.text = original;
  let frame = 0;
  const totalFrames = 22;
  const id = setInterval(() => {
    el.textContent = original.split('').map((ch, i) => {
      if (ch === ' ') return ' ';
      if (frame / totalFrames > i / original.length) return ch;
      return CHARS[Math.floor(Math.random() * CHARS.length)];
    }).join('');
    if (++frame > totalFrames) { el.textContent = original; clearInterval(id); }
  }, 38);
}

window.addEventListener('load', () => {
  setTimeout(() => {
    document.querySelectorAll('.hero-title span').forEach((span, i) => {
      setTimeout(() => scramble(span), i * 180);
    });
  }, 250);
});

// ─── 3D CARD TILT ─────────────────────────────────────────────────────────────────
document.querySelectorAll('.card').forEach(card => {
  card.addEventListener('mousemove', e => {
    const rect  = card.getBoundingClientRect();
    const cx    = rect.left + rect.width  / 2;
    const cy    = rect.top  + rect.height / 2;
    const rotX  = ((e.clientY - cy) / (rect.height / 2)) * -12;
    const rotY  = ((e.clientX - cx) / (rect.width  / 2)) *  12;
    card.style.transform    = `perspective(700px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(20px) scale(1.03)`;
    card.style.boxShadow    = `${-rotY * 1.5}px ${rotX + 22}px 44px rgba(0,0,0,.32), 0 4px 12px rgba(0,0,0,.18)`;
    card.style.transition   = 'box-shadow .15s, transform .08s';
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform  = '';
    card.style.boxShadow  = '';
    card.style.transition = 'transform .6s cubic-bezier(.2,.8,.2,1), box-shadow .6s';
  });
});

// ─── MAGNETIC CTA ────────────────────────────────────────────────────────────
document.querySelectorAll('.cta').forEach(el => {
  el.addEventListener('mousemove', e => {
    const rect = el.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width  / 2);
    const dy = e.clientY - (rect.top  + rect.height / 2);
    el.style.transform = `translate(${dx * 0.2}px, ${dy * 0.2 - 3}px)`;
  });
  el.addEventListener('mouseleave', () => { el.style.transform = ''; });
});

// ─── MARQUEE PAUSE ───────────────────────────────────────────────────────────
document.querySelectorAll('.marquee-track, .marquee-track.rev').forEach(t => {
  t.parentElement.addEventListener('mouseenter', () => t.style.animationPlayState = 'paused');
  t.parentElement.addEventListener('mouseleave', () => t.style.animationPlayState = '');
});

// ─── SCROLL REVEAL ───────────────────────────────────────────────────────────
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      entry.target.style.transitionDelay = `${(i % 4) * 90}ms`;
      entry.target.classList.add('in');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
