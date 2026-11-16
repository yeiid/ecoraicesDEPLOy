import React, { useRef, useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView
} from 'react-native';

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
    
    .ecoraices-3d-tree-marker {
      position: relative;
      cursor: pointer;
      user-select: none;
      transform-style: preserve-3d;
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .ecoraices-3d-tree-marker:hover {
      transform: scale(1.15);
      z-index: 50 !important;
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
        center: [-72.9068, 11.5448],
        zoom: 11,
        pitch: 0,
        bearing: 0,
        antialias: true
      });

      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");

      map.on('load', () => {
        window.parent.postMessage(JSON.stringify({ type: 'MAP_READY' }), '*');
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
          alert: '⚠️ Libera compuestos químicos que impiden germinar plantas nativas.'
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
          alert: 'Patrimonio de La Guajira: fija nitrógeno y retiene agua subterránea.'
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
        alert: 'Árbol georreferenciado verificado en campo.'
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

    window.addEventListener('message', (event) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data.type === 'SET_TREES') {
          setTrees(data.payload);
        } else if (data.type === 'TOGGLE_3D') {
          toggle3DView(data.payload);
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
  const iframeRef = useRef(null);
  const [is3DMode, setIs3DMode] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [legendOpen, setLegendOpen] = useState(false);

  const filteredTrees = trees.filter((tree) => {
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
    const nextState = !is3DMode;
    setIs3DMode(nextState);
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          type: 'TOGGLE_3D',
          payload: nextState
        }),
        '*'
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Barra de Filtros Minimalista Superior */}
      <View style={styles.toolbarCard}>
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
          {(searchQuery || selectedFilter !== 'all') && (
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={() => {
                setSearchQuery('');
                setSelectedFilter('all');
              }}
            >
              <Text style={styles.clearBtnText}>✕ Limpiar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Visor MapLibre 3D vía iframe en web */}
      <View style={styles.mapWrapper}>
        <iframe
          ref={iframeRef}
          srcDoc={MAP_HTML}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="EcoRaíces MapLibre 3D"
        />

        {/* Botón Flotante 2D / 3D VISTA */}
        <TouchableOpacity style={[styles.toggle3DBtn, is3DMode && styles.toggle3DBtnActive]} onPress={toggle3D}>
          <Text style={styles.toggle3DIcon}>{is3DMode ? '🗺️' : '🌐'}</Text>
          <Text style={styles.toggle3DText}>{is3DMode ? '2D' : '3D'}</Text>
          <View style={styles.toggle3DBadge}>
            <Text style={styles.toggle3DBadgeText}>VISTA</Text>
          </View>
        </TouchableOpacity>

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
                <View style={[styles.legendDot, { backgroundColor: '#0d9488' }]} />
                <Text style={styles.legendChipLabel}>🍃 Dividivi (Ancestral)</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  toolbarCard: {
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
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
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
  searchIcon: { fontSize: 14, marginRight: 6 },
  searchInput: { flex: 1, fontSize: 12, color: '#0f172a' },
  counterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6
  },
  counterDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#0284c7', marginRight: 6 },
  counterText: { fontSize: 11, fontWeight: '700', color: '#0369a1' },
  clearBtn: { backgroundColor: '#fee2e2', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6 },
  clearBtnText: { fontSize: 11, fontWeight: '700', color: '#b91c1c' },
  mapWrapper: { flex: 1, position: 'relative' },
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
    elevation: 4
  },
  toggle3DBtnActive: { backgroundColor: '#0f172a' },
  toggle3DIcon: { fontSize: 14 },
  toggle3DText: { fontSize: 12, fontWeight: '800', color: '#0f172a' },
  toggle3DBadge: { backgroundColor: '#0284c7', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  toggle3DBadgeText: { fontSize: 9, fontWeight: '800', color: '#ffffff' },
  legendContainer: {
    position: 'absolute',
    bottom: 20,
    right: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    elevation: 4,
    overflow: 'hidden'
  },
  legendToggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10 },
  legendIcon: { fontSize: 12 },
  legendBtnText: { fontSize: 11, fontWeight: '800', color: '#0f172a' },
  legendArrow: { fontSize: 10, color: '#64748b' },
  legendChipsBox: { padding: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9', gap: 4 },
  legendChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendChipLabel: { fontSize: 10, fontWeight: '600', color: '#334155' }
});
