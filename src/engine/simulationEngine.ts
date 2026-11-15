import {
  Alliance,
  CountryPolicy,
  CountryState,
  CustomCountryConfig,
  DiplomaticProposal,
  HistoricalSnapshot,
  SimulationSummary,
  TradeDeal,
  WarOutcome,
  WarState,
  WorldEvent,
  WorldState,
} from '../types/game';
import { generateLeaderName } from './worldInit';

const MONTHS_FR = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

export function formatDateFr(year: number, month: number): string {
  return `${MONTHS_FR[(month - 1) % 12]} ${year}`;
}

export function formatFullDateFr(year: number, month: number, day = 1): string {
  const safeDay = Math.max(1, Math.min(30, Math.round(day)));
  return `${safeDay} ${MONTHS_FR[(month - 1) % 12]} ${year}`;
}

export function advanceDays(state: WorldState, days: number): WorldState {
  if (state.phase !== 'PLAYING' || days <= 0) return state;
  let current = state;
  let totalDay = (state.day ?? 1) + Math.round(days);

  while (totalDay > 30) {
    totalDay -= 30;
    current = advanceMonth(current);
    if (current.pendingCrisis || current.pendingWarOutcome) {
      break;
    }
  }

  return {
    ...current,
    day: Math.max(1, Math.min(30, totalDay)),
  };
}

export function advanceMonths(state: WorldState, months: number): WorldState {
  if (state.phase !== 'PLAYING' || months <= 0) return state;
  let current = state;
  for (let i = 0; i < months; i++) {
    if (current.pendingCrisis || current.pendingWarOutcome) break;
    current = advanceMonth(current);
  }
  return {
    ...current,
    day: state.day ?? 1,
  };
}

export function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function getRelation(state: WorldState, a: string, b: string): number {
  if (a === b) return 100;
  return state.relations[a]?.[b] ?? 0;
}

export function setRelation(
  relations: Record<string, Record<string, number>>,
  a: string,
  b: string,
  value: number
) {
  const clamped = Math.max(-100, Math.min(100, Math.round(value)));
  if (!relations[a]) relations[a] = {};
  if (!relations[b]) relations[b] = {};
  relations[a][b] = clamped;
  relations[b][a] = clamped;
}

export function getRelationStatusFr(score: number, isAtWar: boolean): {
  label: string;
  tone: 'emerald' | 'sky' | 'slate' | 'amber' | 'rose';
} {
  if (isAtWar) return { label: 'En guerre', tone: 'rose' };
  if (score >= 65) return { label: 'Allié fidèle', tone: 'emerald' };
  if (score >= 30) return { label: 'Cordial', tone: 'sky' };
  if (score >= -15) return { label: 'Neutre', tone: 'slate' };
  if (score >= -55) return { label: 'Tendu', tone: 'amber' };
  return { label: 'Hostile', tone: 'rose' };
}

export function isAtWarBetween(state: WorldState, a: string, b: string): WarState | undefined {
  return state.wars.find((w) => {
    const aggSide = [w.aggressorId, ...w.aggressorAllies];
    const defSide = [w.defenderId, ...w.defenderAllies];
    return (
      (aggSide.includes(a) && defSide.includes(b)) ||
      (aggSide.includes(b) && defSide.includes(a))
    );
  });
}

export function sharesAlliance(
  alliances: Alliance[],
  a: string,
  b: string,
  type?: 'ALLIANCE' | 'ECONOMIC_UNION'
): Alliance | undefined {
  return alliances.find(
    (al) =>
      (!type || al.type === type) &&
      al.memberIds.includes(a) &&
      al.memberIds.includes(b)
  );
}

export function getCountryTotalStats(state: WorldState, ownerId: string) {
  const owned = Object.values(state.countries).filter((c) => c.ownerId === ownerId);
  const capitalCountry = state.countries[ownerId];
  if (!capitalCountry) {
    return { territories: 0, totalGdp: 0, totalPop: 0 };
  }
  // Core country already holds its primary stats; conquered territories add 45% of their GDP/pop yield
  let bonusGdp = 0;
  let bonusPop = 0;
  for (const prov of owned) {
    if (prov.id !== ownerId) {
      bonusGdp += prov.gdp * 0.45;
      bonusPop += prov.population * 0.45;
    }
  }
  return {
    territories: owned.length,
    totalGdp: Math.round(capitalCountry.gdp + bonusGdp),
    totalPop: Number((capitalCountry.population + bonusPop).toFixed(1)),
  };
}

export function createSnapshot(state: WorldState): HistoricalSnapshot {
  const player = state.playerCountryId ? state.countries[state.playerCountryId] : null;
  const worldTotalGdp = Object.values(state.countries).reduce((acc, c) => acc + c.gdp, 0);
  return {
    monthIndex: state.monthIndex,
    dateLabel: formatDateFr(state.year, state.month),
    playerGdp: player ? Math.round(player.gdp) : 0,
    playerTreasury: player ? Number(player.treasury.toFixed(1)) : 0,
    playerArmy: player ? Math.round(player.army) : 0,
    playerPopulation: player ? Number(player.population.toFixed(1)) : 0,
    playerStability: player ? Math.round(player.stability) : 0,
    worldTotalGdp: Math.round(worldTotalGdp),
    activeWarsCount: state.wars.length,
  };
}

// Start game with chosen country
export function startGameWithCountry(state: WorldState, countryId: string): WorldState {
  const next: WorldState = {
    ...state,
    phase: 'PLAYING',
    playerCountryId: countryId,
    selectedCountryId: countryId,
    selectedTerritoryId: countryId,
  };
  next.history = [createSnapshot(next)];
  return next;
}

// Start game with a newly created custom country
export function startGameWithCustomCountry(
  state: WorldState,
  config: CustomCountryConfig
): WorldState {
  const uniqueIds = Array.from(new Set(config.territoryIds)).filter((id) => state.countries[id]);
  const territoryIds = uniqueIds.length > 0 ? uniqueIds : ['250'];
  const anchorId = territoryIds[0];
  const baseAnchor = state.countries[anchorId];
  const territorySet = new Set(territoryIds);

  const nextCountries: Record<string, CountryState> = { ...state.countries };

  // Compute combined external neighbors across all claimed territories
  const combinedNeighbors = new Set<string>();
  for (const tid of territoryIds) {
    const tc = state.countries[tid];
    if (!tc) continue;
    for (const nid of tc.neighbors) {
      if (!territorySet.has(nid) && nextCountries[nid]) {
        combinedNeighbors.add(nid);
      }
    }
  }

  // Ensure neighbor symmetry points to anchorId
  for (const nid of combinedNeighbors) {
    const nc = nextCountries[nid];
    if (nc && !nc.neighbors.includes(anchorId)) {
      nextCountries[nid] = {
        ...nc,
        neighbors: [...nc.neighbors, anchorId],
      };
    }
  }

  const cleanName = config.nameFr.trim() || 'Nouvelle République';
  const cleanCapital = config.capital.trim() || baseAnchor.capital;
  const cleanLeaderName = config.leaderName.trim() || baseAnchor.leaderName;
  const cleanLeaderTitle = config.leaderTitle.trim() || 'Président';

  const gdp = Math.max(5, Number(config.gdp.toFixed(1)));
  const treasury = Math.max(2, Number(config.treasury.toFixed(1)));
  const population = Math.max(0.5, Number(config.population.toFixed(1)));
  const army = Math.max(5, Math.round(config.army));
  const stability = Math.max(15, Math.min(100, Math.round(config.stability)));
  const techLevel = Math.max(1.0, Math.min(3.0, Number(config.techLevel.toFixed(2))));

  const militaryBudget =
    config.doctrine === 'Offensive' ? 30 : config.doctrine === 'Défensive' ? 16 : 22;

  nextCountries[anchorId] = {
    ...baseAnchor,
    nameFr: cleanName,
    nameEn: cleanName,
    capital: cleanCapital,
    color: config.color,
    flag: config.flag,
    nationImage: config.nationImage,
    leaderPortrait: config.leaderPortrait,
    isCustom: true,
    capitalCoords: config.capitalCoords,
    regime: config.regime,
    personality: config.personality,
    leaderTitle: cleanLeaderTitle,
    leaderName: cleanLeaderName,
    gdp,
    gdpGrowthMonthly: Number((0.22 + (techLevel - 1) * 0.08).toFixed(3)),
    treasury,
    monthlyBalance: Number((gdp * 0.014).toFixed(2)),
    population,
    army,
    techLevel,
    stability,
    approval: Math.min(95, stability + 5),
    warExhaustion: 0,
    ownerId: anchorId,
    neighbors: Array.from(combinedNeighbors),
    policy: {
      taxRate: Math.max(10, Math.min(50, Math.round(config.taxRate))),
      militaryBudget,
      infrastructureBudget: 24,
      socialBudget: 20,
      doctrine: config.doctrine,
    },
    resources: {
      exportResource: config.exportResource,
      importResource: config.importResource,
      tradePartners: [],
    },
  };

  // Assign any extra selected territories to the custom nation
  for (const extraId of territoryIds.slice(1)) {
    const extra = nextCountries[extraId];
    if (extra) {
      nextCountries[extraId] = {
        ...extra,
        ownerId: anchorId,
      };
    }
  }

  // Clean pre-existing alliances, wars, and trade deals involving replaced territory IDs
  const nextAlliances = state.alliances
    .map((al) => ({
      ...al,
      memberIds: al.memberIds.filter((id) => !territorySet.has(id)),
      leaderId: territorySet.has(al.leaderId)
        ? al.memberIds.find((id) => !territorySet.has(id)) || al.leaderId
        : al.leaderId,
    }))
    .filter((al) => al.memberIds.length >= 2);

  const nextWars = state.wars.filter(
    (w) => !territorySet.has(w.aggressorId) && !territorySet.has(w.defenderId)
  );

  const nextTradeDeals = (state.tradeDeals ?? []).filter(
    (td) => !territorySet.has(td.exporterId) && !territorySet.has(td.importerId)
  );

  // Initialize fresh diplomatic relations for the newly founded nation
  const nextRelations: Record<string, Record<string, number>> = { ...state.relations };
  nextRelations[anchorId] = { ...(nextRelations[anchorId] || {}) };
  for (const otherId of Object.keys(nextCountries)) {
    if (otherId === anchorId) continue;
    const other = nextCountries[otherId];
    let rel = 0;
    if (other.region === baseAnchor.region) rel += 12;
    if (other.regime === config.regime) rel += 10;
    if (combinedNeighbors.has(otherId) && config.personality === 'Expansionniste') rel -= 10;
    setRelation(nextRelations, anchorId, otherId, rel);
  }

  const birthEvent: WorldEvent = {
    id: `evt-custom-birth-${Date.now()}`,
    dateLabel: formatDateFr(state.year, state.month),
    monthIndex: state.monthIndex,
    category: 'POLITIQUE',
    title: `Fondation de ${cleanName}`,
    description: `${cleanLeaderTitle} ${cleanLeaderName} proclame la souveraineté de ${cleanName} depuis sa capitale ${cleanCapital} (${territoryIds.length} ${territoryIds.length > 1 ? 'territoires unifiés' : 'territoire'}).`,
    involvedCountryIds: [anchorId],
  };

  const next: WorldState = {
    ...state,
    phase: 'PLAYING',
    playerCountryId: anchorId,
    selectedCountryId: anchorId,
    selectedTerritoryId: anchorId,
    countries: nextCountries,
    relations: nextRelations,
    alliances: nextAlliances,
    wars: nextWars,
    tradeDeals: nextTradeDeals,
    events: [birthEvent, ...state.events].slice(0, 80),
  };
  next.history = [createSnapshot(next)];
  return next;
}

