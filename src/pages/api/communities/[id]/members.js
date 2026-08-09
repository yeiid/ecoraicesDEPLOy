import {
  addCommunityMember,
  updateCommunityMember,
  removeCommunityMember,
  getCommunityById,
} from '../../../../lib/services/community.service.js';
import { withAuth } from '../../../../lib/middleware/auth.js';

// POST: Add a member to a community.
// - Con { self: true }: el usuario autenticado se une como MEMBER (autoservicio).
// - Sin self: solo el admin de la comunidad puede añadir a otro usuario.
export const POST = withAuth(async ({ params, request, user }) => {
  try {
    const { id: communityId } = params;
    const body = await request.json();
    const { userId, role = 'MEMBER', self = false } = body;

    const community = await getCommunityById(communityId, true);
    if (!community) {
      return new Response(JSON.stringify({ message: 'Comunidad no encontrada' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const isAlreadyMember = community.members.some((member) => member.userId === user.id);
    const isAdmin = community.members.some(
      (member) => member.userId === user.id && (member.role === 'ADMIN' || user.isAdmin)
    );

    // Autoservicio: el usuario se une a sí mismo
    if (self) {
      if (isAlreadyMember) {
        return new Response(JSON.stringify({ message: 'Ya eres miembro de esta comunidad' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const result = await addCommunityMember(communityId, user.id, 'MEMBER');
      return new Response(JSON.stringify(result), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!isAdmin) {
      return new Response(JSON.stringify({ message: 'No tienes permisos para esta acción' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await addCommunityMember(communityId, userId, role);
    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error adding community member:', error);
    return new Response(JSON.stringify({ message: error.message || 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

// PUT: Update a member's role (solo admin de la comunidad)
export const PUT = withAuth(async ({ params, request, user }) => {
  try {
    const { id: communityId } = params;
    const body = await request.json();
    const { userId, role } = body;

    const community = await getCommunityById(communityId, true);
    if (!community) {
      return new Response(JSON.stringify({ message: 'Comunidad no encontrada' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const isAdmin = community.members.some(
      (member) => member.userId === user.id && (member.role === 'ADMIN' || user.isAdmin)
    );

    if (!isAdmin) {
      return new Response(JSON.stringify({ message: 'No tienes permisos para esta acción' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (community.ownerId === userId) {
      return new Response(JSON.stringify({ message: 'No se puede cambiar el rol del creador' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await updateCommunityMember(communityId, userId, role);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating community member:', error);
    return new Response(JSON.stringify({ message: error.message || 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

// DELETE: Remove a member from the community.
// - Con { self: true }: el propio usuario se retira (autoservicio), salvo el creador.
// - Sin self: solo admin o el propio usuario (gestión de admin).
export const DELETE = withAuth(async ({ params, request, user }) => {
  try {
    const { id: communityId } = params;
    const body = await request.json();
    const { userId, self = false } = body;

    const community = await getCommunityById(communityId, true);
    if (!community) {
      return new Response(JSON.stringify({ message: 'Comunidad no encontrada' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const isAdmin = community.members.some(
      (member) => member.userId === user.id && (member.role === 'ADMIN' || user.isAdmin)
    );
    const isSelf = user.id === userId;

    // Autoservicio: el usuario se retira él mismo
    if (self) {
      if (community.ownerId === user.id) {
        return new Response(JSON.stringify({ message: 'El creador no puede abandonar la comunidad' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const isMember = community.members.some((member) => member.userId === user.id);
      if (!isMember) {
        return new Response(JSON.stringify({ message: 'No eres miembro de esta comunidad' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      await removeCommunityMember(communityId, user.id);
      return new Response(null, {
        status: 204,
      });
    }

    if (!isAdmin && !isSelf) {
      return new Response(JSON.stringify({ message: 'No tienes permisos para esta acción' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (community.ownerId === userId) {
      return new Response(JSON.stringify({ message: 'No se puede eliminar al creador' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await removeCommunityMember(communityId, userId);
    return new Response(null, {
      status: 204,
    });
  } catch (error) {
    console.error('Error removing community member:', error);
    return new Response(JSON.stringify({ message: error.message || 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
