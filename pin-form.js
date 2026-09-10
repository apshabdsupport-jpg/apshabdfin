/* ═══════════════════════════════════════════════════════
   APSHABD — DROP A PIN (location request form)
═══════════════════════════════════════════════════════ */

/* ─── WHERE PINS GO ──────────────────────────────────────────────────────────
   ⚠ THIS IS EMPTY, WHICH MEANS NO PIN EVER REACHES YOU.

   Every "Drop a pin" call to action on the site — the hero, the manifesto, the
   typewriter interlude, the city index, the pin CTA, the footer, and the CTA on
   all seven city pages — ends here. With no endpoint set, a submitted pin is
   written to the visitor's own localStorage and nowhere else: the name, the
   area, the story and the email address they consented to be contacted on all
   stay on their phone. Nobody at APSHABD ever sees them.

   Until an endpoint is set, the receipt says so rather than claiming the pin
   was received — see ENDPOINT_LIVE below and the done panel in drop-a-pin.html.

   To collect pins for real:
     1. Set PIN_ENDPOINT to a URL that accepts a JSON POST (Formspree, a Google
        Apps Script web app, your own API).
     2. Add that origin to connect-src in drop-a-pin.html's meta CSP.
     3. Add it to connect-src in .htaccess too. The header there says
        connect-src 'none', and a header CSP and a meta CSP are enforced as an
        intersection — 'none' wins over anything the page says, so step 2 alone
        will not be enough. Add a <Files "drop-a-pin.html"> block there that
        re-sets the whole policy with your endpoint in connect-src.
──────────────────────────────────────────────────────────────────────────── */
const PIN_ENDPOINT = '';

/* Drives the wording of the confirmation. Never tell someone their request was
   received when it is sitting in their own browser. */
const ENDPOINT_LIVE = PIN_ENDPOINT !== '';

const form   = document.getElementById('pinForm');
const note   = document.getElementById('pinNote');
const submit = document.getElementById('pinSubmit');

// ─── PARK THE PROGRESS RAIL FLUSH UNDER THE FIXED NAV ────────────────────────
const nav = document.querySelector('.nav');
function measureNav() {
  document.documentElement.style.setProperty('--nav-h', `${Math.round(nav.getBoundingClientRect().height)}px`);
}
measureNav();
new ResizeObserver(measureNav).observe(nav);

// ─── Q1 · "MY CITY ISN'T ON THE MAP" REVEALS A TEXT FIELD ────────────────────
const newCityWrap = document.getElementById('newCityWrap');
const newCity     = document.getElementById('newCity');

form.querySelectorAll('input[name="city"]').forEach(radio => {
  radio.addEventListener('change', () => {
    const isNew = radio.value === '__new__' && radio.checked;
    newCityWrap.classList.toggle('show', isNew);
    if (isNew) setTimeout(() => newCity.focus(), 120);
    else newCity.value = '';
    refresh();
  });
});

// ─── Q3 · CHARACTER COUNT ────────────────────────────────────────────────────
const story      = document.getElementById('story');
const storyCount = document.getElementById('storyCount');
const STORY_MAX  = 400;

story.addEventListener('input', () => {
  const n = story.value.length;
  storyCount.textContent = `${n} / ${STORY_MAX}`;
  storyCount.classList.toggle('over', n > STORY_MAX - 40);
});

// ─── Q4 · VOLUME DIAL ────────────────────────────────────────────────────────
const volume     = document.getElementById('volume');
const volumeRead = document.getElementById('volumeRead');
const VOLUME_LABELS = {
  1: 'BARELY THERE · TAG-SIZE MARK',
  2: 'SMALL · LEFT CHEST ONLY',
  3: 'SAYS IT ONCE, CLEARLY',
  4: 'BIG · FULL BACK PRINT',
  5: 'FULL VOLUME · CAN\'T MISS IT',
};

function paintVolume() {
  const v = Number(volume.value);
  volume.style.setProperty('--fill', `${((v - 1) / 4) * 100}%`);
  volumeRead.textContent = `${String(v).padStart(2, '0')} · ${VOLUME_LABELS[v]}`;
}
volume.addEventListener('input', paintVolume);
paintVolume();

// ─── PROGRESS ────────────────────────────────────────────────────────────────
const dots  = [...document.querySelectorAll('.pin-step-dot')];
const count = document.getElementById('progressCount');

function stepDone(step) {
  switch (step) {
    case 1: {
      const picked = form.querySelector('input[name="city"]:checked');
      if (!picked) return false;
      return picked.value !== '__new__' || newCity.value.trim().length > 1;
    }
    case 2: return document.getElementById('area').value.trim().length > 1;
    case 3: return story.value.trim().length >= 12;
    case 4: return form.querySelectorAll('input[name="product"]:checked').length > 0;
    case 5: {
      const name  = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      return name.length > 1 && isEmail(email);
    }
    default: return false;
  }
}

function isEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}

function refresh() {
  let done = 0;
  dots.forEach(dot => {
    const step = Number(dot.dataset.step);
    const ok   = stepDone(step);
    dot.classList.toggle('done', ok);
    document.getElementById(`q${step}`).classList.toggle('answered', ok);
    if (ok) done++;
  });
  count.innerHTML = `<b>${done}</b>/5 ANSWERED`;
}

form.addEventListener('input',  refresh);
form.addEventListener('change', refresh);
refresh();

