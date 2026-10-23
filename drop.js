/* ══════════════════════════════════════════════════════════════════════════
   अPSHABD — THE DROP

   Product cards and the quick view for drop.css. Shared by the index and the
   city pages.

   One card per tee:

     <article class="pcard" data-city="mumbai" data-loc="bandra" data-reveal="card">
       <button class="pcard-media" type="button" aria-label="…">
         <img class="pcard-front" …>  <img class="pcard-back" …>
       </button>
       <div class="pcard-info">
         <div class="pcard-meta"> <h3 class="pcard-name">…</h3> <span class="pcard-script" lang="mr">…</span> </div>
         <p class="pcard-sub"><i></i> [<span class="pcard-city">…</span>] <span class="pcard-colour">…</span></p>
         <div class="pcard-ways" role="group"> <button class="pcard-way [is-on]" data-cw="…" style="--sw:#…" aria-label="…"> … </div>
         <p class="pcard-line">…the story, shown in the quick view…</p>
       </div>
     </article>

   Shots live at assets/ghost-mannequin/<city>/<loc>/<colourway>-front.jpg and -back.jpg, so a
   colourway is just a data-cw value. The quick view is built once, on first
   open, and refilled from whichever card opened it.
   ══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var cards = [].slice.call(document.querySelectorAll('.pcard[data-loc]'));
  if (!cards.length) return;

  var CITY_NAMES = { chennai: 'Chennai', mumbai: 'Mumbai', delhi: 'Delhi' };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function shot(card, colourway, side) {
    return 'assets/ghost-mannequin/' + card.dataset.city + '/' + card.dataset.loc + '/' + colourway + '-' + side + '.jpg' + (card.dataset.version ? '?v=' + encodeURIComponent(card.dataset.version) : '');
  }

  function wayName(button) {
    return button.getAttribute('aria-label') || (button.dataset.cw || '').replace(/-/g, ' ');
  }

  function teeName(card) {
    var name = card.querySelector('.pcard-name');
    return name ? name.textContent.trim() : card.dataset.loc;
  }

  function load(url) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = img.onerror = function () { resolve(); };
      img.src = url;
    });
  }

  /* Both faces dim, the new pair loads off-screen, and only then do they swap
     in — so the plate never shows a half-loaded or empty frame. A newer
     choice made mid-load wins; the stale one is dropped. */
  function swap(imgs, urls) {
    var token = {};
    imgs.forEach(function (img) {
      img._swapToken = token;
      img.classList.add('is-swapping');
    });

    Promise.all(urls.map(load)).then(function () {
      imgs.forEach(function (img, i) {
        if (img._swapToken !== token) return;
        img.src = urls[i];
        var ready = img.decode ? img.decode() : Promise.resolve();
        ready.catch(function () {}).then(function () {
          if (img._swapToken === token) img.classList.remove('is-swapping');
        });
      });
    });
  }

  /* ── Cards ────────────────────────────────────────────────────────────── */

  function describe(card, way) {
    var media = card.querySelector('.pcard-media');
    if (media) {
      media.setAttribute('aria-label',
        teeName(card) + ' tee in ' + wayName(way).toLowerCase() + ' — open quick view');
    }
  }

  function setColour(card, colourway) {
    var picked = null;

    [].forEach.call(card.querySelectorAll('.pcard-way'), function (way) {
      var on = way.dataset.cw === colourway;
      way.classList.toggle('is-on', on);
      way.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (on) picked = way;
    });

    if (!picked || card.dataset.cw === colourway) return;
    card.dataset.cw = colourway;
    card.style.setProperty('--p-dot', picked.style.getPropertyValue('--sw'));

    var label = card.querySelector('.pcard-colour');
    if (label) label.textContent = wayName(picked);
    describe(card, picked);

    swap(
      [card.querySelector('.pcard-front'), card.querySelector('.pcard-back')],
      [shot(card, colourway, 'front'), shot(card, colourway, 'back')]
    );

    if (quickView.card === card) quickView.sync(true);

    /* waitlist.js listens for this to keep a saved pick on the colour the
       shopper is now looking at. */
    var changed;
    try {
      changed = new CustomEvent('pcard:colour', { detail: { colourway: colourway } });
    } catch (e) {
      changed = document.createEvent('CustomEvent');
      changed.initCustomEvent('pcard:colour', false, false, { colourway: colourway });
    }
    card.dispatchEvent(changed);
  }

  cards.forEach(function (card) {
    var media = card.querySelector('.pcard-media');
    var name = card.querySelector('.pcard-name');
    var ways = [].slice.call(card.querySelectorAll('.pcard-way'));
    var current = ways.filter(function (way) { return way.classList.contains('is-on'); })[0] || ways[0];

    if (current) {
      card.dataset.cw = current.dataset.cw;
      card.style.setProperty('--p-dot', current.style.getPropertyValue('--sw'));
      describe(card, current);
    }

    ways.forEach(function (way) {
      way.setAttribute('aria-pressed', way === current ? 'true' : 'false');
      way.addEventListener('click', function () { setColour(card, way.dataset.cw); });
    });

    if (media) media.addEventListener('click', function () { quickView.open(card, media); });
    /* The name is a convenience target for mouse and touch; keyboard users
       already have the plate itself, which is a button. */
    if (name && media) name.addEventListener('click', function () { quickView.open(card, media); });
  });

  /* ── Quick view ───────────────────────────────────────────────────────── */

  var quickView = (function () {
    var dialog, panel, media, front, back, kicker, nameOut, scriptOut, line;
    var colourOut, ways, specs, cityLink, cta, want;
    var api = { card: null };
    var opener = null;
    var closing = 0;

    function build() {
      dialog = document.createElement('dialog');
      dialog.className = 'qv';
      dialog.setAttribute('aria-labelledby', 'qv-title');
      /* Inside [data-motion], so city-brand.css leaves its transitions on. */
      dialog.setAttribute('data-motion', '');
      dialog.innerHTML =
        '<div class="qv-scrim" data-qv-close></div>' +
        '<div class="qv-panel">' +
          '<span class="qv-grab" aria-hidden="true"></span>' +
          '<button class="qv-close" type="button" aria-label="Close quick view" data-qv-close autofocus><span aria-hidden="true">×</span></button>' +
          '<div class="qv-media">' +
            '<figure class="qv-shot"><img class="qv-front" alt="" width="900" height="1200" /><figcaption>Front</figcaption></figure>' +
            '<figure class="qv-shot"><img class="qv-back" alt="" width="900" height="1200" /><figcaption>Back</figcaption></figure>' +
          '</div>' +
          '<div class="qv-info">' +
            '<p class="qv-kicker"></p>' +
            '<h2 class="qv-title" id="qv-title"><span class="qv-name"></span><span class="qv-script"></span></h2>' +
            '<p class="qv-line"></p>' +
            '<p class="qv-colour"><span>Colour</span><span class="qv-colour-name" aria-live="polite"></span></p>' +
            '<div class="qv-ways" role="group"></div>' +
            '<div class="qv-actions">' +
              '<a class="qv-cta" href="#join">Get first access <span aria-hidden="true">→</span></a>' +
            '</div>' +
            '<dl class="qv-specs"></dl>' +
            '<a class="qv-city" hidden></a>' +
          '</div>' +
        '</div>';
      document.body.appendChild(dialog);

      panel = dialog.querySelector('.qv-panel');
      media = dialog.querySelector('.qv-media');
      front = dialog.querySelector('.qv-front');
      back = dialog.querySelector('.qv-back');
      kicker = dialog.querySelector('.qv-kicker');
      nameOut = dialog.querySelector('.qv-name');
      scriptOut = dialog.querySelector('.qv-script');
      line = dialog.querySelector('.qv-line');
      colourOut = dialog.querySelector('.qv-colour-name');
      ways = dialog.querySelector('.qv-ways');
      specs = dialog.querySelector('.qv-specs');
      cityLink = dialog.querySelector('.qv-city');
      cta = dialog.querySelector('.qv-cta');

      /* "Want this" belongs to waitlist.js, which owns the picks and sends
         them with the sign-up. One button, re-pointed at whichever tee the
         sheet is showing. */
      if (window.APWants) {
        want = window.APWants.button(function () { return api.card; });
        cta.parentNode.insertBefore(want, cta);
      }

      dialog.addEventListener('click', function (event) {
        if (event.target.closest('[data-qv-close]')) close();
      });

      /* Escape: run the closing animation instead of vanishing. */
      dialog.addEventListener('cancel', function (event) {
        event.preventDefault();
        close();
      });

      /* The sign-up lives on the page behind the sheet: put the sheet away
         first, then glide down to it. */
      cta.addEventListener('click', function (event) {
        var join = document.getElementById('join');
        if (!join) return;
        event.preventDefault();
        close(function () {
          if (window.location.hash !== '#join') window.history.pushState(null, '', '#join');
          if (window.APMotion) window.APMotion.glideTo(join);
          else join.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth' });
        });
      });

      if (!document.getElementById('join')) cta.hidden = true;
    }

    function lockPage() {
      var root = document.documentElement;
      root.style.setProperty('--qv-gutter', (window.innerWidth - root.clientWidth) + 'px');
      root.classList.add('qv-lock');
      if (window.APMotion) window.APMotion.lock();
    }

    function unlockPage() {
      var root = document.documentElement;
      root.classList.remove('qv-lock');
      root.style.removeProperty('--qv-gutter');
      if (window.APMotion) window.APMotion.unlock();
    }

    function fill(card) {
      var city = card.dataset.city;
      var cityName = CITY_NAMES[city] || city;
      var script = card.querySelector('.pcard-script');
      var story = card.querySelector('.pcard-line');

      kicker.textContent = cityName + ' · Drop 001';
      nameOut.textContent = teeName(card);
      scriptOut.textContent = script ? script.textContent.trim() : '';
      if (script && script.lang) scriptOut.lang = script.lang;
      else scriptOut.removeAttribute('lang');
      line.textContent = story ? story.textContent.trim() : '';
      line.hidden = !story;

      /* From the index, the sheet also points on to that city's own page. */
      var here = window.location.pathname.split('/').pop() || 'index.html';
      var cityPage = city + '.html';
      cityLink.hidden = here === cityPage;
      cityLink.href = cityPage;
      cityLink.textContent = 'See the ' + cityName + ' drop ↗';

      ways.innerHTML = '';
      ways.setAttribute('aria-label', teeName(card) + ' colourways');
      [].forEach.call(card.querySelectorAll('.pcard-way'), function (way) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'qv-way';
        button.dataset.cw = way.dataset.cw;
        button.style.setProperty('--sw', way.style.getPropertyValue('--sw'));
        button.setAttribute('aria-label', wayName(way));
        button.addEventListener('click', function () { setColour(card, button.dataset.cw); });
        ways.appendChild(button);
      });

      var count = card.querySelectorAll('.pcard-way').length;
      specs.innerHTML =
        '<dt>Fit</dt><dd>Oversized, unisex</dd>' +
        '<dt>Print</dt><dd></dd>' +
        '<dt>Colours</dt><dd>' + count + ' colourways</dd>' +
        '<dt>Size, fabric, price</dt><dd>Published the day drop 001 opens. Tell us your size when you sign up and we\'ll cut the run to match.</dd>';
      /* Set as text: the script name comes from the page, not from us. */
      specs.querySelectorAll('dd')[1].textContent = teeName(card) +
        (script ? ', set in English and ' + script.textContent.trim() : '');

      api.card = card;
      sync(false);
      if (want) want.repaint();
    }

    function sync(animate) {
      var card = api.card;
      if (!card) return;
      var colourway = card.dataset.cw;
      var picked = card.querySelector('.pcard-way.is-on');
      var label = picked ? wayName(picked) : '';
      var name = teeName(card);

      [].forEach.call(ways.querySelectorAll('.qv-way'), function (button) {
        var on = button.dataset.cw === colourway;
        button.classList.toggle('is-on', on);
        button.setAttribute('aria-pressed', on ? 'true' : 'false');
      });

      colourOut.textContent = label;
      front.alt = name + ' tee in ' + label.toLowerCase() + ', front';
      back.alt = name + ' tee in ' + label.toLowerCase() + ', back';

      var urls = [shot(card, colourway, 'front'), shot(card, colourway, 'back')];
      if (animate) {
        swap([front, back], urls);
      } else {
        front._swapToken = back._swapToken = null;
        front.classList.remove('is-swapping');
        back.classList.remove('is-swapping');
        front.src = urls[0];
        back.src = urls[1];
      }
    }

    function open(card, from) {
      if (!dialog) build();
      if (closing) {
        window.clearTimeout(closing);
        closing = 0;
        dialog.classList.remove('is-closing');
      }

      opener = from || null;
      fill(card);

      if (!dialog.open) {
        lockPage();
        dialog.showModal();
        panel.scrollTop = 0;
        media.scrollLeft = 0;
        /* Commit the closed state for one frame so the opening transitions
           have somewhere to start from. */
        void dialog.offsetWidth;
      }
      dialog.classList.add('is-open');
    }

    function close(after) {
      if (!dialog || !dialog.open) {
        if (after) after();
        return;
      }
      if (closing) return;

      dialog.classList.add('is-closing');
      dialog.classList.remove('is-open');

      closing = window.setTimeout(function () {
        closing = 0;
        dialog.classList.remove('is-closing');
        dialog.close();
        unlockPage();
        if (opener && document.contains(opener)) {
          try { opener.focus({ preventScroll: true }); } catch (e) { opener.focus(); }
        }
        api.card = null;
        if (after) after();
      }, reduceMotion.matches ? 0 : 380);
    }

    api.open = open;
    api.close = close;
    api.sync = sync;
    return api;
  })();
})();
