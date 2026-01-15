// app/modules/export.js
// Exportaciones cerradas (ÍNDICE 11)
// - CSV Resumen
// - CSV Detalle

window.ExportPSV = (() => {
  function toCSVCell(v) {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
    return s;
  }

  function downloadCSV(lines, filename){
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function exportCSVResumen(dataset){
    if (!dataset || !Array.isArray(dataset.results) || !dataset.results.length) {
      alert("No hay dataset activo para exportar CSV.");
      return false;
    }

    const cols = ["email","nombre","score_auto","score_humano","score_total","estado_ia","estado_humano","estado_final","envie_correo","duplicado_oculto"];
    const lines = [cols.join(",")];

    for (const r of dataset.results) {
      lines.push([
        r.email ?? "",
        r.nombre ?? "",
        r.score_auto ?? "",
        r.score_humano ?? "",
        r.score_total ?? "",
        r.estado_ia ?? "",
        r.estado_humano ?? "",
        r.estado_final ?? "",
        r.envie_correo ?? "",
        r.duplicado_oculto ?? ""
      ].map(toCSVCell).join(","));
    }

    downloadCSV(lines, `psv_resumen_${Date.now()}.csv`);
    return true;
  }

  function exportCSVDetalle(dataset){
    if (!dataset || !Array.isArray(dataset.results) || !dataset.results.length) {
      alert("No hay dataset activo para exportar CSV detalle.");
      return false;
    }

    const cols = ["email","qid","respuesta","señales","obs_humana","puntaje_humano"];
    const lines = [cols.join(",")];

    for (const r of dataset.results) {
      const email = r.email ?? "";

      // 1 fila por (registro + qid) SOLO para ALTA (porque humano puntúa ALTA)
      const abiertas = (r.human_abiertas || {}); // ya viene "planchado" por app.js al construir dataset activo
      for (const [qid, val] of Object.entries(abiertas)) {
        lines.push([
          email,
          qid,
          val.respuesta ?? "",
          (val.signals || []).join("|"),
          val.obs ?? "",
          val.puntaje ?? ""
        ].map(toCSVCell).join(","));
      }
    }

    downloadCSV(lines, `psv_detalle_${Date.now()}.csv`);
    return true;
  }

  return { exportCSVResumen, exportCSVDetalle };
})();
