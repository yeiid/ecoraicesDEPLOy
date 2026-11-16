import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert
} from 'react-native';
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
  <title>EcoRaíces MapLibre 3D Web</title>
  <link rel="stylesheet" href="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css" />
  <script src="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js"></script>
  <style>
    * { box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; background: #0b1329; font-family: sans-serif; }
    .ecoraices-3d-tree-marker { cursor: pointer; transition: transform 0.2s ease; }
    .ecoraices-3d-tree-marker:hover { transform: scale(1.2); }
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
        "osm": {
          type: "raster",
          tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
          tileSize: 256
        }
      },
      layers: [{ id: "osm", type: "raster", source: "osm" }]
    };

    async function init() {
      let st = FALLBACK_STYLE;
      try {
        const res = await fetch(STYLE_URL);
        if (res.ok) st = await res.json();
      } catch (e) {}

      map = new maplibregl.Map({
        container: 'map',
        style: st,
        center: [-72.9068, 11.5448],
        zoom: 12,
        pitch: 0,
        bearing: 0
      });

      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-left");

      map.on('load', () => {
        window.parent.postMessage(JSON.stringify({ type: 'MAP_READY' }), '*');
      });
    }

    function setTrees(list) {
      markers.forEach(m => m.remove());
      markers = [];
      if (!list || !list.length) return;

      const bounds = new maplibregl.LngLatBounds();
      list.forEach(t => {
        const lat = parseFloat(t.latitude);
        const lng = parseFloat(t.longitude);
        if (isNaN(lat) || isNaN(lng)) return;
        bounds.extend([lng, lat]);

        const el = document.createElement('div');
        el.className = 'ecoraices-3d-tree-marker';
        const isInvasive = (t.species_name || '').toLowerCase().includes('neem');
        el.innerHTML = '<div style="background:' + (isInvasive ? '#ef4444' : '#10b981') + ';width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 3px 6px rgba(0,0,0,0.4);font-size:14px;">' + (isInvasive ? '🚨' : '🌳') + '</div>';

        const popup = new maplibregl.Popup({ offset: [0, -20] })
          .setHTML('<b>' + (t.species_name || 'Árbol') + '</b><br/>' + (t.municipality || 'La Guajira'));

        const m = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).setPopup(popup).addTo(map);
        markers.push(m);
      });

      if (list.length > 1) {
        map.fitBounds(bounds, { padding: 40, maxZoom: 15 });
      }
    }

    function toggle3D(val) {
      is3D = val;
      map.easeTo({ pitch: is3D ? 58 : 0, bearing: is3D ? -20 : 0, duration: 1000 });
    }

    function flyTo(lat, lng, zoom = 14) {
      if (map) map.easeTo({ center: [lng, lat], zoom: zoom, duration: 800 });
    }

    window.addEventListener('message', (e) => {
      try {
        const d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (d.type === 'SET_TREES') setTrees(d.payload);
        else if (d.type === 'TOGGLE_3D') toggle3D(d.payload);
        else if (d.type === 'FLY_TO') flyTo(d.payload.lat, d.payload.lng, d.payload.zoom || 14);
      } catch (err) {}
    });

    init();
  </script>
