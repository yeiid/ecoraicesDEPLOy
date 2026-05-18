import { prisma } from '../prisma.js';
import bcrypt from 'bcryptjs';
import { handleDatabaseError } from '../prisma.js';

const SALT_ROUNDS = 10;

export async function createUser({ username, email, password, name, role = 'COLLECTOR' }) {
  try {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    
    return await prisma.user.create({
      data: {
        username,
        email,
        passwordHash: hashedPassword,
        name,
        role
      },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    });
  } catch (error) {
    return handleDatabaseError(error, 'Error creating user');
  }
}

export async function validateUser(email, password) {
  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return { user: null, error: 'Invalid email or password' };
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!isValid) {
      return { user: null, error: 'Invalid email or password' };
    }

    // Remove sensitive data
    const { passwordHash, ...userWithoutPassword } = user;
    
    return { user: userWithoutPassword, error: null };
  } catch (error) {
    console.error('Error validating user:', error);
    return { user: null, error: 'Error validating credentials' };
  }
}

export async function getUserById(id) {
  try {
    return await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        avatarUrl: true,
        bio: true,
        role: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true
      }
    });
  } catch (error) {
    return handleDatabaseError(error, 'Error fetching user');
  }
}
