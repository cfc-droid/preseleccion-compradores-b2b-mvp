// app/modules/export_xlsx.js
// Exporta el "cuadro de registros" (tabla de Resultados) a XLSX en tiempo real.
// - Toma headers y filas desde la tabla real renderizada en #resultsTable
// - Exporta exactamente lo que ves (incluye filtros/orden actual)
// Requiere: XLSX global (ya lo cargás desde CDN)

(() => {
  function $(sel, root = document) { return root.querySelector(sel); }

  function getResultsTableEl() {
    const wrap = document.getElementById("resultsTable");
    if (!wrap) return null;
    // la tabla real usa class "table"
    return wrap.querySelector("table.table");
  }

  function cleanCellText(el) {
    if (!el) return "";
    // Si hay botones/links dentro, textContent igual sirve.
    // Normalizamos espacios y saltos.
    return String(el.textContent || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function tableToAOA(table) {
    const aoa = [];

    const thead = table.querySelector("thead");
    const tbody = table.querySelector("tbody");

    // Headers
    const headRow = thead ? thead.querySelector("tr") : null;
    const ths = headRow ? Array.from(headRow.querySelectorAll("th")) : [];
    const headers = ths.map(cleanCellText);
    if (headers.length) aoa.push(headers);

    // Rows
    const trs = tbody ? Array.from(tbody.querySelectorAll("tr")) : [];
    for (const tr of trs) {
      const tds = Array.from(tr.querySelectorAll("td"));
      const row = tds.map(cleanCellText);
      // Si por alguna razón hay filas vacías, las ignoramos
      const hasAny = row.some(v => v && v.trim() !== "");
      if (hasAny) aoa.push(row);
    }

    return aoa;
  }

  function exportResultsXLSX() {
    const table = getResultsTableEl();
    if (!table) {
      alert("No se encontró la tabla de Resultados para exportar.");
      return false;
    }
    if (typeof XLSX === "undefined" || !XLSX.utils) {
      alert("No está cargada la librería XLSX. Revisá el script CDN.");
      return false;
    }

    const aoa = tableToAOA(table);
    if (!aoa.length) {
      alert("No hay datos para exportar.");
      return false;
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Ajuste simple de ancho (opcional): auto ancho aproximado por largo de texto
    try {
      const colCount = aoa[0].length;
      const widths = new Array(colCount).fill(12).map((_, c) => {
        let max = 10;
        for (let r = 0; r < aoa.length; r++) {
          const v = aoa[r][c];
          if (v) max = Math.max(max, String(v).length);
        }
        return { wch: Math.min(Math.max(10, max + 2), 45) };
      });
      ws["!cols"] = widths;
    } catch (_) {}

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Registros");

    const stamp = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const fname =
      `psv_registros_${stamp.getFullYear()}-${pad(stamp.getMonth()+1)}-${pad(stamp.getDate())}_${pad(stamp.getHours())}${pad(stamp.getMinutes())}.xlsx`;

    XLSX.writeFile(wb, fname);
    return true;
  }

  function bind() {
    const btn = document.getElementById("btnExportXLSX");
    if (!btn) return;
    btn.addEventListener("click", exportResultsXLSX);
  }

  document.addEventListener("DOMContentLoaded", bind);

  // (opcional) expone función por si querés dispararla desde consola
  window.PSV_ExportXLSX = { exportResultsXLSX };
})();
