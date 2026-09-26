/**
 * Confirmación accesible — Fase 3 errores.
 * Envuelve <ConfirmDialog> (<dialog>) y retorna Promise.
 * Uso:
 *   import { confirmAction } from '../lib/confirm.js';
 *   const { confirmed, value } = await confirmAction('admin-confirm', {
 *     title: 'Eliminar', message: '¿Seguro?', inputValue: 'motivo?'
 *   });
 *
 * Requiere <ConfirmDialog id="admin-confirm" ... /> en la página.
 */

export function confirmAction(dialogId, { title, message, inputValue } = {}) {
  return new Promise((resolve) => {
    const dialog = document.getElementById(dialogId);
    // Fallback si el diálogo no existe (SSR parcial, tests)
    if (!dialog || typeof dialog.showModal !== 'function') {
      resolve({ confirmed: window.confirm(message || '¿Confirmar?'), value: '' });
      return;
    }
    if (title) {
      const h = dialog.querySelector('h2');
      if (h) h.textContent = title;
    }
    if (message) {
      const p = dialog.querySelector('p');
      if (p) p.textContent = message;
    }
    const input = dialog.querySelector('input[name="dialogInput"]');
    if (input && inputValue !== undefined) input.value = inputValue;

    const onConfirm = (e) => {
      dialog.removeEventListener('confirm', onConfirm);
      dialog.removeEventListener('close', onClose);
      resolve({ confirmed: !!e.detail?.confirmed, value: e.detail?.value ?? input?.value ?? '' });
    };
    const onClose = () => {
      dialog.removeEventListener('confirm', onConfirm);
      dialog.removeEventListener('close', onClose);
      resolve({ confirmed: false, value: input?.value ?? '' });
    };
    dialog.addEventListener('confirm', onConfirm, { once: true });
    dialog.addEventListener('close', onClose, { once: true });
    try {
      dialog.showModal();
    } catch {
      resolve({ confirmed: window.confirm(message || '¿Confirmar?'), value: '' });
    }
  });
}
