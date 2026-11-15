import {
  CountryState,
  WorldEvent,
  WorldState,
} from '../types/game';
import {
  declareWarBetween,
  formatDateFr,
  formTreatyCoalition,
  getRelation,
  isAtWarBetween,
  pairKey,
  resolvePeaceTreaty,
  setRelation,
  signTradeDeal,
} from './simulationEngine';

export interface FreeActionTargetImpact {
  countryId: string;
  countryName: string;
  relationDelta: number;
  gdpPctDelta: number;
  armyDeltaK: number;
  stabilityDelta: number;
  populationPctDelta: number;
  declareWar?: boolean;
  makePeace?: boolean;
  formAlliance?: boolean;
  formEconomicUnion?: boolean;
  signTradeDeal?: boolean;
  signNonAggression?: boolean;
  nuclearStrike?: boolean;
}

export interface FreeActionEffect {
  summaryTitle: string;
  narrative: string;
  category:
    | 'GUERRE'
    | 'PAIX'
    | 'DIPLOMATIE'
    | 'ÉCONOMIE'
    | 'COMMERCE'
    | 'CRISE'
    | 'POLITIQUE';
  playerTreasuryDelta: number;
  playerGdpPctDelta: number;
  playerArmyDeltaK: number;
  playerStabilityDelta: number;
  playerApprovalDelta: number;
  playerTechDelta: number;
  playerPopulationPctDelta: number;
  globalRelationDelta: number;
  targetImpacts: FreeActionTargetImpact[];
  usedAi?: boolean;
}

export interface FreeActionLogEntry {
  id: string;
  dateLabel: string;
  prompt: string;
  effect: FreeActionEffect;
  statBadges: string[];
  usedAi: boolean;
}

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’'`]/g, ' ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const COUNTRY_ALIASES: Record<string, string[]> = {
  '840': ['usa', 'etats unis', 'etats-unis', 'amerique', 'washington'],
  '826': ['royaume uni', 'royaume-uni', 'angleterre', 'grande bretagne', 'londres'],
  '250': ['france', 'paris', 'republique francaise'],
  '276': ['allemagne', 'berlin'],
  '724': ['espagne', 'madrid'],
  '504': ['maroc', 'rabat'],
  '450': ['madagascar', 'antananarivo'],
  '156': ['chine', 'pekin', 'beijing'],
  '643': ['russie', 'moscou'],
  '380': ['italie', 'rome'],
  '620': ['portugal', 'lisbonne'],
  '056': ['belgique', 'bruxelles'],
  '756': ['suisse', 'berne'],
  '012': ['algerie', 'alger'],
  '788': ['tunisie', 'tunis'],
  '818': ['egypte', 'le caire'],
  '792': ['turquie', 'ankara'],
  '392': ['japon', 'tokyo'],
  '356': ['inde', 'new delhi'],
  '076': ['bresil', 'brasilia'],
  '124': ['canada', 'ottawa'],
  '484': ['mexique', 'mexico'],
  '036': ['australie', 'canberra'],
  '682': ['arabie saoudite', 'riyad'],
  '784': ['emirats arabes unis', 'emirats', 'dubai'],
  '616': ['pologne', 'varsovie'],
  '804': ['ukraine', 'kiev', 'kyiv'],
  '410': ['coree du sud', 'seoul'],
  '408': ['coree du nord', 'pyongyang'],
  '376': ['israel', 'jerusalem'],
  '364': ['iran', 'teheran'],
};

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function extractMentionedCountries(
  world: WorldState,
  text: string,
  excludePlayerId?: string | null
): CountryState[] {
  const norm = ` ${normalizeText(text)} `;
  const sovereigns = Object.values(world.countries).filter((c) => c.ownerId === c.id);
  const found: CountryState[] = [];
  const seen = new Set<string>();

  for (const c of sovereigns) {
    if (excludePlayerId && c.id === excludePlayerId) continue;

    const candidates = new Set<string>();
    candidates.add(normalizeText(c.nameFr));
    candidates.add(normalizeText(c.nameEn));
    if (c.capital && c.capital.length >= 4) {
      candidates.add(normalizeText(c.capital));
    }
    const aliases = COUNTRY_ALIASES[c.id];
    if (aliases) {
      for (const a of aliases) candidates.add(normalizeText(a));
    }

    for (const candidate of candidates) {
      if (!candidate || candidate.length < 3) continue;
      const pattern = new RegExp(`(^|\\s|-)${escapeRegex(candidate)}($|\\s|-)`, 'i');
      if (pattern.test(norm)) {
        if (!seen.has(c.id)) {
          seen.add(c.id);
          found.push(c);
        }
        break;
      }
    }
  }

  return found;
}

