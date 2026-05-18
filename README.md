# 🌿 EcoRaíces - Plataforma de Monitoreo de Especies Nativas

EcoRaíces es una plataforma colaborativa para el monitoreo y conservación de especies nativas, permitiendo a recolectores y comunidades registrar observaciones de flora local, contribuyendo a la investigación y conservación de la biodiversidad.

## 🎯 Características Principales

### 👥 Gestión de Usuarios
- Registro y autenticación de usuarios
- Perfiles personalizables
- Roles de usuario (Recolector, Comunidad, Administrador)
- Gestión de miembros en comunidades

### 🌍 Georeferenciación
- Registro de ubicación de observaciones
- Mapas interactivos
- Filtrado por ubicación geográfica
- Visualización de áreas de interés

### 👥 Gestión de Comunidades
- Creación y administración de comunidades
- Roles de miembros (Administrador, Moderador, Miembro)
- Espacios colaborativos por ubicación
- Estadísticas de contribuciones por comunidad

### 📝 Registro de Observaciones
- Catálogo de especies nativas
- Fotos y detalles de avistamientos
- Estado de conservación según la UICN
- Sistema de verificación de observaciones

## 🏗️ Estructura del Proyecto

```
/
├── prisma/           # Esquema de base de datos y migraciones
├── public/           # Archivos estáticos
└── src/
    ├── assets/       # Recursos estáticos
    ├── components/   # Componentes reutilizables
    ├── layouts/      # Plantillas de diseño
    ├── lib/          # Utilidades y configuraciones
    ├── pages/        # Rutas de la aplicación
    ├── scripts/      # Scripts de utilidad
    ├── styles/       # Estilos globales
    └── utils/        # Funciones de utilidad
```

## 🚀 Comandos Principales

| Comando            | Descripción                                      |
|-------------------|--------------------------------------------------|
| `pnpm install`    | Instalar dependencias                           |
| `pnpm dev`        | Iniciar servidor de desarrollo                  |
| `pnpm build`      | Construir para producción                      |
| `pnpm preview`    | Vista previa de la versión de producción       |
| `pnpm prisma`     | Comandos de Prisma ORM                          |

## 📚 Base de Datos

El proyecto utiliza SQLite con Prisma ORM. El esquema incluye:

- **Usuarios**: Gestión de perfiles y autenticación
- **Especies**: Catálogo de especies nativas
- **Comunidades**: Grupos de usuarios por ubicación
- **Observaciones**: Registros de avistamientos
- **Categorías**: Clasificación de especies

## 🔒 Variables de Entorno

Crea un archivo `.env` en la raíz con las siguientes variables:

```env
DATABASE_URL="file:./dev.db"
# Otras variables de entorno necesarias
```

## 🌐 Despliegue

1. Configura las variables de entorno de producción
2. Ejecuta `pnpm build`
3. Despliega la carpeta `dist` generada

## 🤝 Contribución

Las contribuciones son bienvenidas. Por favor, lee nuestras pautas de contribución antes de enviar pull requests.

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.
