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
    let lastJump = 0;
    let held = false;
    let holdFrame = 0;
    const interactiveSelector = "button,a,input,textarea,select,[role='dialog'],.kd-profile-pill,.kd-profile-modal";
    const sendJump = () => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: " ",
          code: "Space",
          keyCode: 32,
          which: 32,
          bubbles: true,
          cancelable: true
        })
      );
    };
    const holdLoop = () => {
      if (!held) {
        holdFrame = 0;
        return;
      }
      sendJump();
      holdFrame = requestAnimationFrame(holdLoop);
    };
    const startJump = (event) => {
      const target = event.target;
      if (target && target.closest && target.closest(interactiveSelector)) return;
      if (!location.pathname.includes("/play/")) return;
      const now = performance.now();
      if (now - lastJump < 24) {
        event.preventDefault();
        return;
      }
      lastJump = now;
      event.preventDefault();
      sendJump();
      if (!held) {
        held = true;
        holdFrame = requestAnimationFrame(holdLoop);
      }
    };
    const stopJump = () => {
      held = false;
      if (holdFrame) cancelAnimationFrame(holdFrame);
      holdFrame = 0;
    };
    window.addEventListener("pointerdown", startJump, { passive: false, capture: true });
    window.addEventListener("touchstart", startJump, { passive: false, capture: true });
    window.addEventListener("pointerup", stopJump, { passive: true, capture: true });
    window.addEventListener("pointercancel", stopJump, { passive: true, capture: true });
    window.addEventListener("touchend", stopJump, { passive: true, capture: true });
    window.addEventListener("touchcancel", stopJump, { passive: true, capture: true });
    window.addEventListener("blur", stopJump);
    window.addEventListener(
      "contextmenu",
      (event) => {
        if (location.pathname.includes("/play/")) event.preventDefault();
      },
      { capture: true }
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

  function syncRouteClasses() {
    const apply = () => {
      document.body.classList.toggle("kd-play-route", location.pathname.includes("/play/"));
    };
    apply();
    window.addEventListener("popstate", apply);
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    history.pushState = function (...args) {
      const result = originalPushState.apply(this, args);
      queueMicrotask(apply);
      return result;
    };
    history.replaceState = function (...args) {
      const result = originalReplaceState.apply(this, args);
      queueMicrotask(apply);
      return result;
    };
  }

  function installProfileWidget() {
    const key = "kd:profile";
    const defaultProfile = { name: "Player" };
    const readProfile = () => {
      try {
        return { ...defaultProfile, ...(JSON.parse(localStorage.getItem(key) || "{}") || {}) };
      } catch {
        return defaultProfile;
      }
    };
    const saveProfile = (profile) => {
      localStorage.setItem(key, JSON.stringify(profile));
      window.dispatchEvent(new CustomEvent("kd:profile", { detail: profile }));
    };

    const style = document.createElement("style");
    style.textContent = `
      @media (max-width: 640px) {
        html, body {
          overscroll-behavior: none;
        }
        body {
          touch-action: manipulation;
        }
        .container {
          padding-left: 0.75rem !important;
          padding-right: 0.75rem !important;
        }
        .container.py-10 {
          padding-top: 0.75rem !important;
          padding-bottom: 4.25rem !important;
        }
        .max-w-\\[960px\\] {
          max-width: 100vw !important;
        }
        canvas {
          width: min(100vw - 18px, 960px) !important;
          max-width: none !important;
          border-radius: 12px;
        }
        .kd-play-route {
          overflow: hidden;
        }
        .kd-play-route main,
        .kd-play-route .container {
          max-width: 100vw !important;
        }
        .kd-play-route .container.py-6 {
          padding: 0.35rem 0.55rem 3.1rem !important;
        }
        .kd-play-route nav,
        .kd-play-route header,
        .kd-play-route footer {
          display: none !important;
        }
        .kd-play-route .flex.flex-col.items-center.gap-4 {
          gap: 0.45rem !important;
        }
        .kd-play-route .flex.w-full.max-w-\\[960px\\].flex-wrap {
          align-items: center !important;
          gap: 0.35rem !important;
          justify-content: space-between !important;
        }
        .kd-play-route .flex.w-full.max-w-\\[960px\\].flex-wrap > button {
          padding: 0.42rem 0.62rem !important;
          font-size: 11px !important;
          line-height: 1 !important;
        }
        .kd-play-route .flex.flex-wrap.items-center.gap-2.text-xs {
          gap: 0.25rem !important;
          max-width: calc(100vw - 92px);
          justify-content: flex-end;
        }
        .kd-play-route .flex.flex-wrap.items-center.gap-2.text-xs span {
          padding: 0.28rem 0.38rem !important;
          font-size: 10px !important;
          line-height: 1 !important;
        }
        .kd-play-route .flex.flex-wrap.items-center.gap-2.text-xs span span:first-child {
          display: none !important;
        }
        .kd-play-route .mb-1.flex.justify-between {
          font-size: 9px !important;
          letter-spacing: 0.08em !important;
          padding: 0 0.1rem;
        }
        .kd-play-route canvas {
          width: calc(100vw - 10px) !important;
        }
        .kd-play-route canvas + .pointer-events-none {
          opacity: 0.9;
        }
        canvas + .pointer-events-none {
          left: 8px !important;
          top: 8px !important;
          width: min(300px, calc(100vw - 34px)) !important;
          max-width: calc(100vw - 34px) !important;
          padding: 9px 10px !important;
          border-radius: 12px !important;
          text-align: left !important;
        }
        canvas + .pointer-events-none div:first-child {
          font-size: 13px !important;
          line-height: 1.2 !important;
        }
        canvas + .pointer-events-none div:last-child {
          margin-top: 3px !important;
          font-size: 11px !important;
          line-height: 1.25 !important;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        canvas + .pointer-events-none + .absolute,
        canvas + .pointer-events-none + .absolute + .absolute {
          padding: 12px !important;
        }
      }
      .kd-profile-pill {
        position: fixed;
        right: 16px;
        bottom: 16px;
        z-index: 70;
        display: flex;
        align-items: center;
        gap: 10px;
        max-width: calc(100vw - 32px);
        border: 1px solid hsl(var(--border));
        border-radius: 999px;
        background: hsl(var(--card) / 0.82);
        color: hsl(var(--foreground));
        box-shadow: 0 0 24px hsl(var(--neon-cyan) / 0.18);
        backdrop-filter: blur(14px);
        padding: 9px 12px;
        font: 700 12px/1.1 Inter, Manrope, system-ui, sans-serif;
      }
      .kd-profile-pill button {
        border: 0;
        border-radius: 999px;
        background: linear-gradient(135deg, hsl(var(--neon-cyan)), hsl(var(--neon-pink)));
        color: hsl(var(--background));
        cursor: pointer;
        padding: 7px 11px;
        font: inherit;
      }
      .kd-profile-modal {
        position: fixed;
        inset: 0;
        z-index: 90;
        display: none;
        place-items: center;
        background: hsl(var(--background) / 0.72);
        backdrop-filter: blur(8px);
        padding: 18px;
      }
      .kd-profile-modal.is-open { display: grid; }
      .kd-profile-card {
        width: min(420px, 100%);
        border: 1px solid hsl(var(--border));
        border-radius: 22px;
        background: hsl(var(--card) / 0.96);
        box-shadow: 0 0 42px hsl(var(--neon-cyan) / 0.2);
        padding: 22px;
      }
      .kd-profile-card h2 {
        margin: 0 0 12px;
        font: 900 24px/1.1 Orbitron, Inter, sans-serif;
      }
      .kd-profile-card label {
        display: grid;
        gap: 8px;
        color: hsl(var(--muted-foreground));
        font-size: 12px;
        letter-spacing: .12em;
        text-transform: uppercase;
      }
      .kd-profile-card input {
        border: 1px solid hsl(var(--border));
        border-radius: 12px;
        background: hsl(var(--input));
        color: hsl(var(--foreground));
        outline: none;
        padding: 12px 14px;
        font-size: 16px;
      }
      .kd-profile-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 16px;
      }
      .kd-profile-actions button {
        border: 1px solid hsl(var(--border));
        border-radius: 12px;
        background: hsl(var(--card));
        color: hsl(var(--foreground));
        cursor: pointer;
        padding: 10px 14px;
        font-weight: 800;
      }
      .kd-profile-actions button:last-child {
        border: 0;
        background: linear-gradient(135deg, hsl(var(--neon-cyan)), hsl(var(--neon-pink)));
        color: hsl(var(--background));
      }
      @media (max-width: 640px) {
        .kd-profile-pill {
          left: auto;
          right: 10px;
          bottom: 10px;
          width: auto;
          max-width: 210px;
          justify-content: space-between;
          padding: 7px 8px 7px 10px;
          gap: 8px;
          font-size: 11px;
        }
        .kd-profile-pill button {
          padding: 6px 8px;
        }
        .kd-profile-pill span {
          max-width: 92px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }
    `;
    document.head.appendChild(style);

    const pill = document.createElement("div");
    pill.className = "kd-profile-pill";
    const name = document.createElement("span");
    const edit = document.createElement("button");
    edit.type = "button";
    edit.textContent = "Профиль";
    pill.append(name, edit);
    document.body.appendChild(pill);

    const modal = document.createElement("div");
    modal.className = "kd-profile-modal";
    modal.innerHTML = `
      <form class="kd-profile-card">
        <h2>Профиль игрока</h2>
        <label>
          Ник в игре
          <input name="name" maxlength="18" autocomplete="nickname" placeholder="Например, Grisha">
        </label>
        <div class="kd-profile-actions">
          <button type="button" data-close>Закрыть</button>
          <button type="submit">Сохранить</button>
        </div>
      </form>
    `;
    document.body.appendChild(modal);

    const input = modal.querySelector("input");
    const render = () => {
      const profile = readProfile();
      name.textContent = `Игрок: ${profile.name || "Player"}`;
      input.value = profile.name || "";
    };

    edit.addEventListener("click", () => {
      render();
      modal.classList.add("is-open");
      input.focus();
    });
    modal.addEventListener("click", (event) => {
      if (event.target === modal || event.target.matches("[data-close]")) modal.classList.remove("is-open");
    });
    modal.querySelector("form").addEventListener("submit", (event) => {
      event.preventDefault();
      const cleanName = input.value.trim().slice(0, 18) || "Player";
      saveProfile({ ...readProfile(), name: cleanName });
      render();
      modal.classList.remove("is-open");
    });
    window.addEventListener("kd:profile", render);
    render();
  }

  document.title = "Knowledge Dash - автономная версия";
  normalizeStaticRoute();
  addStaticNavFallback();
  syncRouteClasses();
  improveMobileTap();
  installProfileWidget();
})();
