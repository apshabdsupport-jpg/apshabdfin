/* Shared cart engine + drawer UI, loaded on every page. Reads/writes the
   same localStorage key across index.html and the city pages so a tee added
   on chennai.html shows up in the drawer on delhi.html or at checkout.
   Demo store: nothing here talks to a server or a real payment gateway. */
(function () {
  'use strict';

  var STORAGE_KEY = 'apshabd_cart_v1';
  var DEMO_NOTE = 'Demo store — no real payment is processed.';

  function readCart() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var items = raw ? JSON.parse(raw) : [];
      return Array.isArray(items) ? items : [];
    } catch (e) {
      return [];
    }
  }

  function writeCart(items) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch (e) {}
    renderBadges();
    renderDrawer();
  }

  function addItem(item) {
    var items = readCart();
    var match = null;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.city === item.city && it.loc === item.loc && it.colourway === item.colourway && it.size === item.size) {
        match = it;
        break;
      }
    }
    if (match) match.qty += item.qty;
    else items.push(item);
    writeCart(items);
  }

  function updateQty(index, qty) {
    var items = readCart();
    if (!items[index]) return;
    if (qty <= 0) items.splice(index, 1);
    else items[index].qty = qty;
    writeCart(items);
  }

  function removeItem(index) {
    var items = readCart();
    items.splice(index, 1);
    writeCart(items);
  }

  function totalCount(items) {
    return items.reduce(function (n, i) { return n + i.qty; }, 0);
  }

  function totalPrice(items) {
    return items.reduce(function (n, i) { return n + i.qty * i.price; }, 0);
  }

  function formatINR(n) {
    return '₹' + Math.round(n).toLocaleString('en-IN');
  }

  function escapeHTML(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var badgeButtons = [];
  var drawer, drawerBody, drawerFooter;

  function injectCartTrigger() {
    var nav = document.querySelector('.site-nav') || document.querySelector('.nav.glass') || document.querySelector('nav.nav');
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cart-trigger';
    btn.setAttribute('aria-label', 'Open cart');
    btn.innerHTML = '<span class="cart-trigger-label">Cart</span><span class="cart-trigger-count" aria-hidden="true">0</span>';
    btn.addEventListener('click', openDrawer);
    if (nav) {
      nav.appendChild(btn);
    } else {
      btn.classList.add('cart-trigger-floating');
      document.body.appendChild(btn);
    }
    badgeButtons.push(btn);
  }

  function renderBadges() {
    var items = readCart();
    var count = totalCount(items);
    badgeButtons.forEach(function (btn) {
      var el = btn.querySelector('.cart-trigger-count');
      if (el) el.textContent = String(count);
      btn.classList.toggle('has-items', count > 0);
    });
  }

  function buildDrawer() {
    drawer = document.createElement('div');
    drawer.className = 'cart-drawer';
    drawer.setAttribute('aria-hidden', 'true');
    drawer.innerHTML =
      '<div class="cart-drawer-scrim" data-cart-close></div>' +
      '<div class="cart-drawer-panel" role="dialog" aria-modal="true" aria-label="Shopping cart">' +
        '<div class="cart-drawer-head">' +
          '<h2>Your cart</h2>' +
          '<button type="button" class="cart-drawer-close" data-cart-close aria-label="Close cart">×</button>' +
        '</div>' +
        '<div class="cart-drawer-body"></div>' +
        '<div class="cart-drawer-footer"></div>' +
      '</div>';
    document.body.appendChild(drawer);
    drawerBody = drawer.querySelector('.cart-drawer-body');
    drawerFooter = drawer.querySelector('.cart-drawer-footer');
    [].slice.call(drawer.querySelectorAll('[data-cart-close]')).forEach(function (el) {
      el.addEventListener('click', closeDrawer);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeDrawer();
    });
  }

  function renderDrawer() {
    if (!drawerBody) return;
    var items = readCart();
    if (!items.length) {
      drawerBody.innerHTML = '<p class="cart-empty">Your cart is empty. Find a tee that is your postcode.</p>';
      drawerFooter.innerHTML = '';
      return;
    }
    drawerBody.innerHTML = items.map(function (item, i) {
      return (
        '<div class="cart-line" data-index="' + i + '">' +
          '<img class="cart-line-img" src="' + escapeHTML(item.image) + '" alt="" />' +
          '<div class="cart-line-info">' +
            '<span class="cart-line-name">' + escapeHTML(item.name) + '</span>' +
            '<span class="cart-line-meta">' + escapeHTML(item.colourLabel) + ' · Size ' + escapeHTML(item.size) + '</span>' +
            '<div class="cart-line-qty">' +
              '<button type="button" data-cart-dec aria-label="Decrease quantity">−</button>' +
              '<span>' + item.qty + '</span>' +
              '<button type="button" data-cart-inc aria-label="Increase quantity">+</button>' +
            '</div>' +
          '</div>' +
          '<div class="cart-line-right">' +
            '<span class="cart-line-price">' + formatINR(item.price * item.qty) + '</span>' +
            '<button type="button" class="cart-line-remove" data-cart-remove>Remove</button>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    [].slice.call(drawerBody.querySelectorAll('.cart-line')).forEach(function (line) {
      var index = Number(line.dataset.index);
      line.querySelector('[data-cart-inc]').addEventListener('click', function () {
        var current = readCart();
        if (current[index]) updateQty(index, current[index].qty + 1);
      });
      line.querySelector('[data-cart-dec]').addEventListener('click', function () {
        var current = readCart();
        if (current[index]) updateQty(index, current[index].qty - 1);
      });
      line.querySelector('[data-cart-remove]').addEventListener('click', function () {
        removeItem(index);
      });
    });

    drawerFooter.innerHTML =
      '<div class="cart-subtotal"><span>Subtotal</span><strong>' + formatINR(totalPrice(items)) + '</strong></div>' +
      '<p class="cart-demo-note">' + DEMO_NOTE + '</p>' +
      '<a class="cart-checkout-btn" href="checkout.html">Checkout</a>';
  }

  function openDrawer() {
    if (!drawer) buildDrawer();
    renderDrawer();
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('cart-drawer-lock');
  }

  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('cart-drawer-lock');
  }

  function init() {
    injectCartTrigger();
    buildDrawer();
    renderBadges();
    renderDrawer();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.APSHABD_CART = {
    add: addItem,
    read: readCart,
    write: writeCart,
    clear: function () { writeCart([]); },
    totalPrice: totalPrice,
    totalCount: totalCount,
    formatINR: formatINR,
    open: openDrawer,
    close: closeDrawer,
    DEMO_NOTE: DEMO_NOTE
  };
})();
