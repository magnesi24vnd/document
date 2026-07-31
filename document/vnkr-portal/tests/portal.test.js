/**
 * Unit tests for js/portal.js
 * @jest-environment jsdom
 */

"use strict";

const {
  initNavToggle,
  markActiveLink,
  initCopyButtons,
  initSmoothScroll,
} = require("../js/portal");

// ─────────────────────────────────────────────────────────────
// initNavToggle
// ─────────────────────────────────────────────────────────────
describe("initNavToggle", () => {
  function makeElements() {
    const toggle = document.createElement("button");
    toggle.setAttribute("aria-expanded", "false");
    const menu = document.createElement("nav");
    return { toggle, menu };
  }

  test("returns false when toggle is null", () => {
    expect(initNavToggle(null, document.createElement("nav"))).toBe(false);
  });

  test("returns false when menu is null", () => {
    expect(initNavToggle(document.createElement("button"), null)).toBe(false);
  });

  test("returns true when both elements are present", () => {
    const { toggle, menu } = makeElements();
    expect(initNavToggle(toggle, menu)).toBe(true);
  });

  test("toggles is-open class on menu click", () => {
    const { toggle, menu } = makeElements();
    initNavToggle(toggle, menu);

    toggle.click();
    expect(menu.classList.contains("is-open")).toBe(true);

    toggle.click();
    expect(menu.classList.contains("is-open")).toBe(false);
  });

  test("sets aria-expanded to 'true' on first click", () => {
    const { toggle, menu } = makeElements();
    initNavToggle(toggle, menu);
    toggle.click();
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
  });

  test("sets aria-expanded to 'false' on second click", () => {
    const { toggle, menu } = makeElements();
    initNavToggle(toggle, menu);
    toggle.click();
    toggle.click();
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });
});

// ─────────────────────────────────────────────────────────────
// markActiveLink
// ─────────────────────────────────────────────────────────────
describe("markActiveLink", () => {
  function makeLinks(hrefs) {
    return hrefs.map((href) => {
      const a = document.createElement("a");
      a.setAttribute("href", href);
      return a;
    });
  }

  test("adds active class to matching link", () => {
    const links = makeLinks(["/pages/roadmap.html", "/pages/part1-infrastructure.html"]);
    markActiveLink(links, "/pages/roadmap.html");
    expect(links[0].classList.contains("active")).toBe(true);
    expect(links[1].classList.contains("active")).toBe(false);
  });

  test("sets aria-current='page' on matching link", () => {
    const links = makeLinks(["/index.html"]);
    markActiveLink(links, "/index.html");
    expect(links[0].getAttribute("aria-current")).toBe("page");
  });

  test("does not mark links with empty href", () => {
    const links = makeLinks(["", "#"]);
    markActiveLink(links, "");
    links.forEach((a) => expect(a.classList.contains("active")).toBe(false));
  });

  test("trailing-slash normalisation — path and href match after strip", () => {
    const links = makeLinks(["/pages/roadmap.html/"]);
    markActiveLink(links, "/pages/roadmap.html/");
    expect(links[0].classList.contains("active")).toBe(true);
  });

  test("does not mark non-matching links", () => {
    const links = makeLinks(["/pages/part2-security.html"]);
    markActiveLink(links, "/pages/roadmap.html");
    expect(links[0].classList.contains("active")).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// initCopyButtons
// ─────────────────────────────────────────────────────────────
describe("initCopyButtons", () => {
  function makePre(codeText) {
    const pre = document.createElement("pre");
    if (codeText !== undefined) {
      const code = document.createElement("code");
      code.textContent = codeText;
      pre.appendChild(code);
    }
    return pre;
  }

  test("appends a button to each pre element", () => {
    const pres = [makePre("hello"), makePre("world")];
    initCopyButtons(pres, jest.fn().mockResolvedValue());
    pres.forEach((pre) => {
      expect(pre.querySelector("button.copy-btn")).not.toBeNull();
    });
  });

  test("button has correct aria-label and initial text", () => {
    const pre = makePre("code");
    initCopyButtons([pre], jest.fn().mockResolvedValue());
    const btn = pre.querySelector("button.copy-btn");
    expect(btn.getAttribute("aria-label")).toBe("Sao chép đoạn mã");
    expect(btn.textContent).toBe("Sao chép");
  });

  test("sets pre position to relative", () => {
    const pre = makePre("code");
    initCopyButtons([pre], jest.fn().mockResolvedValue());
    expect(pre.style.position).toBe("relative");
  });

  test("button text changes to copiedText after successful copy", async () => {
    const pre = makePre("npm install");
    const writeText = jest.fn().mockResolvedValue();
    initCopyButtons([pre], writeText);
    const btn = pre.querySelector("button.copy-btn");

    btn.click();
    // Flush the microtask queue so the async handler completes
    await Promise.resolve();

    expect(btn.textContent).toBe("Đã sao chép ✓");
    expect(writeText).toHaveBeenCalledWith("npm install");
  });

  test("button text changes to errorText on clipboard failure", async () => {
    const pre = makePre("code");
    const writeText = jest.fn().mockRejectedValue(new Error("denied"));
    initCopyButtons([pre], writeText);
    const btn = pre.querySelector("button.copy-btn");

    btn.click();
    await Promise.resolve();

    expect(btn.textContent).toBe("Lỗi");
  });

  test("custom labels and texts are respected", () => {
    const pre = makePre("x");
    initCopyButtons([pre], jest.fn().mockResolvedValue(), {
      label: "Copy code",
      copyText: "Copy",
      copiedText: "Copied!",
    });
    const btn = pre.querySelector("button.copy-btn");
    expect(btn.getAttribute("aria-label")).toBe("Copy code");
    expect(btn.textContent).toBe("Copy");
  });
});

// ─────────────────────────────────────────────────────────────
// initSmoothScroll
// ─────────────────────────────────────────────────────────────
describe("initSmoothScroll", () => {
  function makeAnchor(href) {
    const a = document.createElement("a");
    a.setAttribute("href", href);
    return a;
  }

  test("calls scrollIntoView and prevents default when target found", () => {
    const anchor = makeAnchor("#section1");
    const target = document.createElement("div");
    target.scrollIntoView = jest.fn();

    const querySelector = jest.fn().mockReturnValue(target);
    initSmoothScroll([anchor], querySelector);

    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    anchor.dispatchEvent(event);

    expect(querySelector).toHaveBeenCalledWith("#section1");
    expect(target.scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });
    expect(event.defaultPrevented).toBe(true);
  });

  test("does NOT prevent default when target not found", () => {
    const anchor = makeAnchor("#missing");
    const querySelector = jest.fn().mockReturnValue(null);
    initSmoothScroll([anchor], querySelector);

    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    anchor.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });

  test("handles multiple anchors independently", () => {
    const a1 = makeAnchor("#s1");
    const a2 = makeAnchor("#s2");
    const t1 = document.createElement("div");
    const t2 = document.createElement("div");
    t1.scrollIntoView = jest.fn();
    t2.scrollIntoView = jest.fn();

    const querySelector = jest.fn((sel) => (sel === "#s1" ? t1 : t2));
    initSmoothScroll([a1, a2], querySelector);

    a1.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    expect(t1.scrollIntoView).toHaveBeenCalledTimes(1);
    expect(t2.scrollIntoView).not.toHaveBeenCalled();

    a2.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    expect(t2.scrollIntoView).toHaveBeenCalledTimes(1);
  });
});
