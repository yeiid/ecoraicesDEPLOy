/**
 * EcoRaíces Campo · Sistema de Medallas, Logros y Gamificación
 * Reconocimiento al esfuerzo biocultural de los guardabosques en La Guajira.
 */

export const RANGOS_GUARDABOSQUES = [
  { nivel: 1, titulo: 'Guardián Aprendiz', minPts: 0, maxPts: 99, color: '#64748b', icon: '🌱' },
  { nivel: 2, titulo: 'Centinela del Bosque Seco', minPts: 100, maxPts: 249, color: '#0284c7', icon: '🌿' },
  { nivel: 3, titulo: 'Custodio Biocultural', minPts: 250, maxPts: 499, color: '#16a34a', icon: '🌳' },
  { nivel: 4, titulo: 'Botánico de Territorio', minPts: 500, maxPts: 999, color: '#d97706', icon: '👑' },
  { nivel: 5, titulo: 'Cacique Mayor de La Guajira', minPts: 1000, maxPts: 99999, color: '#7c3aed', icon: '💎' }
];

export const MEDALLAS_SISTEMA = [
  {
    id: 'first_tree',
    title: 'Semilla Wayuu',
    icon: '🌱',
    category: 'Iniciación',
    points: 30,
    description: 'Registraste tu primer árbol en el sistema georreferenciado de La Guajira.',
    check: (stats) => (stats.totalTrees || 0) >= 1
  },
  {
    id: 'neem_hunter',
    title: 'Cazador de Neem',
    icon: '🚨',
    category: 'Control Invasor',
    points: 75,
    description: 'Georreferenciaste 3 o más árboles de Neem para el plan de sustitución ecológica.',
    check: (stats) => (stats.neemCount || 0) >= 3
  },
  {
    id: 'trupillo_protector',
    title: 'Guardián del Trupillo',
    icon: '🌳',
    category: 'Flora Nativa',
    points: 80,
    description: 'Censaste 5 o más árboles de Trupillo, protegiendo las reservas de nitrógeno del suelo.',
    check: (stats) => (stats.trupilloCount || 0) >= 5
  },
  {
    id: 'desert_explorer',
    title: 'Navegante del Desierto',
    icon: '🏜️',
    category: 'Exploración',
    points: 100,
    description: 'Registraste observaciones en al menos 2 municipios o corregimientos diferentes.',
    check: (stats) => (stats.uniqueMunicipalities || 0) >= 2
  },
  {
    id: 'precision_botanist',
    title: 'Ojo Satelital',
    icon: '🎯',
    category: 'Precisión',
    points: 60,
    description: 'Registraste árboles con precisión GNSS inferior a ±8 metros y medidas biométricas.',
    check: (stats) => (stats.measuredTrees || 0) >= 3
  },
  {
    id: 'sync_master',
    title: 'Sincronizador Fiel',
    icon: '⚡',
    category: 'Dokploy Cloud',
    points: 90,
    description: 'Subiste con éxito tus registros fuera de línea a la nube de Dokploy/FastAPI.',
    check: (stats) => (stats.syncedCount || 0) >= 5
  },
  {
    id: 'community_champion',
    title: 'Voz Comunitaria',
    icon: '👥',
    category: 'Social',
    points: 50,
    description: 'Te uniste a un colectivo de protección forestal en tu territorio.',
    check: (stats) => (stats.communitiesCount || 0) >= 1
  },
  {
    id: 'cacique_legend',
    title: 'Héroe de La Guajira',
    icon: '💎',
    category: 'Supremo',
    points: 200,
    description: 'Completaste más de 20 censos forestales en el territorio departamental.',
    check: (stats) => (stats.totalTrees || 0) >= 20
  }
];

export function calculateUserGamification(trees = [], communitiesCount = 1) {
  const totalTrees = trees.length;
  
  const neemCount = trees.filter((t) => {
    const n = ((t.species_name || t.name || '') + ' ' + (t.scientific_name || '')).toLowerCase();
    return n.includes('neem') || n.includes('nim') || n.includes('azadirachta');
  }).length;

  const trupilloCount = trees.filter((t) => {
    const n = ((t.species_name || t.name || '') + ' ' + (t.scientific_name || '')).toLowerCase();
    return n.includes('trupillo') || n.includes('prosopis');
  }).length;

  const uniqueMuniSet = new Set();
  trees.forEach((t) => {
    if (t.municipality || t.municipio) uniqueMuniSet.add(t.municipality || t.municipio);
  });
  const uniqueMunicipalities = uniqueMuniSet.size;

  const measuredTrees = trees.filter((t) => t.height_meters || t.diameter_cm).length;
  const syncedCount = trees.filter((t) => t.sync_status === 'SYNCED' || t.verified).length;

  const stats = {
    totalTrees,
    neemCount,
    trupilloCount,
    uniqueMunicipalities,
    measuredTrees,
    syncedCount,
    communitiesCount
  };

  // Evaluar cada medalla
  let earnedPoints = 50; // Puntos base de bienvenida
  const medalsWithStatus = MEDALLAS_SISTEMA.map((m) => {
    const unlocked = m.check(stats);
    if (unlocked) {
      earnedPoints += m.points;
    }
    return {
      ...m,
      unlocked
    };
  });

  // Determinar Rango
  let currentRank = RANGOS_GUARDABOSQUES[0];
  let nextRank = RANGOS_GUARDABOSQUES[1];

  for (let i = 0; i < RANGOS_GUARDABOSQUES.length; i++) {
    if (earnedPoints >= RANGOS_GUARDABOSQUES[i].minPts) {
      currentRank = RANGOS_GUARDABOSQUES[i];
      nextRank = RANGOS_GUARDABOSQUES[i + 1] || null;
    }
  }

  const progressToNext = nextRank
    ? Math.min(100, Math.round(((earnedPoints - currentRank.minPts) / (nextRank.minPts - currentRank.minPts)) * 100))
    : 100;

  // Impacto ambiental estimado
  const co2AbsorbedKg = Math.round(totalTrees * 21.5); // Promedio kg CO2/año por árbol
  const waterProtectedLitres = Math.round(trupilloCount * 450); // Litros de reserva freática

  return {
    stats,
    earnedPoints,
    currentRank,
    nextRank,
    progressToNext,
    medals: medalsWithStatus,
    unlockedCount: medalsWithStatus.filter((m) => m.unlocked).length,
    totalMedals: MEDALLAS_SISTEMA.length,
    environmentalImpact: {
      co2AbsorbedKg,
      waterProtectedLitres
    }
  };
}
