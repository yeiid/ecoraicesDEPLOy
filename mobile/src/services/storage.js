/**
 * EcoRaíces Campo · Almacenamiento Permanente de Fotos en Disco
 * Guarda las fotos en el directorio protegido del sistema que no se borra con la caché.
 */

import * as FileSystem from 'expo-file-system';

const TREES_DIR = FileSystem.documentDirectory + 'trees/';

export async function ensureTreesDirectory() {
  const info = await FileSystem.getInfoAsync(TREES_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(TREES_DIR, { intermediates: true });
  }
  return TREES_DIR;
}

export async function persistTreePhoto(tempUri) {
  if (!tempUri) return null;
  await ensureTreesDirectory();

  const ext = tempUri.split('.').pop() || 'jpg';
  const fileName = `tree_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const targetUri = TREES_DIR + fileName;

  await FileSystem.copyAsync({
    from: tempUri,
    to: targetUri
  });

  return targetUri;
}

export async function deleteTreePhoto(localUri) {
  if (!localUri) return;
  try {
    const info = await FileSystem.getInfoAsync(localUri);
    if (info.exists) {
      await FileSystem.deleteAsync(localUri, { idempotent: true });
    }
  } catch (err) {
    console.warn('[Storage] Error al borrar foto:', err);
  }
}