// Player National Governance Actions
export function updatePlayerPolicy(state: WorldState, policy: Partial<CountryPolicy>): WorldState {
  if (!state.playerCountryId) return state;
  const c = state.countries[state.playerCountryId];
  if (!c) return state;

  return {
    ...state,
    countries: {
      ...state.countries,
      [c.id]: {
        ...c,
        policy: {
          ...c.policy,
          ...policy,
        },
      },
    },
  };
}

export function recruitPlayerTroops(state: WorldState, troopsK: number): {
  nextState: WorldState;
  error?: string;
} {
  if (!state.playerCountryId) return { nextState: state, error: 'Aucun pays actif.' };
  const c = state.countries[state.playerCountryId];
  const cost = Number((troopsK * 0.25).toFixed(1)); // 0.25 Md $ per 1k soldiers
  if (c.treasury < cost) {
    return {
      nextState: state,
      error: `Trésor insuffisant (${cost} Mds $ requis, ${c.treasury.toFixed(1)} Mds $ disponibles).`,
    };
  }
  const maxManpower = c.population * 35; // up to 3.5% active mobilization
  if (c.army + troopsK > maxManpower) {
    return {
      nextState: state,
      error: `Capacité démographique maximale atteinte (${Math.round(maxManpower)}k soldats max).`,
    };
  }

  return {
    nextState: {
      ...state,
      countries: {
        ...state.countries,
        [c.id]: {
          ...c,
          treasury: Number((c.treasury - cost).toFixed(2)),
          army: Math.round(c.army + troopsK),
        },
      },
    },
  };
}

export function enactNationalDirective(
  state: WorldState,
  directive: 'INFRASTRUCTURE' | 'COHESION' | 'RECHERCHE'
): { nextState: WorldState; error?: string } {
  if (!state.playerCountryId) return { nextState: state };
  const c = state.countries[state.playerCountryId];
  const cost = Math.max(4, Number((c.gdp * 0.015).toFixed(1)));
  if (c.treasury < cost) {
    return {
      nextState: state,
      error: `Trésor insuffisant (${cost} Mds $ requis).`,
    };
  }

  let updated = { ...c, treasury: Number((c.treasury - cost).toFixed(2)) };
  let eventTitle = '';
  let eventDesc = '';

  if (directive === 'INFRASTRUCTURE') {
    updated.gdp = Number((c.gdp * 1.022).toFixed(1));
    updated.gdpGrowthMonthly = Number((c.gdpGrowthMonthly + 0.04).toFixed(3));
    eventTitle = `Plan d’investissement industriel en ${c.nameFr}`;
    eventDesc = `${c.nameFr} lance un grand programme d’infrastructures, stimulant immédiatement son PIB (+2,2 %).`;
  } else if (directive === 'COHESION') {
    updated.stability = Math.min(100, c.stability + 8);
    updated.approval = Math.min(100, c.approval + 9);
    updated.warExhaustion = Math.max(0, c.warExhaustion - 6);
    eventTitle = `Pacte de cohésion nationale en ${c.nameFr}`;
    eventDesc = `Les mesures sociales renforcent la stabilité intérieure de ${c.nameFr} (+8 pts).`;
  } else {
    updated.techLevel = Number(Math.min(3.0, c.techLevel + 0.08).toFixed(2));
    eventTitle = `Percée scientifique et militaire en ${c.nameFr}`;
    eventDesc = `L’effort de recherche porte la doctrine technologique de ${c.nameFr} à l’indice ${updated.techLevel}.`;
  }

  const dateLabel = formatDateFr(state.year, state.month);
  const newEvent: WorldEvent = {
    id: `evt-dir-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    dateLabel,
    monthIndex: state.monthIndex,
    category: 'POLITIQUE',
    title: eventTitle,
    description: eventDesc,
    involvedCountryIds: [c.id],
  };

  return {
    nextState: {
      ...state,
      countries: { ...state.countries, [c.id]: updated },
      events: [newEvent, ...state.events].slice(0, 80),
    },
  };
}

export function getMilitaryPowerIndex(
  country: CountryState,
  isDefender = false,
  offensiveBoost = false
): number {
  const gdpFactor = 1 + Math.log10(1 + country.gdp / 80) * 0.75;
  const techFactor = Math.pow(country.techLevel, 1.4);
  const moraleFactor = Math.max(
    0.45,
    Math.min(1.2, 0.72 + country.stability / 250 - country.warExhaustion / 260)
  );
  let doctrineFactor = 1.0;
  if (!isDefender && country.policy.doctrine === 'Offensive') doctrineFactor = 1.16;
  if (isDefender && country.policy.doctrine === 'Défensive') doctrineFactor = 1.18;
  if (offensiveBoost) doctrineFactor *= 1.25;

  return Math.max(
    1,
    Math.round(country.army * techFactor * gdpFactor * moraleFactor * doctrineFactor)
  );
}

export function launchMajorOffensive(
  state: WorldState,
  warId: string
): { nextState: WorldState; error?: string } {
  if (!state.playerCountryId) return { nextState: state, error: 'Aucun pays actif.' };
  const player = state.countries[state.playerCountryId];
  const war = state.wars.find((w) => w.id === warId);
  if (!player || !war) return { nextState: state, error: 'Conflit introuvable.' };

  const cost = Math.max(4, Number((player.gdp * 0.01).toFixed(1)));
  if (player.treasury < cost) {
    return {
      nextState: state,
      error: `Trésor insuffisant (${cost} Mds $ requis pour lancer une offensive).`,
    };
  }

  const isAggSide =
    war.aggressorId === player.id || war.aggressorAllies.includes(player.id);
  if ((isAggSide && war.offensiveBoostAggressor) || (!isAggSide && war.offensiveBoostDefender)) {
    return {
      nextState: state,
      error: 'Une offensive majeure est déjà ordonnée pour ce mois.',
    };
  }

  return {
    nextState: {
      ...state,
      countries: {
        ...state.countries,
        [player.id]: {
          ...player,
          treasury: Number((player.treasury - cost).toFixed(2)),
        },
      },
      wars: state.wars.map((w) =>
        w.id === warId
          ? {
              ...w,
              offensiveBoostAggressor: isAggSide ? true : w.offensiveBoostAggressor,
              offensiveBoostDefender: !isAggSide ? true : w.offensiveBoostDefender,
            }
          : w
      ),
    },
  };
}

export function declareWarBetween(
  state: WorldState,
  aggressorId: string,
  defenderId: string
): WorldState {
  if (aggressorId === defenderId) return state;
  if (isAtWarBetween(state, aggressorId, defenderId)) return state;

  const agg = state.countries[aggressorId];
  const def = state.countries[defenderId];
  if (!agg || !def) return state;

  // Gather military allies
  const aggressorAllies: string[] = [];
  const defenderAllies: string[] = [];

  for (const al of state.alliances) {
    if (al.type !== 'ALLIANCE') continue;
    if (al.memberIds.includes(defenderId) && !al.memberIds.includes(aggressorId)) {
      for (const m of al.memberIds) {
        if (m !== defenderId && m !== aggressorId && !defenderAllies.includes(m)) {
          // Allies with positive relation join defense
          if ((state.relations[m]?.[defenderId] ?? 0) >= 25) {
            defenderAllies.push(m);
          }
        }
      }
    }
    if (al.memberIds.includes(aggressorId) && !al.memberIds.includes(defenderId)) {
      for (const m of al.memberIds) {
        if (
          m !== aggressorId &&
          m !== defenderId &&
          !defenderAllies.includes(m) &&
          !aggressorAllies.includes(m) &&
          (state.relations[m]?.[aggressorId] ?? 0) >= 50
        ) {
          aggressorAllies.push(m);
        }
      }
    }
  }

  const relations = { ...state.relations };
  setRelation(relations, aggressorId, defenderId, -95);
  for (const da of defenderAllies) {
    setRelation(relations, aggressorId, da, -80);
  }

  // Remove aggressor from any shared economic union with defender
  const updatedAlliances = state.alliances.map((al) => {
    if (al.memberIds.includes(aggressorId) && al.memberIds.includes(defenderId)) {
      return { ...al, memberIds: al.memberIds.filter((id) => id !== aggressorId) };
    }
    return al;
  });

  // Cancel any trade deals between belligerents
  const enemyIds = new Set([defenderId, ...defenderAllies]);
  const updatedTradeDeals = (state.tradeDeals ?? []).filter(
    (td) =>
      !(
        (td.exporterId === aggressorId && enemyIds.has(td.importerId)) ||
        (td.importerId === aggressorId && enemyIds.has(td.exporterId))
      )
  );

  // World reactions: neighbors & major powers condemn unprovoked aggression
  for (const neighborId of def.neighbors) {
    if (neighborId !== aggressorId && relations[neighborId]) {
      const cur = relations[neighborId][aggressorId] ?? 0;
      setRelation(relations, neighborId, aggressorId, cur - 14);
    }
  }

  const dateLabel = formatDateFr(state.year, state.month);
  const war: WarState = {
    id: `war-${aggressorId}-${defenderId}-${state.monthIndex}`,
    name: `Guerre ${agg.nameFr} – ${def.nameFr}`,
    aggressorId,
    defenderId,
    aggressorAllies,
    defenderAllies,
    warScore: 0,
    aggressorOccupation: 0,
    defenderOccupation: 0,
    battlesWonAggressor: 0,
    battlesWonDefender: 0,
    lastBattleSummary: 'Mobilisation générale et ouverture du front.',
    startDate: dateLabel,
    monthsDuration: 0,
    casualtiesTotal: 0,
  };

  const alliesNote =
    defenderAllies.length > 0
      ? ` ${defenderAllies.length} allié(s) entrent en guerre aux côtés de ${def.nameFr}.`
      : '';

  const evt: WorldEvent = {
    id: `evt-war-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    dateLabel,
    monthIndex: state.monthIndex,
    category: 'GUERRE',
    title: `${agg.nameFr} déclare la guerre à ${def.nameFr}`,
    description: `Les forces armées de ${agg.nameFr} ont lancé une offensive contre ${def.nameFr}.${alliesNote}`,
    involvedCountryIds: [aggressorId, defenderId],
  };

  return {
    ...state,
    relations,
    alliances: updatedAlliances,
    tradeDeals: updatedTradeDeals,
    wars: [war, ...state.wars],
    events: [evt, ...state.events].slice(0, 140),
  };
}

