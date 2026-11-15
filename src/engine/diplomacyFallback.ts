import { CountryState, CrisisEvent } from '../types/game';

export interface DiplomacyFallbackInput {
  playerCountry: CountryState;
  targetCountry: CountryState;
  relation: number;
  isAtWar: boolean;
  isAllied: boolean;
  sameEconomicUnion: boolean;
  message: string;
}

export interface DiplomacyReplyResult {
  reply: string;
  relationDelta: number;
  action:
    | 'NONE'
    | 'ACCEPT_ALLIANCE'
    | 'REJECT_ALLIANCE'
    | 'ACCEPT_ECONOMIC_UNION'
    | 'REJECT_ECONOMIC_UNION'
    | 'ACCEPT_PEACE'
    | 'REJECT_PEACE'
    | 'DECLARE_WAR'
    | 'PROPOSE_NON_AGGRESSION';
  treatyNote?: string;
}

export function buildLocalDiplomaticReply(input: DiplomacyFallbackInput): DiplomacyReplyResult {
  const {
    playerCountry,
    targetCountry,
    relation,
    isAtWar,
    isAllied,
    sameEconomicUnion,
    message,
  } = input;

  const lower = message.toLowerCase();
  const titleName = `${targetCountry.leaderTitle} ${targetCountry.leaderName}`;
  const playerStronger = playerCountry.army >= targetCountry.army * 0.9;

  if (
    (lower.includes('déclar') && lower.includes('guerre')) ||
    lower.includes('insult') ||
    lower.includes('détrui')
  ) {
    return {
      relationDelta: -30,
      action: isAtWar ? 'NONE' : 'DECLARE_WAR',
      reply: `« Vos provocations franchissent une ligne rouge intolérable. ${targetCountry.nameFr} rompt les relations diplomatiques et mobilise immédiatement ses armées ! »`,
      treatyNote: `${targetCountry.nameFr} entre en guerre suite à une rupture diplomatique.`,
    };
  }

  if (isAtWar && (lower.includes('paix') || lower.includes('cessez') || lower.includes('trêve'))) {
    if (relation > -65 || playerStronger || targetCountry.personality === 'Pacifiste') {
      return {
        action: 'ACCEPT_PEACE',
        relationDelta: 18,
        reply: `« Les peuples méritent la fin de ces hostilités. Au nom de ${targetCountry.nameFr}, j’accepte de signer un cessez-le-feu immédiat avec ${playerCountry.nameFr}. »`,
        treatyNote: `${targetCountry.nameFr} et ${playerCountry.nameFr} conviennent d’un cessez-le-feu.`,
      };
    }
    return {
      action: 'REJECT_PEACE',
      relationDelta: -4,
      reply: `« Vos conditions ne reflètent pas la réalité du terrain. ${targetCountry.nameFr} poursuivra les opérations tant que nos intérêts ne seront pas garantis. »`,
    };
  }

  if (lower.includes('alliance') || lower.includes('défens') || lower.includes('pacte militaire')) {
    if (isAtWar) {
      return {
        action: 'REJECT_ALLIANCE',
        relationDelta: 0,
        reply: `« Aucune alliance ne peut être envisagée alors que nos nations s’affrontent militairement. »`,
      };
    }
    if (isAllied) {
      return {
        action: 'NONE',
        relationDelta: 4,
        reply: `« Notre alliance stratégique demeure solide, et ${targetCountry.nameFr} honore pleinement ses engagements envers ${playerCountry.nameFr}. »`,
      };
    }
    if (
      relation >= 35 ||
      (relation >= 15 && playerStronger && targetCountry.personality !== 'Expansionniste')
    ) {
      return {
        action: 'ACCEPT_ALLIANCE',
        relationDelta: 14,
        reply: `« Nos chancelleries partagent une vision commune de la sécurité régionale. ${targetCountry.nameFr} accepte de sceller une alliance officielle avec ${playerCountry.nameFr}. »`,
        treatyNote: `${targetCountry.nameFr} conclut une alliance avec ${playerCountry.nameFr}.`,
      };
    }
    return {
      action: 'REJECT_ALLIANCE',
      relationDelta: -2,
      reply: `« Bien que nous soyons attentifs à votre proposition, la confiance diplomatique reste insuffisante pour lier nos armées par un traité de défense. »`,
    };
  }

  if (
    lower.includes('union') ||
    lower.includes('économ') ||
    lower.includes('commerc') ||
    lower.includes('libre-échange') ||
    lower.includes('industrie')
  ) {
    if (isAtWar) {
      return {
        action: 'REJECT_ECONOMIC_UNION',
        relationDelta: 0,
        reply: `« Les échanges économiques sont suspendus tant que dure l’état de guerre. »`,
      };
    }
    if (sameEconomicUnion) {
      return {
        action: 'NONE',
        relationDelta: 5,
        reply: `« Notre appartenance commune à l’union économique porte déjà ses fruits pour la prospérité de ${targetCountry.nameFr} et de ${playerCountry.nameFr}. »`,
      };
    }
    if (relation >= 18 || (targetCountry.personality === 'Mercantile' && relation >= 0)) {
      return {
        action: 'ACCEPT_ECONOMIC_UNION',
        relationDelta: 12,
        reply: `« Le développement de nos échanges commerciaux et industriels est une priorité pour ${targetCountry.nameFr}. J’accepte votre proposition d’union économique. »`,
        treatyNote: `${targetCountry.nameFr} et ${playerCountry.nameFr} s’unissent économiquement.`,
      };
    }
    return {
      action: 'REJECT_ECONOMIC_UNION',
      relationDelta: 0,
      reply: `« Les divergences réglementaires et politiques entre nos deux pays ne permettent pas encore une intégration économique. »`,
    };
  }

  if (lower.includes('non-agression') || lower.includes('non agression')) {
    if (!isAtWar && relation >= -15) {
      return {
        action: 'PROPOSE_NON_AGGRESSION',
        relationDelta: 8,
        reply: `« ${targetCountry.nameFr} accueille favorablement cet engagement de stabilité et ratifie un pacte de non-agression avec ${playerCountry.nameFr}. »`,
      };
    }
    return {
      action: 'NONE',
      relationDelta: 0,
      reply: `« Les tensions actuelles ne nous permettent pas de signer un tel pacte pour le moment. »`,
    };
  }

  if (lower.includes('menace') || lower.includes('ultimatum') || lower.includes('retrait')) {
    return {
      action: 'NONE',
      relationDelta: -16,
      reply: `« ${titleName} rejette fermement toute tentative d’intimidation. ${targetCountry.nameFr} défendra sa souveraineté sans faillir. »`,
    };
  }

  if (
    lower.includes('bonjour') ||
    lower.includes('amitié') ||
    lower.includes('coopér') ||
    lower.includes('salut')
  ) {
    return {
      action: 'NONE',
      relationDelta: 6,
      reply: `« ${titleName} vous adresse ses salutations depuis ${targetCountry.nameFr}. Nous sommes disposés à approfondir le dialogue constructif avec ${playerCountry.nameFr}. »`,
    };
  }

  return {
    action: 'NONE',
    relationDelta: relation >= 0 ? 3 : -2,
    reply: `« ${titleName} de ${targetCountry.nameFr} a pris bonne note de votre dépêche. Notre gouvernement (${targetCountry.personality.toLowerCase()}) évaluera la suite à donner selon nos intérêts nationaux. »`,
  };
}

