import jwt from 'jsonwebtoken';
import { prisma } from '../../../lib/prisma.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-only';
const TOKEN_NAME = 'ecoraices_token';

export async function GET({ cookies }) {
  try {
    const token = cookies.get(TOKEN_NAME)?.value;

    if (!token) {
      return new Response(JSON.stringify({ user: null }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    // Verificar el token JWT
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Obtener el usuario de la base de datos
    const user = await prisma.user.findUnique({
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

    if (!user) {
      return new Response(JSON.stringify({ user: null }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    return new Response(JSON.stringify({ user }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error getting session:", error);
    return new Response(
      JSON.stringify({ message: "Error al obtener la sesión", user: null }),
      {
        status: 200, // Retornar 200 con user: null es más amigable para el cliente
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}
