import jwt from 'jsonwebtoken';
import { prisma } from '../prisma.js';

// Validar variable de entorno
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('JWT_SECRET no está definido. Usando valor por defecto para desarrollo.');
  } else {
    throw new Error('JWT_SECRET no está configurado en las variables de entorno');
  }
}

const SECRET = JWT_SECRET || 'dev-secret-key-only';

export const TOKEN_NAME = 'ecoraices_token';
export const MAX_AGE = 60 * 60 * 24 * 7; // 1 semana
export const MAX_AGE_LONG = 60 * 60 * 24 * 30; // 30 días (recordar mi cuenta)

const JSON_HEADERS = { 'Content-Type': 'application/json' };

const userSelect = {
  id: true,
  username: true,
  email: true,
  name: true,
  avatarUrl: true,
  role: true,
  isAdmin: true,
};

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
    // Verificar el token JWT
    const decoded = jwt.verify(token, SECRET);

    // Obtener el usuario de la base de datos
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: userSelect,
    });

    if (!user) {
      return { user: null, error: 'User not found' };
    }

    return { user, error: null };
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
