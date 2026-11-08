/**
 * EcoRaíces · Optimizador de Imágenes de Campo en Cliente
 * Convierte fotos tomadas con teléfonos móviles (4MB - 12MB) a formato WebP optimizado (~150KB - 300KB)
 * directamente en el navegador antes de guardar en IndexedDB o subir al servidor.
 */

export async function optimizeFieldImage(file, { maxDimension = 1600, quality = 0.82 } = {}) {
  if (!file || !file.type.startsWith('image/')) {
    throw new Error('El archivo proporcionado no es una imagen válida.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calcular escalado manteniendo relación de aspecto
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('No se pudo inicializar el contexto de renderizado de imagen.'));
        }

        // Suavizado de imagen de alta calidad
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Preferir WebP, con fallback a JPEG si el navegador no soporta compresión WebP
        const outputMime = 'image/webp';
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              // Fallback a JPEG
              canvas.toBlob(
                (fallbackBlob) => {
                  if (!fallbackBlob) return reject(new Error('Fallo al comprimir la imagen.'));
                  resolve({
                    blob: fallbackBlob,
                    mimeType: 'image/jpeg',
                    fileName: file.name.replace(/\.[^/.]+$/, "") + ".jpg",
                    originalSize: file.size,
                    compressedSize: fallbackBlob.size,
                    width,
                    height
                  });
                },
                'image/jpeg',
                quality
              );
              return;
            }

            resolve({
              blob,
              mimeType: outputMime,
              fileName: file.name.replace(/\.[^/.]+$/, "") + ".webp",
              originalSize: file.size,
              compressedSize: blob.size,
              width,
              height
            });
          },
          outputMime,
          quality
        );
      };

      img.onerror = () => reject(new Error('No se pudo decodificar la imagen seleccionada.'));
      img.src = e.target.result;
    };

    reader.onerror = () => reject(new Error('Error al leer el archivo en memoria.'));
    reader.readAsDataURL(file);
  });
}
