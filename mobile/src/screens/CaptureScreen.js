/**
 * EcoRaíces Mobile · Pantalla de Captura en Campo (Censar)
 * Georreferenciación GPS, foto de campo, datos botánicos y guardado offline SQLite.
 */

import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../theme';

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
  fetchCurrentLocation,
  saveSuccessBanner,
  saveErrorBanner,
  speciesName,
  setSpeciesName,
  municipio,
  setMunicipio,
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
  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.webFormContent}>
      {/* Título de la Página */}
      <Text style={styles.webPageTitle}>Formulario de Registro de Especies</Text>

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
            <Text style={styles.webCardTitle}>Ubicación Actual</Text>
            <Text style={styles.webCardSubtitle}>Georreferenciación GPS en campo</Text>
          </View>
        </View>

        {/* Caja de Coordenadas */}
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
                ? `✓ GPS fijado (±${gpsAccuracy ? Math.round(gpsAccuracy) : 10}m)`
                : isLocating
                ? 'Buscando satélites...'
                : 'Sin fijar'}
            </Text>
          </View>
        </View>

        {/* Fila de Botones: ¿Dónde estoy? + Ajustar en mapa */}
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
                <Text style={styles.webBtnLocationText}>✓ Ubicación fijada</Text>
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
              <Text style={styles.webBtnMapToggleText}>🗺️ Ajustar en mapa</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* ========================================== */}
      {/* TARJETA 2: DATOS DEL ÁRBOL                 */}
      {/* ========================================== */}
      <View style={styles.webQuickCard}>
        {/* Campo Especie / Nombre Común */}
        <View style={styles.webFormItem}>
          <Text style={styles.webItemLabel}>
            🌱 Especie o Nombre Común <Text style={styles.webReq}>*</Text>
          </Text>
          <TextInput
            style={styles.webItemInput}
            value={speciesName}
            onChangeText={setSpeciesName}
            placeholder="Ej. Trupillo, Guayacán, Ceiba, Olleto..."
            placeholderTextColor="#94a3b8"
          />
        </View>

        {/* Campo Municipio */}
        <View style={[styles.webFormItem, { marginTop: 14 }]}>
          <Text style={styles.webItemLabel}>
            📍 Municipio o Sector <Text style={styles.webReq}>*</Text>
          </Text>
          <TextInput
            style={styles.webItemInput}
            value={municipio}
            onChangeText={setMunicipio}
            placeholder="Seleccione o escriba un municipio"
            placeholderTextColor="#94a3b8"
          />
        </View>

        {/* Botón para desplegar opciones secundarias */}
        <View style={styles.webExtraToggleWrap}>
          <TouchableOpacity
            style={styles.webBtnExtraPill}
            onPress={() => setExtraOptionsOpen && setExtraOptionsOpen(!extraOptionsOpen)}
          >
            <Text style={styles.webPillIcon}>✨</Text>
            <Text style={styles.webExtraBtnText}>
              Opciones adicionales (Foto, Salud, Notas)
            </Text>
            <Text style={styles.webPillArrow}>{extraOptionsOpen ? '▲' : '▼'}</Text>
          </TouchableOpacity>
        </View>

        {/* Sección secundaria estilizada */}
        {extraOptionsOpen && (
          <View style={styles.webExtraFieldsPanel}>
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

            {/* Notas Breves */}
            <View style={styles.webFormItem}>
              <Text style={styles.webItemLabelMini}>📝 Notas breves de campo</Text>
              <TextInput
                style={[styles.webItemInput, styles.webInputCompact]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Ej. Altura 6m, cerca a la quebrada, tronco espinoso..."
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>
        )}

        {/* Botón Enviar Principal con estilo EcoRaíces */}
        <TouchableOpacity
          style={styles.webBtnSendEcoraices}
          onPress={handleSaveTree}
        >
          <Ionicons name="shield-checkmark-outline" size={20} color="#ffffff" style={{ marginRight: 6 }} />
          <Text style={styles.webBtnSendEcoraicesText}>Enviar Registro</Text>
        </TouchableOpacity>

        {/* Modo ráfaga continua para registrar y continuar */}
        <TouchableOpacity
          style={styles.webContinuousModeToggle}
          onPress={() => setContinuousMode && setContinuousMode(!continuousMode)}
        >
          <Ionicons
            name={continuousMode ? 'checkbox' : 'square-outline'}
            size={18}
            color={continuousMode ? colors.primary : '#94a3b8'}
          />
          <Text style={styles.webContinuousModeText}>
            ⚡ Modo ráfaga: registrar y continuar con el siguiente árbol
          </Text>
        </TouchableOpacity>
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
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16
  },
  webAlertSuccess: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    alignItems: 'center'
  },
  webAlertSuccessText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700'
  },
  webAlertError: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    alignItems: 'center'
  },
  webAlertErrorText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700'
  },
  webQuickCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
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
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
    alignItems: 'center',
    justifyContent: 'center'
  },
  webCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#14532d'
  },
  webCardSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1
  },
  webCoordsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12
  },
  webCoordPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  webCoordTag: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b'
  },
  webCoordVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'
  },
  webCoordValActive: {
    color: colors.primary
  },
  webGpsStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1
  },
  webGpsStatusReady: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac'
  },
  webGpsStatusWaiting: {
    backgroundColor: '#fef3c7',
    borderColor: '#fde68a'
  },
  webGpsStatusText: {
    fontSize: 10,
    fontWeight: '700'
  },
  webGpsStatusTextReady: {
    color: colors.primary
  },
  webGpsStatusTextWaiting: {
    color: colors.warning
  },
  webLocationBtnRow: {
    flexDirection: 'row',
    gap: 10
  },
  webBtnLocation: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger,
    paddingVertical: 12,
    borderRadius: 8,
    ...shadows.sm
  },
  webBtnLocationText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800'
  },
  webBtnMapToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8
  },
  webBtnMapToggleText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700'
  },
  webFormItem: {
    marginBottom: 4
  },
  webItemLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6
  },
  webReq: {
    color: colors.danger,
    fontWeight: '800'
  },
  webItemInput: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
    backgroundColor: '#ffffff'
  },
  webInputCompact: {
    paddingVertical: 8,
    fontSize: 12
  },
  webExtraToggleWrap: {
    alignItems: 'center',
    marginVertical: 14
  },
  webBtnExtraPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14
  },
  webPillIcon: {
    fontSize: 13
  },
  webExtraBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155'
  },
  webPillArrow: {
    fontSize: 11,
    color: '#64748b'
  },
  webExtraFieldsPanel: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    gap: 12
  },
  webItemLabelMini: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    marginBottom: 6
  },
  webPhotoBtnStyled: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#86efac',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 14
  },
  webPhotoBtnStyledText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800'
  },
  webPhotoPreviewThumb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 8
  },
  webThumbImg: {
    width: 48,
    height: 48,
    borderRadius: 6
  },
  webThumbInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  webThumbFilename: {
    fontSize: 11,
    color: '#0f172a',
    fontWeight: '600',
    maxWidth: 160
  },
  webBtnRemoveThumb: {
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  webBtnRemoveThumbText: {
    color: colors.danger,
    fontSize: 10,
    fontWeight: '700'
  },
  webHealthChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  webMiniChip: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  webMiniChipActive: {
    backgroundColor: '#dcfce7',
    borderColor: colors.primary
  },
  webMiniChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b'
  },
  webMiniChipTextActive: {
    color: colors.primary,
    fontWeight: '800'
  },
  webBtnSendEcoraices: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 6,
    ...shadows.md
  },
  webBtnSendEcoraicesText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800'
  },
  webContinuousModeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12
  },
  webContinuousModeText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600'
  }
});
