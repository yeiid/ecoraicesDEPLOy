import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// API del mapa NeuralJIRA (configurable vía PUBLIC_MAP_API_URL)
const MAP_API_URL = import.meta.env.PUBLIC_MAP_API_URL || "https://map.neuraljira.tech";

// Estilo de respaldo si la API del mapa no responde
function buildFallbackStyle() {
  return {
    version: 8,
    sources: {
      "osm-tiles": {
        type: "raster",
        tiles: [
          "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
          "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
          "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
        ],
        tileSize: 256,
        attribution: '&copy; OpenStreetMap | &copy; <a href="https://map.neuraljira.tech">neuraljira.tech</a>',
      },
      "martin-vector": {
        type: "vector",
        tiles: [`${MAP_API_URL}/tiles/geo2/{z}/{x}/{y}`],
      },
    },
    layers: [
      {
        id: "osm-layer",
        type: "raster",
        source: "osm-tiles",
        minzoom: 0,
        maxzoom: 19,
      },
      {
        id: "vegetation-3d",
        type: "fill-extrusion",
        source: "martin-vector",
        "source-layer": "geo2",
        paint: {
          "fill-extrusion-color": "#059669",
          "fill-extrusion-height": ["coalesce", ["get", "height"], 12],
          "fill-extrusion-base": 0,
          "fill-extrusion-opacity": 0.6,
        },
      },
    ],
  };
}

// Estilo del mapa desde la API: style.json oficial (ciudad 3D) + capa de árboles geo2
async function buildStyle() {
  try {
    const res = await fetch(`${MAP_API_URL}/api/v1/style.json`);
    if (!res.ok) throw new Error(`Style HTTP ${res.status}`);
    const style = await res.json();

    // Capa de árboles (geo2) encima del modelo 3D de la ciudad
    style.sources.geo2 = {
      type: "vector",
      tiles: [`${MAP_API_URL}/tiles/geo2/{z}/{x}/{y}`],
    };
    style.layers = [
      ...style.layers,
      {
        id: "vegetation-3d",
        type: "fill-extrusion",
        source: "geo2",
        "source-layer": "geo2",
        paint: {
          "fill-extrusion-color": "#059669",
          "fill-extrusion-height": ["coalesce", ["get", "height"], 12],
          "fill-extrusion-base": 0,
          "fill-extrusion-opacity": 0.65,
        },
      },
    ];
    return style;
  } catch (error) {
    console.warn("[Mapa] No se pudo cargar style.json, usando estilo de respaldo:", error);
    return buildFallbackStyle();
  }
}

