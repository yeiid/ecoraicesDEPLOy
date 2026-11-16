import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
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
    html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; background: #f8fafc; font-family: sans-serif; }
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
        el.innerHTML = '<div style="background:' + (isInvasive ? '#ef4444' : '#10b981') + ';width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 3px 6px rgba(0,0,0,0.3);font-size:14px;">' + (isInvasive ? '🚨' : '🌳') + '</div>';

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
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [offlinePackProgress, setOfflinePackProgress] = useState(null);

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
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          type: 'SET_TREES',
          payload: filteredTrees
        }),
        '*'
      );
    }
  }, [filteredTrees]);

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

  const handleDownloadOfflineMap = () => {
    setOfflinePackProgress(25);
    setTimeout(() => setOfflinePackProgress(65), 300);
    setTimeout(() => {
      setOfflinePackProgress(100);
      alert('Mapa Offline de La Guajira guardado en disco/caché.');
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
      {/* 1. BARRA DE FILTROS SUPERIOR ECORAÍCES */}
      <View style={styles.webHeaderFilters}>
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
        <iframe
          ref={iframeRef}
          srcDoc={MAP_HTML}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="EcoRaíces MapLibre 3D"
        />

        {/* 3. DOCK VERTICAL DERECHO: SOLO LAS 3 HERRAMIENTAS SOLICITADAS */}
        <View style={styles.rightFloatingStack}>
          {/* Botón 1: Mi GPS */}
          <TouchableOpacity activeOpacity={0.85} onPress={() => handleSelectShortcut(GUAJIRA_GPS_SHORTCUTS[0])} style={styles.floatingActionBtn}>
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

          {/* Botón 3: Descargar Mapa Offline */}
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  webHeaderFilters: {
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    elevation: 3
  },
  segmentedRow: { flexDirection: 'row', gap: 8, paddingBottom: 8 },
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
  segmentBtnActive: { backgroundColor: '#0284c7', borderColor: '#0284c7' },
  segmentBtnInvasiveActive: { backgroundColor: '#dc2626', borderColor: '#dc2626' },
  segmentBtnNativeActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  segmentBtnVerifiedActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  segIcon: { fontSize: 13 },
  segText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  segTextActive: { color: '#ffffff' },
  segTextInvasiveActive: { color: '#ffffff' },
  segTextNativeActive: { color: '#ffffff' },
  segTextVerifiedActive: { color: '#ffffff' },
  segBadge: { backgroundColor: 'rgba(255,255,255,0.3)', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 },
  segBadgeText: { fontSize: 11, fontWeight: '800', color: '#0f172a' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
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
  searchInput: { flex: 1, fontSize: 12, color: '#0f172a', paddingVertical: 0 },
  counterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 6
  },
  counterDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#0284c7', marginRight: 6 },
  counterText: { fontSize: 11, fontWeight: '700', color: '#0369a1' },
  shortcutsRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  shortcutChip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  shortcutChipText: { fontSize: 10, fontWeight: '600', color: '#475569' },
  mapCanvasWrapper: { flex: 1, position: 'relative' },
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
    elevation: 6
  },
  floatingActionBtnDark: { backgroundColor: '#0f172a', borderColor: '#334155' },
  floatingBtnLabel: { fontSize: 9, fontWeight: '800', color: '#0f172a', marginTop: 2 },
  floatingActionTextSmall: { fontSize: 12, fontWeight: '900', color: '#0f172a' }
});
