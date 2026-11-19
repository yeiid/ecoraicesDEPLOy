/**
 * EcoRaíces Mobile · Pantalla de Inicio (Home)
 * Conectada en tiempo real a GET /api/stats y GET /api/observations de FastAPI.
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
import { CONOCE_ECORAICES } from '../constants/guajira';

export default function HomeScreen({
  displaySpeciesCatalog = [],
  outboxTrees = [],
  remoteTrees = [],
  apiCommunities = [],
  serverStats = null,
  serverUrl = 'https://ecoraices.neuraljira.tech',
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
  onNavigateToProfile,
  onNavigateToCommunities
}) {
  const pendingLocalCount = outboxTrees.filter((t) => t.syncStatus !== 'SYNCED').length;
  const totalSpeciesCount = serverStats?.species ?? displaySpeciesCatalog.length;
  const totalTreesCount = (serverStats?.observations ?? remoteTrees.length) + pendingLocalCount;
  const totalCommunitiesCount = serverStats?.communities ?? apiCommunities.length;
  const totalUsersCount = serverStats?.users ?? 1;

  // Últimos avistamientos reales combinando cola local y servidor FastAPI
  const recentObservations = [
    ...outboxTrees
      .filter((t) => t.syncStatus !== 'SYNCED')
      .map((t) => ({
        id: t.clientId || t.id,
        speciesName: t.speciesName || t.species_name || 'Árbol Censado',
        scientificName: t.scientificName || t.scientific_name || 'Registro local en cola',
        municipio: t.municipio || t.municipality || 'La Guajira',
        date: t.observationDate || (t.createdAt ? t.createdAt.split('T')[0] : 'Hoy'),
        status: 'LOCAL_PENDING',
        observer: 'Tú (Offline)',
        imageUrl: t.localImagePath || null
      })),
    ...remoteTrees.map((rt) => {
      let img = rt.imageUrl || null;
      if (img && img.startsWith('/')) {
        img = `${serverUrl.replace(/\/+$/, '')}${img}`;
      }
      return {
        id: rt.id,
        speciesName: rt.species?.name || rt.name || 'Árbol Registrado',
        scientificName: rt.species?.scientificName || '',
        municipio: rt.municipio || 'Colombia',
        date: rt.observationDate ? rt.observationDate.split('T')[0] : '',
        status: rt.status || (rt.verified ? 'APPROVED' : 'PENDING'),
        observer: rt.user?.username ? `@${rt.user.username}` : 'Guardabosques',
        imageUrl: img
      };
    })
  ].slice(0, 5);

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
            style={[styles.heroActionBtn, { backgroundColor: '#065f46' }]}
            onPress={onNavigateToMap}
          >
            <Text style={styles.heroActionBtnText}>🗺️ Mapa 3D</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.heroActionBtn, { backgroundColor: colors.secondary }]}
            onPress={onNavigateToAbout}
          >
            <Text style={styles.heroActionBtnText}>🌿 Sobre Nosotros</Text>
          </TouchableOpacity>
        </View>

        {/* Indicadores Reales en Vivo desde FastAPI (/api/stats) */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiNumber}>{totalSpeciesCount}</Text>
            <Text style={styles.kpiLabel}>Especies</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiNumber, { color: '#10b981' }]}>
              {totalTreesCount}
            </Text>
            <Text style={styles.kpiLabel}>Árboles Reales</Text>
          </View>
          <TouchableOpacity style={styles.kpiCard} onPress={onNavigateToCommunities} activeOpacity={0.8}>
            <Text style={[styles.kpiNumber, { color: '#0284c7' }]}>
              {totalCommunitiesCount}
            </Text>
            <Text style={styles.kpiLabel}>Comunidades</Text>
          </TouchableOpacity>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiNumber, { color: '#0f766e' }]}>
              {totalUsersCount}
            </Text>
            <Text style={styles.kpiLabel}>Usuarios</Text>
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
            <Text style={styles.seeAllMedalsLink}>Ver perfil →</Text>
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

      {/* AVISTAMIENTOS RECIENTES EN VIVO (BACKEND + COLA LOCAL) */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeading}>Últimos Avistamientos Reales</Text>
        <TouchableOpacity onPress={onNavigateToMap}>
          <Text style={styles.sectionTag}>Ver en Mapa 3D →</Text>
        </TouchableOpacity>
      </View>

      {recentObservations.length === 0 ? (
        <View style={styles.emptyObsCard}>
          <Ionicons name="leaf-outline" size={28} color="#94a3b8" />
          <Text style={styles.emptyObsTitle}>Aún no hay observaciones cargadas</Text>
          <Text style={styles.emptyObsSub}>
            Sé el primero en registrar un árbol georreferenciado desde la pestaña Campo.
          </Text>
        </View>
      ) : (
        recentObservations.map((obs) => {
          const isApproved = obs.status === 'APPROVED';
          const isLocal = obs.status === 'LOCAL_PENDING';
          return (
            <TouchableOpacity
              key={String(obs.id)}
              style={styles.obsCard}
              onPress={onNavigateToMap}
              activeOpacity={0.85}
            >
              {obs.imageUrl ? (
                <Image source={{ uri: obs.imageUrl }} style={styles.obsThumb} />
              ) : (
                <View style={styles.obsIconPlaceholder}>
                  <Text style={{ fontSize: 20 }}>🌳</Text>
                </View>
              )}

              <View style={styles.obsInfo}>
                <View style={styles.obsTopRow}>
                  <Text style={styles.obsSpeciesName} numberOfLines={1}>
                    {obs.speciesName}
                  </Text>
                  <View
                    style={[
                      styles.obsStatusBadge,
                      isApproved
                        ? styles.obsBadgeApproved
                        : isLocal
                        ? styles.obsBadgeLocal
                        : styles.obsBadgePending
                    ]}
                  >
                    <Text
                      style={[
                        styles.obsStatusText,
                        isApproved
                          ? { color: '#065f46' }
                          : isLocal
                          ? { color: '#1d4ed8' }
                          : { color: '#92400e' }
                      ]}
                    >
                      {isApproved ? '✓ Verificado' : isLocal ? '📱 En cola local' : '⏳ En revisión'}
                    </Text>
                  </View>
                </View>

                {obs.scientificName ? (
                  <Text style={styles.obsScientific} numberOfLines={1}>
                    {obs.scientificName}
                  </Text>
                ) : null}

                <View style={styles.obsMetaRow}>
                  <Text style={styles.obsMetaText}>📍 {obs.municipio}</Text>
                  <Text style={styles.obsMetaText}>👤 {obs.observer}</Text>
                  {obs.date ? <Text style={styles.obsMetaText}>📅 {obs.date}</Text> : null}
                </View>
              </View>
            </TouchableOpacity>
          );
        })
      )}

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
    gap: 8,
    marginTop: 16,
    width: '100%'
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  kpiNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a'
  },
  kpiLabel: {
    fontSize: 9.5,
    color: '#64748b',
    fontWeight: '700',
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
    borderColor: '#34d399'
  },
  rankTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#34d399'
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
    paddingVertical: 3,
    borderRadius: 6
  },
  emptyObsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12
  },
  emptyObsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
    marginTop: 6
  },
  emptyObsSub: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 2
  },
  obsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...shadows.sm
  },
  obsThumb: {
    width: 54,
    height: 54,
    borderRadius: 10,
    backgroundColor: '#e2e8f0'
  },
  obsIconPlaceholder: {
    width: 54,
    height: 54,
    borderRadius: 10,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    alignItems: 'center',
    justifyContent: 'center'
  },
  obsInfo: {
    flex: 1
  },
  obsTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6
  },
  obsSpeciesName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1
  },
  obsStatusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6
  },
  obsBadgeApproved: {
    backgroundColor: '#d1fae5'
  },
  obsBadgeLocal: {
    backgroundColor: '#dbeafe'
  },
  obsBadgePending: {
    backgroundColor: '#fef3c7'
  },
  obsStatusText: {
    fontSize: 9.5,
    fontWeight: '800'
  },
  obsScientific: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#64748b',
    marginTop: 1
  },
  obsMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 5
  },
  obsMetaText: {
    fontSize: 10.5,
    color: '#475569',
    fontWeight: '600'
  },
  conoceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...shadows.sm
  },
  conoceTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a'
  },
  conoceSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2
  },
  bosqueSecoCard: {
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0'
  },
  bosqueSecoTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary
  },
  bosqueSecoDesc: {
    fontSize: 11,
    color: '#166534',
    lineHeight: 16,
    marginTop: 4
  },
  conoceVerMasBtn: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center'
  },
  conoceVerMasBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary
  }
});