export function resolvePeaceTreaty(
  state: WorldState,
  warId: string,
  terms: 'STATUS_QUO' | 'REPARATIONS' | 'ANNEXATION' | 'CAPITULATION',
  forcedWinnerId?: string
): WorldState {
  const war = state.wars.find((w) => w.id === warId);
  if (!war) return state;

  const countries = { ...state.countries };
  const relations = { ...state.relations };
  const agg = countries[war.aggressorId];
  const def = countries[war.defenderId];
  if (!agg || !def) return state;

  const winnerId =
    forcedWinnerId ?? (war.warScore >= 0 ? war.aggressorId : war.defenderId);
  const loserId = winnerId === war.aggressorId ? war.defenderId : war.aggressorId;
  const winner = countries[winnerId];
  const loser = countries[loserId];

  let peaceDesc = `Un traité de paix blanc met fin au conflit entre ${agg.nameFr} et ${def.nameFr}.`;
  let outcomeReason: 'CAPITULATION' | 'VICTORY' | 'ARMISTICE' = 'ARMISTICE';

  if (terms === 'CAPITULATION') {
    outcomeReason = 'CAPITULATION';
    const indemnity = Math.min(Math.max(0, loser.treasury * 0.75), Math.max(8, loser.gdp * 0.12));
    countries[winnerId] = {
      ...winner,
      treasury: Number((winner.treasury + indemnity).toFixed(1)),
      stability: Math.min(100, winner.stability + 6),
      warExhaustion: Math.max(0, winner.warExhaustion - 25),
    };

    const loserProvinces = Object.values(countries).filter((p) => p.ownerId === loserId);
    if (loserId === state.playerCountryId) {
      // If player capitulates: lose peripheral provinces if any, pay heavy reparations, keep capital playable
      const peripheral = loserProvinces.filter((p) => p.id !== loserId);
      for (const prov of peripheral) {
        countries[prov.id] = { ...prov, ownerId: winnerId };
      }
      countries[loserId] = {
        ...loser,
        treasury: Number(Math.max(0, loser.treasury - indemnity).toFixed(1)),
        army: Math.max(5, Math.round(loser.army * 0.25)),
        stability: Math.max(25, loser.stability - 12),
        warExhaustion: 0,
      };
      peaceDesc = `${loser.nameFr} capitule face à ${winner.nameFr}, cède ses territoires périphériques et verse ${indemnity.toFixed(1)} Mds $ de réparations.`;
    } else {
      // AI loses: all its territories are annexed by the victor onto the map!
      for (const prov of loserProvinces) {
        countries[prov.id] = {
          ...prov,
          ownerId: winnerId,
          army: prov.id === loserId ? Math.max(2, Math.round(prov.army * 0.2)) : prov.army,
          warExhaustion: 0,
        };
      }
      peaceDesc = `${loser.nameFr} capitule sans condition devant ${winner.nameFr} ! L’ensemble de son territoire passe sous souveraineté de ${winner.nameFr}.`;
    }
  } else if (terms === 'REPARATIONS' && Math.abs(war.warScore) >= 10) {
    outcomeReason = 'VICTORY';
    const indemnity = Math.min(Math.max(0, loser.treasury * 0.65), Math.max(5, loser.gdp * 0.08));
    countries[winnerId] = {
      ...winner,
      treasury: Number((winner.treasury + indemnity).toFixed(1)),
      warExhaustion: Math.max(0, winner.warExhaustion - 15),
    };
    countries[loserId] = {
      ...loser,
      treasury: Number(Math.max(0, loser.treasury - indemnity).toFixed(1)),
      warExhaustion: Math.max(0, loser.warExhaustion - 10),
    };
    peaceDesc = `${loser.nameFr} reconnaît sa défaite et verse ${indemnity.toFixed(1)} Mds $ de réparations de guerre à ${winner.nameFr}.`;
  } else if (terms === 'ANNEXATION' && Math.abs(war.warScore) >= 28) {
    outcomeReason = 'VICTORY';
    const loserProvinces = Object.values(countries).filter((p) => p.ownerId === loserId);
    if (loserProvinces.length > 1) {
      const targetProv = loserProvinces.find((p) => p.id !== loserId) || loserProvinces[0];
      countries[targetProv.id] = { ...targetProv, ownerId: winnerId };
      peaceDesc = `${winner.nameFr} remporte la victoire et annexe le territoire de ${targetProv.nameFr}.`;
    } else if (loserId !== state.playerCountryId) {
      countries[loserId] = {
        ...loser,
        ownerId: winnerId,
        army: Math.max(2, Math.round(loser.army * 0.25)),
        warExhaustion: 0,
      };
      peaceDesc = `${winner.nameFr} intègre et place sous son autorité le territoire de ${loser.nameFr}.`;
    }
  }

  if (countries[war.aggressorId].ownerId === war.aggressorId) {
    countries[war.aggressorId] = {
      ...countries[war.aggressorId],
      warExhaustion: Math.max(0, countries[war.aggressorId].warExhaustion - 14),
    };
  }
  if (countries[war.defenderId].ownerId === war.defenderId) {
    countries[war.defenderId] = {
      ...countries[war.defenderId],
      warExhaustion: Math.max(0, countries[war.defenderId].warExhaustion - 14),
    };
  }

  setRelation(relations, war.aggressorId, war.defenderId, -25);
  const dateLabel = formatDateFr(state.year, state.month);
  const evt: WorldEvent = {
    id: `evt-peace-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    dateLabel,
    monthIndex: state.monthIndex,
    category: 'PAIX',
    title:
      terms === 'CAPITULATION'
        ? `Capitulation de ${loser.nameFr}`
        : `Fin de guerre : ${agg.nameFr} – ${def.nameFr}`,
    description: peaceDesc,
    involvedCountryIds: [war.aggressorId, war.defenderId],
  };

  const playerInvolved =
    state.playerCountryId === war.aggressorId || state.playerCountryId === war.defenderId;
  const pendingWarOutcome = playerInvolved
    ? {
        warId: war.id,
        warName: war.name,
        winnerId,
        loserId,
        playerWon: state.playerCountryId === winnerId,
        reason: outcomeReason,
        summary: peaceDesc,
        warScore: war.warScore,
        monthsDuration: war.monthsDuration,
        casualtiesTotal: war.casualtiesTotal,
      }
    : state.pendingWarOutcome ?? null;

  return {
    ...state,
    countries,
    relations,
    wars: state.wars.filter((w) => w.id !== warId),
    events: [evt, ...state.events].slice(0, 80),
    pendingWarOutcome,
  };
}

export function formTreatyCoalition(
  state: WorldState,
  type: 'ALLIANCE' | 'ECONOMIC_UNION',
  countryAId: string,
  countryBId: string,
  customName?: string
): WorldState {
  const cA = state.countries[countryAId];
  const cB = state.countries[countryBId];
  if (!cA || !cB) return state;

  // Check if A already leads or belongs to a coalition of this type — invite B into it!
  const existingA = state.alliances.find(
    (al) => al.type === type && al.memberIds.includes(countryAId)
  );
  const existingB = state.alliances.find(
    (al) => al.type === type && al.memberIds.includes(countryBId)
  );

  let alliances = [...state.alliances];
  const dateLabel = formatDateFr(state.year, state.month);
  let title = '';
  let desc = '';

  if (existingA && !existingA.memberIds.includes(countryBId)) {
    alliances = alliances.map((al) =>
      al.id === existingA.id ? { ...al, memberIds: [...al.memberIds, countryBId] } : al
    );
    title = `${cB.nameFr} rejoint ${existingA.name}`;
    desc = `À l’initiative de ${cA.nameFr}, ${cB.nameFr} adhère officiellement à ${existingA.name}.`;
  } else if (existingB && !existingB.memberIds.includes(countryAId)) {
    alliances = alliances.map((al) =>
      al.id === existingB.id ? { ...al, memberIds: [...al.memberIds, countryAId] } : al
    );
    title = `${cA.nameFr} rejoint ${existingB.name}`;
    desc = `${cA.nameFr} intègre l’organisation ${existingB.name} aux côtés de ${cB.nameFr}.`;
  } else if (!existingA && !existingB) {
    const label =
      customName ||
      (type === 'ALLIANCE'
        ? `Pacte ${cA.nameFr}–${cB.nameFr}`
        : `Union Économique ${cA.nameFr}–${cB.nameFr}`);
    const newAl: Alliance = {
      id: `al-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: label,
      type,
      color: type === 'ALLIANCE' ? '#60A5FA' : '#10B981',
      leaderId: countryAId,
      memberIds: [countryAId, countryBId],
      foundedDate: dateLabel,
    };
    alliances.push(newAl);
    title = `Création : ${label}`;
    desc = `${cA.nameFr} et ${cB.nameFr} fondent ${label}, resserrant leurs liens stratégiques.`;
  } else {
    return state;
  }

  const relations = { ...state.relations };
  setRelation(relations, countryAId, countryBId, Math.max(getRelation(state, countryAId, countryBId) + 18, 60));

  const evt: WorldEvent = {
    id: `evt-al-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    dateLabel,
    monthIndex: state.monthIndex,
    category: 'DIPLOMATIE',
    title,
    description: desc,
    involvedCountryIds: [countryAId, countryBId],
  };

  return {
    ...state,
    alliances,
    relations,
    events: [evt, ...state.events].slice(0, 140),
  };
}

export function leaveCoalition(state: WorldState, allianceId: string, countryId: string): WorldState {
  const target = state.alliances.find((a) => a.id === allianceId);
  const country = state.countries[countryId];
  if (!target || !country) return state;

  const updated = state.alliances
    .map((al) =>
      al.id === allianceId
        ? { ...al, memberIds: al.memberIds.filter((id) => id !== countryId) }
        : al
    )
    .filter((al) => al.memberIds.length >= 2);

  const dateLabel = formatDateFr(state.year, state.month);
  const evt: WorldEvent = {
    id: `evt-leave-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    dateLabel,
    monthIndex: state.monthIndex,
    category: 'DIPLOMATIE',
    title: `${country.nameFr} quitte ${target.name}`,
    description: `${country.nameFr} annonce son retrait officiel de ${target.name}.`,
    involvedCountryIds: [countryId],
  };

  return {
    ...state,
    alliances: updated,
    events: [evt, ...state.events].slice(0, 140),
  };
}

