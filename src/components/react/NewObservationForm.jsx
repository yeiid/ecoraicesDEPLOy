import React, { useState, useEffect, useRef } from "react";
import MapComponent from "./MapComponent.jsx";


export default function NewObservationForm({ categories = [], speciesList = [], userId }) {
  // Estado para los campos del formulario
  const [formData, setFormData] = useState({
    speciesId: "",
    municipio: "",
    estadoConservacion: "",
    notes: "",
    imageUrl: "",
  });

  const [position, setPosition] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Auto-seleccionar especie si viene por URL (desde el catálogo)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const querySpeciesId = searchParams.get("especieId");
      if (querySpeciesId) {
        setFormData(prev => ({
          ...prev,
          speciesId: querySpeciesId
        }));
      }
    }
  }, []);


  // Usar geolocalización
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage("La geolocalización no está soportada por tu navegador.");
      return;
    }

    setIsLocating(true);
    setErrorMessage("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newPos = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setPosition(newPos);
        setIsLocating(false);
        setSuccessMessage("¡Ubicación detectada correctamente!");
        setTimeout(() => setSuccessMessage(""), 4000);
      },
      (error) => {
        console.error("Error obteniendo ubicación:", error);
        setErrorMessage("No pudimos acceder a tu ubicación. Por favor, selecciona una en el mapa.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Manejar cambios
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Manejar carga de imagen
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.match("image.*")) {
      setErrorMessage("Por favor, selecciona un archivo de imagen válido.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Enviar datos a la API
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    if (!userId) {
      setErrorMessage("Por favor, inicia sesión para registrar un árbol.");
      setIsLoading(false);
      return;
    }

    if (!formData.speciesId) {
      setErrorMessage("Por favor, selecciona una especie.");
      setIsLoading(false);
      return;
    }

    if (!position) {
      setErrorMessage("Por favor, obtén tu ubicación o haz clic en el mapa para registrar coordenadas.");
      setIsLoading(false);
      return;
    }

    // Preparar FormData
    const imageFile = fileInputRef.current?.files[0];
    const formToSubmit = new FormData();
    formToSubmit.append("speciesId", formData.speciesId);
    formToSubmit.append("userId", userId);
    formToSubmit.append("latitude", position.lat);
    formToSubmit.append("longitude", position.lng);
    formToSubmit.append("notes", `${formData.notes} | Municipio: ${formData.municipio || "No especificado"} | Estado de Conservación: ${formData.estadoConservacion || "No especificado"}`);
    formToSubmit.append("observationDate", new Date().toISOString().split("T")[0]);

    if (imageFile) {
      formToSubmit.append("image", imageFile);
    }

    try {
      const response = await fetch("/api/observations", {
        method: "POST",
        body: formToSubmit,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al registrar el árbol.");
      }

      setSuccessMessage("¡Árbol registrado con éxito!");
      setFormData({
        speciesId: "",
        municipio: "",
        estadoConservacion: "",
        notes: "",
        imageUrl: "",
      });
      setPosition(null);
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Recargar página después de un momento
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || "Ocurrió un error al procesar el registro.");
    } finally {
      setIsLoading(false);
    }
  };

  // Servidor de mapas neuraljira o fallback a OSM
  const TILE_URL = "https://map.neuraljira.tech/styles/osm-bright/{z}/{x}/{y}.png";
  const FALLBACK_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  return (
    <div className="registration-wrapper">
      <div className="form-card-column">
        <h1 className="form-title">Registro de Especies</h1>

        {successMessage && <div className="alert-box success">{successMessage}</div>}
        {errorMessage && <div className="alert-box error">{errorMessage}</div>}

        <form onSubmit={handleSubmit} className="premium-form">
          
          {/* Ubicación Actual */}
          <div className="form-group-card">
            <div className="card-header">
              <div className="header-left">
                <svg className="header-icon inline-svg green-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="card-label">Ubicación Actual</span>
              </div>
              <svg className="header-icon inline-svg info-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            
            <div className="card-body">
              <button 
                type="button" 
                onClick={handleGetCurrentLocation}
                className="btn-locate-red"
                disabled={isLocating}
              >
                {isLocating ? "Buscando..." : "¿Dónde estoy?"}
              </button>
              {position && (
                <div className="coordinates-badge">
                  <span>Lat: {position.lat.toFixed(6)}</span>
                  <span>Long: {position.lng.toFixed(6)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Nombre de la Especie */}
          <div className="form-group-card">
            <div className="card-header">
              <div className="header-left">
                <svg className="header-icon inline-svg green-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                <span className="card-label">Nombre de la Especie</span>
              </div>
            </div>
            
            <div className="card-body">
              <select 
                id="speciesId"
                name="speciesId"
                value={formData.speciesId}
                onChange={handleInputChange}
                className="input-select"
                required
              >
                <option value="">Ej. Ceiba pentandra</option>
                {speciesList.map((sp) => (
                  <option key={sp.id} value={sp.id}>
                    {sp.name} ({sp.scientificName})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Municipio */}
          <div className="form-group-card">
            <div className="card-header">
              <div className="header-left">
                <svg className="header-icon inline-svg green-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className="card-label">Municipio</span>
              </div>
            </div>
            
            <div className="card-body">
              <input 
                type="text"
                id="municipio"
                name="municipio"
                value={formData.municipio}
                onChange={handleInputChange}
                className="input-text"
                placeholder="Ej. Riohacha"
              />
            </div>
          </div>

          {/* Estado de Conservación */}
          <div className="form-group-card">
            <div className="card-header">
              <div className="header-left">
                <svg className="header-icon inline-svg green-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="card-label">Estado de Conservación</span>
              </div>
            </div>
            
            <div className="card-body">
              <select 
                id="estadoConservacion"
                name="estadoConservacion"
                value={formData.estadoConservacion}
                onChange={handleInputChange}
                className="input-select"
              >
                <option value="">Seleccione un estado</option>
                <option value="Preocupación menor (LC)">Preocupación menor (LC)</option>
                <option value="Casi amenazado (NT)">Casi amenazado (NT)</option>
                <option value="Vulnerable (VU)">Vulnerable (VU)</option>
                <option value="En peligro (EN)">En peligro (EN)</option>
                <option value="En peligro crítico (CR)">En peligro crítico (CR)</option>
              </select>
            </div>
          </div>

          {/* Descripción */}
          <div className="form-group-card">
            <div className="card-header">
              <div className="header-left">
                <svg className="header-icon inline-svg green-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="card-label">Descripción</span>
              </div>
            </div>
            
            <div className="card-body">
              <textarea 
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                className="input-textarea"
                rows="4"
                placeholder="Describa brevemente la especie y su entorno..."
              ></textarea>
            </div>
          </div>

          {/* Carga de Fotografía */}
          <div className="form-group-card">
            <div className="card-header">
              <div className="header-left">
                <svg className="header-icon inline-svg green-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="card-label">Fotografía del Árbol (Opcional)</span>
              </div>
            </div>
            
            <div className="card-body">
              <input 
                type="file"
                id="image"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageChange}
                className="input-file"
              />
              {imagePreview && (
                <div className="form-image-preview">
                  <img src={imagePreview} alt="Vista previa del árbol" />
                </div>
              )}
            </div>
          </div>

          <div className="form-actions-row">
            <button 
              type="submit" 
              className="btn-submit-green"
              disabled={isLoading}
            >
              {isLoading ? "Registrando..." : "Registrar Árbol"}
            </button>
          </div>

        </form>
      </div>

      {/* Columna del Mapa */}
      <div className="map-card-column">
        <div className="map-header-card">
          <h3>Georreferenciación</h3>
          <p>Haz clic en el mapa para marcar la ubicación del árbol o usa el botón "¿Dónde estoy?".</p>
        </div>
        <div className="map-container-wrapper" style={{ height: "100%", minHeight: "450px" }}>
          <MapComponent
            center={position ? [position.lat, position.lng] : [4.6097, -74.0817]}
            zoom={position ? 16 : 13}
            interactiveMarker={position}
            onLocationSelect={(loc) => setPosition(loc)}
          />
        </div>
      </div>

      <style>{`
        .registration-wrapper {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 2rem;
          width: 100%;
          max-width: 1300px;
          margin: 0 auto;
        }

        .form-card-column {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .form-title {
          font-family: 'Outfit', sans-serif;
          font-size: 2.2rem;
          color: #0f3d24; /* Color verde oscuro elegante */
          font-weight: 800;
          margin-bottom: 0.5rem;
          text-align: left;
        }

        .premium-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .form-group-card {
          background: #ffffff;
          border: 1px solid #f1f5f9;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.02);
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .form-group-card:hover {
          border-color: #cbd5e1;
          box-shadow: 0 8px 16px -2px rgba(15, 23, 42, 0.04);
        }

        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.85rem 1.25rem;
          border-bottom: 1px solid #f8fafc;
          background-color: #fafbfc;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .card-label {
          font-family: 'Outfit', sans-serif;
          font-weight: 600;
          font-size: 1.05rem;
          color: #0f3d24;
        }

        .header-icon {
          width: 20px;
          height: 20px;
        }

        .green-icon {
          color: #10b981;
        }

        .info-icon {
          color: #10b981;
          cursor: pointer;
        }

        .card-body {
          padding: 1.25rem;
        }

        /* Inputs y Selects */
        .input-text, .input-select, .input-textarea {
          width: 100%;
          padding: 0.85rem 1rem;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          background-color: #f8fafc;
          font-family: 'Inter', sans-serif;
          font-size: 0.95rem;
          color: #334155;
          outline: none;
          transition: all 0.25s ease;
        }

        .input-text:focus, .input-select:focus, .input-textarea:focus {
          border-color: #10b981;
          background-color: #ffffff;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
        }

        .input-textarea {
          resize: vertical;
        }

        .input-file {
          font-family: 'Inter', sans-serif;
          font-size: 0.9rem;
          color: #64748b;
          width: 100%;
        }

        /* Botón Red */
        .btn-locate-red {
          background-color: #ef4444; /* Color rojo del botón de ubicación */
          color: white;
          border: none;
          padding: 0.75rem 1.75rem;
          border-radius: 8px;
          font-family: 'Outfit', sans-serif;
          font-weight: 700;
          font-size: 1.05rem;
          cursor: pointer;
          box-shadow: 0 4px 10px rgba(239, 68, 68, 0.2);
          transition: all 0.3s ease;
          width: 100%;
          max-width: 200px;
        }

        .btn-locate-red:hover {
          background-color: #dc2626;
          transform: translateY(-1.5px);
          box-shadow: 0 6px 14px rgba(239, 68, 68, 0.3);
        }

        .coordinates-badge {
          display: flex;
          gap: 1rem;
          margin-top: 0.75rem;
          background-color: #f1f5f9;
          padding: 0.6rem 1rem;
          border-radius: 6px;
          font-family: monospace;
          font-size: 0.9rem;
          color: #475569;
          font-weight: bold;
        }

        /* Botón Submit */
        .btn-submit-green {
          background-color: #10b981;
          color: white;
          border: none;
          padding: 1rem 2rem;
          border-radius: 25px;
          font-family: 'Outfit', sans-serif;
          font-weight: 700;
          font-size: 1.1rem;
          cursor: pointer;
          width: 100%;
          box-shadow: 0 4px 14px rgba(16, 185, 129, 0.25);
          transition: all 0.3s ease;
        }

        .btn-submit-green:hover {
          background-color: #059669;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(16, 185, 129, 0.35);
        }

        .btn-submit-green:disabled {
          background-color: #cbd5e1;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        /* Image Preview */
        .form-image-preview {
          margin-top: 1rem;
          border-radius: 8px;
          border: 1px dashed #cbd5e1;
          padding: 0.5rem;
          max-width: 250px;
        }

        .form-image-preview img {
          width: 100%;
          border-radius: 6px;
          display: block;
        }

        /* Alert Boxes */
        .alert-box {
          padding: 0.9rem 1.25rem;
          border-radius: 8px;
          font-family: 'Inter', sans-serif;
          font-size: 0.95rem;
          font-weight: 500;
          margin-bottom: 0.5rem;
        }

        .alert-box.success {
          background-color: #e8f5e9;
          color: #1b5e20;
          border: 1px solid #c8e6c9;
        }

        .alert-box.error {
          background-color: #ffebee;
          color: #c62828;
          border: 1px solid #ffcdd2;
        }

        /* Columna del Mapa */
        .map-card-column {
          display: flex;
          flex-direction: column;
          background: #ffffff;
          border: 1px solid #f1f5f9;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(15, 23, 42, 0.03);
          overflow: hidden;
          height: calc(100vh - 120px);
          position: sticky;
          top: 40px;
        }

        .map-header-card {
          padding: 1.25rem;
          background-color: #fafbfc;
          border-bottom: 1px solid #f1f5f9;
        }

        .map-header-card h3 {
          font-family: 'Outfit', sans-serif;
          font-size: 1.2rem;
          color: #0f3d24;
          font-weight: 700;
          margin-bottom: 0.25rem;
        }

        .map-header-card p {
          font-family: 'Inter', sans-serif;
          font-size: 0.85rem;
          color: #64748b;
          line-height: 1.4;
        }

        .map-container-wrapper {
          flex: 1;
          width: 100%;
          height: 100%;
          position: relative;
        }

        /* Responsividad */
        @media (max-width: 1024px) {
          .registration-wrapper {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }

          .map-card-column {
            height: 450px;
            position: relative;
            top: 0;
          }
        }
      `}</style>
    </div>
  );
}
