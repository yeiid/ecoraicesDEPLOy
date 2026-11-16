/**
 * EcoRaíces Campo · Almacenamiento de Fotos Web (Fallback para navegador)
 */

export async function ensureTreesDirectory() {
  return 'web_trees/';
}

export async function persistTreePhoto(tempUri) {
  // En navegador web, la URI de la imagen seleccionada se preserva como data URL o blob URL
  return tempUri;
}

export async function deleteTreePhoto() {
  return true;
}
