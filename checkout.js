/* Checkout page logic: renders the order summary from the shared cart, then
   drives a mock payment modal (no real gateway wired up — see the comment
   in checkout.html). Nothing here reaches a network; connect-src is 'none'
   in the page's CSP on purpose. */
(function () {
  'use strict';

  function escapeHTML(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function init() {
    var cart = window.APSHABD_CART;
    if (!cart) return;
    var items = cart.read();

    var emptyEl = document.getElementById('checkoutEmpty');
    var contentEl = document.getElementById('checkoutContent');

    if (!items.length) {
      emptyEl.hidden = false;
      contentEl.hidden = true;
      return;
    }
    emptyEl.hidden = true;
    contentEl.hidden = false;

    var subtotal = cart.totalPrice(items);
    var summaryLines = document.getElementById('summaryLines');
    summaryLines.innerHTML = items.map(function (item) {
      return (
        '<div class="checkout-line">' +
          '<span>' + escapeHTML(item.name) + ' · ' + escapeHTML(item.colourLabel) + ' · ' + escapeHTML(item.size) + ' × ' + item.qty + '</span>' +
          '<span>' + cart.formatINR(item.price * item.qty) + '</span>' +
        '</div>'
      );
    }).join('');
    document.getElementById('summarySubtotal').textContent = cart.formatINR(subtotal);
    document.getElementById('summaryTotal').textContent = cart.formatINR(subtotal);

    var payAmountEl = document.getElementById('payAmount');
    var payConfirmAmountEl = document.getElementById('payConfirmAmount');
    payAmountEl.textContent = cart.formatINR(subtotal);
    payConfirmAmountEl.textContent = cart.formatINR(subtotal);

    var form = document.getElementById('shippingForm');
    var payBtn = document.getElementById('payBtn');
    var payModal = document.getElementById('payModal');
    var payMethods = document.getElementById('payMethods');
    var payProcessing = document.getElementById('payProcessing');
    var paySuccess = document.getElementById('paySuccess');
    var payConfirmBtn = document.getElementById('payConfirmBtn');
    var payOrderId = document.getElementById('payOrderId');

    function openPayModal() {
      if (!form.reportValidity()) return;
      payModal.classList.add('is-open');
      payModal.setAttribute('aria-hidden', 'false');
      payMethods.hidden = false;
      document.querySelector('.pay-modal-amount').hidden = false;
      payProcessing.hidden = true;
      paySuccess.hidden = true;
      payConfirmBtn.hidden = false;
      payConfirmBtn.disabled = false;
      payConfirmBtn.textContent = 'Pay ' + cart.formatINR(subtotal);
    }

    function closePayModal() {
      payModal.classList.remove('is-open');
      payModal.setAttribute('aria-hidden', 'true');
    }

    payBtn.addEventListener('click', openPayModal);

    [].slice.call(payModal.querySelectorAll('[data-pay-close]')).forEach(function (el) {
      el.addEventListener('click', closePayModal);
    });

    [].slice.call(payModal.querySelectorAll('.pay-method')).forEach(function (label) {
      label.addEventListener('click', function () {
        [].slice.call(payModal.querySelectorAll('.pay-method')).forEach(function (l) {
          l.classList.remove('is-selected');
        });
        label.classList.add('is-selected');
      });
    });

    payConfirmBtn.addEventListener('click', function () {
      payMethods.hidden = true;
      document.querySelector('.pay-modal-amount').hidden = true;
      payConfirmBtn.hidden = true;
      payProcessing.hidden = false;

      /* Simulated processing delay only — this is a UI demo, not a real
         gateway call. Swap for an actual Payment Links / Checkout redirect
         when a merchant account and verification backend exist. */
      setTimeout(function () {
        payProcessing.hidden = true;
        paySuccess.hidden = false;
        var orderId = 'APSHABD-' + Date.now().toString(36).toUpperCase();
        payOrderId.textContent = 'Order ' + orderId + ' (demo only)';
        cart.clear();
      }, 1400);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
