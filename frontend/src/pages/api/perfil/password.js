import { prisma } from '../../../lib/prisma.js';
import { withAuth } from '../../../lib/middleware/auth.js';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const SALT_ROUNDS = 10;

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Ingresa tu contraseña actual'),
  newPassword: z.string().min(8, 'La nueva contraseña debe tener al menos 8 caracteres'),
});

// PUT: Cambiar contraseña (verifica la actual)
export const PUT = withAuth(async ({ request, user }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = passwordSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message || 'Datos inválidos';
      return new Response(JSON.stringify({ message }), { status: 400, headers: JSON_HEADERS });
    }

    const { currentPassword, newPassword } = parsed.data;

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) {
      return new Response(JSON.stringify({ message: 'Usuario no encontrado' }), {
        status: 404,
        headers: JSON_HEADERS,
      });
    }

    const isValid = await bcrypt.compare(currentPassword, dbUser.passwordHash);
    if (!isValid) {
      return new Response(JSON.stringify({ message: 'La contraseña actual es incorrecta' }), {
        status: 400,
        headers: JSON_HEADERS,
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashedPassword, updatedAt: new Date() },
    });

    return new Response(JSON.stringify({ success: true, message: 'Contraseña actualizada' }), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    return new Response(JSON.stringify({ message: 'Error al cambiar la contraseña' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
});
