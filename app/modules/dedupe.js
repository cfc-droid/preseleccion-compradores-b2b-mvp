// app/modules/dedupe.js
// Dedupe cerrado (ÍNDICE 11)
// email_norm = trim().toLowerCase()
// "más reciente": timestamp mayor si parseable, si no => row_index mayor

window.DedupePSV = (() => {
  function normEmail(email){
    return String(email ?? "").trim().toLowerCase();
  }

  function parseDateMaybe(v){
    // si se puede parsear, devuelve ms; si no, NaN
    const t = Date.parse(String(v ?? ""));
    return Number.isNaN(t) ? NaN : t;
  }

  function isMoreRecent(a, b){
    // a y b son registros
    const ta = parseDateMaybe(a.timestamp);
    const tb = parseDateMaybe(b.timestamp);

    if (!Number.isNaN(ta) && !Number.isNaN(tb)) {
      if (ta !== tb) return ta > tb;
    } else if (!Number.isNaN(ta) && Number.isNaN(tb)) {
      return true;
    } else if (Number.isNaN(ta) && !Number.isNaN(tb)) {
      return false;
    } else {
      // ambos inválidos: comparar string
      const sa = String(a.timestamp ?? "");
      const sb = String(b.timestamp ?? "");
      if (sa !== sb) return sa > sb;
    }

    // fallback: row_index mayor = más reciente
    return Number(a.row_index ?? 0) > Number(b.row_index ?? 0);
  }

  function applyDedupe(results){
    const byEmail = new Map();

    // elegir “ganador” por email
    for (const r of results) {
      const e = normEmail(r.email);
      if (!e) continue;

      const prev = byEmail.get(e);
      if (!prev) {
        byEmail.set(e, r);
        continue;
      }
      if (isMoreRecent(r, prev)) byEmail.set(e, r);
    }

    // marcar duplicados
    for (const r of results) {
      const e = normEmail(r.email);
      if (!e) { r.duplicado_oculto = "NO"; continue; }
      const winner = byEmail.get(e);
      r.duplicado_oculto = (winner === r) ? "NO" : "SI";
    }

    return results;
  }

  return { normEmail, applyDedupe };
})();
