/**
 * EcoRaíces Mobile · Pantalla de Comunidades Conectada a FastAPI (/api/communities)
 * Listado real, detalle de miembros y observaciones (GET /api/communities/{id}),
 * unión real a comunidad (POST /api/communities/{id}/members) y creación (POST /api/communities).
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Modal,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../theme';

const DEFAULT_LOCAL_COMMUNITY_ASSETS = {
  'guajira-banner': require('../../assets/guajira-banner.webp'),
  'guajira-paisaje': require('../../assets/guajira-paisaje.webp'),
  'guajira-flora': require('../../assets/guajira-flora.webp')
};

export default function CommunitiesScreen({
  communities = [],
  communitiesLoading = false,
  onRefreshCommunities,
  localAssets = DEFAULT_LOCAL_COMMUNITY_ASSETS,
  serverUrl = 'https://ecoraices.neuraljira.tech',
  token = '',
  onNavigateToProfile
}) {
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [joiningId, setJoiningId] = useState(null);
  const [statusBanner, setStatusBanner] = useState(null);

  // Modal de Creación de Nueva Comunidad
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLocation, setNewLocation] = useState('Riohacha, La Guajira');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const cleanBase = (serverUrl || 'https://ecoraices.neuraljira.tech').trim().replace(/\/+$/, '');

  const showTempBanner = (text, isError = false) => {
    setStatusBanner({ text, isError });
    setTimeout(() => setStatusBanner(null), 4000);
  };

  // Consultar detalle real de la comunidad (miembros y observaciones)
  const handleOpenDetail = async (com) => {
    setDetailLoading(true);
    setSelectedDetail({ community: com, observations: [] });
    try {
      const res = await fetch(`${cleanBase}/api/communities/${com.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedDetail(data);
      }
    } catch (_) {
      // Mantiene datos base si falla la red
    } finally {
      setDetailLoading(false);
    }
  };

  // Unirse realmente a la comunidad en FastAPI (POST /api/communities/{id}/members)
  const handleJoinCommunity = async (com) => {
    if (!token) {
      Alert.alert(
        'Inicia Sesión',
        'Para vincularte oficialmente a una comunidad en el servidor necesitas iniciar sesión en tu cuenta.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Ir a Iniciar Sesión', onPress: () => onNavigateToProfile && onNavigateToProfile() }
        ]
      );
      return;
    }

    setJoiningId(com.id);
    try {
      const res = await fetch(`${cleanBase}/api/communities/${com.id}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ self: true, role: 'MEMBER' })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showTempBanner(`✓ ${data.message || `Te has unido a ${(com.name || '').trim()}`}`, false);
        if (onRefreshCommunities) onRefreshCommunities();
        if (selectedDetail?.community?.id === com.id) {
          handleOpenDetail(com);
        }
      } else {
        showTempBanner(data.detail || data.message || 'No se pudo procesar la solicitud.', true);
      }
    } catch (err) {
      showTempBanner('Error de conexión con el servidor EcoRaíces.', true);
    } finally {
      setJoiningId(null);
    }
  };

  // Crear nueva comunidad en FastAPI (POST /api/communities)
  const handleCreateCommunity = async () => {
    if (!token) {
      setShowCreateModal(false);
      if (onNavigateToProfile) onNavigateToProfile();
      return;
    }
    if (!newName.trim()) {
      showTempBanner('El nombre de la comunidad es obligatorio.', true);
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(`${cleanBase}/api/communities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newName.trim(),
          location: newLocation.trim() || 'La Guajira',
          description: newDescription.trim() || 'Comunidad local de monitoreo y conservación.'
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setShowCreateModal(false);
        setNewName('');
        setNewDescription('');
        showTempBanner(`✓ Comunidad "${data.name || newName}" creada exitosamente en el servidor.`, false);
        if (onRefreshCommunities) onRefreshCommunities();
      } else {
        showTempBanner(data.detail || 'Error al crear la comunidad.', true);
      }
    } catch (e) {
      showTempBanner('Error de red al conectar con el servidor.', true);
    } finally {
      setCreating(false);
    }
  };

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.communitiesContent}>
      <View style={styles.communitiesHeaderCard}>
        <View style={styles.headerTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.communitiesTitle}>Comunidades Reales</Text>
            <Text style={styles.communitiesSubtitle}>
              Conectado a FastAPI ({communities.length} {communities.length === 1 ? 'comunidad activa' : 'comunidades activas'}).
            </Text>
          </View>

          <View style={styles.headerActions}>
            {onRefreshCommunities ? (
              <TouchableOpacity style={styles.iconBtn} onPress={onRefreshCommunities}>
                {communitiesLoading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="refresh" size={18} color={colors.primary} />
                )}
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => {
                if (!token) {
                  Alert.alert(
                    'Inicia Sesión',
                    'Inicia sesión en la pestaña Perfil para crear una nueva comunidad territorial.',
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      { text: 'Ir a Perfil', onPress: () => onNavigateToProfile && onNavigateToProfile() }
                    ]
                  );
                } else {
                  setShowCreateModal(true);
                }
              }}
            >
              <Ionicons name="add-circle-outline" size={16} color="#ffffff" />
              <Text style={styles.createBtnText}>Crear</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {statusBanner ? (
        <View style={[styles.statusBanner, statusBanner.isError ? styles.statusBannerErr : styles.statusBannerOk]}>
          <Text style={[styles.statusBannerText, statusBanner.isError ? { color: '#991b1b' } : { color: '#065f46' }]}>
            {statusBanner.text}
          </Text>
        </View>
      ) : null}

      {communities.length === 0 && !communitiesLoading ? (
        <View style={styles.emptyCard}>
          <Ionicons name="people-outline" size={34} color="#94a3b8" />
          <Text style={styles.emptyTitle}>No hay comunidades disponibles</Text>
          <Text style={styles.emptySub}>Puedes crear la primera comunidad de tu territorio.</Text>
        </View>
      ) : (
        communities.map((com, index) => {
          const localAssetKey = index % 3 === 0 ? 'guajira-banner' : index % 3 === 1 ? 'guajira-paisaje' : 'guajira-flora';
          const localImageSource = localAssets[localAssetKey] || DEFAULT_LOCAL_COMMUNITY_ASSETS[localAssetKey];
          const membersCount = com._count?.members ?? com.membersCount ?? 1;
          const leaderName = com.owner?.name || com.owner?.username || com.leader || 'Coordinador';
          const locationText = com.location || com.municipality || 'Territorio EcoRaíces';

          return (
            <View key={com.id} style={styles.communityCard}>
              <TouchableOpacity activeOpacity={0.9} onPress={() => handleOpenDetail(com)}>
                <Image
                  source={com.imageUrl ? { uri: com.imageUrl.startsWith('/') ? `${cleanBase}${com.imageUrl}` : com.imageUrl } : localImageSource}
                  style={styles.communityBanner}
                />
              </TouchableOpacity>

              <View style={styles.communityBody}>
                <View style={styles.communityLocationBadge}>
                  <Text style={styles.communityLocationText}>📍 {locationText}</Text>
                </View>
                <Text style={styles.communityName}>{(com.name || '').trim()}</Text>
                <Text style={styles.communityDesc}>
                  {com.description || 'Comunidad dedicada al monitoreo y protección forestal.'}
                </Text>

                <View style={styles.communityStatsRow}>
                  <View style={styles.cStatItem}>
                    <Text style={styles.cStatNum}>{membersCount}</Text>
                    <Text style={styles.cStatLabel}>Miembros</Text>
                  </View>
                  <View style={styles.cStatItem}>
                    <Text style={[styles.cStatNum, { color: colors.primary }]}>
                      @{com.owner?.username || 'admin'}
                    </Text>
                    <Text style={styles.cStatLabel}>Coordinación</Text>
                  </View>
                  <View style={styles.cStatItem}>
                    <Text style={styles.cStatNum}>👑</Text>
                    <Text style={styles.cStatLabel} numberOfLines={1}>{leaderName}</Text>
                  </View>
                </View>

                <View style={styles.cardButtonsRow}>
                  <TouchableOpacity
                    style={styles.detailCommunityBtn}
                    onPress={() => handleOpenDetail(com)}
                  >
                    <Text style={styles.detailCommunityBtnText}>Ver Miembros y Árboles</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.joinCommunityBtn}
                    onPress={() => handleJoinCommunity(com)}
                    disabled={joiningId === com.id}
                  >
                    {joiningId === com.id ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.joinCommunityBtnText}>Unirme</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })
      )}

      {/* MODAL DETALLE DE COMUNIDAD (GET /api/communities/{id}) */}
      <Modal
        visible={Boolean(selectedDetail)}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedDetail(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderBar}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {(selectedDetail?.community?.name || 'Comunidad').trim()}
              </Text>
              <TouchableOpacity onPress={() => setSelectedDetail(null)} style={styles.modalCloseIcon}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#475569' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScrollBody}>
              {detailLoading ? (
                <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 12 }} />
              ) : null}

              <Text style={styles.modalDesc}>
                {selectedDetail?.community?.description || 'Comunidad oficial registrada en EcoRaíces.'}
              </Text>

              <Text style={styles.sectionHeading}>
                👥 Miembros ({selectedDetail?.community?.members?.length || selectedDetail?.community?._count?.members || 0})
              </Text>
              {(selectedDetail?.community?.members || []).map((m) => (
                <View key={m.id} style={styles.memberRow}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>
                      {(m.user?.name || m.user?.username || 'U').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>{m.user?.name || m.user?.username}</Text>
                    <Text style={styles.memberHandle}>@{m.user?.username}</Text>
                  </View>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>{m.role}</Text>
                  </View>
                </View>
              ))}

              <Text style={[styles.sectionHeading, { marginTop: 16 }]}>
                🌳 Árboles de la Comunidad ({(selectedDetail?.observations || []).length})
              </Text>
              {(selectedDetail?.observations || []).length === 0 ? (
                <Text style={styles.emptySmallText}>
                  Aún no hay observaciones vinculadas directamente a esta comunidad.
                </Text>
              ) : (
                (selectedDetail?.observations || []).map((obs) => (
                  <View key={obs.id} style={styles.memberRow}>
                    <Text style={{ fontSize: 18 }}>🌱</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.memberName}>{obs.species?.name || 'Árbol'}</Text>
                      <Text style={styles.memberHandle}>{obs.species?.scientificName || ''}</Text>
                    </View>
                    <Text style={styles.obsDateText}>
                      {obs.observationDate ? obs.observationDate.split('T')[0] : ''}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL CREAR COMUNIDAD (POST /api/communities) */}
      <Modal
        visible={showCreateModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderBar}>
              <Text style={styles.modalTitle}>Crear Nueva Comunidad</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)} style={styles.modalCloseIcon}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#475569' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalScrollBody}>
              <Text style={styles.inputLabel}>Nombre de la Comunidad *</Text>
              <TextInput
                style={styles.textInput}
                value={newName}
                onChangeText={setNewName}
                placeholder="Ej. Vigías del Bosque Seco Riohacha"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.inputLabel}>Municipio / Ubicación</Text>
              <TextInput
                style={styles.textInput}
                value={newLocation}
                onChangeText={setNewLocation}
                placeholder="Ej. Riohacha, La Guajira"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.inputLabel}>Descripción</Text>
              <TextInput
                style={[styles.textInput, { minHeight: 70, textAlignVertical: 'top' }]}
                value={newDescription}
                onChangeText={setNewDescription}
                placeholder="Objetivo de conservación y monitoreo..."
                placeholderTextColor="#94a3b8"
                multiline={true}
              />

              <TouchableOpacity
                style={styles.submitCreateBtn}
                onPress={handleCreateCommunity}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.submitCreateBtnText}>🌱 Crear Comunidad en Servidor</Text>
                )}
              </TouchableOpacity>
            </View>
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
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center'
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8
  },
  createBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800'
  },
  communitiesTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a'
  },
  communitiesSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2
  },
  statusBanner: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1
  },
  statusBannerOk: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981'
  },
  statusBannerErr: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444'
  },
  statusBannerText: {
    fontSize: 12.5,
    fontWeight: '700'
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
    marginTop: 8
  },
  emptySub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center'
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
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 6
  },
  communityLocationText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065f46'
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
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a'
  },
  cStatLabel: {
    fontSize: 9.5,
    color: '#64748b',
    marginTop: 2
  },
  cardButtonsRow: {
    flexDirection: 'row',
    gap: 8
  },
  detailCommunityBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center'
  },
  detailCommunityBtnText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '700'
  },
  joinCommunityBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  joinCommunityBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800'
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
    maxHeight: '82%',
    overflow: 'hidden'
  },
  modalHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
    flex: 1
  },
  modalCloseIcon: {
    padding: 4
  },
  modalScrollBody: {
    padding: 16,
    paddingBottom: 32
  },
  modalDesc: {
    fontSize: 12.5,
    color: '#475569',
    marginBottom: 14,
    lineHeight: 18
  },
  sectionHeading: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  memberAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#065f46',
    alignItems: 'center',
    justifyContent: 'center'
  },
  memberAvatarText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14
  },
  memberName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a'
  },
  memberHandle: {
    fontSize: 11,
    color: '#64748b'
  },
  roleBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065f46'
  },
  emptySmallText: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic'
  },
  obsDateText: {
    fontSize: 10.5,
    color: '#64748b',
    fontWeight: '600'
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
    marginTop: 8
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a'
  },
  submitCreateBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16
  },
  submitCreateBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800'
  }
});
