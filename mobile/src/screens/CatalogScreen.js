/**
 * EcoRaíces Mobile · Pantalla de Catálogo de Especies & Ficha Botánica
 * Búsqueda en tiempo real, listado de especies nativas, visor de avistamientos y modal de ficha botánica completa.
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
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../theme';

export default function CatalogScreen({
  displaySpeciesCatalog = [],
  catalogLoading = false,
  catalogSearch = '',
  setCatalogSearch,
  selectedSpeciesDetail,
  setSelectedSpeciesDetail,
  onSelectSpeciesForCapture
}) {
  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.catalogContent}>
      {/* Tarjeta de Encabezado y Búsqueda */}
      <View style={styles.catalogHeaderCard}>
        <View style={styles.catalogTitleRow}>
          <Text style={styles.catalogTitle}>Catálogo de Especies</Text>
          {catalogLoading && <ActivityIndicator size="small" color={colors.primary} />}
        </View>
        <Text style={styles.catalogSubtitle}>
          Conectado con la API de FastAPI ({displaySpeciesCatalog.length} especies cargadas con fichas botánicas).
        </Text>

        {/* Buscador de especies */}
        <View style={styles.catalogSearchInputBox}>
          <Ionicons name="search" size={16} color="#64748b" />
          <TextInput
            style={styles.catalogSearchInput}
            placeholder="Buscar especie por nombre o nombre científico..."
            placeholderTextColor="#94a3b8"
            value={catalogSearch}
            onChangeText={setCatalogSearch}
          />
          {catalogSearch.length > 0 && (
            <TouchableOpacity onPress={() => setCatalogSearch && setCatalogSearch('')}>
              <Ionicons name="close-circle" size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Cuadrícula de Especies */}
      <View style={styles.speciesGrid}>
        {displaySpeciesCatalog.map((sp) => (
          <TouchableOpacity
            key={sp.id}
            style={styles.speciesGridCard}
            onPress={() => setSelectedSpeciesDetail && setSelectedSpeciesDetail(sp)}
          >
            <Image source={{ uri: sp.photo }} style={styles.speciesCardImg} />
            <View style={styles.speciesCardBody}>
              <View style={styles.speciesBadgeRow}>
                <Text style={[styles.speciesTagBadge, sp.isInvasive && styles.speciesTagInvasive]}>
                  {sp.tag}
                </Text>
              </View>
              <Text style={styles.speciesCardTitle}>{sp.name}</Text>
              <Text style={styles.speciesCardScientific}>{sp.scientific}</Text>
              <Text style={styles.speciesSightings}>📍 {sp.sightingsCount} avistamientos</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Modal Ficha Botánica */}
      <Modal
        visible={Boolean(selectedSpeciesDetail)}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedSpeciesDetail && setSelectedSpeciesDetail(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {selectedSpeciesDetail ? (
              <>
                <Image source={{ uri: selectedSpeciesDetail.photo }} style={styles.modalBannerImg} />
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setSelectedSpeciesDetail && setSelectedSpeciesDetail(null)}
                >
                  <Text style={styles.modalCloseBtnText}>✕</Text>
                </TouchableOpacity>

                <ScrollView contentContainerStyle={styles.modalBodyScroll}>
                  <View style={styles.modalHeaderInfo}>
                    <Text style={styles.modalSpeciesName}>{selectedSpeciesDetail.name}</Text>
                    <Text style={styles.modalScientific}>{selectedSpeciesDetail.scientific}</Text>
                    <View style={styles.modalBadgesRow}>
                      <View style={styles.modalBadge}>
                        <Text style={styles.modalBadgeText}>{selectedSpeciesDetail.family}</Text>
                      </View>
                      <View style={[styles.modalBadge, selectedSpeciesDetail.isInvasive && styles.modalBadgeInvasive]}>
                        <Text style={styles.modalBadgeText}>{selectedSpeciesDetail.status}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>📖 Descripción Botánica</Text>
                    <Text style={styles.modalSectionText}>{selectedSpeciesDetail.botanicalDescription}</Text>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>🌿 Valor Ecológico en Bosque Seco</Text>
                    <Text style={styles.modalSectionText}>{selectedSpeciesDetail.ecologicalValue}</Text>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>🍵 Usos Medicinales y Tradición</Text>
                    <Text style={styles.modalSectionText}>
                      {selectedSpeciesDetail.medicinalUses || selectedSpeciesDetail.traditionalUses || 'No especificado.'}
                    </Text>
                  </View>

                  {onSelectSpeciesForCapture ? (
                    <TouchableOpacity
                      style={styles.modalRegisterActionBtn}
                      onPress={() => {
                        const sp = selectedSpeciesDetail;
                        setSelectedSpeciesDetail(null);
                        onSelectSpeciesForCapture(sp);
                      }}
                    >
                      <Text style={styles.modalRegisterActionBtnText}>
                        🌿 Registrar este árbol en Campo
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </ScrollView>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  catalogContent: {
    padding: 16,
    paddingBottom: 40
  },
  catalogHeaderCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
    ...shadows.sm
  },
  catalogTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  catalogTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.primary
  },
  catalogSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4
  },
  catalogSearchInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 10
  },
  catalogSearchInput: {
    flex: 1,
    fontSize: 12,
    color: '#0f172a'
  },
  speciesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  speciesGridCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...shadows.sm
  },
  speciesCardImg: {
    width: '100%',
    height: 110,
    backgroundColor: '#e2e8f0'
  },
  speciesCardBody: {
    padding: 10
  },
  speciesBadgeRow: {
    marginBottom: 4
  },
  speciesTagBadge: {
    fontSize: 8,
    fontWeight: '800',
    backgroundColor: '#dcfce7',
    color: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start'
  },
  speciesTagInvasive: {
    backgroundColor: '#fee2e2',
    color: colors.danger
  },
  speciesCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a'
  },
  speciesCardScientific: {
    fontSize: 10,
    fontStyle: 'italic',
    color: '#64748b',
    marginTop: 1
  },
  speciesSightings: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.info,
    marginTop: 6
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    overflow: 'hidden'
  },
  modalBannerImg: {
    width: '100%',
    height: 180,
    backgroundColor: '#e2e8f0'
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10
  },
  modalCloseBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800'
  },
  modalBodyScroll: {
    padding: 16,
    paddingBottom: 40
  },
  modalHeaderInfo: {
    marginBottom: 14
  },
  modalSpeciesName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a'
  },
  modalScientific: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#64748b',
    marginTop: 2
  },
  modalBadgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8
  },
  modalBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  modalBadgeInvasive: {
    backgroundColor: '#fee2e2'
  },
  modalBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569'
  },
  modalSection: {
    marginBottom: 12
  },
  modalSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 4
  },
  modalSectionText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18
  },
  modalRegisterActionBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10
  },
  modalRegisterActionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800'
  }
});
