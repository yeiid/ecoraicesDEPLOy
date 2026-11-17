/**
 * EcoRaíces Mobile · Barra de Navegación Inferior Modular (Cockpit)
 */

import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../theme';

export default function BottomNav({ activeTab, onTabChange }) {
  const isHomeActive = activeTab === 'home' || activeTab === 'about';
  const isMapActive = activeTab === 'map3d';
  const isCaptureActive = activeTab === 'capture';
  const isCatalogActive = activeTab === 'catalog';
  const isCommunitiesActive = activeTab === 'communities';
  const isProfileActive = activeTab === 'profile';

  return (
    <View style={styles.bottomTabBar}>
      {/* 1. Inicio */}
      <TouchableOpacity
        style={styles.tabBtn}
        onPress={() => onTabChange('home')}
        activeOpacity={0.7}
      >
        <Ionicons
          name="home"
          size={20}
          color={isHomeActive ? colors.primary : colors.textSecondary}
        />
        <Text style={[styles.tabLabel, isHomeActive && styles.tabLabelActive]}>
          Inicio
        </Text>
      </TouchableOpacity>

      {/* 2. Mapa 3D */}
      <TouchableOpacity
        style={styles.tabBtn}
        onPress={() => onTabChange('map3d')}
        activeOpacity={0.7}
      >
        <Ionicons
          name="map"
          size={20}
          color={isMapActive ? colors.mapCyan : colors.textSecondary}
        />
        <Text style={[styles.tabLabel, isMapActive && { color: colors.mapCyan, fontWeight: '800' }]}>
          Mapa 3D
        </Text>
      </TouchableOpacity>

      {/* 3. Botón Central Destacado: Censar en Campo */}
      <TouchableOpacity
        style={styles.tabBtnCenter}
        onPress={() => onTabChange('capture')}
        activeOpacity={0.85}
      >
        <View style={[styles.tabCenterCircle, isCaptureActive && styles.tabCenterCircleActive]}>
          <Ionicons name="add" size={26} color="#ffffff" />
        </View>
        <Text style={[styles.tabLabel, isCaptureActive && styles.tabLabelActive]}>
          Campo
        </Text>
      </TouchableOpacity>

      {/* 4. Catálogo */}
      <TouchableOpacity
        style={styles.tabBtn}
        onPress={() => onTabChange('catalog')}
        activeOpacity={0.7}
      >
        <Ionicons
          name="leaf"
          size={20}
          color={isCatalogActive ? colors.primary : colors.textSecondary}
        />
        <Text style={[styles.tabLabel, isCatalogActive && styles.tabLabelActive]}>
          Catálogo
        </Text>
      </TouchableOpacity>

      {/* 5. Perfil / Auth */}
      <TouchableOpacity
        style={styles.tabBtn}
        onPress={() => onTabChange('profile')}
        activeOpacity={0.7}
      >
        <Ionicons
          name="person"
          size={20}
          color={isProfileActive ? colors.primary : colors.textSecondary}
        />
        <Text style={[styles.tabLabel, isProfileActive && styles.tabLabelActive]}>
          Perfil
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomTabBar: {
    height: Platform.OS === 'ios' ? 70 : 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#0b1329',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingBottom: Platform.OS === 'ios' ? 14 : 4,
    ...shadows.bottomBar
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4
  },
  tabBtnCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -16
  },
  tabCenterCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#0b1329',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4
  },
  tabCenterCircleActive: {
    backgroundColor: '#16a34a',
    borderColor: '#38bdf8'
  },
  tabLabel: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
    fontWeight: '600'
  },
  tabLabelActive: {
    color: '#4ade80',
    fontWeight: '800'
  }
});
