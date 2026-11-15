import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Crown, MessageSquareText, RotateCcw } from 'lucide-react';
import { ChatHubPanel } from './components/ChatHubPanel';
import { ActionHubPanel, ActionSubView } from './components/ActionHubPanel';
import { NationSelectPanel } from './components/NationSelectPanel';
import { WorldChronicle } from './components/WorldChronicle';
import { WorldMap } from './components/WorldMap';
import { WorldStatsModal } from './components/WorldStatsModal';
import { CrisisModal } from './components/CrisisModal';
import { WarOutcomeModal } from './components/WarOutcomeModal';
import { YearSimulatorBar } from './components/YearSimulatorBar';
import { SimulationSummaryModal } from './components/SimulationSummaryModal';
import { GameUiSettings, WelcomeScreen } from './components/WelcomeScreen';
import { StartChoiceScreen } from './components/StartChoiceScreen';
import { CustomNationPanel, TutorialStepId } from './components/CustomNationPanel';
import { CountryFlag, PRESET_NATION_IMAGES } from './components/CountryFlag';
import { PickerToolMode, TerritoryPickerModal } from './components/TerritoryPickerModal';
import {
  advanceMonth,
  declareWarBetween,
  enactNationalDirective,
  formatDateFr,
  formTreatyCoalition,
  getCountryTotalStats,
  getRelation,
  isAtWarBetween,
  launchMajorOffensive,
  leaveCoalition,
  pairKey,
  recruitPlayerTroops,
  resolveIncomingProposal,
  resolvePeaceTreaty,
  sendFinancialAid,
  setRelation,
  sharesAlliance,
  signTradeDeal,
  simulateUntilYear,
  startGameWithCountry,
  startGameWithCustomCountry,
  updatePlayerPolicy,
} from './engine/simulationEngine';
import {
  buildLocalCrisisEvent,
  buildLocalDiplomaticReply,
  DiplomacyReplyResult,
} from './engine/diplomacyFallback';
import {
  applyFreeActionEffect,
  extractMentionedCountries,
  FreeActionEffect,
  FreeActionLogEntry,
  interpretFreeActionLocally,
} from './engine/freeActionEngine';
import { buildApiUrl, shouldAttemptBackendApi } from './lib/apiConfig';
import { createInitialWorldState, getMapData } from './engine/worldInit';
import {
  CountryPolicy,
  CustomCountryConfig,
  MapMode,
  SimulationSummary,
  WorldState,
} from './types/game';

type SetupMode = 'CHOOSE_MODE' | 'EXISTING' | 'CREATE_CUSTOM';

function createDefaultCustomConfig(): CustomCountryConfig {
  return {
    nameFr: 'République d’Aurelia',
    capital: 'Port-Souverain',
    territoryIds: ['250'],
    color: '#D97706',
    flag: {
      pattern: 'vertical3',
      primaryColor: '#0F294A',
      secondaryColor: '#F8FAFC',
      accentColor: '#F59E0B',
      emblem: 'star',
    },
    nationImage: PRESET_NATION_IMAGES[0].src,
    leaderTitle: 'Président',
    leaderName: 'Alexandre Valmont',
    regime: 'République démocratique',
    personality: 'Pragmatique',
    gdp: 950,
    treasury: 135,
    population: 34,
    army: 180,
    stability: 75,
    techLevel: 1.45,
    exportResource: 'Technologie',
    importResource: 'Énergie',
    doctrine: 'Équilibrée',
    taxRate: 25,
  };
}

const STORAGE_KEY = 'orbis_diplomatica_save_v1';
const SETTINGS_STORAGE_KEY = 'orbis_diplomatica_settings_v1';

