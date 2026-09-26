/**
 * Alertas + errores cliente — Fase 0 limpieza.
 * Reemplaza los 6x showAlert/showError/showFeedback copiados.
 */

export function normalizeError(err) {
  if (!err) return 'Error desconocido';
  if (typeof err === 'string') return err;
  const data = err.data || {};
  return (
    err.message ||
    data.message ||
    data.detail ||
    (typeof data.error === 'string' ? data.error : null) ||
    `Error ${err.status || ''}`.trim()
  );
}

/** Muestra mensaje en un box (#id o elemento) con tipo error|success|info|warning */
export function showAlert(boxOrId, msg, type = 'error') {
  const el = typeof boxOrId === 'string' ? document.getElementById(boxOrId) : boxOrId;
  if (!el) {
    console.warn('[ui] alert box no encontrado:', boxOrId, msg);
    return;
  }
  el.textContent = msg;
  el.className = `alert-box ${type}`;
  el.style.display = 'block';
}

export function hideAlert(boxOrId) {
  const el = typeof boxOrId === 'string' ? document.getElementById(boxOrId) : boxOrId;
  if (el) el.style.display = 'none';
}

/** Patrón único: log + box. Usar en todos los catch de formularios. */
export function handleClientError(err, boxOrId, context = 'app') {
  console.error(`[${context}]`, err);
  if (boxOrId) showAlert(boxOrId, normalizeError(err), 'error');
}
