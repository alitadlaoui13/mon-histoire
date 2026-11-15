import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Calendar,
  ChevronDown,
  ChevronUp,
  Crown,
  FastForward,
  Flag,
  Loader2,
  MessageSquareText,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { ActionHubPanel } from './components/ActionHubPanel';
import { ChatHubPanel } from './components/ChatHubPanel';
import { CountryFlag, PRESET_NATION_IMAGES } from './components/CountryFlag';
import { CountryInspectorPopup } from './components/CountryInspectorPopup';
import { CrisisModal } from './components/CrisisModal';
import { CustomNationPanel, TutorialStepId } from './components/CustomNationPanel';
import { NationSelectPanel } from './components/NationSelectPanel';
import { NationalPanel } from './components/NationalPanel';
import { SimulationSummaryModal } from './components/SimulationSummaryModal';
import { StartChoiceScreen } from './components/StartChoiceScreen';
import { PickerToolMode, TerritoryPickerModal } from './components/TerritoryPickerModal';
import { WarOutcomeModal } from './components/WarOutcomeModal';
import { GameUiSettings, WelcomeScreen } from './components/WelcomeScreen';
import { WorldChronicle } from './components/WorldChronicle';
import { WorldMap } from './components/WorldMap';
import { WorldStatsModal } from './components/WorldStatsModal';
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
import {
  advanceDays,
  advanceMonth,
  advanceMonths,
  declareWarBetween,
  enactNationalDirective,
  formatDateFr,
  formatFullDateFr,
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
import { createInitialWorldState, getMapData } from './engine/worldInit';
import { buildApiUrl, shouldAttemptBackendApi } from './lib/apiConfig';
import {
  CountryPolicy,
  CustomCountryConfig,
  MapMode,
  SimulationSummary,
  WorldState,
} from './types/game';

type SetupMode = 'CHOOSE_MODE' | 'EXISTING' | 'CREATE_CUSTOM';
type RightDeckTab = 'chat' | 'action' | 'nation';

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
            day: parsed.day ?? 1,
            countries: { ...fresh.countries, ...parsed.countries },
            tradeDeals: parsed.tradeDeals ?? [],
            mapProjects: parsed.mapProjects ?? [],
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
  const [rightTab, setRightTab] = useState<RightDeckTab>('action');
  const [mobileDeckExpanded, setMobileDeckExpanded] = useState(true);
  const [inspectorDismissed, setInspectorDismissed] = useState(false);
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

  const handleAdvanceDays = useCallback((days: number) => {
    setWorld((prev) => {
      if (prev.phase !== 'PLAYING' || prev.pendingCrisis || prev.pendingWarOutcome) return prev;
      return advanceDays(prev, days);
    });
  }, []);

  const handleAdvanceMonth = useCallback(() => {
    setWorld((prev) => {
      if (prev.phase !== 'PLAYING' || prev.pendingCrisis || prev.pendingWarOutcome) return prev;
      return advanceMonth(prev);
    });
  }, []);

  const handleAdvanceMonths = useCallback((months: number) => {
    setWorld((prev) => {
      if (prev.phase !== 'PLAYING' || prev.pendingCrisis || prev.pendingWarOutcome) return prev;
      return advanceMonths(prev, months);
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
  }, [isSimulating, world, targetYear, showToast]);

  const handleSelectCountry = useCallback((countryId: string, territoryId?: string) => {
    setInspectorDismissed(false);
    setWorld((prev) => ({
      ...prev,
      selectedCountryId: countryId,
      selectedTerritoryId: territoryId ?? countryId,
    }));
  }, []);

  const handleFocusCountry = useCallback(
    (countryId: string) => {
      const c = world.countries[countryId];
      if (!c) return;
      const sovereignId = c.ownerId || countryId;
      setInspectorDismissed(false);
      setWorld((prev) => ({
        ...prev,
        selectedCountryId: sovereignId,
        selectedTerritoryId: countryId,
      }));
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
    setRightTab('action');
    setMobileDeckExpanded(true);
    setInspectorDismissed(true);
    setActionLogs([]);
  }, []);

  const handleStartCustomGame = useCallback(() => {
    setWorld((prev) => startGameWithCustomCountry(prev, customConfig));
    setAutoPlay(false);
    setIsSimulating(false);
    setSimSummary(null);
    setTargetYear(2030);
    setRightTab('action');
    setMobileDeckExpanded(true);
    setInspectorDismissed(true);
    setActionLogs([]);
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
    setRightTab('action');
    setMobileDeckExpanded(true);
    setInspectorDismissed(true);
    setActionLogs([]);
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
      const { nextState, error } = recruitPlayerTroops(worldRef.current, troopsK);
      if (error) {
        showToast(error);
        return;
      }
      worldRef.current = nextState;
      setWorld(nextState);
      showToast(`+${troopsK}k soldats mobilisés.`);
    },
    [showToast]
  );

  const handleDirective = useCallback(
    (directive: 'INFRASTRUCTURE' | 'COHESION' | 'RECHERCHE') => {
      const { nextState, error } = enactNationalDirective(worldRef.current, directive);
      if (error) {
        showToast(error);
        return;
      }
      worldRef.current = nextState;
      setWorld(nextState);
      showToast('Directive nationale promulguée.');
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
      const { nextState, error } = launchMajorOffensive(worldRef.current, warId);
      if (error) {
        showToast(error);
        return;
      }
      worldRef.current = nextState;
      setWorld(nextState);
      showToast('Offensive majeure ordonnée (+25 % puissance au prochain mois).');
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
      const prev = worldRef.current;
      if (!prev.playerCountryId) return;
      const rel = getRelation(prev, prev.playerCountryId, targetId);
      const threshold = type === 'ALLIANCE' ? 40 : 25;
      if (rel < threshold) {
        showToast(
          `${prev.countries[targetId]?.nameFr} refuse pour l’instant (relation requise : +${threshold}, actuelle : ${rel}).`
        );
        return;
      }
      const nextState = formTreatyCoalition(prev, type, prev.playerCountryId, targetId);
      worldRef.current = nextState;
      setWorld(nextState);
      showToast(
        type === 'ALLIANCE' ? 'Alliance militaire conclue.' : 'Union économique établie.'
      );
    },
    [showToast]
  );

  const handleSendAid = useCallback(
    (targetId: string, amount: number) => {
      const prev = worldRef.current;
      if (!prev.playerCountryId) return;
      const { nextState, error } = sendFinancialAid(prev, prev.playerCountryId, targetId, amount);
      if (error) {
        showToast(error);
        return;
      }
      worldRef.current = nextState;
      setWorld(nextState);
      showToast(`Aide financière de ${amount} Mds $ versée.`);
    },
    [showToast]
  );

  const handleSignNonAggression = useCallback(
    (targetId: string) => {
      const prev = worldRef.current;
      if (!prev.playerCountryId) return;
      const rel = getRelation(prev, prev.playerCountryId, targetId);
      if (rel < -10) {
        showToast('Relations trop tendues pour un pacte de non-agression.');
        return;
      }
      const k = pairKey(prev.playerCountryId, targetId);
      if (prev.nonAggressionPacts.includes(k)) return;
      const nextRels = { ...prev.relations };
      setRelation(nextRels, prev.playerCountryId, targetId, rel + 8);
      const nextState: WorldState = {
        ...prev,
        relations: nextRels,
        nonAggressionPacts: [...prev.nonAggressionPacts, k],
      };
      worldRef.current = nextState;
      setWorld(nextState);
      showToast('Pacte de non-agression signé.');
    },
    [showToast]
  );

  const handleSignTradeDeal = useCallback(
    (targetId: string) => {
      const prev = worldRef.current;
      if (!prev.playerCountryId) return;
      const { nextState, error } = signTradeDeal(prev, prev.playerCountryId, targetId);
      if (error) {
        showToast(error);
        return;
      }
      worldRef.current = nextState;
      setWorld(nextState);
      showToast(`Accord commercial signé avec ${prev.countries[targetId]?.nameFr}.`);
    },
    [showToast]
  );

  const handleResolveProposal = useCallback((proposalId: string, accept: boolean) => {
    setWorld((prev) => resolveIncomingProposal(prev, proposalId, accept));
  }, []);

  const handleSendAiMessage = useCallback(
    async (targetId: string, message: string) => {
      const snap = worldRef.current;
      if (!snap.playerCountryId || isAiSending) return;
      const player = snap.countries[snap.playerCountryId];
      const target = snap.countries[targetId];
      if (!player || !target) return;

      const dateLabel = formatFullDateFr(snap.year, snap.month, snap.day);
      const tKey = pairKey(player.id, target.id);
      const existingHistory = snap.threads[tKey] || [];

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
        const relationVal = getRelation(snap, player.id, target.id);
        const isAtWarVal = Boolean(isAtWarBetween(snap, player.id, target.id));
        const isAlliedVal = Boolean(
          sharesAlliance(snap.alliances, player.id, target.id, 'ALLIANCE')
        );
        const sameEcoVal = Boolean(
          sharesAlliance(snap.alliances, player.id, target.id, 'ECONOMIC_UNION')
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
    [isAiSending]
  );

  const handleTriggerCrisis = useCallback(async () => {
    const snap = worldRef.current;
    if (!snap.playerCountryId || isGeneratingCrisis) return;
    const player = snap.countries[snap.playerCountryId];
    if (!player) return;

    setIsGeneratingCrisis(true);
    try {
      const topPowers = Object.values(snap.countries)
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
              currentDateLabel: formatDateFr(snap.year, snap.month),
              activeWarsCount: snap.wars.length,
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
  }, [isGeneratingCrisis]);

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
        dateLabel: formatFullDateFr(prev.year, prev.month, prev.day),
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
      const snap = worldRef.current;
      if (!snap.playerCountryId || isExecutingFreeAction) return;
      const currentPlayer = snap.countries[snap.playerCountryId];
      if (!currentPlayer) return;

      setIsExecutingFreeAction(true);
      try {
        const mentioned = extractMentionedCountries(snap, rawPrompt, currentPlayer.id);
        const topPowers = Object.values(snap.countries)
          .filter((c) => c.ownerId === c.id && c.id !== currentPlayer.id)
          .sort((a, b) => b.gdp - a.gdp)
          .slice(0, 12)
          .map((c) => ({
            id: c.id,
            nameFr: c.nameFr,
            relation: getRelation(snap, currentPlayer.id, c.id),
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
                  relation: getRelation(snap, currentPlayer.id, c.id),
                  isAtWar: Boolean(isAtWarBetween(snap, currentPlayer.id, c.id)),
                })),
                topPowers,
                currentDateLabel: formatFullDateFr(snap.year, snap.month, snap.day),
                activeWarsCount: snap.wars.length,
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
        if (firstTargetId && nextState.countries[firstTargetId]) {
          setFocusTarget([...nextState.countries[firstTargetId].centroid]);
        }

        showToast(`Décision exécutée : ${resolvedEffect.summaryTitle}`);
      } finally {
        setIsExecutingFreeAction(false);
      }
    },
    [isExecutingFreeAction, showToast]
  );

  const player = world.playerCountryId ? world.countries[world.playerCountryId] : null;
  const playerTotals = player ? getCountryTotalStats(world, player.id) : null;
  const fullDateLabel = formatFullDateFr(world.year, world.month, world.day);
  const countriesCount = Object.keys(world.countries).length;

  const savedCampaign =
    world.phase === 'PLAYING' && player
      ? {
          countryName: player.nameFr,
          dateLabel: fullDateLabel,
          color: player.color,
        }
      : null;

  const showingForeign =
    world.phase === 'PLAYING' &&
    world.selectedCountryId &&
    world.selectedCountryId !== world.playerCountryId &&
    Boolean(world.countries[world.selectedCountryId]);

  const playerWarsCount = useMemo(() => {
    if (!player) return 0;
    return world.wars.filter(
      (w) =>
        w.aggressorId === player.id ||
        w.defenderId === player.id ||
        w.aggressorAllies.includes(player.id) ||
        w.defenderAllies.includes(player.id)
    ).length;
  }, [world.wars, player]);

  const pausedByModal = Boolean(
    world.pendingCrisis || world.pendingWarOutcome || simSummary
  );

  const targetYearOptions = useMemo(
    () => [1, 2, 3, 5, 10, 15, 25].map((offset) => world.year + offset),
    [world.year]
  );

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
    <div className="relative h-screen w-screen flex flex-col bg-[#060D1A] text-slate-100 overflow-hidden">
      {world.phase === 'PLAYING' ? (
        <>
          {/* TOP COMMAND HEADER */}
          <header className="h-14 px-3 sm:px-5 border-b border-amber-400/25 bg-[#091224] flex items-center justify-between gap-3 shrink-0 z-30">
            {/* Left: Brand + Active Nation */}
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-sm sm:text-base font-display font-semibold tracking-tight bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent whitespace-nowrap shrink-0">
                Orbis Diplomatica
              </span>

              {player && (
                <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-white/10 min-w-0">
                  <CountryFlag
                    flag={player.flag}
                    fallbackColor={player.color}
                    name={player.nameFr}
                    className="w-6 h-4 rounded-xs border border-amber-300/40 shrink-0"
                  />
                  <span className="text-xs font-semibold text-white truncate max-w-[140px]">
                    {player.nameFr}
                  </span>
                  <span className="hidden xl:inline text-[11px] text-slate-400 truncate max-w-[160px]">
                    · {player.regime}
                  </span>
                </div>
              )}
            </div>

            {/* Center: Unboxed Tabular Telemetry */}
            {player && playerTotals && (
              <div className="hidden lg:flex items-center gap-3 text-xs font-mono-tabular whitespace-nowrap">
                <div>
                  <span className="text-slate-400 font-sans mr-1">Trésor</span>
                  <span className="text-amber-300 font-semibold">
                    {player.treasury.toFixed(1)} Md$
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
                <span className="text-slate-600">·</span>
                <div>
                  <span className="text-slate-400 font-sans mr-1">PIB</span>
                  <span className="text-white font-semibold">
                    {playerTotals.totalGdp.toLocaleString('fr-FR')} Md$
                  </span>
                </div>
                <span className="text-slate-600">·</span>
                <div>
                  <span className="text-slate-400 font-sans mr-1">Armée</span>
                  <span className="text-rose-300 font-semibold">
                    {player.army.toLocaleString('fr-FR')}k
                  </span>
                </div>
                <span className="text-slate-600">·</span>
                <div>
                  <span className="text-slate-400 font-sans mr-1">Pop.</span>
                  <span className="text-sky-300 font-semibold">
                    {playerTotals.totalPop.toFixed(1)}M
                  </span>
                </div>
                <span className="text-slate-600">·</span>
                <div>
                  <span className="text-slate-400 font-sans mr-1">Stab.</span>
                  <span className="text-emerald-300 font-semibold">
                    {Math.round(player.stability)}%
                  </span>
                </div>
                <span className="text-slate-600 hidden xl:inline">·</span>
                <div className="hidden xl:block">
                  <span className="text-slate-400 font-sans mr-1">Infl.</span>
                  <span className="text-amber-200 font-semibold">
                    {Math.round(player.influence ?? 50)}
                  </span>
                </div>
              </div>
            )}

            {/* Right: Global Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowStats(true)}
                className="min-h-[36px] px-2.5 py-1.5 rounded-lg bg-[#111E38] hover:bg-[#192C50] border border-white/10 text-xs font-medium text-slate-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                title="Classement & Statistiques mondiales"
              >
                <BarChart3 className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span className="hidden sm:inline">Stats</span>
              </button>

              <button
                type="button"
                disabled={isGeneratingCrisis}
                onClick={handleTriggerCrisis}
                className="min-h-[36px] px-2.5 py-1.5 rounded-lg bg-[#111E38] hover:bg-[#192C50] disabled:opacity-50 border border-white/10 text-xs font-medium text-slate-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                title="Générer un événement mondial"
              >
                {isGeneratingCrisis ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300 shrink-0" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                )}
                <span className="hidden md:inline">Sommet IA</span>
              </button>

              <button
                type="button"
                onClick={handleResetGame}
                title="Recommencer une partie"
                className="min-h-[36px] px-2.5 py-1.5 rounded-lg bg-[#111E38] hover:bg-[#192C50] border border-white/10 text-xs font-medium text-slate-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="hidden sm:inline">Recommencer</span>
              </button>
            </div>
          </header>

          {/* TIME & MAP LENS SUB-BAR */}
          <div className="px-3 sm:px-5 py-1.5 border-b border-white/10 bg-[#0B1528] flex flex-wrap items-center justify-between gap-2 shrink-0 z-20">
            {/* Left: Day / Month / Year Simulation Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
              <div className="flex items-center gap-1.5 pr-2 mr-1 border-r border-white/10 text-xs font-mono-tabular font-semibold text-amber-200 whitespace-nowrap shrink-0">
                <Calendar className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>{fullDateLabel}</span>
              </div>

              <button
                type="button"
                disabled={isSimulating || pausedByModal}
                onClick={() => handleAdvanceDays(7)}
                className="min-h-[32px] px-2.5 py-1 rounded-md bg-[#132240] hover:bg-[#1B3058] disabled:opacity-45 border border-white/10 text-xs font-medium text-slate-100 cursor-pointer whitespace-nowrap shrink-0"
              >
                +7 Jours
              </button>

              <button
                type="button"
                disabled={isSimulating || pausedByModal}
                onClick={handleAdvanceMonth}
                className="min-h-[32px] px-2.5 py-1 rounded-md bg-[#132240] hover:bg-[#1B3058] disabled:opacity-45 border border-white/10 text-xs font-medium text-slate-100 cursor-pointer whitespace-nowrap shrink-0"
              >
                +1 Mois
              </button>

              <button
                type="button"
                disabled={isSimulating || pausedByModal}
                onClick={() => handleAdvanceMonths(12)}
                className="min-h-[32px] px-2.5 py-1 rounded-md bg-[#132240] hover:bg-[#1B3058] disabled:opacity-45 border border-white/10 text-xs font-medium text-slate-100 cursor-pointer whitespace-nowrap shrink-0"
              >
                +1 An
              </button>

              <button
                type="button"
                disabled={isSimulating || pausedByModal}
                onClick={() => setAutoPlay((a) => !a)}
                aria-pressed={autoPlay}
                className={`min-h-[32px] px-2.5 py-1 rounded-md border text-xs font-medium flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0 ${
                  autoPlay
                    ? 'bg-amber-400/20 border-amber-400/50 text-amber-200'
                    : 'bg-[#132240] hover:bg-[#1B3058] border-white/10 text-slate-200'
                }`}
              >
                {autoPlay ? (
                  <Pause className="w-3 h-3 shrink-0" />
                ) : (
                  <Play className="w-3 h-3 shrink-0" />
                )}
                <span>{autoPlay ? 'Pause' : 'Auto'}</span>
              </button>

              <div className="hidden sm:flex items-center gap-1 pl-2 ml-1 border-l border-white/10 shrink-0">
                <select
                  aria-label="Année cible de simulation"
                  value={targetYear}
                  disabled={isSimulating}
                  onChange={(e) => setTargetYear(Number(e.target.value))}
                  className="min-h-[32px] px-2 py-1 text-xs font-mono-tabular bg-[#091222] border border-white/15 rounded-md text-amber-200 focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  {targetYearOptions.map((y) => (
                    <option key={y} value={y}>
                      → {y}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={isSimulating || pausedByModal || targetYear <= world.year}
                  onClick={handleStartSimulation}
                  className="min-h-[32px] px-2.5 py-1 rounded-md bg-amber-500 hover:bg-amber-400 disabled:opacity-45 text-slate-950 text-xs font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <FastForward className="w-3 h-3 shrink-0" />
                  <span>Simuler</span>
                </button>
              </div>
            </div>

            {/* Right: Map Lens Selector */}
            <div className="flex items-center gap-1 overflow-x-auto max-w-full">
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
                  className={`min-h-[30px] px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    mapMode === mode
                      ? 'bg-amber-500 text-slate-950 font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* SPLIT WORKSPACE: DOMINANT CENTRAL WORLD MAP + DOCKED STRATEGY PANEL */}
          <div className="flex-1 flex flex-col lg:flex-row min-h-0 relative overflow-hidden">
            {/* Central Interactive World Map */}
            <main className="flex-1 relative min-h-[260px] overflow-hidden">
              <WorldMap
                features={features}
                spherePath={spherePath}
                graticulePath={graticulePath}
                world={world}
                mapMode={mapMode}
                onSelectCountry={handleSelectCountry}
                focusTarget={focusTarget}
                customPreview={null}
              />

              {feedback && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 max-w-[calc(100%-24px)] px-4 py-2 bg-[#071124]/95 backdrop-blur-md border border-amber-400/45 rounded-xl shadow-2xl text-xs font-medium text-amber-200 text-center">
                  {feedback}
                </div>
              )}

              {/* Non-blocking Foreign Country Quick Card */}
              {showingForeign && world.selectedCountryId && !inspectorDismissed && (
                <CountryInspectorPopup
                  world={world}
                  targetCountryId={world.selectedCountryId}
                  onClose={() => setInspectorDismissed(true)}
                  onOpenChat={(cid) => {
                    handleSelectCountry(cid);
                    setRightTab('chat');
                    setMobileDeckExpanded(true);
                  }}
                  onOpenDiplomacy={(cid) => {
                    handleSelectCountry(cid);
                    setRightTab('chat');
                    setMobileDeckExpanded(true);
                  }}
                  onOpenActionPrompt={() => {
                    setRightTab('action');
                    setMobileDeckExpanded(true);
                  }}
                />
              )}

              {/* Collapsible World Chronicle & Proposals Drawer */}
              <WorldChronicle
                world={world}
                onFocusCountry={handleFocusCountry}
                onResolveProposal={handleResolveProposal}
              />
            </main>

            {/* Right Docked Strategy, Diplomacy & Free-Action Deck */}
            <aside
              className={`w-full lg:w-[400px] xl:w-[430px] border-t lg:border-t-0 lg:border-l border-amber-400/20 bg-[#0B1322] flex flex-col shrink-0 transition-all min-h-0 ${
                mobileDeckExpanded ? 'h-[46vh] lg:h-full' : 'h-12 lg:h-full'
              }`}
            >
              {/* 3-Tab Segmented Switcher: CHAT | ACTION | Mon Pays */}
              <div className="h-12 px-2.5 border-b border-white/10 bg-[#091224] flex items-center justify-between gap-2 shrink-0">
                <div className="flex-1 grid grid-cols-3 gap-1 p-1 bg-[#060D1A] border border-white/10 rounded-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setRightTab('chat');
                      setMobileDeckExpanded(true);
                    }}
                    className={`min-h-[32px] px-2 py-1 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                      rightTab === 'chat'
                        ? 'bg-[#172A4D] text-amber-200 border border-amber-400/40'
                        : 'text-slate-300 hover:text-white border border-transparent'
                    }`}
                  >
                    <MessageSquareText className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span>CHAT</span>
                    {world.proposals.length > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRightTab('action');
                      setMobileDeckExpanded(true);
                    }}
                    className={`min-h-[32px] px-2 py-1 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                      rightTab === 'action'
                        ? 'bg-gradient-to-b from-amber-400 to-amber-500 text-slate-950 font-bold'
                        : 'text-slate-300 hover:text-white border border-transparent'
                    }`}
                  >
                    <Crown
                      className={`w-3.5 h-3.5 shrink-0 ${
                        rightTab === 'action' ? 'text-slate-950' : 'text-amber-300'
                      }`}
                    />
                    <span>ACTION</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRightTab('nation');
                      setMobileDeckExpanded(true);
                    }}
                    className={`min-h-[32px] px-2 py-1 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                      rightTab === 'nation'
                        ? 'bg-[#172A4D] text-amber-200 border border-amber-400/40'
                        : 'text-slate-300 hover:text-white border border-transparent'
                    }`}
                  >
                    <Flag className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                    <span>Mon Pays</span>
                    {playerWarsCount > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setMobileDeckExpanded((v) => !v)}
                  className="lg:hidden min-h-[34px] min-w-[34px] rounded-lg bg-[#132240] border border-white/10 text-slate-300 hover:text-white flex items-center justify-center shrink-0 cursor-pointer"
                  aria-label={mobileDeckExpanded ? 'Réduire le panneau' : 'Ouvrir le panneau'}
                >
                  {mobileDeckExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronUp className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Active Panel Content */}
              <div className={`flex-1 min-h-0 ${mobileDeckExpanded ? 'block' : 'hidden lg:block'}`}>
                {rightTab === 'chat' && (
                  <ChatHubPanel
                    world={world}
                    selectedTargetId={showingForeign ? world.selectedCountryId : null}
                    onSelectTargetCountry={(cid) => handleSelectCountry(cid)}
                    onFocusCountry={handleFocusCountry}
                    onSendAiMessage={handleSendAiMessage}
                    onFormCoalition={handleFormCoalition}
                    onSignTradeDeal={handleSignTradeDeal}
                    onSignNonAggression={handleSignNonAggression}
                    onSendAid={handleSendAid}
                    onDeclareWar={handleDeclareWar}
                    onPeaceTreaty={handlePeaceTreaty}
                    onLaunchOffensive={handleLaunchOffensive}
                    isAiSending={isAiSending}
                    feedback={feedback}
                  />
                )}

                {rightTab === 'action' && (
                  <ActionHubPanel
                    world={world}
                    dateLabel={fullDateLabel}
                    actionLogs={actionLogs}
                    isExecutingFreeAction={isExecutingFreeAction}
                    onExecuteFreeAction={handleExecuteFreeAction}
                    onFocusCountry={handleFocusCountry}
                    feedback={feedback}
                  />
                )}

                {rightTab === 'nation' && (
                  <NationalPanel
                    world={world}
                    onUpdatePolicy={handleUpdatePolicy}
                    onRecruit={handleRecruit}
                    onEnactDirective={handleDirective}
                    onLeaveCoalition={handleLeaveCoalition}
                    onPeaceTreaty={handlePeaceTreaty}
                    onLaunchOffensive={handleLaunchOffensive}
                    onSelectCountry={handleFocusCountry}
                    actionFeedback={feedback}
                  />
                )}
              </div>
            </aside>
          </div>
        </>
      ) : (
        /* SETUP / NATION SELECTION / CUSTOM NATION CREATION */
        <>
          <header className="h-14 px-3 sm:px-5 border-b border-amber-400/25 bg-[#091224] flex items-center justify-between gap-3 shrink-0 z-30">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-base sm:text-lg font-display font-semibold tracking-tight bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent whitespace-nowrap shrink-0">
                Orbis Diplomatica
              </span>
            </div>

            <div className="hidden md:block text-xs text-slate-400">
              Simulation géopolitique mondiale · {countriesCount} territoires &amp; États
            </div>

            <button
              type="button"
              onClick={handleResetGame}
              title="Recommencer une partie (choisir un pays existant ou créer mon propre pays)"
              className="min-h-[38px] flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:text-white bg-[#152238] hover:bg-[#1E2F4C] border border-white/10 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Recommencer</span>
            </button>
          </header>

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
              </main>

              {setupMode === 'CREATE_CUSTOM' ? (
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
              )}
            </div>
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

          {feedback && (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 px-4 py-2 bg-[#0E1728]/95 border border-amber-400/40 rounded-md shadow-xl text-xs font-medium text-amber-200 whitespace-nowrap">
              {feedback}
            </div>
          )}
        </>
      )}

      {/* Global Simulation Modals (Stats, Crisis, War Outcome, Epoch Summary) */}
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
    </div>
  );
}
