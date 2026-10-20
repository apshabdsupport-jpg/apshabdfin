/* ══════════════════════════════════════════════════════════════════════════
   WAITLIST — अPSHABD

   Pre-launch the site has one job: turn attention into a list the brand
   owns. This file does three things on every page that loads it:

   1. Renders the sign-up form into each [data-waitlist] slot. One source of
      markup for eight pages, so a field change is made once.
   2. Adds a "Want this" toggle to every tee (.pcard, and the quick view
      drop.js opens from it) and every under-wraps plate (.card). Picks
      persist in localStorage and ride along with the sign-up: that is the
      per-design, per-colourway demand signal the first production buy is
      sized from.
   3. Submits to the Google Apps Script in tools/waitlist-apps-script.gs.

   ENDPOINT is the only thing to change: paste the Apps Script web-app URL
   (it ends in /exec). While it is empty the form falls back to a pre-filled
   email to the support inbox, so a sign-up is never silently dropped. The
   Apps Script origins are already allowed by connect-src in index.html's CSP.
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var ENDPOINT = '';
  var FALLBACK_EMAIL = 'apshabdsupport@gmail.com';
  var WANTS_KEY = 'apshabd-wants';
  var JOINED_KEY = 'apshabd-joined';

  var CITIES = [
    ['chennai', 'Chennai'], ['mumbai', 'Mumbai'], ['delhi', 'Delhi'],
    ['bangalore', 'Bangalore'], ['kolkata', 'Kolkata'],
    ['hyderabad', 'Hyderabad'], ['pune', 'Pune'], ['elsewhere', 'Somewhere else']
  ];
  var SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

  /* ── storage: every access guarded, private windows can throw ────────── */
  function load(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* non-fatal */ }
  }

  function titleCase(slug) {
    return String(slug || '').replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }
  function cityLabel(slug) {
    for (var i = 0; i < CITIES.length; i++) if (CITIES[i][0] === slug) return CITIES[i][1];
    return titleCase(slug);
  }

  var pageCity = (document.body.dataset.city ||
    (location.pathname.match(/\/(chennai|mumbai|delhi|bangalore|kolkata|hyderabad|pune)\.html/) || [])[1] || '');

  /* ── wants ───────────────────────────────────────────────────────────── */
  var wants = load(WANTS_KEY, []);
  var wantListeners = [];

  function wantId(w) { return w.city + '/' + w.loc + (w.cw ? '/' + w.cw : ''); }
  function hasWant(city, loc) {
    return wants.some(function (w) { return w.city === city && w.loc === loc; });
  }
  function setWant(entry, on) {
    wants = wants.filter(function (w) { return !(w.city === entry.city && w.loc === entry.loc); });
    if (on) wants.push(entry);
    save(WANTS_KEY, wants);
    wantListeners.forEach(function (fn) { fn(); });
  }

  /* name can be a string or, for a button that is re-pointed at different
     tees (the quick view's), a function read at paint time. compact gives the
     small corner chip used on the product plates. */
  function makeWantButton(getEntry, name, compact) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = compact ? 'want-toggle want-toggle--chip' : 'want-toggle';
    function paint() {
      var entry = getEntry();
      if (!entry) return;
      var label = typeof name === 'function' ? name() : name;
      var on = hasWant(entry.city, entry.loc);
      button.setAttribute('aria-pressed', on ? 'true' : 'false');
      button.innerHTML = '<span class="want-mark" aria-hidden="true">' + (on ? '■' : '□') + '</span>' +
        '<span>' + (on ? 'Wanted' : (compact ? 'Want' : 'Want this')) + '</span>';
      button.setAttribute('aria-label', (on ? 'Remove ' : 'Mark ') + label + (on ? ' from your picks' : ' as one you want'));
    }
    button.addEventListener('click', function () {
      var entry = getEntry();
      if (!entry) return;
      setWant(entry, !hasWant(entry.city, entry.loc));
    });
    wantListeners.push(paint);
    paint();
    button.repaint = paint;
    return button;
  }

  /* Tees with real colourways (.pcard, built by drop.js). The colourway is
     read at click time, so the pick records the one the shopper was actually
     looking at. */
  function teeEntry(card) {
    if (!card) return null;
    var heading = card.querySelector('.pcard-name');
    var on = card.querySelector('.pcard-way.is-on');
    return {
      city: card.dataset.city || pageCity,
      loc: card.dataset.loc,
      name: heading ? heading.textContent.trim() : titleCase(card.dataset.loc),
      cw: on ? on.dataset.cw : '',
      cwName: on ? (on.getAttribute('aria-label') || titleCase(on.dataset.cw)) : ''
    };
  }

  /* Each plate gets a small toggle in its corner; the quick view carries the
     full-size one and the details (drop.js asks for it through APWants). */
  [].forEach.call(document.querySelectorAll('.pcard[data-loc]'), function (card) {
    var entry = teeEntry(card);
    card.appendChild(makeWantButton(function () { return teeEntry(card); }, entry.name + ' tee', true));

    /* A colourway change after the pick updates the pick, rather than leaving
       a stale colourway in the list. drop.js fires this for the card's own
       swatches and for the quick view's. */
    card.addEventListener('pcard:colour', function () {
      var now = teeEntry(card);
      if (hasWant(now.city, now.loc)) setWant(now, true);
    });
  });

  window.APWants = {
    button: function (getCard) {
      return makeWantButton(
        function () { return teeEntry(getCard()); },
        function () { var e = teeEntry(getCard()); return (e ? e.name : 'this') + ' tee'; }
      );
    }
  };

  /* Under-wraps plates on the cities still in the works: no colourways yet,
     but a vote for the design is still a signal. */
  [].forEach.call(document.querySelectorAll('.grid > .card'), function (card) {
    var heading = card.querySelector('h3');
    var body = card.querySelector('.card-body');
    if (!heading || !body || !pageCity) return;
    var name = heading.textContent.trim();
    var loc = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    body.appendChild(makeWantButton(function () {
      return { city: pageCity, loc: loc, name: name, cw: '', cwName: '' };
    }, name));
  });

  /* ── form ────────────────────────────────────────────────────────────── */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var uid = 0;

  function renderForm(slot) {
    var n = ++uid;
    var city = slot.dataset.city || pageCity;
    var compact = slot.hasAttribute('data-compact');
    var cityOptions = CITIES.map(function (c) {
      return '<option value="' + c[0] + '"' + (c[0] === city ? ' selected' : '') + '>' + c[1] + '</option>';
    }).join('');
    var sizeChips = SIZES.concat(['Not sure']).map(function (s) {
      var v = s === 'Not sure' ? 'unsure' : s;
      return '<label class="wl-chip"><input type="radio" name="size" value="' + v + '" /><span>' + s + '</span></label>';
    }).join('');

    slot.innerHTML =
      '<form class="wl-form' + (compact ? ' wl-form--compact' : '') + '" novalidate>' +
        '<div class="wl-grid">' +
          '<div class="wl-field wl-field--email">' +
            '<label for="wl-email-' + n + '">Email</label>' +
            '<input id="wl-email-' + n + '" name="email" type="email" autocomplete="email" inputmode="email" required placeholder="you@example.com" />' +
          '</div>' +
          '<div class="wl-field">' +
            '<label for="wl-wa-' + n + '">WhatsApp <em>optional</em></label>' +
            '<div class="wl-tel"><span aria-hidden="true">+91</span>' +
            '<input id="wl-wa-' + n + '" name="whatsapp" type="tel" autocomplete="tel-national" inputmode="numeric" maxlength="11" placeholder="98765 43210" aria-describedby="wl-wa-hint-' + n + '" /></div>' +
            '<small id="wl-wa-hint-' + n + '">Drop-day alert only. Never shared.</small>' +
          '</div>' +
          '<div class="wl-field">' +
            '<label for="wl-city-' + n + '">Your city</label>' +
            '<select id="wl-city-' + n + '" name="city" required>' +
              (city ? '' : '<option value="" selected disabled>Choose one</option>') + cityOptions +
            '</select>' +
          '</div>' +
          '<div class="wl-field wl-field--wide">' +
            '<label for="wl-hood-' + n + '">Which neighbourhood should we add? <em>optional</em></label>' +
            '<input id="wl-hood-' + n + '" name="neighbourhood" type="text" maxlength="60" autocomplete="off" placeholder="Your lane, your call" />' +
          '</div>' +
          '<fieldset class="wl-field wl-field--sizes">' +
            '<legend>Your usual tee size <em>optional</em></legend>' +
            '<div class="wl-chips">' + sizeChips + '</div>' +
          '</fieldset>' +
        '</div>' +
        '<div class="wl-wants" hidden></div>' +
        /* Honeypot: off-screen, unlabelled for people, filled by bots. */
        '<div class="wl-hp" aria-hidden="true"><label>Company<input name="company" type="text" tabindex="-1" autocomplete="off" /></label></div>' +
        '<label class="wl-consent">' +
          '<input id="wl-consent-' + n + '" type="checkbox" name="consent" required />' +
          '<span>Email me (and WhatsApp me, if I added a number) about APSHABD drops. One-tap unsubscribe, any time. <a href="privacy.html">How we use this</a>.</span>' +
        '</label>' +
        '<div class="wl-submit-row">' +
          '<button class="wl-submit" type="submit">Get on the list <span aria-hidden="true">→</span></button>' +
          '<p class="wl-status" role="status" aria-live="polite"></p>' +
        '</div>' +
      '</form>';

    var form = slot.querySelector('form');
    var wantsBox = form.querySelector('.wl-wants');

    function paintWants() {
      if (!wants.length) { wantsBox.hidden = true; wantsBox.innerHTML = ''; return; }
      wantsBox.hidden = false;
      wantsBox.innerHTML = '<span class="wl-wants-label">Your picks, sent with this sign-up</span><ul>' +
        wants.map(function (w, i) {
          return '<li><span>' + esc(w.name) + (w.cwName ? ' <i>' + esc(w.cwName) + '</i>' : '') +
            ' <b>' + esc(cityLabel(w.city)) + '</b></span>' +
            '<button type="button" data-i="' + i + '" aria-label="Remove ' + esc(w.name) + '">×</button></li>';
        }).join('') + '</ul>';
    }
    wantsBox.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-i]');
      if (!b) return;
      var w = wants[+b.dataset.i];
      if (w) setWant(w, false);
    });
    wantListeners.push(paintWants);
    paintWants();

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      submit(form, slot);
    });

    var joined = load(JOINED_KEY, null);
    if (joined && joined.email) showJoined(slot, joined, true);
  }

  function fieldError(input, message) {
    var field = input.closest('.wl-field, .wl-consent');
    if (!field) return;
    var old = field.querySelector('.wl-error');
    if (old) old.remove();
    /* The error joins any hint already describing the field, not replaces it. */
    if (!input.hasAttribute('data-hint')) input.setAttribute('data-hint', input.getAttribute('aria-describedby') || '');
    var hint = input.getAttribute('data-hint');
    input.removeAttribute('aria-invalid');
    if (hint) input.setAttribute('aria-describedby', hint); else input.removeAttribute('aria-describedby');
    if (!message) return;
    input.setAttribute('aria-invalid', 'true');
    var p = document.createElement('p');
    p.className = 'wl-error';
    p.id = input.id + '-err';
    p.textContent = message;
    input.setAttribute('aria-describedby', (hint ? hint + ' ' : '') + p.id);
    field.appendChild(p);
  }

  function validate(form) {
    var email = form.email, wa = form.whatsapp, city = form.city, consent = form.consent;
    var first = null;
    var digits = wa.value.replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '');

    var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim());
    fieldError(email, emailOk ? '' : 'That email doesn\'t look right.');
    if (!emailOk) first = first || email;

    var waOk = !digits || /^[6-9]\d{9}$/.test(digits);
    fieldError(wa, waOk ? '' : 'Ten digits, starting 6–9.');
    if (!waOk) first = first || wa;

    var cityOk = !!city.value;
    fieldError(city, cityOk ? '' : 'Pick a city.');
    if (!cityOk) first = first || city;

    fieldError(consent, consent.checked ? '' : 'Tick this so we\'re allowed to message you.');
    if (!consent.checked) first = first || consent;

    if (first) first.focus();
    return first ? null : digits;
  }

  function submit(form, slot) {
    var status = form.querySelector('.wl-status');
    var button = form.querySelector('.wl-submit');
    if (form.company.value) return; // honeypot tripped: pretend nothing happened
    var digits = validate(form);
    if (digits === null) { status.textContent = ''; return; }

    var size = form.querySelector('input[name="size"]:checked');
    var data = {
      email: form.email.value.trim().toLowerCase(),
      whatsapp: digits ? '+91' + digits : '',
      city: form.city.value,
      neighbourhood: form.neighbourhood.value.trim(),
      size: size ? size.value : '',
      wants: wants.map(wantId).join('; '),
      source: location.pathname.replace(/^\//, '') || 'index.html',
      consent: 'yes',
      ts: new Date().toISOString()
    };

    button.disabled = true;
    status.textContent = 'Saving your spot…';

    function done() {
      var record = { email: data.email, city: data.city };
      save(JOINED_KEY, record);
      [].forEach.call(document.querySelectorAll('[data-waitlist]'), function (s) { showJoined(s, record, false); });
    }

    if (!ENDPOINT) {
      /* No back end wired yet: hand the sign-up to the visitor's mail app.
         Honest about it, and nothing is lost. */
      var body = Object.keys(data).map(function (k) { return k + ': ' + data[k]; }).join('\n');
      location.href = 'mailto:' + FALLBACK_EMAIL +
        '?subject=' + encodeURIComponent('Waitlist: ' + cityLabel(data.city)) +
        '&body=' + encodeURIComponent('Put me on the APSHABD list.\n\n' + body);
      button.disabled = false;
      status.textContent = 'Your email app should open with this filled in. Hit send and you\'re on the list.';
      return;
    }

    /* Apps Script answers with a cross-origin redirect, so the response is
       opaque either way; no-cors plus a caught network error is the honest
       limit of what the browser can confirm. */
    fetch(ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: new URLSearchParams(data).toString()
    }).then(done, function () {
      button.disabled = false;
      status.textContent = 'That didn\'t go through. Check your connection and try again.';
    });
  }

  function showJoined(slot, record, returning) {
    var city = cityLabel(record.city);
    var shareText = 'Streetwear set in your own city\'s script. Drop 001 is coming: ';
    var url = 'https://apshabd.com/';
    slot.innerHTML =
      '<div class="wl-done" tabindex="-1">' +
        '<span class="wl-done-stamp">' + (returning ? 'Already on the list' : 'You\'re on the list') + '</span>' +
        '<p class="wl-done-title">' + (record.city === 'elsewhere' ? 'We\'ll find you.' : esc(city) + ' hears first.') + '</p>' +
        '<p>We\'ll write to <b>' + esc(maskEmail(record.email)) + '</b> the day your city drops, before it goes public. Nothing in between but the occasional look behind the shoot.</p>' +
        '<div class="wl-done-actions">' +
          '<a class="wl-share" href="https://wa.me/?text=' + encodeURIComponent(shareText + url) + '" target="_blank" rel="noopener">Send it to someone from your area ↗</a>' +
          '<button type="button" class="wl-again">Update my details</button>' +
        '</div>' +
      '</div>';
    slot.querySelector('.wl-again').addEventListener('click', function () {
      save(JOINED_KEY, null);
      renderForm(slot);
      var f = slot.querySelector('input[name="email"]');
      if (f) f.focus();
    });
    if (!returning) slot.querySelector('.wl-done').focus();
  }

  function maskEmail(e) {
    var parts = String(e).split('@');
    if (parts.length !== 2) return e;
    return parts[0].slice(0, 2) + '•••@' + parts[1];
  }

  [].forEach.call(document.querySelectorAll('[data-waitlist]'), renderForm);
})();