export function interpretFreeActionLocally(
  world: WorldState,
  rawPrompt: string
): FreeActionEffect {
  const player = world.playerCountryId ? world.countries[world.playerCountryId] : null;
  if (!player) {
    return {
      summaryTitle: 'Décision impossible',
      narrative: 'Aucune nation dirigée par le joueur.',
      category: 'POLITIQUE',
      playerTreasuryDelta: 0,
      playerGdpPctDelta: 0,
      playerArmyDeltaK: 0,
      playerStabilityDelta: 0,
      playerApprovalDelta: 0,
      playerTechDelta: 0,
      playerPopulationPctDelta: 0,
      globalRelationDelta: 0,
      targetImpacts: [],
      usedAi: false,
    };
  }

  const norm = normalizeText(rawPrompt);
  const mentioned = extractMentionedCountries(world, rawPrompt, player.id);

  // Detect intents
  const isNuclear =
    /\b(nucleaire|atomique|ogive|thermonucleaire|bombe a|bombe h|frappe nucleaire)\b/.test(
      norm
    );
  const isWar =
    isNuclear ||
    /\b(declarer la guerre|declarons la guerre|guerre a|guerre contre|attaquer|envahir|offensive|bombarder|envoyer l armee|frapper)\b/.test(
      norm
    );
  const isPeace =
    /\b(paix|cessez le feu|treve|armistice|reconcilier|arreter la guerre)\b/.test(norm);
  const isEconomicAlliance =
    (/\b(alliance|union|pacte|accord|zone)\b/.test(norm) &&
      /\b(economique|commercial|libre echange|douanier|marche|monetaire)\b/.test(norm)) ||
    /\b(accord commercial|partenariat commercial)\b/.test(norm);
  const isMilitaryAlliance =
    !isEconomicAlliance &&
    /\b(alliance|coalition|pacte de defense|alliance militaire|allier|traité d alliance)\b/.test(
      norm
    );
  const isNonAggression = /\b(non agression|non-agression)\b/.test(norm);
  const isInfrastructure =
    /\b(pont|tunnel|route|autoroute|rail|tgv|ferroviaire|port|aeroport|canal|barrage|infrastructure|centrale|energie)\b/.test(
      norm
    );
  const isEconomy =
    /\b(economie|economique|pib|industrie|usine|croissance|developper|investir|moderniser|subvention|commerce|export|reforme)\b/.test(
      norm
    );
  const isInfluence =
    /\b(influence|rayonnement|diplomatie|soft power|prestige|culture|sommet|cooperation|aide)\b/.test(
      norm
    );
  const isMilitaryBuild =
    !isWar &&
    /\b(armee|recruter|soldats|char|aviation|marine|defense|armement|mobiliser|flotte)\b/.test(
      norm
    );
  const isResearch =
    /\b(recherche|science|universite|technologie|ia|spatial|espace|innovation|education)\b/.test(
      norm
    );
  const isSocial =
    /\b(social|sante|hopital|ecole|pouvoir d achat|stabilite|logement|retraite)\b/.test(norm);

  const wantsMultiple = /\b(plusieurs|tous|europe|afrique|asie|monde|voisins|pays)\b/.test(
    norm
  );

  // Pick automatic partners if player asked for "plusieurs pays" or alliance without naming specific states
  let targets = [...mentioned];
  if (targets.length === 0 && (isEconomicAlliance || isMilitaryAlliance || isNonAggression)) {
    const candidates = Object.values(world.countries)
      .filter(
        (c) =>
          c.ownerId === c.id &&
          c.id !== player.id &&
          !isAtWarBetween(world, player.id, c.id)
      )
      .sort((a, b) => {
        const relDiff = getRelation(world, player.id, b.id) - getRelation(world, player.id, a.id);
        if (Math.abs(relDiff) > 8) return relDiff;
        return b.gdp - a.gdp;
      });
    targets = candidates.slice(0, wantsMultiple ? 4 : 2);
  } else if (
    targets.length === 0 &&
    (isWar || isPeace || isNuclear) &&
    world.selectedCountryId &&
    world.selectedCountryId !== player.id &&
    world.countries[world.selectedCountryId]
  ) {
    targets = [world.countries[world.selectedCountryId]];
  }

  let playerTreasuryDelta = 0;
  let playerGdpPctDelta = 0;
  let playerArmyDeltaK = 0;
  let playerStabilityDelta = 0;
  let playerApprovalDelta = 0;
  let playerTechDelta = 0;
  let playerPopulationPctDelta = 0;
  let globalRelationDelta = 0;
  let category: FreeActionEffect['category'] = 'POLITIQUE';
  const narratives: string[] = [];
  const targetImpacts: FreeActionTargetImpact[] = [];

  const ensureTarget = (c: CountryState): FreeActionTargetImpact => {
    let existing = targetImpacts.find((t) => t.countryId === c.id);
    if (!existing) {
      existing = {
        countryId: c.id,
        countryName: c.nameFr,
        relationDelta: 0,
        gdpPctDelta: 0,
        armyDeltaK: 0,
        stabilityDelta: 0,
        populationPctDelta: 0,
      };
      targetImpacts.push(existing);
    }
    return existing;
  };

  // 1. Nuclear operation (fictional game simulation)
  if (isNuclear) {
    category = 'CRISE';
    playerTreasuryDelta -= 18;
    playerStabilityDelta -= 10;
    playerApprovalDelta -= 12;
    globalRelationDelta -= 28;
    if (targets.length > 0) {
      for (const t of targets) {
        const ti = ensureTarget(t);
        ti.nuclearStrike = true;
        ti.declareWar = true;
        ti.relationDelta -= 100;
        ti.gdpPctDelta -= 18;
        ti.armyDeltaK -= Math.max(25, Math.round(t.army * 0.45));
        ti.stabilityDelta -= 32;
        ti.populationPctDelta -= 6;
      }
      narratives.push(
        `Opération nucléaire fictive exécutée contre ${targets.map((t) => t.nameFr).join(', ')} : destructions majeures simulées, état de guerre immédiat et condamnation internationale sévère.`
      );
    } else {
      playerTechDelta += 0.06;
      narratives.push(
        `Essai et déploiement de dissuasion nucléaire fictive ordonnés par ${player.nameFr}. Les chancelleries mondiales réagissent avec une vive inquiétude.`
      );
    }
  } else if (isWar && targets.length > 0) {
    // 2. Conventional war declaration
    category = 'GUERRE';
    playerTreasuryDelta -= 6;
    playerStabilityDelta -= 4;
    globalRelationDelta -= 8;
    for (const t of targets) {
      const ti = ensureTarget(t);
      ti.declareWar = true;
      ti.relationDelta -= 80;
    }
    narratives.push(
      `${player.nameFr} lance une offensive militaire et déclare la guerre à ${targets.map((t) => t.nameFr).join(', ')}. Les armées entrent immédiatement en campagne.`
    );
  }

  // 3. Peace treaties
  if (isPeace && !isWar) {
    category = 'PAIX';
    playerStabilityDelta += 6;
    playerApprovalDelta += 6;
    globalRelationDelta += 5;
    if (targets.length > 0) {
      for (const t of targets) {
        const ti = ensureTarget(t);
        ti.makePeace = true;
        ti.relationDelta += 25;
      }
      narratives.push(
        `Initiative de paix lancée envers ${targets.map((t) => t.nameFr).join(', ')} : ouverture de négociations et détente immédiate.`
      );
    } else {
      narratives.push(
        `${player.nameFr} promeut un plan diplomatique de désescalade et de paix mondiale.`
      );
    }
  }

  // 4. Economic / Military Alliances
  if ((isEconomicAlliance || isMilitaryAlliance || isNonAggression) && !isWar) {
    category = isEconomicAlliance ? 'COMMERCE' : 'DIPLOMATIE';
    for (const t of targets) {
      const ti = ensureTarget(t);
      if (isEconomicAlliance) {
        ti.formEconomicUnion = true;
        ti.signTradeDeal = true;
        ti.relationDelta += 16;
        ti.gdpPctDelta += 1.2;
      }
      if (isMilitaryAlliance) {
        ti.formAlliance = true;
        ti.relationDelta += 18;
      }
      if (isNonAggression) {
        ti.signNonAggression = true;
        ti.relationDelta += 10;
      }
    }
    if (isEconomicAlliance) {
      playerGdpPctDelta += 1.6;
      playerTreasuryDelta -= 3;
      narratives.push(
        `Création d’une alliance économique et commerciale avec ${targets.map((t) => t.nameFr).join(', ')}, stimulant les échanges et la croissance.`
      );
    }
    if (isMilitaryAlliance) {
      playerStabilityDelta += 3;
      narratives.push(
        `Pacte de défense stratégique conclu avec ${targets.map((t) => t.nameFr).join(', ')}.`
      );
    }
    if (isNonAggression) {
      narratives.push(
        `Accord de non-agression ratifié avec ${targets.map((t) => t.nameFr).join(', ')}.`
      );
    }
  }

  // 5. Infrastructure projects (bridges, roads, ports, rail, energy...)
  if (isInfrastructure) {
    if (category === 'POLITIQUE') category = 'ÉCONOMIE';
    const cost = Math.min(24, Math.max(5, Math.round(player.gdp * 0.012)));
    playerTreasuryDelta -= cost;
    playerGdpPctDelta += 1.6;
    playerTechDelta += 0.03;
    playerStabilityDelta += 3;
    playerApprovalDelta += 3;

    if (targets.length > 0 && !isWar) {
      for (const t of targets) {
        const ti = ensureTarget(t);
        ti.relationDelta += 18;
        ti.gdpPctDelta += 1.5;
        ti.signTradeDeal = true;
      }
      narratives.push(
        `Grand chantier d’infrastructures lancé en partenariat avec ${targets.map((t) => t.nameFr).join(' et ')} (${cost} Mds $ investis) : essor logistique, croissance du PIB et net réchauffement diplomatique.`
      );
    } else {
      narratives.push(
        `Programme national d’infrastructures et de corridors de transport engagé (${cost} Mds $) : productivité, emploi et cohésion territoriale en hausse.`
      );
    }
  }

  // 6. Economic stimulus / reforms
  if (isEconomy && !isEconomicAlliance && !isInfrastructure) {
    category = 'ÉCONOMIE';
    const cost = Math.min(18, Math.max(4, Math.round(player.gdp * 0.009)));
    playerTreasuryDelta -= cost;
    playerGdpPctDelta += 1.9;
    playerApprovalDelta += 3;
    playerStabilityDelta += 2;
    narratives.push(
      `Plan de développement économique et industriel adopté (${cost} Mds $) : dynamisation de la production nationale et hausse du PIB.`
    );
  }

  // 7. Diplomatic influence / soft power
  if (isInfluence && !isWar) {
    if (category === 'POLITIQUE') category = 'DIPLOMATIE';
    const cost = Math.min(10, Math.max(2, Math.round(player.gdp * 0.004)));
    playerTreasuryDelta -= cost;
    globalRelationDelta += 5;
    playerApprovalDelta += 3;
    for (const t of targets) {
      const ti = ensureTarget(t);
      ti.relationDelta += 14;
    }
    narratives.push(
      `Offensive d’influence diplomatique et culturelle déployée par ${player.nameFr} : rayonnement accru et amélioration des relations internationales.`
    );
  }

  // 8. Military modernization / recruitment
  if (isMilitaryBuild) {
    if (category === 'POLITIQUE') category = 'POLITIQUE';
    const cost = Math.min(16, Math.max(4, Math.round(player.gdp * 0.008)));
    const addedTroops = Math.max(25, Math.round(player.army * 0.12));
    playerTreasuryDelta -= cost;
    playerArmyDeltaK += addedTroops;
    playerTechDelta += 0.02;
    globalRelationDelta -= 2;
    narratives.push(
      `Renforcement des capacités militaires de ${player.nameFr} (+${addedTroops}k soldats, ${cost} Mds $) : capacité de dissuasion accrue.`
    );
  }

  // 9. Research & technology
  if (isResearch) {
    if (category === 'POLITIQUE') category = 'ÉCONOMIE';
    const cost = Math.min(15, Math.max(3, Math.round(player.gdp * 0.007)));
    playerTreasuryDelta -= cost;
    playerTechDelta += 0.06;
    playerGdpPctDelta += 0.9;
    narratives.push(
      `Programme d’innovation scientifique et technologique financé (${cost} Mds $) : niveau technologique et compétitivité en progrès.`
    );
  }

  // 10. Social / domestic stability reforms
  if (isSocial) {
    const cost = Math.min(14, Math.max(3, Math.round(player.gdp * 0.006)));
    playerTreasuryDelta -= cost;
    playerStabilityDelta += 7;
    playerApprovalDelta += 8;
    narratives.push(
      `Réforme sociale et investissement public adoptés (${cost} Mds $) : la stabilité intérieure et le soutien populaire progressent.`
    );
  }

  // Generic creative decree fallback (ensures literally ANY sentence still has coherent effects!)
  if (narratives.length === 0) {
    const cost = Math.min(10, Math.max(2, Math.round(player.gdp * 0.005)));
    playerTreasuryDelta -= cost;
    playerGdpPctDelta += 0.8;
    playerStabilityDelta += 3;
    playerApprovalDelta += 3;
    globalRelationDelta += targets.length > 0 ? 0 : 2;

    for (const t of targets) {
      const ti = ensureTarget(t);
      ti.relationDelta += 8;
    }

    narratives.push(
      `Directive souveraine « ${rawPrompt.trim().slice(0, 90)} » promulguée par ${player.leaderTitle} ${player.leaderName}. L’administration mobilise ${cost} Mds $ pour en déployer les effets économiques et stratégiques.`
    );
  }

  const trimmedPrompt = rawPrompt.trim();
  const summaryTitle =
    trimmedPrompt.length > 58 ? `${trimmedPrompt.slice(0, 55)}...` : trimmedPrompt;

  return {
    summaryTitle,
    narrative: narratives.join(' '),
    category,
    playerTreasuryDelta: Number(playerTreasuryDelta.toFixed(1)),
    playerGdpPctDelta: Number(playerGdpPctDelta.toFixed(2)),
    playerArmyDeltaK: Math.round(playerArmyDeltaK),
    playerStabilityDelta: Math.round(playerStabilityDelta),
    playerApprovalDelta: Math.round(playerApprovalDelta),
    playerTechDelta: Number(playerTechDelta.toFixed(2)),
    playerPopulationPctDelta: Number(playerPopulationPctDelta.toFixed(2)),
    globalRelationDelta: Math.round(globalRelationDelta),
    targetImpacts,
    usedAi: false,
  };
}

