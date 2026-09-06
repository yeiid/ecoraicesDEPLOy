import { getSpecies, createSpecies } from "../../../lib/services/species.service.js";
import { prisma } from "../../../lib/prisma.js";
import { withAuth } from "../../../lib/middleware/auth.js";


export async function GET({ request }) {
  try {
    const url = new URL(request.url);
    const categoryId = url.searchParams.get("categoryId");
    const q = url.searchParams.get("q");
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const pageSize = parseInt(url.searchParams.get("pageSize") || "50", 10);

    // Modo búsqueda/autocompletado: devuelve { data, pagination }
    if (q || url.searchParams.get("page")) {
      const result = await getSpecies({ search: q || "", categoryId, page, pageSize });
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Compatibilidad: sin parámetros devuelve el array completo
    const species = await prisma.species.findMany({
      where: categoryId ? { categoryId } : {},
      include: { category: true },
      orderBy: { name: "asc" },
    });

    return new Response(JSON.stringify(species), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching species:", error);
    return new Response(
      JSON.stringify({ message: "Error al obtener las especies" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// Crea una especie nueva en el catálogo (usada cuando un árbol no está registrado)
export const POST = withAuth(async ({ request }) => {
  try {
    const body = await request.json();
    const name = (body.name || "").trim();
    const scientificName = (body.scientificName || "").trim();

    if (!name || !scientificName) {
      return new Response(
        JSON.stringify({ message: "Se requiere nombre común y nombre científico" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const existing = await prisma.species.findUnique({ where: { scientificName } });
    if (existing) {
      return new Response(JSON.stringify(existing), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    let categoryId = body.categoryId;
    if (!categoryId) {
      const firstCategory = await prisma.category.findFirst({ orderBy: { name: "asc" } });
      categoryId = firstCategory?.id;
    }
    if (!categoryId) {
      return new Response(
        JSON.stringify({ message: "No hay categorías disponibles para asignar la especie" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const species = await createSpecies({ name, scientificName, categoryId });
    return new Response(JSON.stringify(species), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error creating species:", error);
    return new Response(
      JSON.stringify({ message: "Error al crear la especie" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
