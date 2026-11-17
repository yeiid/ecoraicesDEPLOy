/**
 * EcoRaíces Mobile · Pantalla de Inicio (Home)
 * Dashboard principal, métricas KPI, acceso a Sobre Nosotros, gamificación y novedades.
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
import { colors, shadows } from '../theme';
import { GUAJIRA_COMUNIDADES, CONOCE_ECORAICES } from '../constants/guajira';

export default function HomeScreen({
  displaySpeciesCatalog = [],
  outboxTrees = [],
  gamification = {
    currentRank: { icon: '🌱', titulo: 'Guardabosques Inicial' },
    earnedPoints: 0,
    unlockedCount: 0,
    totalMedals: 6,
    progressToNext: 0,
    nextRank: null,
    medals: []
  },
  onNavigateToCapture,
  onNavigateToMap,
  onNavigateToAbout,
  onNavigateToProfile
}) {
  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.homeContent}>
      {/* Hero Welcome Card */}
      <View style={styles.welcomeHeroCard}>
        <View style={styles.welcomeLogoBig}>
          <Image
            source={require('../../assets/eco.png')}
            style={{ width: 44, height: 44 }}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.welcomeTitle}>¡Bienvenidos a EcoRaíces!</Text>
        <Text style={styles.welcomeDesc}>
          Plataforma de ciencia ciudadana para observar, georreferenciar y proteger la biodiversidad del Bosque Seco Tropical en Colombia.
        </Text>

        {/* Acciones Rápidas */}
        <View style={styles.heroQuickActions}>
          <TouchableOpacity
            style={[styles.heroActionBtn, { backgroundColor: colors.primary }]}
            onPress={onNavigateToCapture}
          >
            <Text style={styles.heroActionBtnText}>➕ Registrar Árbol</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.heroActionBtn, { backgroundColor: colors.info }]}
            onPress={onNavigateToMap}
          >
            <Text style={styles.heroActionBtnText}>🗺️ Mapa Cockpit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.heroActionBtn, { backgroundColor: colors.secondary }]}
            onPress={onNavigateToAbout}
          >
            <Text style={styles.heroActionBtnText}>🌿 Sobre Nosotros</Text>
          </TouchableOpacity>
        </View>

        {/* Indicadores Clave de Desempeño (KPIs) */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiNumber}>{displaySpeciesCatalog.length}</Text>
            <Text style={styles.kpiLabel}>Especies</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiNumber, { color: '#10b981' }]}>
              {61 + outboxTrees.length}
            </Text>
            <Text style={styles.kpiLabel}>Árboles Censados</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiNumber, { color: '#38bdf8' }]}>
              {GUAJIRA_COMUNIDADES.length}
            </Text>
            <Text style={styles.kpiLabel}>Comunidades</Text>
          </View>
        </View>
      </View>

      {/* BARRA DE GAMIFICACIÓN / RANGO DEL GUARDABOSQUES */}
      <View style={styles.gamificationCard}>
        <View style={styles.gamificationHeader}>
          <View style={styles.rankIconCircle}>
            <Text style={{ fontSize: 24 }}>{gamification.currentRank.icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rankTitle}>{gamification.currentRank.titulo}</Text>
            <Text style={styles.rankPointsText}>
              {gamification.earnedPoints} pts ecológicos • {gamification.unlockedCount} de {gamification.totalMedals} medallas
            </Text>
          </View>
          <TouchableOpacity onPress={onNavigateToProfile}>
            <Text style={styles.seeAllMedalsLink}>Ver todo →</Text>
          </TouchableOpacity>
        </View>

        {/* Barra de Progreso XP */}
        <View style={styles.progressBarWrapper}>
          <View style={[styles.progressBarFill, { width: `${gamification.progressToNext}%` }]} />
        </View>
        <Text style={styles.progressNoteText}>
          {gamification.nextRank
            ? `${gamification.progressToNext}% para alcanzar ${gamification.nextRank.titulo}`
            : '¡Nivel máximo de Cacique Mayor alcanzado!'}
        </Text>

        {/* Resumen de Medallas Rápidas */}
        {gamification.medals && gamification.medals.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.medalsMiniScroll}>
            {gamification.medals.map((m) => (
              <View key={m.id} style={[styles.medalMiniPill, !m.unlocked && styles.medalLocked]}>
                <Text style={styles.medalMiniIcon}>{m.unlocked ? m.icon : '🔒'}</Text>
                <Text style={[styles.medalMiniTitle, !m.unlocked && { color: '#94a3b8' }]}>
                  {m.title}
                </Text>
              </View>
            ))}
          </ScrollView>
        ) : null}
      </View>

      {/* Noticias & Foro Global */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeading}>Foro de Noticias & Comunidad</Text>
        <Text style={styles.sectionTag}>Tiempo Real</Text>
      </View>

      <View style={styles.newsCard}>
        <View style={styles.newsHeader}>
          <Text style={styles.newsBadge}>🚨 Alerta Fitosanitaria</Text>
          <Text style={styles.newsDate}>Hoy</Text>
        </View>
        <Text style={styles.newsTitle}>
          Protocolo Prioritario de Control de Neem en Riohacha y Manaure
        </Text>
        <Text style={styles.newsSnippet}>
          Se convoca a las comunidades Wayuu y comités locales a georreferenciar áreas invadidas para sustitución consciente con Trupillo y Dividivi.
        </Text>
      </View>

      {/* Conoce EcoRaíces */}
      <View style={styles.conoceCard}>
        <Text style={styles.conoceTitle}>Conoce EcoRaíces</Text>
        <Text style={styles.conoceSubtitle}>
          Una iniciativa biocultural para la preservación de los bosques más resilientes de Colombia.
        </Text>

        <View style={styles.bosqueSecoCard}>
          <Text style={styles.bosqueSecoTitle}>{CONOCE_ECORAICES.bosqueSeco.titulo}</Text>
          <Text style={styles.bosqueSecoDesc}>{CONOCE_ECORAICES.bosqueSeco.descripcion}</Text>
        </View>

        <TouchableOpacity
          style={styles.conoceVerMasBtn}
          onPress={onNavigateToAbout}
        >
          <Text style={styles.conoceVerMasBtnText}>Conoce más sobre nuestra misión y visión →</Text>
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
  homeContent: {
    padding: 16,
    paddingBottom: 32
  },
  welcomeHeroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...shadows.sm
  },
  welcomeLogoBig: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.primary,
    textAlign: 'center'
  },
  welcomeDesc: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6
  },
  heroQuickActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    width: '100%'
  },
  heroActionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  heroActionBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800'
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    width: '100%'
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  kpiNumber: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a'
  },
  kpiLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2
  },
  gamificationCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#1e293b'
  },
  gamificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  rankIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#38bdf8'
  },
  rankTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#38bdf8'
  },
  rankPointsText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1
  },
  seeAllMedalsLink: {
    fontSize: 11,
    fontWeight: '700',
    color: '#34d399'
  },
  progressBarWrapper: {
    height: 6,
    backgroundColor: '#1e293b',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 10
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#34d399'
  },
  progressNoteText: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 4
  },
  medalsMiniScroll: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10
  },
  medalMiniPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155'
  },
  medalLocked: {
    opacity: 0.5
  },
  medalMiniIcon: {
    fontSize: 12
  },
  medalMiniTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#e2e8f0'
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 10
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a'
  },
  sectionTag: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6
  },
  newsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  newsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  newsBadge: {
    fontSize: 10,
    fontWeight: '800',
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4
  },
  newsDate: {
    fontSize: 10,
    color: '#94a3b8'
  },
  newsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 18
  },
  newsSnippet: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    lineHeight: 16
  },
  conoceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  conoceTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.primary,
    textAlign: 'center'
  },
  conoceSubtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14
  },
  bosqueSecoCard: {
    backgroundColor: '#14532d',
    borderRadius: 12,
    padding: 14
  },
  bosqueSecoTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 4
  },
  bosqueSecoDesc: {
    fontSize: 11,
    color: '#bbf7d0',
    lineHeight: 15
  },
  conoceVerMasBtn: {
    marginTop: 12,
    alignItems: 'center'
  },
  conoceVerMasBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary
  }
});
