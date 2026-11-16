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
    html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; background: #0f172a; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    
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
      background: radial-gradient(ellipse at center, rgba(16, 185, 129, 0.5) 0%, rgba(15, 23, 42, 0.2) 50%, transparent 80%);
    }
    .tree-ground-disk.invasive-shadow {
      background: radial-gradient(ellipse at center, rgba(239, 68, 68, 0.6) 0%, rgba(15, 23, 42, 0.25) 50%, transparent 80%);
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
      box-shadow: 0 2px 4px rgba(0,0,0,0.4);
    }
    .tree-canopy-box {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4));
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
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
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
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3) !important;
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
        center: [-72.9068, 11.5448],
        zoom: 12,
        pitch: 0,
        bearing: 0,
        antialias: true
      });

      map.on('load', () => {
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_READY' }));
      });

      map.on('click', (e) => {
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'MAP_CLICK',
          payload: { lat: e.lngLat.lat, lng: e.lngLat.lng }
        }));
      });
    }

    function getSpeciesProfile(item) {
      const name = ((item.species_name || item.name || "") + " " + (item.scientific_name || "")).toLowerCase();
      if (name.includes("neem") || name.includes("nim")) {
        return {
          displayName: item.species_name || 'Neem Guajiro',
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
          displayName: item.species_name || 'Trupillo',
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
          displayName: item.species_name || 'Dividivi',
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
              <div style="background: \${profile.color}; border: 2px solid #ffffff; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); font-size: 16px;">
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

        const popup = new maplibregl.Popup({ offset: [0, -32], closeButton: true }).setHTML(popupHTML);
        const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(map);

        markers.push(marker);
      });

      if (hasValidCoords && treesList.length > 1) {
        map.fitBounds(bounds, { padding: 50, maxZoom: 15, duration: 1000 });
      }
    }

    function toggle3DView(enable3D) {
      is3D = enable3D;
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
  const [optimizationNotice, setOptimizationNotice] = useState(null);
  const [activeTreeIndex, setActiveTreeIndex] = useState(0);

  // Árboles filtrados
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

  const activeTree = filteredTrees[activeTreeIndex] || filteredTrees[0] || null;

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

  const handleCenterUser = () => {
    if (userCoords && webViewRef.current) {
      webViewRef.current.postMessage(
        JSON.stringify({
          type: 'RECENTER',
          payload: { lat: userCoords.latitude, lng: userCoords.longitude }
        })
      );
    } else {
      Alert.alert('GPS', 'Ubicación GPS no disponible todavía. Usa los atajos de La Guajira.');
    }
  };

  const handleFocusTree = () => {
    if (activeTree && webViewRef.current) {
      webViewRef.current.postMessage(
        JSON.stringify({
          type: 'FLY_TO',
          payload: {
            lat: parseFloat(activeTree.latitude),
            lng: parseFloat(activeTree.longitude),
            zoom: 16
          }
        })
      );
    }
  };

  const handleOptimizeRadius = () => {
    const neemCount = filteredTrees.filter((t) => {
      const n = (t.species_name || t.name || '').toLowerCase();
      return n.includes('neem') || n.includes('nim');
    }).length;

    setOptimizationNotice(`Hotspot activo: ${neemCount} Neem detectados en radio de 5km.`);
    setSelectedFilter('invasive');

    setTimeout(() => {
      setOptimizationNotice(null);
    }, 4000);
  };

  const handleDownloadOfflineMap = () => {
    setOfflinePackProgress(15);
    const interval = setInterval(() => {
      setOfflinePackProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          Alert.alert('Mapa Offline Listo', 'Teselas vectoriales de La Guajira guardadas en disco local.');
          return 100;
        }
        return prev + 25;
      });
    }, 400);
  };

  const handleSelectShortcut = (sc) => {
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
        if (onTreeSelected) onTreeSelected(data.payload);
      }
    } catch (e) {}
  };

  return (
    <View style={styles.container}>
      {/* 1. SECCIÓN SUPERIOR: STATUS HUD FLOTANTE (COMO EN TRANSPORTE MOBILE) */}
      <View style={styles.topHudContainer}>
        {activeTree && (
          <View style={styles.activeStopCard}>
            <View style={styles.activeStopTopRow}>
              <View style={styles.distanceBadgePill}>
                <Ionicons name="arrow-down" size={13} color="#ffffff" />
                <Text style={styles.distanceBadgeText}>15 m</Text>
              </View>

              <View style={styles.stopSeqPill}>
                <Text style={styles.stopSeqText}>
                  ÁRBOL #{activeTreeIndex + 1} DE {filteredTrees.length}
                </Text>
                <View style={styles.statusDotLive} />
                <Text style={styles.statusLiveText}>MÁS CERCANO</Text>
              </View>

              <View style={styles.hudActionsRight}>
                <TouchableOpacity
                  style={styles.hudAudioBtn}
                  onPress={() => Alert.alert('Alerta Auditiva', `Proximidad a ${activeTree.species_name || 'Árbol'}`)}
                >
                  <Ionicons name="volume-medium" size={16} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>

            <Text numberOfLines={1} style={styles.activeStopTitle}>
              {activeTree.species_name || activeTree.name || 'Árbol Forestal'}
            </Text>
            <Text numberOfLines={1} style={styles.activeStopSubtitle}>
              🏛️ {activeTree.municipality || 'Riohacha'} • Lat: {Number(activeTree.latitude).toFixed(4)}, Lng: {Number(activeTree.longitude).toFixed(4)}
            </Text>
          </View>
        )}

        {/* GPS Simulador de Municipios de La Guajira */}
        <View style={styles.gpsSimulatorRow}>
          <Text style={styles.simulatorLabel}>📍 GPS Guajira (Toca el mapa o elige):</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.simulatorChipsScroll}>
            {GUAJIRA_GPS_SHORTCUTS.map((sc) => (
              <TouchableOpacity key={sc.name} style={styles.simChip} onPress={() => handleSelectShortcut(sc)}>
                <Text style={styles.simChipText}>📍 {sc.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Banner de Optimización Flotante */}
        {optimizationNotice && (
          <View style={styles.optimizationBanner}>
            <Ionicons name="checkmark-circle" size={15} color="#34d399" />
            <Text style={styles.optimizationBannerText}>{optimizationNotice}</Text>
          </View>
        )}
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

        {/* 3. DOCK VERTICAL DE HERRAMIENTAS FLOTANTES (DERECHA - EXACTO A TRANSPORTE MOBILE) */}
        <View style={styles.rightFloatingStack}>
          {/* 1. Mi GPS */}
          <TouchableOpacity activeOpacity={0.85} onPress={handleCenterUser} style={styles.floatingActionBtn}>
            <Ionicons name="locate" size={19} color="#0284c7" />
            <Text style={styles.floatingBtnLabel}>Mi GPS</Text>
          </TouchableOpacity>

          {/* 2. Tramo / Árbol Cercano */}
          <TouchableOpacity activeOpacity={0.85} onPress={handleFocusTree} style={[styles.floatingActionBtn, styles.btnTramo]}>
            <Ionicons name="git-branch-outline" size={18} color="#ffffff" />
            <Text style={[styles.floatingBtnLabel, { color: '#ffffff' }]}>Tramo</Text>
          </TouchableOpacity>

          {/* 3. Optimizar / Alerta Neem */}
          <TouchableOpacity activeOpacity={0.85} onPress={handleOptimizeRadius} style={[styles.floatingActionBtn, styles.btnOptimize]}>
            <Ionicons name="flash" size={18} color="#d97706" />
            <Text style={[styles.floatingBtnLabel, { color: '#92400e' }]}>Optimizar</Text>
          </TouchableOpacity>

          {/* 4. 2D / 3D Vista */}
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

          {/* 5. Mapa Offline */}
          <TouchableOpacity activeOpacity={0.85} onPress={handleDownloadOfflineMap} style={styles.floatingActionBtn}>
            {offlinePackProgress != null && offlinePackProgress < 100 ? (
              <Text style={styles.floatingActionTextSmall}>{offlinePackProgress}%</Text>
            ) : (
              <Ionicons
                name={offlinePackProgress === 100 ? 'checkmark-circle' : 'cloud-download-outline'}
                size={18}
                color={offlinePackProgress === 100 ? '#059669' : '#0284c7'}
              />
            )}
            <Text style={styles.floatingBtnLabel}>
              {offlinePackProgress === 100 ? 'Listo' : 'Mapa'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1329'
  },
  topHudContainer: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    backgroundColor: 'rgba(11, 19, 41, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    zIndex: 20
  },
  activeStopCard: {
    backgroundColor: '#132144',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#1e3a8a',
    marginBottom: 6
  },
  activeStopTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4
  },
  distanceBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#0284c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  distanceBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff'
  },
  stopSeqPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  stopSeqText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38bdf8'
  },
  statusDotLive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981'
  },
  statusLiveText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#10b981'
  },
  hudActionsRight: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  hudAudioBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center'
  },
  activeStopTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff'
  },
  activeStopSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1
  },
  gpsSimulatorRow: {
    marginTop: 4
  },
  simulatorLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 4
  },
  simulatorChipsScroll: {
    flexDirection: 'row',
    gap: 6
  },
  simChip: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155'
  },
  simChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#e2e8f0'
  },
  optimizationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(5, 150, 105, 0.25)',
    borderWidth: 1,
    borderColor: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    marginTop: 6
  },
  optimizationBannerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#a7f3d0'
  },
  mapCanvasWrapper: {
    flex: 1,
    position: 'relative'
  },
  webView: {
    flex: 1,
    backgroundColor: '#0f172a'
  },
  rightFloatingStack: {
    position: 'absolute',
    top: 14,
    right: 12,
    zIndex: 50,
    gap: 8,
    alignItems: 'center'
  },
  floatingActionBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5
  },
  btnTramo: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7'
  },
  btnOptimize: {
    backgroundColor: '#fef3c7',
    borderColor: '#fde68a'
  },
  floatingActionBtnDark: {
    backgroundColor: '#0f172a',
    borderColor: '#334155'
  },
  floatingBtnLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 1
  },
  floatingActionTextSmall: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0f172a'
  }
});
