import { validateUser } from '../../../lib/services/auth.service.js';
import jwt from 'jsonwebtoken';
const { sign } = jwt;

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const TOKEN_NAME = 'ecoraices_token';
const MAX_AGE = 60 * 60 * 24 * 7; // 1 week

export async function POST({ request, cookies }) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validar campos requeridos
    if (!email || !password) {
      return new Response(JSON.stringify({ message: 'El correo y la contraseña son obligatorios.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validar usuario
    const { user, error } = await validateUser(email, password);

    if (error || !user) {
      return new Response(JSON.stringify({ message: error || 'Credenciales inválidas.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Crear token JWT
    const token = sign(
      { 
        userId: user.id,
        email: user.email,
        role: user.role,
        isAdmin: user.isAdmin || false
      },
      JWT_SECRET,
      { expiresIn: MAX_AGE }
    );

    // Configurar cookie segura en Astro
    cookies.set(TOKEN_NAME, token, {
      maxAge: MAX_AGE,
      expires: new Date(Date.now() + MAX_AGE * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
    });

    // Devolver datos del usuario (sin información sensible)
    return new Response(JSON.stringify({ 
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: user.role,
        isAdmin: user.isAdmin || false
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Login API error:', error);
    return new Response(JSON.stringify({ message: error.message || 'Error en el inicio de sesión' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
