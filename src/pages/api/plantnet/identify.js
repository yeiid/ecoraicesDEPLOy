import { withAuth } from '../../../lib/middleware/auth.js';
import { identify } from '../../../lib/external/plantnet.js';

// Identificación de especies en tiempo real con Pl@ntNet.
// Recibe multipart/form-data con el campo "image" (archivo).
export const POST = withAuth(async ({ request }) => {
  if (!process.env.PLANTNET_API_KEY) {
    return new Response(
      JSON.stringify({ message: 'Pl@ntNet no está configurado en este servidor' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('image');
    if (!file || typeof file === 'string') {
      return new Response(
        JSON.stringify({ message: 'Se requiere una imagen (campo "image")' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!file.type || !file.type.startsWith('image/')) {
      return new Response(
        JSON.stringify({ message: 'El archivo debe ser una imagen' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Límite de tamaño (10 MB) para evitar abusos
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return new Response(
        JSON.stringify({ message: 'La imagen supera el tamaño máximo (10 MB)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = file.name || `observacion.${file.type.split('/')[1] || 'jpg'}`;

    const results = await identify([
      { buffer, contentType: file.type, filename },
    ]);

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error en identificación Pl@ntNet:', error);
    return new Response(
      JSON.stringify({ message: error.message || 'Error al identificar la especie' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
