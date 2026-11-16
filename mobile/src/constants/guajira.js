/**
 * EcoRaíces Campo · Constantes y Presets Territoriales de La Guajira
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
  { name: 'Trupillo', scientific: 'Prosopis juliflora', icon: '🌳', tag: 'Bosque Seco' },
  { name: 'Melocactus (Buche de agua)', scientific: 'Melocactus curvispinus', icon: '🌵', tag: 'Xerofítico' },
  { name: 'Neem', scientific: 'Azadirachta indica', icon: '🌿', tag: 'Adaptado' },
  { name: 'Guayacán de Bola', scientific: 'Bulnesia arborea', icon: '🌼', tag: 'Protegido' },
  { name: 'Dividivi', scientific: 'Caesalpinia coriaria', icon: '🌱', tag: 'Emblemático' },
  { name: 'Cardón Guajiro', scientific: 'Stenocereus griseus', icon: '🌵', tag: 'Xerofítico' },
  { name: 'Ceiba Bonga', scientific: 'Ceiba pentandra', icon: '🌳', tag: 'Bosque Seco' },
  { name: 'Olleto', scientific: 'Lecythis ampla', icon: '🍃', tag: 'Nativo' },
  { name: 'Palo de Brasil', scientific: 'Haematoxylum brasiletto', icon: '🪵', tag: 'Maderable' },
  { name: 'Cañaguate', scientific: 'Handroanthus chrysanthus', icon: '🌸', tag: 'Floración' },
  { name: 'Carreto', scientific: 'Aspidosperma polyneuron', icon: '🌲', tag: 'Vulnerable' },
  { name: 'Aromo', scientific: 'Vachellia farnesiana', icon: '🌿', tag: 'Arbustivo' }
];

export const ESTADOS_FITOSANITARIOS = [
  { id: 'Sano y vigoroso', label: '🌳 Sano', color: '#16a34a' },
  { id: 'Con floración o frutos', label: '🌸 Flores / Frutos', color: '#db2777' },
  { id: 'Dañado o talado', label: '🪓 Dañado / Mutilado', color: '#ea580c' },
  { id: 'Seco o con plaga', label: '🍂 Seco / Enfermo', color: '#dc2626' }
];
