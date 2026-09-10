/* ===== PDS — PUNE city-specific ===== */
// Ghost Marathi word tilts gently as you scroll — a page turning
// (overrides shared parallax for Pune's tilt behaviour)
const bgWordPune = document.querySelector('.bg-word');
const reduceMotionPune = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (bgWordPune && !reduceMotionPune) {
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const y = window.scrollY;
        bgWordPune.style.transform = `translate(-50%, calc(-50% + ${y * 0.1}px)) rotate(${-y * 0.005}deg)`;
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}