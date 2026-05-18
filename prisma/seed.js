import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando la limpieza de la base de datos...');
  
  // Limpieza en orden inverso de dependencias
  await prisma.comment.deleteMany();
  await prisma.observation.deleteMany();
  await prisma.communityMember.deleteMany();
  await prisma.community.deleteMany();
  await prisma.species.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  
  console.log('Limpieza completada.');

  console.log('Creando usuarios...');
  const passwordHash = await bcrypt.hash('password123', 10);
  
  const adminUser = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@ecoraices.com',
      passwordHash,
      name: 'Admin EcoRaíces',
      avatarUrl: '/images/avatars/admin.png',
      bio: 'Administrador de la plataforma e ingeniero forestal.',
      role: 'COMMUNITY',
      isAdmin: true
    }
  });

  const collector1 = await prisma.user.create({
    data: {
      username: 'luis_guajiro',
      email: 'luis@ecoraices.com',
      passwordHash,
      name: 'Luis Bolaño',
      avatarUrl: '/images/avatars/user1.png',
      bio: 'Estudiante de biología apasionado por la flora de La Guajira.',
      role: 'COLLECTOR',
      isAdmin: false
    }
  });

  const collector2 = await prisma.user.create({
    data: {
      username: 'maria_verde',
      email: 'maria@ecoraices.com',
      passwordHash,
      name: 'María Gámez',
      avatarUrl: '/images/avatars/user2.png',
      bio: 'Líder comunitaria y defensora del medio ambiente en Riohacha.',
      role: 'COLLECTOR',
      isAdmin: false
    }
  });

  console.log('Usuarios creados correctamente.');

  console.log('Creando categorías de especies...');
  const catMaderables = await prisma.category.create({
    data: {
      name: 'Árboles Maderables',
      description: 'Especies leñosas de gran valor ecológico e industrial, cruciales para los bosques secos de la región.',
      imageUrl: '/images/categories/maderables.jpg'
    }
  });

  const catFrutales = await prisma.category.create({
    data: {
      name: 'Árboles Frutales y Silvestres',
      description: 'Árboles que proveen alimento y sustento para la fauna local y las comunidades humanas de La Guajira.',
      imageUrl: '/images/categories/frutales.jpg'
    }
  });

  const catOrnamentales = await prisma.category.create({
    data: {
      name: 'Árboles Ornamentales y Medicinales',
      description: 'Especies famosas por sus floraciones vibrantes o por sus tradicionales propiedades curativas medicinales.',
      imageUrl: '/images/categories/ornamentales.jpg'
    }
  });

  console.log('Categorías creadas correctamente.');

  console.log('Creando especies nativas...');
  const spCeiba = await prisma.species.create({
    data: {
      name: 'Ceiba Bonga',
      scientificName: 'Ceiba pentandra',
      description: 'Árbol gigante majestuoso de los bosques secos. Tiene un tronco robusto cubierto de espinas cónicas en su juventud y contrafuertes enormes en la base.',
      habitat: 'Bosque seco tropical y zonas riparias.',
      status: 'Preocupación menor (LC)',
      imageUrl: '/images/species/ceiba.jpg',
      categoryId: catMaderables.id
    }
  });

  const spGuayacan = await prisma.species.create({
    data: {
      name: 'Guayacán de Manzanilla',
      scientificName: 'Bulnesia arborea',
      description: 'Árbol de madera extremadamente densa y pesada. Sus flores amarillas brillantes contrastan de manera espectacular con su follaje verde oscuro.',
      habitat: 'Bosques muy secos y espinosos de tierras bajas.',
      status: 'En peligro (EN)',
      imageUrl: '/images/species/guayacan.jpg',
      categoryId: catMaderables.id
    }
  });

  const spCuji = await prisma.species.create({
    data: {
      name: 'Cují Yaque',
      scientificName: 'Prosopis juliflora',
      description: 'El árbol emblemático de las zonas semiáridas de La Guajira. Es extremadamente resistente a la sequía y proporciona sombra y forraje esencial.',
      habitat: 'Matorral espinoso, dunas y sabanas secas.',
      status: 'Preocupación menor (LC)',
      imageUrl: '/images/species/cuji.jpg',
      categoryId: catFrutales.id
    }
  });

  const spCaracoli = await prisma.species.create({
    data: {
      name: 'Caracolí',
      scientificName: 'Anacardium excelsum',
      description: 'Gran árbol que crece cerca de fuentes de agua permanente. Su copa ancha provee una sombra fresca y refugio a múltiples especies de aves.',
      habitat: 'Zonas riparias, márgenes de ríos y arroyos.',
      status: 'Preocupación menor (LC)',
      imageUrl: '/images/species/caracoli.jpg',
      categoryId: catMaderables.id
    }
  });

  const spPaloBrasil = await prisma.species.create({
    data: {
      name: 'Palo de Brasil',
      scientificName: 'Haematoxylum brasiletto',
      description: 'Arbusto o árbol pequeño de madera rojiza utilizado tradicionalmente para la obtención de tintes naturales y en medicina popular tradicional.',
      habitat: 'Matorral espinoso guajiro y bosque seco.',
      status: 'Vulnerable (VU)',
      imageUrl: '/images/species/palobrasil.jpg',
      categoryId: catOrnamentales.id
    }
  });

  console.log('Especies creadas correctamente.');

  console.log('Creando comunidades...');
  const comRiohacha = await prisma.community.create({
    data: {
      name: 'Guardabosques del Río Ranchería',
      description: 'Comunidad dedicada a proteger y reforestar la cuenca baja del Río Ranchería en Riohacha.',
      location: 'Riohacha, La Guajira',
      latitude: 11.543,
      longitude: -72.906,
      imageUrl: '/images/communities/rancheria.jpg',
      ownerId: adminUser.id
    }
  });

  const comUribia = await prisma.community.create({
    data: {
      name: 'Defensores del Bosque Seco Wayuu',
      description: 'Grupo de jóvenes y líderes wayuu enfocados en la preservación de especies ancestrales como el Cují y el Dividivi en la alta Guajira.',
      location: 'Uribia, La Guajira',
      latitude: 11.714,
      longitude: -72.264,
      imageUrl: '/images/communities/uribia.jpg',
      ownerId: collector1.id
    }
  });

  // Agregar miembros a las comunidades
  await prisma.communityMember.createMany({
    data: [
      { userId: adminUser.id, communityId: comRiohacha.id, role: 'ADMIN' },
      { userId: collector1.id, communityId: comRiohacha.id, role: 'MEMBER' },
      { userId: collector2.id, communityId: comRiohacha.id, role: 'MODERATOR' },
      
      { userId: collector1.id, communityId: comUribia.id, role: 'ADMIN' },
      { userId: collector2.id, communityId: comUribia.id, role: 'MEMBER' },
      { userId: adminUser.id, communityId: comUribia.id, role: 'MODERATOR' }
    ]
  });

  console.log('Comunidades y miembros creados correctamente.');

  console.log('Creando observaciones (Árboles Mapeados)...');
  
  // Observaciones en Riohacha (Parque Nicolás de Federmán y alrededores)
  const obs1 = await prisma.observation.create({
    data: {
      speciesId: spGuayacan.id,
      userId: collector2.id,
      communityId: comRiohacha.id,
      observationDate: new Date('2026-04-10'),
      latitude: 11.548450,
      longitude: -72.909870,
      altitude: 4.0,
      notes: 'Ejemplar adulto de Guayacán en excelente estado. Altura aprox 12 metros, florecido con flores amarillas intensas.',
      imageUrl: '/images/observations/obs_guayacan.jpg',
      status: 'APPROVED',
      verifiedById: adminUser.id,
      verifiedAt: new Date('2026-04-12'),
      verificationNotes: 'Registro verificado en campo. Árbol en excelente estado fitosanitario.'
    }
  });

  const obs2 = await prisma.observation.create({
    data: {
      speciesId: spCuji.id,
      userId: collector1.id,
      communityId: comRiohacha.id,
      observationDate: new Date('2026-05-01'),
      latitude: 11.542120,
      longitude: -72.902340,
      altitude: 5.5,
      notes: 'Cují de gran tamaño cerca de la vía urbana. Ofrece una amplia sombra para transeúntes.',
      imageUrl: '/images/observations/obs_cuji.jpg',
      status: 'APPROVED',
      verifiedById: adminUser.id,
      verifiedAt: new Date('2026-05-03'),
      verificationNotes: 'Verificación fotográfica exitosa.'
    }
  });

  // Observación en Uribia
  const obs3 = await prisma.observation.create({
    data: {
      speciesId: spCeiba.id,
      userId: collector1.id,
      communityId: comUribia.id,
      observationDate: new Date('2026-05-15'),
      latitude: 11.715670,
      longitude: -72.267890,
      altitude: 12.0,
      notes: 'Ceiba Bonga monumental registrada en las afueras del casco urbano de Uribia. Un hito natural importante.',
      imageUrl: '/images/observations/obs_ceiba.jpg',
      status: 'PENDING'
    }
  });

  // Observación de Palo de Brasil en matorral seco
  const obs4 = await prisma.observation.create({
    data: {
      speciesId: spPaloBrasil.id,
      userId: collector2.id,
      observationDate: new Date('2026-05-16'),
      latitude: 11.531230,
      longitude: -72.915430,
      altitude: 8.0,
      notes: 'Palo de Brasil florecido en el matorral seco periférico de Riohacha. Se observan vainas de semillas formándose.',
      imageUrl: '/images/observations/obs_palobrasil.jpg',
      status: 'APPROVED',
      verifiedById: adminUser.id,
      verifiedAt: new Date('2026-05-17')
    }
  });

  console.log('Observaciones creadas correctamente.');

  console.log('Creando comentarios...');
  await prisma.comment.createMany({
    data: [
      {
        observationId: obs1.id,
        userId: adminUser.id,
        content: 'Este es uno de los guayacanes más antiguos y hermosos de esta zona urbana de Riohacha. ¡Excelente registro!'
      },
      {
        observationId: obs1.id,
        userId: collector1.id,
        content: 'Totalmente de acuerdo, la floración de este árbol es espectacular cada año en esta época.'
      },
      {
        observationId: obs3.id,
        userId: adminUser.id,
        content: 'Sorprendente encontrar una Ceiba Bonga tan al norte en Uribia. Programaremos una visita de campo para estudiar sus dimensiones.'
      }
    ]
  });

  console.log('Comentarios creados correctamente.');
  console.log('¡La base de datos ha sido sembrada con éxito!');
}

main()
  .catch((e) => {
    console.error('Error durante la siembra de la base de datos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
