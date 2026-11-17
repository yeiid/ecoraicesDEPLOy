/**
 * EcoRaíces Mobile · Modal de Selección de Territorio Nacional / Pionero
 */

import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../theme';
import { COLOMBIA_TERRITORIOS } from '../constants/guajira';

export default function TerritoryModal({
  visible,
  onClose,
  territorySearch,
  setTerritorySearch,
  userTerritory,
  onSelectTerritory
}) {
  const handleSelect = (name, fullLabel) => {
    onSelectTerritory(name, fullLabel);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.territoryModalCard}>
          <View style={styles.territoryModalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.territoryModalTitle}>Selecciona tu Territorio</Text>
              <Text style={styles.territoryModalSubtitle}>
                Fase pionera en La Guajira • Cobertura en toda Colombia
              </Text>
            </View>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
              <Text style={styles.modalCloseBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Buscador interactivo de ciudades y municipios */}
          <View style={styles.territorySearchBox}>
            <Ionicons name="search" size={16} color="#64748b" style={{ marginRight: 6 }} />
            <TextInput
              style={styles.territorySearchInput}
              placeholder="Buscar municipio, ciudad o departamento..."
              placeholderTextColor="#94a3b8"
              value={territorySearch}
              onChangeText={setTerritorySearch}
            />
            {territorySearch.length > 0 && (
              <TouchableOpacity onPress={() => setTerritorySearch('')}>
                <Ionicons name="close-circle" size={16} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Opción personalizada si el usuario escribe un lugar no listado */}
          {territorySearch.trim().length > 1 && (
            <TouchableOpacity
              style={styles.customTerritoryBtn}
              onPress={() => {
                const custom = territorySearch.trim();
                handleSelect(custom, custom);
              }}
            >
              <Ionicons name="add-circle" size={18} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.customTerritoryBtnText}>
                Usar "{territorySearch.trim()}" en Colombia
              </Text>
            </TouchableOpacity>
          )}

          <ScrollView style={styles.territoryModalList} showsVerticalScrollIndicator={true}>
            {COLOMBIA_TERRITORIOS.filter((item) => {
              if (!territorySearch.trim()) return true;
              const q = territorySearch.trim().toLowerCase();
              return (
                item.name.toLowerCase().includes(q) ||
                item.region.toLowerCase().includes(q) ||
                item.tag.toLowerCase().includes(q)
              );
            }).map((item) => {
              const fullLabel = `${item.name}, ${item.region}`;
              const isSelected =
                userTerritory === item.name ||
                userTerritory === fullLabel ||
                userTerritory.toLowerCase().startsWith(item.name.toLowerCase());
              return (
                <TouchableOpacity
                  key={`${item.name}-${item.region}`}
                  style={[styles.territoryModalItem, isSelected && styles.territoryModalItemSelected]}
                  onPress={() => handleSelect(item.name, fullLabel)}
                >
                  <View style={styles.territoryItemLeft}>
                    <Text style={{ fontSize: 16 }}>📍</Text>
                    <View>
                      <Text style={[styles.territoryItemText, isSelected && styles.territoryItemTextSelected]}>
                        {item.name}
                      </Text>
                      <Text style={styles.territoryItemRegion}>{item.region}</Text>
                    </View>
                  </View>
                  <View style={styles.territoryItemRight}>
                    <View
                      style={[
                        styles.territoryTagPill,
                        item.tag === 'Pionero' ? styles.tagPionero : styles.tagNacional
                      ]}
                    >
                      <Text
                        style={[
                          styles.territoryTagText,
                          item.tag === 'Pionero' ? styles.tagPioneroText : styles.tagNacionalText
                        ]}
                      >
                        {item.tag}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={{ marginLeft: 6 }} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalCloseBtnText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '800'
  },
  territoryModalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    padding: 16,
    paddingBottom: 32
  },
  territoryModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  territoryModalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a'
  },
  territoryModalSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2
  },
  territorySearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10
  },
  territorySearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a'
  },
  customTerritoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10
  },
  customTerritoryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary
  },
  territoryModalList: {
    maxHeight: 340
  },
  territoryModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'transparent'
  },
  territoryModalItemSelected: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac'
  },
  territoryItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  territoryItemText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a'
  },
  territoryItemTextSelected: {
    color: colors.primary,
    fontWeight: '800'
  },
  territoryItemRegion: {
    fontSize: 10,
    color: '#64748b'
  },
  territoryItemRight: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  territoryTagPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10
  },
  tagPionero: {
    backgroundColor: '#dcfce7'
  },
  tagNacional: {
    backgroundColor: '#e0f2fe'
  },
  tagPioneroText: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '800'
  },
  tagNacionalText: {
    color: colors.info,
    fontSize: 9,
    fontWeight: '800'
  }
});
