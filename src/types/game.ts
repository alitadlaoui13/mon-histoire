export type MapMode =
  | 'politique'
  | 'relations'
  | 'alliances'
  | 'economie'
  | 'militaire';

export type GamePhase = 'SELECT_NATION' | 'PLAYING';

export type AIPersonality =
  | 'Pragmatique'
  | 'Expansionniste'
  | 'Mercantile'
  | 'Pacifiste'
  | 'Hégémonique';

export type RegimeType =
  | 'République démocratique'
  | 'Monarchie constitutionnelle'
  | 'République fédérale'
  | 'État autoritaire'
  | 'République populaire'
  | 'Monarchie absolue'
  | 'Régime présidentiel';

export type RegionName =
  | 'Europe occidentale'
  | 'Europe orientale'
  | 'Amérique du Nord'
  | 'Amérique latine'
  | 'Afrique du Nord & Moyen-Orient'
  | 'Afrique subsaharienne'
  | 'Asie centrale & Sud'
  | 'Asie de l’Est & Pacifique';

export interface CountryPolicy {
  taxRate: number; // 10 to 50 (%)
  militaryBudget: number; // 5 to 45 (% of budget)
  infrastructureBudget: number; // 5 to 45 (% of budget)
  socialBudget: number; // 5 to 45 (% of budget)
  doctrine: 'Défensive' | 'Équilibrée' | 'Offensive';
}

export type ResourceType =
  | 'Énergie'
  | 'Industrie'
  | 'Agriculture'
  | 'Minerais'
  | 'Technologie';

export interface CountryResources {
  exportResource: ResourceType;
  importResource: ResourceType;
  tradePartners: string[];
}

export type FlagPattern =
  | 'vertical3'
  | 'horizontal3'
  | 'bicolorH'
  | 'bicolorV'
  | 'nordic'
  | 'diagonal'
  | 'canton'
  | 'circle';

export type FlagEmblem =
  | 'none'
  | 'star'
  | 'crown'
  | 'shield'
  | 'sun'
  | 'crescent'
  | 'laurel'
  | 'eagle'
  | 'globe';

export interface CountryFlagConfig {
  pattern: FlagPattern;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  emblem: FlagEmblem;
  customFlagImage?: string;
}

export interface CustomCountryConfig {
  nameFr: string;
  capital: string;
  territoryIds: string[];
  capitalCoords?: [number, number];
  color: string;
  flag: CountryFlagConfig;
  nationImage: string;
  leaderPortrait?: string;
  leaderTitle: string;
  leaderName: string;
  regime: RegimeType;
  personality: AIPersonality;
  gdp: number;
  treasury: number;
  population: number;
  army: number;
  stability: number;
  techLevel: number;
  exportResource: ResourceType;
  importResource: ResourceType;
  doctrine: 'Défensive' | 'Équilibrée' | 'Offensive';
  taxRate: number;
}

export interface CountryState {
  id: string; // ISO numeric string or fallback slug (e.g., '250', 'XKX')
  nameEn: string;
  nameFr: string;
  capital: string;
  region: RegionName;
  color: string;
  regime: RegimeType;
  personality: AIPersonality;
  leaderTitle: string;
  leaderName: string;
  flag?: CountryFlagConfig;
  nationImage?: string;
  leaderPortrait?: string;
  isCustom?: boolean;
  capitalCoords?: [number, number];

  // Core Simulation Metrics
  gdp: number; // Milliards USD (e.g., 3100)
  gdpGrowthMonthly: number; // % monthly
  treasury: number; // Milliards USD reserves
  monthlyBalance: number; // Net monthly income/deficit
  population: number; // Millions
  army: number; // Thousands of active soldiers/troops
  techLevel: number; // 1.0 to 3.0 multiplier
  stability: number; // 0 to 100
  approval: number; // 0 to 100
  warExhaustion: number; // 0 to 100

  // Geopolitical ownership (allows annexation/occupation of other country territories!)
  ownerId: string; // Initially equals id; changes when conquered!
  originalId: string;
  neighbors: string[]; // Adjacent land/maritime country IDs
  centroid: [number, number]; // SVG projected [x, y]

  policy: CountryPolicy;
  resources?: CountryResources;
  influence?: number;
}

export interface MapProject {
  id: string;
  label: string;
  kind: 'bridge' | 'trade' | 'alliance' | 'war' | 'nuclear' | 'infrastructure';
  fromCountryId: string;
  toCountryId?: string;
  dateLabel: string;
}

export interface DiplomaticThreadMessage {
  id: string;
  sender: 'player' | 'ai' | 'system';
  senderLabel: string;
  text: string;
  dateLabel: string;
}

