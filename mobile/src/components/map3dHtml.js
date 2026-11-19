/**
 * EcoRaíces Mobile · Motor Cartográfico WebGL 3D — Catastro Arbóreo Nativo (fill-extrusion)
 * Los árboles se renderizan directamente en WebGL como estructuras 3D métricas (tronco + copa
 * escalonada + huella catastral en suelo), al igual que los edificios 3D del catastro, eliminando
 * superposiciones DOM y permitiendo registro directo tocando el mapa.
 */

export const MAP_3D_HTML = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>EcoRaíces Catastro Arbóreo 3D</title>
  <link rel="stylesheet" href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" />
  <script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
  <style>
    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    html, body, #map {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    /* Puck GPS de Usuario (único marcador GPS con etiqueta dinámica y radar pulsante) */
    .user-gps-marker {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      z-index: 40;
    }
    .user-gps-label {
      background: #065f46;
      color: #ffffff;
      font-weight: 900;
      font-size: 9.5px;
      padding: 2.5px 8px;
      border-radius: 999px;
      border: 1.5px solid #ffffff;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      margin-bottom: 3px;
      white-space: nowrap;
      letter-spacing: 0.2px;
      max-width: 180px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .user-gps-puck-wrap {
      position: relative;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .user-gps-pulse-ring {
      position: absolute;
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: rgba(16, 185, 129, 0.42);
      animation: gps-radar 2.2s infinite cubic-bezier(0.2, 0.8, 0.4, 1);
    }
    .user-gps-inner-dot {
      width: 15px;
      height: 15px;
      border-radius: 50%;
      background: #10b981;
      border: 2.5px solid #ffffff;
      box-shadow: 0 0 10px rgba(16, 185, 129, 0.9);
      z-index: 2;
    }
    @keyframes gps-radar {
      0% { transform: scale(0.5); opacity: 1; }
      100% { transform: scale(2.4); opacity: 0; }
    }

    /* Avatar de Persona al pie del árbol en Modo Persona */
    .person-explorer-marker {
      display: flex;
      flex-direction: column;
      align-items: center;
      pointer-events: none;
      z-index: 50;
    }
    .person-explorer-badge {
      background: rgba(6, 78, 59, 0.95);
      color: #6ee7b7;
      border: 1.5px solid #34d399;
      padding: 3px 9px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 800;
      white-space: nowrap;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      margin-bottom: 4px;
    }
    .person-explorer-circle {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(16, 185, 129, 0.5) 0%, rgba(5, 150, 105, 0.18) 70%);
      border: 2.5px solid #34d399;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      box-shadow: 0 0 18px rgba(16, 185, 129, 0.75);
      animation: person-pulse 2s infinite ease-in-out;
    }
    @keyframes person-pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.08); }
    }

    /* Popup Catastral Botánico de EcoRaíces */
    .maplibregl-popup-content {
      background: #ffffff !important;
      color: #0f172a !important;
      border-radius: 16px !important;
      padding: 0 !important;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.24) !important;
      border: 1px solid #e2e8f0 !important;
      overflow: hidden;
      max-width: 295px !important;
      font-size: 12px;
      line-height: 1.4;
    }
    .maplibregl-popup-close-button {
      color: #64748b;
      font-size: 18px;
      padding: 6px 10px;
      right: 2px;
      top: 2px;
      z-index: 10;
    }
    .popup-tree-card {
      padding: 13px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      background: #ffffff;
    }
    .popup-tree-card.is-invasive { border-top: 4px solid #ef4444; }
    .popup-tree-card.is-native { border-top: 4px solid #10b981; }
    .popup-thumb-img {
      width: 100%;
      height: 92px;
      object-fit: cover;
      border-radius: 8px;
    }
    .popup-card-header {
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }
    .popup-header-icon {
      font-size: 22px;
      line-height: 1;
    }
    .popup-title {
      font-size: 14px;
      font-weight: 800;
      margin: 0;
      color: #0f172a;
    }
    .popup-sub {
      font-size: 11px;
      font-style: italic;
      color: #64748b;
      margin: 1px 0 3px 0;
    }
    .popup-badge-row {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      align-items: center;
    }
    .popup-badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
    }
    .badge-invasive { background: #fee2e2; color: #b91c1c; }
    .badge-native { background: #d1fae5; color: #065f46; }
    .badge-cadastre { background: #eff6ff; color: #1d4ed8; }
    .cadastre-metrics-row {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px;
    }
    .cadastre-metric-pill {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 5px 8px;
      font-size: 10px;
      color: #334155;
      font-weight: 700;
    }
    .allelopathy-box {
      background: #fff1f2;
      border: 1px solid #fecdd3;
      border-radius: 8px;
      padding: 7px 9px;
      font-size: 10.5px;
      color: #9f1239;
    }
    .native-value-box {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: 8px;
      padding: 7px 9px;
      font-size: 10.5px;
      color: #065f46;
    }
    .popup-meta {
      font-size: 10px;
      color: #64748b;
      display: flex;
      justify-content: space-between;
      border-top: 1px solid #f1f5f9;
      padding-top: 6px;
      gap: 6px;
    }
    .popup-btn-person {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: 100%;
      padding: 9px 10px;
      background: #059669;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(5, 150, 105, 0.35);
      transition: background 0.15s ease, transform 0.1s ease;
    }
    .popup-btn-person:hover,
    .popup-btn-person:active {
      background: #047857;
      transform: scale(0.98);
    }

    .person-mode-hud {
      position: absolute;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(6, 78, 59, 0.94);
      color: #6ee7b7;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 10.5px;
      font-weight: 800;
      display: none;
      align-items: center;
      gap: 6px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.35);
      z-index: 100;
      border: 1px solid rgba(52, 211, 153, 0.45);
      pointer-events: none;
      letter-spacing: 0.3px;
      white-space: nowrap;
      max-width: 90%;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .person-mode-hud.active {
      display: flex;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="person-hud" class="person-mode-hud">
    <span>🚶‍♂️ MODO PERSONA 3D • CATASTRO ARBÓREO</span>
  </div>

  <script>
    let map = null;
    let mapReady = false;
    let styleReady = false;
    let activePopup = null;
    let userMarker = null;
    let userMarkerLabelEl = null;
    let personAvatarMarker = null;
    let personAvatarBadgeEl = null;
    let lastUserCoords = null;
    let is3D = true;
    let isPersonMode = false;
    let isPickMode = false;
    let personTargetCoords = null;
    let personTargetId = null;
    let selectedTreeId = null;
    let currentTrees = [];
    let treesById = {};
    let draftTreeData = null;
    let currentTheme = 'eco-day';
    let hasDoneInitialFraming = false;
    let lastProcessedMsgId = null;
    let pendingCommands = [];

    const INTERACTIVE_TREE_LAYERS = [
      'ecoraices-trees-3d-layer',
      'ecoraices-trees-overview-dot',
      'ecoraices-trees-footprint-fill',
      'ecoraices-trees-labels'
    ];

    function postToHost(msg) {
      const str = typeof msg === 'string' ? msg : JSON.stringify(msg);
      if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
        window.ReactNativeWebView.postMessage(str);
      } else if (window.parent && window.parent !== window && typeof window.parent.postMessage === 'function') {
        window.parent.postMessage(str, '*');
      }
    }

    function haversineMeters(lat1, lng1, lat2, lng2) {
      const R = 6371e3;
      const p1 = (lat1 * Math.PI) / 180;
      const p2 = (lat2 * Math.PI) / 180;
      const dp = ((lat2 - lat1) * Math.PI) / 180;
      const dl = ((lng2 - lng1) * Math.PI) / 180;
      const a = Math.sin(dp / 2) * Math.sin(dp / 2) +
        Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
      return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    /**
     * Genera un anillo GeoJSON circular/poligonal en metros reales sobre la superficie terrestre.
     * Misma precisión métrica que los polígonos del catastro 3D (u_construccion / r_construccion).
     */
    function createCircleRing(lng, lat, radiusMeters, sides = 14, offsetLngM = 0, offsetLatM = 0) {
      const latRad = (lat * Math.PI) / 180;
      const mPerDegLat = 111320;
      const mPerDegLng = 111320 * Math.max(0.1, Math.cos(latRad));
      const cLng = lng + offsetLngM / mPerDegLng;
      const cLat = lat + offsetLatM / mPerDegLat;
      const ring = [];
      for (let i = 0; i <= sides; i++) {
        const angle = (i / sides) * Math.PI * 2;
        const dx = Math.cos(angle) * radiusMeters;
        const dy = Math.sin(angle) * radiusMeters;
        ring.push([cLng + dx / mPerDegLng, cLat + dy / mPerDegLat]);
      }
      return ring;
    }

    function resolveTreeHeightMeters(item, defaultHeight) {
      const explicit = parseFloat(item.heightMeters ?? item.treeHeight);
      if (!isNaN(explicit) && explicit >= 2 && explicit <= 45) return explicit;

      const notes = String(item.notes || '');
      const m = notes.match(/Altura:\s*(\d+(?:\.\d+)?)\s*m/i);
      if (m) {
        const parsed = parseFloat(m[1]);
        if (!isNaN(parsed) && parsed >= 2 && parsed <= 45) return parsed;
      }

      const alt = parseFloat(item.altitude);
      if (!isNaN(alt) && alt >= 2 && alt <= 45) return alt;

      return defaultHeight;
    }

    function getSpeciesProfile(item) {
      const name = (
        (item.species_name || item.speciesName || item.name || '') + ' ' +
        (item.scientific_name || item.scientificName || '') + ' ' +
        (item.species?.name || '')
      ).toLowerCase();

      if (name.includes('neem') || name.includes('nim') || name.includes('azadirachta')) {
        return {
          type: 'neem',
          displayName: item.species_name || item.speciesName || item.name || 'Neem Guajiro',
          scientific: 'Azadirachta indica',
          isInvasive: true,
          badgeClass: 'badge-invasive',
          badgeText: 'Invasor • Alelopatía',
          icon: '🚨',
          defaultHeight: 12.5,
          canopyRatio: 0.44,
          dotColor: '#dc2626',
          trunkColor: '#5c2d16',
          colorBase: '#991b1b',
          colorMid: '#dc2626',
          colorTop: '#ef4444',
          footprintFill: 'rgba(239, 68, 68, 0.24)',
          footprintStroke: '#ef4444',
          windShiftM: 0
        };
      }

      if (name.includes('trupillo') || name.includes('prosopis') || name.includes('mezquite')) {
        return {
          type: 'trupillo',
          displayName: item.species_name || item.speciesName || item.name || 'Trupillo',
          scientific: item.scientific_name || item.scientificName || 'Prosopis juliflora',
          isInvasive: false,
          badgeClass: 'badge-native',
          badgeText: 'Nativa Protectora',
          icon: '🌿',
          defaultHeight: 8.5,
          canopyRatio: 0.56,
          dotColor: '#059669',
          trunkColor: '#713f12',
          colorBase: '#065f46',
          colorMid: '#059669',
          colorTop: '#34d399',
          footprintFill: 'rgba(16, 185, 129, 0.18)',
          footprintStroke: '#059669',
          windShiftM: 0
        };
      }

      if (name.includes('guayacan') || name.includes('guayacán') || name.includes('handroanthus') || name.includes('bulnesia')) {
        return {
          type: 'guayacan',
          displayName: item.species_name || item.speciesName || item.name || 'Guayacán',
          scientific: item.scientific_name || item.scientificName || 'Bulnesia arborea',
          isInvasive: false,
          badgeClass: 'badge-native',
          badgeText: 'Floración Nativa',
          icon: '🌸',
          defaultHeight: 11.0,
          canopyRatio: 0.44,
          dotColor: '#eab308',
          trunkColor: '#6b3e17',
          colorBase: '#b45309',
          colorMid: '#eab308',
          colorTop: '#fde047',
          footprintFill: 'rgba(234, 179, 8, 0.18)',
          footprintStroke: '#ca8a04',
          windShiftM: 0
        };
      }

      if (name.includes('dividivi') || name.includes('libidibia') || name.includes('caesalpinia')) {
        return {
          type: 'dividivi',
          displayName: item.species_name || item.speciesName || item.name || 'Dividivi',
          scientific: item.scientific_name || item.scientificName || 'Libidibia coriaria',
          isInvasive: false,
          badgeClass: 'badge-native',
          badgeText: 'Ancestral Wayuu',
          icon: '🍃',
          defaultHeight: 7.5,
          canopyRatio: 0.52,
          dotColor: '#0d9488',
          trunkColor: '#6d3b14',
          colorBase: '#115e59',
          colorMid: '#0d9488',
          colorTop: '#2dd4bf',
          footprintFill: 'rgba(20, 184, 166, 0.18)',
          footprintStroke: '#0d9488',
          windShiftM: -0.75
        };
      }

      if (name.includes('cardon') || name.includes('cardón') || name.includes('cactus') || name.includes('melocactus') || name.includes('stenocereus')) {
        return {
          type: 'cardon',
          displayName: item.species_name || item.speciesName || item.name || 'Cardón Guajiro',
          scientific: item.scientific_name || item.scientificName || 'Stenocereus griseus',
          isInvasive: false,
          badgeClass: 'badge-native',
          badgeText: 'Cactácea Xerófila',
          icon: '🌵',
          defaultHeight: 6.5,
          canopyRatio: 0.28,
          dotColor: '#1e3a8a',
          trunkColor: '#065f46',
          colorBase: '#065f46',
          colorMid: '#059669',
          colorTop: '#10b981',
          footprintFill: 'rgba(16, 185, 129, 0.16)',
          footprintStroke: '#1e3a8a',
          windShiftM: 0
        };
      }

      const isVerified = Boolean(item.verified || item.is_verified || item.isVerified || item.status === 'APPROVED');
      const labelBase = item.species_name || item.speciesName || item.name || 'Árbol Forestal';
      return {
        type: 'general',
        displayName: labelBase,
        scientific: item.scientific_name || item.scientificName || 'Especie Forestal Nativa',
        isInvasive: false,
        badgeClass: 'badge-native',
        badgeText: isVerified ? 'Verificado' : 'Catastro Arbóreo',
        icon: isVerified ? '🌳' : '🌱',
        defaultHeight: 9.5,
        canopyRatio: 0.45,
        dotColor: isVerified ? '#047857' : '#10b981',
        trunkColor: '#78350f',
        colorBase: '#065f46',
        colorMid: '#10b981',
        colorTop: '#34d399',
        footprintFill: 'rgba(16, 185, 129, 0.18)',
        footprintStroke: '#059669',
        windShiftM: 0
      };
    }

    /**
     * Genera las piezas poligonales 3D (fill-extrusion) de un árbol real en el catastro:
     * tronco cilíndrico + 3 niveles de copa (o brazos columnares en Cardón) para verdadera
     * perspectiva y oclusión 3D con los edificios del catastro.
     */
    function buildTreeExtrusionParts(treeId, lng, lat, heightMeters, profile, isDraft = false) {
      const H = Math.max(3, Math.min(40, heightMeters));
      const R = Math.max(2.0, Math.min(6.5, H * profile.canopyRatio));
      const features = [];

      const trunkColor = isDraft ? '#0284c7' : profile.trunkColor;
      const cBase = isDraft ? '#0ea5e9' : profile.colorBase;
      const cMid = isDraft ? '#38bdf8' : profile.colorMid;
      const cTop = isDraft ? '#7dd3fc' : profile.colorTop;

      if (profile.type === 'cardon') {
        // Cactácea columnar 3D (fuste central + 2 brazos laterales)
        features.push({
          type: 'Feature',
          properties: { treeId, part: 'trunk', base: 0, height: H, color: cBase },
          geometry: { type: 'Polygon', coordinates: [createCircleRing(lng, lat, 0.52, 10)] }
        });
        features.push({
          type: 'Feature',
          properties: { treeId, part: 'arm-l', base: H * 0.34, height: H * 0.78, color: cMid },
          geometry: { type: 'Polygon', coordinates: [createCircleRing(lng, lat, 0.36, 8, -0.88, 0.15)] }
        });
        features.push({
          type: 'Feature',
          properties: { treeId, part: 'arm-r', base: H * 0.44, height: H * 0.85, color: cTop },
          geometry: { type: 'Polygon', coordinates: [createCircleRing(lng, lat, 0.36, 8, 0.88, -0.15)] }
        });
        return { features, canopyRadius: Math.max(1.8, R) };
      }

      const trunkRadius = Math.max(0.45, Math.min(1.1, R * 0.15));
      const trunkTop = H * 0.38;
      const shift = profile.windShiftM || 0;

      // 1. Tronco 3D anclado en el suelo (base 0m)
      features.push({
        type: 'Feature',
        properties: { treeId, part: 'trunk', base: 0, height: trunkTop, color: trunkColor },
        geometry: { type: 'Polygon', coordinates: [createCircleRing(lng, lat, trunkRadius, 10)] }
      });

      // 2. Copa inferior (sombra volumétrica base)
      features.push({
        type: 'Feature',
        properties: { treeId, part: 'canopy-lower', base: H * 0.33, height: H * 0.64, color: cBase },
        geometry: { type: 'Polygon', coordinates: [createCircleRing(lng, lat, R, 14, shift * 0.35, 0)] }
      });

      // 3. Copa media (follaje principal)
      features.push({
        type: 'Feature',
        properties: { treeId, part: 'canopy-mid', base: H * 0.60, height: H * 0.86, color: cMid },
        geometry: { type: 'Polygon', coordinates: [createCircleRing(lng, lat, R * 0.76, 14, shift * 0.75, 0.15)] }
      });

      // 4. Cúpula superior iluminada
      features.push({
        type: 'Feature',
        properties: { treeId, part: 'canopy-top', base: H * 0.83, height: H, color: cTop },
        geometry: { type: 'Polygon', coordinates: [createCircleRing(lng, lat, R * 0.44, 12, shift, 0.2)] }
      });

      return { features, canopyRadius: R };
    }

    function buildCadastreGeoJSON(treesList) {
      const extrusionFeatures = [];
      const footprintFeatures = [];
      const pointFeatures = [];
      const lookup = {};

      (treesList || []).forEach((t, idx) => {
        const lat = parseFloat(t.latitude ?? t.lat);
        const lng = parseFloat(t.longitude ?? t.lng);
        if (isNaN(lat) || isNaN(lng)) return;

        const profile = getSpeciesProfile(t);
        const treeId = String(t.clientId || t.id || ('tree-' + idx));
        const heightMeters = resolveTreeHeightMeters(t, profile.defaultHeight);
        const { features, canopyRadius } = buildTreeExtrusionParts(treeId, lng, lat, heightMeters, profile, false);

        lookup[treeId] = {
          tree: t,
          profile,
          lat,
          lng,
          heightMeters,
          canopyRadius
        };

        extrusionFeatures.push(...features);

        // Huella catastral en el suelo (sombra / zona alelopática de Neem)
        const footprintR = profile.isInvasive ? canopyRadius * 1.55 : canopyRadius * 1.12;
        footprintFeatures.push({
          type: 'Feature',
          properties: {
            treeId,
            isInvasive: profile.isInvasive ? 1 : 0,
            fillColor: profile.footprintFill,
            strokeColor: profile.footprintStroke
          },
          geometry: {
            type: 'Polygon',
            coordinates: [createCircleRing(lng, lat, footprintR, 18)]
          }
        });

        // Punto de vista lejana + etiqueta nativa WebGL (sin colisiones)
        pointFeatures.push({
          type: 'Feature',
          properties: {
            treeId,
            label: profile.displayName,
            dotColor: profile.dotColor,
            isInvasive: profile.isInvasive ? 1 : 0
          },
          geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          }
        });
      });

      return {
        extrusionFC: { type: 'FeatureCollection', features: extrusionFeatures },
        footprintFC: { type: 'FeatureCollection', features: footprintFeatures },
        pointsFC: { type: 'FeatureCollection', features: pointFeatures },
        lookup
      };
    }

    function buildMapStyle(theme) {
      const neuralJiraVectorSources = {
        r_vereda: {
          type: 'vector',
          tiles: ['https://map.neuraljira.tech/tiles/r_vereda/{z}/{x}/{y}'],
          minzoom: 10,
          maxzoom: 22
        },
        r_construccion: {
          type: 'vector',
          tiles: ['https://map.neuraljira.tech/tiles/r_construccion/{z}/{x}/{y}'],
          minzoom: 10,
          maxzoom: 22
        },
        u_construccion: {
          type: 'vector',
          tiles: ['https://map.neuraljira.tech/tiles/u_construccion/{z}/{x}/{y}'],
          minzoom: 10,
          maxzoom: 22
        },
        u_sector: {
          type: 'vector',
          tiles: ['https://map.neuraljira.tech/tiles/u_sector/{z}/{x}/{y}'],
          minzoom: 10,
          maxzoom: 22
        }
      };

      const isDark = theme === 'transport-dark';

      const neuralJira3DLayers = [
        {
          id: 'nj-sector-line',
          type: 'line',
          source: 'u_sector',
          'source-layer': 'u_sector',
          minzoom: 11,
          paint: {
            'line-color': isDark ? '#10b981' : '#059669',
            'line-width': 1,
            'line-opacity': isDark ? 0.3 : 0.2,
            'line-dasharray': [3, 2]
          }
        },
        {
          id: 'nj-r-construccion-3d',
          type: 'fill-extrusion',
          source: 'r_construccion',
          'source-layer': 'r_construccion',
          minzoom: 13,
          paint: {
            'fill-extrusion-color': isDark ? '#1e293b' : '#cbd5e1',
            'fill-extrusion-height': ['*', ['coalesce', ['get', 'numero_pisos'], ['get', 'pisos'], 1], 3.8],
            'fill-extrusion-base': 0,
            'fill-extrusion-opacity': 0.82
          }
        },
        {
          id: 'nj-u-construccion-3d',
          type: 'fill-extrusion',
          source: 'u_construccion',
          'source-layer': 'u_construccion',
          minzoom: 13,
          paint: {
            'fill-extrusion-color': isDark
              ? ['interpolate', ['linear'], ['coalesce', ['get', 'numero_pisos'], ['get', 'pisos'], 1], 1, '#1e293b', 3, '#0f766e', 6, '#059669']
              : ['interpolate', ['linear'], ['coalesce', ['get', 'numero_pisos'], ['get', 'pisos'], 1], 1, '#e2e8f0', 3, '#cbd5e1', 6, '#94a3b8'],
            'fill-extrusion-height': ['*', ['coalesce', ['get', 'numero_pisos'], ['get', 'pisos'], 1], 3.8],
            'fill-extrusion-base': 0,
            'fill-extrusion-opacity': 0.84
          }
        }
      ];

      if (theme === 'osm-classic') {
        return {
          version: 8,
          name: 'EcoRaíces OSM + Catastro 3D',
          glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
          sources: {
            osm: {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              maxzoom: 19
            },
            ...neuralJiraVectorSources
          },
          layers: [
            {
              id: 'osm-base',
              type: 'raster',
              source: 'osm',
              paint: { 'raster-opacity': 0.95 }
            },
            ...neuralJira3DLayers
          ]
        };
      }

      return {
        version: 8,
        name: isDark ? 'EcoRaíces Cockpit Dark 3D' : 'EcoRaíces Vector Day 3D',
        glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
        sources: {
          openmaptiles: {
            type: 'vector',
            url: 'https://tiles.openfreemap.org/planet'
          },
          ...neuralJiraVectorSources
        },
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: { 'background-color': isDark ? '#0b1120' : '#f4f6f0' }
          },
          {
            id: 'landcover-wood',
            type: 'fill',
            source: 'openmaptiles',
            'source-layer': 'landcover',
            filter: ['==', ['get', 'class'], 'wood'],
            paint: {
              'fill-color': isDark ? '#064e3b' : '#bbf7d0',
              'fill-opacity': isDark ? 0.35 : 0.45
            }
          },
          {
            id: 'landcover-grass',
            type: 'fill',
            source: 'openmaptiles',
            'source-layer': 'landcover',
            filter: ['==', ['get', 'class'], 'grass'],
            paint: {
              'fill-color': isDark ? '#0c291e' : '#dcfce7',
              'fill-opacity': isDark ? 0.5 : 0.6
            }
          },
          {
            id: 'park',
            type: 'fill',
            source: 'openmaptiles',
            'source-layer': 'park',
            paint: {
              'fill-color': isDark ? '#0c291e' : '#d1fae5',
              'fill-opacity': isDark ? 0.65 : 0.7
            }
          },
          {
            id: 'water',
            type: 'fill',
            source: 'openmaptiles',
            'source-layer': 'water',
            paint: { 'fill-color': isDark ? '#0f2942' : '#bae6fd' }
          },
          {
            id: 'waterway',
            type: 'line',
            source: 'openmaptiles',
            'source-layer': 'waterway',
            paint: {
              'line-color': isDark ? '#0284c7' : '#7dd3fc',
              'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1, 18, 5]
            }
          },
          {
            id: 'roads-casing-major',
            type: 'line',
            source: 'openmaptiles',
            'source-layer': 'transportation',
            filter: ['match', ['get', 'class'], ['motorway', 'trunk', 'primary', 'secondary', 'tertiary'], true, false],
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': isDark ? '#0f172a' : '#cbd5e1',
              'line-width': ['interpolate', ['linear'], ['zoom'], 9, 2, 14, 6, 18, 16]
            }
          },
          {
            id: 'roads-minor',
            type: 'line',
            source: 'openmaptiles',
            'source-layer': 'transportation',
            filter: ['!in', 'class', 'motorway', 'trunk', 'primary', 'secondary', 'tertiary'],
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': isDark ? '#1e293b' : '#ffffff',
              'line-width': ['interpolate', ['linear'], ['zoom'], 11, 0.8, 15, 3.5, 19, 10]
            }
          },
          {
            id: 'roads-major',
            type: 'line',
            source: 'openmaptiles',
            'source-layer': 'transportation',
            filter: ['match', ['get', 'class'], ['motorway', 'trunk', 'primary', 'secondary', 'tertiary'], true, false],
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': isDark ? '#334155' : '#fef9c3',
              'line-width': ['interpolate', ['linear'], ['zoom'], 9, 1.2, 14, 4.5, 18, 13]
            }
          },
          {
            id: 'buildings-3d',
            type: 'fill-extrusion',
            source: 'openmaptiles',
            'source-layer': 'building',
            minzoom: 13.5,
            paint: {
              'fill-extrusion-color': isDark ? '#1e293b' : '#e2e8f0',
              'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 12],
              'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
              'fill-extrusion-opacity': 0.8
            }
          },
          ...neuralJira3DLayers,
          {
            id: 'road-label-minor',
            type: 'symbol',
            source: 'openmaptiles',
            'source-layer': 'transportation_name',
            minzoom: 13,
            layout: {
              'symbol-placement': 'line',
              'symbol-spacing': 220,
              'text-field': ['coalesce', ['get', 'name:latin'], ['get', 'name']],
              'text-font': ['Noto Sans Regular'],
              'text-rotation-alignment': 'map',
              'text-size': ['interpolate', ['linear'], ['zoom'], 13, 10, 16, 12.5, 19, 14.5]
            },
            paint: {
              'text-color': isDark ? '#94a3b8' : '#475569',
              'text-halo-color': isDark ? '#0b1120' : '#ffffff',
              'text-halo-width': 2
            }
          },
          {
            id: 'place-label',
            type: 'symbol',
            source: 'openmaptiles',
            'source-layer': 'place',
            minzoom: 6,
            layout: {
              'text-field': ['coalesce', ['get', 'name:latin'], ['get', 'name']],
              'text-font': ['Noto Sans Bold'],
              'text-size': ['interpolate', ['linear'], ['zoom'], 7, 11, 13, 15, 16, 17]
            },
            paint: {
              'text-color': isDark ? '#f8fafc' : '#0f172a',
              'text-halo-color': isDark ? '#0b1120' : '#ffffff',
              'text-halo-width': 2.2
            }
          }
        ]
      };
    }

    /**
     * Registra todas las capas nativas WebGL del Catastro Arbóreo 3D dentro del estilo activo.
     * Se ejecuta en 'load' y tras cada cambio de tema ('style.load').
     */
    function ensureTreeCadastreLayers() {
      if (!map || !styleReady) return;
      const isDark = currentTheme === 'transport-dark';
      const emptyFC = { type: 'FeatureCollection', features: [] };

      const beforeBuildings = map.getLayer('buildings-3d')
        ? 'buildings-3d'
        : (map.getLayer('nj-r-construccion-3d') ? 'nj-r-construccion-3d' : undefined);
      const beforeLabels = map.getLayer('road-label-minor')
        ? 'road-label-minor'
        : (map.getLayer('place-label') ? 'place-label' : undefined);

      try {
        if (!map.getSource('ecoraices-trees-footprint-source')) {
          map.addSource('ecoraices-trees-footprint-source', { type: 'geojson', data: emptyFC });
        }
        if (!map.getSource('ecoraices-trees-3d-source')) {
          map.addSource('ecoraices-trees-3d-source', { type: 'geojson', data: emptyFC });
        }
        if (!map.getSource('ecoraices-trees-points-source')) {
          map.addSource('ecoraices-trees-points-source', { type: 'geojson', data: emptyFC });
        }
        if (!map.getSource('ecoraices-draft-footprint-source')) {
          map.addSource('ecoraices-draft-footprint-source', { type: 'geojson', data: emptyFC });
        }
        if (!map.getSource('ecoraices-draft-3d-source')) {
          map.addSource('ecoraices-draft-3d-source', { type: 'geojson', data: emptyFC });
        }

        // 1. Huellas catastrales en suelo (bajo edificios y árboles)
        if (!map.getLayer('ecoraices-trees-footprint-fill')) {
          map.addLayer({
            id: 'ecoraices-trees-footprint-fill',
            type: 'fill',
            source: 'ecoraices-trees-footprint-source',
            minzoom: 13,
            paint: {
              'fill-color': ['get', 'fillColor'],
              'fill-opacity': 0.9
            }
          }, beforeBuildings);
        }

        if (!map.getLayer('ecoraices-trees-footprint-line')) {
          map.addLayer({
            id: 'ecoraices-trees-footprint-line',
            type: 'line',
            source: 'ecoraices-trees-footprint-source',
            minzoom: 13.5,
            paint: {
              'line-color': ['get', 'strokeColor'],
              'line-width': ['case', ['==', ['get', 'isInvasive'], 1], 2.2, 1.3],
              'line-dasharray': [2, 1.5],
              'line-opacity': 0.85
            }
          }, beforeBuildings);
        }

        // Aro resaltado para el árbol seleccionado o activo en Modo Persona
        if (!map.getLayer('ecoraices-trees-selected-ring')) {
          map.addLayer({
            id: 'ecoraices-trees-selected-ring',
            type: 'line',
            source: 'ecoraices-trees-footprint-source',
            filter: ['==', ['get', 'treeId'], selectedTreeId || personTargetId || '__none__'],
            paint: {
              'line-color': '#10b981',
              'line-width': 4,
              'line-opacity': 0.95
            }
          }, beforeBuildings);
        }

        // Huella del árbol borrador en modo colocación directa
        if (!map.getLayer('ecoraices-draft-footprint-fill')) {
          map.addLayer({
            id: 'ecoraices-draft-footprint-fill',
            type: 'fill',
            source: 'ecoraices-draft-footprint-source',
            paint: {
              'fill-color': 'rgba(14, 165, 233, 0.25)',
              'fill-opacity': 0.95
            }
          }, beforeBuildings);
        }
        if (!map.getLayer('ecoraices-draft-footprint-line')) {
          map.addLayer({
            id: 'ecoraices-draft-footprint-line',
            type: 'line',
            source: 'ecoraices-draft-footprint-source',
            paint: {
              'line-color': '#0284c7',
              'line-width': 2.5,
              'line-dasharray': [2, 1.5]
            }
          }, beforeBuildings);
        }

        // 2. CAPA PRINCIPAL 3D DE ÁRBOLES (idéntica a edificios del catastro, con profundidad WebGL real)
        if (!map.getLayer('ecoraices-trees-3d-layer')) {
          map.addLayer({
            id: 'ecoraices-trees-3d-layer',
            type: 'fill-extrusion',
            source: 'ecoraices-trees-3d-source',
            minzoom: 12,
            paint: {
              'fill-extrusion-color': ['get', 'color'],
              'fill-extrusion-base': ['get', 'base'],
              'fill-extrusion-height': ['get', 'height'],
              'fill-extrusion-opacity': 0.94,
              'fill-extrusion-vertical-gradient': true
            }
          }, beforeLabels);
        }

        // Árbol 3D borrador en tiempo real (cuando el usuario toca el mapa para censar)
        if (!map.getLayer('ecoraices-draft-tree-3d')) {
          map.addLayer({
            id: 'ecoraices-draft-tree-3d',
            type: 'fill-extrusion',
            source: 'ecoraices-draft-3d-source',
            paint: {
              'fill-extrusion-color': ['get', 'color'],
              'fill-extrusion-base': ['get', 'base'],
              'fill-extrusion-height': ['get', 'height'],
              'fill-extrusion-opacity': 0.82,
              'fill-extrusion-vertical-gradient': true
            }
          }, beforeLabels);
        }

        // 3. Puntos de vista general cuando el usuario hace zoom lejano (< 15.5)
        if (!map.getLayer('ecoraices-trees-overview-halo')) {
          map.addLayer({
            id: 'ecoraices-trees-overview-halo',
            type: 'circle',
            source: 'ecoraices-trees-points-source',
            paint: {
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 8, 12, 12, 15.5, 14],
              'circle-color': ['get', 'dotColor'],
              'circle-opacity': ['interpolate', ['linear'], ['zoom'], 5, 0.25, 14.2, 0.22, 15.8, 0]
            }
          });
        }

        if (!map.getLayer('ecoraices-trees-overview-dot')) {
          map.addLayer({
            id: 'ecoraices-trees-overview-dot',
            type: 'circle',
            source: 'ecoraices-trees-points-source',
            paint: {
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 4.5, 12, 6.5, 15.5, 5],
              'circle-color': ['get', 'dotColor'],
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 2,
              'circle-opacity': ['interpolate', ['linear'], ['zoom'], 5, 1, 14.5, 0.95, 16.0, 0],
              'circle-stroke-opacity': ['interpolate', ['linear'], ['zoom'], 5, 1, 14.5, 0.95, 16.0, 0]
            }
          });
        }

        // 4. Etiquetas nativas WebGL sin superposición (motor de colisiones de MapLibre)
        if (!map.getLayer('ecoraices-trees-labels')) {
          map.addLayer({
            id: 'ecoraices-trees-labels',
            type: 'symbol',
            source: 'ecoraices-trees-points-source',
            minzoom: 14.2,
            layout: {
              'text-field': ['get', 'label'],
              'text-font': ['Noto Sans Bold'],
              'text-size': ['interpolate', ['linear'], ['zoom'], 14, 10, 17, 12, 19, 13.5],
              'text-offset': [0, 1.3],
              'text-anchor': 'top',
              'text-allow-overlap': false,
              'text-optional': true
            },
            paint: {
              'text-color': ['case', ['==', ['get', 'isInvasive'], 1], '#dc2626', isDark ? '#6ee7b7' : '#065f46'],
              'text-halo-color': isDark ? '#0b1120' : '#ffffff',
              'text-halo-width': 2
            }
          });
        }
      } catch (_) {}
    }

    function ensurePersonGuideLayers() {
      if (!map || !styleReady) return;
      try {
        if (!map.getSource('person-guide-source')) {
          map.addSource('person-guide-source', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
          });
        }
        if (!map.getLayer('person-guide-glow')) {
          map.addLayer({
            id: 'person-guide-glow',
            type: 'line',
            source: 'person-guide-source',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': '#34d399',
              'line-width': 10,
              'line-opacity': 0.35
            }
          });
        }
        if (!map.getLayer('person-guide-line')) {
          map.addLayer({
            id: 'person-guide-line',
            type: 'line',
            source: 'person-guide-source',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': '#10b981',
              'line-width': 4,
              'line-dasharray': [2, 2],
              'line-opacity': 0.95
            }
          });
        }
      } catch (_) {}
    }

    function updatePersonGuideLine() {
      if (!map) return;
      ensurePersonGuideLayers();
      const src = map.getSource('person-guide-source');
      if (!src) return;
      if (isPersonMode && personTargetCoords && lastUserCoords) {
        src.setData({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [lastUserCoords.lng, lastUserCoords.lat],
              [personTargetCoords.lng, personTargetCoords.lat]
            ]
          },
          properties: {}
        });
      } else {
        src.setData({ type: 'FeatureCollection', features: [] });
      }
    }

    function updateSelectedRingFilter() {
      if (!map || !map.getLayer('ecoraices-trees-selected-ring')) return;
      const target = personTargetId || selectedTreeId || '__none__';
      map.setFilter('ecoraices-trees-selected-ring', ['==', ['get', 'treeId'], target]);
    }

    function renderTreesToSources() {
      if (!map) return;
      ensureTreeCadastreLayers();
      const { extrusionFC, footprintFC, pointsFC, lookup } = buildCadastreGeoJSON(currentTrees);
      treesById = lookup;

      const s3d = map.getSource('ecoraices-trees-3d-source');
      const sFoot = map.getSource('ecoraices-trees-footprint-source');
      const sPts = map.getSource('ecoraices-trees-points-source');
      if (s3d) s3d.setData(extrusionFC);
      if (sFoot) sFoot.setData(footprintFC);
      if (sPts) sPts.setData(pointsFC);
      updateSelectedRingFilter();
    }

    function renderDraftTreeToSources() {
      if (!map) return;
      ensureTreeCadastreLayers();
      const sDraft3d = map.getSource('ecoraices-draft-3d-source');
      const sDraftFoot = map.getSource('ecoraices-draft-footprint-source');
      const emptyFC = { type: 'FeatureCollection', features: [] };

      if (!draftTreeData || isNaN(draftTreeData.lat) || isNaN(draftTreeData.lng)) {
        if (sDraft3d) sDraft3d.setData(emptyFC);
        if (sDraftFoot) sDraftFoot.setData(emptyFC);
        return;
      }

      const profile = getSpeciesProfile({ species_name: draftTreeData.speciesName || 'Árbol Nuevo' });
      const heightMeters = resolveTreeHeightMeters(draftTreeData, profile.defaultHeight);
      const { features, canopyRadius } = buildTreeExtrusionParts(
        'draft-tree',
        draftTreeData.lng,
        draftTreeData.lat,
        heightMeters,
        profile,
        true
      );

      if (sDraft3d) {
        sDraft3d.setData({ type: 'FeatureCollection', features });
      }
      if (sDraftFoot) {
        sDraftFoot.setData({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'Polygon',
                coordinates: [createCircleRing(draftTreeData.lng, draftTreeData.lat, canopyRadius * 1.25, 20)]
              }
            }
          ]
        });
      }
    }

    function isSafeImageSrc(url) {
      if (typeof url !== 'string' || !url.trim()) return false;
      const trimmed = url.trim();
      return (
        trimmed.startsWith('https://') ||
        trimmed.startsWith('http://') ||
        trimmed.startsWith('data:image/') ||
        trimmed.startsWith('blob:') ||
        trimmed.startsWith('file://')
      );
    }

    /**
     * Construye la ficha catastral/botánica del árbol usando nodos DOM seguros (textContent + addEventListener).
     */
    function createPopupElement(entry) {
      const { tree: t, profile, lat, lng, heightMeters, canopyRadius } = entry;
      const card = document.createElement('div');
      card.className = 'popup-tree-card ' + (profile.isInvasive ? 'is-invasive' : 'is-native');

      const imgPath = t.imageUrl || t.localImagePath || t.local_image_path || '';
      if (isSafeImageSrc(imgPath)) {
        const img = document.createElement('img');
        img.className = 'popup-thumb-img';
        img.alt = profile.displayName;
        img.src = imgPath;
        img.addEventListener('error', () => { img.style.display = 'none'; });
        card.appendChild(img);
      }

      const header = document.createElement('div');
      header.className = 'popup-card-header';

      const iconSpan = document.createElement('span');
      iconSpan.className = 'popup-header-icon';
      iconSpan.textContent = profile.isInvasive ? '🚨' : profile.icon;
      header.appendChild(iconSpan);

      const titleWrap = document.createElement('div');
      const h4 = document.createElement('h4');
      h4.className = 'popup-title';
      h4.textContent = profile.displayName;
      titleWrap.appendChild(h4);

      const sub = document.createElement('p');
      sub.className = 'popup-sub';
      sub.textContent = profile.scientific;
      titleWrap.appendChild(sub);

      const badgeRow = document.createElement('div');
      badgeRow.className = 'popup-badge-row';

      const badge = document.createElement('span');
      badge.className = 'popup-badge ' + profile.badgeClass;
      badge.textContent = profile.badgeText;
      badgeRow.appendChild(badge);

      const cadBadge = document.createElement('span');
      cadBadge.className = 'popup-badge badge-cadastre';
      cadBadge.textContent = 'Catastro 3D';
      badgeRow.appendChild(cadBadge);

      titleWrap.appendChild(badgeRow);
      header.appendChild(titleWrap);
      card.appendChild(header);

      // Métricas métricas del catastro arbóreo 3D
      const metricsRow = document.createElement('div');
      metricsRow.className = 'cadastre-metrics-row';
      const hPill = document.createElement('div');
      hPill.className = 'cadastre-metric-pill';
      hPill.textContent = '📏 Altura: ' + Number(heightMeters).toFixed(1) + ' m';
      const cPill = document.createElement('div');
      cPill.className = 'cadastre-metric-pill';
      cPill.textContent = '🌳 Copa: Ø ' + (canopyRadius * 2).toFixed(1) + ' m';
      metricsRow.appendChild(hPill);
      metricsRow.appendChild(cPill);
      card.appendChild(metricsRow);

      const muni = t.municipio || t.municipality || 'Territorio GPS';

      if (profile.isInvasive) {
        const allelo = document.createElement('div');
        allelo.className = 'allelopathy-box';
        const b = document.createElement('b');
        b.textContent = '⚠️ Alelopatía: ';
        allelo.appendChild(b);
        allelo.appendChild(
          document.createTextNode('Zona roja proyectada en suelo. Recomendar sustitución por Trupillo, Dividivi o Guayacán.')
        );
        card.appendChild(allelo);
      } else {
        const valBox = document.createElement('div');
        valBox.className = 'native-value-box';
        const b = document.createElement('b');
        b.textContent = '🌿 Catastro Forestal: ';
        valBox.appendChild(b);
        valBox.appendChild(
          document.createTextNode('Ejemplar georreferenciado en ' + muni + ' integrado en la capa 3D.')
        );
        card.appendChild(valBox);
      }

      const meta = document.createElement('div');
      meta.className = 'popup-meta';
      const muniSpan = document.createElement('span');
      muniSpan.textContent = '🏛️ ' + muni;
      const coordSpan = document.createElement('span');
      coordSpan.textContent = '📍 ' + lat.toFixed(4) + ', ' + lng.toFixed(4);
      meta.appendChild(muniSpan);
      meta.appendChild(coordSpan);
      card.appendChild(meta);

      const personBtn = document.createElement('button');
      personBtn.type = 'button';
      personBtn.className = 'popup-btn-person';
      personBtn.textContent = '🚶‍♂️ Vista en Persona (Al pie del árbol)';
      personBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        enterPersonMode(lat, lng, t);
      });
      card.appendChild(personBtn);

      return card;
    }

    function openTreePopup(treeId) {
      const entry = treesById[treeId];
      if (!entry || !map) return;
      selectedTreeId = treeId;
      updateSelectedRingFilter();

      if (activePopup) {
        activePopup.remove();
        activePopup = null;
      }

      const popupNode = createPopupElement(entry);
      activePopup = new maplibregl.Popup({ offset: [0, -16], closeButton: true, maxWidth: '300px' })
        .setLngLat([entry.lng, entry.lat])
        .setDOMContent(popupNode)
        .addTo(map);

      activePopup.on('close', () => {
        if (!isPersonMode) {
          selectedTreeId = null;
          updateSelectedRingFilter();
        }
      });

      postToHost({
        type: 'SELECT_TREE',
        payload: entry.tree
      });
    }

    function fitTreeBounds(treesList) {
      if (!map || !Array.isArray(treesList) || treesList.length === 0) return;
      const coordsList = [];
      const bounds = new maplibregl.LngLatBounds();
      treesList.forEach(t => {
        const lat = parseFloat(t.latitude ?? t.lat);
        const lng = parseFloat(t.longitude ?? t.lng);
        if (!isNaN(lat) && !isNaN(lng)) {
          coordsList.push([lng, lat]);
          bounds.extend([lng, lat]);
        }
      });
      if (coordsList.length === 0) return;
      map.stop();
      if (coordsList.length === 1) {
        map.easeTo({
          center: coordsList[0],
          zoom: 17.2,
          pitch: is3D ? 56 : 0,
          bearing: is3D ? -15 : 0,
          duration: 950
        });
      } else {
        map.fitBounds(bounds, {
          padding: 70,
          maxZoom: 16.5,
          pitch: is3D ? 54 : 0,
          bearing: is3D ? -15 : 0,
          duration: 1000
        });
      }
    }

    function setTrees(treesList, forceFitAll = false) {
      currentTrees = Array.isArray(treesList) ? treesList : [];
      renderTreesToSources();

      if (isPersonMode || isPickMode) return;

      if (forceFitAll && currentTrees.length > 0) {
        fitTreeBounds(currentTrees);
      } else if (!hasDoneInitialFraming && currentTrees.length > 0) {
        hasDoneInitialFraming = true;
        if (lastUserCoords) {
          map.easeTo({
            center: [lastUserCoords.lng, lastUserCoords.lat],
            zoom: 16.2,
            pitch: is3D ? 55 : 0,
            bearing: is3D ? -15 : 0,
            duration: 900
          });
        } else {
          fitTreeBounds(currentTrees);
        }
      }
    }

    function updateUserGpsMarker(lat, lng, centerCamera = false, locationLabel = '') {
      const nLat = parseFloat(lat);
      const nLng = parseFloat(lng);
      if (isNaN(nLat) || isNaN(nLng) || !map) return;

      const cleanLabel = (locationLabel || lastUserCoords?.label || '').trim();
      lastUserCoords = { lat: nLat, lng: nLng, label: cleanLabel };
      const badgeText = cleanLabel ? ('📍 Tú • ' + cleanLabel) : '📍 Tú (GPS)';

      if (!userMarker) {
        const el = document.createElement('div');
        el.className = 'user-gps-marker';

        const labelEl = document.createElement('div');
        labelEl.className = 'user-gps-label';
        labelEl.textContent = badgeText;
        userMarkerLabelEl = labelEl;
        el.appendChild(labelEl);

        const wrap = document.createElement('div');
        wrap.className = 'user-gps-puck-wrap';
        const ring = document.createElement('div');
        ring.className = 'user-gps-pulse-ring';
        const dot = document.createElement('div');
        dot.className = 'user-gps-inner-dot';
        wrap.appendChild(ring);
        wrap.appendChild(dot);
        el.appendChild(wrap);

        userMarker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([nLng, nLat])
          .addTo(map);
      } else {
        userMarker.setLngLat([nLng, nLat]);
        if (userMarkerLabelEl) {
          userMarkerLabelEl.textContent = badgeText;
        }
      }

      if (centerCamera) {
        if (isPersonMode) {
          exitPersonMode(true);
        }
        hasDoneInitialFraming = true;
        map.stop();
        const center = map.getCenter();
        const dist = haversineMeters(center.lat, center.lng, nLat, nLng);
        const targetCam = {
          center: [nLng, nLat],
          zoom: 17.0,
          pitch: is3D ? 56 : 0,
          bearing: is3D ? -15 : 0,
          duration: dist > 5000 ? 1200 : 900
        };
        if (dist > 5000) {
          map.flyTo(targetCam);
        } else {
          map.easeTo(targetCam);
        }
      } else {
        updatePersonGuideLine();
      }
    }

    function enterPersonMode(lat, lng, treeInfo) {
      const nLat = parseFloat(lat);
      const nLng = parseFloat(lng);
      if (isNaN(nLat) || isNaN(nLng) || !map) return;

      isPersonMode = true;
      personTargetCoords = { lat: nLat, lng: nLng };
      personTargetId = String(treeInfo?.clientId || treeInfo?.id || '');
      selectedTreeId = personTargetId;

      if (activePopup) {
        activePopup.remove();
        activePopup = null;
      }

      updateSelectedRingFilter();

      const isSelfLocation = Boolean(treeInfo?.isSelfLocation);
      const avatarLat = isSelfLocation ? nLat : (nLat - 0.000075);
      const avatarLng = isSelfLocation ? nLng : (nLng + 0.000045);
      const avatarText = isSelfLocation
        ? '🚶‍♂️ Explorando desde tu GPS'
        : '🚶‍♂️ Tú frente al árbol 3D';

      if (!personAvatarMarker) {
        const pEl = document.createElement('div');
        pEl.className = 'person-explorer-marker';

        const badgeEl = document.createElement('div');
        badgeEl.className = 'person-explorer-badge';
        badgeEl.textContent = avatarText;
        personAvatarBadgeEl = badgeEl;
        pEl.appendChild(badgeEl);

        const circleEl = document.createElement('div');
        circleEl.className = 'person-explorer-circle';
        circleEl.textContent = '🧍';
        pEl.appendChild(circleEl);

        personAvatarMarker = new maplibregl.Marker({ element: pEl, anchor: 'bottom' })
          .setLngLat([avatarLng, avatarLat])
          .addTo(map);
      } else {
        personAvatarMarker.setLngLat([avatarLng, avatarLat]);
        if (personAvatarBadgeEl) {
          personAvatarBadgeEl.textContent = avatarText;
        }
      }

      updatePersonGuideLine();

      map.stop();
      const center = map.getCenter();
      const dist = haversineMeters(center.lat, center.lng, nLat, nLng);
      const camOpts = {
        center: [nLng, nLat],
        zoom: 19.0,
        pitch: 72,
        bearing: -20,
        duration: dist > 2500 ? 1300 : 950
      };
      if (dist > 2500) {
        map.flyTo(camOpts);
      } else {
        map.easeTo(camOpts);
      }

      const hud = document.getElementById('person-hud');
      if (hud) {
        const spName = treeInfo?.species_name || treeInfo?.speciesName || treeInfo?.name || 'Árbol';
        hud.textContent = '🚶‍♂️ MODO PERSONA 3D • ' + spName.toUpperCase();
        hud.classList.add('active');
      }

      postToHost({
        type: 'PERSON_MODE_CHANGE',
        payload: { active: true, tree: treeInfo || null }
      });
    }

    function exitPersonMode(skipCameraReset = false) {
      isPersonMode = false;
      personTargetCoords = null;
      personTargetId = null;
      selectedTreeId = null;

      if (personAvatarMarker) {
        personAvatarMarker.remove();
        personAvatarMarker = null;
        personAvatarBadgeEl = null;
      }

      updateSelectedRingFilter();
      updatePersonGuideLine();

      const hud = document.getElementById('person-hud');
      if (hud) hud.classList.remove('active');

      if (!skipCameraReset && map) {
        map.stop();
        map.easeTo({
          pitch: is3D ? 54 : 0,
          zoom: 16.0,
          bearing: is3D ? -15 : 0,
          duration: 950
        });
      }

      postToHost({
        type: 'PERSON_MODE_CHANGE',
        payload: { active: false }
      });
    }

    function orbit360() {
      if (!personTargetCoords || !map) return;
      const currentBearing = map.getBearing();
      map.stop();
      map.easeTo({
        center: [personTargetCoords.lng, personTargetCoords.lat],
        zoom: 19.0,
        pitch: 72,
        bearing: currentBearing + 72,
        duration: 800
      });
    }

    function toggle3DView(enable3D) {
      is3D = Boolean(enable3D);
      if (isPersonMode) {
        exitPersonMode(true);
      }
      if (!map) return;
      map.stop();
      map.easeTo({
        pitch: is3D ? 54 : 0,
        bearing: is3D ? -18 : 0,
        duration: 850
      });
    }

    function setMapTheme(themeId) {
      if (!map || !themeId || currentTheme === themeId) return;
      currentTheme = themeId;
      styleReady = false;
      map.setStyle(buildMapStyle(themeId));
    }

    function setPickMode(enabled) {
      isPickMode = Boolean(enabled);
      if (map) {
        map.getCanvas().style.cursor = isPickMode ? 'crosshair' : '';
      }
      if (isPickMode && activePopup) {
        activePopup.remove();
        activePopup = null;
      }
      if (!isPickMode) {
        draftTreeData = null;
        renderDraftTreeToSources();
      }
    }

    function setDraftTree(payload, centerOnDraft = false) {
      if (!payload || isNaN(parseFloat(payload.lat)) || isNaN(parseFloat(payload.lng))) {
        draftTreeData = null;
        renderDraftTreeToSources();
        return;
      }
      const lat = parseFloat(payload.lat);
      const lng = parseFloat(payload.lng);
      draftTreeData = {
        lat,
        lng,
        heightMeters: payload.heightMeters || 10,
        speciesName: payload.speciesName || 'Árbol Nuevo'
      };
      renderDraftTreeToSources();

      if (centerOnDraft && map) {
        map.easeTo({
          center: [lng, lat],
          zoom: Math.max(map.getZoom(), 17.5),
          pitch: is3D ? 58 : 0,
          duration: 750
        });
      }
    }

    function processCommand(data) {
      if (!data || !data.type) return;
      if (data._msgId && data._msgId === lastProcessedMsgId) return;
      if (data._msgId) lastProcessedMsgId = data._msgId;

      if (data.type === 'PING') {
        if (mapReady) postToHost({ type: 'MAP_READY' });
        return;
      }

      if (!mapReady) {
        pendingCommands.push(data);
        return;
      }

      switch (data.type) {
        case 'SET_TREES':
          setTrees(data.payload, Boolean(data.forceFitAll));
          break;
        case 'FIT_TREES':
          fitTreeBounds(Array.isArray(data.payload) && data.payload.length ? data.payload : currentTrees);
          break;
        case 'TOGGLE_3D':
          toggle3DView(data.payload);
          break;
        case 'UPDATE_USER_GPS':
          updateUserGpsMarker(data.payload.lat, data.payload.lng, false, data.payload.label || '');
          break;
        case 'FOCUS_USER_GPS':
          updateUserGpsMarker(data.payload.lat, data.payload.lng, true, data.payload.label || '');
          break;
        case 'SET_THEME':
          setMapTheme(data.payload);
          break;
        case 'ENTER_PERSON_MODE':
          enterPersonMode(data.payload.lat, data.payload.lng, data.payload.tree);
          break;
        case 'EXIT_PERSON_MODE':
          exitPersonMode(false);
          break;
        case 'ORBIT_360':
          orbit360();
          break;
        case 'SET_PICK_MODE':
          setPickMode(data.payload);
          break;
        case 'SET_DRAFT_TREE':
          setDraftTree(data.payload, Boolean(data.center));
          break;
        case 'CLEAR_DRAFT_TREE':
          draftTreeData = null;
          renderDraftTreeToSources();
          break;
        default:
          break;
      }
    }

    window.__onHostMessage = function(raw) {
      try {
        const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
        processCommand(data);
      } catch (_) {}
    };

    function onDomMessageEvent(event) {
      if (!event) return;
      window.__onHostMessage(event.data);
    }

    window.addEventListener('message', onDomMessageEvent);
    document.addEventListener('message', onDomMessageEvent);

    function initMap() {
      if (typeof maplibregl === 'undefined') {
        postToHost({ type: 'MAP_ERROR', payload: 'No se pudo cargar MapLibre GL. Revisa tu conexión.' });
        return;
      }

      map = new maplibregl.Map({
        container: 'map',
        style: buildMapStyle(currentTheme),
        center: [-72.9068, 11.5448],
        zoom: 14.5,
        pitch: 54,
        bearing: -15,
        antialias: true,
        maxPitch: 82
      });

      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-left');

      // Reconstruir todas las capas WebGL del Catastro Arbóreo 3D tras cada cambio de tema
      map.on('style.load', () => {
        styleReady = true;
        ensureTreeCadastreLayers();
        renderTreesToSources();
        renderDraftTreeToSources();
        ensurePersonGuideLayers();
        updatePersonGuideLine();
      });

      // Interacción nativa WebGL: colocar árbol 3D en modo catastro o seleccionar árbol 3D
      map.on('click', (e) => {
        if (isPickMode) {
          const lat = e.lngLat.lat;
          const lng = e.lngLat.lng;
          setDraftTree({
            lat,
            lng,
            heightMeters: draftTreeData?.heightMeters || 8,
            speciesName: draftTreeData?.speciesName || 'Árbol Nuevo'
          }, false);
          postToHost({
            type: 'MAP_PICK_LOCATION',
            payload: { lat, lng }
          });
          return;
        }

        const existingLayers = INTERACTIVE_TREE_LAYERS.filter(id => Boolean(map.getLayer(id)));
        if (existingLayers.length === 0) return;
        const hits = map.queryRenderedFeatures(e.point, { layers: existingLayers });
        if (hits && hits.length > 0) {
          const treeId = hits[0].properties?.treeId;
          if (treeId && treesById[treeId]) {
            openTreePopup(treeId);
          }
        }
      });

      map.on('mousemove', (e) => {
        if (isPickMode) {
          map.getCanvas().style.cursor = 'crosshair';
          return;
        }
        const existingLayers = INTERACTIVE_TREE_LAYERS.filter(id => Boolean(map.getLayer(id)));
        if (existingLayers.length === 0) return;
        const hits = map.queryRenderedFeatures(e.point, { layers: existingLayers });
        map.getCanvas().style.cursor = hits && hits.length > 0 ? 'pointer' : '';
      });

      map.on('load', () => {
        mapReady = true;
        styleReady = true;
        ensureTreeCadastreLayers();
        ensurePersonGuideLayers();
        const queued = pendingCommands.slice();
        pendingCommands = [];
        queued.forEach(processCommand);
        postToHost({ type: 'MAP_READY' });
      });
    }

    initMap();
  </script>
</body>
</html>
`;