export function applyFreeActionEffect(
  state: WorldState,
  rawPrompt: string,
  effect: FreeActionEffect
): { nextState: WorldState; logEntry: FreeActionLogEntry } {
  const playerId = state.playerCountryId;
  if (!playerId || !state.countries[playerId]) {
    return {
      nextState: state,
      logEntry: {
        id: `act-${Date.now()}`,
        dateLabel: formatDateFr(state.year, state.month),
        prompt: rawPrompt,
        effect,
        statBadges: [],
        usedAi: Boolean(effect.usedAi),
      },
    };
  }

  let next: WorldState = {
    ...state,
    countries: { ...state.countries },
    relations: { ...state.relations },
    nonAggressionPacts: [...state.nonAggressionPacts],
    alliances: [...state.alliances],
    tradeDeals: [...(state.tradeDeals ?? [])],
    wars: [...state.wars],
    events: [...state.events],
  };

  const dateLabel = formatDateFr(next.year, next.month);
  const p = next.countries[playerId];
  const statBadges: string[] = [];

  // Apply player stat changes
  const nextTreasury = Number((p.treasury + effect.playerTreasuryDelta).toFixed(2));
  const nextGdp = Math.max(
    1,
    Number((p.gdp * (1 + effect.playerGdpPctDelta / 100)).toFixed(1))
  );
  const nextArmy = Math.max(1, Math.round(p.army + effect.playerArmyDeltaK));
  const nextStability = Math.max(5, Math.min(100, Math.round(p.stability + effect.playerStabilityDelta)));
  const nextApproval = Math.max(5, Math.min(100, Math.round(p.approval + effect.playerApprovalDelta)));
  const nextTech = Math.max(
    1.0,
    Math.min(3.5, Number((p.techLevel + effect.playerTechDelta).toFixed(2)))
  );
  const nextPop = Math.max(
    0.1,
    Number((p.population * (1 + effect.playerPopulationPctDelta / 100)).toFixed(1))
  );

  next.countries[playerId] = {
    ...p,
    treasury: nextTreasury,
    gdp: nextGdp,
    army: nextArmy,
    stability: nextStability,
    approval: nextApproval,
    techLevel: nextTech,
    population: nextPop,
  };

  if (effect.playerTreasuryDelta !== 0) {
    statBadges.push(
      `Trésor ${effect.playerTreasuryDelta > 0 ? '+' : ''}${effect.playerTreasuryDelta} Md $`
    );
  }
  if (effect.playerGdpPctDelta !== 0) {
    statBadges.push(
      `PIB ${effect.playerGdpPctDelta > 0 ? '+' : ''}${effect.playerGdpPctDelta}%`
    );
  }
  if (effect.playerArmyDeltaK !== 0) {
    statBadges.push(
      `Armée ${effect.playerArmyDeltaK > 0 ? '+' : ''}${effect.playerArmyDeltaK}k`
    );
  }
  if (effect.playerStabilityDelta !== 0) {
    statBadges.push(
      `Stabilité ${effect.playerStabilityDelta > 0 ? '+' : ''}${effect.playerStabilityDelta}%`
    );
  }
  if (effect.playerTechDelta !== 0) {
    statBadges.push(
      `Tech ${effect.playerTechDelta > 0 ? '+' : ''}${effect.playerTechDelta}`
    );
  }

  // Apply global diplomatic influence/outcry across sovereign nations
  if (effect.globalRelationDelta !== 0) {
    for (const c of Object.values(next.countries)) {
      if (c.ownerId === c.id && c.id !== playerId) {
        const cur = getRelation(next, playerId, c.id);
        setRelation(next.relations, playerId, c.id, cur + effect.globalRelationDelta);
      }
    }
    statBadges.push(
      `Influence mondiale ${effect.globalRelationDelta > 0 ? '+' : ''}${effect.globalRelationDelta}`
    );
  }

  // Apply bilateral / multi-country impacts
  const affectedIds: string[] = [playerId];
  for (const impact of effect.targetImpacts) {
    const target = next.countries[impact.countryId];
    if (!target || target.id === playerId) continue;
    const sovereignTargetId = target.ownerId || target.id;
    const sovTarget = next.countries[sovereignTargetId];
    if (!sovTarget) continue;

    affectedIds.push(sovereignTargetId);

    // Update target stats
    next.countries[sovereignTargetId] = {
      ...sovTarget,
      gdp: Math.max(
        1,
        Number((sovTarget.gdp * (1 + (impact.gdpPctDelta || 0) / 100)).toFixed(1))
      ),
      army: Math.max(1, Math.round(sovTarget.army + (impact.armyDeltaK || 0))),
      stability: Math.max(
        5,
        Math.min(100, Math.round(sovTarget.stability + (impact.stabilityDelta || 0)))
      ),
      population: Math.max(
        0.1,
        Number(
          (sovTarget.population * (1 + (impact.populationPctDelta || 0) / 100)).toFixed(1)
        )
      ),
    };

    if (impact.relationDelta !== 0) {
      const curRel = getRelation(next, playerId, sovereignTargetId);
      setRelation(next.relations, playerId, sovereignTargetId, curRel + impact.relationDelta);
      statBadges.push(
        `${sovTarget.nameFr} ${impact.relationDelta > 0 ? '+' : ''}${impact.relationDelta}`
      );
    }

    if (impact.declareWar || impact.nuclearStrike) {
      if (!isAtWarBetween(next, playerId, sovereignTargetId)) {
        next = declareWarBetween(next, playerId, sovereignTargetId);
        statBadges.push(`Guerre : ${sovTarget.nameFr}`);
      }
    }

    if (impact.makePeace) {
      const existingWar = isAtWarBetween(next, playerId, sovereignTargetId);
      if (existingWar) {
        next = resolvePeaceTreaty(next, existingWar.id, 'STATUS_QUO');
        statBadges.push(`Paix : ${sovTarget.nameFr}`);
      }
    }

    if (impact.formEconomicUnion) {
      next = formTreatyCoalition(next, 'ECONOMIC_UNION', playerId, sovereignTargetId);
      statBadges.push(`Union éco. : ${sovTarget.nameFr}`);
    }

    if (impact.formAlliance) {
      next = formTreatyCoalition(next, 'ALLIANCE', playerId, sovereignTargetId);
      statBadges.push(`Alliance : ${sovTarget.nameFr}`);
    }

    if (impact.signNonAggression) {
      const pk = pairKey(playerId, sovereignTargetId);
      if (!next.nonAggressionPacts.includes(pk)) {
        next.nonAggressionPacts.push(pk);
        statBadges.push(`Non-agression : ${sovTarget.nameFr}`);
      }
    }

    if (impact.signTradeDeal) {
      const { nextState } = signTradeDeal(next, playerId, sovereignTargetId);
      next = nextState;
    }
  }

  // If 2+ countries were positively connected in the same decree (e.g. bridge between Spain & Morocco),
  // warm bilateral relations between those countries too!
  if (
    effect.targetImpacts.length >= 2 &&
    effect.targetImpacts.every((ti) => ti.relationDelta > 0 && !ti.declareWar)
  ) {
    for (let i = 0; i < effect.targetImpacts.length; i++) {
      for (let j = i + 1; j < effect.targetImpacts.length; j++) {
        const a = effect.targetImpacts[i].countryId;
        const b = effect.targetImpacts[j].countryId;
        if (next.countries[a] && next.countries[b]) {
          const curAB = getRelation(next, a, b);
          setRelation(next.relations, a, b, curAB + 15);
        }
      }
    }
  }

  // Add WorldEvent to Chronicle
  const evt: WorldEvent = {
    id: `evt-action-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    dateLabel,
    monthIndex: next.monthIndex,
    category: effect.category,
    title: `${p.nameFr} · ${effect.summaryTitle}`,
    description: effect.narrative,
    involvedCountryIds: Array.from(new Set(affectedIds)),
  };

  next.events = [evt, ...next.events].slice(0, 80);

  const logEntry: FreeActionLogEntry = {
    id: `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    dateLabel,
    prompt: rawPrompt.trim(),
    effect,
    statBadges: Array.from(new Set(statBadges)),
    usedAi: Boolean(effect.usedAi),
  };

  return { nextState: next, logEntry };
}
