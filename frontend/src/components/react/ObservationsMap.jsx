import React, { useState, useEffect, useRef, useMemo } from "react";
import MapComponent from "./MapComponent.jsx";


// Componente principal para el mapa de árboles
export default function ObservationsMap({
  initialFilterCategory = null,
  showFilters = true,
}) {
  // Estado para las observaciones de árboles
  const [trees, setTrees] = useState([]);
  const [filteredTrees, setFilteredTrees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estado para el filtro de categorías
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState(
    initialFilterCategory ? [initialFilterCategory] : []
  );

  // Estado para filtros adicionales
  const [showOnlyVerified, setShowOnlyVerified] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });

  // Referencias para los elementos del mapa
  const mapRef = useRef(null);

  // Obtener datos de árboles registrados
  useEffect(() => {
    const fetchTrees = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/observations");

        if (!response.ok) {
          throw new Error("Error al cargar los árboles registrados");
        }

        const data = await response.json();
        setTrees(data);
        setFilteredTrees(data);
      } catch (error) {
        console.error("Error fetching trees:", error);
        setError(
          "No pudimos cargar los árboles registrados. Por favor, intenta nuevamente."
        );
      } finally {
        setIsLoading(false);
      }
    };

    // Obtener categorías
    const fetchCategories = async () => {
      try {
        const response = await fetch("/api/categories");

        if (!response.ok) {
          throw new Error("Error al cargar las categorías");
        }

        const data = await response.json();
        setCategories(data);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };

    fetchTrees();
    fetchCategories();
  }, []);

  // Actualizar filteredTrees cuando cambien los filtros
  useEffect(() => {
    let filtered = [...trees];

    // Filtrar por categoría
    if (selectedCategories.length > 0) {
      filtered = filtered.filter((tree) => {
        const speciesCategoryId = tree.species?.categoryId;
        return (
          speciesCategoryId && selectedCategories.includes(speciesCategoryId)
        );
      });
    }

    // Filtrar por verificación
    if (showOnlyVerified) {
      filtered = filtered.filter((tree) => tree.isVerified);
    }

    // Filtrar por rango de fechas
    if (dateRange.startDate) {
      const startDate = new Date(dateRange.startDate);
      filtered = filtered.filter((tree) => {
        const treeDate = new Date(tree.observationDate);
        return treeDate >= startDate;
      });
    }

    if (dateRange.endDate) {
      const endDate = new Date(dateRange.endDate);
      // Ajustar para incluir todo el día final
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((tree) => {
        const treeDate = new Date(tree.observationDate);
        return treeDate <= endDate;
      });
    }

    setFilteredTrees(filtered);
  }, [trees, selectedCategories, showOnlyVerified, dateRange]);

  // Manejar cambio en selección de categorías
  const handleCategoryChange = (e) => {
    const categoryId = e.target.value;
    setSelectedCategories((prev) => {
      if (prev.includes(categoryId)) {
        return prev.filter((id) => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  // Manejar cambio en filtro de verificación
  const handleVerifiedChange = (e) => {
    setShowOnlyVerified(e.target.checked);
  };

  // Manejar cambio en rango de fechas
  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Calcular el centro del mapa basado en los árboles filtrados
  const mapCenter = useMemo(() => {
    if (filteredTrees.length === 0) {
      // Centrar en La Guajira (Riohacha) por defecto
      return [11.5448, -72.9068];
    }

    // Calcular el centro de todos los árboles
    const lats = filteredTrees.map((tree) => parseFloat(tree.latitude));
    const lngs = filteredTrees.map((tree) => parseFloat(tree.longitude));

    const avgLat = lats.reduce((sum, lat) => sum + lat, 0) / lats.length;
    const avgLng = lngs.reduce((sum, lng) => sum + lng, 0) / lngs.length;

    return [avgLat, avgLng];
  }, [filteredTrees]);


  return (
    <div className="observations-map">
      {showFilters && (
        <div className="filters">
          <div className="filter-section">
            <h3>Filtrar árboles por:</h3>

            <div className="filter-category">
              <h4>Categoría</h4>
              <div className="categories-grid">
                {categories.map((category) => (
                  <div className="category-item" key={category.id}>
                    <input
                      type="checkbox"
                      id={`category-${category.id}`}
                      value={category.id}
                      checked={selectedCategories.includes(category.id)}
                      onChange={handleCategoryChange}
                    />
                    <label htmlFor={`category-${category.id}`}>
                      {category.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="filter-verified">
              <h4>Estado</h4>
              <div className="verified-checkbox">
                <input
                  type="checkbox"
                  id="verified-only"
                  checked={showOnlyVerified}
                  onChange={handleVerifiedChange}
                />
                <label htmlFor="verified-only">
                  Mostrar solo árboles verificados
                </label>
              </div>
            </div>

            <div className="filter-date">
              <h4>Fecha de registro</h4>
              <div className="date-fields">
                <div className="date-field">
                  <label htmlFor="startDate">Desde:</label>
                  <input
                    type="date"
                    id="startDate"
                    name="startDate"
                    value={dateRange.startDate}
                    onChange={handleDateChange}
                  />
                </div>
                <div className="date-field">
                  <label htmlFor="endDate">Hasta:</label>
                  <input
                    type="date"
                    id="endDate"
                    name="endDate"
                    value={dateRange.endDate}
                    onChange={handleDateChange}
                  />
                </div>
              </div>
            </div>

            <div className="filter-info">
              <span className="trees-count">
                Mostrando {filteredTrees.length} árboles
                {filteredTrees.length !== trees.length &&
                  ` de ${trees.length} totales`}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="map-wrapper">
        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <p>Cargando árboles registrados...</p>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        <div style={{ height: "600px", width: "100%", borderRadius: "12px", overflow: "hidden" }}>
          <MapComponent
            center={mapCenter}
            zoom={6}
            markers={filteredTrees}
            readOnly={true}
          />
        </div>

        {!isLoading && filteredTrees.length === 0 && (
          <div className="no-trees-message">
            <p>
              No se encontraron árboles con los filtros seleccionados.{" "}
              <button
                onClick={() => {
                  setSelectedCategories([]);
                  setShowOnlyVerified(false);
                  setDateRange({ startDate: "", endDate: "" });
                }}
              >
                Limpiar filtros
              </button>
            </p>
          </div>
        )}
      </div>

      <style>{`
        .observations-map {
          display: flex;
          flex-direction: column;
        }

        .filters {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          margin-bottom: 1.5rem;
        }

        .filter-section {
          padding: 1.2rem;
        }

        .filter-section h3 {
          font-size: 1.2rem;
          margin: 0 0 1rem;
          color: var(--color-primary, #2e7d32);
        }

        .filter-category,
        .filter-verified,
        .filter-date {
          margin-bottom: 1.2rem;
        }

        .filter-section h4 {
          font-size: 1rem;
          margin: 0 0 0.8rem;
          color: #333;
        }

        .categories-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 0.5rem;
        }

        .category-item {
          display: flex;
          align-items: center;
        }

        .category-item label {
          margin-left: 0.5rem;
          font-size: 0.9rem;
        }

        .verified-checkbox {
          display: flex;
          align-items: center;
        }

        .verified-checkbox label {
          margin-left: 0.5rem;
        }

        .date-fields {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .date-field {
          flex: 1;
          min-width: 150px;
        }

        .date-field label {
          display: block;
          margin-bottom: 0.3rem;
          font-size: 0.9rem;
        }

        .date-field input {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
        }

        .filter-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #eee;
          font-size: 0.9rem;
        }

        .trees-count {
          color: #666;
        }

        .map-wrapper {
          position: relative;
          border-radius: 8px;
          overflow: hidden;
          flex-grow: 1;
        }

        .loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(255, 255, 255, 0.8);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid rgba(0, 0, 0, 0.1);
          border-left-color: var(--color-primary, #2e7d32);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        .error-message {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background-color: white;
          padding: 1.5rem;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          text-align: center;
          color: #e53935;
          z-index: 900;
          width: 80%;
          max-width: 500px;
        }

        .no-trees-message {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          background-color: white;
          padding: 1rem;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          text-align: center;
          z-index: 800;
        }

        .no-trees-message button {
          background: none;
          border: none;
          color: var(--color-primary, #2e7d32);
          text-decoration: underline;
          cursor: pointer;
          font-size: 0.9rem;
          margin-left: 0.5rem;
        }

        /* Estilos para los popups de árboles */
        :global(.tree-popup) {
          min-width: 200px;
          max-width: 300px;
        }

        :global(.tree-popup h3) {
          margin: 0 0 0.3rem;
          font-size: 1.1rem;
          color: var(--color-primary, #2e7d32);
        }

        :global(.scientific-name) {
          font-style: italic;
          margin: 0 0 0.8rem;
          font-size: 0.9rem;
          color: #666;
        }

        :global(.tree-image) {
          width: 100%;
          max-height: 150px;
          object-fit: cover;
          border-radius: 4px;
          margin-bottom: 0.8rem;
        }

        :global(.tree-details) {
          font-size: 0.9rem;
        }

        :global(.tree-details p) {
          margin: 0.2rem 0;
        }

        :global(.verified-badge) {
          color: var(--color-primary, #2e7d32);
          font-weight: 500;
        }

        :global(.tree-notes) {
          margin-top: 0.8rem;
          font-size: 0.85rem;
        }

        :global(.tree-notes p) {
          margin: 0.3rem 0 0;
          color: #444;
        }

        :global(.view-more) {
          display: block;
          margin-top: 1rem;
          text-align: center;
          padding: 0.5rem;
          background-color: var(--color-primary, #2e7d32);
          color: white;
          text-decoration: none;
          border-radius: 4px;
          font-size: 0.9rem;
        }

        :global(.view-more:hover) {
          background-color: #1b5e20;
        }

        /* Media queries para responsividad */
        @media (min-width: 768px) {
          .observations-map {
            flex-direction: row;
          }

          .filters {
            width: 300px;
            margin-right: 1.5rem;
            margin-bottom: 0;
          }

          .map-wrapper {
            flex: 1;
          }
        }

        @media (max-width: 767px) {
          .observations-map {
            flex-direction: column;
          }

          .filter-section {
            padding: 1rem;
          }

          .categories-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
}
