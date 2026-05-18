import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET({ params }) {
  try {
    const { id } = params;
    
    // Buscar la observación con datos relacionados
    const observation = await prisma.observation.findUnique({
      where: { id },
      include: {
        species: {
          include: {
            category: true
          }
        },
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true
          }
        }
      }
    });
    
    if (!observation) {
      return new Response(JSON.stringify({ message: 'Observación no encontrada' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    const formattedObservation = {
      ...observation,
      isVerified: observation.status === 'APPROVED',
      verified: observation.status === 'APPROVED'
    };
    
    return new Response(JSON.stringify(formattedObservation), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error fetching observation:', error);
    return new Response(JSON.stringify({ message: 'Error al obtener la observación' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
} 