export function sendFinancialAid(
  state: WorldState,
  fromId: string,
  toId: string,
  amount: number
): { nextState: WorldState; error?: string } {
  const from = state.countries[fromId];
  const to = state.countries[toId];
  if (!from || !to) return { nextState: state, error: 'Pays introuvable.' };
  if (from.treasury < amount) {
    return { nextState: state, error: 'Trésor national insuffisant.' };
  }

  const relations = { ...state.relations };
  const boost = Math.min(25, Math.max(6, Math.round((amount / Math.max(10, to.gdp)) * 120)));
  setRelation(relations, fromId, toId, getRelation(state, fromId, toId) + boost);

  const dateLabel = formatDateFr(state.year, state.month);
  const evt: WorldEvent = {
    id: `evt-aid-${Date.now()}`,
    dateLabel,
    monthIndex: state.monthIndex,
    category: 'ÉCONOMIE',
    title: `Aide économique de ${from.nameFr} à ${to.nameFr}`,
    description: `${from.nameFr} accorde une enveloppe de ${amount.toFixed(1)} Mds $ à ${to.nameFr}, améliorant leurs relations (+${boost}).`,
    involvedCountryIds: [fromId, toId],
  };

  return {
    nextState: {
      ...state,
      countries: {
        ...state.countries,
        [fromId]: { ...from, treasury: Number((from.treasury - amount).toFixed(2)) },
        [toId]: { ...to, treasury: Number((to.treasury + amount).toFixed(2)) },
      },
      relations,
      events: [evt, ...state.events].slice(0, 140),
    },
  };
}

