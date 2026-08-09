import { prisma } from '../../../lib/prisma.js';
import { createCommunity, getUserCommunities } from '../../../lib/services/community.service.js';
import { getSessionUser, withAuth } from '../../../lib/middleware/auth.js';

// GET all communities or authenticated user's communities
export async function GET({ request, cookies }) {
  try {
    const url = new URL(request.url);
    const filterByUser = url.searchParams.get('my') === 'true';

    if (filterByUser) {
      const user = await getSessionUser({ cookies });
      if (!user) {
        return new Response(JSON.stringify({ message: 'No autorizado' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const communities = await getUserCommunities(user.id);
      return new Response(JSON.stringify(communities), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get all communities in the system
    const communities = await prisma.community.findMany({
      include: {
        _count: {
          select: { members: true },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    const formattedCommunities = communities.map((community) => ({
      ...community,
      memberCount: community._count.members,
      bannerUrl: community.imageUrl, // map to bannerUrl for the frontend UI
    }));

    return new Response(JSON.stringify(formattedCommunities), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching communities:', error);
    return new Response(JSON.stringify({ message: 'Error al obtener las comunidades' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// POST: Create a new community (requiere autenticación)
export const POST = withAuth(async ({ request, user }) => {
  try {
    const body = await request.json();
    const { name, description, location, latitude, longitude, imageUrl } = body;

    if (!name) {
      return new Response(JSON.stringify({ message: 'El nombre es obligatorio' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const community = await createCommunity({
      name,
      description,
      location,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      imageUrl,
      ownerId: user.id,
    });

    return new Response(JSON.stringify(community), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creating community:', error);
    return new Response(JSON.stringify({ message: error.message || 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
