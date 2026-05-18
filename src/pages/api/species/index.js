import { prisma } from "../../../lib/prisma.js";


export async function GET({ request }) {
  try {
    // Obtener parámetros de consulta para posibles filtros
    const url = new URL(request.url);
    const categoryId = url.searchParams.get("categoryId");

    // Construir condiciones de búsqueda
    const where = {};
    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Obtener especies
    const species = await prisma.species.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return new Response(JSON.stringify(species), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error fetching species:", error);
    return new Response(
      JSON.stringify({ message: "Error al obtener las especies" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}
