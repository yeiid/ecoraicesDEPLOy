import { prisma } from '../../../lib/prisma.js';
import { createId } from '@paralleldrive/cuid2';
import path from 'path';
import fs from 'fs/promises';
import { syncObservationToPostGIS } from '../../../lib/postgis.js';

// Directorio para guardar imágenes
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads', 'observations');

// Crear directorio de uploads si no existe
const ensureUploadsDir = async () => {
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating uploads directory:', error);
  }
};

export async function GET({ request }) {
  try {
    // Obtener parámetros de consulta
    const url = new URL(request.url);
    const categoryId = url.searchParams.get('categoryId');
    const verified = url.searchParams.get('verified') === 'true';
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');
    
    // Construir condiciones de filtrado
    const where = {};
    
    // Filtro por categoría (a través de la relación con species)
    if (categoryId) {
      where.species = {
        categoryId
      };
    }
    
    // Filtro por verificación
    if (verified) {
      where.status = 'APPROVED';
    }
    
    // Filtros de fecha
    if (dateFrom || dateTo) {
      where.observationDate = {};
      
      if (dateFrom) {
        where.observationDate.gte = new Date(dateFrom);
      }
      
      if (dateTo) {
        // Ajustar la fecha final al final del día
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        where.observationDate.lte = endDate;
      }
    }
    
    // Obtener las observaciones con información relacionada
    const observations = await prisma.observation.findMany({
      where,
      include: {
        species: {
          include: {
            category: true
          }
        },
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Mapear para compatibilidad con la UI de React/Leaflet
    const formattedObservations = observations.map(obs => ({
      ...obs,
      verified: obs.status === 'APPROVED',
      isVerified: obs.status === 'APPROVED'
    }));

    return new Response(JSON.stringify(formattedObservations), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error fetching observations:', error);
    return new Response(JSON.stringify({ message: 'Error al obtener las observaciones' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

export async function POST({ request }) {
  try {
    // Asegurar que el directorio de uploads existe
    await ensureUploadsDir();
    
    // Manejar form-data con archivo de imagen
    const formData = await request.formData();
    
    // Extraer datos del formulario
    const speciesId = formData.get('speciesId');
    const userId = formData.get('userId');
    const observationDate = formData.get('observationDate');
    const latitude = parseFloat(formData.get('latitude'));
    const longitude = parseFloat(formData.get('longitude'));
    const altitude = formData.get('altitude') ? parseFloat(formData.get('altitude')) : null;
    const notes = formData.get('notes') || null;
    const imageFile = formData.get('image');
    
    // Validar datos requeridos
    if (!speciesId || !userId || !observationDate || !latitude || !longitude) {
      return new Response(JSON.stringify({ 
        message: 'Faltan datos requeridos para la observación' 
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Procesar la imagen si existe
    let imageUrl = null;
    if (imageFile && imageFile instanceof File) {
      // Crear un nombre único para el archivo
      const fileExtension = path.extname(imageFile.name);
      const fileName = `${createId()}-${Date.now()}${fileExtension}`;
      const filePath = path.join(UPLOADS_DIR, fileName);
      
      // Leer el contenido del archivo
      const fileBuffer = Buffer.from(await imageFile.arrayBuffer());
      
      // Guardar el archivo
      await fs.writeFile(filePath, fileBuffer);
      
      // URL pública del archivo
      imageUrl = `/uploads/observations/${fileName}`;
    }
    
    // Crear la observación en la base de datos con status PENDING por defecto
    const observation = await prisma.observation.create({
      data: {
        speciesId,
        userId,
        observationDate: new Date(observationDate),
        latitude,
        longitude,
        altitude,
        notes,
        imageUrl,
        status: 'PENDING'
      }
    });

    try {
      // Obtener el nombre de la especie
      const species = await prisma.species.findUnique({
        where: { id: speciesId }
      });
      // Sincronizar con el motor de mapas PostGIS (tabla geo2)
      await syncObservationToPostGIS(observation, species?.name || species?.commonName);
    } catch (syncError) {
      console.error('Error during PostGIS sync:', syncError);
    }
    
    return new Response(JSON.stringify(observation), {
      status: 201,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error creating observation:', error);
    return new Response(JSON.stringify({ 
      message: 'Error al crear la observación' 
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
} 