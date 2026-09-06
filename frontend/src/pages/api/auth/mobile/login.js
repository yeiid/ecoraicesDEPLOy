/**
 * POST /api/auth/mobile/login
 * Login para la app Flutter — devuelve JWT como JSON (no cookie)
 * Compatible con: Authorization: Bearer <token>
 */
import { validateUser } from '../../../../lib/services/auth.service.js';
import jwt from 'jsonwebtoken';
const { sign } = jwt;

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-only';
const MAX_AGE_MOBILE = 60 * 60 * 24 * 30; // 30 días

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST({ request }) {
  try {
    let email, password;

    try {
      const body = await request.json();
      email = body.email;
      password = body.password;
    } catch {
      return new Response(JSON.stringify({ error: 'Cuerpo JSON inválido' }), {
        status: 400,
        headers: CORS_HEADERS,
      });
    }

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email y contraseña son requeridos' }), {
        status: 400,
        headers: CORS_HEADERS,
      });
    }

    // Reusar la misma lógica de validación que el login web
    const { user, error } = await validateUser(email, password);

    if (error || !user) {
      return new Response(JSON.stringify({ error: error || 'Credenciales inválidas' }), {
        status: 401,
        headers: CORS_HEADERS,
      });
    }

    // Generar JWT — mismo formato que el web, compatible con withAuth()
    const token = sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        isAdmin: user.isAdmin || false,
      },
      JWT_SECRET,
      { expiresIn: MAX_AGE_MOBILE }
    );

    return new Response(
      JSON.stringify({
        token,
        expiresIn: MAX_AGE_MOBILE,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          role: user.role,
          isAdmin: user.isAdmin || false,
        },
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err) {
    console.error('[mobile/login] Error:', err);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500,
      headers: CORS_HEADERS,
    });
  }
}
