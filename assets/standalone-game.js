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
          left: 12px;
          right: 12px;
          bottom: 12px;
          justify-content: space-between;
          padding: 10px 12px;
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
  improveMobileTap();
  installProfileWidget();
})();
