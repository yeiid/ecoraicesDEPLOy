import React, { useState } from "react";
import MapComponent from "./MapComponent.jsx";

// Selector de ubicación para formularios de comunidad.
// Renderiza un mapa interactivo y guarda las coordenadas en inputs ocultos
// para que el formulario padre pueda enviarlas junto con el resto de datos.
export default function CommunityLocationPicker({ initialLat = null, initialLng = null }) {
  const [position, setPosition] = useState(
    initialLat != null && initialLng != null ? { lat: initialLat, lng: initialLng } : null
  );
  const [isLocating, setIsLocating] = useState(false);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setIsLocating(false);
      },
      () => setIsLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="location-picker">
      <div className="picker-actions">
        <button
          type="button"
          className="btn btn-accent btn-sm"
          onClick={handleGetCurrentLocation}
          disabled={isLocating}
        >
          {isLocating ? "Buscando..." : "¿Dónde estoy?"}
        </button>
        {position && (
          <span className="coordinates-badge">
            Lat: {position.lat.toFixed(6)} | Lng: {position.lng.toFixed(6)}
          </span>
        )}
      </div>

      <input type="hidden" name="latitude" value={position ? position.lat : ""} />
      <input type="hidden" name="longitude" value={position ? position.lng : ""} />

      <div className="picker-map">
        <MapComponent
          center={position ? [position.lat, position.lng] : [11.5448, -72.9068]}
          zoom={position ? 15 : 8}
          interactiveMarker={position}
          onLocationSelect={(loc) => setPosition(loc)}
        />
      </div>

      <style>{`
        .location-picker {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .picker-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .coordinates-badge {
          background-color: var(--color-gray-100);
          padding: 0.4rem 0.75rem;
          border-radius: var(--radius-sm);
          font-family: monospace;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--color-text-main);
        }
        .picker-map {
          width: 100%;
          height: 380px;
          border-radius: var(--radius-md);
          overflow: hidden;
          border: 1px solid var(--color-border);
        }
      `}</style>
    </div>
  );
}