export default function App() {
  const { features, spherePath, graticulePath } = useMemo(() => getMapData(), []);

  const [world, setWorld] = useState<WorldState>(() => {
    const fresh = createInitialWorldState();
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as WorldState;
        if (parsed && parsed.countries && parsed.phase) {
          return {
            ...fresh,
            ...parsed,
            countries: { ...fresh.countries, ...parsed.countries },
            tradeDeals: parsed.tradeDeals ?? [],
            selectedTerritoryId: parsed.selectedTerritoryId ?? parsed.selectedCountryId,
          };
        }
      }
    } catch {
      // Ignore invalid localStorage
    }
    return fresh;
  });

  const worldRef = useRef(world);
  worldRef.current = world;

  const [showWelcome, setShowWelcome] = useState(true);
  const [setupMode, setSetupMode] = useState<SetupMode>('CHOOSE_MODE');
  const [customMapClickMode, setCustomMapClickMode] = useState<'relocate' | 'expand'>('relocate');
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [mapPickerInitialTool, setMapPickerInitialTool] = useState<PickerToolMode>('relocate');
  const [territoryConfirmVersion, setTerritoryConfirmVersion] = useState(0);
  const [isCustomTutorialTerritoryStep, setIsCustomTutorialTerritoryStep] = useState(false);
  const [customConfig, setCustomConfig] = useState<CustomCountryConfig>(() =>
    createDefaultCustomConfig()
  );
  const [mapMode, setMapMode] = useState<MapMode>('politique');
  const [autoPlay, setAutoPlay] = useState(false);
  const [targetYear, setTargetYear] = useState<number>(() => Math.max(world.year + 4, 2030));
  const [isSimulating, setIsSimulating] = useState(false);
  const [simSummary, setSimSummary] = useState<SimulationSummary | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [activeHub, setActiveHub] = useState<'CHAT' | 'ACTION'>('ACTION');
  const [actionSubView, setActionSubView] = useState<ActionSubView>('free');
  const [mobileSheetOpen, setMobileSheetOpen] = useState(true);
  const [actionLogs, setActionLogs] = useState<FreeActionLogEntry[]>([]);
  const [isExecutingFreeAction, setIsExecutingFreeAction] = useState(false);
  const [isAiSending, setIsAiSending] = useState(false);
  const [isGeneratingCrisis, setIsGeneratingCrisis] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [focusTarget, setFocusTarget] = useState<[number, number] | null>(null);
  const [uiSettings, setUiSettings] = useState<GameUiSettings>(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<GameUiSettings>;
        return {
          animationsEnabled: parsed.animationsEnabled ?? true,
          autoPlaySpeedMs:
            typeof parsed.autoPlaySpeedMs === 'number' ? parsed.autoPlaySpeedMs : 2400,
        };
      }
    } catch {
      // Ignore invalid settings
    }
    return { animationsEnabled: true, autoPlaySpeedMs: 2400 };
  });

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(uiSettings));
    } catch {
      // Ignore quota errors
    }
  }, [uiSettings]);

  // Persist game state
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(world));
    } catch {
      // Ignore quota errors
    }
  }, [world]);

  const showToast = useCallback((msg: string) => {
    setFeedback(msg);
    setTimeout(() => {
      setFeedback((prev) => (prev === msg ? null : prev));
    }, 4000);
  }, []);

  // Keep selected destination year >= current year when manually advancing
  useEffect(() => {
    if (!isSimulating && world.year > targetYear) {
      setTargetYear(world.year + 1);
    }
  }, [world.year, targetYear, isSimulating]);

  const handleAdvanceMonth = useCallback(() => {
    setWorld((prev) => {
      if (prev.phase !== 'PLAYING' || prev.pendingCrisis || prev.pendingWarOutcome) return prev;
      return advanceMonth(prev);
    });
  }, []);

  // Auto-advance timer when autoPlay is enabled
  useEffect(() => {
    if (
      !autoPlay ||
      isSimulating ||
      world.phase !== 'PLAYING' ||
      world.pendingCrisis ||
      world.pendingWarOutcome
    ) {
      return;
    }
    const timer = setInterval(() => {
      setWorld((prev) => {
        if (prev.phase !== 'PLAYING' || prev.pendingCrisis || prev.pendingWarOutcome) return prev;
        return advanceMonth(prev);
      });
    }, uiSettings.autoPlaySpeedMs);
    return () => clearInterval(timer);
  }, [
    autoPlay,
    isSimulating,
    world.phase,
    world.pendingCrisis,
    world.pendingWarOutcome,
    uiSettings.autoPlaySpeedMs,
  ]);

  const handleStartSimulation = useCallback(() => {
    if (
      isSimulating ||
      world.phase !== 'PLAYING' ||
      world.pendingCrisis ||
      world.pendingWarOutcome ||
      targetYear <= world.year
    ) {
      return;
    }
    setAutoPlay(false);
    setIsSimulating(true);
    const { nextState, summary } = simulateUntilYear(world, targetYear);
    setWorld(nextState);
    setSimSummary(summary);
    setIsSimulating(false);
    showToast(`Simulation terminée : ${summary.endDateLabel} atteint.`);
  }, [
    isSimulating,
    world,
    targetYear,
    showToast,
  ]);

  const handleSelectCountry = useCallback((countryId: string, territoryId?: string) => {
    setWorld((prev) => {
      if (prev.phase === 'PLAYING' && prev.playerCountryId) {
        setActionSubView((curr) =>
          curr === 'free' ? 'free' : countryId !== prev.playerCountryId ? 'diplomacy' : 'nation'
        );
        setMobileSheetOpen(true);
      }
      return {
        ...prev,
        selectedCountryId: countryId,
        selectedTerritoryId: territoryId ?? countryId,
      };
    });
  }, []);

  const handleFocusCountry = useCallback(
    (countryId: string) => {
      const c = world.countries[countryId];
      if (!c) return;
      const sovereignId = c.ownerId || countryId;
      setWorld((prev) => {
        if (prev.phase === 'PLAYING' && prev.playerCountryId) {
          setActionSubView((curr) =>
            curr === 'free'
              ? 'free'
              : sovereignId !== prev.playerCountryId
                ? 'diplomacy'
                : 'nation'
          );
        }
        return {
          ...prev,
          selectedCountryId: sovereignId,
          selectedTerritoryId: countryId,
        };
      });
      setFocusTarget([...c.centroid]);
    },
    [world.countries]
  );

  const handleStartGame = useCallback((countryId: string) => {
    setWorld((prev) => startGameWithCountry(prev, countryId));
    setAutoPlay(false);
    setIsSimulating(false);
    setSimSummary(null);
    setTargetYear(2030);
    setActiveHub('ACTION');
    setActionSubView('free');
    setActionLogs([]);
    setMobileSheetOpen(true);
  }, []);

  const handleStartCustomGame = useCallback(() => {
    setWorld((prev) => startGameWithCustomCountry(prev, customConfig));
    setAutoPlay(false);
    setIsSimulating(false);
    setSimSummary(null);
    setTargetYear(2030);
    setActiveHub('ACTION');
    setActionSubView('free');
    setActionLogs([]);
    setMobileSheetOpen(true);
  }, [customConfig]);

  const handleToggleCustomTerritory = useCallback((territoryId: string) => {
    setCustomConfig((prev) => {
      const exists = prev.territoryIds.includes(territoryId);
      if (exists) {
        if (prev.territoryIds.length <= 1) return prev;
        return {
          ...prev,
          territoryIds: prev.territoryIds.filter((id) => id !== territoryId),
        };
      }
      return {
        ...prev,
        territoryIds: [...prev.territoryIds, territoryId],
      };
    });
  }, []);

  const handleCustomMapClick = useCallback(
    (countryId: string, territoryId?: string, svgCoords?: [number, number]) => {
      const tid = territoryId ?? countryId;
      if (customMapClickMode === 'relocate') {
        setCustomConfig((prev) => ({
          ...prev,
          territoryIds: [tid],
          capitalCoords: svgCoords ?? world.countries[tid]?.centroid,
        }));
      } else {
        handleToggleCustomTerritory(tid);
      }
      handleSelectCountry(countryId, tid);
    },
    [customMapClickMode, handleSelectCountry, handleToggleCustomTerritory, world.countries]
  );

  const handleOpenMapPicker = useCallback((tool: PickerToolMode = 'relocate') => {
    setMapPickerInitialTool(tool);
    setIsMapPickerOpen(true);
  }, []);

  const handleResetGame = useCallback(() => {
    setAutoPlay(false);
    setIsSimulating(false);
    setSimSummary(null);
    setTargetYear(2030);
    setShowStats(false);
    setShowWelcome(false);
    setActiveHub('ACTION');
    setActionSubView('free');
    setActionLogs([]);
    setMobileSheetOpen(true);
    setSetupMode('CHOOSE_MODE');
    setCustomMapClickMode('relocate');
    setIsMapPickerOpen(false);
    setTerritoryConfirmVersion(0);
    setIsCustomTutorialTerritoryStep(false);
    setCustomConfig(createDefaultCustomConfig());
    setFocusTarget(null);
    localStorage.removeItem(STORAGE_KEY);
    setWorld(createInitialWorldState());
  }, []);

  const handleTutorialStateChange = useCallback(
    (isActive: boolean, stepId: TutorialStepId) => {
      setIsCustomTutorialTerritoryStep(isActive && stepId === 'territory');
    },
    []
  );

  const handleUpdatePolicy = useCallback((policy: Partial<CountryPolicy>) => {
    setWorld((prev) => updatePlayerPolicy(prev, policy));
  }, []);

  const handleRecruit = useCallback(
    (troopsK: number) => {
      setWorld((prev) => {
        const { nextState, error } = recruitPlayerTroops(prev, troopsK);
        if (error) {
          showToast(error);
          return prev;
        }
        showToast(`+${troopsK}k soldats mobilisés.`);
        return nextState;
      });
    },
    [showToast]
  );

  const handleDirective = useCallback(
    (directive: 'INFRASTRUCTURE' | 'COHESION' | 'RECHERCHE') => {
      setWorld((prev) => {
        const { nextState, error } = enactNationalDirective(prev, directive);
        if (error) {
          showToast(error);
          return prev;
        }
        showToast('Directive nationale promulguée.');
        return nextState;
      });
    },
    [showToast]
  );

  const handleLeaveCoalition = useCallback((allianceId: string) => {
    setWorld((prev) => {
      if (!prev.playerCountryId) return prev;
      return leaveCoalition(prev, allianceId, prev.playerCountryId);
    });
  }, []);

  const handlePeaceTreaty = useCallback(
    (
      warId: string,
      terms: 'STATUS_QUO' | 'REPARATIONS' | 'ANNEXATION' | 'CAPITULATION',
      forcedWinnerId?: string
    ) => {
      setWorld((prev) => resolvePeaceTreaty(prev, warId, terms, forcedWinnerId));
      showToast(terms === 'CAPITULATION' ? 'Capitulation imposée !' : 'Traité de paix signé.');
    },
    [showToast]
  );

  const handleLaunchOffensive = useCallback(
    (warId: string) => {
      setWorld((prev) => {
        const { nextState, error } = launchMajorOffensive(prev, warId);
        if (error) {
          showToast(error);
          return prev;
        }
        showToast('Offensive majeure ordonnée (+25 % puissance au prochain mois).');
        return nextState;
      });
    },
    [showToast]
  );

  const handleDeclareWar = useCallback(
    (targetId: string) => {
      setWorld((prev) => {
        if (!prev.playerCountryId) return prev;
        return declareWarBetween(prev, prev.playerCountryId, targetId);
      });
      showToast('État de guerre déclaré.');
    },
    [showToast]
  );

  const handleFormCoalition = useCallback(
    (type: 'ALLIANCE' | 'ECONOMIC_UNION', targetId: string) => {
      setWorld((prev) => {
        if (!prev.playerCountryId) return prev;
        const rel = getRelation(prev, prev.playerCountryId, targetId);
        const threshold = type === 'ALLIANCE' ? 40 : 25;
        if (rel < threshold) {
          showToast(
            `${prev.countries[targetId]?.nameFr} refuse pour l’instant (relation requise : +${threshold}, actuelle : ${rel}). Envoyez un message ou une aide.`
          );
          return prev;
        }
        showToast(
          type === 'ALLIANCE' ? 'Alliance militaire conclue.' : 'Union économique établie.'
        );
        return formTreatyCoalition(prev, type, prev.playerCountryId, targetId);
      });
    },
    [showToast]
  );

  const handleSendAid = useCallback(
    (targetId: string, amount: number) => {
      setWorld((prev) => {
        if (!prev.playerCountryId) return prev;
        const { nextState, error } = sendFinancialAid(
          prev,
          prev.playerCountryId,
          targetId,
          amount
        );
        if (error) {
          showToast(error);
          return prev;
        }
        showToast(`Aide financière de ${amount} Mds $ versée.`);
        return nextState;
      });
    },
    [showToast]
  );

  const handleSignNonAggression = useCallback(
    (targetId: string) => {
      setWorld((prev) => {
        if (!prev.playerCountryId) return prev;
        const rel = getRelation(prev, prev.playerCountryId, targetId);
        if (rel < -10) {
          showToast('Relations trop tendues pour un pacte de non-agression.');
          return prev;
        }
        const k = pairKey(prev.playerCountryId, targetId);
        if (prev.nonAggressionPacts.includes(k)) return prev;
        const nextRels = { ...prev.relations };
        setRelation(nextRels, prev.playerCountryId, targetId, rel + 8);
        showToast('Pacte de non-agression signé.');
        return {
          ...prev,
          relations: nextRels,
          nonAggressionPacts: [...prev.nonAggressionPacts, k],
        };
      });
    },
    [showToast]
  );

  const handleSignTradeDeal = useCallback(
    (targetId: string) => {
      setWorld((prev) => {
        if (!prev.playerCountryId) return prev;
        const { nextState, error } = signTradeDeal(prev, prev.playerCountryId, targetId);
        if (error) {
          showToast(error);
          return prev;
        }
        showToast(`Accord commercial signé avec ${prev.countries[targetId]?.nameFr}.`);
        return nextState;
      });
    },
    [showToast]
  );

  const handleResolveProposal = useCallback((proposalId: string, accept: boolean) => {
    setWorld((prev) => resolveIncomingProposal(prev, proposalId, accept));
  }, []);

  const handleSendAiMessage = useCallback(
    async (targetId: string, message: string) => {
      if (!world.playerCountryId || isAiSending) return;
      const player = world.countries[world.playerCountryId];
      const target = world.countries[targetId];
      if (!player || !target) return;

      const dateLabel = formatDateFr(world.year, world.month);
      const tKey = pairKey(player.id, target.id);
      const existingHistory = world.threads[tKey] || [];

      const playerMsg = {
        id: `msg-p-${Date.now()}`,
        sender: 'player' as const,
        senderLabel: `${player.nameFr} (Vous)`,
        text: message,
        dateLabel,
      };

      setWorld((prev) => ({
        ...prev,
        threads: {
          ...prev.threads,
          [tKey]: [...(prev.threads[tKey] || []), playerMsg],
        },
      }));

      setIsAiSending(true);
      try {
        const relationVal = getRelation(world, player.id, target.id);
        const isAtWarVal = Boolean(isAtWarBetween(world, player.id, target.id));
        const isAlliedVal = Boolean(
          sharesAlliance(world.alliances, player.id, target.id, 'ALLIANCE')
        );
        const sameEcoVal = Boolean(
          sharesAlliance(world.alliances, player.id, target.id, 'ECONOMIC_UNION')
        );

        let data: DiplomacyReplyResult | null = null;
        if (shouldAttemptBackendApi()) {
          try {
            const res = await fetch(buildApiUrl('/api/diplomacy/message'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                playerCountry: player,
                targetCountry: target,
                relation: relationVal,
                isAtWar: isAtWarVal,
                isAllied: isAlliedVal,
                sameEconomicUnion: sameEcoVal,
                message,
                history: existingHistory.map((m) => ({
                  sender: m.senderLabel,
                  text: m.text,
                })),
                currentDateLabel: dateLabel,
              }),
            });
            const contentType = res.headers.get('content-type') || '';
            if (res.ok && contentType.includes('application/json')) {
              const parsed = (await res.json()) as DiplomacyReplyResult;
              if (parsed?.reply) {
                data = parsed;
              }
            }
          } catch {
            // Static hosting or unreachable backend fallback below
          }
        }

        const resolvedData: DiplomacyReplyResult =
          data ??
          buildLocalDiplomaticReply({
            playerCountry: player,
            targetCountry: target,
            relation: relationVal,
            isAtWar: isAtWarVal,
            isAllied: isAlliedVal,
            sameEconomicUnion: sameEcoVal,
            message,
          });

        const aiReplyMsg = {
          id: `msg-ai-${Date.now()}`,
          sender: 'ai' as const,
          senderLabel: `${target.leaderTitle} ${target.leaderName}`,
          text: resolvedData.reply,
          dateLabel,
        };

        setWorld((prev) => {
          let next: WorldState = {
            ...prev,
            threads: {
              ...prev.threads,
              [tKey]: [...(prev.threads[tKey] || []), aiReplyMsg],
            },
          };

          const rels = { ...next.relations };
          const currentRel = getRelation(next, player.id, target.id);
          setRelation(rels, player.id, target.id, currentRel + (resolvedData.relationDelta || 0));
          next.relations = rels;

          if (resolvedData.action === 'ACCEPT_ALLIANCE') {
            next = formTreatyCoalition(next, 'ALLIANCE', player.id, target.id);
          } else if (resolvedData.action === 'ACCEPT_ECONOMIC_UNION') {
            next = formTreatyCoalition(next, 'ECONOMIC_UNION', player.id, target.id);
          } else if (resolvedData.action === 'ACCEPT_PEACE') {
            const w = isAtWarBetween(next, player.id, target.id);
            if (w) next = resolvePeaceTreaty(next, w.id, 'STATUS_QUO');
          } else if (resolvedData.action === 'DECLARE_WAR') {
            next = declareWarBetween(next, target.id, player.id);
          } else if (resolvedData.action === 'PROPOSE_NON_AGGRESSION') {
            const pk = pairKey(player.id, target.id);
            if (!next.nonAggressionPacts.includes(pk)) {
              next.nonAggressionPacts = [...next.nonAggressionPacts, pk];
            }
          }

          return next;
        });
      } finally {
        setIsAiSending(false);
      }
    },
    [world, isAiSending]
  );

  const handleTriggerCrisis = useCallback(async () => {
    if (!world.playerCountryId || isGeneratingCrisis) return;
    const player = world.countries[world.playerCountryId];
    if (!player) return;

    setIsGeneratingCrisis(true);
    try {
      const topPowers = Object.values(world.countries)
        .filter((c) => c.ownerId === c.id)
        .sort((a, b) => b.gdp - a.gdp)
        .slice(0, 6)
        .map((c) => ({ nameFr: c.nameFr, gdp: Math.round(c.gdp) }));

      let eventData = null;
      if (shouldAttemptBackendApi()) {
        try {
          const res = await fetch(buildApiUrl('/api/simulation/crisis'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              playerCountry: player,
              topPowers,
              currentDateLabel: formatDateFr(world.year, world.month),
              activeWarsCount: world.wars.length,
            }),
          });
          const contentType = res.headers.get('content-type') || '';
          if (res.ok && contentType.includes('application/json')) {
            const json = await res.json();
            if (json?.event) {
              eventData = json.event;
            }
          }
        } catch {
          // Static hosting or unreachable backend fallback below
        }
      }

      setWorld((prev) => ({
        ...prev,
        pendingCrisis: eventData ?? buildLocalCrisisEvent(),
      }));
    } finally {
      setIsGeneratingCrisis(false);
    }
  }, [world, isGeneratingCrisis]);

  const handleResolveCrisis = useCallback((option: 'A' | 'B') => {
    setWorld((prev) => {
      if (!prev.pendingCrisis || !prev.playerCountryId) return prev;
      const c = prev.countries[prev.playerCountryId];
      const cr = prev.pendingCrisis;
      const tDelta = option === 'A' ? cr.optionATreasuryDelta : cr.optionBTreasuryDelta;
      const sDelta = option === 'A' ? cr.optionAStabilityDelta : cr.optionBStabilityDelta;
      const gDelta = option === 'A' ? cr.optionAGdpPctDelta : cr.optionBGdpPctDelta;

      const updated = {
        ...c,
        treasury: Number((c.treasury + tDelta).toFixed(2)),
        stability: Math.max(5, Math.min(100, c.stability + sDelta)),
        gdp: Number((c.gdp * (1 + gDelta / 100)).toFixed(1)),
      };

      const evt = {
        id: `evt-crisis-${Date.now()}`,
        dateLabel: formatDateFr(prev.year, prev.month),
        monthIndex: prev.monthIndex,
        category: 'CRISE' as const,
        title: cr.title,
        description: `${c.nameFr} tranche : « ${option === 'A' ? cr.optionALabel : cr.optionBLabel} ».`,
        involvedCountryIds: [c.id],
      };

      return {
        ...prev,
        pendingCrisis: null,
        countries: { ...prev.countries, [c.id]: updated },
        events: [evt, ...prev.events].slice(0, 80),
      };
    });
  }, []);

  const handleExecuteFreeAction = useCallback(
    async (rawPrompt: string) => {
      if (!world.playerCountryId || isExecutingFreeAction) return;
      const currentPlayer = world.countries[world.playerCountryId];
      if (!currentPlayer) return;

      setIsExecutingFreeAction(true);
      try {
        const mentioned = extractMentionedCountries(world, rawPrompt, currentPlayer.id);
        const topPowers = Object.values(world.countries)
          .filter((c) => c.ownerId === c.id && c.id !== currentPlayer.id)
          .sort((a, b) => b.gdp - a.gdp)
          .slice(0, 12)
          .map((c) => ({
            id: c.id,
            nameFr: c.nameFr,
            relation: getRelation(world, currentPlayer.id, c.id),
          }));

        let effectData: FreeActionEffect | null = null;
        if (shouldAttemptBackendApi()) {
          try {
            const res = await fetch(buildApiUrl('/api/simulation/action'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                playerCountry: currentPlayer,
                prompt: rawPrompt,
                mentionedCountries: mentioned.map((c) => ({
                  id: c.id,
                  nameFr: c.nameFr,
                  gdp: Math.round(c.gdp),
                  army: c.army,
                  relation: getRelation(world, currentPlayer.id, c.id),
                  isAtWar: Boolean(isAtWarBetween(world, currentPlayer.id, c.id)),
                })),
                topPowers,
                currentDateLabel: formatDateFr(world.year, world.month),
                activeWarsCount: world.wars.length,
              }),
            });
            const contentType = res.headers.get('content-type') || '';
            if (res.ok && contentType.includes('application/json')) {
              const json = (await res.json()) as { effect?: FreeActionEffect | null };
              if (json?.effect?.summaryTitle && json?.effect?.narrative) {
                effectData = json.effect;
              }
            }
          } catch {
            // Offline or static hosting fallback below
          }
        }

        const resolvedEffect =
          effectData ?? interpretFreeActionLocally(worldRef.current, rawPrompt);

        const { nextState, logEntry } = applyFreeActionEffect(
          worldRef.current,
          rawPrompt,
          resolvedEffect
        );
        worldRef.current = nextState;
        setWorld(nextState);
        setActionLogs((prev) => [logEntry, ...prev].slice(0, 40));

        const firstTargetId = resolvedEffect.targetImpacts?.[0]?.countryId;
        if (firstTargetId && world.countries[firstTargetId]) {
          setFocusTarget([...world.countries[firstTargetId].centroid]);
        }

        showToast(`Décision exécutée : ${resolvedEffect.summaryTitle}`);
      } finally {
        setIsExecutingFreeAction(false);
      }
    },
    [world, isExecutingFreeAction, showToast]
  );

  const player = world.playerCountryId ? world.countries[world.playerCountryId] : null;
  const playerTotals = player ? getCountryTotalStats(world, player.id) : null;
  const dateLabel = formatDateFr(world.year, world.month);
  const countriesCount = Object.keys(world.countries).length;

  const savedCampaign =
    world.phase === 'PLAYING' && player
      ? {
          countryName: player.nameFr,
          dateLabel,
          color: player.color,
        }
      : null;

  const showingForeign =
    world.phase === 'PLAYING' &&
    world.selectedCountryId &&
    world.selectedCountryId !== world.playerCountryId &&
    Boolean(world.countries[world.selectedCountryId]);

  const isChoosingStartMode = world.phase === 'SELECT_NATION' && setupMode === 'CHOOSE_MODE';
  const isCreatingCustom = world.phase === 'SELECT_NATION' && setupMode === 'CREATE_CUSTOM';

  const memoizedCustomPreview = useMemo(() => {
    if (!isCreatingCustom) return null;
    return {
      territoryIds: customConfig.territoryIds,
      nameFr: customConfig.nameFr,
      color: customConfig.color,
      capital: customConfig.capital,
      capitalCoords: customConfig.capitalCoords,
    };
  }, [
    isCreatingCustom,
    customConfig.territoryIds,
    customConfig.nameFr,
    customConfig.color,
    customConfig.capital,
    customConfig.capitalCoords,
  ]);

  if (showWelcome) {
    return (
      <WelcomeScreen
        features={features}
        spherePath={spherePath}
        graticulePath={graticulePath}
        countriesCount={countriesCount}
        savedCampaign={savedCampaign}
        settings={uiSettings}
        onUpdateSettings={setUiSettings}
        onClearSavedCampaign={() => {
          try {
            localStorage.removeItem(STORAGE_KEY);
          } catch {
            // Ignore storage errors
          }
          setWorld(createInitialWorldState());
        }}
        onStartNewSelection={() => {
          handleResetGame();
        }}
        onResumeSaved={() => setShowWelcome(false)}
      />
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#080E18] text-slate-100 overflow-hidden">
      {/* Top Command Bar */}
      <header className="h-16 px-3 sm:px-5 border-b border-amber-400/25 bg-gradient-to-r from-[#071124] via-[#0B1933] to-[#071124] flex items-center justify-between gap-3 shrink-0 z-30 shadow-[0_6px_24px_rgba(3,8,20,0.65)]">
        {/* Zone 1: Brand + Active Nation & Current Date */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-base sm:text-lg font-display font-semibold tracking-tight bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent whitespace-nowrap shrink-0">
            Orbis Diplomatica
          </span>
          {player && (
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#0E1E3A]/85 border border-amber-400/20 text-xs text-amber-200 font-medium whitespace-nowrap shrink-0">
              <CountryFlag
                flag={player.flag}
                fallbackColor={player.color}
                name={player.nameFr}
                className="w-5 h-3.5 rounded-xs border border-white/25 shrink-0"
              />
              <span className="max-w-[140px] truncate">{player.nameFr}</span>
            </div>
          )}
          {world.phase === 'PLAYING' && (
            <span className="hidden md:inline text-xs font-mono-tabular text-slate-300 whitespace-nowrap shrink-0">
              {dateLabel}
            </span>
          )}
        </div>

        {/* Zone 2: National Telemetry OR Map Modes */}
        {world.phase === 'PLAYING' && player && playerTotals ? (
          <div className="hidden xl:flex items-center gap-5 text-xs font-mono-tabular">
            <div>
              <span className="text-slate-400 mr-1.5 font-sans">Trésor</span>
              <span className="text-amber-300 font-semibold">
                {player.treasury.toFixed(1)} Md $
              </span>
              <span
                className={`ml-1 text-[11px] ${
                  player.monthlyBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                ({player.monthlyBalance >= 0 ? '+' : ''}
                {player.monthlyBalance.toFixed(1)})
              </span>
            </div>
            <div>
              <span className="text-slate-400 mr-1.5 font-sans">PIB</span>
              <span className="text-white font-semibold">
                {playerTotals.totalGdp.toLocaleString('fr-FR')} Md
              </span>
            </div>
            <div>
              <span className="text-slate-400 mr-1.5 font-sans">Armée</span>
              <span className="text-rose-300 font-semibold">
                {player.army.toLocaleString('fr-FR')}k
              </span>
            </div>
            <div>
              <span className="text-slate-400 mr-1.5 font-sans">Pop.</span>
              <span className="text-sky-300 font-semibold">
                {playerTotals.totalPop.toFixed(1)}M
              </span>
            </div>
            <div>
              <span className="text-slate-400 mr-1.5 font-sans">Stabilité</span>
              <span className="text-emerald-300 font-semibold">
                {Math.round(player.stability)}%
              </span>
            </div>
          </div>
        ) : (
          <div className="hidden md:block text-xs text-slate-400">
            Simulation géopolitique mondiale · {countriesCount} territoires &amp; États
          </div>
        )}

        {/* Zone 3: Primary Button Bar — STRICTLY ONLY CHAT & ACTION during PLAYING */}
        <div className="flex items-center gap-2.5 shrink-0">
          {world.phase === 'PLAYING' ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setActiveHub('CHAT');
                  setMobileSheetOpen(true);
                }}
                aria-pressed={activeHub === 'CHAT' && mobileSheetOpen}
                className={`min-h-[44px] px-4 sm:px-6 py-2 rounded-xl border text-xs sm:text-sm font-bold tracking-wider uppercase flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeHub === 'CHAT' && mobileSheetOpen
                    ? 'bg-gradient-to-b from-[#1A3463] to-[#0F2040] border-amber-400 text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.35)] ring-1 ring-amber-300/40'
                    : 'bg-gradient-to-b from-[#112244] to-[#0A162D] hover:from-[#172D58] hover:to-[#0E1E3B] border-amber-400/45 text-amber-100 hover:border-amber-300 shadow-md'
                }`}
              >
                <MessageSquareText className="w-4 h-4 text-amber-300 shrink-0" />
                <span>CHAT</span>
                {world.proposals.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveHub('ACTION');
                  setMobileSheetOpen(true);
                }}
                aria-pressed={activeHub === 'ACTION' && mobileSheetOpen}
                className={`min-h-[44px] px-4 sm:px-6 py-2 rounded-xl border text-xs sm:text-sm font-bold tracking-wider uppercase flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeHub === 'ACTION' && mobileSheetOpen
                    ? 'bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 border-amber-200 text-slate-950 shadow-[0_0_22px_rgba(245,158,11,0.45)]'
                    : 'bg-gradient-to-b from-[#112244] to-[#0A162D] hover:from-[#172D58] hover:to-[#0E1E3B] border-amber-400/45 text-amber-200 hover:border-amber-300 shadow-md'
                }`}
              >
                <Crown
                  className={`w-4 h-4 shrink-0 ${
                    activeHub === 'ACTION' && mobileSheetOpen
                      ? 'text-slate-950'
                      : 'text-amber-300'
                  }`}
                />
                <span>ACTION</span>
                {world.wars.some(
                  (w) =>
                    player &&
                    (w.aggressorId === player.id ||
                      w.defenderId === player.id ||
                      w.aggressorAllies.includes(player.id) ||
                      w.defenderAllies.includes(player.id))
                ) && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                )}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleResetGame}
              title="Recommencer une partie (choisir un pays existant ou créer mon propre pays)"
              className="min-h-[40px] flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:text-white bg-[#152238] hover:bg-[#1E2F4C] border border-white/10 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Recommencer</span>
            </button>
          )}
        </div>
      </header>

      {/* Year Destination Simulator Bar */}
      {world.phase === 'PLAYING' && (
        <YearSimulatorBar
          currentYear={world.year}
          currentDateLabel={dateLabel}
          targetYear={targetYear}
          onChangeTargetYear={setTargetYear}
          isSimulating={isSimulating}
          onStartSimulation={handleStartSimulation}
          pausedByModal={Boolean(world.pendingCrisis || world.pendingWarOutcome || simSummary)}
        />
      )}

      {/* Main Content: Mandatory Two-Choice Start OR Interactive Map Workspace */}
      {isChoosingStartMode ? (
        <StartChoiceScreen
          features={features}
          spherePath={spherePath}
          graticulePath={graticulePath}
          countriesCount={countriesCount}
          onSelectExistingMode={() => setSetupMode('EXISTING')}
          onSelectCustomMode={() => setSetupMode('CREATE_CUSTOM')}
        />
      ) : (
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 relative">
          {/* Left/Center Dominant Map Stage */}
          <main className="flex-1 relative min-h-[340px]">
            <WorldMap
              features={features}
              spherePath={spherePath}
              graticulePath={graticulePath}
              world={world}
              mapMode={mapMode}
              onSelectCountry={isCreatingCustom ? handleCustomMapClick : handleSelectCountry}
              focusTarget={focusTarget}
              customPreview={memoizedCustomPreview}
            />

            {/* Map Mode Segmented Control (Top-Right inside Map) */}
            <div className="absolute top-3 right-3 z-20 max-w-[calc(100vw-24px)] overflow-x-auto flex items-center gap-1 p-1 bg-[#0B1528]/95 border border-amber-400/25 rounded-lg shadow-lg">
              {(
                [
                  ['politique', 'Politique'],
                  ['relations', 'Relations'],
                  ['alliances', 'Alliances'],
                  ['economie', 'Économie'],
                  ['militaire', 'Militaire'],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setMapMode(mode)}
                  className={`min-h-[34px] px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    mapMode === mode
                      ? 'bg-amber-500 text-slate-950 font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Custom Territory Map Click Mode Bar (Bottom-Left during Custom Creation) */}
            {isCreatingCustom && (
              <div className="absolute bottom-3 left-3 z-20 flex flex-wrap items-center gap-1.5 p-1.5 bg-[#0D1524]/95 border border-white/15 rounded-md shadow-xl">
                <button
                  type="button"
                  onClick={() => {
                    setCustomMapClickMode('relocate');
                    handleOpenMapPicker('relocate');
                  }}
                  className={`min-h-[38px] px-3 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer whitespace-nowrap ${
                    customMapClickMode === 'relocate'
                      ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                      : 'bg-[#17263F] text-slate-100 hover:bg-[#1E3152]'
                  }`}
                >
                  Définir l’emplacement
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomMapClickMode('expand');
                    handleOpenMapPicker('brush-add');
                  }}
                  className={`min-h-[38px] px-3 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer whitespace-nowrap ${
                    customMapClickMode === 'expand'
                      ? 'bg-sky-500 text-slate-950 hover:bg-sky-400'
                      : 'bg-[#17263F] text-slate-200 hover:bg-[#1E3152]'
                  }`}
                >
                  Tracer les frontières ({customConfig.territoryIds.length})
                </button>
              </div>
            )}

            {/* World Chronicle & Diplomatic Inbox */}
            {world.phase === 'PLAYING' && (
              <WorldChronicle
                world={world}
                onFocusCountry={handleFocusCountry}
                onResolveProposal={handleResolveProposal}
              />
            )}
          </main>

          {/* Right Contextual Sidebar */}
          {world.phase === 'SELECT_NATION' ? (
            setupMode === 'CREATE_CUSTOM' ? (
              <CustomNationPanel
                world={world}
                config={customConfig}
                territoryConfirmVersion={territoryConfirmVersion}
                tutorialEnabledByDefault={true}
                onTutorialStateChange={handleTutorialStateChange}
                onChangeConfig={setCustomConfig}
                onFocusTerritory={handleFocusCountry}
                onToggleTerritory={handleToggleCustomTerritory}
                onOpenMapPicker={handleOpenMapPicker}
                onBackToModeChoice={() => setSetupMode('CHOOSE_MODE')}
                onStartCustomGame={handleStartCustomGame}
              />
            ) : (
              <NationSelectPanel
                world={world}
                onSelectCountry={handleSelectCountry}
                onFocusCountry={handleFocusCountry}
                onStartGame={handleStartGame}
                onBackToModeChoice={() => setSetupMode('CHOOSE_MODE')}
              />
            )
          ) : (
          <aside
            className={`${
              mobileSheetOpen ? 'flex' : 'hidden lg:flex'
            } flex-col w-full lg:w-[410px] xl:w-[440px] shrink-0 h-[54vh] sm:h-[52vh] lg:h-full bg-[#0A1428] border-t lg:border-t-0 lg:border-l border-amber-400/20 overflow-hidden`}
          >
            {activeHub === 'CHAT' ? (
              <ChatHubPanel
                world={world}
                selectedTargetId={showingForeign ? world.selectedCountryId : null}
                onSelectTargetCountry={(countryId) => handleSelectCountry(countryId)}
                onFocusCountry={handleFocusCountry}
                onSendAiMessage={handleSendAiMessage}
                onCloseMobilePanel={() => setMobileSheetOpen(false)}
                isAiSending={isAiSending}
              />
            ) : (
              <ActionHubPanel
                world={world}
                dateLabel={dateLabel}
                autoPlay={autoPlay}
                onToggleAutoPlay={() => setAutoPlay((a) => !a)}
                onAdvanceMonth={handleAdvanceMonth}
                onTriggerCrisis={handleTriggerCrisis}
                isGeneratingCrisis={isGeneratingCrisis}
                onOpenStats={() => setShowStats(true)}
                onResetGame={handleResetGame}
                activeSubView={actionSubView}
                onChangeSubView={setActionSubView}
                selectedForeignId={showingForeign ? world.selectedCountryId : null}
                onSelectForeignCountry={(countryId) => handleSelectCountry(countryId)}
                onOpenChatForCountry={(countryId) => {
                  handleSelectCountry(countryId);
                  setActiveHub('CHAT');
                  setMobileSheetOpen(true);
                }}
                onCloseMobilePanel={() => setMobileSheetOpen(false)}
                actionLogs={actionLogs}
                isExecutingFreeAction={isExecutingFreeAction}
                onExecuteFreeAction={handleExecuteFreeAction}
                onUpdatePolicy={handleUpdatePolicy}
                onRecruit={handleRecruit}
                onEnactDirective={handleDirective}
                onLeaveCoalition={handleLeaveCoalition}
                onPeaceTreaty={handlePeaceTreaty}
                onLaunchOffensive={handleLaunchOffensive}
                onFocusCountry={handleFocusCountry}
                onBackToOwnCountry={() =>
                  world.playerCountryId && handleSelectCountry(world.playerCountryId)
                }
                onDeclareWar={handleDeclareWar}
                onFormCoalition={handleFormCoalition}
                onSendAid={handleSendAid}
                onSignNonAggression={handleSignNonAggression}
                onSignTradeDeal={handleSignTradeDeal}
                onSendAiMessage={handleSendAiMessage}
                isAiSending={isAiSending}
                feedback={feedback}
              />
            )}
          </aside>
        )}
        </div>
      )}

      {/* Modals */}
      {showStats && (
        <WorldStatsModal
          world={world}
          onClose={() => setShowStats(false)}
          onFocusCountry={handleFocusCountry}
        />
      )}

      {world.pendingCrisis && (
        <CrisisModal crisis={world.pendingCrisis} onChoose={handleResolveCrisis} />
      )}

      {world.pendingWarOutcome && (
        <WarOutcomeModal
          outcome={world.pendingWarOutcome}
          world={world}
          onClose={() => setWorld((prev) => ({ ...prev, pendingWarOutcome: null }))}
        />
      )}

      {simSummary && (
        <SimulationSummaryModal
          summary={simSummary}
          world={world}
          onClose={() => setSimSummary(null)}
          onFocusCountry={handleFocusCountry}
        />
      )}

      {isCreatingCustom && isMapPickerOpen && (
        <TerritoryPickerModal
          features={features}
          spherePath={spherePath}
          graticulePath={graticulePath}
          world={world}
          config={customConfig}
          initialTool={mapPickerInitialTool}
          tutorialActive={isCustomTutorialTerritoryStep}
          onUpdateConfig={setCustomConfig}
          onConfirm={() => {
            setIsMapPickerOpen(false);
            setTerritoryConfirmVersion((v) => v + 1);
            const anchorId = customConfig.territoryIds[0];
            const anchor = anchorId ? world.countries[anchorId] : null;
            if (anchor) {
              setFocusTarget([...(customConfig.capitalCoords || anchor.centroid)]);
              showToast(
                `Emplacement enregistré : ${customConfig.nameFr || 'Votre pays'} (${customConfig.territoryIds.length} territoire(s)).`
              );
            }
          }}
          onCancel={() => setIsMapPickerOpen(false)}
        />
      )}
      {feedback && world.phase === 'SELECT_NATION' && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 px-4 py-2 bg-[#0E1728]/95 border border-amber-400/40 rounded-md shadow-xl text-xs font-medium text-amber-200 whitespace-nowrap">
          {feedback}
        </div>
      )}
    </div>
  );
}
