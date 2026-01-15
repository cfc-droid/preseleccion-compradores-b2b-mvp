// fixed_header.js
// Encabezado fijo para la tabla de Resultados (sin tocar ui.js)
// - Clona títulos desde el thead real
// - Se pega arriba del panel
// - Toggle ocultar/mostrar (persistente por navegador)
// - Sync scroll horizontal con contenedor real si existe overflow
//
// FIX CLAVE:
// No ocultamos TODO el wrap (porque escondería el botón).
// Ocultamos solo el bloque scroll/tabla, dejando visible la barra superior.

(() => {
  const LS_KEY = "psv_fixed_header_enabled_v1";

  function isEnabled() {
    const v = localStorage.getItem(LS_KEY);
    if (v === null) return true; // default ON
    return v === "1";
  }

  function setEnabled(val) {
    try { localStorage.setItem(LS_KEY, val ? "1" : "0"); } catch (_) {}
  }

  function $(sel, root = document) { return root.querySelector(sel); }

  function ensureMountPoint() {
    const host = $("#psvFixedHeaderWrap");
    return !!host;
  }

  function getRealTable() {
    const wrap = document.getElementById("resultsTable");
    const table = wrap ? wrap.querySelector("table.table") : null;
    const thead = table ? table.querySelector("thead") : null;
    const ths = thead ? Array.from(thead.querySelectorAll("th")) : [];
    if (!wrap || !table || !thead || !ths.length) return null;
    return { wrap, table, ths };
  }

  function getRealHorizontalScroller(real) {
    if (!real || !real.wrap) return null;
    try {
      if (real.wrap.scrollWidth > real.wrap.clientWidth) return real.wrap;
    } catch (_) {}
    return null;
  }

  function buildHeader() {
    const real = getRealTable();
    if (!real) return false;

    const wrap = document.getElementById("psvFixedHeaderWrap");
    const title = document.getElementById("psvFixedHeaderTitle");
    const btn = document.getElementById("psvFixedHeaderToggle");
    const scroller = document.getElementById("psvFixedHeaderScroll");
    const headTable = document.getElementById("psvFixedHeaderTable");

    if (!wrap || !title || !btn || !scroller || !headTable) return false;

    // Asegurar que el header use reglas base similares
    headTable.className = "table";
    headTable.style.tableLayout = "fixed";

    // Re-crear thead fijo
    headTable.innerHTML = "";
    const thead = document.createElement("thead");
    const tr = document.createElement("tr");

    for (const th of real.ths) {
      const th2 = document.createElement("th");
      th2.textContent = (th.textContent || "").trim();
      tr.appendChild(th2);
    }

    thead.appendChild(tr);
    headTable.appendChild(thead);

    function syncWidths() {
      const realNow = getRealTable();
      if (!realNow) return;

      const realThs = realNow.ths;
      const fakeThs = Array.from(headTable.querySelectorAll("th"));
      if (fakeThs.length !== realThs.length) return;

      try {
        const wTable = realNow.table.getBoundingClientRect().width;
        if (wTable && wTable > 0) headTable.style.width = Math.ceil(wTable) + "px";
      } catch (_) {}

      for (let i = 0; i < realThs.length; i++) {
        const w = realThs[i].getBoundingClientRect().width;
        if (w && w > 0) {
          const px = Math.ceil(w) + "px";
          fakeThs[i].style.width = px;
          fakeThs[i].style.minWidth = px;
          fakeThs[i].style.maxWidth = px;
        }
      }
    }

    // ====== Limpiar listeners previos (idempotente) ======
    // Clonamos SOLO el botón para evitar duplicar listeners.
    const btnClone = btn.cloneNode(true);
    btn.parentNode.replaceChild(btnClone, btn);

    const btn2 = document.getElementById("psvFixedHeaderToggle");
    const scroller2 = document.getElementById("psvFixedHeaderScroll");

    function applyEnabled() {
      const on = isEnabled();
      // IMPORTANTE: ocultamos SOLO la parte scroll/tabla
      scroller2.classList.toggle("psvFixedHeaderHidden", !on);
      btn2.textContent = on ? "Ocultar encabezado fijo" : "Mostrar encabezado fijo";
    }

    btn2.addEventListener("click", (e) => {
      e.preventDefault();
      const next = !isEnabled();
      setEnabled(next);
      applyEnabled();
      if (next) {
        try { requestAnimationFrame(syncWidths); } catch (_) { syncWidths(); }
      }
    });

    applyEnabled();

    // ====== Sync scroll horizontal (solo si hay overflow real) ======
    const realScroller = getRealHorizontalScroller(real);

    if (realScroller) {
      let lock = false;

      const syncFromReal = () => {
        if (lock) return;
        lock = true;
        try { scroller2.scrollLeft = realScroller.scrollLeft; } catch (_) {}
        lock = false;
      };

      const syncFromFake = () => {
        if (lock) return;
        lock = true;
        try { realScroller.scrollLeft = scroller2.scrollLeft; } catch (_) {}
        lock = false;
      };

      realScroller.addEventListener("scroll", syncFromReal, { passive: true });
      scroller2.addEventListener("scroll", syncFromFake, { passive: true });
    }

    // ====== Re-sync por layout ======
    try { syncWidths(); } catch (_) {}
    setTimeout(syncWidths, 50);
    setTimeout(syncWidths, 250);
    setTimeout(syncWidths, 800);

    try {
      const ro = new ResizeObserver(() => syncWidths());
      ro.observe(real.wrap);
      ro.observe(real.table);
    } catch (_) {}

    return true;
  }

  function boot() {
    if (!ensureMountPoint()) return;

    let tries = 0;
    const maxTries = 80;

    const tick = () => {
      tries++;
      if (buildHeader()) return;
      if (tries >= maxTries) return;
      setTimeout(tick, 250);
    };
    tick();

    const root = document.getElementById("viewResultados") || document.body;
    const mo = new MutationObserver(() => {
      const real = getRealTable();
      const fake = document.getElementById("psvFixedHeaderTable");
      if (!real || !fake) return;

      const fakeCount = fake.querySelectorAll("th").length;
      const realCount = real.ths.length;

      if (fakeCount !== realCount) buildHeader();
    });
    mo.observe(root, { childList: true, subtree: true });
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
