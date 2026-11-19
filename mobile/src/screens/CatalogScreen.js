/**
 * EcoRaíces Mobile · Pantalla de Catálogo de Especies & Ficha Botánica
 * Conectado a GET /api/species, GET /api/categories y GET /api/species/{id} de FastAPI sin conteos ficticios.
 */

import React, { useState, useEffect } from 'react';
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
  apiCategories = [],
  selectedCategoryFilter = null,
  setSelectedCategoryFilter,
  catalogLoading = false,
  catalogSearch = '',
  setCatalogSearch,
  selectedSpeciesDetail,
  setSelectedSpeciesDetail,
  onSelectSpeciesForCapture,
  serverUrl = 'https://ecoraices.neuraljira.tech'
}) {
  const [liveSpeciesDetail, setLiveSpeciesDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Consultar GET /api/species/{id} en vivo cuando el usuario abre una especie del catálogo
  useEffect(() => {
    let isMounted = true;
    if (!selectedSpeciesDetail || !selectedSpeciesDetail.id) {
      setLiveSpeciesDetail(null);
      return;
    }

    const fetchDetail = async () => {
      setDetailLoading(true);
      try {
        const cleanUrl = (serverUrl || 'https://ecoraices.neuraljira.tech').replace(/\/+$/, '');
        const res = await fetch(`${cleanUrl}/api/species/${selectedSpeciesDetail.id}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setLiveSpeciesDetail(data);
        }
      } catch (_) {
        // Fallback silencioso a los datos ya cargados en memoria
      } finally {
        if (isMounted) setDetailLoading(false);
      }
    };

    fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [selectedSpeciesDetail, serverUrl]);

  const activeObservations = liveSpeciesDetail?.observations || [];

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.catalogContent}>
      {/* Tarjeta de Encabezado, Búsqueda y Filtro por Categorías Reales */}
      <View style={styles.catalogHeaderCard}>
        <View style={styles.catalogTitleRow}>
          <Text style={styles.catalogTitle}>Catálogo Botánico</Text>
          {catalogLoading && <ActivityIndicator size="small" color={colors.primary} />}
        </View>
        <Text style={styles.catalogSubtitle}>
          {displaySpeciesCatalog.length} especies sincronizadas desde el servidor EcoRaíces.
        </Text>

        {/* Buscador de especies */}
        <View style={styles.catalogSearchInputBox}>
          <Ionicons name="search" size={16} color="#64748b" />
          <TextInput
            style={styles.catalogSearchInput}
            placeholder="Buscar por nombre común, científico o familia..."
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

        {/* Píldoras de Categorías Reales de FastAPI (GET /api/categories) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesFilterRow}
        >
          <TouchableOpacity
            style={[
              styles.catFilterChip,
              !selectedCategoryFilter && styles.catFilterChipActive
            ]}
            onPress={() => setSelectedCategoryFilter && setSelectedCategoryFilter(null)}
          >
            <Text
              style={[
                styles.catFilterChipText,
                !selectedCategoryFilter && styles.catFilterChipTextActive
              ]}
            >
              🌿 Todas las categorías
            </Text>
          </TouchableOpacity>

          {apiCategories.map((cat) => {
            const isSelected =
              selectedCategoryFilter === cat.id || selectedCategoryFilter === cat.name;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.catFilterChip, isSelected && styles.catFilterChipActive]}
                onPress={() =>
                  setSelectedCategoryFilter &&
                  setSelectedCategoryFilter(isSelected ? null : cat.name)
                }
              >
                <Text
                  style={[
                    styles.catFilterChipText,
                    isSelected && styles.catFilterChipTextActive
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Cuadrícula de Especies Reales */}
      <View style={styles.speciesGrid}>
        {displaySpeciesCatalog.map((sp) => (
          <TouchableOpacity
            key={sp.id}
            style={styles.speciesGridCard}
            onPress={() => setSelectedSpeciesDetail && setSelectedSpeciesDetail(sp)}
            activeOpacity={0.85}
          >
            <Image source={{ uri: sp.photo }} style={styles.speciesCardImg} />
            <View style={styles.speciesCardBody}>
              <View style={styles.speciesBadgeRow}>
                <Text style={[styles.speciesTagBadge, sp.isInvasive && styles.speciesTagInvasive]} numberOfLines={1}>
                  {sp.category || sp.tag}
                </Text>
              </View>
              <Text style={styles.speciesCardTitle} numberOfLines={1}>{sp.name}</Text>
              <Text style={styles.speciesCardScientific} numberOfLines={1}>{sp.scientific}</Text>
              <View style={styles.speciesCardFooter}>
                <Text style={styles.speciesFamilyText} numberOfLines={1}>
                  🧬 {sp.family || 'Flora Tropical'}
                </Text>
                {sp.sightingsCount > 0 ? (
                  <Text style={styles.speciesSightings}>📍 {sp.sightingsCount}</Text>
                ) : null}
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Modal Ficha Botánica Conectada a GET /api/species/{id} */}
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
                      {selectedSpeciesDetail.family ? (
                        <View style={styles.modalBadge}>
                          <Text style={styles.modalBadgeText}>Familia: {selectedSpeciesDetail.family}</Text>
                        </View>
                      ) : null}
                      {selectedSpeciesDetail.category ? (
                        <View style={styles.modalBadge}>
                          <Text style={styles.modalBadgeText}>{selectedSpeciesDetail.category}</Text>
                        </View>
                      ) : null}
                      {selectedSpeciesDetail.gbifKey ? (
                        <View style={styles.modalBadge}>
                          <Text style={styles.modalBadgeText}>GBIF #{selectedSpeciesDetail.gbifKey}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>📖 Descripción Taxonómica y Botánica</Text>
                    <Text style={styles.modalSectionText}>
                      {liveSpeciesDetail?.description ||
                        selectedSpeciesDetail.botanicalDescription ||
                        `Especie vegetal (${selectedSpeciesDetail.scientific}) perteneciente a la familia ${selectedSpeciesDetail.family || 'botánica'} clasificada dentro de ${selectedSpeciesDetail.category || 'la flora del territorio'}.`}
                    </Text>
                  </View>

                  {(liveSpeciesDetail?.habitat || selectedSpeciesDetail.ecologicalValue) ? (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>🌿 Hábitat y Valor Ecológico</Text>
                      <Text style={styles.modalSectionText}>
                        {liveSpeciesDetail?.habitat || selectedSpeciesDetail.ecologicalValue}
                      </Text>
                    </View>
                  ) : null}

                  {/* Observaciones reales registradas de esta especie en el servidor */}
                  <View style={styles.modalSection}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={styles.modalSectionTitle}>
                        📍 Avistamientos Registrados ({activeObservations.length || selectedSpeciesDetail.sightingsCount || 0})
                      </Text>
                      {detailLoading && <ActivityIndicator size="small" color={colors.primary} />}
                    </View>
                    {activeObservations.length > 0 ? (
                      activeObservations.slice(0, 5).map((obs) => (
                        <View key={obs.id} style={styles.modalObsRow}>
                          <Text style={styles.modalObsText}>
                            • {obs.municipio || 'Territorio'} ({Number(obs.latitude).toFixed(4)}, {Number(obs.longitude).toFixed(4)})
                            {obs.user?.username ? ` — @${obs.user.username}` : ''}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.modalSectionText}>
                        Aún no hay ejemplares georreferenciados para esta especie en el servidor. ¡Sé el primero en registrarla en campo!
                      </Text>
                    )}
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
                        🌿 Censar ejemplar de {selectedSpeciesDetail.name} en Campo
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
  categoriesFilterRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10
  },
  catFilterChip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  catFilterChipActive: {
    backgroundColor: '#065f46',
    borderColor: '#065f46'
  },
  catFilterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569'
  },
  catFilterChipTextActive: {
    color: '#ffffff'
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
    fontSize: 8.5,
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
  speciesCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6
  },
  speciesFamilyText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#475569',
    flex: 1
  },
  speciesSightings: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#059669'
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
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8
  },
  modalBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  modalBadgeText: {
    fontSize: 10.5,
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
  modalObsRow: {
    backgroundColor: '#f8fafc',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  modalObsText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600'
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
