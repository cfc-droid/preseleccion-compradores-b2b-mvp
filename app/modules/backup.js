// app/modules/backup.js
// BACKUP MIN-RIESGO (solo index.html + este módulo)
// Incluye:
// - Dataset activo: StoragePSV.LS_KEY = "psv10b_active_dataset"
// - Historial UI: "cfc_preseleccion_history_v1"
// - Parte 1/3 humano: "cfc_preseleccion_p13_v1" (si existiera)
// - Ediciones Parte 1/3 (patch_detalle_v2): prefijo "p13_edit_v2__"
//
// ✅ NUEVO (mínimo):
// - “ENVIÉ CORREO” store: "cfc_preseleccion_sentmail_v1"
//
// Botones (index.html):
// - btnBackupSave   -> guarda snapshot en localStorage (slot)
// - btnBackupExport -> descarga .json
// - btnBackupImport -> importa .json y restaura (limpia keys objetivo y reescribe)
//
// No toca ui.js / app.js / patch_detalle_v2.js

(() => {
  // ====== KEYS objetivo (whitelist cerrada) ======
  const KEY_ACTIVE_DATASET = "psv10b_active_dataset";
  const KEY_HISTORY = "cfc_preseleccion_history_v1";
  const KEY_P13_STORE = "cfc_preseleccion_p13_v1"; // usado por UI (aunque patch hoy usa otro formato)
  const PREFIX_P13_EDIT = "p13_edit_v2__";

  // ✅ NUEVO — store de “ENVIÉ CORREO”
  const KEY_SENTMAIL = "cfc_preseleccion_sentmail_v1";

  // Slot local de “Guardar”
  const KEY_BACKUP_SLOT = "psv10b_backup_slot_v1";

  // ====== Helpers ======
  function nowISO() {
    try { return new Date().toISOString(); } catch (_) { return String(Date.now()); }
  }

  function safeParseJSON(text) {
    try { return JSON.parse(text); } catch (_) { return null; }
  }

  function listTargetKeys() {
    const keys = [];

    // Exactas
    keys.push(KEY_ACTIVE_DATASET, KEY_HISTORY, KEY_P13_STORE, KEY_SENTMAIL, KEY_BACKUP_SLOT);

    // Prefijo (p13_edit_v2__)
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(PREFIX_P13_EDIT)) keys.push(k);
      }
    } catch (_) {}

    // Uniques
    return [...new Set(keys)];
  }

  function buildBackupObject() {
    const items = {};
    const targets = listTargetKeys();

    for (const k of targets) {
      try {
        const v = localStorage.getItem(k);
        if (v !== null && v !== undefined) items[k] = String(v);
      } catch (_) {}
    }

    // Pequeña “meta” para validar formato
    return {
      app: "preseleccion-vendedores-mvp",
      schema: 1,
      createdAt: nowISO(),
      includes: {
        active_dataset: KEY_ACTIVE_DATASET,
        history: KEY_HISTORY,
        p13_store: KEY_P13_STORE,
        p13_edit_prefix: PREFIX_P13_EDIT,
        sentmail_store: KEY_SENTMAIL
      },
      items
    };
  }

  function downloadJSON(obj, filename) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function validateBackupShape(bk) {
    if (!bk || typeof bk !== "object") return { ok: false, why: "No es un objeto JSON." };
    if (bk.schema !== 1) return { ok: false, why: "Schema no soportado." };
    if (!bk.items || typeof bk.items !== "object") return { ok: false, why: "Falta items (mapa de localStorage)." };
    return { ok: true, why: "" };
  }

  function clearTargetsBeforeRestore() {
    // Borra SOLO lo que manejamos (whitelist + prefijo)
    const targets = listTargetKeys();

    for (const k of targets) {
      // OJO: no borro el slot acá, porque “Guardar” es local. Igual lo removemos si viene en el backup.
      // Si preferís conservar siempre el slot, se puede excluir.
      try { localStorage.removeItem(k); } catch (_) {}
    }

    // Aseguro limpiar cualquier key por prefijo (por si no entró en listTargetKeys por límite)
    try {
      const toRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(PREFIX_P13_EDIT)) toRemove.push(k);
      }
      for (const k of toRemove) {
        try { localStorage.removeItem(k); } catch (_) {}
      }
    } catch (_) {}
  }

  function restoreFromBackupObject(bk) {
    const v = validateBackupShape(bk);
    if (!v.ok) {
      alert("Backup inválido: " + v.why);
      return false;
    }

    const keys = Object.keys(bk.items || {});
    // Seguridad: solo restauramos nuestras keys (exactas + prefijo)
    const allowed = (k) =>
      k === KEY_ACTIVE_DATASET ||
      k === KEY_HISTORY ||
      k === KEY_P13_STORE ||
      k === KEY_SENTMAIL ||
      k === KEY_BACKUP_SLOT ||
      (typeof k === "string" && k.startsWith(PREFIX_P13_EDIT));

    const safeKeys = keys.filter(allowed);

    clearTargetsBeforeRestore();

    for (const k of safeKeys) {
      try { localStorage.setItem(k, String(bk.items[k])); } catch (_) {}
    }

    return true;
  }

  // ====== Acciones UI ======
  function onSaveSlot() {
    const bk = buildBackupObject();
    try {
      // Guardamos SOLO el objeto backup serializado
      localStorage.setItem(KEY_BACKUP_SLOT, JSON.stringify(bk));
      alert("Backup guardado en este navegador (slot local).");
      return true;
    } catch (e) {
      console.error(e);
      alert("No se pudo guardar el backup en localStorage (slot).");
      return false;
    }
  }

  function onExport() {
    const bk = buildBackupObject();
    downloadJSON(bk, `psv_backup_${Date.now()}.json`);
  }

  function onImportFile(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const bk = safeParseJSON(text);

      const v = validateBackupShape(bk);
      if (!v.ok) {
        alert("No se pudo importar: " + v.why);
        return;
      }

      const ok = confirm(
        "Esto va a RESTAURAR el backup y sobrescribir:\n" +
        `- ${KEY_ACTIVE_DATASET}\n` +
        `- ${KEY_HISTORY}\n` +
        `- ${KEY_P13_STORE}\n` +
        `- ${KEY_SENTMAIL}\n` +
        `- ${PREFIX_P13_EDIT}*\n\n` +
        "¿Continuar?"
      );
      if (!ok) return;

      const restored = restoreFromBackupObject(bk);
      if (!restored) return;

      alert("Backup restaurado. Se recargará la página para aplicar todo.");
      try { window.location.reload(); } catch (_) {}
    };
    reader.readAsText(file);
  }

  // ====== Bind ======
  function bind() {
    const btnSave = document.getElementById("btnBackupSave");
    const btnExport = document.getElementById("btnBackupExport");
    const btnImport = document.getElementById("btnBackupImport");
    const inp = document.getElementById("backupFileInput");

    if (btnSave) btnSave.addEventListener("click", onSaveSlot);
    if (btnExport) btnExport.addEventListener("click", onExport);

    if (btnImport && inp) {
      btnImport.addEventListener("click", () => inp.click());
      inp.addEventListener("change", () => {
        const f = inp.files && inp.files[0];
        // reset para permitir re-importar el mismo archivo
        inp.value = "";
        onImportFile(f);
      });
    }
  }

  document.addEventListener("DOMContentLoaded", bind);
})();
