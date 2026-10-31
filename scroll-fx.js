(() => {
  'use strict';

  // Scroll effects that answer how far and how fast you scroll, on top of
  // motion.js (reveals, smooth wheel) and studio-motion.js (arrival wipes):
  // belts that follow scroll speed (the ticker, the crossing tapes), speed
  // shear on the campaign photos and the wall, split-flap section labels, the
  // manifesto's reading fill, the aperture on the pinned craft film, and the
  // lattice outro. Everything here writes its own custom properties or a
  // `transform` nothing else sets on those elements.
  //
  // Each effect is armed by a class added here, so with the script missing,
  // or under reduced motion (which opts out of the whole layer), the page is
  // the static one.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const clamp01 = (value) => clamp(value, 0, 1);
  // 0 until value reaches a, 1 from b on, linear in between.
  const range = (value, a, b) => clamp01((value - a) / (b - a));
  const easeOut = (t) => 1 - (1 - t) ** 3;
  const easeInOut = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
  const easeOutBack = (t) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2;
  // Stable per-index noise, so a rebuilt lattice scatters the same way twice.
  const noise = (n) => {
    const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x);
  };

  const scenes = [];
  const onScreen = new Set();
  // Elements that came into view since the last frame. The observer reports
  // a frame after the scroll that caused it, so a single jump (a nav link,
  // an anchor) would otherwise leave a scene stale until the next scroll.
  const arrived = new Set();
  let viewportHeight = window.innerHeight;
  // Smoothed scroll speed in px per ms; positive while scrolling down.
  let velocity = 0;
  let forceUpdate = true;

  const watcher = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        onScreen.add(entry.target);
        arrived.add(entry.target);
      } else onScreen.delete(entry.target);
    });
  }, { rootMargin: '30% 0px' });

  // A scene is { el, update(dt), layout?(), continuous? }. update runs only
  // while el is near the viewport, and only on frames where the page moved —
  // unless the scene is continuous, i.e. it has motion that settles by itself.
  const addScene = (scene) => {
    scenes.push(scene);
    watcher.observe(scene.el);
  };

  // ── Belts ─────────────────────────────────────────────────────────────────
  // A belt is a looping strip that answers the scroll: it drifts at a resting
  // pace, runs faster the harder you scroll, reverses when you scroll back,
  // leans into its direction of travel and eases upright once the page
  // stops. `downward` is which way it runs while scrolling down (-1 left,
  // 1 right); `pace` is ms per loop at rest. With `fill`, the markup holds
  // one copy of the strip and the belt clones it out to a seamless loop.
  const addBelt = ({ el, track, downward = -1, pace = 28000, fill = false }) => {
    const set = [...track.children];
    let loopStart = null;
    let loopWidth = 0;
    let offset = 0;
    let direction = downward;
    let lean = 0;

    addScene({
      el,
      continuous: true,
      layout() {
        if (fill) {
          track.querySelectorAll('[data-belt-clone]').forEach((clone) => clone.remove());
          // Enough copies that a full screen of strip follows the loop point.
          const setWidth = Math.max(1, track.scrollWidth);
          const copies = Math.ceil(window.innerWidth / setWidth) + 1;
          for (let n = 0; n < copies; n += 1) {
            set.forEach((item) => {
              const clone = item.cloneNode(true);
              clone.setAttribute('data-belt-clone', '');
              track.append(clone);
            });
          }
          loopStart = track.querySelector('[data-belt-clone]');
        } else {
          // The ticker carries its own second copy, marked aria-hidden.
          loopStart = track.querySelector('[aria-hidden="true"]');
        }
        // Measured start to start, so the gap after the last item counts.
        loopWidth = loopStart ? loopStart.offsetLeft - set[0].offsetLeft : 0;
      },
      update(dt) {
        if (loopWidth <= 0) return;
        if (velocity > 0.02) direction = downward;
        else if (velocity < -0.02) direction = -downward;

        const speed = loopWidth / pace + Math.abs(velocity) * 0.85;
        offset = (offset + direction * speed * dt) % loopWidth;
        if (offset > 0) offset -= loopWidth;
        lean += (clamp(velocity * 3.2 * downward, -11, 11) - lean) * 0.14;

        track.style.transform = `translate3d(${offset.toFixed(2)}px, 0, 0) skewX(${lean.toFixed(2)}deg)`;
      },
    });
  };

  // The ticker takes over from its CSS loop, at the same resting pace.
  const ticker = document.querySelector('.hero-ticker');
  const tickerTrack = ticker && ticker.querySelector('.ticker-track');

  if (ticker && tickerTrack) {
    ticker.classList.add('is-driven');
    addBelt({ el: ticker, track: tickerTrack });
  }

  // ── Crossing tapes ────────────────────────────────────────────────────────
  // Two belts run against each other while the pair swings through the X
  // like scissors as the section passes.
  const tapes = document.querySelector('[data-tapes]');

  if (tapes) {
    tapes.classList.add('is-armed');
    tapes.querySelectorAll('.tape').forEach((tape) => {
      addBelt({
        el: tapes,
        track: tape.querySelector('.tape-track'),
        downward: Number(tape.dataset.tapeDirection) || -1,
        pace: 34000,
        fill: true,
      });
    });
    addScene({
      el: tapes,
      update() {
        const rect = tapes.getBoundingClientRect();
        const swing = clamp01((viewportHeight - rect.top) / (viewportHeight + rect.height));
        tapes.style.setProperty('--swing', swing.toFixed(4));
      },
    });
  }

  // ── Speed shear ───────────────────────────────────────────────────────────
  // The reel's cards and the craft wall lean with the scroll the way a
  // photo smears in a moving train, then stand back up as it slows.
  const addShear = (el, targets, axis, gain, max) => {
    let lean = 0;
    let resting = true;

    addScene({
      el,
      continuous: true,
      update() {
        const target = clamp(velocity * gain, -max, max);
        lean += (target - lean) * 0.12;
        if (!target && Math.abs(lean) < 0.01) {
          if (!resting) targets.forEach((node) => { node.style.transform = ''; });
          resting = true;
          return;
        }
        resting = false;
        const shear = `skew${axis}(${lean.toFixed(2)}deg)`;
        targets.forEach((node) => { node.style.transform = shear; });
      },
    });
  };

  const reelSection = document.querySelector('.campaign');
  const reelCards = [...document.querySelectorAll('.campaign-grid .campaign-card')];
  if (reelSection && reelCards.length) addShear(reelSection, reelCards, 'X', 2.2, 7);

  const wallGrid = document.querySelector('.wall-grid');
  if (wallGrid) addShear(wallGrid, [wallGrid], 'Y', 1.1, 3);

  // ── Split-flap labels ─────────────────────────────────────────────────────
  // Section labels clatter through the alphabet like a departures board as
  // they arrive, settling left to right. The real text stays in the DOM for
  // screen readers; only an aria-hidden copy flips.
  const flapGlyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  // studio-motion.js tucks an aria-hidden red rule into each label row.
  const flapLabels = [...document.querySelectorAll('.section-index > span:not([aria-hidden]), .hero-kicker > span')];

  if (flapLabels.length) {
    const flipLabel = (flap) => {
      const chars = [...flap.dataset.text];
      const start = performance.now();
      const step = () => {
        const elapsed = performance.now() - start;
        let settled = true;
        flap.textContent = chars.map((char, index) => {
          if (!/[a-z0-9]/i.test(char) || elapsed > 220 + index * 36) return char;
          settled = false;
          return flapGlyphs[Math.floor(Math.random() * flapGlyphs.length)];
        }).join('');
        // ~20 flips a second reads as mechanical; every frame reads as noise.
        if (!settled) window.setTimeout(step, 50);
      };
      step();
    };

    const flapWatcher = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        flipLabel(entry.target.querySelector('.flap'));
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.9 });

    flapLabels.forEach((label) => {
      const text = label.textContent;
      const real = document.createElement('span');
      const flap = document.createElement('span');
      real.className = 'sr-only';
      real.textContent = text;
      flap.className = 'flap';
      flap.setAttribute('aria-hidden', 'true');
      flap.dataset.text = text;
      flap.textContent = text;
      label.replaceChildren(real, flap);
      flapWatcher.observe(label);
    });
  }

  // ── Reading fill ──────────────────────────────────────────────────────────
  // Copy starts as a ghost and inks in word by word as it is read past.
  const splitWords = (root) => {
    const words = [];

    [...root.childNodes].forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.tagName !== 'BR') words.push(...splitWords(node));
        return;
      }
      if (node.nodeType !== Node.TEXT_NODE) return;

      const fragment = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (!part.trim()) {
          fragment.append(part);
          return;
        }
        const word = document.createElement('span');
        word.className = 'scrub-word';
        word.textContent = part;
        fragment.append(word);
        words.push(word);
      });
      node.replaceWith(fragment);
    });

    return words;
  };

  document.querySelectorAll('[data-scrub-words]').forEach((block) => {
    const words = splitWords(block);
    const inked = words.map(() => -1);

    addScene({
      el: block,
      update() {
        const rect = block.getBoundingClientRect();
        // Begins as the block clears the bottom of the screen, finished by the
        // time its last line passes the middle.
        const progress = clamp01((viewportHeight * 0.88 - rect.top) / (viewportHeight * 0.3 + rect.height));
        const reach = progress * words.length;

        words.forEach((word, index) => {
          const value = Math.round((0.16 + 0.84 * clamp01(reach - index)) * 100) / 100;
          if (value === inked[index]) return;
          inked[index] = value;
          word.style.opacity = value;
        });
      },
    });
  });

  // ── The craft: aperture on the film ───────────────────────────────────────
  // The pinned ident opens out from a rounded window as the wall arrives and
  // closes back down as it leaves, so the film reads as one held shot.
  const wall = document.querySelector('.wall');
  const wallStage = document.getElementById('craftStage');

  if (wall && wallStage) {
    wallStage.classList.add('is-scrubbed');
    addScene({
      el: wall,
      update() {
        const rect = wall.getBoundingClientRect();
        const opening = clamp01((viewportHeight - rect.top) / viewportHeight);
        const closing = clamp01(rect.bottom / viewportHeight);
        wallStage.style.setProperty('--open', easeOut(Math.min(opening, closing)).toFixed(4));
      },
    });
  }

  // ── Lattice outro ─────────────────────────────────────────────────────────
  // Four beats over one pinned stage:
  //   1. the lattice draws itself across the dark, crosses popping at joints
  //   2. every cell flips up showing a different neighbourhood from the page
  //   3. the cells turn over from the centre out, a slice of the poster on
  //      each back, lifting off the plane mid-turn
  //   4. the gaps close and the poster stands whole, on the footer's cream
  // The poster in the markup is the template: each cell's back carries a
  // clone, offset so that together they tile it exactly.
  const lattice = document.querySelector('[data-lattice]');

  if (lattice) {
    const stage = lattice.querySelector('.lattice-stage');
    const art = lattice.querySelector('.lattice-art');
    const hud = lattice.querySelector('.lattice-hud');
    const counter = lattice.querySelector('[data-lattice-count]');
    const total = lattice.querySelector('[data-lattice-total]');
    const end = lattice.querySelector('.lattice-end');
    const photos = (lattice.dataset.latticePhotos || '')
      .split('|')
      .map((entry) => {
        const [src, label = ''] = entry.split('=');
        return { src: src.trim(), label: label.trim() };
      })
      .filter((photo) => photo.src);

    const grid = document.createElement('div');
    const mesh = document.createElement('div');
    grid.className = 'lattice-grid';
    mesh.className = 'lattice-mesh';
    grid.setAttribute('aria-hidden', 'true');
    mesh.setAttribute('aria-hidden', 'true');
    art.after(grid, mesh);

    let cells = [];
    let lines = [];
    let nodes = [];
    let cols = 0;
    let rows = 0;
    let stageHeight = 0;
    let assembledShown = -1;

    const build = () => {
      const width = stage.clientWidth;
      const height = stage.clientHeight;
      const nextCols = width < 720 ? 4 : width < 1100 ? 6 : 8;
      // Cells stay a little taller than wide, which suits portrait photos.
      const nextRows = clamp(Math.round(nextCols * (height / width) * 0.8), 3, 8);
      if (nextCols === cols && nextRows === rows) return;

      cols = nextCols;
      rows = nextRows;
      grid.textContent = '';
      mesh.textContent = '';
      cells = [];
      lines = [];
      nodes = [];

      const reach = Math.hypot((cols - 1) / 2, (rows - 1) / 2) || 1;

      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          const index = r * cols + c;
          const cell = document.createElement('div');
          cell.className = 'lattice-cell';
          cell.style.left = `${(c / cols) * 100}%`;
          cell.style.top = `${(r / rows) * 100}%`;
          cell.style.width = `${100 / cols}%`;
          cell.style.height = `${100 / rows}%`;

          // A stride coprime with the pool keeps neighbours from repeating.
          const photo = photos.length ? photos[(index * 7) % photos.length] : null;
          const front = document.createElement('div');
          front.className = 'lattice-face lattice-front';
          if (photo) {
            front.style.backgroundImage = `url("${photo.src}")`;
            const label = document.createElement('span');
            label.textContent = photo.label;
            front.append(label);
          }

          const back = document.createElement('div');
          back.className = 'lattice-face lattice-back';
          const slice = art.cloneNode(true);
          slice.removeAttribute('aria-hidden');
          back.append(slice);

          cell.append(front, back);
          grid.append(cell);
          cells.push({
            el: cell,
            front,
            back,
            showingBack: null,
            slice,
            c,
            r,
            // Flip-up runs as a diagonal sweep from the top-left corner...
            wave: (c / Math.max(1, cols - 1) + r / Math.max(1, rows - 1)) / 2,
            // ...and the turn-over ripples out from the centre.
            ripple: Math.hypot(c - (cols - 1) / 2, r - (rows - 1) / 2) / reach,
            lift: 90 + noise(index) * 220,
            tilt: (noise(index + 101) - 0.5) * 26,
          });
        }
      }

      for (let c = 0; c <= cols; c += 1) {
        const line = document.createElement('i');
        line.className = 'lattice-line is-v';
        line.style.left = `${(c / cols) * 100}%`;
        mesh.append(line);
        lines.push({ el: line, vertical: true, order: c / cols });
      }

      for (let r = 0; r <= rows; r += 1) {
        const line = document.createElement('i');
        line.className = 'lattice-line is-h';
        line.style.top = `${(r / rows) * 100}%`;
        mesh.append(line);
        lines.push({ el: line, vertical: false, order: r / rows });
      }

      for (let r = 0; r <= rows; r += 1) {
        for (let c = 0; c <= cols; c += 1) {
          const node = document.createElement('i');
          node.className = 'lattice-node';
          node.style.left = `${(c / cols) * 100}%`;
          node.style.top = `${(r / rows) * 100}%`;
          mesh.append(node);
          nodes.push({ el: node, order: (c / cols + r / rows) / 2 });
        }
      }

      total.textContent = String(cells.length).padStart(2, '0');
      assembledShown = -1;
    };

    lattice.classList.add('is-armed');
    addScene({
      el: lattice,
      layout() {
        build();
        const width = stage.clientWidth;
        const height = stage.clientHeight;
        stageHeight = height;
        grid.style.setProperty('--stage-w', `${width}px`);
        grid.style.setProperty('--stage-h', `${height}px`);
        cells.forEach((cell) => {
          cell.slice.style.transform = `translate3d(${(-(cell.c * width) / cols).toFixed(2)}px, ${(-(cell.r * height) / rows).toFixed(2)}px, 0)`;
        });
      },
      update() {
        const rect = lattice.getBoundingClientRect();
        // 0 as the section's top enters at the bottom of the screen, 1 as its
        // bottom reaches the bottom: the entrance counts, so the lines are
        // already drawing while the stage slides in.
        const p = clamp01((stageHeight - rect.top) / rect.height);
        const draw = range(p, 0.02, 0.22);
        const close = easeInOut(range(p, 0.8, 0.9));

        lines.forEach((line) => {
          const s = easeOut(range(draw, line.order * 0.55, line.order * 0.55 + 0.45));
          line.el.style.transform = line.vertical ? `scaleY(${s.toFixed(4)})` : `scaleX(${s.toFixed(4)})`;
        });

        nodes.forEach((node) => {
          const s = easeOutBack(range(p, 0.08 + node.order * 0.14, 0.13 + node.order * 0.14));
          node.el.style.transform = `scale(${s.toFixed(3)})`;
        });

        mesh.style.opacity = (1 - close).toFixed(3);

        let assembled = 0;
        cells.forEach((cell) => {
          const enter = easeOut(range(p, 0.14 + cell.wave * 0.2, 0.26 + cell.wave * 0.2));
          const turn = easeInOut(range(p, 0.5 + cell.ripple * 0.16, 0.64 + cell.ripple * 0.16));
          const arc = Math.sin(turn * Math.PI);
          const scale = (0.7 + 0.3 * enter) * (0.94 + 0.06 * close);
          if (enter >= 1) assembled += 1;

          // Faces are swapped here rather than culled with backface-visibility,
          // which compositors (Safari, Chromium when software-rendering) get
          // wrong inside a turning card. Swapping at the 90° mark is exact.
          const showingBack = turn > 0.5;
          if (showingBack !== cell.showingBack) {
            cell.showingBack = showingBack;
            cell.front.style.visibility = showingBack ? 'hidden' : '';
            cell.back.style.visibility = showingBack ? '' : 'hidden';
          }

          cell.el.style.opacity = Math.min(1, enter * 2.5).toFixed(3);
          cell.el.style.transform =
            `translate3d(0, 0, ${(arc * cell.lift).toFixed(1)}px) ` +
            `rotateX(${((1 - enter) * -92).toFixed(2)}deg) ` +
            `rotateY(${(turn * 180).toFixed(2)}deg) ` +
            `rotateZ(${(arc * cell.tilt).toFixed(2)}deg) ` +
            `scale(${scale.toFixed(4)})`;
        });

        if (assembled !== assembledShown) {
          assembledShown = assembled;
          counter.textContent = String(assembled).padStart(2, '0');
        }

        hud.style.opacity = (1 - range(p, 0.5, 0.6)).toFixed(3);
        // Once the gaps have shut, the stage itself goes cream so no hairline
        // of night can show between tiles that meet on a fractional pixel.
        stage.classList.toggle('is-poster', close > 0.92);

        const outro = easeOut(range(p, 0.9, 0.97));
        end.style.opacity = outro.toFixed(3);
        end.style.translate = `0 ${((1 - outro) * 16).toFixed(2)}px`;
      },
    });
  }

  // ── The loop ──────────────────────────────────────────────────────────────
  const relayout = () => {
    viewportHeight = window.innerHeight;
    scenes.forEach((scene) => {
      if (scene.layout) scene.layout();
    });
    forceUpdate = true;
  };

  let lastY = window.scrollY;
  let lastTime = performance.now();

  const tick = (now) => {
    const dt = clamp(now - lastTime, 1, 64);
    lastTime = now;
    const y = window.scrollY;
    const moved = y !== lastY;
    velocity += ((y - lastY) / dt - velocity) * 0.2;
    if (Math.abs(velocity) < 0.001) velocity = 0;
    lastY = y;

    scenes.forEach((scene) => {
      if (forceUpdate) {
        scene.update(dt);
        return;
      }
      if (!onScreen.has(scene.el)) return;
      if (moved || scene.continuous || arrived.has(scene.el)) scene.update(dt);
    });
    forceUpdate = false;
    arrived.clear();

    window.requestAnimationFrame(tick);
  };

  relayout();
  window.addEventListener('resize', relayout);
  // The ticker's loop width depends on the webfont, so it is only final once
  // the face is in.
  window.addEventListener('load', relayout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
  window.requestAnimationFrame(tick);
})();
