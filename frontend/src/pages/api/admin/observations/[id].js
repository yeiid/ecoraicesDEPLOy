import { prisma } from '../../../../lib/prisma.js';
import { withAdmin } from '../../../../lib/middleware/auth.js';
import { postgisPool } from '../../../../lib/postgis.js';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

// Best-effort: elimina el registro 3D de geo2 asociado a la observación
async function deleteFromGeo2(observation) {
  if (!postgisPool) return;
  try {
    await postgisPool.query(
      `DELETE FROM gis.geo2
        WHERE name = $1
          AND ST_DWithin(geom, ST_SetSRID(ST_Point($2, $3), 4326), 0.0005)`,
      [
        observation.species?.name || 'Árbol Registrado',
        parseFloat(observation.longitude),
        parseFloat(observation.latitude),
      ]
    );
  } catch (error) {
    console.error('[Admin] Error al limpiar geo2:', error);
  }
}

// PATCH: Verificar/rechazar una observación (solo super admin)
export const PATCH = withAdmin(async ({ params, request, user }) => {
  try {
    const { id } = params;
    const body = await request.json().catch(() => ({}));
    const { status, verificationNotes } = body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return new Response(JSON.stringify({ message: 'Estado inválido. Usa APPROVED o REJECTED' }), {
        status: 400,
        headers: JSON_HEADERS,
      });
    }

    const observation = await prisma.observation.findUnique({ where: { id } });
    if (!observation) {
      return new Response(JSON.stringify({ message: 'Observación no encontrada' }), {
        status: 404,
        headers: JSON_HEADERS,
      });
    }

    const updated = await prisma.observation.update({
      where: { id },
      data: {
        status,
        verifiedById: user.id,
        verifiedAt: new Date(),
        verificationNotes: verificationNotes ?? null,
        updatedAt: new Date(),
      },
      include: {
        species: { select: { id: true, name: true, scientificName: true } },
        user: { select: { id: true, username: true, name: true } },
        verifiedBy: { select: { id: true, username: true } },
      },
    });

    return new Response(JSON.stringify(updated), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch (error) {
    console.error('Error verificando observación:', error);
    return new Response(JSON.stringify({ message: 'Error al verificar la observación' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
});

// DELETE: Eliminar una observación (solo super admin)
export const DELETE = withAdmin(async ({ params }) => {
  try {
    const { id } = params;
    const observation = await prisma.observation.findUnique({
      where: { id },
      include: { species: { select: { name: true } } },
    });

    if (!observation) {
      return new Response(JSON.stringify({ message: 'Observación no encontrada' }), {
        status: 404,
        headers: JSON_HEADERS,
      });
    }

    await deleteFromGeo2(observation);
    await prisma.comment.deleteMany({ where: { observationId: id } });
    await prisma.observation.delete({ where: { id } });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch (error) {
    console.error('Error eliminando observación:', error);
    return new Response(JSON.stringify({ message: 'Error al eliminar la observación' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
});