export function signTradeDeal(
  state: WorldState,
  countryAId: string,
  countryBId: string
): { nextState: WorldState; error?: string } {
  const cA = state.countries[countryAId];
  const cB = state.countries[countryBId];
  if (!cA || !cB) return { nextState: state, error: 'Pays introuvable.' };
  if (cA.ownerId !== cA.id || cB.ownerId !== cB.id) {
    return { nextState: state, error: 'Seuls des États souverains peuvent conclure un accord commercial.' };
  }
  if (isAtWarBetween(state, countryAId, countryBId)) {
    return { nextState: state, error: 'Impossible de commercer en temps de guerre.' };
  }
  const existing = (state.tradeDeals ?? []).find(
    (td) =>
      (td.exporterId === countryAId && td.importerId === countryBId) ||
      (td.exporterId === countryBId && td.importerId === countryAId)
  );
  if (existing) {
    return { nextState: state, error: 'Un accord commercial est déjà actif avec ce pays.' };
  }

  const rel = getRelation(state, countryAId, countryBId);
  if (countryAId === state.playerCountryId && rel < -10) {
    return {
      nextState: state,
      error: `Relations insuffisantes (${rel}). Améliorez vos relations au-dessus de -10.`,
    };
  }

  const resource = cA.resources?.exportResource ?? 'Industrie';
  const valueMds = Math.max(
    1.5,
    Math.min(35, Number((Math.sqrt(cA.gdp * cB.gdp) * 0.015).toFixed(1)))
  );
  const dateLabel = formatDateFr(state.year, state.month);

  const newDeal: TradeDeal = {
    id: `td-${countryAId}-${countryBId}-${state.monthIndex}-${Math.random().toString(36).slice(2, 5)}`,
    exporterId: countryAId,
    importerId: countryBId,
    resource,
    valueMds,
    signedDate: dateLabel,
  };

  const relations = { ...state.relations };
  setRelation(relations, countryAId, countryBId, rel + 8);

  const countries = { ...state.countries };
  if (cA.resources) {
    countries[countryAId] = {
      ...cA,
      resources: {
        ...cA.resources,
        tradePartners: Array.from(new Set([...cA.resources.tradePartners, countryBId])),
      },
    };
  }
  if (cB.resources) {
    countries[countryBId] = {
      ...cB,
      resources: {
        ...cB.resources,
        tradePartners: Array.from(new Set([...cB.resources.tradePartners, countryAId])),
      },
    };
  }

  const evt: WorldEvent = {
    id: `evt-trade-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    dateLabel,
    monthIndex: state.monthIndex,
    category: 'COMMERCE' as const,
    title: `Accord commercial : ${cA.nameFr} – ${cB.nameFr}`,
    description: `${cA.nameFr} exporte (${resource}) vers ${cB.nameFr} pour un volume estimé à ${valueMds} Mds $.`,
    involvedCountryIds: [countryAId, countryBId],
  };

  return {
    nextState: {
      ...state,
      countries,
      relations,
      tradeDeals: [newDeal, ...(state.tradeDeals ?? [])],
      events: [evt, ...state.events].slice(0, 140),
    },
  };
}

export function resolveIncomingProposal(
  state: WorldState,
  proposalId: string,
  accept: boolean
): WorldState {
  const prop = state.proposals.find((p) => p.id === proposalId);
  if (!prop || !state.playerCountryId) return state;

  let next: WorldState = {
    ...state,
    proposals: state.proposals.filter((p) => p.id !== proposalId),
  };

  const playerId = state.playerCountryId;
  const senderId = prop.fromCountryId;

  if (accept) {
    if (prop.type === 'ALLIANCE') {
      next = formTreatyCoalition(next, 'ALLIANCE', senderId, playerId);
    } else if (prop.type === 'ECONOMIC_UNION') {
      next = formTreatyCoalition(next, 'ECONOMIC_UNION', senderId, playerId);
    } else if (prop.type === 'NON_AGGRESSION') {
      const k = pairKey(playerId, senderId);
      if (!next.nonAggressionPacts.includes(k)) {
        next.nonAggressionPacts = [...next.nonAggressionPacts, k];
      }
      const rels = { ...next.relations };
      setRelation(rels, playerId, senderId, getRelation(next, playerId, senderId) + 12);
      next.relations = rels;
    } else if (prop.type === 'PEACE') {
      const war = isAtWarBetween(next, playerId, senderId);
      if (war) {
        next = resolvePeaceTreaty(next, war.id, 'STATUS_QUO');
      }
    }
  } else {
    const rels = { ...next.relations };
    setRelation(rels, playerId, senderId, getRelation(next, playerId, senderId) - 10);
    next.relations = rels;
    if (prop.type === 'ULTIMATUM') {
      next = declareWarBetween(next, senderId, playerId);
    }
  }

  return next;
}

// MAIN MONTHLY SIMULATION TICK — ALL 176 NATIONS + INDEPENDENT AI DECISIONS
export function advanceMonth(state: WorldState): WorldState {
  const nextMonthIndex = state.monthIndex + 1;
  let nextMonth = state.month + 1;
  let nextYear = state.year;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }
  const dateLabel = formatDateFr(nextYear, nextMonth);

  const countries: Record<string, CountryState> = {};
  for (const [id, c] of Object.entries(state.countries)) {
    countries[id] = { ...c, policy: { ...c.policy } };
  }

  const relations: Record<string, Record<string, number>> = {};
  for (const [a, map] of Object.entries(state.relations)) {
    relations[a] = { ...map };
  }

  const tradeDeals = [...(state.tradeDeals ?? [])];
  let alliances = state.alliances.map((al) => ({ ...al, memberIds: [...al.memberIds] }));
  let wars = state.wars.map((w) => ({
    ...w,
    aggressorAllies: [...w.aggressorAllies],
    defenderAllies: [...w.defenderAllies],
  }));
  const newEvents: WorldEvent[] = [];
  const newProposals: DiplomaticProposal[] = [...state.proposals];
  let nonAggressionPacts = [...state.nonAggressionPacts];

  // Track which countries are currently at war
  const atWarSet = new Set<string>();
  for (const w of wars) {
    atWarSet.add(w.aggressorId);
    atWarSet.add(w.defenderId);
    w.aggressorAllies.forEach((a) => atWarSet.add(a));
    w.defenderAllies.forEach((d) => atWarSet.add(d));
  }

  // Precompute active trade volume per country
  const tradeValueByCountry: Record<string, number> = {};
  const tradeCountByCountry: Record<string, number> = {};
  for (const td of tradeDeals) {
    tradeValueByCountry[td.exporterId] = (tradeValueByCountry[td.exporterId] ?? 0) + td.valueMds;
    tradeValueByCountry[td.importerId] = (tradeValueByCountry[td.importerId] ?? 0) + td.valueMds * 0.85;
    tradeCountByCountry[td.exporterId] = (tradeCountByCountry[td.exporterId] ?? 0) + 1;
    tradeCountByCountry[td.importerId] = (tradeCountByCountry[td.importerId] ?? 0) + 1;
  }

  // 1. ECONOMIC, DEMOGRAPHIC & STABILITY SIMULATION FOR EVERY COUNTRY
  for (const id of Object.keys(countries)) {
    const c = countries[id];
    const isOccupied = c.ownerId !== c.id;
    if (isOccupied) continue; // Conquered territories yield to their owner

    const ownedTerritories = Object.values(countries).filter(
      (p) => p.ownerId === id && p.id !== id
    );
    const annexedGdpBonus = ownedTerritories.reduce((acc, p) => acc + p.gdp * 0.45, 0);
    const effectiveGdp = c.gdp + annexedGdpBonus;

    // Economic Union & Trade Deal boost
    const inEconomicUnion = alliances.some(
      (al) => al.type === 'ECONOMIC_UNION' && al.memberIds.includes(id)
    );
    const unionBonus = inEconomicUnion ? 0.08 : 0;
    const tradeCount = Math.min(8, tradeCountByCountry[id] ?? 0);
    const tradeGrowthBonus = tradeCount * 0.025;
    const tradeTreasuryBonus = Math.min(8, (tradeValueByCountry[id] ?? 0) * 0.035);

    // Tax impact on growth & approval
    const taxFactor = (26 - c.policy.taxRate) * 0.012;
    const infraFactor = (c.policy.infrastructureBudget - 15) * 0.008;
    const warPenalty = atWarSet.has(id) ? -0.18 : 0;

    const monthlyGrowthPct = Math.max(
      -0.8,
      Math.min(
        1.05,
        0.14 + unionBonus + tradeGrowthBonus + taxFactor + infraFactor + warPenalty + (c.techLevel - 1) * 0.04
      )
    );

    const newGdp = Math.max(1, Number((c.gdp * (1 + monthlyGrowthPct / 100)).toFixed(2)));

    // Monthly Budget Calculation (in Mds $)
    // Monthly fiscal revenue ≈ (GDP / 12) * (taxRate / 100) * 0.48 + bilateral trade customs
    const monthlyRevenue =
      (effectiveGdp / 12) * (c.policy.taxRate / 100) * 0.48 + tradeTreasuryBonus;
    const armyUpkeep = c.army * 0.0085 * (atWarSet.has(id) ? 1.55 : 1.0);
    const infraCost = monthlyRevenue * (c.policy.infrastructureBudget / 100);
    const socialCost = monthlyRevenue * (c.policy.socialBudget / 100);
    const milCost = monthlyRevenue * (c.policy.militaryBudget / 100);
    const totalOutflow = armyUpkeep + infraCost + socialCost + milCost * 0.4;

    const monthlyBalance = Number((monthlyRevenue - totalOutflow).toFixed(2));
    let newTreasury = Number((c.treasury + monthlyBalance).toFixed(2));

    // Debt penalty if treasury goes negative
    let stabilityDelta = 0;
    if (newTreasury < 0) {
      stabilityDelta -= 1.8;
      newTreasury = Number((newTreasury * 0.98).toFixed(2));
    }

    // Social & tax effects on stability and approval
    stabilityDelta += (c.policy.socialBudget - 18) * 0.06;
    stabilityDelta -= Math.max(0, c.policy.taxRate - 32) * 0.12;
    if (atWarSet.has(id)) {
      c.warExhaustion = Math.min(100, c.warExhaustion + 2.5);
      stabilityDelta -= 0.7;
    } else {
      c.warExhaustion = Math.max(0, c.warExhaustion - 2.0);
      stabilityDelta += 0.25;
    }

    const newStability = Math.max(5, Math.min(100, Number((c.stability + stabilityDelta).toFixed(1))));
    const newApproval = Math.max(
      5,
      Math.min(100, Number((c.approval + stabilityDelta * 1.1).toFixed(1)))
    );

    // Demographic growth (~0.06% per month avg, reduced in war)
    const popGrowth = atWarSet.has(id) ? 0.0001 : 0.00065;
    const newPop = Number((c.population * (1 + popGrowth)).toFixed(2));

    // Passive military recruitment from militaryBudget
    const passiveRecruit = Math.floor((milCost / 1.8) * (c.policy.doctrine === 'Offensive' ? 1.25 : 1));
    const maxCap = newPop * 35;
    const newArmy = Math.min(maxCap, Math.max(1, c.army + passiveRecruit));

    // Gradual tech growth
    const techGain = c.policy.infrastructureBudget > 20 ? 0.002 : 0.0008;

    countries[id] = {
      ...c,
      gdp: newGdp,
      gdpGrowthMonthly: Number(monthlyGrowthPct.toFixed(3)),
      treasury: newTreasury,
      monthlyBalance,
      population: newPop,
      army: Math.round(newArmy),
      techLevel: Number(Math.min(3.0, c.techLevel + techGain).toFixed(3)),
      stability: newStability,
      approval: newApproval,
    };
  }

  // 2. RESOLVE ACTIVE WARS, BATTLES, CONQUESTS & CAPITULATIONS
  const completedWars: Array<{
    war: WarState;
    terms: 'STATUS_QUO' | 'REPARATIONS' | 'ANNEXATION' | 'CAPITULATION';
    forcedWinnerId?: string;
  }> = [];

  for (const war of wars) {
    war.monthsDuration += 1;
    war.aggressorOccupation = war.aggressorOccupation ?? 0;
    war.defenderOccupation = war.defenderOccupation ?? 0;
    war.battlesWonAggressor = war.battlesWonAggressor ?? 0;
    war.battlesWonDefender = war.battlesWonDefender ?? 0;

    const aggSide = [war.aggressorId, ...war.aggressorAllies].filter(
      (id) => countries[id] && countries[id].ownerId === id
    );
    const defSide = [war.defenderId, ...war.defenderAllies].filter(
      (id) => countries[id] && countries[id].ownerId === id
    );

    if (aggSide.length === 0 || defSide.length === 0) {
      completedWars.push({ war, terms: 'STATUS_QUO' });
      continue;
    }

    const aggPower = aggSide.reduce(
      (acc, id) =>
        acc +
        getMilitaryPowerIndex(
          countries[id],
          false,
          id === war.aggressorId && Boolean(war.offensiveBoostAggressor)
        ),
      0
    );
    const defPower = defSide.reduce(
      (acc, id) =>
        acc +
        getMilitaryPowerIndex(
          countries[id],
          true,
          id === war.defenderId && Boolean(war.offensiveBoostDefender)
        ),
      0
    );

    // Clear one-month offensive orders
    war.offensiveBoostAggressor = false;
    war.offensiveBoostDefender = false;

    const totalPower = Math.max(1, aggPower + defPower);
    const rawRatio = (aggPower - defPower) / totalPower; // -1 to +1
    const tacticalSwing = (Math.random() - 0.5) * 0.14;
    const effectiveRatio = Math.max(-1, Math.min(1, rawRatio + tacticalSwing));

    // Asymmetric realistic casualties (stronger tech/GDP inflicts heavier losses while taking fewer)
    const aggBaseLoss = Math.max(1, Math.round(countries[war.aggressorId].army * 0.032));
    const defBaseLoss = Math.max(1, Math.round(countries[war.defenderId].army * 0.032));
    const aggLossMult = Math.max(0.25, 1 - effectiveRatio * 0.72);
    const defLossMult = Math.max(0.25, 1 + effectiveRatio * 0.72);

    const aggLosses = Math.max(1, Math.round(aggBaseLoss * aggLossMult));
    const defLosses = Math.max(1, Math.round(defBaseLoss * defLossMult));

    countries[war.aggressorId].army = Math.max(1, countries[war.aggressorId].army - aggLosses);
    countries[war.defenderId].army = Math.max(1, countries[war.defenderId].army - defLosses);
    war.casualtiesTotal += aggLosses + defLosses;

    const aggName = countries[war.aggressorId].nameFr;
    const defName = countries[war.defenderId].nameFr;

    if (effectiveRatio > 0.04) {
      war.battlesWonAggressor += 1;
      const gain = Math.max(6, Math.round(7 + effectiveRatio * 34));
      if (war.defenderOccupation > 0) {
        const liberated = Math.min(war.defenderOccupation, gain);
        war.defenderOccupation -= liberated;
        const leftover = gain - liberated;
        war.aggressorOccupation = Math.min(100, war.aggressorOccupation + leftover);
      } else {
        war.aggressorOccupation = Math.min(100, war.aggressorOccupation + gain);
      }
      war.warScore = Math.min(100, Math.round(war.warScore + 6 + effectiveRatio * 28));
      war.lastBattleSummary = `Victoire de ${aggName} (+${gain} % front) · Pertes : ${aggLosses}k vs ${defLosses}k.`;
    } else if (effectiveRatio < -0.04) {
      war.battlesWonDefender += 1;
      const gain = Math.max(6, Math.round(7 + Math.abs(effectiveRatio) * 34));
      if (war.aggressorOccupation > 0) {
        const liberated = Math.min(war.aggressorOccupation, gain);
        war.aggressorOccupation -= liberated;
        const leftover = gain - liberated;
        war.defenderOccupation = Math.min(100, war.defenderOccupation + leftover);
      } else {
        war.defenderOccupation = Math.min(100, war.defenderOccupation + gain);
      }
      war.warScore = Math.max(-100, Math.round(war.warScore - 6 - Math.abs(effectiveRatio) * 28));
      war.lastBattleSummary = `Contre-offensive de ${defName} (+${gain} % front) · Pertes : ${defLosses}k vs ${aggLosses}k.`;
    } else {
      war.lastBattleSummary = `Combats indécis sur le front · Pertes : ${aggLosses}k vs ${defLosses}k.`;
    }

    // Mid-war territorial conquest for multi-province empires
    if (war.aggressorOccupation >= 40) {
      const defOwned = Object.values(countries).filter(
        (p) => p.ownerId === war.defenderId && p.id !== war.defenderId
      );
      if (defOwned.length > 0 && (war.aggressorOccupation >= 65 || defOwned.length > 1)) {
        const captured = defOwned[0];
        countries[captured.id] = { ...captured, ownerId: war.aggressorId };
        newEvents.push({
          id: `evt-cap-${captured.id}-${nextMonthIndex}`,
          dateLabel,
          monthIndex: nextMonthIndex,
          category: 'GUERRE',
          title: `${aggName} conquiert ${captured.nameFr}`,
          description: `À la suite d’une percée militaire, les forces de ${aggName} prennent le contrôle de ${captured.nameFr}.`,
          involvedCountryIds: [war.aggressorId, war.defenderId],
        });
      }
    }
    if (war.defenderOccupation >= 40) {
      const aggOwned = Object.values(countries).filter(
        (p) => p.ownerId === war.aggressorId && p.id !== war.aggressorId
      );
      if (aggOwned.length > 0 && (war.defenderOccupation >= 65 || aggOwned.length > 1)) {
        const captured = aggOwned[0];
        countries[captured.id] = { ...captured, ownerId: war.defenderId };
        newEvents.push({
          id: `evt-cap-${captured.id}-${nextMonthIndex}`,
          dateLabel,
          monthIndex: nextMonthIndex,
          category: 'GUERRE',
          title: `${defName} conquiert ${captured.nameFr}`,
          description: `L’armée de ${defName} s’empare du territoire de ${captured.nameFr}.`,
          involvedCountryIds: [war.defenderId, war.aggressorId],
        });
      }
    }

    // Capitulation & Decisive War Resolution (prevents endless 100-year wars!)
    const aggCollapse =
      war.defenderOccupation >= 100 ||
      (war.defenderOccupation >= 72 &&
        (countries[war.aggressorId].army < countries[war.defenderId].army * 0.3 ||
          countries[war.aggressorId].stability < 24 ||
          countries[war.aggressorId].warExhaustion >= 72));

    const defCollapse =
      war.aggressorOccupation >= 100 ||
      (war.aggressorOccupation >= 72 &&
        (countries[war.defenderId].army < countries[war.aggressorId].army * 0.3 ||
          countries[war.defenderId].stability < 24 ||
          countries[war.defenderId].warExhaustion >= 72));

    if (defCollapse) {
      completedWars.push({ war, terms: 'CAPITULATION', forcedWinnerId: war.aggressorId });
      continue;
    }
    if (aggCollapse) {
      completedWars.push({ war, terms: 'CAPITULATION', forcedWinnerId: war.defenderId });
      continue;
    }

    // Hard anti-stagnation resolution cap
    if (war.monthsDuration >= 20 && Math.abs(war.warScore) >= 24) {
      completedWars.push({
        war,
        terms: Math.abs(war.warScore) >= 48 ? 'ANNEXATION' : 'REPARATIONS',
      });
      continue;
    }
    if (war.monthsDuration >= 28) {
      completedWars.push({
        war,
        terms: Math.abs(war.warScore) >= 14 ? 'REPARATIONS' : 'STATUS_QUO',
      });
      continue;
    }

    // AI-to-Player peace offer when losing or exhausted
    const playerInvolved =
      state.playerCountryId === war.aggressorId || state.playerCountryId === war.defenderId;

    if (playerInvolved) {
      const aiEnemyId =
        state.playerCountryId === war.aggressorId ? war.defenderId : war.aggressorId;
      const playerWinning =
        (state.playerCountryId === war.aggressorId && war.warScore > 26) ||
        (state.playerCountryId === war.defenderId && war.warScore < -26);

      if (
        playerWinning &&
        (countries[aiEnemyId].warExhaustion > 32 || Math.abs(war.warScore) > 34) &&
        !newProposals.some((p) => p.fromCountryId === aiEnemyId && p.type === 'PEACE') &&
        Math.random() < 0.55
      ) {
        newProposals.push({
          id: `prop-peace-${aiEnemyId}-${nextMonthIndex}`,
          fromCountryId: aiEnemyId,
          type: 'PEACE',
          title: `Offre de paix de ${countries[aiEnemyId].nameFr}`,
          message: `${countries[aiEnemyId].leaderTitle} ${countries[aiEnemyId].leaderName} demande un traité de paix pour mettre fin aux hostilités.`,
          dateLabel,
        });
      }
    }
  }

  let workingState: WorldState = {
    ...state,
    monthIndex: nextMonthIndex,
    year: nextYear,
    month: nextMonth,
    countries,
    relations,
    alliances,
    tradeDeals,
    wars,
    nonAggressionPacts,
    proposals: newProposals,
    events: [...newEvents, ...state.events].slice(0, 140),
  };

  for (const done of completedWars) {
    workingState = resolvePeaceTreaty(
      workingState,
      done.war.id,
      done.terms,
      done.forcedWinnerId
    );
  }

  // 3. INDEPENDENT AUTONOMOUS AI SIMULATION FOR ALL 176 NATIONS
  const activeCountryIds = Object.keys(workingState.countries).filter(
    (id) => id !== workingState.playerCountryId && workingState.countries[id].ownerId === id
  );

  // Shuffle order every month so every country gets fair initiative across months
  const shuffledIds = [...activeCountryIds].sort(() => Math.random() - 0.5);

  let warsStartedThisMonth = 0;
  let treatiesSignedThisMonth = 0;
  let tradeDealsSignedThisMonth = 0;
  let alliancesBrokenThisMonth = 0;
  let leadershipChangesThisMonth = 0;
  let aiPeaceSignedThisMonth = 0;
  const aiEvents: WorldEvent[] = [];

  for (const aiId of shuffledIds) {
    const ai = workingState.countries[aiId];
    if (!ai || ai.ownerId !== ai.id) continue;

    const inWar = isAtWarBetweenAny(workingState, aiId);

    // A. AUTONOMOUS NATIONAL GOVERNANCE (all AI countries adjust budgets, economy, army & tech)
    if (ai.treasury < 3 && ai.policy.taxRate < 38) {
      ai.policy.taxRate = Math.min(40, ai.policy.taxRate + 2);
      ai.policy.militaryBudget = Math.max(10, ai.policy.militaryBudget - 2);
    } else if (ai.stability < 48 && ai.policy.socialBudget < 34) {
      ai.policy.socialBudget = Math.min(36, ai.policy.socialBudget + 2);
    } else if (ai.personality === 'Mercantile' && ai.policy.infrastructureBudget < 34) {
      ai.policy.infrastructureBudget = Math.min(36, ai.policy.infrastructureBudget + 1);
    }

    // Invest surplus treasury into industrial growth or defense modernization
    if (!inWar && ai.treasury > Math.max(18, ai.gdp * 0.16)) {
      const investCost = Number((ai.gdp * 0.012).toFixed(1));
      if (ai.treasury > investCost + 6) {
        if (ai.personality === 'Mercantile' || ai.personality === 'Pacifiste' || Math.random() < 0.65) {
          ai.treasury = Number((ai.treasury - investCost).toFixed(2));
          ai.gdp = Number((ai.gdp * 1.008).toFixed(2));
        } else {
          ai.treasury = Number((ai.treasury - investCost).toFixed(2));
          ai.techLevel = Number(Math.min(3.0, ai.techLevel + 0.025).toFixed(3));
        }
      }
    }

    // Mobilize troops when threatened by hostile neighbors or at war
    const hasHostileNeighbor = ai.neighbors.some(
      (nid) =>
        workingState.countries[nid]?.ownerId === nid &&
        (workingState.relations[aiId]?.[nid] ?? 0) < -35
    );
    if ((inWar || hasHostileNeighbor || ai.personality === 'Expansionniste') && ai.treasury > 10 && ai.army < ai.population * 16) {
      const recruitAmt = Math.min(20, Math.floor(ai.treasury / 0.45));
      if (recruitAmt >= 4) {
        ai.treasury = Number((ai.treasury - recruitAmt * 0.25).toFixed(2));
        ai.army += recruitAmt;
      }
    }

    // B. AUTONOMOUS LEADERSHIP CHANGES (Elections & Coups)
    const isDemocracy =
      ai.regime === 'République démocratique' ||
      ai.regime === 'République fédérale' ||
      ai.regime === 'Monarchie constitutionnelle';
    const hashSeed = aiId.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

    if (leadershipChangesThisMonth < 2) {
      if (isDemocracy && (nextMonthIndex + hashSeed) % 36 === 0) {
        const newLeader = generateLeaderName(ai.region, nextMonthIndex + hashSeed * 7);
        const personalities = ['Pragmatique', 'Mercantile', 'Pacifiste', 'Hégémonique'] as const;
        ai.leaderName = newLeader;
        if (ai.approval < 46) {
          ai.personality = personalities[(nextMonthIndex + hashSeed) % personalities.length];
        }
        ai.approval = Math.min(82, ai.approval + 12);
        ai.stability = Math.min(92, ai.stability + 5);
        leadershipChangesThisMonth += 1;
        aiEvents.push({
          id: `evt-elec-${aiId}-${nextMonthIndex}`,
          dateLabel,
          monthIndex: nextMonthIndex,
          category: 'POLITIQUE',
          title: `Élections en ${ai.nameFr} : ${newLeader} élu(e)`,
          description: `À l’issue du scrutin national, ${ai.leaderTitle} ${newLeader} prend la tête de ${ai.nameFr} avec une ligne ${ai.personality.toLowerCase()}.`,
          involvedCountryIds: [aiId],
        });
      } else if (!isDemocracy && ai.stability < 34 && Math.random() < 0.08) {
        const newLeader = generateLeaderName(ai.region, nextMonthIndex * 13 + hashSeed);
        ai.leaderName = newLeader;
        ai.personality = Math.random() < 0.5 ? 'Expansionniste' : 'Pragmatique';
        ai.stability = 44;
        ai.approval = 48;
        leadershipChangesThisMonth += 1;
        aiEvents.push({
          id: `evt-coup-${aiId}-${nextMonthIndex}`,
          dateLabel,
          monthIndex: nextMonthIndex,
          category: 'POLITIQUE',
          title: `Bouleversement politique en ${ai.nameFr}`,
          description: `Face à l’instabilité intérieure, ${newLeader} accède au pouvoir en ${ai.nameFr} et réoriente l’exécutif.`,
          involvedCountryIds: [aiId],
        });
      }
    }

    // C. REACT TO WORLD EVENTS & ALLIANCE RUPTURES
    for (const w of workingState.wars) {
      if (w.aggressorId === aiId || w.defenderId === aiId) continue;
      if (ai.neighbors.includes(w.aggressorId) && Math.random() < 0.25) {
        const curRel = getRelation(workingState, aiId, w.aggressorId);
        setRelation(workingState.relations, aiId, w.aggressorId, curRel - 2);
      }
    }

    // Break an alliance if relations with its leader or members dropped sharply
    if (alliancesBrokenThisMonth < 1 && Math.random() < 0.14) {
      const myCoalition = workingState.alliances.find(
        (al) =>
          al.memberIds.includes(aiId) &&
          al.memberIds.length > 2 &&
          al.leaderId !== aiId
      );
      if (myCoalition) {
        const leaderRel = getRelation(workingState, aiId, myCoalition.leaderId);
        const frictionChance = leaderRel < 15 ? 0.55 : ai.personality === 'Expansionniste' && leaderRel < 38 ? 0.18 : 0.015;
        if (leaderRel < 38 && Math.random() < frictionChance) {
          workingState = leaveCoalition(workingState, myCoalition.id, aiId);
          alliancesBrokenThisMonth += 1;
          setRelation(workingState.relations, aiId, myCoalition.leaderId, leaderRel - 18);
          continue;
        }
      }
    }

    // D. AUTONOMOUS BILATERAL INTERACTIONS (Trade, Treaties, Wars, Diplomacy)
    // Pick a neighbor or regional/global partner
    const validNeighbors = ai.neighbors.filter(
      (tid) =>
        tid !== aiId &&
        workingState.countries[tid] &&
        workingState.countries[tid].ownerId === tid
    );
    const sameRegionPool = activeCountryIds.filter(
      (tid) => tid !== aiId && workingState.countries[tid]?.region === ai.region
    );
    const majorPool = activeCountryIds.filter((tid) => tid !== aiId && workingState.countries[tid]?.gdp > 300);

    const candidates =
      validNeighbors.length > 0 && Math.random() < 0.65
        ? validNeighbors
        : sameRegionPool.length > 0 && Math.random() < 0.7
          ? sameRegionPool
          : majorPool.length > 0
            ? majorPool
            : activeCountryIds;

    if (candidates.length === 0) continue;
    const targetId = candidates[Math.floor(Math.random() * candidates.length)];
    const target = workingState.countries[targetId];
    if (!target || target.ownerId !== targetId || targetId === aiId) continue;

    const rel = getRelation(workingState, aiId, targetId);

    // Subtle organic diplomatic drift based on personality & regime
    if (Math.random() < 0.18) {
      const drift =
        ai.regime === target.regime && ai.personality !== 'Expansionniste'
          ? 2
          : ai.personality === 'Expansionniste' && ai.neighbors.includes(targetId)
            ? -3
            : Math.random() < 0.5
              ? 1
              : -1;
      setRelation(workingState.relations, aiId, targetId, rel + drift);
    }

    const isPact = workingState.nonAggressionPacts.includes(pairKey(aiId, targetId));
    const alreadyWar = isAtWarBetween(workingState, aiId, targetId);
    const sameAllied = sharesAlliance(workingState.alliances, aiId, targetId, 'ALLIANCE');
    const targetIsPlayer = targetId === workingState.playerCountryId;

    // 1) AI declares war on weaker/hostile rival
    const aggressionChance =
      ai.personality === 'Expansionniste'
        ? 0.28
        : ai.personality === 'Hégémonique'
          ? 0.18
          : ai.personality === 'Pragmatique'
            ? 0.06
            : 0.015;

    if (
      !alreadyWar &&
      !sameAllied &&
      !isPact &&
      warsStartedThisMonth < 2 &&
      workingState.wars.length < 9 &&
      rel < -32 &&
      ai.stability > 38 &&
      getMilitaryPowerIndex(ai) > getMilitaryPowerIndex(target, true) * 1.25 &&
      Math.random() < aggressionChance
    ) {
      workingState = declareWarBetween(workingState, aiId, targetId);
      warsStartedThisMonth += 1;
      continue;
    }

    // 2) AI-to-AI negotiated peace when exhausted
    if (
      alreadyWar &&
      !targetIsPlayer &&
      alreadyWar.aggressorId !== workingState.playerCountryId &&
      alreadyWar.defenderId !== workingState.playerCountryId &&
      aiPeaceSignedThisMonth < 1 &&
      alreadyWar.monthsDuration >= 8 &&
      ai.warExhaustion > 52 &&
      Math.random() < 0.25
    ) {
      const terms =
        Math.abs(alreadyWar.warScore) >= 35
          ? 'ANNEXATION'
          : Math.abs(alreadyWar.warScore) >= 15
            ? 'REPARATIONS'
            : 'STATUS_QUO';
      workingState = resolvePeaceTreaty(workingState, alreadyWar.id, terms);
      aiPeaceSignedThisMonth += 1;
      continue;
    }

    // 3) AI signs resource Trade Deals (with AI or notifies player)
    if (
      !alreadyWar &&
      !targetIsPlayer &&
      tradeDealsSignedThisMonth < 3 &&
      rel >= 5 &&
      ai.resources &&
      target.resources &&
      (ai.resources.exportResource === target.resources.importResource ||
        ai.personality === 'Mercantile' ||
        Math.random() < 0.35)
    ) {
      const resTrade = signTradeDeal(workingState, aiId, targetId);
      if (!resTrade.error) {
        workingState = resTrade.nextState;
        tradeDealsSignedThisMonth += 1;
        continue;
      }
    }

    // Cancel trade deal if relations plunged below -30
    if (rel < -30) {
      const activeTd = (workingState.tradeDeals ?? []).find(
        (td) =>
          (td.exporterId === aiId && td.importerId === targetId) ||
          (td.exporterId === targetId && td.importerId === aiId)
      );
      if (activeTd) {
        workingState.tradeDeals = (workingState.tradeDeals ?? []).filter((td) => td.id !== activeTd.id);
        aiEvents.push({
          id: `evt-embargo-${aiId}-${targetId}-${nextMonthIndex}`,
          dateLabel,
          monthIndex: nextMonthIndex,
          category: 'COMMERCE',
          title: `Rupture commerciale : ${ai.nameFr} – ${target.nameFr}`,
          description: `En raison de tensions diplomatiques (${rel}), ${ai.nameFr} suspend son accord commercial avec ${target.nameFr}.`,
          involvedCountryIds: [aiId, targetId],
        });
      }
    }

    // 4) AI forms Alliance or Economic Union
    if (!alreadyWar && treatiesSignedThisMonth < 2 && rel >= 44) {
      const alreadySameAll = sharesAlliance(workingState.alliances, aiId, targetId, 'ALLIANCE');
      const alreadySameEco = sharesAlliance(workingState.alliances, aiId, targetId, 'ECONOMIC_UNION');

      if (!alreadySameEco && (ai.personality === 'Mercantile' || Math.random() < 0.55)) {
        if (targetIsPlayer) {
          if (
            !workingState.proposals.some(
              (p) => p.fromCountryId === aiId && p.type === 'ECONOMIC_UNION'
            )
          ) {
            workingState.proposals = [
              {
                id: `prop-eco-${aiId}-${nextMonthIndex}`,
                fromCountryId: aiId,
                type: 'ECONOMIC_UNION' as const,
                title: `Accord économique proposé par ${ai.nameFr}`,
                message: `${ai.leaderTitle} ${ai.leaderName} de ${ai.nameFr} souhaite établir une union douanière et commerciale avec votre nation.`,
                dateLabel,
              },
              ...workingState.proposals,
            ].slice(0, 10);
          }
        } else {
          workingState = formTreatyCoalition(workingState, 'ECONOMIC_UNION', aiId, targetId);
          treatiesSignedThisMonth += 1;
        }
      } else if (!alreadySameAll && rel >= 54 && ai.personality !== 'Pacifiste') {
        if (targetIsPlayer) {
          if (
            !workingState.proposals.some(
              (p) => p.fromCountryId === aiId && p.type === 'ALLIANCE'
            )
          ) {
            workingState.proposals = [
              {
                id: `prop-all-${aiId}-${nextMonthIndex}`,
                fromCountryId: aiId,
                type: 'ALLIANCE' as const,
                title: `Proposition d’alliance de ${ai.nameFr}`,
                message: `Face aux équilibres mondiaux actuels, ${ai.nameFr} vous propose un traité de défense mutuelle.`,
                dateLabel,
              },
              ...workingState.proposals,
            ].slice(0, 10);
          }
        } else {
          workingState = formTreatyCoalition(workingState, 'ALLIANCE', aiId, targetId);
          treatiesSignedThisMonth += 1;
        }
      }
    } else if (
      !alreadyWar &&
      targetIsPlayer &&
      rel < -52 &&
      ai.personality === 'Expansionniste' &&
      Math.random() < 0.16
    ) {
      if (!workingState.proposals.some((p) => p.fromCountryId === aiId && p.type === 'ULTIMATUM')) {
        workingState.proposals = [
          {
            id: `prop-ult-${aiId}-${nextMonthIndex}`,
            fromCountryId: aiId,
            type: 'ULTIMATUM' as const,
            title: `Mise en garde de ${ai.nameFr}`,
            message: `${ai.nameFr} juge votre posture stratégique menaçante et exige un apaisement immédiat (accepter réduit les tensions, refuser risque le conflit).`,
            dateLabel,
          },
          ...workingState.proposals,
        ].slice(0, 10);
      }
    }
  }

  // 4. MONTHLY GLOBAL ECONOMIC BOOM / CRISIS DISPATCH
  const roll = Math.random();
  if (roll < 0.45) {
    const majorPool = Object.values(workingState.countries).filter(
      (c) => c.ownerId === c.id && c.gdp > 140 && c.id !== workingState.playerCountryId
    );
    if (majorPool.length > 0) {
      const lucky = majorPool[Math.floor(Math.random() * majorPool.length)];
      lucky.gdp = Number((lucky.gdp * 1.016).toFixed(1));
      aiEvents.push({
        id: `evt-boom-${nextMonthIndex}-${lucky.id}`,
        dateLabel,
        monthIndex: nextMonthIndex,
        category: 'ÉCONOMIE',
        title: `Essor économique en ${lucky.nameFr}`,
        description: `Les exportations et investissements industriels soutiennent la croissance de ${lucky.nameFr} (+1,6 % PIB).`,
        involvedCountryIds: [lucky.id],
      });
    }
  } else if (roll < 0.85) {
    const unstablePool = Object.values(workingState.countries).filter(
      (c) => c.ownerId === c.id && c.stability < 72 && c.id !== workingState.playerCountryId
    );
    if (unstablePool.length > 0) {
      const troubled = unstablePool[Math.floor(Math.random() * unstablePool.length)];
      troubled.stability = Math.max(15, troubled.stability - 6);
      troubled.gdp = Number((troubled.gdp * 0.988).toFixed(1));
      aiEvents.push({
        id: `evt-crisis-${nextMonthIndex}-${troubled.id}`,
        dateLabel,
        monthIndex: nextMonthIndex,
        category: 'CRISE',
        title: `Crise économique et sociale en ${troubled.nameFr}`,
        description: `L’inflation et les tensions sociales ralentissent l’activité de ${troubled.nameFr} (-1,2 % PIB, -6 pts stabilité).`,
        involvedCountryIds: [troubled.id],
      });
    }
  }

  workingState.events = [...aiEvents, ...workingState.events].slice(0, 140);
  workingState.history = [...workingState.history, createSnapshot(workingState)].slice(-120);

  return workingState;
}

function isAtWarBetweenAny(state: WorldState, id: string): boolean {
  return state.wars.some(
    (w) =>
      w.aggressorId === id ||
      w.defenderId === id ||
      w.aggressorAllies.includes(id) ||
      w.defenderAllies.includes(id)
  );
}

export function simulateUntilYear(
  state: WorldState,
  targetYear: number
): { nextState: WorldState; summary: SimulationSummary } {
  const startDateLabel = formatDateFr(state.year, state.month);
  const startYear = state.year;
  const playerId = state.playerCountryId;

  const capturePlayerSnapshot = (s: WorldState) => {
    if (!playerId || !s.countries[playerId]) return null;
    const p = s.countries[playerId];
    const totals = getCountryTotalStats(s, playerId);
    return {
      gdp: totals.totalGdp,
      treasury: Number(p.treasury.toFixed(1)),
      army: Math.round(p.army),
      population: totals.totalPop,
      stability: Math.round(p.stability),
      territories: totals.territories,
    };
  };

  const playerBefore = capturePlayerSnapshot(state);
  const initialOwners: Record<string, string> = {};
  for (const [id, c] of Object.entries(state.countries)) {
    initialOwners[id] = c.ownerId;
  }

  const seenEventIds = new Set<string>(state.events.map((e) => e.id));
  const collectedEvents: WorldEvent[] = [];
  const playerWarOutcomes: WarOutcome[] = [];

  let current: WorldState = {
    ...state,
    pendingWarOutcome: null,
  };
  let monthsSimulated = 0;

  while (current.year < targetYear && monthsSimulated < 600) {
    current = advanceMonth(current);
    monthsSimulated += 1;

    for (const ev of current.events) {
      if (!seenEventIds.has(ev.id)) {
        seenEventIds.add(ev.id);
        collectedEvents.push(ev);
      }
    }

    if (current.pendingWarOutcome) {
      playerWarOutcomes.push(current.pendingWarOutcome);
      current = {
        ...current,
        pendingWarOutcome: null,
      };
    }
  }

  const territorialChanges: SimulationSummary['territorialChanges'] = [];
  for (const [id, c] of Object.entries(current.countries)) {
    const prevOwner = initialOwners[id];
    if (prevOwner && prevOwner !== c.ownerId) {
      territorialChanges.push({
        territoryId: id,
        territoryName: c.nameFr,
        previousOwnerName: current.countries[prevOwner]?.nameFr ?? prevOwner,
        newOwnerName: current.countries[c.ownerId]?.nameFr ?? c.ownerId,
        involvesPlayer: Boolean(playerId && (prevOwner === playerId || c.ownerId === playerId)),
      });
    }
  }

  const counts = {
    warsStarted: 0,
    peacesSigned: 0,
    alliancesEvents: 0,
    tradeDealsSigned: 0,
    politicalEvents: 0,
    economicEvents: 0,
  };

  for (const ev of collectedEvents) {
    if (ev.category === 'GUERRE') counts.warsStarted += 1;
    else if (ev.category === 'PAIX') counts.peacesSigned += 1;
    else if (ev.category === 'DIPLOMATIE') counts.alliancesEvents += 1;
    else if (ev.category === 'COMMERCE') counts.tradeDealsSigned += 1;
    else if (ev.category === 'POLITIQUE') counts.politicalEvents += 1;
    else if (ev.category === 'ÉCONOMIE' || ev.category === 'CRISE') counts.economicEvents += 1;
  }

  // Prioritize player-involved events, wars/peace treaties, and political milestones
  const scoredHighlights = [...collectedEvents].sort((a, b) => {
    const score = (e: WorldEvent) => {
      let s = 0;
      if (playerId && e.involvedCountryIds.includes(playerId)) s += 50;
      if (e.category === 'GUERRE' || e.category === 'PAIX') s += 20;
      else if (e.category === 'POLITIQUE') s += 12;
      else if (e.category === 'DIPLOMATIE') s += 8;
      else if (e.category === 'CRISE') s += 6;
      return s;
    };
    const diff = score(b) - score(a);
    return diff !== 0 ? diff : b.monthIndex - a.monthIndex;
  });

  const ongoingPlayerWars = playerId
    ? current.wars.filter(
        (w) =>
          w.aggressorId === playerId ||
          w.defenderId === playerId ||
          w.aggressorAllies.includes(playerId) ||
          w.defenderAllies.includes(playerId)
      )
    : [];

  const summary: SimulationSummary = {
    startDateLabel,
    endDateLabel: formatDateFr(current.year, current.month),
    startYear,
    endYear: current.year,
    monthsSimulated,
    playerBefore,
    playerAfter: capturePlayerSnapshot(current),
    playerWarOutcomes,
    ongoingPlayerWars,
    territorialChanges,
    counts,
    highlights: scoredHighlights.slice(0, 32),
  };

  return {
    nextState: current,
    summary,
  };
}

