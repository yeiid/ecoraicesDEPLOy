/**
 * Etiquetas compartidas — Fase 0 limpieza.
 * Unifica los 5x getStatusLabel idénticos + licenseLabel dispersos.
 */

const STATUS_LABELS = {
  EXTINCT: '🌍 Extinto (EX)',
  EXTINCT_IN_WILD: '🌳 Extinto en estado silvestre (EW)',
  CRITICALLY_ENDANGERED: '🚨 En peligro crítico (CR)',
  ENDANGERED: '⚠️ En peligro (EN)',
  VULNERABLE: '⚠️ Vulnerable (VU)',
  NEAR_THREATENED: '⚠️ Casi amenazado (NT)',
  LEAST_CONCERN: '✅ Preocupación menor (LC)',
  DATA_DEFICIENT: '❓ Datos insuficientes (DD)',
  NOT_EVALUATED: '❔ No evaluado (NE)',
  PENDING: '⏳ Pendiente',
  APPROVED: '✅ Aprobada',
  REJECTED: '❌ Rechazada',
};

export function getStatusLabel(status) {
  return STATUS_LABELS[status] || status || '';
}

export function getStatusClass(status) {
  return (status || '').toLowerCase().replace(/_/g, '-');
}

const LICENSE_LABELS = {
  cc0: 'CC0 · Dominio público',
  'cc-by': 'CC BY · Atribución',
  'cc-by-sa': 'CC BY-SA · Atribución-CompartirIgual',
  'cc-by-nc': 'CC BY-NC · No comercial',
  'cc-by-nc-sa': 'CC BY-NC-SA',
  'public-domain': 'Dominio público',
};

export function licenseLabel(license) {
  const key = (license || '').toLowerCase();
  return LICENSE_LABELS[key] || (license ? `Licencia ${license}` : '');
}
