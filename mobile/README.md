# EcoRaíces Campo (App Móvil Nativa)

Aplicación móvil nativa en **React Native + Expo SDK 58** diseñada específicamente para trabajo de campo prolongado (hasta 7+ días sin conexión) en el departamento de La Guajira, Colombia.

---

## 🌵 Características Principales

1. **100% Offline-First sin riesgo de pérdida de datos**:
   - Base de datos relacional interna con **SQLite** (`expo-sqlite`) en modo **WAL (Write-Ahead Logging)**.
   - Las fotos capturadas se guardan de forma permanente en el almacenamiento privado del sistema de archivos (`expo-file-system`), sin depender de la caché volátil del navegador (evita borrado automático por el SO).
2. **GPS GNSS Satelital Real**:
   - Georreferenciación directa con `expo-location` (alta precisión satelital sin necesidad de torres celulares ni WiFi).
   - Medición de precisión en metros (accuracy), latitud, longitud y altitud.
3. **Catálogo Nativo de Especies de La Guajira**:
   - Accesos rápidos con un toque para: *Trupillo*, *Melocactus curvispinus*, *Neem*, *Dividivi*, *Guayacán de la costa*, *Palo Santo*, *Puy*, etc.
   - Registro de estado de salud (*Sano*, *Enfermo*, *Dañado*, *Seco*), altura y diámetro estimado.
4. **Cola de Sincronización Segura (Outbox Worker)**:
   - Identificadores universales (`clientId` tipo UUIDv4) para garantizar idempotencia en la API de FastAPI.
   - Si la señal se corta en carretera o zona rural durante la subida, la app no duplica registros ni descarta fotos; retoma donde quedó al recuperar cobertura.
   - Sincronización por lotes con barra de progreso.
5. **Configuración Dinámica de Servidor y Territorio**:
   - Permite ajustar la URL del backend (`https://ecoraices.neuraljira.tech`), el token JWT del recolector y el municipio base (Riohacha, Uribia, Manaure, Maicao, etc.).

---

## 🚀 Inicio Rápido (Desarrollo)

### 1. Requisitos previos
- Node.js >= 18
- Teléfono Android o emulador con la app **Expo Go** instalada (o build de desarrollo).

### 2. Ejecutar la app
```bash
cd mobile
npm install
npm run start
```
Escanea el código QR desde la app **Expo Go** en tu dispositivo Android.

---

## 📦 Generar APK Instalable para Validación en Campo

Para generar un archivo `.apk` autónomo (que se pueda compartir por WhatsApp/Drive e instalar en cualquier teléfono Android sin necesidad de Expo Go):

### Opción A: Construcción en la nube con EAS Build (Recomendada)
```bash
# 1. Instalar la CLI de EAS si no la tienes
npm install -g eas-cli

# 2. Iniciar sesión en tu cuenta de Expo
npx eas login

# 3. Compilar APK Preview
npx eas build -p android --profile preview
```
Al finalizar (5-10 minutos), EAS te entregará un enlace directo de descarga del archivo `.apk`.

### Opción B: Prebuild y compilación local con Android Studio
```bash
npx expo run:android --variant release
```

---

## 📁 Estructura del Proyecto

```
mobile/
├── App.js                   # Interfaz principal con pestañas (Captura, Cola Outbox, Catálogo, Ajustes)
├── app.json                 # Configuración de permisos nativos (CAMERA, GPS), package name e iconos
├── eas.json                 # Perfiles de build (preview APK y production AAB)
├── src/
│   ├── constants/
│   │   └── guajira.js       # Especies nativas, municipios y estados de salud
│   └── services/
│       ├── db.js            # SQLite local, esquema outbox, índices y consultas
│       ├── storage.js       # Guardado persistente de fotografías en FileSystem
│       └── sync.js          # Worker de sincronización multipart con FastAPI
```
