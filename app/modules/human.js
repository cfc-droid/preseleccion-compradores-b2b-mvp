// app/modules/human.js
// Capa humana cerrada (ÍNDICE 11)
// - overrides separados de results[]
// - clamps por pregunta -10..+10, total -30..+30
// - score_total clamp 0..100
// - estado_final: prioridad humano; si vacío usa IA; + regla pendiente humano

window.HumanPSV = (() => {
  const ESTADOS_HUMANOS = ["", "DESCARTADO", "REVISAR", "APTO"];
  const ENVIE_CORREO = ["", "SI", "NO"];

  // Listas oficiales (PASO 2.4) ya las definimos aquí para que UI las use luego
  const Q_ALTA = ["Q1","Q9","Q13","Q14","Q15","Q18","Q21","Q22","Q23","Q27","Q30","Q31"];
  const Q_INFO = ["Q8","Q10","Q11","Q26","Q28","Q29","Q32","Q33"];

  function clamp(n, min, max){
    n = Number(n);
    if (Number.isNaN(n)) n = 0;
    return Math.max(min, Math.min(max, n));
  }

  function nowISO(){ return new Date().toISOString(); }

  function overrideKey(email, row_index){
    const e = String(email ?? "").trim().toLowerCase();
    return `${e}|${row_index}`;
  }

  function ensureOverride(ds, email, row_index){
    ds.human_overrides = ds.human_overrides || {};
    const k = overrideKey(email, row_index);
    if (!ds.human_overrides[k]) {
      ds.human_overrides[k] = {
        estado_humano: "",
        envie_correo: "",
        obs_registro: "",
        abiertas: {},
        updated_at: nowISO()
      };
    }
    return ds.human_overrides[k];
  }

  function setEstadoHumano(ds, email, row_index, value){
    const o = ensureOverride(ds, email, row_index);
    o.estado_humano = ESTADOS_HUMANOS.includes(value) ? value : "";
    o.updated_at = nowISO();
    return o;
  }

  function setEnvieCorreo(ds, email, row_index, value){
    const o = ensureOverride(ds, email, row_index);
    o.envie_correo = ENVIE_CORREO.includes(value) ? value : "";
    o.updated_at = nowISO();
    return o;
  }

  function setObsRegistro(ds, email, row_index, text){
    const o = ensureOverride(ds, email, row_index);
    o.obs_registro = String(text ?? "");
    o.updated_at = nowISO();
    return o;
  }

  function setAbiertaHumana(ds, email, row_index, qid, obs, puntaje){
    const o = ensureOverride(ds, email, row_index);
    if (!o.abiertas) o.abiertas = {};
    const p = clamp(puntaje, -10, 10);
    o.abiertas[qid] = { obs: String(obs ?? ""), puntaje: p };
    o.updated_at = nowISO();
    return o;
  }

  function getOverride(ds, email, row_index){
    const k = overrideKey(email, row_index);
    return (ds.human_overrides && ds.human_overrides[k]) ? ds.human_overrides[k] : null;
  }

  function calcScoreHumano(override){
    if (!override || !override.abiertas) return 0;
    let sum = 0;
    for (const qid of Object.keys(override.abiertas)) {
      const p = clamp(override.abiertas[qid]?.puntaje, -10, 10);
      sum += p;
    }
    return clamp(sum, -30, 30);
  }

  function isPendienteHumano(override){
    // pendiente si falta puntaje en cualquier Q_ALTA
    for (const q of Q_ALTA) {
      const has = override && override.abiertas && override.abiertas[q] && typeof override.abiertas[q].puntaje === "number";
      if (!has) return true;
    }
    return false;
  }

  function normalizeEstadoIA(estado_ia){
    // En tu base actual “estado” trae APTO/REVISAR/DESCARTADO o DESCARTADO_AUTO.
    // ÍNDICE 11: IA oficial = DESCARTADO_AUTO / REVISAR_AUTO / APTO_AUTO.
    // Por ahora dejamos lo que venga y UI/exports lo muestran.
    return String(estado_ia ?? "");
  }

  function computeEstadoFinal(estado_ia, override){
    const ia = normalizeEstadoIA(estado_ia);
    const h = String(override?.estado_humano ?? "");

    // prioridad humano
    let final = h ? h : ia;

    // pendiente humano: si falta puntaje ALTA => mínimo REVISAR
    if (isPendienteHumano(override)) {
      if (final === "APTO" || final === "APTO_AUTO") final = "REVISAR";
      if (final === "") final = "REVISAR";
    }

    return final;
  }

  function computeScores(score_auto, override){
    const auto = clamp(score_auto, 0, 100);
    const humano = calcScoreHumano(override); // -30..+30
    const total = clamp(auto + humano, 0, 100);
    return { score_auto: auto, score_humano: humano, score_total: total };
  }

  return {
    Q_ALTA,
    Q_INFO,
    overrideKey,
    getOverride,
    ensureOverride,
    setEstadoHumano,
    setEnvieCorreo,
    setObsRegistro,
    setAbiertaHumana,
    calcScoreHumano,
    computeScores,
    computeEstadoFinal,
    isPendienteHumano
  };
})();
