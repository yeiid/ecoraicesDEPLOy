const TOKEN_NAME = 'ecoraices_token';

export async function POST({ cookies }) {
  try {
    // Eliminar la cookie en Astro
    cookies.delete(TOKEN_NAME, {
      path: '/',
    });

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Sesión cerrada correctamente' 
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0',
        'Pragma': 'no-cache'
      }
    });
  } catch (error) {
    console.error('Logout error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      message: 'Ocurrió un error al intentar cerrar la sesión'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
