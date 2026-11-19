/**
 * EcoRaíces Mobile · Geocodificación Inversa desde GPS
 * Determina el municipio y departamento real del usuario a partir de sus coordenadas GPS
 * (usa geocoder nativo en Android/iOS con respaldo OpenStreetMap Nominatim para Web/fallback).
 */

import { Platform } from 'react-native';
import * as Location from 'expo-location';

let lastResolved = null;

function approxDistanceMeters(lat1, lng1, lat2, lng2) {
  const dLat = (lat2 - lat1) * 111320;
  const dLng = (lng2 - lng1) * 111320 * Math.cos((lat1 * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

function formatLocationResult(municipio, region, latitude, longitude) {
  const cleanMuni = (municipio || '').trim();
  const cleanRegion = (region || '').trim();
  if (cleanMuni && cleanRegion && cleanMuni.toLowerCase() !== cleanRegion.toLowerCase()) {
    return {
      municipio: cleanMuni,
      region: cleanRegion,
      label: `${cleanMuni}, ${cleanRegion}`,
      shortLabel: cleanMuni,
      latitude,
      longitude,
      isCoordsFallback: false
    };
  }
  if (cleanMuni || cleanRegion) {
    const single = cleanMuni || cleanRegion;
    return {
      municipio: single,
      region: cleanRegion || single,
      label: single,
      shortLabel: single,
      latitude,
      longitude,
      isCoordsFallback: false
    };
  }
  const coordsLabel = `${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)}`;
  return {
    municipio: '',
    region: '',
    label: coordsLabel,
    shortLabel: coordsLabel,
    latitude,
    longitude,
    isCoordsFallback: true
  };
}

/**
 * Resuelve municipio/ciudad y región a partir de coordenadas GPS.
 * Reutiliza caché en memoria si el usuario se ha movido menos de 250 metros.
 */
export async function resolveLocationFromCoords(latitude, longitude, forceRefresh = false) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  if (
    !forceRefresh &&
    lastResolved &&
    !lastResolved.isCoordsFallback &&
    approxDistanceMeters(lastResolved.latitude, lastResolved.longitude, lat, lng) < 250
  ) {
    return lastResolved;
  }

  // 1. En Android/iOS intentar primero el geocodificador nativo del sistema operativo
  if (Platform.OS !== 'web') {
    try {
      const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (Array.isArray(results) && results.length > 0) {
        const place = results[0];
        const municipio =
          place.city ||
          place.subregion ||
          place.district ||
          place.name ||
          '';
        const region = place.region || place.country || '';
        const formatted = formatLocationResult(municipio, region, lat, lng);
        if (!formatted.isCoordsFallback) {
          lastResolved = formatted;
          return formatted;
        }
      }
    } catch (_) {
      // Continuar con respaldo Nominatim
    }
  }

  // 2. Web o fallback cuando el geocoder nativo no devuelve ciudad: Nominatim (OpenStreetMap)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
      lat
    )}&lon=${encodeURIComponent(lng)}&zoom=12&accept-language=es`;

    const res = await fetch(url, {
      headers: {
        Accept: 'application/json'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const addr = data?.address || {};
      const municipio =
        addr.city ||
        addr.town ||
        addr.village ||
        addr.municipality ||
        addr.county ||
        addr.suburb ||
        '';
      const region = addr.state || addr.region || addr.country || '';
      const formatted = formatLocationResult(municipio, region, lat, lng);
      if (!formatted.isCoordsFallback) {
        lastResolved = formatted;
        return formatted;
      }
    }
  } catch (_) {
    // Sin conexión o timeout: usar coordenadas
  }

  return formatLocationResult('', '', lat, lng);
}
