/**
 * EcoRaíces Mobile · Pantalla de Perfil & Autenticación Dokploy
 * Pantalla modularizada independiente: Login, Registro, Datos, Árboles, Medallas y Outbox Sync
 */

import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../theme';

export default function ProfileScreen({
  token,
  isGuestMode,
  setIsGuestMode,
  userName,
  setUserName,
  userEmail,
  setUserEmail,
  userUsername,
  setUserUsername,
  userRole,
  setUserRole,
  userTerritory,
  userBio,
  setUserBio,
  authMode,
  setAuthMode,
  authEmail,
  setAuthEmail,
  authPassword,
  setAuthPassword,
  authName,
  setAuthName,
  authUsername,
  setAuthUsername,
  authRemember,
  setAuthRemember,
  isAuthLoading,
  authError,
  setAuthError,
  authSuccess,
  setAuthSuccess,
  showPassword,
  setShowPassword,
  handleLogin,
  handleRegister,
  handleLogout,
  handleSaveProfile,
  setShowTerritoryModal,
  profileSaveBanner,
  profileSubTab,
  setProfileSubTab,
  outboxTrees = [],
  remoteTrees = [],
  gamification,
  stats = { pending: 0, synced: 0 },
  isSyncing,
  syncProgress,
  handleStartSync,
  serverUrl,
  setServerUrl,
  connectionStatus,
  handleTestConnection,
  onNavigateToCapture
}) {
  // Si el usuario no tiene token ni ha entrado como invitado -> Vista de Login / Registro Dokploy
  if (!token && !isGuestMode) {
    return (
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.authScrollContent}>
        <View style={styles.authCard}>
          {/* Branding EcoRaíces */}
          <View style={styles.authBrandContainer}>
            <View style={styles.authLogoCircle}>
              <Ionicons name="leaf" size={32} color={colors.primary} />
            </View>
            <Text style={styles.authTitle}>EcoRaíces</Text>
            <Text style={styles.authSubtitle}>
              Plataforma de Monitoreo Biológico & Comunitario
            </Text>
            <TouchableOpacity
              style={[
                styles.authServerBadge,
                connectionStatus?.ok === true && styles.authServerBadgeOk,
                connectionStatus?.ok === false && styles.authServerBadgeErr
              ]}
              onPress={handleTestConnection}
              activeOpacity={0.7}
            >
              {connectionStatus === 'testing' ? (
                <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 4 }} />
              ) : (
                <View
                  style={[
                    styles.onlineDot,
                    connectionStatus?.ok === false && { backgroundColor: colors.danger }
                  ]}
                />
              )}
              <Text
                style={[
                  styles.authServerText,
                  connectionStatus?.ok === false && { color: colors.danger }
                ]}
              >
                {connectionStatus === 'testing'
                  ? 'Verificando Dokploy...'
                  : connectionStatus?.ok
                  ? `✓ Online (${connectionStatus.latency}ms): ${serverUrl ? serverUrl.replace(/^https?:\/\//, '') : 'ecoraices.neuraljira.tech'}`
                  : connectionStatus?.ok === false
                  ? '✕ Sin Conexión (Toca para reintentar)'
                  : `Dokploy: ${serverUrl ? serverUrl.replace(/^https?:\/\//, '') : 'ecoraices.neuraljira.tech'} • Probar`}
              </Text>
            </TouchableOpacity>

            {connectionStatus?.ok === false && (
              <View style={styles.connectionErrorNotice}>
                <Ionicons name="warning-outline" size={14} color="#dc2626" />
                <Text style={styles.connectionErrorNoticeText}>
                  {connectionStatus.error}
                </Text>
              </View>
            )}
          </View>

          {/* Selector de Pestañas: Iniciar Sesión / Crear Cuenta */}
          <View style={styles.authTabSwitcher}>
            <TouchableOpacity
              style={[styles.authTabBtn, authMode === 'login' && styles.authTabBtnActive]}
              onPress={() => {
                setAuthMode('login');
                setAuthError('');
                setAuthSuccess('');
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.authTabBtnText, authMode === 'login' && styles.authTabBtnTextActive]}>
                Iniciar Sesión
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.authTabBtn, authMode === 'register' && styles.authTabBtnActive]}
              onPress={() => {
                setAuthMode('register');
                setAuthError('');
                setAuthSuccess('');
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.authTabBtnText, authMode === 'register' && styles.authTabBtnTextActive]}>
                Crear Cuenta
              </Text>
            </TouchableOpacity>
          </View>


          {/* Banner de Error */}
          {Boolean(authError) && (
            <View style={styles.authAlertError}>
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={styles.authAlertErrorText}>{authError}</Text>
            </View>
          )}

          {/* Banner de Éxito */}
          {Boolean(authSuccess) && (
            <View style={styles.authAlertSuccess}>
              <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
              <Text style={styles.authAlertSuccessText}>{authSuccess}</Text>
            </View>
          )}

          {/* FORMULARIO: INICIAR SESIÓN */}
          {authMode === 'login' ? (
            <View style={styles.authForm}>
              <View style={styles.formFieldGroup}>
                <Text style={styles.formFieldLabel}>Correo Electrónico</Text>
                <View style={styles.authInputWrapper}>
                  <Ionicons name="mail-outline" size={18} color={colors.textSecondary} style={styles.authInputIcon} />
                  <TextInput
                    style={styles.authTextInput}
                    value={authEmail}
                    onChangeText={setAuthEmail}
                    placeholder="tu@correo.com"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              <View style={styles.formFieldGroup}>
                <Text style={styles.formFieldLabel}>Contraseña</Text>
                <View style={styles.authInputWrapper}>
                  <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} style={styles.authInputIcon} />
                  <TextInput
                    style={styles.authTextInput}
                    value={authPassword}
                    onChangeText={setAuthPassword}
                    placeholder="••••••••"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.authPassToggle}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={styles.rememberRow}
                onPress={() => setAuthRemember(!authRemember)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={authRemember ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={authRemember ? colors.primary : colors.textMuted}
                />
                <Text style={styles.rememberText}>Recordar mi cuenta en este dispositivo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.authSubmitBtn, isAuthLoading && styles.authSubmitBtnDisabled]}
                onPress={handleLogin}
                disabled={isAuthLoading}
                activeOpacity={0.8}
              >
                {isAuthLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="log-in-outline" size={20} color="#ffffff" style={{ marginRight: 8 }} />
                    <Text style={styles.authSubmitBtnText}>Iniciar Sesión</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.authSwitchBtn}
                onPress={() => {
                  setAuthMode('register');
                  setAuthError('');
                  setAuthSuccess('');
                }}
              >
                <Text style={styles.authSwitchText}>
                  ¿No tienes una cuenta? <Text style={styles.authSwitchLink}>Regístrate aquí</Text>
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* FORMULARIO: CREAR CUENTA */
            <View style={styles.authForm}>
              <View style={styles.formFieldGroup}>
                <Text style={styles.formFieldLabel}>Nombre Completo</Text>
                <View style={styles.authInputWrapper}>
                  <Ionicons name="person-outline" size={18} color={colors.textSecondary} style={styles.authInputIcon} />
                  <TextInput
                    style={styles.authTextInput}
                    value={authName}
                    onChangeText={setAuthName}
                    placeholder="Ej: David Hernández"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <View style={styles.formFieldGroup}>
                <Text style={styles.formFieldLabel}>Nombre de Usuario</Text>
                <View style={styles.authInputWrapper}>
                  <Ionicons name="at-outline" size={18} color={colors.textSecondary} style={styles.authInputIcon} />
                  <TextInput
                    style={styles.authTextInput}
                    value={authUsername}
                    onChangeText={setAuthUsername}
                    placeholder="ej: david_guajira"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              <View style={styles.formFieldGroup}>
                <Text style={styles.formFieldLabel}>Correo Electrónico</Text>
                <View style={styles.authInputWrapper}>
                  <Ionicons name="mail-outline" size={18} color={colors.textSecondary} style={styles.authInputIcon} />
                  <TextInput
                    style={styles.authTextInput}
                    value={authEmail}
                    onChangeText={setAuthEmail}
                    placeholder="tu@correo.com"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              <View style={styles.formFieldGroup}>
                <Text style={styles.formFieldLabel}>Contraseña (mínimo 8 caracteres)</Text>
                <View style={styles.authInputWrapper}>
                  <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} style={styles.authInputIcon} />
                  <TextInput
                    style={styles.authTextInput}
                    value={authPassword}
                    onChangeText={setAuthPassword}
                    placeholder="••••••••"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.authPassToggle}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.authSubmitBtn, isAuthLoading && styles.authSubmitBtnDisabled]}
                onPress={handleRegister}
                disabled={isAuthLoading}
                activeOpacity={0.8}
              >
                {isAuthLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="person-add-outline" size={20} color="#ffffff" style={{ marginRight: 8 }} />
                    <Text style={styles.authSubmitBtnText}>Crear Cuenta en EcoRaíces</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.authSwitchBtn}
                onPress={() => {
                  setAuthMode('login');
                  setAuthError('');
                  setAuthSuccess('');
                }}
              >
                <Text style={styles.authSwitchText}>
                  ¿Ya tienes una cuenta? <Text style={styles.authSwitchLink}>Inicia sesión aquí</Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Opción de Continuar en Modo Offline */}
          <TouchableOpacity
            style={styles.authGuestBtn}
            onPress={() => setIsGuestMode(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="cloud-offline-outline" size={18} color={colors.textSecondary} style={{ marginRight: 6 }} />
            <Text style={styles.authGuestBtnText}>Continuar en Modo Guardabosques Offline</Text>
          </TouchableOpacity>

          <View style={styles.authOfflineHintBox}>
            <Text style={styles.authOfflineHintText}>
              💡 Puedes censar árboles en campo sin conexión a internet. Tus datos se guardan en SQLite local y se sincronizan a Dokploy cuando inicies sesión y tengas red.
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  }

  // Vista del Guardabosques Autenticado o en Modo Invitado
  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.profileContent}>
      {/* Banner de Modo Invitado si no hay token */}
      {!token && (
        <View style={styles.guestBanner}>
          <View style={styles.guestBannerLeft}>
            <Ionicons name="information-circle-outline" size={18} color={colors.accent} />
            <Text style={styles.guestBannerText}>Modo Offline (Sin Autenticar)</Text>
          </View>
          <TouchableOpacity style={styles.guestLoginBtn} onPress={() => setIsGuestMode(false)}>
            <Text style={styles.guestLoginBtnText}>Iniciar Sesión</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Header del Perfil */}
      <View style={styles.profileHeaderCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitials}>
            {(userName || 'GB').split(' ').map((n) => n[0]).join('').substring(0, 2)}
          </Text>
        </View>
        <View style={styles.profileHeaderInfo}>
          <Text style={styles.profileName}>{userName}</Text>
          <Text style={styles.profileSubtitle}>
            @{userUsername} • {userRole}
          </Text>
          <TouchableOpacity
            style={styles.profileTerritoryPill}
            onPress={() => setShowTerritoryModal(true)}
          >
            <Text style={styles.profileTerritoryText}>📍 {userTerritory}</Text>
            <Ionicons name="create-outline" size={14} color={colors.primary} style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>

        {/* Botón Salir / Cerrar Sesión en Header */}
        {token ? (
          <TouchableOpacity
            style={styles.headerLogoutBtn}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={16} color={colors.error} />
            <Text style={styles.headerLogoutBtnText}>Salir</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.headerLoginBtn}
            onPress={() => setIsGuestMode(false)}
            activeOpacity={0.7}
          >
            <Ionicons name="log-in-outline" size={16} color={colors.primary} />
            <Text style={styles.headerLoginBtnText}>Entrar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Sub-Tabs de Navegación de Perfil */}
      <View style={styles.profileSubTabsBar}>
        <TouchableOpacity
          style={[styles.profileSubTabBtn, profileSubTab === 'datos' && styles.profileSubTabActive]}
          onPress={() => setProfileSubTab('datos')}
        >
          <Text style={[styles.profileSubTabText, profileSubTab === 'datos' && styles.profileSubTabTextActive]}>
            👤 Datos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.profileSubTabBtn, profileSubTab === 'arboles' && styles.profileSubTabActive]}
          onPress={() => setProfileSubTab('arboles')}
        >
          <Text style={[styles.profileSubTabText, profileSubTab === 'arboles' && styles.profileSubTabTextActive]}>
            🌳 Árboles ({outboxTrees.length + remoteTrees.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.profileSubTabBtn, profileSubTab === 'medallas' && styles.profileSubTabActive]}
          onPress={() => setProfileSubTab('medallas')}
        >
          <Text style={[styles.profileSubTabText, profileSubTab === 'medallas' && styles.profileSubTabTextActive]}>
            🏆 Logros
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.profileSubTabBtn, profileSubTab === 'outbox' && styles.profileSubTabActive]}
          onPress={() => setProfileSubTab('outbox')}
        >
          <Text style={[styles.profileSubTabText, profileSubTab === 'outbox' && styles.profileSubTabTextActive]}>
            ⚙️ Sync ({stats.pending})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Banner de confirmación al guardar perfil */}
      {Boolean(profileSaveBanner) && (
        <View style={styles.profileSaveAlertBox}>
          <Text style={styles.profileSaveAlertText}>{profileSaveBanner}</Text>
        </View>
      )}

      {/* PESTAÑA 1: DATOS & TERRITORIO */}
      {profileSubTab === 'datos' && (
        <View style={styles.profileFormCard}>
          <View style={styles.profileSectionHead}>
            <Text style={styles.profileSectionTitle}>Editar Perfil & Territorio</Text>
            <Text style={styles.profileSectionSubtitle}>
              Personaliza tus datos de guardabosques e integración comunitaria.
            </Text>
          </View>

          {/* Campo: Nombre Completo */}
          <View style={styles.formFieldGroup}>
            <Text style={styles.formFieldLabel}>Nombre Completo</Text>
            <TextInput
              style={styles.formFieldInput}
              value={userName}
              onChangeText={setUserName}
              placeholder="Tu nombre completo"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          {/* Campo: Nombre de Usuario */}
          <View style={styles.formFieldGroup}>
            <Text style={styles.formFieldLabel}>Nombre de Usuario</Text>
            <View style={styles.formFieldInputPrefixBox}>
              <Text style={styles.formFieldPrefix}>@</Text>
              <TextInput
                style={styles.formFieldInputPrefixed}
                value={userUsername}
                onChangeText={setUserUsername}
                placeholder="usuario"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Campo: Correo Electrónico */}
          <View style={styles.formFieldGroup}>
            <Text style={styles.formFieldLabel}>Correo Electrónico</Text>
            <TextInput
              style={styles.formFieldInput}
              value={userEmail}
              onChangeText={setUserEmail}
              placeholder="correo@ejemplo.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Campo: Territorio Seleccionado */}
          <View style={styles.formFieldGroup}>
            <Text style={styles.formFieldLabel}>Territorio Asignado</Text>
            <TouchableOpacity
              style={styles.territorySelectorBtn}
              onPress={() => setShowTerritoryModal(true)}
            >
              <View style={styles.territorySelectorContent}>
                <Ionicons name="location" size={18} color={colors.primary} />
                <Text style={styles.territorySelectorValue}>{userTerritory}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.territoryHelperText}>
              Toca para cambiar tu municipio o vereda de trabajo en toda Colombia.
            </Text>
          </View>

          {/* Campo: Rol */}
          <View style={styles.formFieldGroup}>
            <Text style={styles.formFieldLabel}>Rol / Ocupación Comunitaria</Text>
            <TextInput
              style={styles.formFieldInput}
              value={userRole}
              onChangeText={setUserRole}
              placeholder="Ej. Guardabosques, Investigador, Líder Comunitario"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          {/* Campo: Biografía */}
          <View style={styles.formFieldGroup}>
            <Text style={styles.formFieldLabel}>Biografía</Text>
            <TextInput
              style={[styles.formFieldInput, styles.formFieldTextarea]}
              value={userBio}
              onChangeText={setUserBio}
              placeholder="Cuéntanos sobre tu labor de conservación en territorio..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Botón Guardar Cambios */}
          <TouchableOpacity style={styles.btnSaveProfile} onPress={handleSaveProfile} activeOpacity={0.8}>
            <Ionicons name="checkmark-circle" size={18} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.btnSaveProfileText}>Guardar Cambios de Perfil</Text>
          </TouchableOpacity>

          {/* Botón Cerrar Sesión si está autenticado */}
          {token ? (
            <TouchableOpacity
              style={styles.fullLogoutBtn}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <Ionicons name="log-out-outline" size={18} color={colors.error} style={{ marginRight: 6 }} />
              <Text style={styles.fullLogoutBtnText}>Cerrar Sesión en este Dispositivo</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      {/* PESTAÑA 2: MIS ÁRBOLES CENSADOS */}
      {profileSubTab === 'arboles' && (
        <View style={styles.profileObservationsCard}>
          <View style={styles.profileObsHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileSectionTitle}>Mis Árboles Registrados</Text>
              <Text style={styles.profileSectionSubtitle}>
                {outboxTrees.length + remoteTrees.length} árboles censados en territorio
              </Text>
            </View>
            <TouchableOpacity
              style={styles.btnNuevaObsMini}
              onPress={onNavigateToCapture}
            >
              <Text style={styles.btnNuevaObsMiniText}>+ Censar Árbol</Text>
            </TouchableOpacity>
          </View>

          {outboxTrees.length === 0 && remoteTrees.length === 0 ? (
            <View style={styles.emptyObsBox}>
              <Text style={styles.emptyObsIcon}>🌱</Text>
              <Text style={styles.emptyObsTitle}>Aún no tienes árboles registrados</Text>
              <Text style={styles.emptyObsSubtitle}>
                Sal a campo y registra tu primera especie nativa con coordenadas GPS.
              </Text>
              <TouchableOpacity
                style={[styles.btnSaveProfile, { marginTop: 14 }]}
                onPress={onNavigateToCapture}
              >
                <Text style={styles.btnSaveProfileText}>Ir al Formulario de Captura</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.obsItemsList}>
              {/* Árboles locales pendientes en SQLite */}
              {outboxTrees.map((tree) => {
                const spName = tree.speciesName || tree.species_name || 'Árbol Censado';
                const mun = tree.municipio || tree.municipality || 'La Guajira';
                const isSynced = tree.syncStatus === 'SYNCED' || tree.sync_status === 'SYNCED';
                const imgUri = tree.localImagePath || tree.local_image_path;
                const dateStr = tree.createdAt || tree.created_at || tree.observationDate || tree.observation_date;
                const latVal = typeof tree.latitude === 'number' ? tree.latitude.toFixed(4) : tree.latitude;
                const lngVal = typeof tree.longitude === 'number' ? tree.longitude.toFixed(4) : tree.longitude;

                return (
                  <View key={`outbox-${tree.clientId || tree.id}`} style={styles.obsItemRow}>
                    <View style={styles.obsThumbBox}>
                      {imgUri ? (
                        <Image source={{ uri: imgUri }} style={styles.obsThumbImg} />
                      ) : (
                        <Text style={{ fontSize: 22 }}>🌳</Text>
                      )}
                    </View>
                    <View style={styles.obsInfoBox}>
                      <Text style={styles.obsSpeciesName}>{spName}</Text>
                      <Text style={styles.obsLocationText}>
                        📍 {mun} • Lat: {latVal}, Lng: {lngVal}
                      </Text>
                      <Text style={styles.obsDateText}>
                        {dateStr ? new Date(dateStr).toLocaleDateString('es-CO') : 'Reciente'}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.obsStatusBadge,
                        isSynced ? styles.statusSynced : styles.statusPending
                      ]}
                    >
                      <Text
                        style={[
                          styles.obsStatusBadgeText,
                          isSynced ? styles.statusTextSynced : styles.statusTextPending
                        ]}
                      >
                        {isSynced ? '✓ Subido' : '⏳ SQLite'}
                      </Text>
                    </View>
                  </View>
                );
              })}

              {/* Árboles remotos del servidor Dokploy */}
              {remoteTrees.map((rt) => {
                const spName = rt.species?.name || rt.speciesName || rt.species_name || rt.name || 'Árbol Registrado';
                const mun = rt.municipio || rt.municipality || 'La Guajira';
                const dateStr = rt.createdAt || rt.created_at || rt.observationDate;
                const isApproved = rt.status === 'APPROVED' || rt.verified;
                const latVal = typeof rt.latitude === 'number' ? rt.latitude.toFixed(4) : rt.latitude;
                const lngVal = typeof rt.longitude === 'number' ? rt.longitude.toFixed(4) : rt.longitude;
                const fullImgUrl = rt.imageUrl
                  ? (rt.imageUrl.startsWith('http') ? rt.imageUrl : `${serverUrl}${rt.imageUrl}`)
                  : null;

                return (
                  <View key={`remote-${rt.id}`} style={styles.obsItemRow}>
                    <View style={styles.obsThumbBox}>
                      {fullImgUrl ? (
                        <Image source={{ uri: fullImgUrl }} style={styles.obsThumbImg} />
                      ) : (
                        <Text style={{ fontSize: 22 }}>🌿</Text>
                      )}
                    </View>
                    <View style={styles.obsInfoBox}>
                      <Text style={styles.obsSpeciesName}>{spName}</Text>
                      <Text style={styles.obsLocationText}>
                        📍 {mun} • Lat: {latVal}, Lng: {lngVal}
                      </Text>
                      <Text style={styles.obsDateText}>
                        {dateStr ? new Date(dateStr).toLocaleDateString('es-CO') : 'Verificado'}
                      </Text>
                    </View>
                    <View style={[styles.obsStatusBadge, styles.statusSynced]}>
                      <Text style={[styles.obsStatusBadgeText, styles.statusTextSynced]}>
                        {isApproved ? '✓ Aprobada' : '⏳ En revisión'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* PESTAÑA 3: MEDALLAS & GAMIFICACIÓN */}
      {profileSubTab === 'medallas' && Boolean(gamification) && (
        <>
          <View style={styles.medalsFullCard}>
            <View style={styles.medalsCardHeader}>
              <Ionicons name="trophy" size={20} color="#d97706" />
              <Text style={styles.medalsCardTitle}>Sistema de Medallas & Logros</Text>
            </View>
            <Text style={styles.medalsCardSubtitle}>
              {gamification.unlockedCount} de {gamification.totalMedals} desbloqueadas • Rango: {gamification.currentRank?.titulo}
            </Text>

            <View style={styles.medalsGrid}>
              {gamification.medals?.map((m) => (
                <View key={m.id} style={[styles.medalGridItem, !m.unlocked && styles.medalGridItemLocked]}>
                  <Text style={styles.medalGridIcon}>{m.unlocked ? m.icon : '🔒'}</Text>
                  <Text style={[styles.medalGridTitle, !m.unlocked && { color: colors.textMuted }]}>{m.title}</Text>
                  <Text style={styles.medalGridDesc}>{m.description}</Text>
                  <View style={styles.medalPointsTag}>
                    <Text style={styles.medalPointsText}>+{m.points} pts</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Impacto Ambiental Estimado */}
          {Boolean(gamification.environmentalImpact) && (
            <View style={styles.ecoImpactCard}>
              <Text style={styles.ecoImpactTitle}>🌱 Tu Impacto Ambiental Acumulado</Text>
              <View style={styles.ecoImpactRow}>
                <View style={styles.ecoImpactItem}>
                  <Text style={styles.ecoImpactNum}>{gamification.environmentalImpact.co2AbsorbedKg} kg</Text>
                  <Text style={styles.ecoImpactLabel}>CO2 Estimado Fijado</Text>
                </View>
                <View style={styles.ecoImpactItem}>
                  <Text style={[styles.ecoImpactNum, { color: colors.accent }]}>
                    {gamification.environmentalImpact.waterProtectedLitres} L
                  </Text>
                  <Text style={styles.ecoImpactLabel}>Agua Protegida en Suelo</Text>
                </View>
              </View>
            </View>
          )}
        </>
      )}

      {/* PESTAÑA 4: SINCRONIZACIÓN OUTBOX & SERVIDOR DOKPLOY */}
      {profileSubTab === 'outbox' && (
        <>
          {/* Tarjeta de Estado de Conexión y Cuenta */}
          <View style={styles.outboxAuthCard}>
            <View style={styles.outboxAuthHeader}>
              <Ionicons
                name={token ? 'shield-checkmark' : 'cloud-offline-outline'}
                size={20}
                color={token ? colors.primary : colors.warning}
              />
              <Text style={styles.outboxAuthTitle}>
                {token ? 'Cuenta Conectada a Dokploy' : 'Modo Offline (Sin Autenticar)'}
              </Text>
            </View>
            <Text style={styles.outboxAuthDesc}>
              {token
                ? `Sesión activa como @${userUsername} (${userEmail}). Tus observaciones se sincronizan directamente con la plataforma central.`
                : 'Inicia sesión para que tus árboles se asocien a tu cuenta de guardabosques en la plataforma web de EcoRaíces.'}
            </Text>
            {token ? (
              <TouchableOpacity style={styles.outboxLogoutBtn} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={16} color={colors.error} style={{ marginRight: 4 }} />
                <Text style={styles.outboxLogoutBtnText}>Cerrar Sesión / Cambiar Cuenta</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.outboxLoginBtn} onPress={() => setIsGuestMode(false)}>
                <Ionicons name="log-in-outline" size={16} color={colors.primary} style={{ marginRight: 4 }} />
                <Text style={styles.outboxLoginBtnText}>Iniciar Sesión / Crear Cuenta</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.outboxSectionCard}>
            <View style={styles.outboxHeaderRow}>
              <View>
                <Text style={styles.outboxTitle}>Cola de Sincronización Outbox</Text>
                <Text style={styles.outboxSubtitle}>
                  {stats.pending} pendientes • {stats.synced} subidos a Dokploy
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.syncTriggerBtn, isSyncing && styles.syncTriggerBtnDisabled]}
                onPress={handleStartSync}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.syncTriggerBtnText}>⚡ Sincronizar</Text>
                )}
              </TouchableOpacity>
            </View>

            {Boolean(syncProgress) && (
              <View style={styles.syncProgressContainer}>
                <Text style={styles.syncProgressText}>
                  Subiendo {syncProgress.current} de {syncProgress.total} árboles...
                </Text>
              </View>
            )}

            {outboxTrees.length === 0 ? (
              <View style={styles.emptyOutboxBox}>
                <Text style={styles.emptyOutboxText}>No hay árboles pendientes en la base de datos local SQLite.</Text>
              </View>
            ) : (
              outboxTrees.slice(0, 5).map((tree) => (
                <View key={tree.id} style={styles.treeOutboxItem}>
                  <View style={styles.treeOutboxLeft}>
                    <Text style={styles.treeOutboxName}>{tree.species_name}</Text>
                    <Text style={styles.treeOutboxDetails}>
                      📍 {tree.municipality} • Lat: {tree.latitude?.toFixed?.(4) || tree.latitude}, Lng: {tree.longitude?.toFixed?.(4) || tree.longitude}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.treeStatusBadge,
                      tree.sync_status === 'SYNCED' ? styles.statusSynced : styles.statusPending
                    ]}
                  >
                    <Text
                      style={[
                        styles.treeStatusText,
                        tree.sync_status === 'SYNCED' ? styles.statusTextSynced : styles.statusTextPending
                      ]}
                    >
                      {tree.sync_status === 'SYNCED' ? '✓ Subido' : '⏳ En Cola'}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Ajustes de Servidor */}
          <View style={styles.settingsSectionCard}>
            <Text style={styles.settingsTitle}>Configuración de Conexión</Text>
            <View style={styles.formFieldGroup}>
              <Text style={styles.formFieldLabel}>URL del Servidor Dokploy:</Text>
              <View style={styles.serverInputRow}>
                <TextInput
                  style={[styles.formFieldInput, { flex: 1, marginBottom: 0 }]}
                  value={serverUrl}
                  onChangeText={(val) => {
                    setServerUrl(val);
                    AsyncStorage.setItem('ecoraices_server_url', val);
                  }}
                  placeholder="https://ecoraices.neuraljira.tech"
                />
                <TouchableOpacity
                  style={styles.btnTestServer}
                  onPress={handleTestConnection}
                  disabled={connectionStatus === 'testing'}
                  activeOpacity={0.7}
                >
                  {connectionStatus === 'testing' ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.btnTestServerText}>Probar</Text>
                  )}
                </TouchableOpacity>
              </View>
              {connectionStatus && (
                <Text
                  style={[
                    styles.serverStatusFeedback,
                    connectionStatus.ok ? styles.serverStatusFeedbackOk : styles.serverStatusFeedbackErr
                  ]}
                >
                  {connectionStatus.ok
                    ? `✓ Conectado (${connectionStatus.latency}ms) - ${connectionStatus.message}`
                    : `✕ ${connectionStatus.error}`}
                </Text>
              )}
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1
  },
  authScrollContent: {
    padding: 16,
    paddingBottom: 40
  },
  authCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card
  },
  authBrandContainer: {
    alignItems: 'center',
    marginBottom: 20
  },
  authLogoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primaryBorder,
    marginBottom: 10
  },
  authTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary
  },
  authSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 260
  },
  authServerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: colors.successBorder,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 10,
    gap: 6
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary
  },
  authServerText: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: '700'
  },
  authServerBadgeOk: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac'
  },
  authServerBadgeErr: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5'
  },
  connectionErrorNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 8
  },
  connectionErrorNoticeText: {
    color: '#b91c1c',
    fontSize: 11,
    fontWeight: '600',
    flex: 1
  },
  serverInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  btnTestServer: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnTestServerText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800'
  },
  serverStatusFeedback: {
    fontSize: 11,
    marginTop: 6,
    fontWeight: '600'
  },
  serverStatusFeedbackOk: {
    color: colors.primary
  },
  serverStatusFeedbackErr: {
    color: colors.danger
  },
  authTabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 3,
    marginBottom: 18
  },
  authTabBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 8
  },
  authTabBtnActive: {
    backgroundColor: colors.cardBg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  authTabBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary
  },
  authTabBtnTextActive: {
    color: colors.primary,
    fontWeight: '900'
  },
  authAlertError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorBg,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    gap: 8
  },
  authAlertErrorText: {
    color: colors.errorText,
    fontSize: 12,
    fontWeight: '600',
    flex: 1
  },
  authAlertSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: colors.successBorder,
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    gap: 8
  },
  authAlertSuccessText: {
    color: colors.successText,
    fontSize: 12,
    fontWeight: '600',
    flex: 1
  },
  authForm: {
    width: '100%'
  },
  formFieldGroup: {
    marginBottom: 14
  },
  formFieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 5
  },
  authInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12
  },
  authInputIcon: {
    marginRight: 8
  },
  authTextInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.textPrimary
  },
  authPassToggle: {
    padding: 6
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    gap: 8
  },
  rememberText: {
    fontSize: 12,
    color: colors.textSecondary
  },
  authSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 13,
    borderRadius: 10,
    marginTop: 6
  },
  authSubmitBtnDisabled: {
    opacity: 0.7
  },
  authSubmitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800'
  },
  authSwitchBtn: {
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 6
  },
  authSwitchText: {
    fontSize: 12,
    color: colors.textSecondary
  },
  authSwitchLink: {
    color: colors.primary,
    fontWeight: '800'
  },
  authGuestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    backgroundColor: colors.inputBg
  },
  authGuestBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary
  },
  authOfflineHintBox: {
    marginTop: 14,
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border
  },
  authOfflineHintText: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
    textAlign: 'center'
  },
  profileContent: {
    padding: 16,
    paddingBottom: 40
  },
  guestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: colors.accentBorder,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    marginBottom: 12
  },
  guestBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1
  },
  guestBannerText: {
    fontSize: 11,
    color: colors.accentDark,
    fontWeight: '700',
    flex: 1
  },
  guestLoginBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6
  },
  guestLoginBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff'
  },
  profileHeaderCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
    position: 'relative'
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.primaryBorder,
    marginBottom: 10
  },
  avatarInitials: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.primary
  },
  profileHeaderInfo: {
    alignItems: 'center'
  },
  profileName: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.textPrimary,
    textAlign: 'center'
  },
  profileSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center'
  },
  profileTerritoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.primaryBorder
  },
  profileTerritoryText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary
  },
  headerLogoutBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.errorBg,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8
  },
  headerLogoutBtnText: {
    color: colors.error,
    fontSize: 11,
    fontWeight: '700'
  },
  headerLoginBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8
  },
  headerLoginBtnText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800'
  },
  profileSubTabsBar: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 3,
    marginBottom: 16
  },
  profileSubTabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8
  },
  profileSubTabActive: {
    backgroundColor: colors.cardBg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2
  },
  profileSubTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary
  },
  profileSubTabTextActive: {
    color: colors.primary,
    fontWeight: '900'
  },
  profileSaveAlertBox: {
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: colors.successBorder,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    alignItems: 'center'
  },
  profileSaveAlertText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center'
  },
  profileFormCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16
  },
  profileSectionHead: {
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle
  },
  profileSectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary
  },
  profileSectionSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2
  },
  formFieldInput: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: colors.textPrimary
  },
  formFieldInputPrefixBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12
  },
  formFieldPrefix: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginRight: 4
  },
  formFieldInputPrefixed: {
    flex: 1,
    paddingVertical: 9,
    fontSize: 13,
    color: colors.textPrimary
  },
  formFieldTextarea: {
    minHeight: 70,
    textAlignVertical: 'top'
  },
  territorySelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  territorySelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  territorySelectorValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary
  },
  territoryHelperText: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 14
  },
  btnSaveProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 6
  },
  btnSaveProfileText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800'
  },
  fullLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.errorBg,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 10
  },
  fullLogoutBtnText: {
    color: '#e11d48',
    fontSize: 13,
    fontWeight: '800'
  },
  profileObservationsCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16
  },
  profileObsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle
  },
  btnNuevaObsMini: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6
  },
  btnNuevaObsMiniText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800'
  },
  emptyObsBox: {
    padding: 24,
    alignItems: 'center'
  },
  emptyObsIcon: {
    fontSize: 32,
    marginBottom: 8
  },
  emptyObsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4
  },
  emptyObsSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16
  },
  obsItemsList: {
    gap: 10
  },
  obsItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border
  },
  obsThumbBox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    overflow: 'hidden'
  },
  obsThumbImg: {
    width: 44,
    height: 44
  },
  obsInfoBox: {
    flex: 1
  },
  obsSpeciesName: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary
  },
  obsLocationText: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2
  },
  obsDateText: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 2
  },
  obsStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12
  },
  statusSynced: {
    backgroundColor: colors.syncedBadge
  },
  statusPending: {
    backgroundColor: colors.pendingBadge
  },
  obsStatusBadgeText: {
    fontSize: 9,
    fontWeight: '800'
  },
  statusTextSynced: {
    color: colors.syncedText
  },
  statusTextPending: {
    color: colors.pendingText
  },
  medalsFullCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16
  },
  medalsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4
  },
  medalsCardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary
  },
  medalsCardSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 14
  },
  medalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  medalGridItem: {
    width: '48%',
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center'
  },
  medalGridItemLocked: {
    opacity: 0.6
  },
  medalGridIcon: {
    fontSize: 26,
    marginBottom: 4
  },
  medalGridTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 2
  },
  medalGridDesc: {
    fontSize: 9,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 12,
    marginBottom: 6
  },
  medalPointsTag: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8
  },
  medalPointsText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#b45309'
  },
  ecoImpactCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16
  },
  ecoImpactTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 12
  },
  ecoImpactRow: {
    flexDirection: 'row',
    gap: 10
  },
  ecoImpactItem: {
    flex: 1,
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border
  },
  ecoImpactNum: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.primary
  },
  ecoImpactLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 3,
    textAlign: 'center'
  },
  outboxAuthCard: {
    backgroundColor: colors.inputBg,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14
  },
  outboxAuthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4
  },
  outboxAuthTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary
  },
  outboxAuthDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
    marginBottom: 10
  },
  outboxLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.errorBg,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    paddingVertical: 8,
    borderRadius: 8
  },
  outboxLogoutBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.error
  },
  outboxLoginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    paddingVertical: 8,
    borderRadius: 8
  },
  outboxLoginBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary
  },
  outboxSectionCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16
  },
  outboxHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  outboxTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary
  },
  outboxSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2
  },
  syncTriggerBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8
  },
  syncTriggerBtnDisabled: {
    opacity: 0.6
  },
  syncTriggerBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800'
  },
  syncProgressContainer: {
    backgroundColor: colors.accentLight,
    padding: 8,
    borderRadius: 8,
    marginBottom: 10
  },
  syncProgressText: {
    fontSize: 11,
    color: colors.accentDark,
    textAlign: 'center',
    fontWeight: '600'
  },
  emptyOutboxBox: {
    padding: 16,
    alignItems: 'center'
  },
  emptyOutboxText: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center'
  },
  treeOutboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle
  },
  treeOutboxLeft: {
    flex: 1
  },
  treeOutboxName: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary
  },
  treeOutboxDetails: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1
  },
  treeStatusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10
  },
  treeStatusText: {
    fontSize: 9,
    fontWeight: '800'
  },
  settingsSectionCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16
  },
  settingsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 12
  }
});
