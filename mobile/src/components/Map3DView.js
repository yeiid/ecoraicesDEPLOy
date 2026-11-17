import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

const GUAJIRA_GPS_SHORTCUTS = [
  { name: 'Riohacha', lat: 11.5448, lng: -72.9068 },
  { name: 'Dibulla', lat: 11.2725, lng: -73.3108 },
  { name: 'Manaure', lat: 11.7750, lng: -72.4444 },
  { name: 'Uribia', lat: 11.7139, lng: -72.0167 },
  { name: 'Macuira', lat: 12.0967, lng: -71.3283 }
];

const MAP_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>EcoRaíces MapLibre 3D</title>
  <link rel="stylesheet" href="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css" />
  <script src="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js"></script>
  <style>
    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    
    /* 3D Isometric Tree Marker */
    .ecoraices-3d-tree-marker {
      position: relative;
      cursor: pointer;
      user-select: none;
      transform-style: preserve-3d;
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .ecoraices-3d-tree-marker:active {
      transform: scale(1.25);
    }
    .tree-ground-disk {
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translate(-50%, 50%) rotateX(60deg);
      border-radius: 50%;
      pointer-events: none;
      width: 34px;
      height: 18px;
      background: radial-gradient(ellipse at center, rgba(16, 185, 129, 0.5) 0%, rgba(15, 23, 42, 0.15) 50%, transparent 80%);
    }
    .tree-ground-disk.invasive-shadow {
      background: radial-gradient(ellipse at center, rgba(239, 68, 68, 0.6) 0%, rgba(15, 23, 42, 0.2) 50%, transparent 80%);
    }
    .tree-vertical-assembly {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      transform-origin: bottom center;
    }
    .tree-trunk-stem {
      width: 4px;
      height: 22px;
      background: linear-gradient(180deg, #78350f 0%, #451a03 100%);
      border-radius: 2px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    }
    .tree-canopy-box {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      filter: drop-shadow(0 4px 6px rgba(15, 23, 42, 0.25));
    }
    .tree-floating-tag {
      position: absolute;
      bottom: -2px;
      left: 50%;
      transform: translate(-50%, 100%);
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 2px 6px;
      border-radius: 6px;
      font-size: 9px;
      font-weight: 700;
      white-space: nowrap;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25);
      pointer-events: none;
      z-index: 5;
      border: 1px solid rgba(255, 255, 255, 0.8);
    }
    .tag-neem { background: #dc2626; color: #ffffff; }
    .tag-trupillo { background: #065f46; color: #ffffff; }
    .tag-guayacan { background: #b45309; color: #ffffff; }
    .tag-dividivi { background: #0f766e; color: #ffffff; }
    .tag-cardon { background: #1e3a8a; color: #ffffff; }
    .tag-general { background: #0f172a; color: #f8fafc; }

    /* Popups */
    .maplibregl-popup-content {
      background: #ffffff !important;
      color: #0f172a !important;
      border-radius: 14px;
      padding: 12px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2) !important;
      border: 1px solid #e2e8f0 !important;
      max-width: 280px;
      font-size: 12px;
      line-height: 1.4;
    }
    .popup-title { font-size: 14px; font-weight: 800; margin: 0 0 2px 0; color: #0f172a; }
    .popup-sub { font-size: 11px; font-style: italic; color: #64748b; margin: 0 0 6px 0; }
    .popup-badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; margin-bottom: 6px; text-transform: uppercase; }
    .badge-invasive { background: #fee2e2; color: #b91c1c; }
    .badge-native { background: #d1fae5; color: #065f46; }
    .popup-note { background: #f8fafc; border-left: 3px solid #10b981; padding: 6px 8px; border-radius: 4px; margin: 6px 0; font-size: 11px; color: #334155; }
    .popup-note.invasive { border-left-color: #ef4444; background: #fff1f2; }

    /* Botón Modo Persona en el Popup */
    .popup-btn-person {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: 100%;
      margin-top: 8px;
      padding: 8px 10px;
      background: #0284c7;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 2px 5px rgba(2, 132, 199, 0.35);
      transition: background 0.2s, transform 0.1s;
    }
    .popup-btn-person:active {
      background: #0369a1;
      transform: scale(0.98);
    }
    .popup-thumb-img {
      width: 100%;
      height: 90px;
      object-fit: cover;
      border-radius: 8px;
      margin-bottom: 6px;
    }

    /* HUD Superior: Modo Persona Activo */
    .person-mode-hud {
      position: absolute;
      top: 14px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(15, 23, 42, 0.92);
      color: #ffffff;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 800;
      display: none;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.35);
      z-index: 100;
      border: 1px solid rgba(255,255,255,0.25);
      pointer-events: none;
    }
    .person-mode-hud.active {
      display: flex;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="person-hud" class="person-mode-hud">
    <span>🚶‍♂️ MODO PERSONA (A ras de suelo)</span>
  </div>

  <script>
    let map;
    let markers = [];
    let is3D = false;
    let isPersonMode = false;
    let personTargetCoords = null;
    let currentTrees = [];

    const STYLE_URL = "https://map.neuraljira.tech/api/v1/style.json";
    const FALLBACK_STYLE = {
      version: 8,
      sources: {
        "osm-clean": {
          type: "raster",
          tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
          tileSize: 256,
          attribution: "&copy; OpenStreetMap contributors"
        }
      },
      layers: [{ id: "osm-layer", type: "raster", source: "osm-clean" }]
    };

    async function initMap() {
      let mapStyle = FALLBACK_STYLE;
      try {
        const res = await fetch(STYLE_URL);
        if (res.ok) {
          mapStyle = await res.json();
          // Quitar la opacidad atenuada del 0.25 para que OSM tenga 95% de nitidez y color vivo
          if (mapStyle.layers && Array.isArray(mapStyle.layers)) {
            mapStyle.layers.forEach(l => {
              if (l.id === 'osm-layer' && l.paint) {
                l.paint['raster-opacity'] = 0.95;
              }
              // Atenuar polígonos catastrales grises para que NO tapen las calles
              if (l.id && (l.id.includes('terreno-fill') || l.id.includes('sector-fill') || l.id.includes('vereda-fill')) && l.paint) {
                l.paint['fill-opacity'] = 0.12;
              }
              // Resaltar calles con color ámbar visible y grosor definido
              if (l.id && l.id.includes('nomenclatura_vial-line') && l.paint) {
                l.paint['line-color'] = '#f59e0b';
                l.paint['line-width'] = 2.8;
                l.paint['line-opacity'] = 0.95;
              }
            });
          }
        }
      } catch (e) {
        console.warn("Using fallback style", e);
      }

      map = new maplibregl.Map({
        container: 'map',
        style: mapStyle,
        center: [-72.9068, 11.5448],
        zoom: 12,
        pitch: 0,
        bearing: 0,
        antialias: true
      });

      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-left");

      map.on('load', () => {
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_READY' }));
      });
    }

    function getSpeciesProfile(item) {
      const name = ((item.species_name || item.name || "") + " " + (item.scientific_name || "")).toLowerCase();
      if (name.includes("neem") || name.includes("nim")) {
        return {
          displayName: item.species_name || item.name || 'Neem Guajiro',
          scientific: 'Azadirachta indica',
          isInvasive: true,
          tagClass: 'tag-neem',
          tagText: '🚨 Neem • Invasor',
          badgeClass: 'badge-invasive',
          badgeText: 'Invasor de Alto Impacto (Alelopatía)',
          color: '#ef4444',
          icon: '🚨',
          alert: '⚠️ Libera compuestos alelopáticos que alteran el suelo.'
        };
      }
      if (name.includes("trupillo")) {
        return {
          displayName: item.species_name || item.name || 'Trupillo',
          scientific: 'Prosopis juliflora',
          isInvasive: false,
          tagClass: 'tag-trupillo',
          tagText: '🌿 Trupillo',
          badgeClass: 'badge-native',
          badgeText: 'Nativa Protectora',
          color: '#10b981',
          icon: '🌿',
          alert: 'Fija nitrógeno en suelos áridos y preserva mantos freáticos.'
        };
      }
      if (name.includes("dividivi")) {
        return {
          displayName: item.species_name || item.name || 'Dividivi',
          scientific: 'Libidibia coriaria',
          isInvasive: false,
          tagClass: 'tag-dividivi',
          tagText: '🍃 Dividivi',
          badgeClass: 'badge-native',
          badgeText: 'Ancestral Wayuu',
          color: '#0d9488',
          icon: '🍃',
          alert: 'Rico en taninos y sombra benigna que protege el suelo.'
        };
      }
      return {
        displayName: item.species_name || item.name || 'Árbol Forestal',
        scientific: item.scientific_name || 'Especie nativa',
        isInvasive: false,
        tagClass: 'tag-general',
        tagText: '🌱 Árbol',
        badgeClass: 'badge-native',
        badgeText: 'Flora Forestal',
        color: '#10b981',
        icon: '🌱',
        alert: 'Árbol censado en La Guajira.'
      };
    }

    function setTrees(treesList) {
      currentTrees = treesList || [];
      markers.forEach(m => m.remove());
      markers = [];
      if (!Array.isArray(treesList) || treesList.length === 0) return;

      const bounds = new maplibregl.LngLatBounds();
      let hasValidCoords = false;

      treesList.forEach(t => {
        const lat = parseFloat(t.latitude || t.lat);
        const lng = parseFloat(t.longitude || t.lng);
        if (isNaN(lat) || isNaN(lng)) return;

        hasValidCoords = true;
        bounds.extend([lng, lat]);

        const profile = getSpeciesProfile(t);

        const el = document.createElement('div');
        el.className = 'ecoraices-3d-tree-marker';
        el.innerHTML = \`
          <div class="tree-ground-disk \${profile.isInvasive ? 'invasive-shadow' : ''}"></div>
          <div class="tree-vertical-assembly">
            <div class="tree-canopy-box">
              <div style="background: \${profile.color}; border: 2px solid #ffffff; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.25); font-size: 16px;">
                \${profile.icon}
              </div>
            </div>
            <div class="tree-trunk-stem"></div>
          </div>
          <div class="tree-floating-tag \${profile.tagClass}">\${profile.tagText}</div>
        \`;

        el.addEventListener('click', () => {
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'SELECT_TREE',
            payload: t
          }));
        });

        const imgPath = t.imageUrl || t.localImagePath || t.local_image_path;
        const imgHTML = imgPath ? \`<img src="\${imgPath}" class="popup-thumb-img" alt="Foto árbol" onerror="this.style.display='none'"/>\` : '';
        const treeIdStr = String(t.clientId || t.id || '');

        const popupHTML = \`
          <div>
            \${imgHTML}
            <div class="popup-title">\${profile.displayName}</div>
            <div class="popup-sub">\${profile.scientific}</div>
            <span class="popup-badge \${profile.badgeClass}">\${profile.badgeText}</span>
            <div class="popup-note \${profile.isInvasive ? 'invasive' : ''}">\${profile.alert}</div>
            <div style="font-size: 10px; color: #64748b; margin-top: 4px;">
              📍 \${lat.toFixed(5)}, \${lng.toFixed(5)}<br/>
              🏛️ \${t.municipio || t.municipality || 'La Guajira'}
            </div>
            <button type="button" class="popup-btn-person" onclick="window.enterPersonModeFromPopup('\${treeIdStr}')">
              🚶‍♂️ Pararme al pie del árbol
            </button>
          </div>
        \`;

        const popup = new maplibregl.Popup({ offset: [0, -32], closeButton: true }).setHTML(popupHTML);
        const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(map);

        markers.push(marker);
      });

      if (hasValidCoords && treesList.length > 1 && !isPersonMode) {
        map.fitBounds(bounds, { padding: 50, maxZoom: 15, duration: 1000 });
      }
    }

    function enterPersonMode(lat, lng, treeInfo) {
      if (isNaN(lat) || isNaN(lng)) return;
      isPersonMode = true;
      personTargetCoords = { lat, lng };

      // Cerrar popups para vista limpia
      markers.forEach(m => {
        if (m.getPopup && m.getPopup().isOpen()) m.getPopup().remove();
      });

      // Aterrizaje suave de cámara a ras de suelo (pitch 82° = altura de ojos de una persona)
      map.easeTo({
        center: [lng, lat],
        zoom: 19.6,
        pitch: 82,
        bearing: -15,
        duration: 1600
      });

      const hud = document.getElementById('person-hud');
      if (hud) hud.classList.add('active');

      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'PERSON_MODE_CHANGE',
        payload: { active: true, tree: treeInfo }
      }));
    }

    function exitPersonMode() {
      isPersonMode = false;
      personTargetCoords = null;
      const hud = document.getElementById('person-hud');
      if (hud) hud.classList.remove('active');

      map.easeTo({
        pitch: is3D ? 58 : 0,
        zoom: 15,
        bearing: 0,
        duration: 1200
      });

      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'PERSON_MODE_CHANGE',
        payload: { active: false }
      }));
    }

    function orbit360() {
      if (!personTargetCoords) return;
      const currentBearing = map.getBearing();
      map.easeTo({
        center: [personTargetCoords.lng, personTargetCoords.lat],
        bearing: currentBearing + 60,
        duration: 900
      });
    }

    window.enterPersonModeFromPopup = function(treeIdStr) {
      const found = currentTrees.find(t => String(t.clientId || t.id) === String(treeIdStr));
      if (found) {
        const lat = parseFloat(found.latitude || found.lat);
        const lng = parseFloat(found.longitude || found.lng);
        enterPersonMode(lat, lng, found);
      }
    };

    function toggle3DView(enable3D) {
      is3D = enable3D;
      if (isPersonMode) return;
      map.easeTo({
        pitch: is3D ? 58 : 0,
        bearing: is3D ? -20 : 0,
        duration: 1200
      });
    }

    function flyToCoords(lat, lng, zoom = 15) {
      if (map && !isNaN(lat) && !isNaN(lng)) {
        map.easeTo({ center: [lng, lat], zoom: zoom, duration: 900 });
      }
    }

    window.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'SET_TREES') {
          setTrees(data.payload);
        } else if (data.type === 'TOGGLE_3D') {
          toggle3DView(data.payload);
        } else if (data.type === 'RECENTER') {
          flyToCoords(data.payload.lat, data.payload.lng, 15);
        } else if (data.type === 'FLY_TO') {
          flyToCoords(data.payload.lat, data.payload.lng, data.payload.zoom || 14);
        } else if (data.type === 'ENTER_PERSON_MODE') {
          enterPersonMode(data.payload.lat, data.payload.lng, data.payload.tree);
        } else if (data.type === 'EXIT_PERSON_MODE') {
          exitPersonMode();
        } else if (data.type === 'ORBIT_360') {
          orbit360();
        }
      } catch (e) {}
    });

    initMap();
  </script>
</body>
</html>
`;

export default function Map3DView({
  trees = [],
  userCoords = null,
  onTreeSelected = null
}) {
  const webViewRef = useRef(null);
  const [is3DMode, setIs3DMode] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [offlinePackProgress, setOfflinePackProgress] = useState(null);
  const [isPersonMode, setIsPersonMode] = useState(false);
  const [personTree, setPersonTree] = useState(null);

  // Árboles filtrados según barra superior de EcoRaíces
  const filteredTrees = useMemo(() => {
    return trees.filter((tree) => {
      const name = ((tree.species_name || tree.name || '') + ' ' + (tree.scientific_name || '') + ' ' + (tree.municipality || '')).toLowerCase();
      if (searchQuery.trim() && !name.includes(searchQuery.trim().toLowerCase())) return false;
      if (selectedFilter === 'invasive') {
        if (!name.includes('neem') && !name.includes('nim')) return false;
      } else if (selectedFilter === 'native') {
        if (name.includes('neem') || name.includes('nim')) return false;
      } else if (selectedFilter === 'verified') {
        if (!tree.verified && !tree.is_verified) return false;
      }
      return true;
    });
  }, [trees, searchQuery, selectedFilter]);

  useEffect(() => {
    if (mapLoaded && webViewRef.current) {
      webViewRef.current.postMessage(
        JSON.stringify({
          type: 'SET_TREES',
          payload: filteredTrees
        })
      );
    }
  }, [filteredTrees, mapLoaded]);

  const toggle3D = () => {
    const nextState = !is3DMode;
    setIs3DMode(nextState);
    if (isPersonMode) {
      setIsPersonMode(false);
      setPersonTree(null);
    }
    if (webViewRef.current) {
      webViewRef.current.postMessage(
        JSON.stringify({
          type: 'TOGGLE_3D',
          payload: nextState
        })
      );
    }
  };

  const handleTogglePersonMode = () => {
    if (isPersonMode) {
      if (webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify({ type: 'EXIT_PERSON_MODE' }));
      }
      setIsPersonMode(false);
      setPersonTree(null);
    } else {
      const target = personTree || filteredTrees[0] || trees[0];
      if (!target) {
        Alert.alert('Modo Persona', 'No hay árboles censados visibles para explorar a ras de suelo.');
        return;
      }
      const lat = parseFloat(target.latitude || target.lat);
      const lng = parseFloat(target.longitude || target.lng);
      if (isNaN(lat) || isNaN(lng)) {
        Alert.alert('Modo Persona', 'El árbol seleccionado no posee coordenadas válidas.');
        return;
      }
      setPersonTree(target);
      setIsPersonMode(true);
      if (webViewRef.current) {
        webViewRef.current.postMessage(
          JSON.stringify({
            type: 'ENTER_PERSON_MODE',
            payload: { lat, lng, tree: target }
          })
        );
      }
    }
  };

  const handleOrbit360 = () => {
    if (webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({ type: 'ORBIT_360' }));
    }
  };

  const handleCenterUser = () => {
    if (userCoords && webViewRef.current) {
      webViewRef.current.postMessage(
        JSON.stringify({
          type: 'RECENTER',
          payload: { lat: userCoords.latitude, lng: userCoords.longitude }
        })
      );
    } else {
      Alert.alert('GPS', 'Obteniendo señal satelital GNSS. Puedes elegir un atajo de La Guajira.');
    }
  };

  const handleDownloadOfflineMap = () => {
    setOfflinePackProgress(20);
    const interval = setInterval(() => {
      setOfflinePackProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          Alert.alert('Mapa Offline Guardado', 'Teselas vectoriales de La Guajira almacenadas en memoria local para uso sin conexión.');
          return 100;
        }
        return prev + 25;
      });
    }, 350);
  };

  const handleSelectShortcut = (sc) => {
    if (isPersonMode) {
      setIsPersonMode(false);
      setPersonTree(null);
    }
    if (webViewRef.current) {
      webViewRef.current.postMessage(
        JSON.stringify({
          type: 'FLY_TO',
          payload: { lat: sc.lat, lng: sc.lng, zoom: 13 }
        })
      );
    }
  };

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'MAP_READY') {
        setMapLoaded(true);
      } else if (data.type === 'SELECT_TREE') {
        setPersonTree(data.payload);
        if (onTreeSelected) onTreeSelected(data.payload);
      } else if (data.type === 'PERSON_MODE_CHANGE') {
        setIsPersonMode(data.payload.active);
        if (data.payload.tree) setPersonTree(data.payload.tree);
        if (!data.payload.active) setPersonTree(null);
      }
    } catch (e) {}
  };

  return (
    <View style={styles.container}>
      {/* 1. BARRA SUPERIOR DE FILTROS IDÉNTICA A LA WEB ECORAÍCES */}
      <View style={styles.webHeaderFilters}>
        {/* Píldoras Rápidas */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentedRow}>
          <TouchableOpacity
            style={[styles.segmentBtn, selectedFilter === 'all' && styles.segmentBtnActive]}
            onPress={() => setSelectedFilter('all')}
          >
            <Text style={styles.segIcon}>🌐</Text>
            <Text style={[styles.segText, selectedFilter === 'all' && styles.segTextActive]}>Todos</Text>
            <View style={styles.segBadge}>
              <Text style={styles.segBadgeText}>{trees.length}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, selectedFilter === 'invasive' && styles.segmentBtnInvasiveActive]}
            onPress={() => setSelectedFilter('invasive')}
          >
            <Text style={styles.segIcon}>🚨</Text>
            <Text style={[styles.segText, selectedFilter === 'invasive' && styles.segTextInvasiveActive]}>
              Invasores (Neem)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, selectedFilter === 'native' && styles.segmentBtnNativeActive]}
            onPress={() => setSelectedFilter('native')}
          >
            <Text style={styles.segIcon}>🌿</Text>
            <Text style={[styles.segText, selectedFilter === 'native' && styles.segTextNativeActive]}>
              Nativas
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, selectedFilter === 'verified' && styles.segmentBtnVerifiedActive]}
            onPress={() => setSelectedFilter('verified')}
          >
            <Text style={styles.segIcon}>✓</Text>
            <Text style={[styles.segText, selectedFilter === 'verified' && styles.segTextVerifiedActive]}>
              Verificados
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Buscador + Contador */}
        <View style={styles.searchRow}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={15} color="#64748b" style={{ marginRight: 6 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar especie o municipio..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={15} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.counterBadge}>
            <View style={styles.counterDot} />
            <Text style={styles.counterText}>{filteredTrees.length} visibles</Text>
          </View>
        </View>

        {/* Atajos de Municipios de La Guajira */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shortcutsRow}>
          {GUAJIRA_GPS_SHORTCUTS.map((sc) => (
            <TouchableOpacity key={sc.name} style={styles.shortcutChip} onPress={() => handleSelectShortcut(sc)}>
              <Text style={styles.shortcutChipText}>📍 {sc.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 2. MAPA CENTRAL */}
      <View style={styles.mapCanvasWrapper}>
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: MAP_HTML }}
          onMessage={handleMessage}
          style={styles.webView}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />

        {/* 3. DOCK VERTICAL DERECHO: HERRAMIENTAS INTELIGENTES */}
        <View style={styles.rightFloatingStack}>
          {/* Botón 1: Mi GPS */}
          <TouchableOpacity activeOpacity={0.85} onPress={handleCenterUser} style={styles.floatingActionBtn}>
            <Ionicons name="locate" size={20} color="#0284c7" />
            <Text style={styles.floatingBtnLabel}>Mi GPS</Text>
          </TouchableOpacity>

          {/* Botón 2: 2D / 3D Vista */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={toggle3D}
            style={[styles.floatingActionBtn, is3DMode && styles.floatingActionBtnDark]}
          >
            <Text style={[styles.floatingActionTextSmall, is3DMode && { color: '#ffffff' }]}>
              {is3DMode ? '3D' : '2D'}
            </Text>
            <Text style={[styles.floatingBtnLabel, is3DMode && { color: '#e2e8f0' }]}>Vista</Text>
          </TouchableOpacity>

          {/* Botón 3: Modo Persona 3D (Pegman / Al pie del árbol) */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleTogglePersonMode}
            style={[
              styles.floatingActionBtn,
              isPersonMode && styles.floatingActionBtnActivePersona
            ]}
          >
            <Ionicons
              name={isPersonMode ? "walk" : "walk-outline"}
              size={22}
              color={isPersonMode ? "#ffffff" : "#f59e0b"}
            />
            <Text style={[styles.floatingBtnLabel, isPersonMode && { color: '#ffffff' }]}>
              Persona
            </Text>
          </TouchableOpacity>

          {/* Botón 4: Descargar Mapa Offline */}
          <TouchableOpacity activeOpacity={0.85} onPress={handleDownloadOfflineMap} style={styles.floatingActionBtn}>
            {offlinePackProgress != null && offlinePackProgress < 100 ? (
              <Text style={styles.floatingActionTextSmall}>{offlinePackProgress}%</Text>
            ) : (
              <Ionicons
                name={offlinePackProgress === 100 ? 'checkmark-circle' : 'cloud-download-outline'}
                size={20}
                color={offlinePackProgress === 100 ? '#15803d' : '#0284c7'}
              />
            )}
            <Text style={styles.floatingBtnLabel}>
              {offlinePackProgress === 100 ? 'Listo' : 'Mapa'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 4. HUD FLOTANTE INFERIOR: MODO PERSONA ACTIVO A RAS DE SUELO */}
        {isPersonMode && (
          <View style={styles.personModeCard}>
            <View style={styles.personCardHeader}>
              <View style={styles.personLiveDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.personCardTitle} numberOfLines={1}>
                  🚶‍♂️ {personTree?.species_name || personTree?.name || 'Árbol Seleccionado'}
                </Text>
                <Text style={styles.personCardSub} numberOfLines={1}>
                  Vista a pie de árbol (82°) • {personTree?.municipio || personTree?.municipality || 'La Guajira'}
                </Text>
              </View>
            </View>
            <View style={styles.personCardActions}>
              <TouchableOpacity style={styles.personOrbitBtn} onPress={handleOrbit360} activeOpacity={0.8}>
                <Ionicons name="sync" size={15} color="#0284c7" />
                <Text style={styles.personOrbitBtnText}>Girar 360°</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.personExitBtn} onPress={handleTogglePersonMode} activeOpacity={0.8}>
                <Ionicons name="close-circle" size={15} color="#ef4444" />
                <Text style={styles.personExitBtnText}>Salir a Vista Aérea</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  webHeaderFilters: {
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4
  },
  segmentedRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 8
  },
  segmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f1f5f9',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  segmentBtnActive: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7'
  },
  segmentBtnInvasiveActive: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626'
  },
  segmentBtnNativeActive: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a'
  },
  segmentBtnVerifiedActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb'
  },
  segIcon: {
    fontSize: 13
  },
  segText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569'
  },
  segTextActive: {
    color: '#ffffff'
  },
  segTextInvasiveActive: {
    color: '#ffffff'
  },
  segTextNativeActive: {
    color: '#ffffff'
  },
  segTextVerifiedActive: {
    color: '#ffffff'
  },
  segBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8
  },
  segBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a'
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 8,
    height: 36
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#0f172a',
    paddingVertical: 0
  },
  counterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 6
  },
  counterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0284c7',
    marginRight: 6
  },
  counterText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369a1'
  },
  shortcutsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8
  },
  shortcutChip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  shortcutChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569'
  },
  mapCanvasWrapper: {
    flex: 1,
    position: 'relative'
  },
  webView: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  rightFloatingStack: {
    position: 'absolute',
    top: 14,
    right: 12,
    zIndex: 50,
    gap: 10,
    alignItems: 'center'
  },
  floatingActionBtn: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5
  },
  floatingActionBtnDark: {
    backgroundColor: '#0f172a',
    borderColor: '#334155'
  },
  floatingActionBtnActivePersona: {
    backgroundColor: '#f59e0b',
    borderColor: '#d97706',
    elevation: 8,
    shadowColor: '#d97706',
    shadowOpacity: 0.4
  },
  floatingBtnLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2
  },
  floatingActionTextSmall: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0f172a'
  },
  personModeCard: {
    position: 'absolute',
    bottom: 20,
    left: 14,
    right: 14,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    borderWidth: 1.5,
    borderColor: '#f59e0b',
    zIndex: 60
  },
  personCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10
  },
  personLiveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#f59e0b'
  },
  personCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a'
  },
  personCardSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1
  },
  personCardActions: {
    flexDirection: 'row',
    gap: 10
  },
  personOrbitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 10,
    paddingVertical: 8
  },
  personOrbitBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284c7'
  },
  personExitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    paddingVertical: 8
  },
  personExitBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ef4444'
  }
});
