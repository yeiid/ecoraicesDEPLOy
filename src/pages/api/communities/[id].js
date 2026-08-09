import { getCommunityById, updateCommunity, deleteCommunity } from '../../../lib/services/community.service.js';
import { withAuth } from '../../../lib/middleware/auth.js';

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
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(community), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching community:', error);
    return new Response(JSON.stringify({ message: 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// PUT: Update community details (solo propietario o admin)
export const PUT = withAuth(async ({ params, request, user }) => {
  try {
    const { id } = params;
    const community = await getCommunityById(id);

    if (!community) {
      return new Response(JSON.stringify({ message: 'Comunidad no encontrada' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (community.ownerId !== user.id && !user.isAdmin) {
      return new Response(JSON.stringify({ message: 'No tienes permiso para editar esta comunidad' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
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
      imageUrl,
    });

    return new Response(JSON.stringify(updatedCommunity), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating community:', error);
    return new Response(JSON.stringify({ message: error.message || 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

// DELETE: Delete community (solo propietario o admin)
export const DELETE = withAuth(async ({ params, user }) => {
  try {
    const { id } = params;
    const community = await getCommunityById(id);

    if (!community) {
      return new Response(JSON.stringify({ message: 'Comunidad no encontrada' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (community.ownerId !== user.id && !user.isAdmin) {
      return new Response(JSON.stringify({ message: 'No tienes permiso para eliminar esta comunidad' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await deleteCommunity(id);

    return new Response(null, {
      status: 204,
    });
  } catch (error) {
    console.error('Error deleting community:', error);
    return new Response(JSON.stringify({ message: error.message || 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
