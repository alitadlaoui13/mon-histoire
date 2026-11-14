import { geoGraticule10, geoNaturalEarth1, geoPath } from 'd3-geo';
import * as topojson from 'topojson-client';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import worldAtlas from 'world-atlas/countries-50m.json';
import { COUNTRY_SEEDS, FRENCH_COUNTRY_NAMES } from '../data/countriesData';
import {
  AIPersonality,
  Alliance,
  CountryState,
  RegionName,
  RegimeType,
  ResourceType,
  TradeDeal,
  WorldState,
} from '../types/game';

export interface MapFeature extends Feature<Geometry> {
  countryId: string;
  svgPath: string;
  area: number;
  labelPoint: [number, number];
}

const FALLBACK_ID_MAP: Record<string, string> = {
  'N. Cyprus': 'CYP_N',
  Somaliland: 'SOM_L',
  Kosovo: 'XKX',
};

const EXCLUDED_TERRITORIES = new Set([
  '010',
  '334',
  'Indian Ocean Ter.',
  'Siachen Glacier',
  'Heard I. and McDonald Is.',
]);

const PALETTE_POOL = [
  '#3A7CA5',
  '#4A8B6F',
  '#B05A4A',
  '#7D64A3',
  '#BA9138',
  '#358B94',
  '#9E4B6C',
  '#5A8A4B',
  '#5A6EA3',
  '#A87039',
  '#43859E',
  '#8C4F4A',
];

const FIRST_NAMES_BY_REGION: Record<RegionName, string[]> = {
  'Europe occidentale': ['Henri', 'Claire', 'Lucas', 'Sophie', 'Matteo', 'Elena', 'Erik', 'Anna'],
  'Europe orientale': ['Ivan', 'Katya', 'Marek', 'Zofia', 'Nikolai', 'Petra', 'Bogdan', 'Irina'],
  'Amérique du Nord': ['William', 'Sarah', 'Daniel', 'Emilie', 'Carlos', 'Maya'],
  'Amérique latine': ['Mateo', 'Sofia', 'Diego', 'Valentina', 'Gabriel', 'Isabella'],
  'Afrique du Nord & Moyen-Orient': ['Youssef', 'Leila', 'Omar', 'Nadia', 'Tariq', 'Salma'],
  'Afrique subsaharienne': ['Amadou', 'Fatou', 'Samuel', 'Amina', 'Jean-Baptiste', 'Grace'],
  'Asie centrale & Sud': ['Arjun', 'Priya', 'Timur', 'Aisha', 'Rohan', 'Zarina'],
  'Asie de l’Est & Pacifique': ['Kenji', 'Mei', 'Min-Ho', 'Linh', 'Budi', 'Sora'],
};

const LAST_NAMES_BY_REGION: Record<RegionName, string[]> = {
  'Europe occidentale': ['Laurent', 'Weber', 'Moreau', 'Rossi', 'Lindholm', 'Mercier'],
  'Europe orientale': ['Novak', 'Kovalenko', 'Petrov', 'Popescu', 'Horvat', 'Kuznetsov'],
  'Amérique du Nord': ['Miller', 'Bennett', 'Tremblay', 'Garza', 'Hayes'],
  'Amérique latine': ['Fernandez', 'Castillo', 'Herrera', 'Alvarez', 'Ribeiro'],
  'Afrique du Nord & Moyen-Orient': ['Mansour', 'Khoury', 'Haddad', 'Al-Rashid', 'Benali'],
  'Afrique subsaharienne': ['Diallo', 'Mensah', 'Okafor', 'Ndiaye', 'Kamara', 'Traore'],
  'Asie centrale & Sud': ['Sharma', 'Khan', 'Nazarov', 'Patel', 'Alimov'],
  'Asie de l’Est & Pacifique': ['Tanaka', 'Wang', 'Kim', 'Nguyen', 'Widodo', 'Park'],
};

const PERSONALITIES: AIPersonality[] = [
  'Pragmatique',
  'Mercantile',
  'Pacifiste',
  'Expansionniste',
  'Hégémonique',
];

const REGIMES: RegimeType[] = [
  'République démocratique',
  'Régime présidentiel',
  'République fédérale',
  'Monarchie constitutionnelle',
  'État autoritaire',
];

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export const MAP_WIDTH = 1200;
export const MAP_HEIGHT = 600;

