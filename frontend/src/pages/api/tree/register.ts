import type { APIRoute } from 'astro';

// Tipos de datos
interface TreeData {
  species: string;
  commonName?: string;
  height?: number;
  diameter?: number;
  healthStatus: string;
  notes?: string;
  latitude: number;
  longitude: number;
  userId: string;
  communityId?: string;
  registeredAt: string;
}

export const post: APIRoute = async ({ request }) => {
  try {
    // Verificar método de la solicitud
    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método no permitido' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verificar autenticación (esto debería venir de tu sistema de autenticación)
    const isAuthenticated = true; // Reemplazar con lógica real de autenticación
    
    if (!isAuthenticated) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Obtener datos del cuerpo de la solicitud
    const data: TreeData = await request.json();
    
    // Validar datos requeridos
    if (!data.species || data.latitude === undefined || data.longitude === undefined) {
      return new Response(
        JSON.stringify({ error: 'Faltan campos requeridos' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validar coordenadas
    if (Math.abs(data.latitude) > 90 || Math.abs(data.longitude) > 180) {
      return new Response(
        JSON.stringify({ error: 'Coordenadas inválidas' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Aquí iría la lógica para guardar en la base de datos
    // Por ahora, simulamos una respuesta exitosa
    const newTree = {
      id: `tree_${Date.now()}`,
      ...data,
      registeredAt: new Date().toISOString(),
    };

    // Simular guardado en base de datos
    console.log('Árbol registrado:', newTree);

    // Retornar respuesta exitosa
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Árbol registrado exitosamente',
        data: newTree,
      }),
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error al procesar la solicitud:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Error interno del servidor',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};

// Asegurarse de que solo se pueda hacer POST
export const get: APIRoute = ({ request }) => {
  return new Response(
    JSON.stringify({ error: 'Método no permitido' }),
    { status: 405, headers: { 'Content-Type': 'application/json' } }
  );
};
