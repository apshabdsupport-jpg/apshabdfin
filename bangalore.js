/* ===== PDS — BANGALORE city-specific ===== */
// Terminal typing — lines cycle like a deploy log
const lines = [
  '> importing garden_city...',
  '> compiling silence.kt ... done',
  '> traffic detected. patience: MAX',
  '> deploying drop_001 to your street...'
];
const typeLine = document.getElementById('typeLine');
const reduceMotionBlr = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let li = 0, ci = 0;

function type() {
  if (reduceMotionBlr) { if (typeLine) typeLine.textContent = lines[3]; return; }
  if (!typeLine) return;
  const line = lines[li];
  if (ci <= line.length) {
    typeLine.textContent = line.slice(0, ci++);
    setTimeout(type, 45);
  } else {
    setTimeout(() => {
      ci = 0; li = (li + 1) % lines.length;
      type();
    }, 1800);
  }
}
type();

// Ghost Kannada word zooms subtly with scroll — like leaning into a screen
// (overrides the shared parallax for Bangalore only)
const bgWordBlr = document.querySelector('.bg-word');
if (bgWordBlr && !reduceMotionBlr) {
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const y = window.scrollY;
        bgWordBlr.style.transform = `translate(-50%, calc(-50% + ${y * 0.09}px)) scale(${1 + y * 0.00035})`;
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}