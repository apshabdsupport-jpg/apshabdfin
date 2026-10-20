/* Reference-inspired motion, using APSHABD's existing type, ink and paper. */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (!('IntersectionObserver' in window) || !Element.prototype.animate) return;
  const active = new Set();
  const ease = 'cubic-bezier(.16,1,.3,1)';
  function play(el, frames, options) {
    if (reduced.matches) return;
    const animation = el.animate(frames, options);
    active.add(animation);
    animation.onfinish = animation.oncancel = () => active.delete(animation);
  }
  const tasks = new Map();
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      if (!reduced.matches) tasks.get(entry.target)?.();
      tasks.delete(entry.target);
    });
  }, { threshold: .12, rootMargin: '0px 0px -5% 0px' });
  function onArrival(el, fn) { tasks.set(el, fn); observer.observe(el); }

  // Animate whole lines: local scripts retain their natural shaping and spacing.
  document.querySelectorAll('.manifesto-title, .campaign-heading h2, .join-title, .shop-head h2, header.hero .hero-title').forEach(heading => {
    if (heading.matches('header.hero .hero-title')) {
      onArrival(heading, () => {
        heading.querySelectorAll(':scope > span').forEach((line, i) => {
          play(line, [
            { clipPath: 'inset(0 0 100% 0)', translate: `${i % 2 ? 24 : -24}px 20px` },
            { clipPath: 'inset(-15% -10% -20% -10%)', translate: '0 0' }
          ], { duration: 1150, delay: i * 110, easing: ease });
        });
      });
      return;
    }
    onArrival(heading, () => play(heading, [
      { clipPath: 'inset(0 0 100% 0)', translate: '0 28px' },
      { clipPath: 'inset(-15% -10% -20% -10%)', translate: '0 0' }
    ], { duration: 1100, easing: ease }));
  });

  // A physical paper curtain travels across the photograph, rather than fading it.
  document.querySelectorAll('.campaign-card, [data-reveal="frame"], .pcard-media').forEach((frame, i) => {
    frame.classList.add('studio-frame');
    const curtain = document.createElement('span');
    curtain.className = 'studio-curtain';
    curtain.setAttribute('aria-hidden', 'true');
    frame.append(curtain);
    onArrival(frame, () => play(curtain, [
      { transform: 'translateX(0)', visibility: 'visible' },
      { transform: `translateX(${i % 2 ? '-' : ''}101%)`, visibility: 'visible' }
    ], { duration: 1050, delay: (i % 4) * 65, easing: ease }));
  });

  // Existing section borders get a single drawn-in accent in the brand red.
  document.querySelectorAll('.shop-head, .section-index').forEach(el => {
    el.classList.add('studio-rule');
    const rule = document.createElement('span');
    rule.className = 'studio-rule-ink';
    rule.setAttribute('aria-hidden', 'true');
    el.append(rule);
    onArrival(el, () => play(rule, [
      { transform: 'scaleX(0)', opacity: 1 },
      { transform: 'scaleX(1)', opacity: 1, offset: .7 },
      { transform: 'scaleX(1)', opacity: 0 }
    ], { duration: 1500, easing: ease }));
  });

  document.querySelectorAll('.footer-logo img, .city-footer-brand img').forEach(el => {
    onArrival(el, () => play(el, [
      { clipPath: 'inset(100% 0 0 0)', translate: '0 18px' },
      { clipPath: 'inset(0)', translate: '0 0' }
    ], { duration: 1300, easing: ease }));
  });

  // Enhance the existing mobile menu without changing its controls or focus rules.
  const menu = document.querySelector('.site-nav');
  if (menu) {
    new MutationObserver(() => {
      if (!menu.classList.contains('is-open') || innerWidth > 820 || reduced.matches) return;
      play(menu, [{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0)' }], { duration: 650, easing: ease });
      menu.querySelectorAll('a').forEach((link, i) => play(link, [
        { opacity: 0, translate: '0 24px' }, { opacity: 1, translate: '0 0' }
      ], { duration: 650, delay: 120 + i * 65, easing: ease, fill: 'backwards' }));
    }).observe(menu, { attributes: true, attributeFilter: ['class'] });
  }
  reduced.addEventListener('change', () => {
    if (reduced.matches) active.forEach(animation => animation.cancel());
  });
})();
