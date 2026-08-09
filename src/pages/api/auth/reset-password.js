import { prisma } from '../../../lib/prisma.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const SALT_ROUNDS = 10;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function POST({ request }) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = typeof body.token === 'string' ? body.token : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!token || !password) {
      return new Response(JSON.stringify({ message: 'Token y contraseña son obligatorios.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (password.length < 8) {
      return new Response(JSON.stringify({ message: 'La contraseña debe tener al menos 8 caracteres.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const resetTokenHash = hashToken(token);

    const user = await prisma.user.findFirst({
      where: {
        resetTokenHash,
        resetTokenExpiresAt: { gt: new Date() },
      },
    });

    if (!user) {
      return new Response(
        JSON.stringify({ message: 'El enlace no es válido o ya expiró. Solicita uno nuevo.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetTokenHash: null,
        resetTokenExpiresAt: null,
      },
    });

    return new Response(
      JSON.stringify({ success: true, message: 'Tu contraseña se actualizó correctamente. Ya puedes iniciar sesión.' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Reset password API error:', error);
    return new Response(JSON.stringify({ message: 'Error al restablecer la contraseña.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
