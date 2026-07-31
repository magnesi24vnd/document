/**
 * VNKR.VN — Main JS (browser entry-point)
 * Handles: mobile nav toggle, active nav link, smooth-scroll, copy-code
 *
 * Pure logic lives in js/portal.js so it can be unit-tested independently.
 */

(function () {
  "use strict";

  var util =
    typeof require === "function"
      ? require("./portal")
      : window.__vnkrPortal; // fallback if bundled

  /* ── Mobile Nav Toggle ────────────────────────────────── */
  util.initNavToggle(
    document.getElementById("nav-toggle"),
    document.getElementById("mobile-menu")
  );

  /* ── Mark active nav link ─────────────────────────────── */
  util.markActiveLink(
    document.querySelectorAll(".site-nav a, .mobile-nav a"),
    location.pathname
  );

  /* ── Copy-code buttons ────────────────────────────────── */
  util.initCopyButtons(
    document.querySelectorAll("pre"),
    function (text) { return navigator.clipboard.writeText(text); }
  );

  /* ── Smooth scroll for in-page anchors ───────────────── */
  util.initSmoothScroll(
    document.querySelectorAll('a[href^="#"]'),
    function (sel) { return document.querySelector(sel); }
  );
})();
