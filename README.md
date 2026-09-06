# 🌿 EcoRaíces - Plataforma de Monitoreo de Especies Nativas

EcoRaíces es una plataforma colaborativa para el monitoreo y conservación de especies nativas, permitiendo a recolectores y comunidades registrar observaciones de flora local, contribuyendo a la investigación y conservación de la biodiversidad.

**🔴 En producción**: https://ecoraices.neuraljira.tech · Desarrollado por **NeuralJIRA** (https://neuraljira.tech)

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
| `pnpm etl:all`    | Sembrar/enriquecer catálogo desde GBIF/iNaturalist |
| `node scripts/load-catalog.mjs` | Cargar catálogo en producción (BD vacía) |

## 📚 Base de Datos

El proyecto utiliza **PostgreSQL + PostGIS** con Prisma ORM (schema `public`). La tabla geográfica `geo2` vive en el schema `gis`, aislada de Prisma, y alimenta el mapa 3D de `map.neuraljira.tech`. El esquema incluye:

- **Usuarios**: Gestión de perfiles y autenticación (JWT + OAuth Google/Facebook)
- **Especies**: Catálogo de especies nativas (61 especies + 326 fotos licenciadas)
- **Comunidades**: Grupos de usuarios por ubicación
- **Observaciones**: Registros de avistamientos con geolocalización y verificación admin
- **Categorías**: Clasificación de especies
- **Fotos**: `SpeciesPhoto` con licencia CC y atribución (fuente: GBIF/iNaturalist/Wikimedia)

## 🔒 Variables de Entorno

Crea un archivo `.env` en la raíz con las siguientes variables:

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/ecoraices"
POSTGIS_URL="postgresql://user:pass@localhost:5432/ecoraices"
JWT_SECRET="un_secreto_largo_aleatorio"
APP_URL="https://ecoraices.neuraljira.tech"
CONTACT_EMAIL="yeifran67@gmail.com"
PLANTNET_API_KEY="tu_key_de_plantnet"   # identificación por foto
# MAIL_HOST / MAIL_PORT / MAIL_USER / MAIL_PASS / MAIL_FROM (SMTP opcional)
# GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET (OAuth opcional)
# FACEBOOK_CLIENT_ID / FACEBOOK_CLIENT_SECRET (OAuth opcional)
```

## 🌐 Despliegue

Producción se despliega en **Dokploy** bajo `https://ecoraices.neuraljira.tech`. Guía paso a paso: [`docs/DEPLOY-DOKPLOY.md`](docs/DEPLOY-DOKPLOY.md).

- Compose de producción: `docker-compose.dokploy.yml` (sin puertos; Traefik + Let's Encrypt automáticos)
- Variables de ejemplo: `.env.dokploy.example`
- El primer arranque aplica migraciones y provisiona PostGIS (`scripts/init-postgis.sql`)
- Para cargar el catálogo en una BD nueva: `node scripts/load-catalog.mjs`

## 🏢 Sobre NeuralJIRA

EcoRaíces es desarrollado por **NeuralJIRA**, una start-up de asesoría y desarrollo de software a medida con base en Colombia.

| | |
|---|---|
| **Sitio web** | https://neuraljira.tech |
| **Dominio e infraestructura** | `neuraljira.tech` (web) · `map.neuraljira.tech` (API de mapas 3D) · `ecoraices.neuraljira.tech` (EcoRaíces) |
| **Servicios** | Asesoría estratégica tecnológica · Desarrollo de software a medida (MVP → plataformas) |
| **Email** | yeifran67@gmail.com |
| **WhatsApp** | https://wa.me/573058079573 |
| **LinkedIn** | https://www.linkedin.com/in/yeifran-hernandez-751665203/ |
| **GitHub** | https://github.com/yeiid |
| **X** | https://x.com/YeifranH |

EcoRaíces integra la **infraestructura NeuralJIRA**: el mapa 3D de ciudades y la capa de árboles (`geo2`) se sirven desde `map.neuraljira.tech`, y el catálogo se enriquece con GBIF/iNaturalist/Wikimedia. Marketing y contenido para redes: [`docs/MARKETING-REDES.md`](docs/MARKETING-REDES.md).

## 🤝 Contribución

Las contribuciones son bienvenidas. Por favor, lee nuestras pautas de contribución antes de enviar pull requests.

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.