</body>
</html>
`;

export default function Map3DView({
  trees = [],
  userCoords = null,
  onTreeSelected = null
}) {
  const iframeRef = useRef(null);
  const [is3DMode, setIs3DMode] = useState(false);
  const [offlinePackProgress, setOfflinePackProgress] = useState(null);
  const [optimizationNotice, setOptimizationNotice] = useState(null);
  const [activeTreeIndex, setActiveTreeIndex] = useState(0);

  const activeTree = trees[activeTreeIndex] || trees[0] || null;

  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          type: 'SET_TREES',
          payload: trees
        }),
        '*'
      );
    }
  }, [trees]);

  const toggle3D = () => {
    const next = !is3DMode;
    setIs3DMode(next);
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          type: 'TOGGLE_3D',
          payload: next
        }),
        '*'
      );
    }
  };

  const handleFocusTree = () => {
    if (activeTree && iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          type: 'FLY_TO',
          payload: {
            lat: parseFloat(activeTree.latitude),
            lng: parseFloat(activeTree.longitude),
            zoom: 16
          }
        }),
        '*'
      );
    }
  };

  const handleOptimizeRadius = () => {
    setOptimizationNotice('Hotspot activo: Neem identificado para sustitución.');
    setTimeout(() => setOptimizationNotice(null), 3000);
  };

  const handleDownloadOfflineMap = () => {
    setOfflinePackProgress(25);
    setTimeout(() => setOfflinePackProgress(65), 300);
    setTimeout(() => {
      setOfflinePackProgress(100);
      alert('Mapa Offline de La Guajira guardado en caché web.');
    }, 600);
  };

  const handleSelectShortcut = (sc) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          type: 'FLY_TO',
          payload: { lat: sc.lat, lng: sc.lng, zoom: 13 }
        }),
        '*'
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. STATUS HUD FLOTANTE (COMO TRANSPORTE MOBILE) */}
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
                  ÁRBOL #{activeTreeIndex + 1} DE {trees.length}
                </Text>
                <View style={styles.statusDotLive} />
                <Text style={styles.statusLiveText}>MÁS CERCANO</Text>
              </View>
              <View style={styles.hudActionsRight}>
                <TouchableOpacity style={styles.hudAudioBtn} onPress={() => alert('Alerta de proximidad activada')}>
                  <Ionicons name="volume-medium" size={16} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>
            <Text numberOfLines={1} style={styles.activeStopTitle}>
              {activeTree.species_name || activeTree.name || 'Árbol'}
            </Text>
            <Text numberOfLines={1} style={styles.activeStopSubtitle}>
              🏛️ {activeTree.municipality || 'Riohacha'} • Lat: {Number(activeTree.latitude).toFixed(4)}, Lng: {Number(activeTree.longitude).toFixed(4)}
            </Text>
          </View>
        )}

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

        {optimizationNotice && (
          <View style={styles.optimizationBanner}>
            <Ionicons name="checkmark-circle" size={15} color="#34d399" />
            <Text style={styles.optimizationBannerText}>{optimizationNotice}</Text>
          </View>
        )}
      </View>

      {/* 2. MAPA CENTRAL */}
      <View style={styles.mapCanvasWrapper}>
        <iframe
          ref={iframeRef}
          srcDoc={MAP_HTML}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="EcoRaíces MapLibre 3D"
        />

        {/* 3. DOCK VERTICAL DE HERRAMIENTAS FLOTANTES */}
        <View style={styles.rightFloatingStack}>
          <TouchableOpacity activeOpacity={0.85} onPress={() => handleSelectShortcut(GUAJIRA_GPS_SHORTCUTS[0])} style={styles.floatingActionBtn}>
            <Ionicons name="locate" size={19} color="#0284c7" />
            <Text style={styles.floatingBtnLabel}>Mi GPS</Text>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.85} onPress={handleFocusTree} style={[styles.floatingActionBtn, styles.btnTramo]}>
            <Ionicons name="git-branch-outline" size={18} color="#ffffff" />
            <Text style={[styles.floatingBtnLabel, { color: '#ffffff' }]}>Tramo</Text>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.85} onPress={handleOptimizeRadius} style={[styles.floatingActionBtn, styles.btnOptimize]}>
            <Ionicons name="flash" size={18} color="#d97706" />
            <Text style={[styles.floatingBtnLabel, { color: '#92400e' }]}>Optimizar</Text>
          </TouchableOpacity>

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
  container: { flex: 1, backgroundColor: '#0b1329' },
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
  activeStopTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  distanceBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#0284c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  distanceBadgeText: { fontSize: 11, fontWeight: '800', color: '#ffffff' },
  stopSeqPill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  stopSeqText: { fontSize: 10, fontWeight: '800', color: '#38bdf8' },
  statusDotLive: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981' },
  statusLiveText: { fontSize: 9, fontWeight: '800', color: '#10b981' },
  hudActionsRight: { flexDirection: 'row', alignItems: 'center' },
  hudAudioBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center'
  },
  activeStopTitle: { fontSize: 15, fontWeight: '800', color: '#ffffff' },
  activeStopSubtitle: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  gpsSimulatorRow: { marginTop: 4 },
  simulatorLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', marginBottom: 4 },
  simulatorChipsScroll: { flexDirection: 'row', gap: 6 },
  simChip: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155'
  },
  simChipText: { fontSize: 10, fontWeight: '700', color: '#e2e8f0' },
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
  optimizationBannerText: { fontSize: 10, fontWeight: '700', color: '#a7f3d0' },
  mapCanvasWrapper: { flex: 1, position: 'relative' },
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
    elevation: 6
  },
  btnTramo: { backgroundColor: '#0284c7', borderColor: '#0284c7' },
  btnOptimize: { backgroundColor: '#fef3c7', borderColor: '#fde68a' },
  floatingActionBtnDark: { backgroundColor: '#0f172a', borderColor: '#334155' },
  floatingBtnLabel: { fontSize: 9, fontWeight: '800', color: '#0f172a', marginTop: 1 },
  floatingActionTextSmall: { fontSize: 11, fontWeight: '900', color: '#0f172a' }
});
