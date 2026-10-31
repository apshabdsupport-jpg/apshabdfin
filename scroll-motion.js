(() => {
  'use strict';

  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const shortViewport = window.matchMedia('(max-height: 480px)');
  const compact = window.matchMedia('(max-width: 820px)');
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const select = (selector) => [...document.querySelectorAll(selector)];
  const hero = document.querySelector('.hero');
  const heroPhoto = document.querySelector('.hero-image');
  const reel = document.querySelector('[data-campaign-reel]');
  const stage = reel?.querySelector('.campaign-stage');
  const viewport = reel?.querySelector('.campaign-viewport');
  const track = reel?.querySelector('.campaign-track');
  const cards = select('.campaign-track .campaign-card');
  const segments = select('.reel-progress > span');
  const counter = document.querySelector('[data-reel-current]');
  const previous = document.querySelector('[data-reel-prev]');
  const next = document.querySelector('[data-reel-next]');
  const wall = document.querySelector('[data-wall]');
  const columns = select('[data-wall-speed]');
  const question = document.querySelector('.route-question');
  const questionLines = select('.tw-line');
  const cities = document.querySelector('.cities-layout');
  const pin = document.querySelector('.pin-cta');
  const footer = document.querySelector('.site-footer');
  let measurements;
  let frame = 0;
  let needsMeasure = true;
  let currentCard = -1;

  // offsetTop ignores animated transforms. Keeping those out of measurements
  // prevents feedback and means scrolling only does arithmetic and style writes.
  const documentTop = (element) => {
    let top = 0;
    for (let node = element; node; node = node.offsetParent) top += node.offsetTop;
    return top;
  };
  const measureElement = (element) => element ? {
    element, top: documentTop(element), height: element.offsetHeight
  } : null;

  const measure = () => {
    const reelTop = reel ? documentTop(reel) - 64 : 0;
    measurements = {
      height: window.innerHeight,
      width: window.innerWidth,
      hero: measureElement(hero),
      heroPhoto: measureElement(heroPhoto),
      ink: select('.ink-line').map(measureElement),
      headings: select('.heading-line').map(measureElement),
      wall: measureElement(wall),
      frames: select('[data-wall-item]').map((element, index) => ({
        ...measureElement(element), index, column: columns.indexOf(element.parentElement)
      })),
      question: measureElement(question),
      cities: measureElement(cities),
      rows: select('.city-row').map(measureElement),
      pin: measureElement(pin),
      footer: measureElement(footer),
      reel: {
        top: reelTop,
        range: reel && stage ? Math.max(1, reel.offsetHeight - stage.offsetHeight) : 1,
        distance: track && viewport ? Math.max(0, track.scrollWidth - viewport.clientWidth) : 0,
        cards: cards.map((element) => ({ left: element.offsetLeft, width: element.offsetWidth })),
        width: viewport?.clientWidth || 0
      }
    };
    needsMeasure = false;
  };

  const set = (element, name, value) => element?.style.setProperty(name, String(value));
  const pixels = (value) => `${value.toFixed(2)}px`;
  const visible = (item, y, padding = 160) => item &&
    item.top + item.height > y - padding && item.top < y + measurements.height + padding;
  const entrance = (top, y) => clamp((y + measurements.height * .93 - top) / (measurements.height * .55));

  const draw = () => {
    frame = 0;
    if (reducedMotion.matches) return;
    if (needsMeasure) measure();
    const m = measurements;
    const y = window.scrollY;
    const vh = m.height;

    if (visible(m.hero, y)) {
      set(hero, '--hero-leave', clamp(y / Math.min(m.hero.height, vh)).toFixed(4));
      const photoTravel = clamp((y + vh - m.heroPhoto.top) / (vh + m.heroPhoto.height));
      set(hero, '--hero-photo-y', pixels((photoTravel - .5) * 64));
      set(hero, '--hero-photo-scale', (1.12 + photoTravel * .12).toFixed(4));
    }

    m.ink.forEach((line) => {
      const progress = entrance(line.top, y);
      set(line.element, '--ink-fill', `${(progress * 100).toFixed(2)}%`);
      set(line.element, '--ink-x', pixels((1 - progress) * -20));
      set(line.element, '--underline', clamp((progress - .5) * 2).toFixed(4));
    });

    m.headings.forEach((line, index) => {
      if (!visible(line, y)) return;
      const progress = entrance(line.top, y);
      set(line.element, '--line-x', pixels((1 - progress) * (index % 2 ? 44 : -44)));
      set(line.element, '--line-opacity', (.4 + progress * .6).toFixed(3));
    });

    // Native vertical scrolling drives a sticky contact sheet. No wheel or
    // touch interception; anchors and browser history keep their usual behavior.
    if (reel && !shortViewport.matches) {
      const p = clamp((y - m.reel.top) / m.reel.range);
      const travel = p * m.reel.distance;
      set(track, '--reel-x', pixels(-travel));
      if (y > m.reel.top - vh && y < m.reel.top + m.reel.range + vh) {
        m.reel.cards.forEach((card, index) => {
          const center = card.left + card.width / 2 - travel;
          const distance = clamp((center - m.reel.width / 2) / m.reel.width, -1, 1);
          set(cards[index], '--card-pan', pixels(distance * -24));
          set(cards[index], '--card-inset', `${(Math.abs(distance) * 3).toFixed(3)}%`);
        });
      }
      segments.forEach((segment, index) => {
        set(segment, '--segment-fill', clamp(p * (cards.length - 1) - index + 1).toFixed(4));
      });
      const cardIndex = Math.round(p * (cards.length - 1));
      if (cardIndex !== currentCard) {
        currentCard = cardIndex;
        if (counter) counter.textContent = String(currentCard + 1).padStart(2, '0');
        if (previous) previous.disabled = currentCard === 0;
        if (next) next.disabled = currentCard === cards.length - 1;
      }
    }

    if (visible(m.wall, y, 400)) {
      const p = clamp((y + vh - m.wall.top) / (vh + m.wall.height));
      const shifts = columns.map((column) => {
        const shift = compact.matches ? 0 : (p - .5) * Number(column.dataset.wallSpeed) * 2200;
        set(column, '--wall-shift', pixels(shift));
        return shift;
      });
      m.frames.forEach((item) => {
        const top = item.top + (shifts[item.column] || 0);
        if (!visible({ ...item, top }, y, 400)) return;
        const p = entrance(top, y);
        set(item.element, '--frame-y', pixels((1 - p) * 44));
        set(item.element, '--frame-r', `${((1 - p) * (item.index % 2 ? 2.5 : -2.5)).toFixed(3)}deg`);
        set(item.element, '--frame-scale', (.94 + p * .06).toFixed(4));
      });
    }

    if (visible(m.question, y)) {
      const progress = entrance(m.question.top + m.question.height * .25, y);
      questionLines.forEach((line, index) => {
        set(line, '--question-x', pixels((1 - progress) * (index % 2 ? 44 : -44)));
      });
    }

    m.rows.forEach((row) => {
      if (!visible(row, y)) return;
      const p = entrance(row.top, y);
      set(row.element, '--row-x', pixels((1 - p) * 56));
      set(row.element, '--row-opacity', (.25 + p * .75).toFixed(3));
    });
    if (visible(m.cities, y)) {
      const progress = clamp((y + vh - m.cities.top) / (vh + m.cities.height));
      set(cities, '--city-zoom', (1.12 - progress * .12).toFixed(4));
    }

    if (visible(m.pin, y)) {
      const p = clamp((y + vh - m.pin.top) / (vh + m.pin.height));
      set(pin, '--pin-turn', `${(-16 + p * 30).toFixed(3)}deg`);
      set(pin, '--pin-scale', (.84 + p * .22).toFixed(4));
      set(pin, '--pin-star', `${(p * 150).toFixed(3)}deg`);
    }
    if (visible(m.footer, y)) {
      // Finish by the bottom of the document, including on tall viewports.
      const travel = Math.max(1, Math.min(vh * .55, m.footer.height));
      const p = clamp((y + vh - m.footer.top) / travel);
      set(footer, '--footer-y', pixels((1 - p) * 50));
      set(footer, '--footer-scale', (.88 + p * .12).toFixed(4));
      set(footer, '--footer-clip', `${((1 - p) * 100).toFixed(2)}%`);
    }
  };

  const requestDraw = () => {
    if (!frame && !reducedMotion.matches) frame = window.requestAnimationFrame(draw);
  };
  const invalidate = () => { needsMeasure = true; requestDraw(); };
  const syncMotion = () => {
    root.classList.toggle('motion-ready', !reducedMotion.matches);
    columns.forEach((column) => set(column, '--wall-shift', '0px'));
    if (reducedMotion.matches) {
      window.cancelAnimationFrame(frame);
      frame = 0;
    } else invalidate();
  };
  const goToCard = (direction) => {
    if (!measurements || reducedMotion.matches || shortViewport.matches) return;
    const index = clamp(currentCard + direction, 0, cards.length - 1);
    window.scrollTo({
      top: measurements.reel.top + index / (cards.length - 1) * measurements.reel.range,
      behavior: 'smooth'
    });
  };
  previous?.addEventListener('click', () => goToCard(-1));
  next?.addEventListener('click', () => goToCard(1));
  window.addEventListener('scroll', requestDraw, { passive: true });
  window.addEventListener('resize', invalidate);
  window.addEventListener('pageshow', invalidate);
  window.addEventListener('load', invalidate, { once: true });
  document.fonts?.ready.then(invalidate);
  reducedMotion.addEventListener('change', syncMotion);
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(invalidate);
    const main = document.querySelector('main');
    if (main) observer.observe(main);
  }
  syncMotion();
})();
