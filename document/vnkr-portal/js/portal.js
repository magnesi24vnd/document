/**
 * VNKR.VN — Portal utilities (testable module)
 * Pure functions that operate on a given document/window context.
 */

"use strict";

/**
 * Wire the mobile nav toggle button.
 * Returns true when the handler was attached, false when elements are missing.
 *
 * @param {HTMLElement|null} toggle
 * @param {HTMLElement|null} menu
 * @returns {boolean}
 */
function initNavToggle(toggle, menu) {
  if (!toggle || !menu) return false;
  toggle.addEventListener("click", () => {
    const open = menu.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  return true;
}

/**
 * Mark the nav link whose href matches the current pathname as active.
 *
 * @param {NodeListOf<HTMLAnchorElement>} links
 * @param {string} currentPath  — e.g. location.pathname
 */
function markActiveLink(links, currentPath) {
  const normalised = currentPath.replace(/\/$/, "") || "/";
  links.forEach((a) => {
    const href = (a.getAttribute("href") || "").replace(/\/$/, "");
    if (href && normalised.endsWith(href)) {
      a.classList.add("active");
      a.setAttribute("aria-current", "page");
    }
  });
}

/**
 * Attach copy-to-clipboard buttons to every <pre> element.
 *
 * @param {NodeListOf<HTMLElement>} pres
 * @param {(text: string) => Promise<void>} writeText  — injectable clipboard writer
 * @param {{ label?: string, copyText?: string, copiedText?: string, errorText?: string }} [opts]
 */
function initCopyButtons(pres, writeText, opts = {}) {
  const {
    label = "Sao chép đoạn mã",
    copyText = "Sao chép",
    copiedText = "Đã sao chép ✓",
    errorText = "Lỗi",
  } = opts;

  pres.forEach((pre) => {
    const btn = pre.ownerDocument.createElement("button");
    btn.className = "copy-btn";
    btn.textContent = copyText;
    btn.setAttribute("aria-label", label);
    pre.style.position = "relative";
    pre.appendChild(btn);

    btn.addEventListener("click", async () => {
      const code = pre.querySelector("code") || pre;
      try {
        await writeText(code.innerText ?? code.textContent ?? "");
        btn.textContent = copiedText;
        setTimeout(() => {
          btn.textContent = copyText;
        }, 2000);
      } catch (_) {
        btn.textContent = errorText;
      }
    });
  });
}

/**
 * Attach smooth-scroll behaviour to every in-page anchor.
 *
 * @param {NodeListOf<HTMLAnchorElement>} anchors
 * @param {(selector: string) => Element|null} querySelector  — injectable
 */
function initSmoothScroll(anchors, querySelector) {
  anchors.forEach((a) => {
    a.addEventListener("click", (e) => {
      const target = querySelector(a.getAttribute("href"));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
}

module.exports = { initNavToggle, markActiveLink, initCopyButtons, initSmoothScroll };
