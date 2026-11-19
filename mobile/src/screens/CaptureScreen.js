/**
 * EcoRaíces Mobile · Pantalla de Captura en Campo (Censar)
 * Conectada al catálogo real (GET /api/species), comunidades reales (GET /api/communities)
 * y subida directa o cola offline SQLite hacia POST /api/observations.
 */

import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../theme';

const HEIGHT_PRESETS = [
  { meters: 5, label: '5 m (Joven)' },
  { meters: 8, label: '8 m (Medio)' },
  { meters: 12, label: '12 m (Adulto)' },
  { meters: 16, label: '16 m (Dosel)' }
];

const HEALTH_CHIPS = [
  { id: 'Sano y vigoroso', label: '🌳 Sano' },
  { id: 'Con floración o frutos', label: '🌸 Flores/Fruto' },
  { id: 'Dañado o talado', label: '🪓 Dañado' },
  { id: 'Seco o con plaga', label: '🍂 Seco/Plaga' }
];

export default function CaptureScreen({
  coords,
  gpsAccuracy,
  isLocating,
  detectedLocation,
  fetchCurrentLocation,
  saveSuccessBanner,
  saveErrorBanner,
  speciesName,
  setSpeciesName,
  selectedSpeciesId,
  setSelectedSpeciesId,
  displaySpeciesCatalog = [],
  apiCommunities = [],
  selectedCommunityId = null,
  setSelectedCommunityId,
  municipio,
  treeHeight = 8,
  setTreeHeight,
  extraOptionsOpen,
  setExtraOptionsOpen,
  photoUri,
  setPhotoUri,
  handlePhotoSelect,
  healthState,
  setHealthState,
  notes,
  setNotes,
  handleSaveTree,
  continuousMode,
  setContinuousMode,
  onNavigateToMap
}) {
  const gpsLocationLabel =
    detectedLocation?.label ||
    detectedLocation?.municipio ||
    (coords ? municipio || 'Territorio GPS' : 'Pendiente de fijar GPS');

  // Sugerencias en tiempo real desde las 61 especies reales del backend FastAPI
  const speciesSuggestions = useMemo(() => {
    const q = (speciesName || '').trim().toLowerCase();
    if (!q) {
      return displaySpeciesCatalog.slice(0, 8);
    }
    return displaySpeciesCatalog
      .filter((sp) => {
        const match = ((sp.name || '') + ' ' + (sp.scientific || '')).toLowerCase();
        return match.includes(q);
      })
      .slice(0, 6);
  }, [speciesName, displaySpeciesCatalog]);

  const handlePickSpeciesSuggestion = (sp) => {
    setSpeciesName(sp.name);
    if (setSelectedSpeciesId) {
      setSelectedSpeciesId(sp.id);
    }
  };

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.webFormContent}>
      {/* Título de la Página */}
      <Text style={styles.webPageTitle}>Registro Botánico en Campo</Text>

      {/* Alertas de Éxito / Error */}
      {saveSuccessBanner ? (
        <View style={styles.webAlertSuccess}>
          <Text style={styles.webAlertSuccessText}>{saveSuccessBanner}</Text>
        </View>
      ) : null}
      {saveErrorBanner ? (
        <View style={styles.webAlertError}>
          <Text style={styles.webAlertErrorText}>{saveErrorBanner}</Text>
        </View>
      ) : null}

      {/* ========================================== */}
      {/* TARJETA 1: UBICACIÓN ACTUAL                */}
      {/* ========================================== */}
      <View style={styles.webQuickCard}>
        <View style={styles.webCardHeader}>
          <View style={styles.webHeaderIconBadge}>
            <Text style={{ fontSize: 20 }}>📍</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.webCardTitle}>Ubicación Satelital Exacta</Text>
            <Text style={styles.webCardSubtitle}>
              El árbol se posiciona en el Catastro 3D con tu GPS en tiempo real
            </Text>
          </View>
        </View>

        {/* Caja de Coordenadas + Municipio detectado por GPS */}
        <View style={styles.webCoordsBox}>
          <View style={styles.webCoordPill}>
            <Text style={styles.webCoordTag}>Lat:</Text>
            <Text style={[styles.webCoordVal, coords && styles.webCoordValActive]}>
              {coords ? coords.latitude.toFixed(6) : '--.------'}
            </Text>
          </View>
          <View style={styles.webCoordPill}>
            <Text style={styles.webCoordTag}>Lng:</Text>
            <Text style={[styles.webCoordVal, coords && styles.webCoordValActive]}>
              {coords ? coords.longitude.toFixed(6) : '--.------'}
            </Text>
          </View>
          <View
            style={[
              styles.webGpsStatusBadge,
              coords ? styles.webGpsStatusReady : styles.webGpsStatusWaiting
            ]}
          >
            <Text
              style={[
                styles.webGpsStatusText,
                coords ? styles.webGpsStatusTextReady : styles.webGpsStatusTextWaiting
              ]}
            >
              {coords
                ? `✓ GPS (±${gpsAccuracy ? Math.round(gpsAccuracy) : 10}m) · ${gpsLocationLabel}`
                : isLocating
                ? 'Buscando satélites...'
                : 'Sin fijar'}
            </Text>
          </View>
        </View>

        {/* Fila de Botones: ¿Dónde estoy? + Ver en Mapa 3D */}
        <View style={styles.webLocationBtnRow}>
          <TouchableOpacity
            style={styles.webBtnLocation}
            onPress={() => fetchCurrentLocation && fetchCurrentLocation(false)}
            disabled={isLocating}
          >
            {isLocating ? (
              <>
                <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.webBtnLocationText}>Obteniendo GPS...</Text>
              </>
            ) : coords ? (
              <>
                <Ionicons name="checkmark-sharp" size={18} color="#ffffff" style={{ marginRight: 4 }} />
                <Text style={styles.webBtnLocationText}>✓ Actualizar GPS</Text>
              </>
            ) : (
              <>
                <Ionicons name="locate" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.webBtnLocationText}>¿Dónde estoy?</Text>
              </>
            )}
          </TouchableOpacity>

          {onNavigateToMap ? (
            <TouchableOpacity
              style={styles.webBtnMapToggle}
              onPress={onNavigateToMap}
            >
              <Text style={styles.webBtnMapToggleText}>🗺️ Ver en Mapa 3D</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* ========================================== */}
      {/* TARJETA 2: DATOS DEL ÁRBOL                 */}
      {/* ========================================== */}
      <View style={styles.webQuickCard}>
        {/* Campo Especie / Nombre Común con Autocompletado desde FastAPI */}
        <View style={styles.webFormItem}>
          <View style={styles.labelRowBetween}>
            <Text style={styles.webItemLabel}>
              🌱 Especie o Nombre Común <Text style={styles.webReq}>*</Text>
            </Text>
            {selectedSpeciesId ? (
              <View style={styles.catalogLinkedBadge}>
                <Text style={styles.catalogLinkedText}>✓ Vinculada al catálogo</Text>
              </View>
            ) : null}
          </View>
          <TextInput
            style={styles.webItemInput}
            value={speciesName}
            onChangeText={(txt) => {
              setSpeciesName(txt);
              if (setSelectedSpeciesId) {
                const exact = displaySpeciesCatalog.find(
                  (s) => (s.name || '').toLowerCase() === txt.trim().toLowerCase()
                );
                setSelectedSpeciesId(exact ? exact.id : null);
              }
            }}
            placeholder="Escribe o elige del catálogo (Ej. Trupillo, Caracolí, Mamón...)"
            placeholderTextColor="#94a3b8"
          />

          {/* Chips rápidos de especies reales del servidor */}
          {speciesSuggestions.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestionsScroll}
            >
              {speciesSuggestions.map((sp) => {
                const isSelected =
                  (speciesName || '').trim().toLowerCase() === (sp.name || '').toLowerCase();
                return (
                  <TouchableOpacity
                    key={sp.id}
                    style={[
                      styles.suggestionChip,
                      isSelected && styles.suggestionChipActive
                    ]}
                    onPress={() => handlePickSpeciesSuggestion(sp)}
                  >
                    <Text
                      style={[
                        styles.suggestionChipTitle,
                        isSelected && { color: '#ffffff' }
                      ]}
                    >
                      🌿 {sp.name}
                    </Text>
                    <Text
                      style={[
                        styles.suggestionChipSci,
                        isSelected && { color: '#d1fae5' }
                      ]}
                    >
                      {sp.scientific}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : null}
        </View>

        {/* Altura 3D Estimada para el Catastro Arbóreo */}
        <View style={[styles.webFormItem, { marginTop: 14 }]}>
          <View style={styles.labelRowBetween}>
            <Text style={styles.webItemLabel}>📏 Altura Estimada (Catastro 3D)</Text>
            <View style={styles.catalogLinkedBadge}>
              <Text style={styles.catalogLinkedText}>{treeHeight} metros</Text>
            </View>
          </View>
          <View style={styles.webHealthChipsRow}>
            {HEIGHT_PRESETS.map((hp) => {
              const active = Number(treeHeight) === hp.meters;
              return (
                <TouchableOpacity
                  key={hp.meters}
                  style={[styles.webMiniChip, active && styles.webMiniChipActive]}
                  onPress={() => setTreeHeight && setTreeHeight(hp.meters)}
                >
                  <Text style={[styles.webMiniChipText, active && styles.webMiniChipTextActive]}>
                    {hp.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Botón para desplegar opciones secundarias */}
        <View style={styles.webExtraToggleWrap}>
          <TouchableOpacity
            style={styles.webBtnExtraPill}
            onPress={() => setExtraOptionsOpen && setExtraOptionsOpen(!extraOptionsOpen)}
          >
            <Text style={styles.webPillIcon}>✨</Text>
            <Text style={styles.webExtraBtnText}>
              Opciones adicionales (Foto, Comunidad, Salud, Notas)
            </Text>
            <Text style={styles.webPillArrow}>{extraOptionsOpen ? '▲' : '▼'}</Text>
          </TouchableOpacity>
        </View>

        {/* Sección secundaria estilizada */}
        {extraOptionsOpen && (
          <View style={styles.webExtraFieldsPanel}>
            {/* Selector de Comunidad Real de FastAPI (GET /api/communities) */}
            {apiCommunities.length > 0 && setSelectedCommunityId ? (
              <View style={styles.webFormItem}>
                <Text style={styles.webItemLabelMini}>🤝 Vincular a Comunidad</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.muniQuickScroll}
                >
                  <TouchableOpacity
                    style={[
                      styles.muniChip,
                      !selectedCommunityId && styles.muniChipActive
                    ]}
                    onPress={() => setSelectedCommunityId(null)}
                  >
                    <Text
                      style={[
                        styles.muniChipText,
                        !selectedCommunityId && styles.muniChipTextActive
                      ]}
                    >
                      Individual
                    </Text>
                  </TouchableOpacity>
                  {apiCommunities.map((com) => {
                    const isComActive = selectedCommunityId === com.id;
                    return (
                      <TouchableOpacity
                        key={com.id}
                        style={[styles.muniChip, isComActive && styles.muniChipActive]}
                        onPress={() => setSelectedCommunityId(com.id)}
                      >
                        <Text
                          style={[
                            styles.muniChipText,
                            isComActive && styles.muniChipTextActive
                          ]}
                        >
                          🌱 {(com.name || '').trim()}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

            {/* Foto Rápida */}
            <View style={styles.webFormItem}>
              <Text style={styles.webItemLabelMini}>📷 Fotografía del Árbol</Text>
              {photoUri ? (
                <View style={styles.webPhotoPreviewThumb}>
                  <Image source={{ uri: photoUri }} style={styles.webThumbImg} />
                  <View style={styles.webThumbInfo}>
                    <Text style={styles.webThumbFilename} numberOfLines={1}>
                      foto_arbol_campo.jpg
                    </Text>
                    <TouchableOpacity
                      style={styles.webBtnRemoveThumb}
                      onPress={() => setPhotoUri && setPhotoUri(null)}
                    >
                      <Text style={styles.webBtnRemoveThumbText}>✕ Quitar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.webPhotoBtnStyled}
                  onPress={handlePhotoSelect}
                >
                  <Ionicons name="camera-outline" size={20} color={colors.primary} />
                  <Text style={styles.webPhotoBtnStyledText}>
                    Tomar foto o subir imagen
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Chips de Salud Fitosanitaria en 1 toque */}
            <View style={styles.webFormItem}>
              <Text style={styles.webItemLabelMini}>🌿 Condición de Salud</Text>
              <View style={styles.webHealthChipsRow}>
                {HEALTH_CHIPS.map((chip) => {
                  const isActive = healthState === chip.id;
                  return (
                    <TouchableOpacity
                      key={chip.id}
                      style={[
                        styles.webMiniChip,
                        isActive && styles.webMiniChipActive
                      ]}
                      onPress={() => setHealthState && setHealthState(chip.id)}
                    >
                      <Text
                        style={[
                          styles.webMiniChipText,
                          isActive && styles.webMiniChipTextActive
                        ]}
                      >
                        {chip.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Notas de Campo */}
            <View style={styles.webFormItem}>
              <Text style={styles.webItemLabelMini}>📝 Notas u Observaciones</Text>
              <TextInput
                style={[styles.webItemInput, styles.webItemTextarea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Altura aproximada, presencia de frutos, estado del suelo..."
                placeholderTextColor="#94a3b8"
                multiline={true}
                numberOfLines={3}
              />
            </View>
          </View>
        )}

        {/* Botón Guardar y Switch de Modo Continuo */}
        <View style={styles.webSubmitSection}>
          <TouchableOpacity
            style={styles.webBtnSubmitMain}
            onPress={handleSaveTree}
            activeOpacity={0.85}
          >
            <Text style={styles.webBtnSubmitMainText}>🌱 Guardar Registro del Árbol</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.webContinuousCheckRow}
            onPress={() => setContinuousMode && setContinuousMode(!continuousMode)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={continuousMode ? 'checkbox' : 'square-outline'}
              size={20}
              color={continuousMode ? colors.primary : '#94a3b8'}
            />
            <Text style={styles.webContinuousCheckLabel}>
              Seguir registrando más árboles en este mismo sector (Modo Ráfaga)
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  webFormContent: {
    padding: 16,
    paddingBottom: 40
  },
  webPageTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 12,
    textAlign: 'center'
  },
  webAlertSuccess: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#10b981',
    padding: 12,
    borderRadius: 10,
    marginBottom: 14
  },
  webAlertSuccessText: {
    color: '#065f46',
    fontWeight: '700',
    fontSize: 13
  },
  webAlertError: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#ef4444',
    padding: 12,
    borderRadius: 10,
    marginBottom: 14
  },
  webAlertErrorText: {
    color: '#991b1b',
    fontWeight: '700',
    fontSize: 13
  },
  webQuickCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    ...shadows.sm
  },
  webCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12
  },
  webHeaderIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center'
  },
  webCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a'
  },
  webCardSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1
  },
  webCoordsBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12
  },
  webCoordPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffffff',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  webCoordTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b'
  },
  webCoordVal: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#94a3b8'
  },
  webCoordValActive: {
    color: '#0f172a',
    fontWeight: '700'
  },
  webGpsStatusBadge: {
    marginLeft: 'auto',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999
  },
  webGpsStatusWaiting: {
    backgroundColor: '#fef3c7'
  },
  webGpsStatusReady: {
    backgroundColor: '#d1fae5'
  },
  webGpsStatusText: {
    fontSize: 11,
    fontWeight: '700'
  },
  webGpsStatusTextWaiting: {
    color: '#92400e'
  },
  webGpsStatusTextReady: {
    color: '#065f46'
  },
  webLocationBtnRow: {
    flexDirection: 'row',
    gap: 8
  },
  webBtnLocation: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 10
  },
  webBtnLocationText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13
  },
  webBtnMapToggle: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  webBtnMapToggleText: {
    color: '#0f172a',
    fontWeight: '600',
    fontSize: 12
  },
  webFormItem: {
    flexDirection: 'column',
    gap: 6
  },
  labelRowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  webItemLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a'
  },
  webReq: {
    color: '#ef4444'
  },
  catalogLinkedBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6
  },
  catalogLinkedText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065f46'
  },
  searchTerritoryLink: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary
  },
  webItemInput: {
    width: '100%',
    paddingVertical: 11,
    paddingHorizontal: 12,
    fontSize: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    color: '#0f172a'
  },
  suggestionsScroll: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4
  },
  suggestionChip: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5
  },
  suggestionChipActive: {
    backgroundColor: '#065f46',
    borderColor: '#065f46'
  },
  suggestionChipTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a'
  },
  suggestionChipSci: {
    fontSize: 9,
    fontStyle: 'italic',
    color: '#64748b'
  },
  muniQuickScroll: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4
  },
  muniChip: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  muniChipActive: {
    backgroundColor: '#065f46',
    borderColor: '#065f46'
  },
  muniChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569'
  },
  muniChipTextActive: {
    color: '#ffffff'
  },
  webItemTextarea: {
    minHeight: 74,
    textAlignVertical: 'top'
  },
  webExtraToggleWrap: {
    marginTop: 14
  },
  webBtnExtraPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10
  },
  webPillIcon: {
    fontSize: 14,
    marginRight: 6
  },
  webExtraBtnText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '600',
    color: '#475569'
  },
  webPillArrow: {
    fontSize: 11,
    color: '#64748b'
  },
  webExtraFieldsPanel: {
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 14
  },
  webItemLabelMini: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 2
  },
  webPhotoBtnStyled: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    borderRadius: 10,
    padding: 12
  },
  webPhotoBtnStyledText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary
  },
  webPhotoPreviewThumb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  webThumbImg: {
    width: 54,
    height: 54,
    borderRadius: 8,
    backgroundColor: '#e2e8f0'
  },
  webThumbInfo: {
    flex: 1,
    gap: 4
  },
  webThumbFilename: {
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '600'
  },
  webBtnRemoveThumb: {
    alignSelf: 'flex-start',
    backgroundColor: '#fee2e2',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6
  },
  webBtnRemoveThumbText: {
    color: '#b91c1c',
    fontSize: 11,
    fontWeight: '700'
  },
  webHealthChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  webMiniChip: {
    width: '48%',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    alignItems: 'center'
  },
  webMiniChipActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981'
  },
  webMiniChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569'
  },
  webMiniChipTextActive: {
    color: '#065f46',
    fontWeight: '700'
  },
  webSubmitSection: {
    marginTop: 18,
    gap: 10
  },
  webBtnSubmitMain: {
    width: '100%',
    paddingVertical: 14,
    backgroundColor: colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md
  },
  webBtnSubmitMainText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800'
  },
  webContinuousCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4
  },
  webContinuousCheckLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500'
  }
});
