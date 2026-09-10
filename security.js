/**
 * PDS — Client-Side Security Guards
 * Runs on every page. Lightweight, zero dependencies.
 * =====================================================
 * NOTE: Real security lives on the SERVER (.htaccess, hosting config)
 * and in the CSP headers on each page. Client-side JS can always be
 * bypassed, so this file deliberately stays small: it keeps the one
 * guard that actually does something (frame-busting) and the
 * disclosure notice, and nothing that costs a frame.
 *
 * Deliberately NOT here any more, and why:
 *   · right-click / text-selection / Ctrl+S / F12 blocking — stopped
 *     nobody (View Source and curl exist), but made the site feel
 *     broken: visitors couldn't select a neighbourhood name to search
 *     it, or copy a size.
 *   · a 1s setInterval guessing whether devtools was open — woke the
 *     main thread every second of every visit, forever, to print a
 *     console warning.
 *   · a MutationObserver over the whole document watching for injected
 *     <script> tags — the page's CSP (script-src 'self') already
 *     refuses those before they can run.
 */

(function () {
  'use strict';

  /* ── BLOCK IFRAME EMBEDDING (clickjacking) ────────────── */
  // The CSP frame-ancestors/X-Frame-Options headers are the real
  // defence; this is the belt to that pair of braces.
  if (window.top !== window.self) {
    try { window.top.location = window.self.location; }
    catch (e) { document.body.innerHTML = ''; }
  }

  /* ── ETHICAL DISCLOSURE ───────────────────────────────── */
  console.log(
    '%cPIN DROP SILENCE',
    'font-size:14px; font-weight:bold; color:#f5b301; background:#0c0c0c; padding:4px 8px;'
  );
  console.log(
    '%cFound a vulnerability? Email: security@apshabd.com\nResponsible disclosure is appreciated.',
    'color:#888; font-size:12px;'
  );
})();
