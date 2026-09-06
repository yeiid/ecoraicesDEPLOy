import { createUser } from '../../../lib/services/auth.service.js';
import { prisma } from '../../../lib/prisma.js';
import { z } from 'zod';

const registerSchema = z.object({
  fullName: z.string().min(2, 'Ingresa tu nombre completo.'),
  email: z.string().email('Ingresa un correo electrónico válido.'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
  userType: z.enum(['individual', 'community'], { message: 'Tipo de cuenta inválido.' }),
  communityName: z.string().optional(),
  communityDescription: z.string().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
});

export async function POST({ request }) {
  try {
    const body = await request.json();

    // Validar campos con zod
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message || 'Datos inválidos.';
      return new Response(JSON.stringify({ message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { fullName, email, password, userType, communityName, communityDescription, latitude, longitude } = parsed.data;

    // Si es una cuenta de comunidad, el nombre de la comunidad es obligatorio
    if (userType === 'community' && !communityName) {
      return new Response(JSON.stringify({ message: 'El nombre de la comunidad es obligatorio.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Generar un nombre de usuario a partir del email
    const username = email.split('@')[0] + Math.floor(Math.random() * 1000);

    // Determinar el rol según el tipo de usuario
    const role = userType === 'community' ? 'COMMUNITY' : 'COLLECTOR';

    // Crear el usuario principal
    const user = await createUser({
      username,
      email,
      password,
      name: fullName,
      role,
    });

    if (user.error) {
      return new Response(JSON.stringify({ message: user.error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Si es una cuenta de tipo comunidad, crear la comunidad e incorporar al creador como miembro ADMIN
    if (userType === 'community' && communityName) {
      try {
        await prisma.community.create({
          data: {
            name: communityName,
            description: communityDescription || null,
            latitude: latitude || null,
            longitude: longitude || null,
            ownerId: user.id,
            members: {
              create: {
                userId: user.id,
                role: 'ADMIN',
              },
            },
          },
        });
      } catch (dbError) {
        console.error('Error creating community during registration:', dbError);
        return new Response(JSON.stringify({ message: 'Error al crear la comunidad vinculada al usuario' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Usuario registrado con éxito',
        user,
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Registration API error:', error);
    return new Response(JSON.stringify({ message: error.message || 'Error en el servidor al registrar el usuario' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