export interface Alliance {
  id: string;
  name: string;
  type: 'ALLIANCE' | 'ECONOMIC_UNION';
  color: string;
  leaderId: string;
  memberIds: string[];
  foundedDate: string;
}

export interface TradeDeal {
  id: string;
  exporterId: string;
  importerId: string;
  resource: ResourceType;
  valueMds: number;
  signedDate: string;
}

export interface WarState {
  id: string;
  name: string;
  aggressorId: string;
  defenderId: string;
  aggressorAllies: string[];
  defenderAllies: string[];
  warScore: number; // -100 (defender winning) to +100 (aggressor winning)
  aggressorOccupation: number; // 0 to 100 (% of defender territory occupied)
  defenderOccupation: number; // 0 to 100 (% of aggressor territory occupied)
  battlesWonAggressor: number;
  battlesWonDefender: number;
  lastBattleSummary: string;
  offensiveBoostAggressor?: boolean;
  offensiveBoostDefender?: boolean;
  startDate: string;
  monthsDuration: number;
  casualtiesTotal: number; // thousands
}

export interface WarOutcome {
  warId: string;
  warName: string;
  winnerId: string;
  loserId: string;
  playerWon: boolean;
  reason: 'CAPITULATION' | 'VICTORY' | 'ARMISTICE';
  summary: string;
  warScore: number;
  monthsDuration: number;
  casualtiesTotal: number;
}

export interface WorldEvent {
  id: string;
  dateLabel: string;
  monthIndex: number;
  category:
    | 'GUERRE'
    | 'PAIX'
    | 'DIPLOMATIE'
    | 'ÉCONOMIE'
    | 'COMMERCE'
    | 'CRISE'
    | 'POLITIQUE';
  title: string;
  description: string;
  involvedCountryIds: string[];
}

export interface DiplomaticProposal {
  id: string;
  fromCountryId: string;
  type: 'ALLIANCE' | 'ECONOMIC_UNION' | 'NON_AGGRESSION' | 'PEACE' | 'ULTIMATUM';
  title: string;
  message: string;
  dateLabel: string;
}

export interface HistoricalSnapshot {
  monthIndex: number;
  dateLabel: string;
  playerGdp: number;
  playerTreasury: number;
  playerArmy: number;
  playerPopulation: number;
  playerStability: number;
  worldTotalGdp: number;
  activeWarsCount: number;
}

export interface CrisisEvent {
  title: string;
  description: string;
  optionALabel: string;
  optionATreasuryDelta: number;
  optionAStabilityDelta: number;
  optionAGdpPctDelta: number;
  optionBLabel: string;
  optionBTreasuryDelta: number;
  optionBStabilityDelta: number;
  optionBGdpPctDelta: number;
}

export interface WorldState {
  phase: GamePhase;
  playerCountryId: string | null;
  selectedCountryId: string | null;
  selectedTerritoryId?: string | null;
  monthIndex: number; // 0 = Novembre 2026
  year: number;
  month: number; // 1-12
  day?: number; // 1-30
  countries: Record<string, CountryState>;
  relations: Record<string, Record<string, number>>; // -100 to +100
  nonAggressionPacts: string[]; // sorted pair keys "idA|idB"
  alliances: Alliance[];
  tradeDeals?: TradeDeal[];
  wars: WarState[];
  events: WorldEvent[];
  proposals: DiplomaticProposal[];
  threads: Record<string, DiplomaticThreadMessage[]>;
  history: HistoricalSnapshot[];
  pendingCrisis: CrisisEvent | null;
  pendingWarOutcome?: WarOutcome | null;
  mapProjects?: MapProject[];
}

export interface SimulationSummary {
  startDateLabel: string;
  endDateLabel: string;
  startYear: number;
  endYear: number;
  monthsSimulated: number;
  playerBefore: {
    gdp: number;
    treasury: number;
    army: number;
    population: number;
    stability: number;
    territories: number;
  } | null;
  playerAfter: {
    gdp: number;
    treasury: number;
    army: number;
    population: number;
    stability: number;
    territories: number;
  } | null;
  playerWarOutcomes: WarOutcome[];
  ongoingPlayerWars: WarState[];
  territorialChanges: Array<{
    territoryId: string;
    territoryName: string;
    previousOwnerName: string;
    newOwnerName: string;
    involvesPlayer: boolean;
  }>;
  counts: {
    warsStarted: number;
    peacesSigned: number;
    alliancesEvents: number;
    tradeDealsSigned: number;
    politicalEvents: number;
    economicEvents: number;
  };
  highlights: WorldEvent[];
}

