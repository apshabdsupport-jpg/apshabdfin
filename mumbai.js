/* ===== PDS — MUMBAI city-specific ===== */
// Ghost Marathi word slides SIDEWAYS with scroll — like a passing train
// (overrides the shared vertical parallax for Mumbai only)
const bgWordMumbai = document.querySelector('.bg-word');
const reduceMotionMumbai = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (bgWordMumbai && !reduceMotionMumbai) {
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const y = window.scrollY;
        bgWordMumbai.style.transform = `translate(calc(-50% + ${y * 0.18}px), -50%)`;
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}