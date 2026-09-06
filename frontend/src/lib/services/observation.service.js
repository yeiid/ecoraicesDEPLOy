import { prisma, handleDatabaseError, paginate } from '../prisma.js';

export async function createObservation({
  speciesId,
  userId,
  communityId = null,
  observationDate,
  latitude,
  longitude,
  altitude = null,
  notes = null,
  imageUrl = null
}) {
  try {
    return await prisma.observation.create({
      data: {
        species: { connect: { id: speciesId } },
        user: { connect: { id: userId } },
        ...(communityId && { community: { connect: { id: communityId } } }),
        observationDate: new Date(observationDate),
        latitude,
        longitude,
        altitude,
        notes,
        imageUrl,
        status: 'PENDING'
      },
      include: {
        species: true,
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            avatarUrl: true
          }
        },
        community: communityId ? {
          select: {
            id: true,
            name: true
          }
        } : false
      }
    });
  } catch (error) {
    return handleDatabaseError(error, 'Error creating observation');
  }
}

export async function getObservationById(id) {
  try {
    return await prisma.observation.findUnique({
      where: { id },
      include: {
        species: true,
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            avatarUrl: true
          }
        },
        community: {
          select: {
            id: true,
            name: true
          }
        },
        verifiedBy: {
          select: {
            id: true,
            username: true,
            name: true
          }
        },
        _count: {
          select: { comments: true }
        }
      }
    });
  } catch (error) {
    return handleDatabaseError(error, 'Error fetching observation');
  }
}

export async function updateObservation(id, data, userId, isAdmin = false) {
  try {
    // Verificar permisos
    const observation = await prisma.observation.findUnique({
      where: { id },
      select: { userId: true, communityId: true }
    });

    if (!observation) {
      throw new Error('Observation not found');
    }

    // Solo el propietario, un admin o un moderador de la comunidad pueden editar
    const isOwner = observation.userId === userId;
    let isCommunityModerator = false;

    if (observation.communityId && !isOwner && !isAdmin) {
      const membership = await prisma.communityMember.findUnique({
        where: {
          userId_communityId: {
            userId,
            communityId: observation.communityId
          },
          role: {
            in: ['ADMIN', 'MODERATOR']
          }
        }
      });
      isCommunityModerator = !!membership;
    }

    if (!isOwner && !isAdmin && !isCommunityModerator) {
      throw new Error('Unauthorized');
    }

    return await prisma.observation.update({
      where: { id },
      data: {
        ...data,
        ...(data.status && {
          status: data.status,
          verifiedById: userId,
          verifiedAt: new Date()
        }),
        updatedAt: new Date()
      },
      include: {
        species: true,
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            avatarUrl: true
          }
        },
        community: {
          select: {
            id: true,
            name: true
          }
        },
        verifiedBy: {
          select: {
            id: true,
            username: true,
            name: true
          }
        }
      }
    });
  } catch (error) {
    return handleDatabaseError(error, 'Error updating observation');
  }
}

export async function deleteObservation(id, userId, isAdmin = false) {
  try {
    // Verificar permisos
    const observation = await prisma.observation.findUnique({
      where: { id },
      select: { userId: true, communityId: true }
    });

    if (!observation) {
      throw new Error('Observation not found');
    }

    // Solo el propietario, un admin o un moderador de la comunidad pueden eliminar
    const isOwner = observation.userId === userId;
    let isCommunityModerator = false;

    if (observation.communityId && !isOwner && !isAdmin) {
      const membership = await prisma.communityMember.findUnique({
        where: {
          userId_communityId: {
            userId,
            communityId: observation.communityId
          },
          role: {
            in: ['ADMIN', 'MODERATOR']
          }
        }
      });
      isCommunityModerator = !!membership;
    }

    if (!isOwner && !isAdmin && !isCommunityModerator) {
      throw new Error('Unauthorized');
    }

    // Eliminar comentarios primero
    await prisma.comment.deleteMany({
      where: { observationId: id }
    });

    // Luego eliminar la observación
    return await prisma.observation.delete({
      where: { id }
    });
  } catch (error) {
    return handleDatabaseError(error, 'Error deleting observation');
  }
}

export async function getObservations({
  page = 1,
  pageSize = 10,
  userId = null,
  communityId = null,
  speciesId = null,
  status = null,
  bbox = null, // [minLng, minLat, maxLng, maxLat]
  orderBy = 'newest'
}) {
  try {
    const where = {};
    
    if (userId) where.userId = userId;
    if (communityId) where.communityId = communityId;
    if (speciesId) where.speciesId = speciesId;
    if (status) where.status = status;
    
    // Filtrar por área geográfica si se proporciona bbox
    if (bbox && bbox.length === 4) {
      const [minLng, minLat, maxLng, maxLat] = bbox;
      where.AND = [
        { latitude: { gte: minLat } },
        { latitude: { lte: maxLat } },
        { longitude: { gte: minLng } },
        { longitude: { lte: maxLng } }
      ];
    }

    // Ordenar
    const orderByClause = {};
    switch (orderBy) {
      case 'newest':
        orderByClause.createdAt = 'desc';
        break;
      case 'oldest':
        orderByClause.createdAt = 'asc';
        break;
      case 'recentlyUpdated':
        orderByClause.updatedAt = 'desc';
        break;
      default:
        orderByClause.createdAt = 'desc';
    }

    const [total, observations] = await Promise.all([
      prisma.observation.count({ where }),
      prisma.observation.findMany({
        where,
        include: {
          species: true,
          user: {
            select: {
              id: true,
              username: true,
              name: true,
              avatarUrl: true
            }
          },
          community: {
            select: {
              id: true,
              name: true
            }
          },
          _count: {
            select: { comments: true }
          }
        },
        orderBy: orderByClause,
        ...paginate(page, pageSize)
      })
    ]);

    return {
      data: observations,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  } catch (error) {
    return handleDatabaseError(error, 'Error fetching observations');
  }
}
