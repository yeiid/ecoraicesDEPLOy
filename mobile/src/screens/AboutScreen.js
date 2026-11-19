/**
 * EcoRaíces Mobile · Pantalla Sobre Nosotros (About)
 * Misión, Visión, El Tesoro del Bosque Seco Tropical, Pilares Técnicos e Identidad Institucional.
 */

import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../theme';

export default function AboutScreen({ onNavigateBack }) {
  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.aboutContent}>
      {/* Botón Volver al Inicio */}
      <TouchableOpacity style={styles.aboutBackBtn} onPress={onNavigateBack}>
        <Ionicons name="arrow-back" size={18} color={colors.primary} />
        <Text style={styles.aboutBackBtnText}>Volver al Inicio</Text>
      </TouchableOpacity>

      {/* Hero Header */}
      <View style={styles.aboutHeroHeader}>
        <View style={styles.aboutSubBadge}>
          <Text style={styles.aboutSubBadgeText}>NUESTRA ORGANIZACIÓN</Text>
        </View>
        <Text style={styles.aboutTitle}>
          Conoce <Text style={{ color: colors.primary }}>EcoRaíces</Text>
        </Text>
        <Text style={styles.aboutTagline}>
          Uniendo tecnología geoespacial y ciencia comunitaria para proteger el bosque seco tropical en Colombia.
        </Text>
      </View>

      {/* Misión y Visión */}
      <View style={styles.aboutMissionCards}>
        <View style={styles.aboutInfoCard}>
          <View style={[styles.aboutCardIconBox, { backgroundColor: '#dcfce7' }]}>
            <Text style={{ fontSize: 24 }}>🌍</Text>
          </View>
          <Text style={styles.aboutCardTitle}>Nuestra Misión</Text>
          <Text style={styles.aboutCardText}>
            Geolocalizar, catalogar y documentar las especies arbóreas de las plazas, calles y veredas de los municipios de Colombia, empoderando a las comunidades mediante herramientas digitales de ciencia ciudadana para combatir el cambio climático y valorar nuestra biodiversidad local.
          </Text>
        </View>

        <View style={styles.aboutInfoCard}>
          <View style={[styles.aboutCardIconBox, { backgroundColor: '#e0f2fe' }]}>
            <Text style={{ fontSize: 24 }}>🔭</Text>
          </View>
          <Text style={styles.aboutCardTitle}>Nuestra Visión</Text>
          <Text style={styles.aboutCardText}>
            Convertirnos para el 2030 en el inventario forestal urbano colaborativo y abierto más grande de Colombia, sirviendo de base científica para planes de ordenamiento territorial, reforestación estratégica y educación ambiental en todo el territorio.
          </Text>
        </View>
      </View>

      {/* Spotlight: El Tesoro del Bosque Seco Tropical */}
      <View style={styles.aboutSpotlightCard}>
        <Image
          source={require('../../assets/guajira-banner.webp')}
          style={styles.aboutSpotlightBanner}
          resizeMode="cover"
        />
        <View style={styles.aboutSpotlightBody}>
          <View style={styles.aboutSpotlightBadge}>
            <Text style={styles.aboutSpotlightBadgeText}>EL DESAFÍO ECOLÓGICO</Text>
          </View>
          <Text style={styles.aboutSpotlightTitle}>El Tesoro del Bosque Seco Tropical</Text>
          <Text style={styles.aboutSpotlightDesc}>
            Colombia alberga el amenazado ecosistema del Bosque Seco Tropical (Bs-T). Especies majestuosas y extremadamente resistentes como el Cují, el Guayacán y la Ceiba Bonga son verdaderos reguladores térmicos urbanos. Cada árbol mapeado en nuestra plataforma aporta datos críticos sobre su salud botánica.
          </Text>

          <View style={styles.aboutBulletList}>
            <View style={styles.aboutBulletItem}>
              <Text style={styles.aboutBulletCheck}>✓</Text>
              <Text style={styles.aboutBulletText}>
                <Text style={{ fontWeight: '800', color: '#0f172a' }}>Termorregulación: </Text>
                Disminución del efecto isla de calor urbana en los municipios y ciudades.
              </Text>
            </View>

            <View style={styles.aboutBulletItem}>
              <Text style={styles.aboutBulletCheck}>✓</Text>
              <Text style={styles.aboutBulletText}>
                <Text style={{ fontWeight: '800', color: '#0f172a' }}>Cultura Ancestral: </Text>
                Valoración de especies de alto interés etnobotánico tradicional.
              </Text>
            </View>

            <View style={styles.aboutBulletItem}>
              <Text style={styles.aboutBulletCheck}>✓</Text>
              <Text style={styles.aboutBulletText}>
                <Text style={{ fontWeight: '800', color: '#0f172a' }}>Monitoreo de Amenazas: </Text>
                Detección temprana de plagas o talas indebidas en zonas públicas.
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Pilares Técnicos */}
      <Text style={styles.aboutSectionTitle}>Nuestros Pilares Técnicos</Text>
      <View style={styles.aboutPillarsList}>
        <View style={styles.aboutPillarItem}>
          <Text style={styles.aboutPillarNum}>01</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.aboutPillarHead}>Georreferenciación de Precisión</Text>
            <Text style={styles.aboutPillarText}>
              Utilizamos el GPS integrado en dispositivos móviles para ubicar cada ejemplar con precisión submétrica y base de datos SQLite local offline.
            </Text>
          </View>
        </View>

        <View style={styles.aboutPillarItem}>
          <Text style={styles.aboutPillarNum}>02</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.aboutPillarHead}>Mapeo Dinámico Cockpit</Text>
            <Text style={styles.aboutPillarText}>
              Renderizamos capas geoespaciales interactivas y fichas botánicas conectadas en tiempo real con el catastro de EcoRaíces.
            </Text>
          </View>
        </View>

        <View style={styles.aboutPillarItem}>
          <Text style={styles.aboutPillarNum}>03</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.aboutPillarHead}>Curaduría Científica & Comunidad</Text>
            <Text style={styles.aboutPillarText}>
              Validación comunitaria en articulación con sabedores tradicionales y autoridades botánicas territoriales.
            </Text>
          </View>
        </View>
      </View>

      {/* Footer institucional */}
      <View style={styles.aboutFooter}>
        <Image source={require('../../assets/eco.png')} style={{ width: 40, height: 40, marginBottom: 8 }} resizeMode="contain" />
        <Text style={styles.aboutFooterTitle}>ECORAÍCES COLOMBIA</Text>
        <Text style={styles.aboutFooterText}>Plataforma de Ciencia Ciudadana y Monitoreo Biocultural</Text>
        <Text style={styles.aboutFooterCopy}>© 2026 NeuralJira Tech • Colombia</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  aboutContent: {
    padding: 16,
    paddingBottom: 40
  },
  aboutBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16
  },
  aboutBackBtnText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700'
  },
  aboutHeroHeader: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    ...shadows.sm
  },
  aboutSubBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8
  },
  aboutSubBadgeText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  aboutTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 8
  },
  aboutTagline: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 19
  },
  aboutMissionCards: {
    gap: 12,
    marginBottom: 16
  },
  aboutInfoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...shadows.sm
  },
  aboutCardIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10
  },
  aboutCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6
  },
  aboutCardText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18
  },
  aboutSpotlightCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20
  },
  aboutSpotlightBanner: {
    width: '100%',
    height: 150
  },
  aboutSpotlightBody: {
    padding: 16
  },
  aboutSpotlightBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffedd5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8
  },
  aboutSpotlightBadgeText: {
    color: '#c2410c',
    fontSize: 9,
    fontWeight: '900'
  },
  aboutSpotlightTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 8
  },
  aboutSpotlightDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 12
  },
  aboutBulletList: {
    gap: 10
  },
  aboutBulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8
  },
  aboutBulletCheck: {
    color: colors.primary,
    fontWeight: '900',
    fontSize: 13
  },
  aboutBulletText: {
    fontSize: 11,
    color: '#475569',
    flex: 1,
    lineHeight: 16
  },
  aboutSectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 12
  },
  aboutPillarsList: {
    gap: 10,
    marginBottom: 24
  },
  aboutPillarItem: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
    alignItems: 'center'
  },
  aboutPillarNum: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.primary
  },
  aboutPillarHead: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2
  },
  aboutPillarText: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 15
  },
  aboutFooter: {
    alignItems: 'center',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    marginTop: 10
  },
  aboutFooterTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 0.5
  },
  aboutFooterText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2
  },
  aboutFooterCopy: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 6
  }
});
