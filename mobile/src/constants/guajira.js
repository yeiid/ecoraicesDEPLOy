/**
 * EcoRaíces Campo · Constantes, Especies Nativas y Comunidades de La Guajira
 */

export const DEFAULT_API_BASE_URL = 'https://ecoraices.neuraljira.tech';

export const GUAJIRA_MUNICIPIOS = [
  'Riohacha',
  'Dibulla',
  'Manaure',
  'Maicao',
  'Uribia',
  'San Juan del Cesar',
  'Fonseca',
  'Barrancas',
  'Albania',
  'Hatonuevo',
  'Villanueva',
  'Distracción',
  'Cabo de la Vela',
  'Nazareth (Macuira)',
  'Bahía Honda',
  'Mayapo'
];

export const GUAJIRA_ESPECIES_NATIVAS = [
  {
    id: 'trupillo',
    name: 'Trupillo',
    scientific: 'Prosopis juliflora',
    family: 'Fabaceae',
    icon: '🌳',
    tag: 'Nativa • Bosque Seco',
    category: 'Maderables y Silvestres',
    photo: 'https://ecoraices.neuraljira.tech/guajira-paisaje.webp',
    status: 'Seguro / Resiliente',
    isInvasive: false,
    botanicalDescription: 'Árbol xerófilo de copa parasolada que fija nitrógeno atmosférico en los suelos áridos de La Guajira. Posee raíces pivotantes profundas que alcanzan capas freáticas subterráneas.',
    ecologicalValue: 'Protección contra la erosión eólica y refugio microclimático para la fauna desértica.',
    medicinalUses: 'Las vainas forrajeras se usan tradicionalmente para elaborar chicha nutritiva y alimento animal de alta proteína.',
    sightingsCount: 38
  },
  {
    id: 'melocactus',
    name: 'Melocactus (Buche de agua)',
    scientific: 'Melocactus curvispinus',
    family: 'Cactaceae',
    icon: '🌵',
    tag: 'Endémica • Xerofítica',
    category: 'Ornamentales y Medicinales',
    photo: 'https://ecoraices.neuraljira.tech/guajira-flora.webp',
    status: 'Vulnerable',
    isInvasive: false,
    botanicalDescription: 'Cactus globular coronado por un cefalio lanoso rojizo donde nacen pequeñas flores rosadas. Reserva hídrica biológica vital del desierto.',
    ecologicalValue: 'Fuente crucial de polen y néctar para murciélagos e insectos polinizadores nocturnos.',
    medicinalUses: 'Tradición Wayuu para hidratación de emergencia y emplastos refrescantes contra quemaduras solares.',
    sightingsCount: 19
  },
  {
    id: 'neem',
    name: 'Neem Guajiro',
    scientific: 'Azadirachta indica',
    family: 'Meliaceae',
    icon: '🚨',
    tag: 'Invasor • Monitoreo',
    category: 'Invasoras / Monitoreo',
    photo: 'https://ecoraices.neuraljira.tech/guajira-banner.webp',
    status: 'Invasora de Alto Impacto',
    isInvasive: true,
    botanicalDescription: 'Árbol introducido de rápido crecimiento que segrega azadiractina y compuestos alelopáticos mediante su follaje, impidiendo la regeneración de la flora nativa circundante.',
    ecologicalValue: 'Riesgo biológico en ecosistemas secos por sobreconsumo de agua freática y desplazamiento de especies autóctonas.',
    medicinalUses: 'Pesticida orgánico e infusión contra parásitos, pero se requiere control de su expansión silvestre.',
    sightingsCount: 42
  },
  {
    id: 'dividivi',
    name: 'Dividivi (Libidibia)',
    scientific: 'Libidibia coriaria',
    family: 'Fabaceae',
    icon: '🌱',
    tag: 'Emblemático • Wayuu',
    category: 'Ornamentales y Medicinales',
    photo: 'https://ecoraices.neuraljira.tech/guajira-flora.webp',
    status: 'Patrimonio Cultural',
    isInvasive: false,
    botanicalDescription: 'Árbol de porte mediano y copa moldeada por los vientos alisios guajiros. Produce vainas curvas ricas en taninos de alto valor curativo.',
    ecologicalValue: 'Fijador de suelos salinos y barrera natural cortavientos en zonas costeras.',
    medicinalUses: 'Uso ancestral en gárgaras contra amigdalitis, cicatrización y tintura natural de mantas Wayuu.',
    sightingsCount: 27
  },
  {
    id: 'guayacan',
    name: 'Guayacán de Bola',
    scientific: 'Bulnesia arborea',
    family: 'Zygophyllaceae',
    icon: '🌼',
    tag: 'Protegido • Bosque Seco',
    category: 'Árboles Maderables',
    photo: 'https://ecoraices.neuraljira.tech/guajira-paisaje.webp',
    status: 'En Peligro (EN)',
    isInvasive: false,
    botanicalDescription: 'Especie maderable noble con flores amarillas intensas que florecen tras las lluvias efímeras de octubre y noviembre en La Guajira.',
    ecologicalValue: 'Atracción masiva de abejas nativas solitarias y estabilización del dosel forestal.',
    medicinalUses: 'Resinas balsámicas para ungüentos osteomusculares tradicionales.',
    sightingsCount: 14
  },
  {
    id: 'cardon',
    name: 'Cardón Guajiro (Yotojolo)',
    scientific: 'Stenocereus griseus',
    family: 'Cactaceae',
    icon: '🌵',
    tag: 'Xerofítico • Arquitectura',
    category: 'Frutales y Silvestres',
    photo: 'https://ecoraices.neuraljira.tech/guajira-flora.webp',
    status: 'Seguro',
    isInvasive: false,
    botanicalDescription: 'Cactus columnar de hasta 9 metros de altura. Produce el fruto comestible conocido como iguaraya. Su tronco seco (yotojolo) es la madera tradicional de las enramadas Wayuu.',
    ecologicalValue: 'Pilar trófico del desierto para aves migratorias y murciélagos nectarívoros.',
    medicinalUses: 'Fruto altamente antioxidante y reconstituyente vitamínico.',
    sightingsCount: 51
  }
];

