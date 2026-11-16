import React, { useRef, useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform
} from 'react-native';
import { WebView } from 'react-native-webview';

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
      transform: scale(1.2);
    }
    .tree-ground-disk {
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translate(-50%, 50%) rotateX(60deg);
      border-radius: 50%;
      pointer-events: none;
      width: 32px;
      height: 16px;
      background: radial-gradient(ellipse at center, rgba(16, 185, 129, 0.45) 0%, rgba(15, 23, 42, 0.15) 50%, transparent 80%);
    }
    .tree-ground-disk.invasive-shadow {
      background: radial-gradient(ellipse at center, rgba(239, 68, 68, 0.5) 0%, rgba(15, 23, 42, 0.2) 50%, transparent 80%);
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
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2) !important;
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
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    let map;
    let markers = [];
    let is3D = false;

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
        }
      } catch (e) {
        console.warn("Using fallback style", e);
      }

      map = new maplibregl.Map({
        container: 'map',
        style: mapStyle,
        center: [-72.9068, 11.5448], // La Guajira
        zoom: 11,
        pitch: 0,
        bearing: 0,
        antialias: true
      });

      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");

      map.on('load', () => {
        // Enviar evento de mapa listo a React Native
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_READY' }));
      });
    }

    function getSpeciesProfile(item) {
      const name = ((item.species_name || item.name || "") + " " + (item.scientific_name || "")).toLowerCase();
      if (name.includes("neem") || name.includes("nim") || name.includes("azadirachta")) {
        return {
          type: 'neem',
          displayName: item.species_name || 'Neem Guajiro',
          scientific: 'Azadirachta indica',
          isInvasive: true,
          tagClass: 'tag-neem',
          tagText: '🚨 Neem • Invasor',
          badgeClass: 'badge-invasive',
          badgeText: 'Invasor de Alto Impacto (Alelopatía)',
          color: '#ef4444',
          icon: '🚨',
          alert: '⚠️ Libera compuestos químicos en el suelo que impiden germinar a especies nativas.'
        };
      }
      if (name.includes("trupillo") || name.includes("prosopis")) {
        return {
          type: 'trupillo',
          displayName: item.species_name || 'Trupillo',
          scientific: 'Prosopis juliflora',
          isInvasive: false,
          tagClass: 'tag-trupillo',
          tagText: '🌿 Trupillo',
          badgeClass: 'badge-native',
          badgeText: 'Nativa Protectora',
          color: '#10b981',
          icon: '🌿',
          alert: 'Patrimonio de La Guajira: fija nitrógeno y retiene agua en temporadas secas.'
        };
      }
      if (name.includes("dividivi") || name.includes("libidibia")) {
        return {
          type: 'dividivi',
          displayName: item.species_name || 'Dividivi',
          scientific: 'Libidibia coriaria',
          isInvasive: false,
          tagClass: 'tag-dividivi',
          tagText: '🍃 Dividivi',
          badgeClass: 'badge-native',
          badgeText: 'Ancestral y Medicinal',
          color: '#0d9488',
          icon: '🍃',
          alert: 'Especie ancestral Wayuu con altas propiedades medicinales y taninos.'
        };
      }
      if (name.includes("guayacan") || name.includes("guayacán") || name.includes("handroanthus")) {
        return {
          type: 'guayacan',
          displayName: item.species_name || 'Guayacán de la Costa',
          scientific: 'Handroanthus chrysanthus',
          isInvasive: false,
          tagClass: 'tag-guayacan',
          tagText: '🌸 Guayacán',
          badgeClass: 'badge-native',
          badgeText: 'Floración y Maderable',
          color: '#eab308',
          icon: '🌸',
          alert: 'Floración espectacular que atrae polinizadores vitales para el ecosistema.'
        };
      }
      return {
        type: 'general',
        displayName: item.species_name || item.name || 'Árbol Forestal',
        scientific: item.scientific_name || 'Especie nativa',
        isInvasive: false,
        tagClass: 'tag-general',
        tagText: '🌱 Árbol',
        badgeClass: 'badge-native',
        badgeText: 'Flora Forestal',
        color: '#10b981',
        icon: '🌱',
        alert: 'Árbol georreferenciado verificado en campo.'
      };
    }

    function setTrees(treesList) {
      // Limpiar marcadores anteriores
      markers.forEach(m => m.remove());
      markers = [];

      if (!Array.isArray(treesList) || treesList.length === 0) return;

      const bounds = new maplibregl.LngLatBounds();
      let hasValidCoords = false;

      treesList.forEach(t => {
        const lat = parseFloat(t.latitude || t.lat);
        const lng = parseFloat(t.longitude || t.lng || t.lon);
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

        const popupHTML = \`
          <div>
            <div class="popup-title">\${profile.displayName}</div>
            <div class="popup-sub">\${profile.scientific}</div>
            <span class="popup-badge \${profile.badgeClass}">\${profile.badgeText}</span>
            <div class="popup-note \${profile.isInvasive ? 'invasive' : ''}">\${profile.alert}</div>
            <div style="font-size: 10px; color: #64748b; margin-top: 4px;">
              📍 \${lat.toFixed(5)}, \${lng.toFixed(5)}<br/>
              🏛️ \${t.municipality || 'La Guajira'}
            </div>
          </div>
        \`;

        const popup = new maplibregl.Popup({ offset: [0, -32], closeButton: true })
          .setHTML(popupHTML);

        const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(map);

        markers.push(marker);
      });

      if (hasValidCoords && treesList.length > 1) {
        map.fitBounds(bounds, { padding: 50, maxZoom: 15, duration: 1000 });
      } else if (hasValidCoords && treesList.length === 1) {
        map.easeTo({ center: [parseFloat(treesList[0].longitude), parseFloat(treesList[0].latitude)], zoom: 14 });
      }
    }

    function toggle3DView(enable3D) {
      is3D = enable3D;
      if (is3D) {
        map.easeTo({
          pitch: 58,
          bearing: -20,
          duration: 1200
        });
      } else {
        map.easeTo({
          pitch: 0,
          bearing: 0,
          duration: 1000
        });
      }
    }

    function recenterTo(lat, lng) {
      if (map && !isNaN(lat) && !isNaN(lng)) {
        map.easeTo({ center: [lng, lat], zoom: 15, duration: 800 });
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
          recenterTo(data.payload.lat, data.payload.lng);
        }
      } catch (e) {
        console.error('Error handling message from React Native:', e);
      }
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
  const [selectedFilter, setSelectedFilter] = useState('all'); // 'all' | 'invasive' | 'native' | 'verified'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [legendOpen, setLegendOpen] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Filtrado de árboles según la barra de control superior (idéntico a la web)
  const filteredTrees = trees.filter((tree) => {
    const name = ((tree.species_name || tree.name || '') + ' ' + (tree.scientific_name || '') + ' ' + (tree.municipality || '')).toLowerCase();
    
    // Filtro por búsqueda
    if (searchQuery.trim() && !name.includes(searchQuery.trim().toLowerCase())) {
      return false;
    }

    // Filtro por píldoras rápidas
    if (selectedFilter === 'invasive') {
      const isInvasive = name.includes('neem') || name.includes('nim') || name.includes('azadirachta');
      if (!isInvasive) return false;
    } else if (selectedFilter === 'native') {
      const isInvasive = name.includes('neem') || name.includes('nim');
      if (isInvasive) return false;
    } else if (selectedFilter === 'verified') {
      if (!tree.verified && !tree.is_verified) return false;
    }

    // Filtro por micro-categoría
    if (selectedCategory) {
      if (selectedCategory === 'frutales' && !name.includes('frutal') && !name.includes('mango') && !name.includes('guayaba')) return false;
      if (selectedCategory === 'maderables' && !name.includes('guayacan') && !name.includes('trupillo') && !name.includes('palo santo')) return false;
      if (selectedCategory === 'medicinales' && !name.includes('dividivi') && !name.includes('melocactus') && !name.includes('neem')) return false;
    }

    return true;
  });

  // Enviar árboles actualizados al WebView cuando cambie el filtrado o cargue el mapa
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
    if (webViewRef.current) {
      webViewRef.current.postMessage(
        JSON.stringify({
          type: 'TOGGLE_3D',
          payload: nextState
        })
      );
    }
  };

  const recenterGPS = () => {
    if (userCoords && webViewRef.current) {
      webViewRef.current.postMessage(
        JSON.stringify({
          type: 'RECENTER',
          payload: { lat: userCoords.latitude, lng: userCoords.longitude }
        })
      );
    }
  };

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'MAP_READY') {
        setMapLoaded(true);
      }
    } catch (e) {
      // Ignorar errores de parseo
    }
  };

  return (
    <View style={styles.container}>
      {/* Barra de Filtros Minimalista Superior (Idéntica al Mockup) */}
      <View style={styles.toolbarCard}>
        {/* Píldoras Segmentadas Rápidas */}
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

        {/* Buscador + Contador + Botón Limpiar */}
        <View style={styles.searchRow}>
          <View style={styles.searchInputContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar especie o municipio..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <View style={styles.counterBadge}>
            <View style={styles.counterDot} />
            <Text style={styles.counterText}>{filteredTrees.length} visibles</Text>
          </View>

          {(searchQuery || selectedFilter !== 'all' || selectedCategory) && (
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={() => {
                setSearchQuery('');
                setSelectedFilter('all');
                setSelectedCategory(null);
              }}
            >
              <Text style={styles.clearBtnText}>✕ Limpiar</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Micro-Categorías */}
        <View style={styles.categoryRow}>
          <Text style={styles.categoryLabel}>Categorías:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryChipsScroll}>
            <TouchableOpacity
              style={[styles.categoryChip, selectedCategory === 'frutales' && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(selectedCategory === 'frutales' ? null : 'frutales')}
            >
              <Text style={[styles.categoryChipText, selectedCategory === 'frutales' && styles.categoryChipTextActive]}>
                Árboles Frutales y Silvestres
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.categoryChip, selectedCategory === 'maderables' && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(selectedCategory === 'maderables' ? null : 'maderables')}
            >
              <Text style={[styles.categoryChipText, selectedCategory === 'maderables' && styles.categoryChipTextActive]}>
                Árboles Maderables
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.categoryChip, selectedCategory === 'medicinales' && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(selectedCategory === 'medicinales' ? null : 'medicinales')}
            >
              <Text style={[styles.categoryChipText, selectedCategory === 'medicinales' && styles.categoryChipTextActive]}>
                Árboles Ornamentales y Medicinales
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

      {/* Visor MapLibre 3D */}
      <View style={styles.mapWrapper}>
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: MAP_HTML }}
          onMessage={handleMessage}
          style={styles.webView}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#16a34a" />
              <Text style={styles.loadingText}>Cargando mapa 3D NeuralJira...</Text>
            </View>
          )}
        />

        {/* Botón Flotante 2D / 3D VISTA */}
        <TouchableOpacity style={[styles.toggle3DBtn, is3DMode && styles.toggle3DBtnActive]} onPress={toggle3D}>
          <Text style={styles.toggle3DIcon}>{is3DMode ? '🗺️' : '🌐'}</Text>
          <Text style={styles.toggle3DText}>{is3DMode ? '2D' : '3D'}</Text>
          <View style={styles.toggle3DBadge}>
            <Text style={styles.toggle3DBadgeText}>VISTA</Text>
          </View>
        </TouchableOpacity>

        {/* Botón Centrar GPS Satelital */}
        {userCoords && (
          <TouchableOpacity style={styles.recenterBtn} onPress={recenterGPS}>
            <Text style={styles.recenterIcon}>🎯</Text>
          </TouchableOpacity>
        )}

        {/* Leyenda 3D Colapsable */}
        <View style={styles.legendContainer}>
          <TouchableOpacity style={styles.legendToggleBtn} onPress={() => setLegendOpen(!legendOpen)}>
            <Text style={styles.legendIcon}>🌿</Text>
            <Text style={styles.legendBtnText}>Leyenda 3D</Text>
            <Text style={styles.legendArrow}>{legendOpen ? '▾' : '▴'}</Text>
          </TouchableOpacity>

          {legendOpen && (
            <View style={styles.legendChipsBox}>
              <View style={styles.legendChip}>
                <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                <Text style={styles.legendChipLabel}>🚨 Neem (Invasor)</Text>
              </View>
              <View style={styles.legendChip}>
                <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                <Text style={styles.legendChipLabel}>🌿 Trupillo (Nativo)</Text>
              </View>
              <View style={styles.legendChip}>
                <View style={[styles.legendDot, { backgroundColor: '#eab308' }]} />
                <Text style={styles.legendChipLabel}>🌸 Guayacán (Flor)</Text>
              </View>
              <View style={styles.legendChip}>
                <View style={[styles.legendDot, { backgroundColor: '#0d9488' }]} />
                <Text style={styles.legendChipLabel}>🍃 Dividivi (Ancestral)</Text>
              </View>
              <View style={styles.legendChip}>
                <View style={[styles.legendDot, { backgroundColor: '#1e3a8a' }]} />
                <Text style={styles.legendChipLabel}>🌵 Cardón Guajiro</Text>
              </View>
            </View>
          )}
        </View>

        {/* Toast Flotante cuando 0 árboles coinciden */}
        {filteredTrees.length === 0 && (
          <View style={styles.emptyToast}>
            <Text style={styles.emptyToastIcon}>🍃</Text>
            <Text style={styles.emptyToastText}>No se encontraron árboles con los filtros activos.</Text>
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setSelectedFilter('all');
                setSelectedCategory(null);
              }}
            >
              <Text style={styles.emptyToastLink}>Mostrar todos</Text>
            </TouchableOpacity>
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
  toolbarCard: {
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3
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
    marginTop: 4
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
  searchIcon: {
    fontSize: 14,
    marginRight: 6
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
    paddingVertical: 6,
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
  clearBtn: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6
  },
  clearBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#b91c1c'
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b'
  },
  categoryChipsScroll: {
    flexDirection: 'row',
    gap: 6
  },
  categoryChip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  categoryChipActive: {
    backgroundColor: '#dcfce7',
    borderColor: '#16a34a'
  },
  categoryChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569'
  },
  categoryChipTextActive: {
    color: '#15803d',
    fontWeight: '700'
  },
  mapWrapper: {
    flex: 1,
    position: 'relative'
  },
  webView: {
    flex: 1
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b'
  },
  toggle3DBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 4
  },
  toggle3DBtnActive: {
    backgroundColor: '#0f172a'
  },
  toggle3DIcon: {
    fontSize: 14
  },
  toggle3DText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a'
  },
  toggle3DBadge: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4
  },
  toggle3DBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ffffff'
  },
  recenterBtn: {
    position: 'absolute',
    top: 60,
    right: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4
  },
  recenterIcon: {
    fontSize: 16
  },
  legendContainer: {
    position: 'absolute',
    bottom: 20,
    right: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 4,
    overflow: 'hidden',
    maxWidth: 240
  },
  legendToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10
  },
  legendIcon: {
    fontSize: 12
  },
  legendBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a'
  },
  legendArrow: {
    fontSize: 10,
    color: '#64748b'
  },
  legendChipsBox: {
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 4
  },
  legendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  legendChipLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#334155'
  },
  emptyToast: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    elevation: 6
  },
  emptyToastIcon: {
    fontSize: 14
  },
  emptyToastText: {
    flex: 1,
    fontSize: 11,
    color: '#f8fafc',
    fontWeight: '500'
  },
  emptyToastLink: {
    fontSize: 11,
    color: '#38bdf8',
    fontWeight: '700'
  }
});
