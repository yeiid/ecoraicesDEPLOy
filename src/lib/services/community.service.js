import { prisma } from '../prisma.js';
import { handleDatabaseError } from '../prisma.js';

export async function createCommunity({ name, description, location, latitude, longitude, imageUrl, ownerId }) {
  try {
    return await prisma.$transaction(async (tx) => {
      // Crear la comunidad
      const community = await tx.community.create({
        data: {
          name,
          description,
          location,
          latitude,
          longitude,
          imageUrl,
          ownerId
        }
      });

      // Hacer al creador administrador de la comunidad
      await tx.communityMember.create({
        data: {
          userId: ownerId,
          communityId: community.id,
          role: 'ADMIN'
        }
      });

      return community;
    });
  } catch (error) {
    return handleDatabaseError(error, 'Error creating community');
  }
}

export async function getCommunityById(id, includeMembers = false) {
  try {
    return await prisma.community.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            name: true,
            avatarUrl: true
          }
        },
        members: includeMembers ? {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                avatarUrl: true,
                email: true
              }
            }
          },
          orderBy: {
            role: 'desc' // Mostrar administradores primero
          }
        } : false
      }
    });
  } catch (error) {
    return handleDatabaseError(error, 'Error fetching community');
  }
}

export async function updateCommunity(id, data) {
  try {
    return await prisma.community.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      }
    });
  } catch (error) {
    return handleDatabaseError(error, 'Error updating community');
  }
}

export async function deleteCommunity(id) {
  try {
    // Eliminar miembros primero (debido a las restricciones de clave foránea)
    await prisma.communityMember.deleteMany({
      where: { communityId: id }
    });

    // Luego eliminar la comunidad
    return await prisma.community.delete({
      where: { id }
    });
  } catch (error) {
    return handleDatabaseError(error, 'Error deleting community');
  }
}

export async function addCommunityMember(communityId, userId, role = 'MEMBER') {
  try {
    return await prisma.communityMember.create({
      data: {
        communityId,
        userId,
        role
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            avatarUrl: true
          }
        }
      }
    });
  } catch (error) {
    return handleDatabaseError(error, 'Error adding member to community');
  }
}

export async function updateCommunityMember(communityId, userId, role) {
  try {
    return await prisma.communityMember.update({
      where: {
        userId_communityId: {
          userId,
          communityId
        }
      },
      data: {
        role,
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            avatarUrl: true
          }
        }
      }
    });
  } catch (error) {
    return handleDatabaseError(error, 'Error updating community member');
  }
}

export async function removeCommunityMember(communityId, userId) {
  try {
    return await prisma.communityMember.delete({
      where: {
        userId_communityId: {
          userId,
          communityId
        }
      }
    });
  } catch (error) {
    return handleDatabaseError(error, 'Error removing member from community');
  }
}

export async function getUserCommunities(userId) {
  try {
    const memberships = await prisma.communityMember.findMany({
      where: { userId },
      include: {
        community: {
          include: {
            _count: {
              select: { members: true }
            }
          }
        }
      },
      orderBy: {
        community: {
          name: 'asc'
        }
      }
    });

    return memberships.map(membership => ({
      ...membership.community,
      memberCount: membership.community._count.members,
      role: membership.role
    }));
  } catch (error) {
    return handleDatabaseError(error, 'Error fetching user communities');
  }
}
