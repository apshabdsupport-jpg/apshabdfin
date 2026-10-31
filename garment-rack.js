// The clothes rail on the city pages. Tees hang side-on along a chrome rail
// and swing round to face you as the pointer passes; click one and it comes
// off the rail while the rest of the rack drops out of focus. Colourways hang
// beside it as swing tags, and front/back turns it on its hook.
//
// The product grid stays in the page as the source of truth: names, scripts,
// copy and colourways are read from it, colour picks are written back to it,
// and "Grid view" shows it again. Hanging shots live in assets/rack/<city>/.
(() => {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const fineHover = window.matchMedia('(hover: hover) and (pointer: fine)');
  const make = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };
  const pad = (n) => String(n).padStart(2, '0');
  const capital = (word) => word.replace(/(^|[\s-])\S/g, (c) => c.toUpperCase());
  const scripts = { mumbai: 'mr', chennai: 'ta', delhi: 'hi' };

  const SIDE_ON = 74;          // degrees: turned away, but still reads as a tee
  const preloaded = new Map();
  const preload = (src) => {
    if (!preloaded.has(src)) {
      const image = new Image();
      image.decoding = 'async';
      image.src = src;
      preloaded.set(src, image.decode().catch(() => {}));
    }
    return preloaded.get(src);
  };

  // Ink or cream on a swatch, whichever reads.
  function inkFor(hex) {
    const value = parseInt((hex || '#888').replace('#', '').slice(0, 6), 16);
    const r = (value >> 16) & 255, g = (value >> 8) & 255, b = value & 255;
    return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#000f08' : '#f3e6d0';
  }

  // Reads either product markup: the shop cards (.pcard) or the older drop
  // tiles (.drop).
  function mount(source) {
    if (source.dataset.rackMounted) return null;
    const city = source.dataset.city || source.querySelector('[data-city]')?.dataset.city || 'mumbai';
    const cityName = capital(city);
    const products = [...source.querySelectorAll('.pcard, .drop')].map((card) => {
      const ways = [...card.querySelectorAll('.pcard-way, .way')];
      if (!ways.length) return null;
      const on = ways.find((way) => way.classList.contains('is-on')) || ways[0];
      return {
        card, ways,
        location: card.dataset.loc,
        name: card.querySelector('.pcard-name, h3')?.textContent.trim() || capital(card.dataset.loc),
        native: card.querySelector('.pcard-script, .drop-head .rg')?.textContent.trim() || '',
        colour: on.dataset.cw,
        view: 'front',
      };
    }).filter(Boolean);
    if (!products.length) return null;
    source.dataset.rackMounted = 'true';

    const shot = (product, view = product.view, colour = product.colour) =>
      `assets/rack/${city}/${product.location}/${colour}-${view}.webp`;
    const wayOf = (product, colour = product.colour) => product.ways.find((way) => way.dataset.cw === colour);
    const colourName = (product, colour) => wayOf(product, colour)?.getAttribute('aria-label') || capital(colour.replaceAll('-', ' '));

    const rack = make('div', 'garment-rack');
    rack.setAttribute('role', 'region');
    rack.setAttribute('aria-label', `${cityName} clothes rail`);
    rack.innerHTML = `
      <div class="rack-bar">
        <span class="rack-count"><i aria-hidden="true"></i><span></span></span>
        <button class="rack-grid-toggle" type="button">Grid view ↗</button>
      </div>
      <div class="rack-scene">
        <div class="rack-rail" aria-hidden="true"></div>
        <div class="rack-items" role="group" aria-label="Tees on the rail"></div>
        <div class="rack-tags" role="group" aria-label="Colourways"></div>
        <div class="rack-caption" aria-hidden="true"><b></b><span></span><button class="rack-pull" type="button" tabindex="-1">Pull it off the rail ↗</button></div>
        <p class="rack-hint" aria-hidden="true"></p>
        <button class="rack-nav rack-prev" type="button" aria-label="Previous tee"><span aria-hidden="true">←</span></button>
        <button class="rack-nav rack-next" type="button" aria-label="Next tee"><span aria-hidden="true">→</span></button>
        <button class="rack-close" type="button">Back to the rail <span aria-hidden="true">×</span></button>
        <div class="rack-detail">
          <p class="rack-index"></p>
          <h3 class="rack-title"></h3>
          <div class="rack-views" role="group" aria-label="Side">
            <button type="button" data-view="front">Front</button>
            <button type="button" data-view="back">Back</button>
          </div>
          <a class="rack-cta" href="drop-a-pin.html">Want it? Drop a pin ↗</a>
        </div>
      </div>
      <div class="rack-ticker" aria-hidden="true"><div class="rack-ticker-track"></div></div>
      <p class="rack-live" aria-live="polite"></p>`;

    const $ = (selector) => rack.querySelector(selector);
    const scene = $('.rack-scene');
    const rail = $('.rack-rail');
    const items = $('.rack-items');
    const tags = $('.rack-tags');
    const caption = $('.rack-caption');
    const hint = $('.rack-hint');
    const title = $('.rack-title');
    const index = $('.rack-index');
    const detail = $('.rack-detail');
    const live = $('.rack-live');
    const viewButtons = [...rack.querySelectorAll('[data-view]')];
    const state = { open: false, active: 0, preview: -1 };
    let slots = [];
    let geometry = { boxW: 0, boxH: 0, railScale: 0.6 };

    $('.rack-count > span').textContent = `${cityName} / ${pad(products.length)} tees on the rail`;
    const tickerWords = [`${cityName} drop 001`, ...products.map((product) => product.name), 'Wear where you’re from'];
    const tickerTrack = $('.rack-ticker-track');
    for (let copy = 0; copy < 4; copy++) {
      tickerWords.forEach((word) => tickerTrack.append(make('span', '', word), make('i', '', '✱')));
    }

    products.forEach((product, i) => {
      const button = make('button', 'rack-item');
      button.type = 'button';
      button.dataset.cursor = 'PULL';
      const turn = make('span', 'rack-turn');
      const photo = make('img', 'rack-photo');
      photo.alt = '';
      photo.draggable = false;
      photo.decoding = 'async';
      photo.src = shot(product, 'front');
      turn.append(photo);
      button.append(turn);
      Object.assign(product, { button, turn, photo });
      button.addEventListener('click', () => {
        if (state.open) {
          if (i !== state.active) go(i);
          return;
        }
        // With a mouse, open what the rail is showing, not whatever slid
        // under the pointer while the neighbours parted.
        open(fineHover.matches && state.preview >= 0 ? state.preview : i);
      });
      button.addEventListener('focus', () => {
        if (!state.open && button.matches(':focus-visible')) preview(i);
      });
      button.addEventListener('keydown', (event) => {
        if (state.open || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? products.length - 1
          : Math.max(0, Math.min(products.length - 1, i + (event.key === 'ArrowRight' ? 1 : -1)));
        products[next].button.focus();
      });
      items.append(button);
    });

    function labelItems() {
      products.forEach((product, i) => {
        const facing = state.open && i === state.active;
        product.button.setAttribute('aria-label', facing
          ? `${product.name} tee, ${colourName(product, product.colour)}, ${product.view}`
          : `${product.name} tee, ${colourName(product, product.colour)}. Pull it off the rail`);
        product.button.tabIndex = state.open && !facing ? -1 : 0;
        product.button.setAttribute('aria-pressed', String(facing));
      });
    }

    function layout() {
      const width = scene.clientWidth;
      const narrow = width < 720;
      rack.classList.toggle('is-narrow', narrow);
      const railY = narrow ? 64 : 72;
      // A pulled tee's box, as big as the width and the screen allow while the
      // longest back shot still clears the title, tags and buttons under it.
      // The wall is then exactly as tall as that needs.
      const below = narrow ? 270 : 170;
      const tallest = Math.min(window.innerHeight * 0.88, 900);
      const boxH = Math.round(Math.max(280, Math.min((tallest - railY - below) / 0.95, (width * (narrow ? 0.86 : 0.44)) / 0.75)));
      scene.style.height = `${Math.round(railY + boxH * 0.95 + below)}px`;
      // Phones have no room beside the tee, so the tags hang under the title.
      const tagHome = narrow ? detail : scene;
      if (tags.parentNode !== tagHome) tagHome.insertBefore(tags, narrow ? detail.querySelector('.rack-views') : caption);
      const boxW = Math.round(boxH * 0.75);
      const railScale = 0.8;
      // Packed close, the way a real rail is.
      const step = Math.min(boxW * railScale * 0.24, (width * 0.6) / products.length);
      slots = products.map((_, i) => (i - (products.length - 1) / 2) * step);
      // Browsing, the rail sits lower so the tees and their caption are
      // centred on the wall; pulling one off lifts everything to the top.
      const height = railY + boxH * 0.95 + below;
      const hung = boxH * railScale * 0.76 + 64;
      const railDrop = Math.max(0, Math.round((height - hung) / 2 - railY));
      geometry = { boxW, boxH, railScale, railY, railDrop, narrow, step };
      rack.style.setProperty('--box-w', `${boxW}px`);
      rack.style.setProperty('--box-h', `${boxH}px`);
      rack.style.setProperty('--rail-y', `${railY}px`);
      rack.style.setProperty('--rail-drop', `${railDrop}px`);
      const reach = (slots[slots.length - 1] || 0) + boxW * railScale * 0.75;
      rail.style.width = `${Math.min(width - 24, Math.round(reach * 2))}px`;
      place();
    }

    function place() {
      const { boxW, railScale, railDrop } = geometry;
      products.forEach((product, i) => {
        // Each half of the rail turns its tees in towards the middle, so both
        // sides show the same sliver of print.
        let x = slots[i], z = i, turn = i <= (products.length - 1) / 2 ? SIDE_ON : -SIDE_ON;
        let scale = railScale, blur = 0, light = 0.82, fade = 1;
        const y = state.open ? 0 : railDrop;
        const facing = state.open ? i === state.active : i === state.preview;
        if (state.open) {
          if (facing) { x = 0; turn = 0; scale = 1; z = 120; light = 1; }
          else {
            const side = i < state.active ? -1 : 1;
            x = slots[i] * 1.5 + side * boxW * 0.66;
            blur = 7; fade = 0.5; scale = railScale * 0.94; light = 0.9;
          }
        } else if (state.preview >= 0) {
          if (facing) { turn = 0; scale = railScale * 1.1; z = 60; light = 1; }
          else x += (i < state.preview ? -1 : 1) * boxW * railScale * 0.4;
        }
        const style = product.button.style;
        style.setProperty('--x', `${x.toFixed(1)}px`);
        style.setProperty('--y', `${y}px`);
        style.setProperty('--z', `${z}px`);
        style.setProperty('--turn', `${turn}deg`);
        style.setProperty('--scale', scale.toFixed(3));
        style.setProperty('--blur', `${blur}px`);
        style.setProperty('--light', light);
        style.setProperty('--fade', fade);
        style.zIndex = facing ? 50 : state.open ? 1 : String(10 + i);
        product.button.classList.toggle('is-facing', facing);
        // Back on the rail, every tee shows its front again.
        if (!facing && product.view !== 'front') {
          product.view = 'front';
          product.photo.src = shot(product);
        }
      });
      rack.classList.toggle('is-open', state.open);
      rack.classList.toggle('is-previewing', !state.open && state.preview >= 0);
      labelItems();
      describe();
    }

    function describe() {
      const shown = state.open ? state.active : state.preview;
      if (!state.open) {
        hint.textContent = fineHover.matches ? 'Run along the rail · click a tee to pull it off' : 'Tap a tee to pull it off the rail';
        if (shown >= 0) {
          const product = products[shown];
          caption.querySelector('b').textContent = product.name;
          caption.querySelector('span').textContent = `${colourName(product, product.colour)} · ${pad(product.ways.length)} colours`;
          caption.style.setProperty('--x', `${slots[shown].toFixed(1)}px`);
        }
        return;
      }
      const product = products[state.active];
      index.textContent = `${pad(state.active + 1)} / ${pad(products.length)} · ${cityName}`;
      title.replaceChildren(document.createTextNode(product.name));
      if (product.native) {
        const native = make('span', 'rack-title-native', product.native);
        native.lang = scripts[city] || '';
        title.append(' ', native);
      }
      viewButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.view === product.view)));
    }

    function hangTags() {
      const product = products[state.active];
      tags.replaceChildren(...product.ways.map((way, k) => {
        const colour = way.dataset.cw;
        const swatch = way.style.getPropertyValue('--sw').trim() || '#888';
        const tag = make('button', 'rack-tag');
        tag.type = 'button';
        tag.style.setProperty('--sw', swatch);
        tag.style.setProperty('--tag-ink', inkFor(swatch));
        // Staggered strings, like tags tied on at different heights.
        tag.style.setProperty('--drop', `${[0, 22, 8, 30, 14, 26][k % 6]}px`);
        tag.setAttribute('aria-label', colourName(product, colour));
        tag.setAttribute('aria-pressed', String(colour === product.colour));
        const card = make('span', 'rack-tag-card');
        card.append(make('span', '', colourName(product, colour)));
        tag.append(card);
        tag.addEventListener('click', () => recolour(product, colour, tag));
        tag.addEventListener('mouseenter', () => preload(shot(product, product.view, colour)));
        return tag;
      }));
      if (!reduced.matches) {
        [...tags.children].forEach((tag, k) => tag.animate(
          [{ rotate: `${k % 2 ? 9 : -9}deg` }, { rotate: `${k % 2 ? -5 : 5}deg` }, { rotate: '2deg' }, { rotate: '0deg' }],
          { duration: 1100, delay: 160 + k * 60, easing: 'ease-out' }));
      }
    }

    function announce() {
      const product = products[state.active];
      live.textContent = `${product.name}, ${colourName(product, product.colour)}, ${product.view}`;
    }

    function open(i) {
      state.open = true;
      state.active = i;
      state.preview = -1;
      const product = products[i];
      preload(shot(product, 'back'));
      product.ways.forEach((way) => preload(shot(product, 'front', way.dataset.cw)));
      hangTags();
      place();
      announce();
      product.button.focus({ preventScroll: true });
    }

    function go(i) {
      if (!state.open) return open(i);
      state.active = (i + products.length) % products.length;
      const product = products[state.active];
      preload(shot(product, 'back'));
      hangTags();
      place();
      announce();
    }

    function close() {
      const last = state.active;
      state.open = false;
      state.preview = fineHover.matches ? -1 : last;
      tags.replaceChildren();
      place();
      products[last].button.focus({ preventScroll: true });
    }

    function preview(i) {
      if (state.open || state.preview === i) return;
      state.preview = i;
      if (i >= 0) preload(shot(products[i], 'front'));
      place();
    }

    // Lift the tee off its hook, swap it while it is out of sight, and let the
    // new one drop back on with a little swing.
    async function rehang(product, change) {
      if (reduced.matches) { await change(); return; }
      const lift = product.turn.animate(
        [{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(-5%)', opacity: 0 }],
        { duration: 200, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' });
      await lift.finished;
      await change();
      const drop = product.turn.animate([
        { transform: 'translateY(-3%) rotate(3deg)', opacity: 0 },
        { transform: 'translateY(0) rotate(-1.6deg)', opacity: 1, offset: 0.45 },
        { transform: 'translateY(0) rotate(0.7deg)', offset: 0.75 },
        { transform: 'translateY(0) rotate(0deg)', opacity: 1 },
      ], { duration: 640, easing: 'ease-out' });
      lift.cancel();
      await drop.finished.catch(() => {});
    }

    async function recolour(product, colour, tag) {
      if (product.colour === colour) return;
      product.colour = colour;
      const way = wayOf(product, colour);
      // Keep the grid in step; drop.js swaps its photos when the swatch is clicked.
      way.click();
      product.ways.forEach((candidate) => {
        candidate.classList.toggle('is-on', candidate === way);
        candidate.setAttribute('aria-pressed', String(candidate === way));
      });
      [...tags.children].forEach((other) => other.setAttribute('aria-pressed', String(other === tag)));
      if (!reduced.matches) {
        tag.animate([{ rotate: '0deg' }, { rotate: '14deg' }, { rotate: '-8deg' }, { rotate: '4deg' }, { rotate: '0deg' }],
          { duration: 900, easing: 'ease-out' });
      }
      const src = shot(product);
      preload(shot(product, product.view === 'front' ? 'back' : 'front'));
      await rehang(product, async () => { await preload(src); product.photo.src = src; });
      labelItems();
      announce();
    }

    // A half turn on the hook: out to edge-on, swap the shot, back round.
    async function turnTo(product, view) {
      if (product.view === view) return;
      const src = shot(product, view, product.colour);
      const way = view === 'back' ? 1 : -1;
      product.view = view;
      describe();
      if (reduced.matches) {
        await preload(src);
        product.photo.src = src;
      } else {
        const out = product.turn.animate(
          [{ transform: 'perspective(1400px) rotateY(0deg)' }, { transform: `perspective(1400px) rotateY(${90 * way}deg)` }],
          { duration: 260, easing: 'cubic-bezier(.55,0,.85,.4)', fill: 'forwards' });
        await Promise.all([out.finished, preload(src)]);
        product.photo.src = src;
        const back = product.turn.animate(
          [{ transform: `perspective(1400px) rotateY(${-90 * way}deg)` }, { transform: 'perspective(1400px) rotateY(0deg)' }],
          { duration: 420, easing: 'cubic-bezier(.2,.7,.3,1)' });
        out.cancel();
        await back.finished.catch(() => {});
      }
      labelItems();
      announce();
    }

    // Hover reads stable rail slots, so a neighbour parting under the pointer
    // cannot set off a chain of previews.
    scene.addEventListener('pointermove', (event) => {
      if (state.open || event.pointerType !== 'mouse' || event.target.closest('button:not(.rack-item), a')) return;
      const bounds = scene.getBoundingClientRect();
      const x = event.clientX - bounds.left - bounds.width / 2;
      const y = event.clientY - bounds.top;
      const { step, railY, railDrop, boxH } = geometry;
      const span = step * (products.length / 2) + step * 0.8;
      const top = railY + railDrop;
      if (Math.abs(x) > span || y < top - 40 || y > top + boxH * 0.95) {
        preview(-1);
        return;
      }
      preview(Math.max(0, Math.min(products.length - 1, Math.round(x / step + (products.length - 1) / 2))));
    });
    scene.addEventListener('pointerleave', () => { if (!state.open && !rack.contains(document.activeElement)) preview(-1); });

    $('.rack-pull').addEventListener('click', () => { if (state.preview >= 0) open(state.preview); });
    $('.rack-prev').addEventListener('click', () => go(state.active - 1));
    $('.rack-next').addEventListener('click', () => go(state.active + 1));
    $('.rack-close').addEventListener('click', close);
    viewButtons.forEach((button) => button.addEventListener('click', () => turnTo(products[state.active], button.dataset.view)));
    rack.addEventListener('keydown', (event) => {
      if (!state.open) return;
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      else if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') && !event.target.closest('.rack-tags, .rack-views')) {
        event.preventDefault();
        go(state.active + (event.key === 'ArrowRight' ? 1 : -1));
      }
    });

    // Swipe between tees once one is off the rail.
    let touch = null;
    scene.addEventListener('pointerdown', (event) => {
      if (event.pointerType !== 'mouse') touch = { x: event.clientX, y: event.clientY };
    }, { passive: true });
    scene.addEventListener('pointerup', (event) => {
      if (!touch || !state.open) { touch = null; return; }
      const dx = event.clientX - touch.x, dy = event.clientY - touch.y;
      touch = null;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.3) go(state.active + (dx < 0 ? 1 : -1));
    });
    scene.addEventListener('pointercancel', () => { touch = null; });

    // The grid is still one click away.
    const gridReturn = make('button', 'rack-grid-return', '← Back to the rail');
    gridReturn.type = 'button';
    gridReturn.hidden = true;
    source.before(rack, gridReturn);
    source.hidden = true;
    $('.rack-grid-toggle').addEventListener('click', () => {
      if (state.open) close();
      rack.hidden = true;
      source.hidden = false;
      gridReturn.hidden = false;
      gridReturn.focus();
    });
    gridReturn.addEventListener('click', () => {
      products.forEach((product) => {
        product.colour = product.ways.find((way) => way.classList.contains('is-on'))?.dataset.cw || product.colour;
        product.view = 'front';
        product.photo.src = shot(product);
      });
      source.hidden = true;
      gridReturn.hidden = true;
      rack.hidden = false;
      layout();
      $('.rack-grid-toggle').focus();
      rack.scrollIntoView({ block: 'start', behavior: 'instant' });
    });

    layout();
    if ('ResizeObserver' in window) {
      // layout() sets the wall's height, so only a change of width re-runs it.
      let lastWidth = scene.clientWidth;
      const observer = new ResizeObserver(() => {
        if (scene.clientWidth === lastWidth) return;
        lastWidth = scene.clientWidth;
        layout();
      });
      observer.observe(scene);
      rack.addEventListener('rack:destroy', () => observer.disconnect(), { once: true });
    } else {
      window.addEventListener('resize', layout);
      rack.addEventListener('rack:destroy', () => window.removeEventListener('resize', layout), { once: true });
    }
    return rack;
  }

  window.ApshabdRack = { mount };
  // A city page opts its grid in with data-rack.
  document.querySelectorAll('[data-rack], .drop-grid[data-city]').forEach(mount);
})();
