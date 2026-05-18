import { createUser } from '../../../lib/services/auth.service.js';
import { prisma } from '../../../lib/prisma.js';

export async function POST({ request }) {
  try {
    const body = await request.json();
    const { fullName, email, password, userType, communityName, communityDescription, latitude, longitude } = body;

    // Validar campos requeridos
    if (!fullName || !email || !password || !userType) {
      return new Response(JSON.stringify({ message: 'Todos los campos básicos son obligatorios.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
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
      role
    });

    if (user.error) {
      return new Response(JSON.stringify({ message: user.error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Si es una cuenta de tipo comunidad, crear la comunidad e incorporar al creador como miembro ADMIN
    if (userType === 'community' && communityName) {
      try {
        await prisma.community.create({
          data: {
            name: communityName,
            description: communityDescription || null,
            ownerId: user.id,
            members: {
              create: {
                userId: user.id,
                role: 'ADMIN'
              }
            }
          }
        });
      } catch (dbError) {
        console.error('Error creating community during registration:', dbError);
        return new Response(JSON.stringify({ message: 'Error al crear la comunidad vinculada al usuario' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Usuario registrado con éxito',
      user 
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Registration API error:', error);
    return new Response(JSON.stringify({ message: error.message || 'Error en el servidor al registrar el usuario' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