let cachedFeatures: MapFeature[] | null = null;
let cachedNeighborMap: Record<string, string[]> | null = null;
let cachedCentroids: Record<string, [number, number]> | null = null;
let cachedSpherePath = '';
let cachedGraticulePath = '';

export function generateLeaderName(region: RegionName, seedNum: number): string {
  const firstNames = FIRST_NAMES_BY_REGION[region];
  const lastNames = LAST_NAMES_BY_REGION[region];
  return `${firstNames[Math.abs(seedNum) % firstNames.length]} ${
    lastNames[Math.abs(seedNum >> 3) % lastNames.length]
  }`;
}

const RESOURCE_POOL: ResourceType[] = [
  'Énergie',
  'Industrie',
  'Agriculture',
  'Minerais',
  'Technologie',
];

function assignResources(
  region: RegionName,
  gdp: number,
  h: number
): { exportResource: ResourceType; importResource: ResourceType } {
  let exportResource: ResourceType;
  if (region === 'Afrique du Nord & Moyen-Orient') {
    exportResource = h % 3 === 0 ? 'Agriculture' : 'Énergie';
  } else if (region === 'Europe occidentale' || region === 'Amérique du Nord') {
    exportResource = gdp > 900 ? 'Technologie' : 'Industrie';
  } else if (region === 'Asie de l’Est & Pacifique') {
    exportResource = gdp > 600 ? 'Technologie' : 'Industrie';
  } else if (region === 'Afrique subsaharienne') {
    exportResource = h % 2 === 0 ? 'Minerais' : 'Agriculture';
  } else if (region === 'Amérique latine') {
    exportResource = h % 2 === 0 ? 'Agriculture' : 'Minerais';
  } else {
    exportResource = RESOURCE_POOL[h % RESOURCE_POOL.length];
  }
  const importCandidates = RESOURCE_POOL.filter((r) => r !== exportResource);
  const importResource = importCandidates[(h >> 2) % importCandidates.length];
  return { exportResource, importResource };
}

