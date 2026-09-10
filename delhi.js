/* ===== PDS — DELHI city-specific ===== */
// Ghost Hindi word rises slowly — like a monument emerging
// (overrides shared parallax for Delhi's unique upward float)
const bgWordDelhi = document.querySelector('.bg-word');
const reduceMotionDelhi = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (bgWordDelhi && !reduceMotionDelhi) {
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const y = window.scrollY;
        bgWordDelhi.style.transform = `translate(-50%, calc(-50% - ${y * 0.08}px)) scale(${1 + y * 0.0002})`;
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}