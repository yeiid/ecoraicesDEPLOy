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
  isSyncing = false,
  onSyncPress
}) {
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

      {/* Sync Pill con estado de sincronización SQLite / Dokploy */}
      <View style={styles.headerSyncPill}>
        <View
          style={[
            styles.headerSyncDot,
            pendingCount > 0 ? styles.dotPending : styles.dotSynced
          ]}
        />
        <Text style={styles.headerSyncText} numberOfLines={1}>
          {pendingCount > 0 ? `${pendingCount} por subir` : 'Al día'}
        </Text>
        <TouchableOpacity
          style={[
            styles.headerSyncBtn,
            (isSyncing || pendingCount === 0) && styles.headerSyncBtnDisabled
          ]}
          onPress={onSyncPress}
          disabled={isSyncing || pendingCount === 0}
          activeOpacity={0.8}
        >
          {isSyncing ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Ionicons name="sync" size={12} color="#ffffff" style={{ marginRight: 3 }} />
              <Text style={styles.headerSyncBtnText}>Subir</Text>
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
  headerSyncText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary
  },
  headerSyncBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center'
  },
  headerSyncBtnDisabled: {
    opacity: 0.5
  },
  headerSyncBtnText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800'
  }
});
