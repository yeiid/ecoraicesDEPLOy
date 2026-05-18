import { prisma } from '../../../../lib/prisma.js';
import { 
  addCommunityMember, 
  updateCommunityMember, 
  removeCommunityMember,
  getCommunityById
} from '../../../../lib/services/community.service.js';
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

// POST: Add a member to a community
export async function POST({ params, request, cookies }) {
  const user = await getAuthenticatedUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ message: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { id: communityId } = params;
    const body = await request.json();
    const { userId, role = 'MEMBER' } = body;

    const community = await getCommunityById(communityId, true);
    if (!community) {
      return new Response(JSON.stringify({ message: 'Comunidad no encontrada' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const isAdmin = community.members.some(
      member => member.userId === user.id && 
               (member.role === 'ADMIN' || user.isAdmin)
    );

    if (!isAdmin) {
      return new Response(JSON.stringify({ message: 'No tienes permisos para esta acción' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await addCommunityMember(communityId, userId, role);
    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error adding community member:', error);
    return new Response(JSON.stringify({ message: error.message || 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// PUT: Update a member's role
export async function PUT({ params, request, cookies }) {
  const user = await getAuthenticatedUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ message: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { id: communityId } = params;
    const body = await request.json();
    const { userId, role } = body;

    const community = await getCommunityById(communityId, true);
    if (!community) {
      return new Response(JSON.stringify({ message: 'Comunidad no encontrada' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const isAdmin = community.members.some(
      member => member.userId === user.id && 
               (member.role === 'ADMIN' || user.isAdmin)
    );

    if (!isAdmin) {
      return new Response(JSON.stringify({ message: 'No tienes permisos para esta acción' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (community.ownerId === userId) {
      return new Response(JSON.stringify({ message: 'No se puede cambiar el rol del creador' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await updateCommunityMember(communityId, userId, role);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error updating community member:', error);
    return new Response(JSON.stringify({ message: error.message || 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// DELETE: Remove a member from the community
export async function DELETE({ params, request, cookies }) {
  const user = await getAuthenticatedUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ message: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { id: communityId } = params;
    const body = await request.json();
    const { userId } = body;

    const community = await getCommunityById(communityId, true);
    if (!community) {
      return new Response(JSON.stringify({ message: 'Comunidad no encontrada' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const isAdmin = community.members.some(
      member => member.userId === user.id && 
               (member.role === 'ADMIN' || user.isAdmin)
    );

    const isSelf = user.id === userId;

    if (!isAdmin && !isSelf) {
      return new Response(JSON.stringify({ message: 'No tienes permisos para esta acción' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (community.ownerId === userId) {
      return new Response(JSON.stringify({ message: 'No se puede eliminar al creador' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await removeCommunityMember(communityId, userId);
    return new Response(null, {
      status: 204
    });
  } catch (error) {
    console.error('Error removing community member:', error);
    return new Response(JSON.stringify({ message: error.message || 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