export default function MapComponent({
  center = [-74.0817, 4.6097], // Lng, Lat para MapLibre!
  zoom = 5,
  markers = [],
  onLocationSelect = null,
  readOnly = false,
  interactiveMarker = null, // Marcador de selección externa
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const activeMarkerRef = useRef(null);
  const staticMarkersRef = useRef([]);
  const [coords, setCoords] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    let mapInstance = null;
    let cancelled = false;

    const initMap = async () => {
      // Normalizar coordenadas del centro si vienen en formato Leaflet [Lat, Lng]
      let normalizedCenter = center;
      if (Array.isArray(center) && center.length === 2) {
        if (center[0] > -30 && center[0] < 30) {
          normalizedCenter = [center[1], center[0]];
        }
      } else if (center && typeof center === "object" && center.lat !== undefined) {
        normalizedCenter = [center.lng, center.lat];
      }

      const style = await buildStyle();
      if (cancelled || !mapContainerRef.current) return;

      mapInstance = new maplibregl.Map({
        container: mapContainerRef.current,
        style,
        center: normalizedCenter,
        zoom: zoom,
        pitch: 45,
        antialias: true,
      });

      mapInstance.addControl(new maplibregl.NavigationControl(), "top-right");
      mapRef.current = mapInstance;

      // Evento de clic en el mapa para capturar coordenadas
      if (!readOnly) {
        mapInstance.on("click", (e) => {
          const { lng, lat } = e.lngLat;
          setCoords({ lat, lng });

          if (onLocationSelect) {
            onLocationSelect({ lat, lng });
          }

          // Añadir o actualizar el marcador interactivo
          if (activeMarkerRef.current) {
            activeMarkerRef.current.setLngLat([lng, lat]);
          } else {
            activeMarkerRef.current = new maplibregl.Marker({ color: "#ef4444" })
              .setLngLat([lng, lat])
              .setPopup(
                new maplibregl.Popup({ offset: 25 }).setHTML(
                  "<p style='margin:0; font-family:sans-serif;'><b>Ubicación seleccionada</b></p>"
                )
              )
              .addTo(mapInstance);
          }
        });
      }

      // Renderizar marcadores de árboles estáticos
      markers.forEach((marker) => {
        const mLat = parseFloat(marker.latitude);
        const mLng = parseFloat(marker.longitude);
        if (!isNaN(mLat) && !isNaN(mLng)) {
          const color = marker.verified ? "#10b981" : "#3b82f6"; // Verde para verificado, azul para pendiente
          const popupHtml = `
            <div style="font-family: 'Outfit', sans-serif; padding: 6px; min-width: 160px;">
              <h4 style="margin: 0 0 4px 0; color: #064e3b; font-size: 14px;">${marker.species?.name || "Árbol Registrado"}</h4>
              ${marker.species?.commonName ? `<p style="margin: 2px 0; font-size: 11px;"><b>Común:</b> ${marker.species.commonName}</p>` : ""}
              <p style="margin: 2px 0; font-size: 11px; color: #6b7280;">📍 ${mLat.toFixed(6)}, ${mLng.toFixed(6)}</p>
              ${marker.comments ? `<p style="margin: 4px 0 0 0; font-size: 11px; font-style: italic; color: #4b5563;">"${marker.comments}"</p>` : ""}
              ${marker.verified ? `<p style="margin: 6px 0 0 0; color: #10b981; font-size: 11px; font-weight: bold;">✓ Verificado</p>` : ""}
            </div>
          `;

          const staticMarker = new maplibregl.Marker({ color })
            .setLngLat([mLng, mLat])
            .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(popupHtml))
            .addTo(mapInstance);

          staticMarkersRef.current.push(staticMarker);
        }
      });
    };

    initMap();

    return () => {
      cancelled = true;
      if (mapInstance) {
        mapInstance.remove();
      }
    };
  }, [center, zoom, readOnly, markers]);

  // Efecto para actualizar el marcador interactivo en base al prop (e.g. geolocalización de teléfono)
  useEffect(() => {
    if (!mapRef.current || !interactiveMarker || readOnly) return;

    const map = mapRef.current;
    const { lat, lng } = interactiveMarker;

    setCoords({ lat, lng });
    map.flyTo({ center: [lng, lat], zoom: 16, duration: 1500 });

    if (activeMarkerRef.current) {
      activeMarkerRef.current.setLngLat([lng, lat]);
    } else {
      activeMarkerRef.current = new maplibregl.Marker({ color: "#ef4444" })
        .setLngLat([lng, lat])
        .addTo(map);
    }
  }, [interactiveMarker, readOnly]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: "450px" }}>
      <div ref={mapContainerRef} style={{ width: "100%", height: "100%", minHeight: "450px", borderRadius: "12px" }} />
      {coords && !readOnly && (
        <div style={{
          position: "absolute",
          bottom: "12px",
          left: "12px",
          background: "rgba(15, 23, 42, 0.85)",
          color: "white",
          padding: "6px 12px",
          borderRadius: "8px",
          fontSize: "11px",
          fontFamily: "monospace",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          backdropFilter: "blur(6px)",
          pointerEvents: "none",
          zIndex: 5,
        }}>
          📍 Lat: {coords.lat.toFixed(6)} | Lng: {coords.lng.toFixed(6)}
        </div>
      )}
    </div>
  );
}
