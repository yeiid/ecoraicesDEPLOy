// Wrapper middleware auth
export const TOKEN_NAME = 'ecoraices_token';
export const MAX_AGE = 60 * 60 * 24 * 7; // 1 semana
export const MAX_AGE_LONG = 60 * 60 * 24 * 30; // 30 días (recordar mi cuenta)

const JSON_HEADERS = { 'Content-Type': 'application/json' };

// Obtener el token desde el contexto de Astro (cookies)
export function getToken(context) {
  return (
    context.cookies?.get?.(TOKEN_NAME)?.value ??
    context.cookies?.[TOKEN_NAME] ??
    null
  );
}

export async function authenticateToken(context) {
  const token = getToken(context);

  if (!token) {
    return { user: null, error: 'No token provided' };
  }

  try {
    const backendUrl = process.env.BACKEND_URL || "http://backend:8000";
    const res = await fetch(`${backendUrl}/api/auth/session`, {
      headers: {
        'Cookie': `${TOKEN_NAME}=${token}`
      }
    });

    if (!res.ok) {
      return { user: null, error: 'User not found or invalid token' };
    }

    const data = await res.json();
    if (!data.user) {
      return { user: null, error: 'User not found' };
    }

    return { user: data.user, error: null };
  } catch (error) {
    console.error('Token verification error:', error);
    return { user: null, error: 'Invalid token' };
  }
}

// Devuelve el usuario autenticado o null (para endpoints de solo lectura)
export async function getSessionUser(context) {
  const { user, error } = await authenticateToken(context);
  return error || !user ? null : user;
}

// Wrapper para rutas API de Astro. Añade `context.user` al contexto autenticado.
export function withAuth(handler, roles = []) {
  return async (context) => {
    const { user, error } = await authenticateToken(context);

    if (error || !user) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: JSON_HEADERS,
      });
    }

    // Verificar roles si se especifican (el rol ADMIN se gestiona vía isAdmin)
    if (roles.length > 0 && !user.isAdmin && !roles.includes(user.role)) {
      return new Response(JSON.stringify({ message: 'Forbidden' }), {
        status: 403,
        headers: JSON_HEADERS,
      });
    }

    context.user = user;

    return handler(context);
  };
}

export function withAdmin(handler) {
  return async (context) => {
    const { user, error } = await authenticateToken(context);

    if (error || !user) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: JSON_HEADERS,
      });
    }

    if (!user.isAdmin) {
      return new Response(JSON.stringify({ message: 'Forbidden' }), {
        status: 403,
        headers: JSON_HEADERS,
      });
    }

    context.user = user;

    return handler(context);
  };
}
