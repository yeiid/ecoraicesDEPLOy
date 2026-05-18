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

export async function authenticateToken(req) {
  // Verificar si el token está en las cookies
  const token = req.cookies?.ecoraices_token;
  
  if (!token) {
    return { user: null, error: 'No token provided' };
  }

  try {
    // Verificar el token JWT
    const decoded = jwt.verify(token, SECRET);
    
    // Obtener el usuario de la base de datos
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        isAdmin: true
      }
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

export function withAuth(handler, roles = []) {
  return async (req, res) => {
    // Verificar autenticación
    const { user, error } = await authenticateToken(req);

    if (error || !user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Verificar roles si se especifican
    if (roles.length > 0 && !roles.includes(user.role) && !user.isAdmin) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Añadir el usuario al objeto de solicitud
    req.user = user;

    return handler(req, res);
  };
}

export function withAdmin(handler) {
  return withAuth(handler, ['ADMIN']);
}
