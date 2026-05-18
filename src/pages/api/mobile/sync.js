import { prisma } from '../../../lib/prisma.js';
import { syncObservationToPostGIS } from '../../../lib/postgis.js';
import { createId } from '@paralleldrive/cuid2';
import path from 'path';
import fs from 'fs/promises';

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads', 'observations');

const ensureUploadsDir = async () => {
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating uploads directory:', error);
  }
};

// GET: Retornar todas las observaciones para que la app móvil las descargue (PULL)
export async function GET({ request }) {
  try {
    const observations = await prisma.observation.findMany({
      include: {
        species: {
          include: {
            category: true
          }
        },
        user: {
          select: { id: true, username: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = observations.map(obs => ({
      id: obs.id,
      userId: obs.userId,
      timestamp: obs.observationDate.toISOString(),
      nombreComun: obs.species?.name || 'Desconocido',
      nombreCientifico: obs.species?.scientificName || 'Desconocido',
      categoria: obs.species?.category?.name || 'Planta',
      fotoUrl: obs.imageUrl ? `${obs.imageUrl}` : null,
      latitud: obs.latitude,
      longitud: obs.longitude,
      observaciones: obs.notes || '',
      version: 1,
    }));

    return new Response(JSON.stringify(formatted), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Error fetching mobile sync list:', error);
    return new Response(JSON.stringify({ error: 'Error al sincronizar' }), { 
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }
}

// POST: Recibir una observación desde la app móvil (PUSH) y guardarla en SQLite + PostGIS
export async function POST({ request }) {
  try {
    await ensureUploadsDir();
    
    let id, userId, nombreComun, nombreCientifico, categoria, latitude, longitude, observaciones, imageBase64, imageFile;
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      // Cargar datos vía JSON (Base64)
      const data = await request.json();
      id = data.id || createId();
      userId = data.userId || 'anonymous';
      nombreComun = data.nombreComun || 'Árbol no identificado';
      nombreCientifico = data.nombreCientifico || '';
      categoria = data.categoria || 'Planta';
      latitude = parseFloat(data.latitud);
      longitude = parseFloat(data.longitud);
      observaciones = data.observaciones || '';
      imageBase64 = data.imageBase64;
    } else {
      // Cargar datos vía Form-Data estándar
      const formData = await request.formData();
      id = formData.get('id') || createId();
      userId = formData.get('userId') || 'anonymous';
      nombreComun = formData.get('nombreComun') || 'Árbol no identificado';
      nombreCientifico = formData.get('nombreCientifico') || '';
      categoria = formData.get('categoria') || 'Planta';
      latitude = parseFloat(formData.get('latitud'));
      longitude = parseFloat(formData.get('longitud'));
      observaciones = formData.get('observaciones') || '';
      imageFile = formData.get('image');
    }

    if (isNaN(latitude) || isNaN(longitude)) {
      return new Response(JSON.stringify({ error: 'Coordenadas inválidas' }), { 
        status: 400,
        headers: { 'Access-Control-Allow-Origin': '*' }
      });
    }

    // 1. Resolver o Crear la Especie en SQLite para mantener integridad referencial
    let species = await prisma.species.findFirst({
      where: {
        OR: [
          { name: { contains: nombreComun } },
          { scientificName: { contains: nombreCientifico } }
        ]
      }
    });

    if (!species) {
      let category = await prisma.category.findFirst({
        where: { name: { contains: categoria } }
      });
      if (!category) {
        category = await prisma.category.create({
          data: { 
            name: categoria, 
            description: `Categoría ${categoria} creada dinámicamente desde el móvil.` 
          }
        });
      }

      species = await prisma.species.create({
        data: {
          name: nombreComun,
          scientificName: nombreCientifico || nombreComun,
          description: 'Especie registrada vía aplicación móvil.',
          habitat: 'Urbano / Bosque Seco',
          categoryId: category.id,
        }
      });
    }

    // 2. Guardar la imagen localmente
    let imageUrl = null;
    if (imageBase64) {
      // Decodificar Base64
      const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      let buffer;
      let extension = '.jpg';

      if (matches && matches.length === 3) {
        extension = `.${matches[1].split('/')[1]}`;
        buffer = Buffer.from(matches[2], 'base64');
      } else {
        buffer = Buffer.from(imageBase64, 'base64');
      }

      const fileName = `${createId()}-${Date.now()}${extension}`;
      const filePath = path.join(UPLOADS_DIR, fileName);
      await fs.writeFile(filePath, buffer);
      imageUrl = `/uploads/observations/${fileName}`;
    } else if (imageFile && imageFile instanceof File) {
      // Guardar Form-Data File
      const fileExtension = path.extname(imageFile.name) || '.jpg';
      const fileName = `${createId()}-${Date.now()}${fileExtension}`;
      const filePath = path.join(UPLOADS_DIR, fileName);
      const fileBuffer = Buffer.from(await imageFile.arrayBuffer());
      await fs.writeFile(filePath, fileBuffer);
      imageUrl = `/uploads/observations/${fileName}`;
    }

    // 3. Crear el registro de observación en SQLite
    const observation = await prisma.observation.create({
      data: {
        id,
        speciesId: species.id,
        userId: userId,
        observationDate: new Date(),
        latitude,
        longitude,
        notes: observaciones,
        imageUrl,
        status: 'APPROVED'
      }
    });

    // 4. Sincronizar en tiempo real con la base de datos geoespacial de PostGIS (tabla geo2)
    await syncObservationToPostGIS(observation, species.name);

    return new Response(JSON.stringify({
      success: true,
      message: 'Observación sincronizada correctamente',
      observation
    }), {
      status: 201,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Error in mobile push sync endpoint:', error);
    return new Response(JSON.stringify({ error: 'Error interno en el servidor al sincronizar' }), { 
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }
}
