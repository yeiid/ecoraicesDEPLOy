// Lista curada de especies nativas de La Guajira y el Caribe colombiano
// Se usa como semilla del catálogo enriquecido desde GBIF (seed-catalog.mjs).
// Cada entrada: { scientificName, commonName, category, habitat }
// category debe coincidir con una Category existente (o se crea).

export const CATEGORIES = [
  { name: 'Árboles Maderables', description: 'Especies aprovechadas por su madera' },
  { name: 'Árboles Frutales y Silvestres', description: 'Especies con frutos comestibles o de vida silvestre' },
  { name: 'Árboles Ornamentales y Medicinales', description: 'Especies de uso ornamental y medicinal' },
];

export const NATIVE_SPECIES = [
  // ---- Especies ya existentes en la BD ----
  { scientificName: 'Ceiba pentandra', commonName: 'Ceiba Bonga', category: 'Árboles Maderables' },
  { scientificName: 'Bulnesia arborea', commonName: 'Guayacán', category: 'Árboles Maderables' },
  { scientificName: 'Prosopis juliflora', commonName: 'Cují Yaque', category: 'Árboles Frutales y Silvestres' },
  { scientificName: 'Anacardium excelsum', commonName: 'Caracolí', category: 'Árboles Maderables' },
  { scientificName: 'Haematoxylum brasiletto', commonName: 'Palo de Brasil', category: 'Árboles Ornamentales y Medicinales' },

  // ---- Árboles maderables del Caribe ----
  { scientificName: 'Cavanillesia platanifolia', commonName: 'Puy', category: 'Árboles Maderables' },
  { scientificName: 'Guaiacum officinale', commonName: 'Guayacán real', category: 'Árboles Maderables' },
  { scientificName: 'Guaiacum sanctum', commonName: 'Guayacán de costa', category: 'Árboles Maderables' },
  { scientificName: 'Handroanthus chrysanthus', commonName: 'Roble amarillo', category: 'Árboles Maderables' },
  { scientificName: 'Handroanthus billbergii', commonName: 'Guayacán amarillo', category: 'Árboles Maderables' },
  { scientificName: 'Tabebuia rosea', commonName: 'Guayacán rosado', category: 'Árboles Maderables' },
  { scientificName: 'Hymenaea courbaril', commonName: 'Algarrobo', category: 'Árboles Maderables' },
  { scientificName: 'Caesalpinia coriaria', commonName: 'Dividivi', category: 'Árboles Maderables' },
  { scientificName: 'Swietenia macrophylla', commonName: 'Caoba', category: 'Árboles Maderables' },
  { scientificName: 'Cedrela odorata', commonName: 'Cedro', category: 'Árboles Maderables' },
  { scientificName: 'Cordia alliodora', commonName: 'Nogal cafetero', category: 'Árboles Maderables' },
  { scientificName: 'Cordia gerascanthus', commonName: 'Guácimo de barranco', category: 'Árboles Maderables' },
  { scientificName: 'Astronium graveolens', commonName: 'Zunzún', category: 'Árboles Maderables' },
  { scientificName: 'Simarouba glauca', commonName: 'Aceituno', category: 'Árboles Maderables' },
  { scientificName: 'Pseudobombax septenatum', commonName: 'Bonga', category: 'Árboles Maderables' },
  { scientificName: 'Pachira quinata', commonName: 'Pochote', category: 'Árboles Maderables' },
  { scientificName: 'Sterculia apetala', commonName: 'Camajón', category: 'Árboles Maderables' },
  { scientificName: 'Chloroleucon mangense', commonName: 'Trupillo', category: 'Árboles Maderables' },
  { scientificName: 'Lysiloma bahamense', commonName: 'Bayahonda blanca', category: 'Árboles Maderables' },

  // ---- Frutales y silvestres ----
  { scientificName: 'Bursera simaruba', commonName: 'Indio desnudo', category: 'Árboles Frutales y Silvestres' },
  { scientificName: 'Parkinsonia aculeata', commonName: 'Chivato', category: 'Árboles Frutales y Silvestres' },
  { scientificName: 'Pithecellobium dulce', commonName: 'Guamúchil', category: 'Árboles Frutales y Silvestres' },
  { scientificName: 'Crescentia cujete', commonName: 'Totumo', category: 'Árboles Frutales y Silvestres' },
  { scientificName: 'Crateva tapia', commonName: 'Naranjuelo', category: 'Árboles Frutales y Silvestres' },
  { scientificName: 'Capparis odoratissima', commonName: 'Mostreñé', category: 'Árboles Frutales y Silvestres' },
  { scientificName: 'Pereskia guamacho', commonName: 'Guamacho', category: 'Árboles Frutales y Silvestres' },
  { scientificName: 'Stenocereus griseus', commonName: 'Cardón de lefaria', category: 'Árboles Frutales y Silvestres' },
  { scientificName: 'Melocactus curvispinus', commonName: 'Melón de monte', category: 'Árboles Frutales y Silvestres' },
  { scientificName: 'Opuntia elatior', commonName: 'Tuna', category: 'Árboles Frutales y Silvestres' },
  { scientificName: 'Prosopis pallida', commonName: 'Algarrobo americano', category: 'Árboles Frutales y Silvestres' },
  { scientificName: 'Anacardium occidentale', commonName: 'Merey', category: 'Árboles Frutales y Silvestres' },
  { scientificName: 'Talisia olivaeformis', commonName: 'Zapote', category: 'Árboles Frutales y Silvestres' },
  { scientificName: 'Melicoccus bijugatus', commonName: 'Mamón', category: 'Árboles Frutales y Silvestres' },
  { scientificName: 'Psidium guajava', commonName: 'Guayabo', category: 'Árboles Frutales y Silvestres' },
  { scientificName: 'Annona squamosa', commonName: 'Anón', category: 'Árboles Frutales y Silvestres' },
  { scientificName: 'Annona muricata', commonName: 'Guanábana', category: 'Árboles Frutales y Silvestres' },
  { scientificName: 'Manilkara zapota', commonName: 'Níspero', category: 'Árboles Frutales y Silvestres' },
  { scientificName: 'Chrysophyllum cainito', commonName: 'Caimito', category: 'Árboles Frutales y Silvestres' },
  { scientificName: 'Mammea americana', commonName: 'Mamey', category: 'Árboles Frutales y Silvestres' },
  { scientificName: 'Coccoloba uvifera', commonName: 'Uva de playa', category: 'Árboles Frutales y Silvestres' },
  { scientificName: 'Tamarindus indica', commonName: 'Tamarindo', category: 'Árboles Frutales y Silvestres' },
  { scientificName: 'Erythrina fusca', commonName: 'Búcaro', category: 'Árboles Frutales y Silvestres' },

  // ---- Manglares y vegetación de playa ----
  { scientificName: 'Conocarpus erectus', commonName: 'Mangle botón', category: 'Árboles Frutales y Silvestres' },
  { scientificName: 'Rhizophora mangle', commonName: 'Mangle rojo', category: 'Árboles Frutales y Silvestres' },
  { scientificName: 'Avicennia germinans', commonName: 'Mangle negro', category: 'Árboles Frutales y Silvestres' },
  { scientificName: 'Laguncularia racemosa', commonName: 'Mangle blanco', category: 'Árboles Frutales y Silvestres' },
  { scientificName: 'Thespesia populnea', commonName: 'Emajagua de playa', category: 'Árboles Frutales y Silvestres' },
  { scientificName: 'Ipomoea pes-caprae', commonName: 'Batatilla de playa', category: 'Árboles Frutales y Silvestres' },

  // ---- Ornamentales y medicinales ----
  { scientificName: 'Cordia sebestena', commonName: 'Vomitó', category: 'Árboles Ornamentales y Medicinales' },
  { scientificName: 'Plumeria obtusa', commonName: 'Candelero', category: 'Árboles Ornamentales y Medicinales' },
  { scientificName: 'Thevetia peruviana', commonName: 'Cabalonga', category: 'Árboles Ornamentales y Medicinales' },
  { scientificName: 'Jatropha curcas', commonName: 'Piñón de tempate', category: 'Árboles Ornamentales y Medicinales' },
  { scientificName: 'Moringa oleifera', commonName: 'Moringa', category: 'Árboles Ornamentales y Medicinales' },
  { scientificName: 'Aloe vera', commonName: 'Sábila', category: 'Árboles Ornamentales y Medicinales' },
  { scientificName: 'Gliricidia sepium', commonName: 'Matarratón', category: 'Árboles Ornamentales y Medicinales' },
  { scientificName: 'Senna siamea', commonName: 'Acacia amarilla', category: 'Árboles Ornamentales y Medicinales' },
  { scientificName: 'Terminalia catappa', commonName: 'Almendro de playa', category: 'Árboles Ornamentales y Medicinales' },
  { scientificName: 'Guazuma ulmifolia', commonName: 'Guácimo', category: 'Árboles Ornamentales y Medicinales' },
  { scientificName: 'Morinda citrifolia', commonName: 'Noni', category: 'Árboles Ornamentales y Medicinales' },
  { scientificName: 'Bauhinia aculeata', commonName: 'Pata de vaca', category: 'Árboles Ornamentales y Medicinales' },
  { scientificName: 'Kalanchoe daigremontiana', commonName: 'Madre perla', category: 'Árboles Ornamentales y Medicinales' },
  { scientificName: 'Sansevieria trifasciata', commonName: 'Espada de San Jorge', category: 'Árboles Ornamentales y Medicinales' },
];
