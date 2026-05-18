import { PrismaClient } from '@prisma/client';

// Asegurarse de que solo haya una instancia de Prisma en desarrollo
const globalForPrisma = globalThis;

// Verificar si ya existe una instancia de Prisma en el contexto global
let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    log: ['error'],
  });
} else {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: ['query', 'error', 'warn'],
    });
  }
  prisma = globalForPrisma.prisma;
}

// Helper function to handle database errors
export async function handleDatabaseError(error, defaultMessage = 'Database error') {
  console.error('Database error:', error);
  
  // Handle specific Prisma errors
  if (error.code === 'P2002') {
    const target = error.meta?.target?.[0] || 'field';
    throw new Error(`A record with this ${target} already exists`);
  }
  
  if (error.code === 'P2025') {
    throw new Error('Record not found');
  }
  
  throw new Error(defaultMessage || error.message);
}

// Helper function to paginate results
export function paginate(page = 1, pageSize = 10) {
  const skip = (page - 1) * pageSize;
  const take = pageSize;
  
  return { skip, take };
}

export { prisma };
export default prisma;