export function getMapData(): {
  features: MapFeature[];
  neighborMap: Record<string, string[]>;
  centroids: Record<string, [number, number]>;
  spherePath: string;
  graticulePath: string;
} {
  if (cachedFeatures && cachedNeighborMap && cachedCentroids) {
    return {
      features: cachedFeatures,
      neighborMap: cachedNeighborMap,
      centroids: cachedCentroids,
      spherePath: cachedSpherePath,
      graticulePath: cachedGraticulePath,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const topology = worldAtlas as any;
  const geo = topojson.feature(
    topology,
    topology.objects.countries
  ) as unknown as FeatureCollection<Geometry>;

  const resolveFeatureId = (f: Feature<Geometry>): string => {
    const rawName = (f.properties as { name?: string })?.name ?? 'Territory';
    if (f.id !== null && f.id !== undefined) return String(f.id);
    return FALLBACK_ID_MAP[rawName] ?? rawName;
  };

  // Filter out Antarctica & uninhabited rocks
  const filteredFeatures = geo.features.filter((f) => !EXCLUDED_TERRITORIES.has(resolveFeatureId(f)));

  const projection = geoNaturalEarth1().fitExtent(
    [
      [18, 18],
      [MAP_WIDTH - 18, MAP_HEIGHT - 18],
    ],
    {
      type: 'FeatureCollection',
      features: filteredFeatures,
    }
  );

  const pathGen = geoPath(projection);
  cachedSpherePath = pathGen({ type: 'Sphere' }) || '';
  cachedGraticulePath = pathGen(geoGraticule10()) || '';

  // Compute land adjacency via topojson.neighbors on full geometry list
  const rawGeoms = topology.objects.countries.geometries as Array<{
    id?: string | number | null;
    properties?: { name?: string };
  }>;
  const rawIds = rawGeoms.map((g) => {
    if (g.id !== null && g.id !== undefined) return String(g.id);
    const nm = g.properties?.name ?? 'UNKNOWN';
    return FALLBACK_ID_MAP[nm] ?? nm;
  });

  const neighborIndices = topojson.neighbors(topology.objects.countries.geometries);
  const neighborMap: Record<string, string[]> = {};
  rawIds.forEach((cid, idx) => {
    if (EXCLUDED_TERRITORIES.has(cid)) return;
    neighborMap[cid] = (neighborIndices[idx] || [])
      .map((nIdx) => rawIds[nIdx])
      .filter((nid) => nid && !EXCLUDED_TERRITORIES.has(nid) && nid !== cid);
  });

  const centroids: Record<string, [number, number]> = {};
  const features: MapFeature[] = [];

  for (const feat of filteredFeatures) {
    const cid = resolveFeatureId(feat);
    const svgPath = pathGen(feat) || '';
    const area = Math.max(0.25, pathGen.area(feat) || 0.25);

    // Compute centroid on the largest polygon ring so countries like France, USA, Russia, Indonesia get accurate mainland labels
    let labelTarget: Feature<Geometry> = feat;
    if (feat.geometry && feat.geometry.type === 'MultiPolygon') {
      let maxRingArea = -1;
      for (const coords of feat.geometry.coordinates) {
        const singlePoly: Feature<Geometry> = {
          type: 'Feature',
          properties: {},
          geometry: { type: 'Polygon', coordinates: coords },
        };
        const polyArea = pathGen.area(singlePoly) || 0;
        if (polyArea > maxRingArea) {
          maxRingArea = polyArea;
          labelTarget = singlePoly;
        }
      }
    }

    const c = pathGen.centroid(labelTarget);
    const centroid: [number, number] =
      Number.isFinite(c[0]) && Number.isFinite(c[1]) ? [c[0], c[1]] : [MAP_WIDTH / 2, MAP_HEIGHT / 2];

    centroids[cid] = centroid;
    features.push({
      ...feat,
      countryId: cid,
      svgPath,
      area,
      labelPoint: centroid,
    });
  }

  cachedFeatures = features;
  cachedNeighborMap = neighborMap;
  cachedCentroids = centroids;

  return {
    features,
    neighborMap,
    centroids,
    spherePath: cachedSpherePath,
    graticulePath: cachedGraticulePath,
  };
}

export function createInitialWorldState(): WorldState {
  const { features, neighborMap, centroids } = getMapData();
  const countries: Record<string, CountryState> = {};

  for (const feat of features) {
    const cid = feat.countryId;
    const rawName = (feat.properties as { name?: string })?.name ?? cid;
    const seed = COUNTRY_SEEDS[cid];
    const frInfo = FRENCH_COUNTRY_NAMES[cid];
    const h = hashString(cid + rawName);

    const region: RegionName = seed?.region ?? frInfo?.region ?? 'Afrique subsaharienne';
    const nameFr = seed?.nameFr ?? frInfo?.nameFr ?? rawName;
    const capital = seed?.capital ?? frInfo?.capital ?? nameFr;
    const gdp = seed?.gdp ?? frInfo?.gdp ?? Math.max(2, (h % 45) + 3);
    const pop = seed?.pop ?? frInfo?.pop ?? Math.max(0.4, Number((((h % 250) + 5) / 10).toFixed(1)));
    const army =
      seed?.army ??
      Math.max(2, Math.round(pop * 2.2 + Math.sqrt(gdp) * 1.6));

    const firstNames = FIRST_NAMES_BY_REGION[region];
    const lastNames = LAST_NAMES_BY_REGION[region];
    const leaderName =
      seed?.leaderName ??
      `${firstNames[h % firstNames.length]} ${lastNames[(h >> 3) % lastNames.length]}`;
    const regime = seed?.regime ?? REGIMES[h % REGIMES.length];
    const personality = seed?.personality ?? PERSONALITIES[(h >> 2) % PERSONALITIES.length];
    const leaderTitle =
      seed?.leaderTitle ??
      (regime === 'Monarchie constitutionnelle' || regime === 'Monarchie absolue'
        ? 'Souverain'
        : 'Président');

    const color = seed?.color ?? PALETTE_POOL[h % PALETTE_POOL.length];
    const treasury = Math.max(2, Math.round(gdp * 0.14));
    const stability = seed ? 62 + (h % 24) : 55 + (h % 25);

    const resInfo = assignResources(region, gdp, h);

    countries[cid] = {
      id: cid,
      nameEn: rawName,
      nameFr,
      capital,
      region,
      color,
      regime,
      personality,
      leaderTitle,
      leaderName,
      gdp,
      gdpGrowthMonthly: 0.18 + (h % 15) * 0.015,
      treasury,
      monthlyBalance: Number((gdp * 0.012).toFixed(2)),
      population: pop,
      army,
      techLevel: Number((1.0 + Math.min(1.4, Math.log10(gdp + 10) * 0.3)).toFixed(2)),
      stability,
      approval: Math.min(92, stability + 4),
      warExhaustion: 0,
      ownerId: cid,
      originalId: cid,
      neighbors: neighborMap[cid] || [],
      centroid: centroids[cid] || [MAP_WIDTH / 2, MAP_HEIGHT / 2],
      policy: {
        taxRate: 26,
        militaryBudget: personality === 'Expansionniste' || personality === 'Hégémonique' ? 28 : 18,
        infrastructureBudget: 24,
        socialBudget: 20,
        doctrine:
          personality === 'Expansionniste'
            ? 'Offensive'
            : personality === 'Pacifiste'
              ? 'Défensive'
              : 'Équilibrée',
      },
      resources: {
        exportResource: resInfo.exportResource,
        importResource: resInfo.importResource,
        tradePartners: [],
      },
    };
  }

  // Initialize starting diplomatic relations
  const relations: Record<string, Record<string, number>> = {};
  const ids = Object.keys(countries);
  for (const a of ids) {
    relations[a] = {};
  }

  for (let i = 0; i < ids.length; i++) {
    const a = ids[i];
    for (let j = i + 1; j < ids.length; j++) {
      const b = ids[j];
      let base = 0;
      if (countries[a].region === countries[b].region) base += 14;
      if (countries[a].regime === countries[b].regime) base += 10;
      if (
        (countries[a].personality === 'Expansionniste' || countries[b].personality === 'Expansionniste') &&
        countries[a].neighbors.includes(b)
      ) {
        base -= 22;
      }
      const jitter = (hashString(a + b) % 21) - 10;
      const score = Math.max(-85, Math.min(85, base + jitter));
      relations[a][b] = score;
      relations[b][a] = score;
    }
  }

  // Specific historical rivalries & friendships for realism
  const setRel = (a: string, b: string, val: number) => {
    if (relations[a] && relations[b]) {
      relations[a][b] = val;
      relations[b][a] = val;
    }
  };

  setRel('250', '276', 78); // France - Allemagne
  setRel('250', '826', 68); // France - Royaume-Uni
  setRel('250', '840', 65); // France - USA
  setRel('250', '380', 72); // France - Italie
  setRel('250', '724', 76); // France - Espagne
  setRel('840', '124', 82); // USA - Canada
  setRel('840', '826', 84); // USA - UK
  setRel('840', '392', 78); // USA - Japon
  setRel('840', '410', 76); // USA - Corée du Sud
  setRel('840', '156', -32); // USA - Chine
  setRel('840', '643', -68); // USA - Russie
  setRel('643', '804', -95); // Russie - Ukraine
  setRel('643', '112', 78); // Russie - Biélorussie
  setRel('643', '156', 54); // Russie - Chine
  setRel('156', '158', -72); // Chine - Taïwan
  setRel('408', '410', -88); // Corée du Nord - Corée du Sud
  setRel('356', '586', -58); // Inde - Pakistan
  setRel('376', '364', -86); // Israël - Iran
  setRel('250', '643', -48); // France - Russie
  setRel('616', '643', -72); // Pologne - Russie
  setRel('616', '804', 74); // Pologne - Ukraine

  // Starting Alliances & Economic Unions
  const alliances: Alliance[] = [
    {
      id: 'eu-union',
      name: 'Union Européenne',
      type: 'ECONOMIC_UNION',
      color: '#3B82F6',
      leaderId: '250',
      memberIds: [
        '250', '276', '380', '724', '620', '056', '528', '040', '442', '372',
        '208', '752', '246', '300', '616', '642', '203', '348', '703', '100',
        '191', '705', '440', '428', '233', '196',
      ].filter((id) => countries[id]),
      foundedDate: 'Novembre 1993',
    },
    {
      id: 'nato-pact',
      name: 'Pacte Atlantique',
      type: 'ALLIANCE',
      color: '#60A5FA',
      leaderId: '840',
      memberIds: [
        '840', '124', '826', '250', '276', '380', '724', '620', '056', '528',
        '578', '208', '752', '246', '352', '300', '616', '642', '203', '703',
        '100', '191', '705', '440', '428', '233', '792', '008', '499', '807',
      ].filter((id) => countries[id]),
      foundedDate: 'Avril 1949',
    },
    {
      id: 'mercosur-union',
      name: 'Marché du Sud (Mercosur)',
      type: 'ECONOMIC_UNION',
      color: '#10B981',
      leaderId: '076',
      memberIds: ['076', '032', '858', '600', '068'].filter((id) => countries[id]),
      foundedDate: 'Mars 1991',
    },
    {
      id: 'asean-union',
      name: 'Union de l’Asie du Sud-Est',
      type: 'ECONOMIC_UNION',
      color: '#F59E0B',
      leaderId: '360',
      memberIds: ['360', '764', '704', '458', '608', '116', '418', '096'].filter((id) => countries[id]),
      foundedDate: 'Août 1967',
    },
    {
      id: 'eurasia-pact',
      name: 'Pacte d’Eurasie',
      type: 'ALLIANCE',
      color: '#EF4444',
      leaderId: '643',
      memberIds: ['643', '112', '398', '051', '417', '762'].filter((id) => countries[id]),
      foundedDate: 'Mai 1992',
    },
  ];

  // Boost relations among alliance members
  for (const al of alliances) {
    for (let i = 0; i < al.memberIds.length; i++) {
      for (let j = i + 1; j < al.memberIds.length; j++) {
        const a = al.memberIds[i];
        const b = al.memberIds[j];
        if (relations[a]?.[b] !== undefined) {
          const boost = al.type === 'ALLIANCE' ? 68 : 54;
          const next = Math.max(relations[a][b], boost);
          relations[a][b] = next;
          relations[b][a] = next;
        }
      }
    }
  }

  const initialTradeDeals: TradeDeal[] = [
    {
      id: 'td-init-1',
      exporterId: '276',
      importerId: '250',
      resource: 'Industrie',
      valueMds: 18,
      signedDate: 'Novembre 2026',
    },
    {
      id: 'td-init-2',
      exporterId: '682',
      importerId: '156',
      resource: 'Énergie',
      valueMds: 24,
      signedDate: 'Novembre 2026',
    },
    {
      id: 'td-init-3',
      exporterId: '840',
      importerId: '826',
      resource: 'Technologie',
      valueMds: 21,
      signedDate: 'Novembre 2026',
    },
    {
      id: 'td-init-4',
      exporterId: '076',
      importerId: '724',
      resource: 'Agriculture',
      valueMds: 9,
      signedDate: 'Novembre 2026',
    },
  ];

  return {
    phase: 'SELECT_NATION',
    playerCountryId: null,
    selectedCountryId: '250', // France previewed by default
    selectedTerritoryId: '250',
    monthIndex: 0,
    year: 2026,
    month: 11,
    countries,
    relations,
    nonAggressionPacts: [],
    alliances,
    tradeDeals: initialTradeDeals,
    wars: [
      {
        id: 'war-rus-ukr-init',
        name: 'Conflit d’Europe orientale',
        aggressorId: '643',
        defenderId: '804',
        aggressorAllies: [],
        defenderAllies: [],
        warScore: 14,
        aggressorOccupation: 22,
        defenderOccupation: 3,
        battlesWonAggressor: 9,
        battlesWonDefender: 6,
        lastBattleSummary: 'Front actif à l’est · Combats d’attrition en cours.',
        startDate: 'Février 2022',
        monthsDuration: 14,
        casualtiesTotal: 420,
      },
    ],
    events: [
      {
        id: 'evt-init-1',
        dateLabel: 'Novembre 2026',
        monthIndex: 0,
        category: 'DIPLOMATIE',
        title: 'Ouverture d’un nouveau cycle diplomatique mondial',
        description:
          'Les grandes puissances et les coalitions régionales réévaluent leurs alliances économiques et sécuritaires pour la décennie à venir.',
        involvedCountryIds: ['250', '840', '156', '643'],
      },
      {
        id: 'evt-init-2',
        dateLabel: 'Novembre 2026',
        monthIndex: 0,
        category: 'GUERRE',
        title: 'Tensions persistantes en Europe orientale',
        description:
          'Les lignes de front entre la Russie et l’Ukraine demeurent actives alors que les chancelleries cherchent une issue stratégique.',
        involvedCountryIds: ['643', '804'],
      },
    ],
    proposals: [],
    threads: {},
    history: [],
    pendingCrisis: null,
    pendingWarOutcome: null,
  };
}
