import { prisma } from "../../../lib/prisma.js";

export async function GET({ params }) {
  try {
    const { id } = params;

    const species = await prisma.species.findUnique({
      where: { id },
      include: {
        category: true,
        photos: {
          orderBy: { rank: "asc" },
          take: 12,
        },
        _count: {
          select: { observations: true },
        },
      },
    });

    if (!species) {
      return new Response(JSON.stringify({ message: "Especie no encontrada" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(species), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching species detail:", error);
    return new Response(
      JSON.stringify({ message: "Error al obtener la especie" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
