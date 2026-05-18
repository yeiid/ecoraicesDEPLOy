import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Limpiar la base de datos
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.review.deleteMany();
  await prisma.plant.deleteMany();
  await prisma.category.deleteMany();
  await prisma.address.deleteMany();
  await prisma.user.deleteMany();

  // Crear categorías
  const categorias = await Promise.all([
    prisma.category.create({
      data: {
        name: "Plantas de Interior",
        description: "Plantas perfectas para decorar el interior de tu hogar.",
        imageUrl: "/images/categoria-interior.jpg",
      },
    }),
    prisma.category.create({
      data: {
        name: "Plantas de Exterior",
        description: "Plantas resistentes ideales para jardines y terrazas.",
        imageUrl: "/images/categoria-exterior.jpg",
      },
    }),
    prisma.category.create({
      data: {
        name: "Suculentas",
        description:
          "Plantas que almacenan agua en sus hojas, tallos o raíces.",
        imageUrl: "/images/categoria-suculentas.jpg",
      },
    }),
    prisma.category.create({
      data: {
        name: "Cactus",
        description:
          "Plantas adaptadas a climas áridos y con bajo mantenimiento.",
        imageUrl: "/images/categoria-cactus.jpg",
      },
    }),
  ]);

  console.log("Categorías creadas:", categorias.length);

  // Crear plantas
  const plantas = await Promise.all([
    // Plantas de Interior
    prisma.plant.create({
      data: {
        name: "Pothos",
        description:
          "Planta colgante de fácil cuidado con hojas en forma de corazón. Ideal para principiantes.",
        price: 15.99,
        stock: 50,
        imageUrl: "/images/pothos.jpg",
        categoryId: categorias[0].id,
      },
    }),
    prisma.plant.create({
      data: {
        name: "Monstera Deliciosa",
        description:
          "Conocida por sus hojas grandes y perforadas. Una de las plantas de interior más populares.",
        price: 35.99,
        stock: 25,
        imageUrl: "/images/monstera.jpg",
        categoryId: categorias[0].id,
      },
    }),
    prisma.plant.create({
      data: {
        name: "Ficus Lyrata",
        description:
          "Planta de interior con hojas grandes y brillantes en forma de violín.",
        price: 45.99,
        stock: 15,
        imageUrl: "/images/ficus-lyrata.jpg",
        categoryId: categorias[0].id,
      },
    }),

    // Plantas de Exterior
    prisma.plant.create({
      data: {
        name: "Lavanda",
        description:
          "Planta aromática con hermosas flores moradas. Atrae polinizadores y repele insectos.",
        price: 12.99,
        stock: 40,
        imageUrl: "/images/lavanda.jpg",
        categoryId: categorias[1].id,
      },
    }),
    prisma.plant.create({
      data: {
        name: "Rosales",
        description:
          "Planta de exterior con flores hermosas y aromáticas disponibles en varios colores.",
        price: 24.99,
        stock: 30,
        imageUrl: "/images/rosales.jpg",
        categoryId: categorias[1].id,
      },
    }),

    // Suculentas
    prisma.plant.create({
      data: {
        name: "Echeveria",
        description:
          "Suculenta con hojas que forman una roseta. Disponible en varios colores y tamaños.",
        price: 8.99,
        stock: 100,
        imageUrl: "/images/echeveria.jpg",
        categoryId: categorias[2].id,
      },
    }),
    prisma.plant.create({
      data: {
        name: "Aloe Vera",
        description:
          "Suculenta conocida por sus propiedades medicinales. Ideal para interiores con buena luz.",
        price: 12.99,
        stock: 75,
        imageUrl: "/images/aloe-vera.jpg",
        categoryId: categorias[2].id,
      },
    }),

    // Cactus
    prisma.plant.create({
      data: {
        name: "Cactus Erizo",
        description:
          "Cactus pequeño y redondo con espinas doradas. Perfecto para espacios reducidos.",
        price: 9.99,
        stock: 60,
        imageUrl: "/images/cactus-erizo.jpg",
        categoryId: categorias[3].id,
      },
    }),
    prisma.plant.create({
      data: {
        name: "Cactus San Pedro",
        description:
          "Cactus columnar de rápido crecimiento. Ideal para exteriores en climas cálidos.",
        price: 29.99,
        stock: 20,
        imageUrl: "/images/cactus-san-pedro.jpg",
        categoryId: categorias[3].id,
      },
    }),
  ]);

  console.log("Plantas creadas:", plantas.length);

  // Crear usuarios
  const passwordHash = await bcrypt.hash("password123", 10);

  const usuarios = await Promise.all([
    prisma.user.create({
      data: {
        email: "admin@ecoraices.com",
        name: "Administrador",
        passwordHash,
        role: "ADMIN",
      },
    }),
    prisma.user.create({
      data: {
        email: "cliente@ejemplo.com",
        name: "Cliente Ejemplo",
        passwordHash,
        role: "CUSTOMER",
      },
    }),
  ]);

  console.log("Usuarios creados:", usuarios.length);

  // Crear direcciones
  const direcciones = await Promise.all([
    prisma.address.create({
      data: {
        street: "Calle Principal 123",
        city: "Ciudad Ejemplo",
        state: "Estado Ejemplo",
        zipCode: "12345",
        country: "País Ejemplo",
        isDefault: true,
        userId: usuarios[1].id,
      },
    }),
  ]);

  console.log("Direcciones creadas:", direcciones.length);

  // Crear reseñas
  const reseñas = await Promise.all([
    prisma.review.create({
      data: {
        rating: 5,
        comment:
          "Una planta hermosa que ha crecido muy bien en mi sala. Altamente recomendada.",
        userId: usuarios[1].id,
        plantId: plantas[1].id, // Monstera
      },
    }),
    prisma.review.create({
      data: {
        rating: 4,
        comment: "Buena planta, pero necesita más cuidado del que esperaba.",
        userId: usuarios[1].id,
        plantId: plantas[0].id, // Pothos
      },
    }),
  ]);

  console.log("Reseñas creadas:", reseñas.length);

  // Crear carrito para el cliente
  const carrito = await prisma.cart.create({
    data: {
      userId: usuarios[1].id,
      items: {
        create: [
          {
            quantity: 2,
            plantId: plantas[5].id, // Echeveria
          },
          {
            quantity: 1,
            plantId: plantas[3].id, // Lavanda
          },
        ],
      },
    },
  });

  console.log("Carrito creado con items.");

  // Crear una orden para el cliente
  const orden = await prisma.order.create({
    data: {
      userId: usuarios[1].id,
      addressId: direcciones[0].id,
      total: 58.97,
      status: "DELIVERED",
      items: {
        create: [
          {
            quantity: 1,
            price: 35.99,
            plantId: plantas[1].id, // Monstera
          },
          {
            quantity: 2,
            price: 11.49, // Precio histórico diferente
            plantId: plantas[6].id, // Aloe Vera
          },
        ],
      },
    },
  });

  console.log("Orden creada con items.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
