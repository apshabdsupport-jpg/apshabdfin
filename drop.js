(function () {
  'use strict';

  var drops = [].slice.call(document.querySelectorAll('.drop'));
  if (!drops.length) return;

  document.body.classList.add('has-drop-grid');

  function wayName(button) {
    return button.getAttribute('aria-label') ||
      (button.dataset.cw || '').replace(/-/g, ' ');
  }

  drops.forEach(function (drop) {
    var location = drop.dataset.loc;
    var grid = drop.closest('.drop-grid');
    var city = (grid && grid.dataset.city) || 'mumbai';
    var stage = drop.querySelector('.drop-stage');
    var front = drop.querySelector('.drop-face--front img');
    var back = drop.querySelector('.drop-face--back img');
    var hint = drop.querySelector('.drop-hint');
    var waysWrap = drop.querySelector('.drop-ways');
    var ways = [].slice.call(drop.querySelectorAll('.way'));
    if (!stage || !front || !back) return;

    /* The garment plate is presentational. Explicit buttons make both
       views discoverable and remove the old hidden click/flip gesture. */
    stage.removeAttribute('role');
    stage.removeAttribute('tabindex');
    stage.removeAttribute('aria-pressed');
    stage.removeAttribute('data-cursor');
    stage.setAttribute('aria-label', location + ' tee product view');
    if (hint) hint.remove();

    var controls = document.createElement('div');
    controls.className = 'drop-view-controls';
    controls.setAttribute('role', 'group');
    controls.setAttribute('aria-label', 'Choose garment view');

    function makeViewButton(label, view) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'drop-view-button';
      button.dataset.view = view;
      button.textContent = label;
      return button;
    }

    var frontButton = makeViewButton('Front', 'front');
    var backButton = makeViewButton('Back', 'back');
    controls.appendChild(frontButton);
    controls.appendChild(backButton);
    stage.insertAdjacentElement('afterend', controls);

    function setView(view) {
      var showBack = view === 'back';
      drop.classList.toggle('is-flipped', showBack);
      frontButton.classList.toggle('is-active', !showBack);
      backButton.classList.toggle('is-active', showBack);
      frontButton.setAttribute('aria-pressed', showBack ? 'false' : 'true');
      backButton.setAttribute('aria-pressed', showBack ? 'true' : 'false');
      stage.setAttribute('aria-label', location + ' tee, ' + view + ' view');
    }

    frontButton.addEventListener('click', function () { setView('front'); });
    backButton.addEventListener('click', function () { setView('back'); });
    setView('front');

    var nameElement = null;
    if (waysWrap && ways.length) {
      var bar = document.createElement('div');
      var label = document.createElement('span');
      nameElement = document.createElement('span');
      bar.className = 'drop-ways-bar';
      label.className = 'drop-ways-label';
      label.textContent = 'Colour — ' + ways.length + ' options';
      nameElement.className = 'drop-ways-name';
      nameElement.setAttribute('aria-live', 'polite');
      nameElement.textContent = wayName(
        ways.filter(function (way) { return way.classList.contains('is-on'); })[0] || ways[0]
      );
      bar.appendChild(label);
      bar.appendChild(nameElement);
      waysWrap.parentNode.insertBefore(bar, waysWrap);
    }

    function swap(colourway, button) {
      if (button.classList.contains('is-on')) return;
      var base = './/assets/' + city + '/' + location + '/' + colourway;
      ways.forEach(function (way) {
        way.classList.remove('is-on');
        way.setAttribute('aria-pressed', 'false');
      });
      button.classList.add('is-on');
      button.setAttribute('aria-pressed', 'true');
      if (nameElement) nameElement.textContent = wayName(button);
      front.src = base + '-front.jpg';
      back.src = base + '-back.jpg';
    }

    ways.forEach(function (button) {
      button.setAttribute('aria-pressed', button.classList.contains('is-on') ? 'true' : 'false');
      button.addEventListener('click', function () { swap(button.dataset.cw, button); });
    });
  });
})();
