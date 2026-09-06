/**
 * POST /api/auth/mobile/register
 * Registro para la app Flutter — devuelve JWT directamente como JSON
 * Compatible con el flujo de registro existente del web
 */
import { createUser } from '../../../../lib/services/auth.service.js';
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
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Cuerpo JSON inválido' }), {
        status: 400,
        headers: CORS_HEADERS,
      });
    }

    const { fullName, email, password, userType = 'individual' } = body;

    if (!fullName || !email || !password) {
      return new Response(JSON.stringify({ error: 'Nombre, email y contraseña son requeridos' }), {
        status: 400,
        headers: CORS_HEADERS,
      });
    }

    if (password.length < 8) {
      return new Response(JSON.stringify({ error: 'La contraseña debe tener al menos 8 caracteres' }), {
        status: 400,
        headers: CORS_HEADERS,
      });
    }

    // Generar username a partir del email (igual que el web)
    const username = email.split('@')[0] + Math.floor(Math.random() * 1000);
    const role = userType === 'community' ? 'COMMUNITY' : 'COLLECTOR';

    const user = await createUser({ username, email, password, name: fullName, role });

    if (user.error) {
      return new Response(JSON.stringify({ error: user.error }), {
        status: 400,
        headers: CORS_HEADERS,
      });
    }

    // Generar JWT automáticamente al registrar (UX: no pedir login después del registro)
    const token = sign(
      { userId: user.id, email: user.email, role: user.role, isAdmin: false },
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
          role: user.role,
          avatarUrl: null,
          isAdmin: false,
        },
      }),
      { status: 201, headers: CORS_HEADERS }
    );
  } catch (err) {
    console.error('[mobile/register] Error:', err);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500,
      headers: CORS_HEADERS,
    });
  }
}
