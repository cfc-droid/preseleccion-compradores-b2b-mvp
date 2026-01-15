// =====================================================
// PATCH DETALLE V2 (SIN TOCAR ui.js)
// - Renderiza 3 partes del detalle estilo mock
// - Parte 2/3 (13 cerradas): usa rules/rules_v1.json
// - Parte 1/3 (12 abiertas): COMPLETA 3 columnas automáticas
//   * SEÑALES DETECTECTADAS (VÁLIDA RTA)
//   * REGLAS ÉTICAS AFECTADAS (si aplica)
//   * OPINIÓN IA (NO decide)
//   SOLO si hay respuesta del vendedor. Si no hay respuesta => vacío.
//
// ✅ FIX (TU BUG):
// - Sincroniza Parte 1/3 humano con la key que lee ui.js:
//   localStorage["cfc_preseleccion_p13_v1"][rowKey] = { total_pct, estado_def }
// - Dispara evento "psv:p13updated" para que ui.js re-renderice la tabla.
// =====================================================

(() => {
  const DETAIL_ID = "detailPanel";

  const PATCH_KEY_ATTR = "data-patched-v2-key";
  const WRAP_ID = "detalleV2_wrap";
  const STYLE_ID = "detalleV2_style";

  // LocalStorage (Parte 1/3 editable)
  const LS_PREFIX_P13 = "p13_edit_v2";

  // ✅ UI store (lo que ui.js LEE)
  const UI_P13_KEY = "cfc_preseleccion_p13_v1";

  // -------------------------
  // Helpers
  // -------------------------

  function esc(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function safeVal(v) {
    const s = String(v ?? "").trim();
    return s.length ? s : "—";
  }

  function isBlank(v) {
    return !String(v ?? "").trim().length;
  }

  function norm(s) {
    return String(s ?? "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  function canonHeader(h) {
    return String(h ?? "")
      .split("\n")[0]
      .replace(/\s+/g, " ")
      .trim();
  }

  function headerNumber(h) {
    const m = canonHeader(h).match(/^(\d+)\/33\./);
    return m ? m[1] : null;
  }

  function questionTextFromHeader(h) {
    const s = canonHeader(h);
    return s.replace(/^\d+\/33\.\s*/, "");
  }

  function pctFixed(_n, total) {
    const v = total > 0 ? (100 / total) : 0;
    return (Math.round(v * 100) / 100).toFixed(2).replace(".", ",") + "%";
  }

  function normalizeText(text) {
    return String(text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function toPctTxt(n) {
    const v = Math.round(Number(n) * 100) / 100;
    return v.toFixed(2).replace(".", ",") + "%";
  }

  function tryGetLS(k) {
    try { return localStorage.getItem(k); } catch (_) { return null; }
  }

  function trySetLS(k, v) {
    try { localStorage.setItem(k, v); } catch (_) {}
  }

  function lsKeyP13(rowKey, qid, field) {
    return `${LS_PREFIX_P13}__${rowKey}__${qid}__${field}`;
  }

  // ✅ helpers UI store
  function loadUIP13Store() {
    try {
      const raw = localStorage.getItem(UI_P13_KEY);
      const obj = raw ? JSON.parse(raw) : {};
      return (obj && typeof obj === "object") ? obj : {};
    } catch (_) {
      return {};
    }
  }

  function saveUIP13Store(obj) {
    try {
      localStorage.setItem(UI_P13_KEY, JSON.stringify(obj || {}));
    } catch (_) {}
  }

  function dispatchP13Updated() {
    try {
      window.dispatchEvent(new Event("psv:p13updated"));
    } catch (_) {}
  }

  // -------------------------
  // HEADERS oficiales
  // -------------------------

  const EXPECTED_HEADERS = [
    "Marca temporal",
    "Dirección de correo electrónico",
    "1/33. Escribí esta frase y agregá tu @usuario principal + ciudad:",
    "2/33. ¿Aceptás cobrar solo por resultados (COMISIÓN)?",
    "3/33. ¿Buscás empleo o sueldo?",
    "4/33. Horas semanales reales",
    "5/33. Conversaciones reales que podés iniciar en 7 días",
    "6/33. ¿Leíste completo el anuncio y la advertencia?",
    "7/33. Hotmart",
    "8/33. Nombre y apellido",
    "9/33. Email de contacto (confirmación)",
    "10/33. País / zona horaria",
    "11/33. Perfil de red social principal",
    "12/33. ¿Vendiste productos digitales o educativos antes?",
    "13/33. ¿Qué vendiste?",
    "14/33. ¿Cómo vendías?",
    "15/33. Contá brevemente tu experiencia comercial",
    "16/33. ¿Tenés comunidad propia?",
    "17/33. Tamaño aproximado",
    "18/33. Listá 3 lugares concretos donde podrías difundir",
    "19/33. ¿Tenés base de contactos?",
    "20/33. ¿Cuál de estas prácticas NO harías nunca?",
    "21/33. ¿Qué significa cobrar solo por resultados?",
    "22/33. ¿Qué responderías si alguien pregunta cuánto voy a ganar?",
    "23/33. ¿Qué cosas NO dirías nunca al presentar este producto?",
    "24/33. Aceptación de reglas",
    "25/33. ¿Alguna vez hiciste spam o te reportaron?",
    "26/33. Explicá qué pasó y qué aprendiste",
    "27/33. DM de presentación del producto",
    "28/33. Post corto para redes",
    "29/33. ¿A qué tipo de cliente apuntarías?",
    "30/33. Acciones concretas primeros 7 días",
    "31/33. ¿Por qué creés que sos apto?",
    "32/33. Comentarios finales",
    "33/33. Si en 30 días no generás ventas, ¿cómo lo interpretás?"
  ];

  const QID_TO_HEADER = (() => {
    const m = {};
    for (const h of EXPECTED_HEADERS) {
      const num = headerNumber(h);
      if (num) m[`Q${num}`] = h;
    }
    return m;
  })();

  // -------------------------
  // 3 PARTES (mock)
  // -------------------------

  const Q_ABIERTAS_ALTA = ["Q1","Q9","Q13","Q14","Q15","Q18","Q21","Q22","Q23","Q27","Q30","Q31"];
  const Q_CERRADAS_FIJAS = ["Q2","Q3","Q4","Q5","Q6","Q7","Q12","Q16","Q17","Q19","Q20","Q24","Q25"];
  const Q_INFO = ["Q8","Q10","Q11","Q26","Q28","Q29","Q32","Q33"];

  // -------------------------
  // Extraer rowRaw + listas del DOM
  // -------------------------

  function extractRowRaw(panel) {
    const divs = [...panel.querySelectorAll("div")];
    const candidate = divs
      .map(d => d.textContent || "")
      .find(t => t.trim().startsWith("{") && t.includes('"Marca temporal"'));

    if (!candidate) return null;

    try {
      return JSON.parse(candidate);
    } catch (_) {
      return null;
    }
  }

  function extractList(panel, titleIncludes) {
    const cards = [...panel.querySelectorAll(".miniCard")];
    const card = cards.find(c => (c.querySelector(".sectionTitle")?.textContent || "").includes(titleIncludes));
    if (!card) return [];
    return [...card.querySelectorAll("ul.list li")]
      .map(li => (li.textContent || "").trim())
      .filter(Boolean);
  }

  function hideUselessCorrectIncorrectBoxes(panel) {
    const cards = [...panel.querySelectorAll(".miniCard")];
    for (const c of cards) {
      const t = norm(c.querySelector(".sectionTitle")?.textContent || "");
      if (t.includes("respuestas/condiciones correctas") || t.includes("respuestas/condiciones incorrectas")) {
        c.style.display = "none";
      }
    }
  }

  // -------------------------
  // Estilos internos
  // -------------------------

  function ensureInnerStyle() {
    if (document.getElementById(STYLE_ID)) return;

    const st = document.createElement("style");
    st.id = STYLE_ID;

    st.textContent = `
      #${WRAP_ID}, #${WRAP_ID} *{
        font-family: var(--font, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial) !important;
        white-space: normal !important;
      }
      #${WRAP_ID} .table{ table-layout: fixed; width:100%; }
      #${WRAP_ID} th, #${WRAP_ID} td{
        overflow-wrap: anywhere;
        word-break: break-word;
      }
      #${WRAP_ID} td:nth-child(3){ max-width: 520px; }

      /* Editables Parte 1/3 */
      #${WRAP_ID} .p13inp{
        width: 100%;
        box-sizing: border-box;
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.10);
        color: inherit;
        padding: 8px 10px;
        border-radius: 10px;
        outline: none;
      }
      #${WRAP_ID} .p13sel{
        width: 100%;
        box-sizing: border-box;
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.10);
        color: inherit;
        padding: 8px 10px;
        border-radius: 10px;
        outline: none;
      }
    `;
    document.head.appendChild(st);
  }

  // -------------------------
  // Cargar rules una vez (cerradas)
  // -------------------------

  let _RULES_CACHE = null;

  async function loadRulesOnce() {
    if (_RULES_CACHE) return _RULES_CACHE;
    try {
      const res = await fetch("rules/rules_v1.json");
      if (!res.ok) throw new Error(`No se pudo cargar rules_v1.json (HTTP ${res.status})`);
      _RULES_CACHE = await res.json();
      return _RULES_CACHE;
    } catch (e) {
      console.error(e);
      _RULES_CACHE = null;
      return null;
    }
  }

  function getGateByHeader(RULES, header) {
    const gates = Array.isArray(RULES?.gates) ? RULES.gates : [];
    return gates.find(g => g && g.header === header) || null;
  }

  function getScoringRuleByHeader(RULES, header) {
    const scoring = RULES?.scoring || {};
    for (const [block, ruleset] of Object.entries(scoring)) {
      if (block === "canales" && ruleset && Array.isArray(ruleset.rules)) {
        for (const r of ruleset.rules) {
          if (r?.header === header) return { block, r };
        }
        continue;
      }
      if (Array.isArray(ruleset)) {
        for (const r of ruleset) {
          if (r?.header === header) return { block, r };
        }
      }
    }
    return null;
  }

  function evalGateSimple(gate, value) {
    if (!gate || !gate.type) return { ok: true };

    if (gate.type === "equals") {
      const ok = String(value ?? "") !== String(gate.value ?? "");
      return { ok, why: ok ? "Cumple" : (gate.reason || "No cumple") };
    }

    if (gate.type === "contains_all") {
      const normv = normalizeText(value);
      const ok = (gate.value || []).every(v => normv.includes(normalizeText(v)));
      return { ok, why: ok ? "Aceptó reglas" : (gate.reason || "No acepta todas las reglas") };
    }

    return { ok: true, why: "Cumple" };
  }

  function evalClosedOkByRules(RULES, header, answer) {
    const a = String(answer ?? "").trim();
    if (!a) return { hasAnswer: false, isOk: false, whyCore: "" };

    // 1) Gate (si falla => NO válido)
    const g = getGateByHeader(RULES, header);
    if (g) {
      const eg = evalGateSimple(g, a);
      if (!eg.ok) return { hasAnswer: true, isOk: false, whyCore: g.reason || "No cumple gate" };
    }

    // 2) Scoring (si existe)
    const sr = getScoringRuleByHeader(RULES, header);
    if (sr && sr.r) {
      const r = sr.r;

      if (r.type === "equals") {
        const ok = a === String(r.value ?? "");
        return { hasAnswer: true, isOk: ok, whyCore: ok ? `respondió "${a}" y coincide con lo esperado` : `respondió "${a}" y no coincide con lo esperado` };
      }

      if (r.type === "contains_all") {
        const normv = normalizeText(a);
        const ok = (r.value || []).every(v => normv.includes(normalizeText(v)));
        return { hasAnswer: true, isOk: ok, whyCore: ok ? "incluye todas las reglas obligatorias" : "no incluye todas las reglas obligatorias" };
      }

      if (r.type === "map") {
        const pts = Number((r.points_map && (r.points_map[a] ?? r.points_map[String(a)])) || 0);
        const ok = pts > 0;
        return { hasAnswer: true, isOk: ok, whyCore: ok ? `suma puntos (${pts})` : "no suma puntos (0)" };
      }
    }

    // 3) Sin regla: si hay respuesta, válida mínima
    return { hasAnswer: true, isOk: true, whyCore: "hay respuesta" };
  }

  function closedJustificationStrict(answer, isOk, whyCore) {
    const a = String(answer ?? "").trim();
    if (!a) return "";
    if (isOk) return `OK porque ${whyCore || "cumple la condición"}.`;
    return `NO ES VALIDO porque ${whyCore || "no cumple la condición"}.`;
  }

  // -------------------------
  // Cargar auxiliares (abiertas) — mismos archivos existentes
  // -------------------------

  let _AUX_CACHE = null;

  async function loadAuxOnce() {
    if (_AUX_CACHE) return _AUX_CACHE;

    const safeLoad = async (path) => {
      try {
        const res = await fetch(path);
        if (!res.ok) return [];
        const json = await res.json();
        return Array.isArray(json) ? json : [];
      } catch (_) {
        return [];
      }
    };

    const [BANNED_WORDS, ACTION_VERBS, GENERIC_WORDS] = await Promise.all([
      safeLoad("rules/banned_words.json"),
      safeLoad("rules/action_verbs.json"),
      safeLoad("rules/generic_words.json")
    ]);

    _AUX_CACHE = { BANNED_WORDS, ACTION_VERBS, GENERIC_WORDS };
    return _AUX_CACHE;
  }

  function hasBanned(text, BANNED_WORDS) {
    const t = normalizeText(text);
    return (BANNED_WORDS || []).some(w => t.includes(normalizeText(w)));
  }

  function hasActionVerb(text, ACTION_VERBS) {
    const t = normalizeText(text);
    return (ACTION_VERBS || []).some(v => t.includes(normalizeText(v)));
  }

  function isGeneric(text, GENERIC_WORDS) {
    const t = normalizeText(text);
    let hits = 0;
    for (const w of (GENERIC_WORDS || [])) {
      if (t.includes(normalizeText(w))) hits++;
    }
    return hits >= 2;
  }

  function emailLooksValid(s) {
    const a = String(s ?? "").trim();
    if (!a) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a);
  }

  function containsAny(text, arr) {
    const t = normalizeText(text);
    return (arr || []).some(x => t.includes(normalizeText(x)));
  }

  function countLinesNonEmpty(text) {
    return String(text ?? "")
      .split(/\r?\n/)
      .map(x => x.trim())
      .filter(Boolean).length;
  }

  // -------------------------
  // ABIERTAS (Parte 1/3) — reglas según tu detalle
  // -------------------------

  function analyzeOpenAnswerByQuestion(qid, answerRaw, rowRaw, aux) {
    const a0 = String(answerRaw ?? "");
    const a = a0.trim();

    if (!a.length) {
      return { hasAnswer: false, senales: "", eticas: "", opinion: "" };
    }

    const t = normalizeText(a);
    const signals = [];
    const ethics = [];

    // Reglas “globales” (éticas fuertes)
    const PROMISE_RE = /(ingres|ganar|rentab|retorn|garant|asegur|dinero facil|ingreso asegur|resultados garant)/i;
    const SPAM_RE = /(spam|masivo|sin permiso|report|reporte|bloque|bane|ban)/i;

    const hasB = aux && hasBanned(a, aux.BANNED_WORDS);
    if (hasB) ethics.push("BANNED: contiene palabra prohibida");

    const promise = PROMISE_RE.test(a);
    if (promise) ethics.push("ÉTICA: posible promesa/ganancia/retorno");

    if (SPAM_RE.test(a)) ethics.push("ÉTICA: riesgo spam / sin permiso");

    // Q1
    if (qid === "Q1") {
      const mustPhrase = normalizeText("Entiendo que este modelo NO es un empleo y cobro solo por resultados");
      const hasPhrase = t.includes(mustPhrase);
      const hasAt = /@\w+/.test(a);
      const hasCity = a.split("—").length >= 3 || a.split("-").length >= 3 || /\b(ciudad|buenos aires|caba|rosario|cordoba|mendoza|la plata|mar del plata)\b/i.test(a);

      if (hasPhrase && hasAt && hasCity) {
        signals.push("✔ Respuesta VÁLIDA");
        signals.push("Contiene la frase pedida");
        signals.push("Incluye @usuario y ciudad");
        return { hasAnswer: true, senales: signals.join(" | "), eticas: ethics.length ? ethics.join(" | ") : "—", opinion: "VÁLIDA" };
      }

      signals.push("❌ Respuesta INCORRECTA");
      if (!hasPhrase) signals.push("No escribió la frase (o está mal)");
      if (!hasAt) signals.push("Falta @usuario");
      if (!hasCity) signals.push("Falta ciudad");
      return { hasAnswer: true, senales: signals.join(" | "), eticas: ethics.length ? ethics.join(" | ") : "—", opinion: "REVISAR" };
    }

    // Q9
    if (qid === "Q9") {
      const mailForm = String(rowRaw?.["Dirección de correo electrónico"] ?? "").trim().toLowerCase();
      const mailAns = String(a ?? "").trim().toLowerCase();

      const okFormat = emailLooksValid(mailAns);
      const okMatch = mailForm ? (mailAns === mailForm) : true;

      if (okFormat && okMatch) {
        signals.push("✔ Respuesta VÁLIDA");
        signals.push("Email con formato real");
        if (mailForm) signals.push("Coincide con el correo del formulario");
        return { hasAnswer: true, senales: signals.join(" | "), eticas: ethics.length ? ethics.join(" | ") : "—", opinion: "VÁLIDA" };
      }

      signals.push("❌ Respuesta INCORRECTA");
      if (!okFormat) signals.push("Email inválido (formato)");
      if (!okMatch) signals.push("No coincide con el del formulario");
      return { hasAnswer: true, senales: signals.join(" | "), eticas: ethics.length ? ethics.join(" | ") : "—", opinion: "REVISAR" };
    }

    // Q13
    if (qid === "Q13") {
      const invalid = containsAny(a, ["de todo", "varias cosas", "mucho", "un poco de todo", "de todo un poco"]);
      const tooShort = a.length < 15;
      if (!invalid && !tooShort) {
        signals.push("✔ Respuesta VÁLIDA");
        signals.push("Menciona productos concretos");
        if (promise) return { hasAnswer: true, senales: signals.join(" | "), eticas: ethics.join(" | "), opinion: "NO VÁLIDA" };
        return { hasAnswer: true, senales: signals.join(" | "), eticas: ethics.length ? ethics.join(" | ") : "—", opinion: "VÁLIDA" };
      }
      signals.push("❌ Respuesta INCORRECTA");
      if (invalid) signals.push("Genérico (no queda claro qué vendió)");
      if (tooShort) signals.push("Texto muy corto / sin sustancia");
      return { hasAnswer: true, senales: signals.join(" | "), eticas: ethics.length ? ethics.join(" | ") : "—", opinion: "REVISAR" };
    }

    // Q14
    if (qid === "Q14") {
      const invalid = containsAny(a, ["por redes", "marketing", "internet", "redes"]) && a.length < 30;
      const tooShort = a.length < 15;
      if (!invalid && !tooShort) {
        signals.push("✔ Respuesta VÁLIDA");
        signals.push("Explica el método (DM, contenido, referidos, etc.)");
        return { hasAnswer: true, senales: signals.join(" | "), eticas: ethics.length ? ethics.join(" | ") : "—", opinion: "VÁLIDA" };
      }
      signals.push("❌ Respuesta INCORRECTA");
      if (invalid) signals.push("Frase vacía (no explica proceso)");
      if (tooShort) signals.push("Texto muy corto");
      return { hasAnswer: true, senales: signals.join(" | "), eticas: ethics.length ? ethics.join(" | ") : "—", opinion: "REVISAR" };
    }

    // Q15
    if (qid === "Q15") {
      const tooShort = a.length < 20;
      const generic = aux ? isGeneric(a, aux.GENERIC_WORDS) : false;
      if (!tooShort && !generic) {
        signals.push("✔ Respuesta VÁLIDA");
        signals.push("Relata experiencia real (coherente)");
        return { hasAnswer: true, senales: signals.join(" | "), eticas: ethics.length ? ethics.join(" | ") : "—", opinion: "VÁLIDA" };
      }
      signals.push("❌ Respuesta INCORRECTA");
      if (generic) signals.push("Texto genérico / copia-pega");
      if (tooShort) signals.push("Muy corto / sin info real");
      return { hasAnswer: true, senales: signals.join(" | "), eticas: ethics.length ? ethics.join(" | ") : "—", opinion: "REVISAR" };
    }

    // Q18
    if (qid === "Q18") {
      const nLines = countLinesNonEmpty(a);
      const genericLine = containsAny(a, ["redes", "internet", "grupos"]) && !/http/i.test(a) && a.length < 60;

      if (nLines >= 3 && !genericLine) {
        signals.push("✔ Respuesta VÁLIDA");
        signals.push("Incluye lugares concretos (mín. 3)");
        return { hasAnswer: true, senales: signals.join(" | "), eticas: ethics.length ? ethics.join(" | ") : "—", opinion: "VÁLIDA" };
      }

      signals.push("❌ Respuesta INCORRECTA");
      if (nLines < 3) signals.push("No cumple mínimo de 3 lugares (1 por línea)");
      if (genericLine) signals.push("Demasiado genérico (sin lugares reales)");
      return { hasAnswer: true, senales: signals.join(" | "), eticas: ethics.length ? ethics.join(" | ") : "—", opinion: "REVISAR" };
    }

    // Q21
    if (qid === "Q21") {
      const mentionsNoSalary = /(no hay sueldo|sin sueldo|no sueldo|no existe sueldo)/i.test(a);
      const mentionsCommission = /(comision|comisión|vende|venta)/i.test(a);
      const mentionsRisk = /(riesgo|depende|esfuerzo|si vende|si genero ventas|si genera ventas)/i.test(a);
      const mentionsFixed = /(sueldo fijo|fijo|garantia|garantía|asegurado)/i.test(a);

      if (mentionsFixed) {
        signals.push("❌ Respuesta INCORRECTA");
        signals.push("Habla de sueldo/fijo/garantía (confunde el modelo)");
        if (!ethics.length) ethics.push("ÉTICA: confusión grave del modelo (sueldo/fijo/garantía)");
        return { hasAnswer: true, senales: signals.join(" | "), eticas: ethics.join(" | "), opinion: "NO VÁLIDA" };
      }

      if (mentionsNoSalary && mentionsCommission && mentionsRisk) {
        signals.push("✔ Respuesta VÁLIDA");
        signals.push("Entiende: no hay sueldo, cobra solo si vende, asume riesgo");
        return { hasAnswer: true, senales: signals.join(" | "), eticas: ethics.length ? ethics.join(" | ") : "—", opinion: "VÁLIDA" };
      }

      signals.push("❌ Respuesta INCORRECTA");
      signals.push("No demuestra comprensión completa del modelo");
      return { hasAnswer: true, senales: signals.join(" | "), eticas: ethics.length ? ethics.join(" | ") : "—", opinion: "REVISAR" };
    }

    // Q22
    if (qid === "Q22") {
      const hasNumbers = /\d/.test(a);
      const okEthic = /(depende|esfuerzo|resultados|no puedo prometer|no garantizo|no hay garantias)/i.test(a) && !hasNumbers && !promise;

      if (okEthic) {
        signals.push("✔ Respuesta VÁLIDA");
        signals.push("No promete cifras y mantiene ética");
        return { hasAnswer: true, senales: signals.join(" | "), eticas: ethics.length ? ethics.join(" | ") : "—", opinion: "VÁLIDA" };
      }

      if (promise || hasNumbers || /(asegur|garant|fijo)/i.test(a)) {
        signals.push("❌ Respuesta INCORRECTA");
        signals.push("Promete o sugiere resultados/cifras");
        if (!ethics.length) ethics.push("ÉTICA: posible promesa/ganancia/retorno");
        return { hasAnswer: true, senales: signals.join(" | "), eticas: ethics.join(" | "), opinion: "NO VÁLIDA" };
      }

      signals.push("❌ Respuesta INCORRECTA");
      signals.push("No deja claro que depende del esfuerzo (sin promesas)");
      return { hasAnswer: true, senales: signals.join(" | "), eticas: ethics.length ? ethics.join(" | ") : "—", opinion: "REVISAR" };
    }

    // Q23
    if (qid === "Q23") {
      const ok = containsAny(a, ["no promesas", "no prometer", "no dinero facil", "no garantias", "no garantía", "no retorno", "no resultados garantizados", "sin promesas"]);
      const bad = promise || containsAny(a, ["te aseguro", "garantizo", "gana seguro", "dinero rapido"]);

      if (ok && !bad) {
        signals.push("✔ Respuesta VÁLIDA");
        signals.push("Menciona: no promesas / no garantías / ética");
        return { hasAnswer: true, senales: signals.join(" | "), eticas: ethics.length ? ethics.join(" | ") : "—", opinion: "VÁLIDA" };
      }

      if (bad) {
        signals.push("❌ Respuesta INCORRECTA");
        signals.push("Incluye promesas / expectativas falsas");
        if (!ethics.length) ethics.push("ÉTICA: posible promesa/ganancia/retorno");
        return { hasAnswer: true, senales: signals.join(" | "), eticas: ethics.join(" | "), opinion: "NO VÁLIDA" };
      }

      signals.push("❌ Respuesta INCORRECTA");
      signals.push("No queda alineado con reglas éticas");
      return { hasAnswer: true, senales: signals.join(" | "), eticas: ethics.length ? ethics.join(" | ") : "—", opinion: "REVISAR" };
    }

    // Q27
    if (qid === "Q27") {
      const tooShort = a.length < 40;
      const bad = promise || containsAny(a, ["garant", "asegur", "dinero rapido", "gana ya"]);
      const ok = !tooShort && !bad;

      if (ok) {
        signals.push("✔ Respuesta VÁLIDA");
        signals.push("DM usable, responsable, sin promesas");
        return { hasAnswer: true, senales: signals.join(" | "), eticas: ethics.length ? ethics.join(" | ") : "—", opinion: "VÁLIDA" };
      }

      if (bad) {
        signals.push("❌ Respuesta INCORRECTA");
        signals.push("Incluye promesas / marketing agresivo");
        if (!ethics.length) ethics.push("ÉTICA: posible promesa/ganancia/retorno");
        return { hasAnswer: true, senales: signals.join(" | "), eticas: ethics.join(" | "), opinion: "NO VÁLIDA" };
      }

      signals.push("❌ Respuesta INCORRECTA");
      if (tooShort) signals.push("Demasiado corto / incompleto");
      return { hasAnswer: true, senales: signals.join(" | "), eticas: ethics.length ? ethics.join(" | ") : "—", opinion: "REVISAR" };
    }

    // Q30
    if (qid === "Q30") {
      const hasVerb = aux ? hasActionVerb(a, aux.ACTION_VERBS) : false;
      const hasSteps = /(^|\n)\s*(1[\)\.\-]|2[\)\.\-]|3[\)\.\-])/.test(a) || countLinesNonEmpty(a) >= 3;

      if (hasVerb && hasSteps) {
        signals.push("✔ Respuesta VÁLIDA");
        signals.push("Acciones concretas, paso a paso");
        return { hasAnswer: true, senales: signals.join(" | "), eticas: ethics.length ? ethics.join(" | ") : "—", opinion: "VÁLIDA" };
      }

      signals.push("❌ Respuesta INCORRECTA");
      signals.push("Poco concreto (relleno / sin pasos claros)");
      return { hasAnswer: true, senales: signals.join(" | "), eticas: ethics.length ? ethics.join(" | ") : "—", opinion: "REVISAR" };
    }

    // Q31
    if (qid === "Q31") {
      const tooShort = a.length < 20;
      const ego = containsAny(a, ["soy el mejor", "soy el numero 1", "nadie como yo", "soy perfecto", "soy el mas"]);
      const ok = !tooShort && !ego;

      if (ok) {
        signals.push("✔ Respuesta VÁLIDA");
        signals.push("Argumenta con lógica (sin sobreventa)");
        return { hasAnswer: true, senales: signals.join(" | "), eticas: ethics.length ? ethics.join(" | ") : "—", opinion: "VÁLIDA" };
      }

      signals.push("❌ Respuesta INCORRECTA");
      if (tooShort) signals.push("Muy corto / no argumenta");
      if (ego) signals.push("Ego inflado / sobreventa");
      return { hasAnswer: true, senales: signals.join(" | "), eticas: ethics.length ? ethics.join(" | ") : "—", opinion: "REVISAR" };
    }

    signals.push("✔ Respuesta con contenido");
    return { hasAnswer: true, senales: signals.join(" | "), eticas: ethics.length ? ethics.join(" | ") : "—", opinion: "REVISAR" };
  }

  // -------------------------
  // RESUMEN PARTE 1/3 (live)
  // -------------------------

  function computeParte13StatsFromLS(rowKey) {
    const total = Q_ABIERTAS_ALTA.length; // 12
    const pctOk = pctFixed(1, 12); // "8,33%"

    let validas = 0;
    for (const qid of Q_ABIERTAS_ALTA) {
      const v = tryGetLS(lsKeyP13(rowKey, qid, "pct")) ?? "0";
      if (String(v) === pctOk) validas++;
    }

    const incorrectas = total - validas;

    const pctValid = total ? Math.round((validas / total) * 100) : 0;
    const pctInc = total ? Math.round((incorrectas / total) * 100) : 0;

    const estadoDef = (pctValid >= 70) ? "APROBADO" : "NO VALIDO";

    return { total, validas, incorrectas, pctValid, pctInc, estadoDef };
  }

  // ✅ exacto a 2 decimales para la tabla general (ui.js)
  function computeParte13TotalPctExactFromLS(rowKey) {
    const total = Q_ABIERTAS_ALTA.length; // 12
    const pctOkTxt = pctFixed(1, 12); // "8,33%"

    let validas = 0;
    for (const qid of Q_ABIERTAS_ALTA) {
      const v = tryGetLS(lsKeyP13(rowKey, qid, "pct")) ?? "0";
      if (String(v) === pctOkTxt) validas++;
    }

    const unit = 100 / total; // 8.3333...
    const totalPct = Math.round((validas * unit) * 100) / 100; // 2 decimales
    const estadoDef = (totalPct >= 70) ? "APROBADO" : "NO VALIDO";

    return { totalPct, estadoDef, validas };
  }

  // ✅ sincroniza lo que ve ui.js (tabla general)
  function syncUIP13StoreForRow(rowKey) {
    const { totalPct, estadoDef } = computeParte13TotalPctExactFromLS(rowKey);

    const store = loadUIP13Store();
    store[rowKey] = {
      total_pct: totalPct,          // ui.js espera número tipo 8.33 (no string)
      estado_def: estadoDef,
      updated_at: Date.now()
    };
    saveUIP13Store(store);

    dispatchP13Updated();
  }

  function updateParte13SummaryLive(root, rowKey) {
    if (!root) return;

    const stats = computeParte13StatsFromLS(rowKey);

    const elTotal = root.querySelector("#p13_sum_total");
    const elVal = root.querySelector("#p13_sum_validas");
    const elPctV = root.querySelector("#p13_sum_pctvalid");
    const elEstado = root.querySelector("#p13_sum_estado");
    const elInc = root.querySelector("#p13_sum_incorrectas");
    const elPctI = root.querySelector("#p13_sum_pctinc");

    if (elTotal) elTotal.textContent = String(stats.total);
    if (elVal) elVal.textContent = String(stats.validas);
    if (elPctV) elPctV.textContent = String(stats.pctValid) + "%";
    if (elEstado) elEstado.innerHTML = "<b>" + esc(stats.estadoDef) + "</b>";
    if (elInc) elInc.textContent = String(stats.incorrectas);
    if (elPctI) elPctI.textContent = String(stats.pctInc) + "%";
  }

  // -------------------------
  // Render Parte 1/3 (ABIERTAS ALTA)
  // -------------------------

  async function renderParte13(rowRaw, rowKey) {
    const pctFixedTxt = pctFixed(1, 12); // "8,33%"
    const aux = await loadAuxOnce();

    const stats = computeParte13StatsFromLS(rowKey);

    const rows = Q_ABIERTAS_ALTA.map((qid, idx) => {
      const header = QID_TO_HEADER[qid];
      const qnum = headerNumber(header) + "/33";
      const pregunta = questionTextFromHeader(header);

      const ansRaw = rowRaw?.[header];
      const ans = safeVal(ansRaw);

      // SOLO si hay respuesta: llenar 3 columnas automáticas
      const a = analyzeOpenAnswerByQuestion(qid, ansRaw, rowRaw, aux);

      const senales = a.hasAnswer ? a.senales : "";
      const eticas = a.hasAnswer ? (a.eticas ? a.eticas : "—") : "";
      const opinion = a.hasAnswer ? a.opinion : "";

      // Editables: obs + pct (solo 0 o 8,33%)
      const obsLS = tryGetLS(lsKeyP13(rowKey, qid, "obs")) ?? "";
      const pctLS = tryGetLS(lsKeyP13(rowKey, qid, "pct")) ?? "0";

      const obsId = `p13_obs_${idx}_${Math.random().toString(16).slice(2)}`;
      const pctId = `p13_pct_${idx}_${Math.random().toString(16).slice(2)}`;

      return `
        <tr>
          <td>${idx + 1}</td>
          <td><span class="kbd">${esc(qnum)}</span> ${esc(pregunta)}</td>
          <td>${esc(ans)}</td>
          <td>${esc(senales)}</td>
          <td>${esc(eticas)}</td>
          <td><b>${esc(opinion)}</b></td>
          <td>
            <input
              class="p13inp"
              id="${esc(obsId)}"
              data-p13-field="obs"
              data-rowkey="${esc(rowKey)}"
              data-qid="${esc(qid)}"
              type="text"
              value="${esc(obsLS)}"
              placeholder="(editable)"
            />
          </td>
          <td>
            <select
              class="p13sel"
              id="${esc(pctId)}"
              data-p13-field="pct"
              data-rowkey="${esc(rowKey)}"
              data-qid="${esc(qid)}"
            >
              <option value="0"${pctLS === "0" ? " selected" : ""}>0</option>
              <option value="${esc(pctFixedTxt)}"${pctLS === pctFixedTxt ? " selected" : ""}>${esc(pctFixedTxt)}</option>
            </select>
          </td>
        </tr>
      `;
    }).join("");

    return `
      <div class="miniCard" style="margin-top:14px;">
        <div class="sectionTitle">RESUMEN — PARTE 1/3</div>

        <div style="overflow:auto; margin-top:10px;">
          <table class="table">
            <thead>
              <tr>
                <th style="min-width:260px;">RESUMEN — PARTE 1/3</th>
                <th style="width:120px;">CANTIDAD</th>
                <th style="width:120px;">PORCENTAJE</th>
                <th style="width:220px;">ESTADO DEFINITIVO</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b>TOTAL DE PREGUNTAS</b></td>
                <td id="p13_sum_total">${stats.total}</td>
                <td>100%</td>
                <td>—</td>
              </tr>
              <tr>
                <td><b>RESPUESTAS VÁLIDAS</b></td>
                <td id="p13_sum_validas">${stats.validas}</td>
                <td id="p13_sum_pctvalid">${stats.pctValid}%</td>
                <td id="p13_sum_estado"><b>${esc(stats.estadoDef)}</b></td>
              </tr>
              <tr>
                <td><b>RESPUESTAS INCORRECTAS</b></td>
                <td id="p13_sum_incorrectas">${stats.incorrectas}</td>
                <td id="p13_sum_pctinc">${stats.pctInc}%</td>
                <td>—</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="muted" style="margin-top:8px;">
          APROBADO = igual o mayor a 70% | NO VALIDO = menor a 70%.
        </div>
      </div>

      <div class="miniCard" style="margin-top:14px;">
        <div class="sectionTitle">PARTE 1/3 — PREGUNTAS Y RESPUESTAS (ABIERTAS • PRIORIDAD ALTA)</div>
        <div style="overflow:auto; margin-top:10px;">
          <table class="table">
            <thead>
              <tr>
                <th style="width:60px;">N°</th>
                <th style="width:320px;">12 PREGUNTAS “ABIERTAS” — PRIORIDAD ALTA</th>
                <th style="width:360px;">RESPUESTA DEL VENDEDOR</th>
                <th style="width:260px;">SEÑALES DETECTADAS (VÁLIDA RTA)</th>
                <th style="width:320px;">REGLAS ÉTICAS AFECTADAS (si aplica)</th>
                <th style="width:160px;">OPINIÓN IA (NO decide)</th>
                <th style="width:220px;">OBSERVACIÓN HUMANA</th>
                <th style="width:140px;">PORCENTAJE</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  function bindParte13Editors(root) {
    if (!root) return;

    const els = [...root.querySelectorAll("[data-p13-field]")];
    for (const el of els) {
      const field = el.getAttribute("data-p13-field");
      const rowKey = el.getAttribute("data-rowkey") || "";
      const qid = el.getAttribute("data-qid") || "";
      const k = lsKeyP13(rowKey, qid, field);

      const handler = () => {
        const v = (el.tagName === "SELECT") ? String(el.value ?? "") : String(el.value ?? "");

        // pct solo 0 o 8,33%
        if (field === "pct") {
          const allowedA = "0";
          const allowedB = pctFixed(1, 12); // "8,33%"
          if (v !== allowedA && v !== allowedB) {
            el.value = allowedA;
            trySetLS(k, allowedA);
            return;
          }
        }

        trySetLS(k, v);

        if (field === "pct") {
          updateParte13SummaryLive(root, rowKey);

          // ✅ FIX: sincroniza con UI + dispara evento
          syncUIP13StoreForRow(rowKey);
        }
      };

      // prevenir doble bind
      if (el.getAttribute("data-p13-bound") === "1") continue;
      el.setAttribute("data-p13-bound", "1");

      el.addEventListener("input", handler);
      el.addEventListener("change", handler);
    }
  }

  // -------------------------
  // Render Parte 2/3 (CERRADAS)
  // -------------------------

  async function renderParte23(rowRaw) {
    const RULES = await loadRulesOnce();
    const pct = toPctTxt(100 / 13); // "7,69%"

    const items = Q_CERRADAS_FIJAS.map((qid, idx) => {
      const header = QID_TO_HEADER[qid];
      const qnum = headerNumber(header) + "/33";
      const pregunta = questionTextFromHeader(header);
      const respRaw = String(rowRaw?.[header] ?? "");
      const resp = safeVal(respRaw);

      const ev = RULES
        ? evalClosedOkByRules(RULES, header, respRaw)
        : { hasAnswer: !!respRaw.trim(), isOk: false, whyCore: "no se cargaron reglas" };

      const puntaje = ev.hasAnswer ? (ev.isOk ? pct : "0") : "";
      const just = ev.hasAnswer ? closedJustificationStrict(respRaw, ev.isOk, ev.whyCore) : "";

      return { idx, qnum, pregunta, resp, isOk: ev.isOk, puntaje, just };
    });

    const total = 13;
    const validas = items.filter(x => x.isOk).length;
    const incorrectas = total - validas;

    const pctValid = total ? Math.round((validas / total) * 100) : 0;
    const pctInc = total ? Math.round((incorrectas / total) * 100) : 0;

    const estadoResumen = (pctValid >= 70) ? "REVISAR_AUTO" : "DESCARTADO_AUTO";

    const rowsCerradas = () => items.map(x => `
      <tr>
        <td>${x.idx + 1}</td>
        <td><span class="kbd">${esc(x.qnum)}</span></td>
        <td>${esc(x.pregunta)}</td>
        <td>${esc(x.puntaje)}</td>
        <td>${esc(x.resp)}</td>
        <td>${esc(x.just)}</td>
        <td>${esc(pct)}</td>
      </tr>
    `).join("");

    return `
      <div class="miniCard" style="margin-top:14px;">
        <div class="sectionTitle">PARTE 2/3 — PREGUNTAS Y RESPUESTAS (CERRADAS) — FIJO (13 preguntas)</div>

        <div style="overflow:auto; margin-top:10px;">
          <table class="table">
            <thead>
              <tr>
                <th style="min-width:260px;">RESUMEN — RESPUESTAS “CERRADAS”</th>
                <th style="width:100px;">UNIDAD</th>
                <th style="width:120px;">PORCENTAJE</th>
                <th style="width:180px;">ESTADO (solo 2)</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><b>TOTAL DE PREGUNTAS</b></td><td>${total}</td><td>100%</td><td>—</td></tr>
              <tr><td><b>RESPUESTAS VÁLIDAS</b></td><td>${validas}</td><td>${pctValid}%</td><td><b>${esc(estadoResumen)}</b></td></tr>
              <tr><td><b>RESPUESTAS INCORRECTAS</b></td><td>${incorrectas}</td><td>${pctInc}%</td><td>—</td></tr>
            </tbody>
          </table>
        </div>

        <div class="muted" style="margin-top:8px;">
          Regla Parte 2/3 (AUTOMÁTICA): &lt;70% = DESCARTADO_AUTO | ≥70% = REVISAR_AUTO.
        </div>

        <div style="margin-top:14px;">
          <div class="sectionTitle">RESPUESTAS — DETALLE (13 filas fijas)</div>
          <div style="overflow:auto; margin-top:10px;">
            <table class="table">
              <thead>
                <tr>
                  <th style="width:60px;">N°</th>
                  <th style="width:80px;">Q</th>
                  <th style="width:280px;">PREGUNTA</th>
                  <th style="width:110px;">PUNTAJE</th>
                  <th style="width:240px;">RESPUESTA DEL VENDEDOR</th>
                  <th style="width:360px;">JUSTIFICACIÓN “CERRADA” — RESPUESTA DE LA IA</th>
                  <th style="width:120px;">PORCENTAJE</th>
                </tr>
              </thead>
              <tbody>${rowsCerradas()}</tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // -------------------------
  // Render Parte 3/3
  // -------------------------

  function renderParte33(rowRaw) {
    const rows = Q_INFO.map((qid, idx) => {
      const header = QID_TO_HEADER[qid];
      const qnum = headerNumber(header) + "/33";
      const pregunta = questionTextFromHeader(header);
      const resp = safeVal(rowRaw?.[header]);

      return `
        <tr>
          <td>${idx + 1}</td>
          <td><span class="kbd">${esc(qnum)}</span> ${esc(pregunta)}</td>
          <td>${esc(resp)}</td>
        </tr>
      `;
    }).join("");

    return `
      <div class="miniCard" style="margin-top:14px;">
        <div class="sectionTitle">PARTE 3/3 — PREGUNTAS Y RESPUESTAS (ABIERTAS • INFORMATIVAS)</div>
        <div style="overflow:auto; margin-top:10px;">
          <table class="table">
            <thead>
              <tr>
                <th style="width:60px;">N°</th>
                <th style="width:360px;">8 PREGUNTAS “ABIERTAS” — PRIORIDAD BAJA</th>
                <th style="width:520px;">RESPUESTA DEL VENDEDOR</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  // -------------------------
  // Ocultar bloque viejo "PASO 2.4"
  // -------------------------

  function hideOldPaso24(panel) {
    const candidates = [...panel.querySelectorAll("div, p, span")];
    const marker = candidates.find(el => norm(el.textContent || "").includes("paso 2.4"));
    if (!marker) return;

    const next = marker.nextElementSibling;
    marker.style.display = "none";
    if (next) next.style.display = "none";
  }

  // -------------------------
  // RowKey
  // -------------------------

  function buildRowKey(rowRaw) {
    const mt = safeVal(rowRaw?.["Marca temporal"]);
    const em = safeVal(rowRaw?.["Dirección de correo electrónico"]);
    return `${mt}__${em}`;
  }

  // -------------------------
  // Patch principal
  // -------------------------

  async function patch(panel) {
    if (!panel) return;
    if (panel.style.display === "none") return;

    ensureInnerStyle();
    hideUselessCorrectIncorrectBoxes(panel);
    hideOldPaso24(panel);

    const rowRaw = extractRowRaw(panel);
    if (!rowRaw) return;

    const rowKey = buildRowKey(rowRaw);
    const prevKey = panel.getAttribute(PATCH_KEY_ATTR);
    const existingWrap = panel.querySelector(`#${WRAP_ID}`);

    if (prevKey === rowKey && existingWrap) {
      bindParte13Editors(existingWrap);
      // ✅ asegura sync al volver a abrir el mismo detalle
      syncUIP13StoreForRow(rowKey);
      return;
    }

    if (existingWrap) existingWrap.remove();

    // Insertar antes del JSON final
    const allDivs = [...panel.querySelectorAll("div")];
    const jsonDiv = allDivs.find(d => (d.textContent || "").trim().startsWith("{") && (d.textContent || "").includes('"Marca temporal"'));
    if (!jsonDiv) return;

    const wrap = document.createElement("div");
    wrap.id = WRAP_ID;

    const parte13 = await renderParte13(rowRaw, rowKey);
    const parte23 = await renderParte23(rowRaw);

    wrap.innerHTML = `
      ${parte13}
      ${parte23}
      ${renderParte33(rowRaw)}
    `;

    jsonDiv.parentNode.insertBefore(wrap, jsonDiv);
    panel.setAttribute(PATCH_KEY_ATTR, rowKey);

    // Bind editores Parte 1/3
    bindParte13Editors(wrap);

    // ✅ FIX: al renderizar, sincronizamos store para que la tabla general muestre lo correcto
    syncUIP13StoreForRow(rowKey);
  }

  // -------------------------
  // Observer
  // -------------------------

  function init() {
    const panel = document.getElementById(DETAIL_ID);
    if (!panel) return;

    const obs = new MutationObserver(() => {
      patch(panel);
    });

    obs.observe(panel, { childList: true, subtree: true });
    patch(panel);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
