import { prisma, handleDatabaseError } from '../prisma.js';

export async function createCategory({ name, description = null, imageUrl = null }) {
  try {
    return await prisma.category.create({
      data: {
        name,
        description,
        imageUrl
      }
    });
  } catch (error) {
    return handleDatabaseError(error, 'Error creating category');
  }
}

export async function getCategoryById(id) {
  try {
    return await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { species: true }
        }
      }
    });
  } catch (error) {
    return handleDatabaseError(error, 'Error fetching category');
  }
}

export async function updateCategory(id, data) {
  try {
    return await prisma.category.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      }
    });
  } catch (error) {
    return handleDatabaseError(error, 'Error updating category');
  }
}

export async function deleteCategory(id) {
  try {
    // Verificar si hay especies asociadas
    const speciesCount = await prisma.species.count({
      where: { categoryId: id }
    });

    if (speciesCount > 0) {
      throw new Error('Cannot delete category with associated species');
    }

    return await prisma.category.delete({
      where: { id }
    });
  } catch (error) {
    return handleDatabaseError(error, 'Error deleting category');
  }
}

export async function getAllCategories() {
  try {
    return await prisma.category.findMany({
      include: {
        _count: {
          select: { species: true }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });
  } catch (error) {
    return handleDatabaseError(error, 'Error fetching categories');
  }
}

export async function getCategoriesWithSpecies() {
  try {
    return await prisma.category.findMany({
      include: {
        species: {
          select: {
            id: true,
            name: true,
            scientificName: true,
            imageUrl: true
          },
          orderBy: {
            name: 'asc'
          }
        },
        _count: {
          select: { species: true }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });
  } catch (error) {
    return handleDatabaseError(error, 'Error fetching categories with species');
  }
}
