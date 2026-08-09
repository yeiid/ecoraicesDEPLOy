import { prisma } from '../../../lib/prisma.js';
import { withAuth } from '../../../lib/middleware/auth.js';
import { z } from 'zod';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

const profileSchema = z.object({
  name: z.string().min(1, 'El nombre no puede estar vacío').max(80).optional(),
  username: z
    .string()
    .min(3, 'El usuario debe tener al menos 3 caracteres')
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y guion bajo')
    .optional(),
  email: z.string().email('Correo electrónico inválido').optional(),
  bio: z.string().max(300, 'La biografía no puede superar 300 caracteres').nullable().optional(),
  avatarUrl: z.string().max(500).nullable().optional(),
});

// GET: Datos completos del perfil del usuario autenticado
export const GET = withAuth(async ({ user }) => {
  try {
    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        avatarUrl: true,
        bio: true,
        role: true,
        isAdmin: true,
        createdAt: true,
      },
    });

    if (!profile) {
      return new Response(JSON.stringify({ message: 'Usuario no encontrado' }), {
        status: 404,
        headers: JSON_HEADERS,
      });
    }

    return new Response(JSON.stringify(profile), { status: 200, headers: JSON_HEADERS });
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    return new Response(JSON.stringify({ message: 'Error al obtener el perfil' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
});

// PATCH: Actualizar datos del perfil
export const PATCH = withAuth(async ({ request, user }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message || 'Datos inválidos';
      return new Response(JSON.stringify({ message }), { status: 400, headers: JSON_HEADERS });
    }

    const data = parsed.data;
    const updates = {};

    if (data.username !== undefined && data.username !== user.username) {
      const exists = await prisma.user.findUnique({ where: { username: data.username } });
      if (exists) {
        return new Response(JSON.stringify({ message: 'Ese nombre de usuario ya está en uso' }), {
          status: 409,
          headers: JSON_HEADERS,
        });
      }
      updates.username = data.username;
    }

    if (data.email !== undefined && data.email !== user.email) {
      const exists = await prisma.user.findUnique({ where: { email: data.email } });
      if (exists) {
        return new Response(JSON.stringify({ message: 'Ese correo ya está registrado' }), {
          status: 409,
          headers: JSON_HEADERS,
        });
      }
      updates.email = data.email;
    }

    if (data.name !== undefined) updates.name = data.name;
    if (data.bio !== undefined) updates.bio = data.bio;
    if (data.avatarUrl !== undefined) updates.avatarUrl = data.avatarUrl;

    if (Object.keys(updates).length === 0) {
      return new Response(JSON.stringify({ message: 'No hay campos para actualizar' }), {
        status: 400,
        headers: JSON_HEADERS,
      });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { ...updates, updatedAt: new Date() },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        avatarUrl: true,
        bio: true,
        role: true,
        isAdmin: true,
      },
    });

    return new Response(JSON.stringify(updated), { status: 200, headers: JSON_HEADERS });
  } catch (error) {
    console.error('Error actualizando perfil:', error);
    return new Response(JSON.stringify({ message: 'Error al actualizar el perfil' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
});
