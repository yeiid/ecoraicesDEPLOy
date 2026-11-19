/**
 * EcoRaíces Mobile · Panel de Registro Directo en el Catastro Arbóreo 3D
 * Permite ubicar un árbol tocando el mapa, ajustar su altura 3D en vivo y guardarlo
 * inmediatamente como objeto geoespacial 3D en SQLite + FastAPI/PostGIS.
 */

import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const HEIGHT_PRESETS = [5, 8, 12, 16];

const HEALTH_OPTIONS = [
  { id: 'Sano y vigoroso', label: '🌳 Sano' },
  { id: 'Con floración o frutos', label: '🌸 Flores' },
  { id: 'Dañado o talado', label: '🪓 Dañado' },
  { id: 'Seco o con plaga', label: '🍂 Seco' }
];

export default function QuickAddTreeSheet({
  draftCoords,
  draftLocationLabel,
  speciesCatalog = [],
  speciesName,
  onChangeSpeciesName,
  selectedSpeciesId,
  onSelectSpecies,
  treeHeight,
  onChangeTreeHeight,
  healthState,
  onChangeHealthState,
  isSaving,
  onSave,
  onCancel
}) {
  const suggestions = useMemo(() => {
    const q = (speciesName || '').trim().toLowerCase();
    if (!q) return speciesCatalog.slice(0, 8);
    return speciesCatalog
      .filter((sp) => {
        const text = `${sp.name || ''} ${sp.scientific || ''}`.toLowerCase();
        return text.includes(q);
      })
      .slice(0, 6);
  }, [speciesName, speciesCatalog]);

  if (!draftCoords) return null;

  return (
    <View style={styles.sheetCard}>
      <View style={styles.sheetHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sheetTitle}>🌳 Registrar en Catastro 3D</Text>
          <Text style={styles.sheetSubtitle} numberOfLines={1}>
            📍 {draftLocationLabel || 'Ubicación en mapa'} • {draftCoords.latitude.toFixed(5)}, {draftCoords.longitude.toFixed(5)}
          </Text>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={onCancel} disabled={isSaving}>
          <Ionicons name="close" size={16} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* Especie */}
      <View style={styles.fieldGroup}>
        <View style={styles.labelRow}>
          <Text style={styles.fieldLabel}>Especie / Nombre común *</Text>
          {selectedSpeciesId ? (
            <Text style={styles.linkedTag}>✓ Catálogo oficial</Text>
          ) : null}
        </View>
        <TextInput
          style={styles.input}
          value={speciesName}
          onChangeText={(txt) => {
            onChangeSpeciesName(txt);
            const exact = speciesCatalog.find(
              (s) => (s.name || '').toLowerCase() === txt.trim().toLowerCase()
            );
            onSelectSpecies(exact ? exact.id : null, txt);
          }}
          placeholder="Ej. Trupillo, Guayacán, Dividivi, Neem..."
          placeholderTextColor="#94a3b8"
        />
        {suggestions.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {suggestions.map((sp) => {
              const active = (speciesName || '').trim().toLowerCase() === (sp.name || '').toLowerCase();
              return (
                <TouchableOpacity
                  key={String(sp.id || sp.name)}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => onSelectSpecies(sp.id, sp.name)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {sp.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Altura estimada en metros (escala en vivo la extrusión 3D del mapa) */}
      <View style={styles.inlineRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>Altura 3D estimada</Text>
          <View style={styles.presetRow}>
            {HEIGHT_PRESETS.map((h) => {
              const active = Number(treeHeight) === h;
              return (
                <TouchableOpacity
                  key={h}
                  style={[styles.heightBtn, active && styles.heightBtnActive]}
                  onPress={() => onChangeTreeHeight(h)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.heightBtnText, active && styles.heightBtnTextActive]}>
                    {h}m
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* Estado fitosanitario */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        {HEALTH_OPTIONS.map((opt) => {
          const active = healthState === opt.id;
          return (
            <TouchableOpacity
              key={opt.id}
              style={[styles.healthChip, active && styles.healthChipActive]}
              onPress={() => onChangeHealthState(opt.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.healthChipText, active && styles.healthChipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Botones de acción */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} disabled={isSaving}>
          <Text style={styles.cancelBtnText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveBtn, (!speciesName.trim() || isSaving) && styles.saveBtnDisabled]}
          onPress={onSave}
          disabled={!speciesName.trim() || isSaving}
          activeOpacity={0.85}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={16} color="#ffffff" />
              <Text style={styles.saveBtnText}>Guardar en Catastro 3D</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheetCard: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#0284c7',
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.24,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    zIndex: 80,
    gap: 8
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8
  },
  sheetTitle: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#0f172a'
  },
  sheetSubtitle: {
    fontSize: 10.5,
    color: '#0369a1',
    fontWeight: '600',
    marginTop: 1
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center'
  },
  fieldGroup: {
    gap: 5
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  fieldLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#334155'
  },
  linkedTag: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#059669'
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12.5,
    color: '#0f172a'
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2
  },
  chip: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4
  },
  chipActive: {
    backgroundColor: '#065f46',
    borderColor: '#065f46'
  },
  chipText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#334155'
  },
  chipTextActive: {
    color: '#ffffff'
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  presetRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4
  },
  heightBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1'
  },
  heightBtnActive: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7'
  },
  heightBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155'
  },
  heightBtnTextActive: {
    color: '#ffffff'
  },
  healthChip: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  healthChipActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981'
  },
  healthChipText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#475569'
  },
  healthChipTextActive: {
    color: '#065f46'
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center'
  },
  cancelBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569'
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingVertical: 9,
    borderRadius: 10
  },
  saveBtnDisabled: {
    opacity: 0.55
  },
  saveBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff'
  }
});
