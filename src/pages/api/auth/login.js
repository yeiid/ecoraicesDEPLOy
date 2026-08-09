import { validateUser } from '../../../lib/services/auth.service.js';
import { TOKEN_NAME, MAX_AGE, MAX_AGE_LONG } from '../../../lib/middleware/auth.js';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
const { sign } = jwt;

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-only';

const loginSchema = z.object({
  email: z.string().email('Ingresa un correo electrónico válido.'),
  password: z.string().min(1, 'La contraseña es obligatoria.'),
  remember: z.boolean().optional().default(false),
});

export async function POST({ request, cookies }) {
  try {
    const body = await request.json();

    // Validar campos con zod
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message || 'Datos inválidos.';
      return new Response(JSON.stringify({ message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { email, password, remember } = parsed.data;

    // Validar usuario
    const { user, error } = await validateUser(email, password);

    if (error || !user) {
      return new Response(JSON.stringify({ message: error || 'Credenciales inválidas.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Duración de la sesión: 30 días si "recordar mi cuenta", si no la sesión por defecto
    const maxAge = remember ? MAX_AGE_LONG : MAX_AGE;

    // Crear token JWT
    const token = sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        isAdmin: user.isAdmin || false,
      },
      JWT_SECRET,
      { expiresIn: maxAge }
    );

    // Configurar cookie segura en Astro
    cookies.set(TOKEN_NAME, token, {
      maxAge,
      expires: new Date(Date.now() + maxAge * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
    });

    // Devolver datos del usuario (sin información sensible)
    return new Response(
      JSON.stringify({
        success: true,
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
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Login API error:', error);
    return new Response(JSON.stringify({ message: error.message || 'Error en el inicio de sesión' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