// ─── VALIDATION ──────────────────────────────────────────────────────────────
const CHECKS = [
  { step: 1, focus: null,        msg: 'Pick a city first — even if it\'s the one not on the map.' },
  { step: 2, focus: 'area',      msg: 'Which area exactly? That\'s the whole point.' },
  { step: 3, focus: 'story',     msg: 'Give us the story — a line or two. That\'s what we design from.' },
  { step: 4, focus: null,        msg: 'Pick at least one thing you\'d actually wear.' },
  { step: 5, focus: 'name',      msg: 'Name and a real email, so we can tell you when it drops.' },
];

function firstProblem() {
  return CHECKS.find(c => !stepDone(c.step)) || null;
}

function flag(problem) {
  note.textContent = problem.msg;
  note.className   = 'pin-note err';

  const block = document.getElementById(`q${problem.step}`);
  block.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const target = problem.focus
    ? document.getElementById(problem.focus)
    : block.querySelector('input');
  if (target) {
    setTimeout(() => target.focus({ preventScroll: true }), 420);
    if (target.classList.contains('pin-input') || target.classList.contains('pin-textarea')) {
      target.classList.add('err');
      target.addEventListener('input', () => target.classList.remove('err'), { once: true });
    }
  }
}

// ─── COLLECT ─────────────────────────────────────────────────────────────────
function collect() {
  const picked = form.querySelector('input[name="city"]:checked');
  const city   = picked.value === '__new__' ? newCity.value.trim() : picked.value;

  return {
    city,
    newCity:  picked.value === '__new__',
    area:     document.getElementById('area').value.trim(),
    script:   document.getElementById('script').value.trim(),
    story:    story.value.trim(),
    products: [...form.querySelectorAll('input[name="product"]:checked')].map(c => c.value),
    volume:   Number(volume.value),
    volumeLabel: VOLUME_LABELS[Number(volume.value)],
    name:     document.getElementById('name').value.trim(),
    handle:   document.getElementById('handle').value.trim(),
    email:    document.getElementById('email').value.trim(),
    notify:   document.getElementById('consent').checked,
    at:       new Date().toISOString(),
  };
}

function saveLocally(pin) {
  try {
    const key  = 'apshabd_pins';
    const pins = JSON.parse(localStorage.getItem(key) || '[]');
    pins.push(pin);
    localStorage.setItem(key, JSON.stringify(pins.slice(-50)));
  } catch (e) {
    /* private mode / storage full — the pin still reached the endpoint if set */
  }
}

// ─── RECEIPT ─────────────────────────────────────────────────────────────────
function renderReceipt(pin) {
  const list = document.getElementById('pinReceiptList');
  list.textContent = '';

  const rows = [
    ['CITY',  pin.newCity ? `${pin.city} (new to the map)` : pin.city],
    ['AREA',  pin.script ? `${pin.area} · ${pin.script}` : pin.area],
    ['STORY', pin.story],
    ['ON',    pin.products.join(' · ')],
    ['VOL',   pin.volumeLabel],
    ['FROM',  pin.handle ? `${pin.name} · ${pin.handle}` : pin.name],
  ];

  rows.forEach(([label, value]) => {
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value;
    list.append(dt, dd);
  });
}

// ─── SUBMIT ──────────────────────────────────────────────────────────────────
form.addEventListener('submit', async e => {
  e.preventDefault();

  // Honeypot: bots fill everything, humans never see this field.
  if (form.querySelector('#website').value) return;

  const problem = firstProblem();
  if (problem) { flag(problem); return; }

  const pin = collect();

  submit.disabled    = true;
  submit.textContent = 'DROPPING…';
  note.textContent   = '';
  note.className     = 'pin-note';

  if (PIN_ENDPOINT) {
    try {
      const res = await fetch(PIN_ENDPOINT, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body:    JSON.stringify(pin),
      });
      if (!res.ok) throw new Error(res.status);
    } catch (err) {
      saveLocally(pin);
      submit.disabled    = false;
      submit.textContent = 'DROP THE PIN →';
      note.textContent   = 'Couldn\'t reach us just now — your pin is saved on this device. Try again in a bit, or DM it to @pd.silence.';
      note.className     = 'pin-note err';
      return;
    }
  }

  saveLocally(pin);
  renderReceipt(pin);

  const done = document.getElementById('pinDone');

  /* No endpoint means the pin got as far as this browser and no further, so
     the panel drops the "received" language and hands them a route that does
     reach us. The receipt below is still worth showing — it is what they would
     paste into a DM. */
  if (!ENDPOINT_LIVE) {
    done.querySelector('.q-num').textContent = 'Not sent yet';
    done.querySelector('h2').textContent = 'Saved on this device.';
    done.querySelector('p').textContent =
      'The request desk is not collecting yet, so this pin is held in this browser '
      + 'rather than sent to us. Send it over on Instagram and it goes on the map today.';
    const cta = done.querySelector('.pin-done-actions .btn:not(.btn-ghost)');
    if (cta) cta.textContent = 'Send it to us on Instagram';
  }

  form.style.display = 'none';
  document.querySelector('.pin-progress').style.display = 'none';
  done.classList.add('show');
  done.setAttribute('aria-hidden', 'false');
  done.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// ─── MAGNETIC BUTTON (matches the rest of the site) ──────────────────────────
document.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('mousemove', ev => {
    const r  = btn.getBoundingClientRect();
    const dx = ev.clientX - (r.left + r.width  / 2);
    const dy = ev.clientY - (r.top  + r.height / 2);
    btn.style.transform =
      `perspective(600px) translate3d(${dx * 0.18}px, ${dy * 0.18}px, 26px)` +
      ` rotateX(${(-dy * 0.07).toFixed(2)}deg) rotateY(${(dx * 0.07).toFixed(2)}deg)`;
  });
  btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
});
