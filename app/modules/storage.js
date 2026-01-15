// app/modules/storage.js
// Persistencia cerrada (ÍNDICE 11)
// Key: psv10b_active_dataset
// Valor: { meta, results, human_overrides }
// results[] NUNCA contiene humano (humano va en human_overrides)

window.StoragePSV = (() => {
  const LS_KEY = "psv10b_active_dataset";

  // ✅ NUEVO (mínimo, para MAIL 2 VECES):
  // Guardamos una copia de results "completa" dentro de meta para poder restaurar duplicados
  // al importar backup / abrir en incógnito.
  const META_RAW_RESULTS_KEY = "__raw_results_v1";

  function isObject(x){ return x && typeof x === "object" && !Array.isArray(x); }

  function deepCloneJSON(x) {
    try { return JSON.parse(JSON.stringify(x)); } catch (_) { return x; }
  }

  function ensureRawResults(dataset) {
    try {
      if (!dataset || !isObject(dataset)) return dataset;

      // Asegurar meta
      if (!isObject(dataset.meta)) dataset.meta = {};

      // Si ya existe y es array, no lo tocamos
      if (Array.isArray(dataset.meta[META_RAW_RESULTS_KEY])) return dataset;

      // Si results existe, guardamos snapshot completo
      if (Array.isArray(dataset.results)) {
        dataset.meta[META_RAW_RESULTS_KEY] = deepCloneJSON(dataset.results);
      }

      return dataset;
    } catch (_) {
      return dataset;
    }
  }

  function normalizeDatasetOnLoad(ds) {
    // ✅ NUEVO (mínimo, para MAIL 2 VECES):
    // Si el dataset trae snapshot completo en meta.__raw_results_v1, lo usamos como results.
    try {
      if (!ds || !isObject(ds)) return ds;
      if (!isObject(ds.meta)) return ds;

      const raw = ds.meta[META_RAW_RESULTS_KEY];
      if (Array.isArray(raw) && raw.length) {
        // Si results actual está vacío o es menor, restauramos el "completo"
        if (!Array.isArray(ds.results) || ds.results.length < raw.length) {
          ds.results = raw;
        }
      }

      return ds;
    } catch (_) {
      return ds;
    }
  }

  function saveActiveDataset(dataset) {
    try {
      const ds = ensureRawResults(dataset);
      localStorage.setItem(LS_KEY, JSON.stringify(ds || null));
      return true;
    } catch (e) {
      console.error("saveActiveDataset error:", e);
      return false;
    }
  }

  function loadActiveDataset() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      return normalizeDatasetOnLoad(obj || null);
    } catch (e) {
      console.error("loadActiveDataset error:", e);
      return null;
    }
  }

  function resetActiveDataset() {
    try {
      localStorage.removeItem(LS_KEY);
      return true;
    } catch (e) {
      console.error("resetActiveDataset error:", e);
      return false;
    }
  }

  function exportActiveDatasetJSON() {
    const dataset = loadActiveDataset();
    if (!dataset) {
      alert("No hay dataset activo para exportar.");
      return false;
    }

    const blob = new Blob([JSON.stringify(dataset, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `psv10b_active_dataset_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return true;
  }

  function validateDatasetShape(ds) {
    // validación mínima cerrada
    if (!isObject(ds)) return false;
    if (!isObject(ds.meta)) return false;
    if (!Array.isArray(ds.results)) return false;
    if (!isObject(ds.human_overrides)) return false;
    return true;
  }

  function importActiveDatasetJSON(file, onDone) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || "");
        const ds = JSON.parse(text);

        if (!validateDatasetShape(ds)) {
          alert("JSON inválido: no cumple estructura mínima { meta, results, human_overrides }.");
          return;
        }

        // ✅ NUEVO (mínimo): si trae snapshot completo, lo preferimos
        const normalized = normalizeDatasetOnLoad(ds);

        saveActiveDataset(normalized);
        if (typeof onDone === "function") onDone(normalized);
      } catch (e) {
        console.error("importActiveDatasetJSON error:", e);
        alert("No se pudo importar JSON (archivo inválido).");
      }
    };
    reader.readAsText(file);
  }

  return {
    LS_KEY,
    saveActiveDataset,
    loadActiveDataset,
    resetActiveDataset,
    exportActiveDatasetJSON,
    importActiveDatasetJSON
  };
})();
