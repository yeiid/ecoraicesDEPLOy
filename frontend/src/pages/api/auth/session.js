import { getSessionUser } from '../../../lib/middleware/auth.js';

export async function GET({ cookies }) {
  try {
    const user = await getSessionUser({ cookies });

    return new Response(JSON.stringify({ user }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error getting session:', error);
    return new Response(JSON.stringify({ message: 'Error al obtener la sesión', user: null }), {
      status: 200, // Retornar 200 con user: null es más amigable para el cliente
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
