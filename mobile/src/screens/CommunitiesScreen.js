/**
 * EcoRaíces Mobile · Pantalla de Comunidades
 * Nodos territoriales, colectivos locales y comités de conservación comunitaria.
 */

import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert
} from 'react-native';
import { colors, shadows } from '../theme';
import { GUAJIRA_COMUNIDADES } from '../constants/guajira';

const DEFAULT_LOCAL_COMMUNITY_ASSETS = {
  'guajira-banner': require('../../assets/guajira-banner.webp'),
  'guajira-paisaje': require('../../assets/guajira-paisaje.webp'),
  'guajira-flora': require('../../assets/guajira-flora.webp')
};

export default function CommunitiesScreen({
  communities = GUAJIRA_COMUNIDADES,
  localAssets = DEFAULT_LOCAL_COMMUNITY_ASSETS,
  onJoinCommunity
}) {
  const handleJoin = (com) => {
    if (onJoinCommunity) {
      onJoinCommunity(com);
    } else {
      Alert.alert('Comunidad', `Te has vinculado al nodo de ${com.name}.`);
    }
  };

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.communitiesContent}>
      <View style={styles.communitiesHeaderCard}>
        <Text style={styles.communitiesTitle}>Comunidades y Territorios</Text>
        <Text style={styles.communitiesSubtitle}>
          Redes locales y colectivos que lideran la protección forestal en cada territorio.
        </Text>
      </View>

      {communities.map((com, index) => {
        const localAssetKey = index % 3 === 0 ? 'guajira-banner' : index % 3 === 1 ? 'guajira-paisaje' : 'guajira-flora';
        const localImageSource = localAssets[localAssetKey] || DEFAULT_LOCAL_COMMUNITY_ASSETS[localAssetKey];

        return (
          <View key={com.id} style={styles.communityCard}>
            <Image source={localImageSource} style={styles.communityBanner} />
            <View style={styles.communityBody}>
              <View style={styles.communityLocationBadge}>
                <Text style={styles.communityLocationText}>📍 {com.municipality} • {com.territory}</Text>
              </View>
              <Text style={styles.communityName}>{com.name}</Text>
              <Text style={styles.communityDesc}>{com.description}</Text>

              <View style={styles.communityStatsRow}>
                <View style={styles.cStatItem}>
                  <Text style={styles.cStatNum}>{com.membersCount}</Text>
                  <Text style={styles.cStatLabel}>Miembros</Text>
                </View>
                <View style={styles.cStatItem}>
                  <Text style={[styles.cStatNum, { color: colors.primary }]}>{com.treesRegistered}</Text>
                  <Text style={styles.cStatLabel}>Árboles Censados</Text>
                </View>
                <View style={styles.cStatItem}>
                  <Text style={styles.cStatNum}>👑</Text>
                  <Text style={styles.cStatLabel}>{com.leader ? com.leader.split(' ')[0] : 'Líder'}</Text>
                </View>
              </View>

              <View style={styles.communityTagsRow}>
                {com.tags && com.tags.map((tag, tIdx) => (
                  <View key={tIdx} style={styles.communityTag}>
                    <Text style={styles.communityTagText}>#{tag}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={styles.joinCommunityBtn}
                onPress={() => handleJoin(com)}
              >
                <Text style={styles.joinCommunityBtnText}>Unirse a esta Comunidad</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  communitiesContent: {
    padding: 16,
    paddingBottom: 40
  },
  communitiesHeaderCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
    ...shadows.sm
  },
  communitiesTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a'
  },
  communitiesSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4
  },
  communityCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
    ...shadows.sm
  },
  communityBanner: {
    width: '100%',
    height: 130,
    backgroundColor: '#cbd5e1'
  },
  communityBody: {
    padding: 14
  },
  communityLocationBadge: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 6
  },
  communityLocationText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0369a1'
  },
  communityName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a'
  },
  communityDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
    marginTop: 4
  },
  communityStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 12,
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8
  },
  cStatItem: {
    flex: 1,
    alignItems: 'center'
  },
  cStatNum: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a'
  },
  cStatLabel: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 2
  },
  communityTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12
  },
  communityTag: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4
  },
  communityTagText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600'
  },
  joinCommunityBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center'
  },
  joinCommunityBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800'
  }
});
