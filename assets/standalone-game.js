(function () {
  "use strict";

  const route = window.__KD_STATIC_ROUTE__;

  function go(path) {
    if (!path || path === location.pathname) return;
    if (location.protocol === "file:") {
      const page = path === "/" ? "index.html" : path.replace(/^\//, "") + ".html";
      location.href = page;
      return;
    }
    history.pushState(null, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  function normalizeStaticRoute() {
    if (location.protocol !== "file:" || !route) return;
    const root = document.getElementById("root");
    if (!root) return;

    const observer = new MutationObserver(() => {
      const links = document.querySelectorAll("a[href^='/']");
      links.forEach((link) => {
        const href = link.getAttribute("href");
        const page = href === "/" ? "index.html" : href.replace(/^\//, "") + ".html";
        link.setAttribute("href", page);
      });
    });
    observer.observe(root, { childList: true, subtree: true });
  }

  function improveMobileTap() {
    let lastTap = 0;
    document.addEventListener(
      "touchstart",
      (event) => {
        const target = event.target;
        if (target && target.closest && target.closest("button,a,input,textarea,select,[role='dialog']")) return;
        const now = Date.now();
        if (now - lastTap < 300) event.preventDefault();
        lastTap = now;
        window.dispatchEvent(new KeyboardEvent("keydown", { key: " ", code: "Space", bubbles: true }));
      },
      { passive: false }
    );
  }

  function addStaticNavFallback() {
    document.addEventListener("click", (event) => {
      const link = event.target && event.target.closest ? event.target.closest("a[href]") : null;
      if (!link) return;
      const href = link.getAttribute("href");
      if (!href || !href.startsWith("/")) return;
      if (location.protocol !== "file:") return;
      event.preventDefault();
      go(href);
    });
  }

  function patchTitle() {
    document.title = "Knowledge Dash - автономная версия";
  }

  patchTitle();
  normalizeStaticRoute();
  addStaticNavFallback();
  improveMobileTap();
})();
