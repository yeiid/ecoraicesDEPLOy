/**
 * EcoRaíces Mobile · Sistema de Diseño Centralizado
 */

import colors from './colors';

export { colors };

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32
};

export const radius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 10,
  xl: 14,
  full: 9999
};

export const typography = {
  titleLarge: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary
  },
  titleMedium: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary
  },
  titleSmall: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary
  },
  body: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18
  },
  caption: {
    fontSize: 11,
    color: colors.textMuted
  }
};

export const shadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2
  },
  header: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  bottomBar: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 4
  }
};

export default {
  colors,
  spacing,
  radius,
  typography,
  shadows
};