const LOCAL_CRISES: CrisisEvent[] = [
  {
    title: 'Sommet énergétique et commercial international',
    description:
      'Une flambée des coûts maritimes fragilise les chaînes d’approvisionnement mondiales. Votre gouvernement doit arbitrer sa réponse stratégique.',
    optionALabel: 'Subventionner l’industrie et sécuriser les corridors',
    optionATreasuryDelta: -12,
    optionAStabilityDelta: 5,
    optionAGdpPctDelta: 1.4,
    optionBLabel: 'Maintenir la rigueur budgétaire et relever les tarifs',
    optionBTreasuryDelta: 8,
    optionBStabilityDelta: -4,
    optionBGdpPctDelta: -0.5,
  },
  {
    title: 'Forum de défense et souveraineté technologique',
    description:
      'Plusieurs consortiums proposent d’implanter des centres stratégiques de semi-conducteurs et de défense sur votre territoire.',
    optionALabel: 'Cofinancer un pôle industriel souverain',
    optionATreasuryDelta: -14,
    optionAStabilityDelta: 4,
    optionAGdpPctDelta: 2.1,
    optionBLabel: 'Privilégier la réduction de la dette publique',
    optionBTreasuryDelta: 10,
    optionBStabilityDelta: -2,
    optionBGdpPctDelta: 0.2,
  },
  {
    title: 'Mouvement social sur le pouvoir d’achat',
    description:
      'Des syndicats et collectivités réclament un plan d’urgence face à l’inflation des biens essentiels.',
    optionALabel: 'Débloquer une aide sociale exceptionnelle',
    optionATreasuryDelta: -8,
    optionAStabilityDelta: 8,
    optionAGdpPctDelta: 0.5,
    optionBLabel: 'Refuser toute dépense supplémentaire',
    optionBTreasuryDelta: 3,
    optionBStabilityDelta: -7,
    optionBGdpPctDelta: 0.1,
  },
];

export function buildLocalCrisisEvent(): CrisisEvent {
  return LOCAL_CRISES[Math.floor(Math.random() * LOCAL_CRISES.length)];
}
