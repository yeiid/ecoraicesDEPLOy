import { prisma, handleDatabaseError, paginate } from '../prisma.js';

export async function createSpecies({
  name,
  scientificName,
  description = null,
  habitat = null,
  imageUrl = null,
  status = null,
  categoryId
}) {
  try {
    return await prisma.species.create({
      data: {
        name,
        scientificName,
        description,
        habitat,
        imageUrl,
        status,
        category: { connect: { id: categoryId } }
      },
      include: {
        category: true
      }
    });
  } catch (error) {
    return handleDatabaseError(error, 'Error creating species');
  }
}

export async function getSpeciesById(id) {
  try {
    return await prisma.species.findUnique({
      where: { id },
      include: {
        category: true,
        _count: {
          select: { observations: true }
        }
      }
    });
  } catch (error) {
    return handleDatabaseError(error, 'Error fetching species');
  }
}

export async function updateSpecies(id, data) {
  try {
    return await prisma.species.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      },
      include: {
        category: true
      }
    });
  } catch (error) {
    return handleDatabaseError(error, 'Error updating species');
  }
}

export async function deleteSpecies(id) {
  try {
    // Verificar si hay observaciones asociadas
    const observationsCount = await prisma.observation.count({
      where: { speciesId: id }
    });

    if (observationsCount > 0) {
      throw new Error('Cannot delete species with associated observations');
    }

    return await prisma.species.delete({
      where: { id }
    });
  } catch (error) {
    return handleDatabaseError(error, 'Error deleting species');
  }
}

export async function getSpecies({
  page = 1,
  pageSize = 20,
  search = '',
  categoryId = null,
  status = null
}) {
  try {
    const where = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { scientificName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (categoryId) where.categoryId = categoryId;
    if (status) where.status = status;

    const [total, species] = await Promise.all([
      prisma.species.count({ where }),
      prisma.species.findMany({
        where,
        include: {
          category: true,
          _count: {
            select: { observations: true }
          }
        },
        orderBy: {
          name: 'asc'
        },
        ...paginate(page, pageSize)
      })
    ]);

    return {
      data: species,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  } catch (error) {
    return handleDatabaseError(error, 'Error fetching species list');
  }
}

export async function getSpeciesByCategory(categoryId) {
  try {
    return await prisma.species.findMany({
      where: { categoryId },
      orderBy: {
        name: 'asc'
      },
      select: {
        id: true,
        name: true,
        scientificName: true,
        imageUrl: true
      }
    });
  } catch (error) {
    return handleDatabaseError(error, 'Error fetching species by category');
  }
}