export const GUAJIRA_COMUNIDADES = [
  {
    id: 'eco-riohacha',
    name: 'Guardianes Forestales de Riohacha',
    municipality: 'Riohacha',
    territory: 'Comuna 10 y Río Ranchería',
    membersCount: 48,
    treesRegistered: 126,
    banner: 'https://ecoraices.neuraljira.tech/guajira-banner.webp',
    description: 'Comunidad urbana y periurbana dedicada a la restauración de la cuenca baja del Río Ranchería y control del Neem en parques públicos.',
    leader: 'Yelfran David Hernández',
    tags: ['Restauración', 'Río Ranchería', 'Control Neem']
  },
  {
    id: 'custodios-dibulla',
    name: 'Custodios del Bosque Seco Dibulla',
    municipality: 'Dibulla',
    territory: 'Piedemonte Sierra Nevada / Costero',
    membersCount: 32,
    treesRegistered: 84,
    banner: 'https://ecoraices.neuraljira.tech/guajira-paisaje.webp',
    description: 'Monitoreo de corredores biológicos entre el mar Caribe y los bosques secos de la Sierra Nevada de Santa Marta.',
    leader: 'Rosa María Ipuana',
    tags: ['Bosque Seco', 'Corredores', 'Guayacán']
  },
  {
    id: 'macuira-nazareth',
    name: 'Vigías Verdes de la Macuira',
    municipality: 'Nazareth (Macuira)',
    territory: 'Serranía de la Macuira y Alta Guajira',
    membersCount: 65,
    treesRegistered: 190,
    banner: 'https://ecoraices.neuraljira.tech/guajira-flora.webp',
    description: 'Protección del oasis biológico nublado en medio del desierto guajiro en articulación con las autoridades tradicionales Wayuu.',
    leader: 'Aura Pushaina',
    tags: ['Alta Guajira', 'Oasis de Niebla', 'Wayuu']
  },
  {
    id: 'manaure-sal',
    name: 'Red Semillas de Sal Manaure',
    municipality: 'Manaure',
    territory: 'Zonas salinas y borde costero',
    membersCount: 29,
    treesRegistered: 55,
    banner: 'https://ecoraices.neuraljira.tech/guajira-paisaje.webp',
    description: 'Reforestación con especies halófitas nativas (Dividivi, Trupillo) para frenar la desertificación de los salares.',
    leader: 'Camilo Uriana',
    tags: ['Halófitas', 'Dividivi', 'Salar']
  }
];

export const ESTADOS_FITOSANITARIOS = [
  { id: 'Sano y vigoroso', label: '🌳 Sano', color: '#16a34a' },
  { id: 'Con floración o frutos', label: '🌸 Flores / Frutos', color: '#db2777' },
  { id: 'Dañado o talado', label: '🪓 Dañado / Mutilado', color: '#ea580c' },
  { id: 'Seco o con plaga', label: '🍂 Seco / Enfermo', color: '#dc2626' }
];

export const CONOCE_ECORAICES = {
  mision: 'Empoderar a comunidades locales, recolectores y científicos de La Guajira mediante tecnología offline-first para monitorear, proteger y regenerar la biodiversidad del Bosque Seco Tropical.',
  vision: 'Ser la plataforma líder de ciencia ciudadana y bio-monitoreo satelital del norte de Sudamérica, uniendo saberes ancestrales Wayuu con cartografía 3D de alta precisión.',
  bosqueSeco: {
    titulo: 'El Tesoro del Bosque Seco Tropical',
    descripcion: 'Uno de los ecosistemas más amenazados de Colombia y el planeta. En La Guajira, especies como el Trupillo, Dividivi y Melocactus resisten meses sin agua gracias a adaptaciones milenarias.',
    puntos: [
      'Menos del 8% de su cobertura original sobrevive en Colombia.',
      'Suelo con alta capacidad de fijación de carbono orgánico.',
      'Refugio de aves migratorias transcontinentales.'
    ]
  },
  pilares: [
    { icon: '📡', title: '100% Offline-First', desc: 'Funciona en campo sin señal satelital durante semanas completas.' },
    { icon: '🧊', title: 'Mapas 3D Vectoriales', desc: 'Edificaciones e isometría GPU para contextualizar la vegetación.' },
    { icon: '🌱', title: 'Soberanía Botánica', desc: 'Control consciente del Neem invasor y siembra de flora nativa.' }
  ]
};
