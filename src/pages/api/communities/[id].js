import { prisma } from '../../../lib/prisma.js';
import { getCommunityById, updateCommunity, deleteCommunity } from '../../../lib/services/community.service.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-only';
const TOKEN_NAME = 'ecoraices_token';

// Helper to authenticate user from cookies
async function getAuthenticatedUser(cookies) {
  const token = cookies.get(TOKEN_NAME)?.value;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        isAdmin: true
      }
    });
  } catch (error) {
    return null;
  }
}

// GET: Get community by ID
export async function GET({ params, request }) {
  try {
    const { id } = params;
    const url = new URL(request.url);
    const includeMembers = url.searchParams.get('includeMembers') === 'true';

    const community = await getCommunityById(id, includeMembers);

    if (!community) {
      return new Response(JSON.stringify({ message: 'Comunidad no encontrada' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(community), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching community:', error);
    return new Response(JSON.stringify({ message: 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// PUT: Update community details
export async function PUT({ params, request, cookies }) {
  const user = await getAuthenticatedUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ message: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { id } = params;
    const community = await getCommunityById(id);

    if (!community) {
      return new Response(JSON.stringify({ message: 'Comunidad no encontrada' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (community.ownerId !== user.id && !user.isAdmin) {
      return new Response(JSON.stringify({ message: 'No tienes permiso para editar esta comunidad' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { name, description, location, latitude, longitude, imageUrl } = body;

    const updatedCommunity = await updateCommunity(id, {
      name,
      description,
      location,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      imageUrl
    });

    return new Response(JSON.stringify(updatedCommunity), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error updating community:', error);
    return new Response(JSON.stringify({ message: error.message || 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// DELETE: Delete community
export async function DELETE({ params, cookies }) {
  const user = await getAuthenticatedUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ message: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { id } = params;
    const community = await getCommunityById(id);

    if (!community) {
      return new Response(JSON.stringify({ message: 'Comunidad no encontrada' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (community.ownerId !== user.id && !user.isAdmin) {
      return new Response(JSON.stringify({ message: 'No tienes permiso para eliminar esta comunidad' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await deleteCommunity(id);

    return new Response(null, {
      status: 204
    });
  } catch (error) {
    console.error('Error deleting community:', error);
    return new Response(JSON.stringify({ message: error.message || 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
