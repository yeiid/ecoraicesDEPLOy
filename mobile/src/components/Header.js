/**
 * EcoRaíces Mobile · Componente de Cabecera Superior Unificada
 */

import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../theme';

export default function Header({
  onLogoPress,
  pendingCount = 0,
  hasSyncError = false,
  isSyncing = false,
  onSyncPress,
  onRefreshPress
}) {
  const handleActionPress = () => {
    if (isSyncing) return;
    if (pendingCount > 0) {
      if (onSyncPress) onSyncPress();
    } else if (onRefreshPress) {
      onRefreshPress();
    }
  };

  return (
    <View style={styles.topHeader}>
      <TouchableOpacity
        style={styles.headerBrand}
        onPress={onLogoPress}
        activeOpacity={0.7}
      >
        <Image
          source={require('../../assets/eco.png')}
          style={styles.headerEcoLogo}
          resizeMode="contain"
        />
        <Text style={styles.headerBrandText}>ECORAÍCES</Text>
      </TouchableOpacity>

      {/* Sync Pill con estado real de sincronización SQLite / Servidor */}
      <View
        style={[
          styles.headerSyncPill,
          hasSyncError && pendingCount > 0 && styles.headerSyncPillError
        ]}
      >
        <View
          style={[
            styles.headerSyncDot,
            hasSyncError && pendingCount > 0
              ? styles.dotError
              : pendingCount > 0
              ? styles.dotPending
              : styles.dotSynced
          ]}
        />
        <Text style={styles.headerSyncText} numberOfLines={1}>
          {isSyncing
            ? 'Subiendo...'
            : pendingCount > 0
            ? `${pendingCount} por subir`
            : 'Al día'}
        </Text>
        <TouchableOpacity
          style={[
            styles.headerSyncBtn,
            hasSyncError && pendingCount > 0 && styles.headerSyncBtnError,
            pendingCount === 0 && styles.headerSyncBtnRefresh,
            isSyncing && styles.headerSyncBtnDisabled
          ]}
          onPress={handleActionPress}
          disabled={isSyncing}
          activeOpacity={0.8}
        >
          {isSyncing ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : pendingCount > 0 ? (
            <>
              <Ionicons name="cloud-upload-outline" size={12} color="#ffffff" style={{ marginRight: 3 }} />
              <Text style={styles.headerSyncBtnText}>
                {hasSyncError ? 'Reintentar' : 'Subir'}
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="refresh" size={12} color={colors.primary} style={{ marginRight: 3 }} />
              <Text style={styles.headerSyncRefreshText}>Actualizar</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    backgroundColor: colors.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadows.header
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  headerEcoLogo: {
    width: 30,
    height: 30
  },
  headerBrandText: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 0.5
  },
  headerSyncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  headerSyncPillError: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca'
  },
  headerSyncDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  dotPending: {
    backgroundColor: '#3b82f6'
  },
  dotSynced: {
    backgroundColor: '#10b981'
  },
  dotError: {
    backgroundColor: '#dc2626'
  },
  headerSyncText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary
  },
  headerSyncBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center'
  },
  headerSyncBtnError: {
    backgroundColor: '#dc2626'
  },
  headerSyncBtnRefresh: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0'
  },
  headerSyncBtnDisabled: {
    opacity: 0.6
  },
  headerSyncBtnText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800'
  },
  headerSyncRefreshText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800'
  }
});
