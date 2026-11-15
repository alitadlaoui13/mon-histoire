import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Check,
  Coins,
  Compass,
  Flag,
  Image as ImageIcon,
  MapPin,
  Plus,
  Shield,
  Upload,
  User,
  X,
} from 'lucide-react';
import {
  AIPersonality,
  CustomCountryConfig,
  RegimeType,
  ResourceType,
  WorldState,
} from '../types/game';
import {
  CountryFlag,
  FLAG_EMBLEMS,
  FLAG_PATTERNS,
  PRESET_NATION_IMAGES,
  resizeImageFileToDataUrl,
} from './CountryFlag';
import { PickerToolMode } from './TerritoryPickerModal';

interface CustomNationPanelProps {
  world: WorldState;
  config: CustomCountryConfig;
  territoryConfirmVersion?: number;
  tutorialEnabledByDefault?: boolean;
  onTutorialStateChange?: (isActive: boolean, currentStepId: TutorialStepId) => void;
  onChangeConfig: React.Dispatch<React.SetStateAction<CustomCountryConfig>>;
  onFocusTerritory: (territoryId: string) => void;
  onToggleTerritory: (territoryId: string) => void;
  onOpenMapPicker: (tool?: PickerToolMode) => void;
  onBackToModeChoice: () => void;
  onStartCustomGame: () => void;
}

type CreatorTab = 'identite' | 'territoire' | 'pouvoir';

export type TutorialStepId =
  | 'name'
  | 'flag'
  | 'capital'
  | 'territory'
  | 'regime'
  | 'leader'
  | 'economy'
  | 'launch';

interface TutorialStepDef {
  id: TutorialStepId;
  tab: CreatorTab;
  title: string;
  description: string;
  pointerLabel: string;
}

const TUTORIAL_STEPS: TutorialStepDef[] = [
  {
    id: 'name',
    tab: 'identite',
    title: '1. Choisir le nom de votre pays',
    description:
      'Saisissez le nom officiel de votre nation dans le champ en surbrillance (au moins 2 lettres).',
    pointerLabel: 'Écrivez le nom ici',
  },
  {
    id: 'flag',
    tab: 'identite',
    title: '2. Choisir votre drapeau',
    description:
      'Sélectionnez un motif, un emblème, vos couleurs ou importez votre propre image de drapeau.',
    pointerLabel: 'Personnalisez le drapeau',
  },
  {
    id: 'capital',
    tab: 'identite',
    title: '3. Choisir votre capitale',
    description:
      'Indiquez le nom de la capitale de votre pays dans le champ mis en évidence.',
    pointerLabel: 'Écrivez la capitale ici',
  },
  {
    id: 'territory',
    tab: 'territoire',
    title: '4. Choisir votre territoire sur la carte',
    description:
      'Appuyez sur « Définir l’emplacement » pour ouvrir la carte mondiale et choisir où placer votre pays.',
    pointerLabel: 'Cliquez sur ce bouton',
  },
  {
    id: 'regime',
    tab: 'pouvoir',
    title: '5. Définir votre régime politique',
    description:
      'Choisissez la forme de gouvernement (République, Monarchie, État autoritaire…) et votre orientation.',
    pointerLabel: 'Choisissez le régime',
  },
  {
    id: 'leader',
    tab: 'pouvoir',
    title: '6. Choisir votre dirigeant',
    description:
      'Sélectionnez le titre et le nom du chef d’État (et un portrait si vous le souhaitez).',
    pointerLabel: 'Définissez le dirigeant',
  },
  {
    id: 'economy',
    tab: 'pouvoir',
    title: '7. Définir l’économie et l’armée',
    description:
      'Cliquez sur un profil rapide (Émergente, Régionale, Grande) ou réglez vos curseurs de PIB et d’armée.',
    pointerLabel: 'Réglez votre puissance',
  },
  {
    id: 'launch',
    tab: 'pouvoir',
    title: '8. Valider la création du pays',
    description:
      'Tout est prêt ! Appuyez sur « Commencer la partie » en bas pour entrer sur la scène mondiale.',
    pointerLabel: 'Validez ici',
  },
];

const MAP_COLOR_PRESETS = [
  '#D97706',
  '#2563EB',
  '#059669',
  '#DC2626',
  '#7C3AED',
  '#0891B2',
  '#DB2777',
  '#4F46E5',
  '#CA8A04',
  '#0D9488',
];

const FLAG_COLOR_SWATCHES = [
  '#0F294A',
  '#1D4ED8',
  '#DC2626',
  '#F8FAFC',
  '#F59E0B',
  '#059669',
  '#111827',
  '#7C3AED',
  '#0EA5E9',
  '#991B1B',
];

const REGIMES: RegimeType[] = [
  'République démocratique',
  'Monarchie constitutionnelle',
  'République fédérale',
  'Régime présidentiel',
  'Monarchie absolue',
  'République populaire',
  'État autoritaire',
];

const PERSONALITIES: AIPersonality[] = [
  'Pragmatique',
  'Mercantile',
  'Pacifiste',
  'Expansionniste',
  'Hégémonique',
];

const RESOURCES: ResourceType[] = [
  'Énergie',
  'Industrie',
  'Agriculture',
  'Minerais',
  'Technologie',
];

const LEADER_TITLES = [
  'Président',
  'Premier ministre',
  'Chancelier',
  'Souverain',
  'Consul',
  'Empereur',
  'Gouverneur',
];

interface GuideSpotlightProps {
  active: boolean;
  pointerLabel: string;
  pointerPosition?: 'top' | 'bottom';
  children: React.ReactNode;
}

const GuideSpotlight: React.FC<GuideSpotlightProps> = ({
  active,
  pointerLabel,
  pointerPosition = 'top',
  children,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (active && containerRef.current) {
      const id = window.setTimeout(() => {
        containerRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }, 60);
      return () => window.clearTimeout(id);
    }
  }, [active]);

  if (!active) {
    return <>{children}</>;
  }

  return (
    <div
      ref={containerRef}
      className="relative rounded-lg p-2 -m-2 ring-2 ring-amber-400 bg-amber-500/[0.06] shadow-[0_0_26px_rgba(245,158,11,0.34)] transition-all"
    >
      {pointerPosition === 'top' && (
        <div className="mb-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 text-[11px] font-bold shadow-md animate-bounce">
          <ArrowDown className="w-3.5 h-3.5 shrink-0" />
          <span>{pointerLabel}</span>
        </div>
      )}
      {children}
      {pointerPosition === 'bottom' && (
        <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 text-[11px] font-bold shadow-md">
          <span>{pointerLabel}</span>
        </div>
      )}
    </div>
  );
};

export const CustomNationPanel: React.FC<CustomNationPanelProps> = ({
  world,
  config,
  territoryConfirmVersion = 0,
  tutorialEnabledByDefault = true,
  onTutorialStateChange,
  onChangeConfig,
  onFocusTerritory,
  onToggleTerritory,
  onOpenMapPicker,
  onBackToModeChoice,
  onStartCustomGame,
}) => {
  const [activeTab, setActiveTab] = useState<CreatorTab>('identite');
  const [pickerTerritoryId, setPickerTerritoryId] = useState<string>('250');
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Interactive tutorial state
  const [tutorialActive, setTutorialActive] = useState<boolean>(tutorialEnabledByDefault);
  const [tutorialStepIndex, setTutorialStepIndex] = useState<number>(0);

  // Track which fields the user actively edited during current tutorial session
  const [nameEdited, setNameEdited] = useState(false);
  const [capitalEdited, setCapitalEdited] = useState(false);
  const [leaderEdited, setLeaderEdited] = useState(false);

  const autoAdvanceTimerRef = useRef<number | null>(null);
  const prevConfirmVersionRef = useRef<number>(territoryConfirmVersion);

  const currentStep = TUTORIAL_STEPS[tutorialStepIndex] ?? TUTORIAL_STEPS[0];
  const activeStepId: TutorialStepId | null = tutorialActive ? currentStep.id : null;

  const clearPendingAdvance = () => {
    if (autoAdvanceTimerRef.current !== null) {
      window.clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearPendingAdvance();
  }, []);

  // Notify parent when tutorial active/step changes (e.g. for TerritoryPickerModal)
  useEffect(() => {
    onTutorialStateChange?.(tutorialActive, currentStep.id);
  }, [tutorialActive, currentStep.id, onTutorialStateChange]);

  // Synchronize creator tab automatically when tutorial step changes
  useEffect(() => {
    if (!tutorialActive) return;
    setActiveTab(currentStep.tab);
  }, [tutorialActive, currentStep.tab]);

  const scheduleStepAdvance = (expectedStepId: TutorialStepId, delayMs: number) => {
    if (!tutorialActive) return;
    clearPendingAdvance();
    autoAdvanceTimerRef.current = window.setTimeout(() => {
      setTutorialStepIndex((idx) => {
        const step = TUTORIAL_STEPS[idx];
        if (!step || step.id !== expectedStepId) return idx;
        return Math.min(TUTORIAL_STEPS.length - 1, idx + 1);
      });
    }, delayMs);
  };

  // Auto-advance Step 1 (Name) after typing pause when user modified it
  useEffect(() => {
    if (!tutorialActive || activeStepId !== 'name' || !nameEdited) return;
    if (config.nameFr.trim().length >= 2) {
      scheduleStepAdvance('name', 1200);
    }
    return () => clearPendingAdvance();
  }, [config.nameFr, nameEdited, tutorialActive, activeStepId]);

  // Auto-advance Step 3 (Capital) after typing pause when user modified it
  useEffect(() => {
    if (!tutorialActive || activeStepId !== 'capital' || !capitalEdited) return;
    if (config.capital.trim().length >= 2) {
      scheduleStepAdvance('capital', 1200);
    }
    return () => clearPendingAdvance();
  }, [config.capital, capitalEdited, tutorialActive, activeStepId]);

  // Auto-advance Step 6 (Leader) after typing pause when user modified leader name
  useEffect(() => {
    if (!tutorialActive || activeStepId !== 'leader' || !leaderEdited) return;
    if (config.leaderName.trim().length >= 2) {
      scheduleStepAdvance('leader', 1200);
    }
    return () => clearPendingAdvance();
  }, [config.leaderName, leaderEdited, tutorialActive, activeStepId]);

  // Auto-advance Step 4 (Territory) when TerritoryPickerModal is confirmed
  useEffect(() => {
    if (territoryConfirmVersion !== prevConfirmVersionRef.current) {
      prevConfirmVersionRef.current = territoryConfirmVersion;
      if (tutorialActive && activeStepId === 'territory' && config.territoryIds.length > 0) {
        scheduleStepAdvance('territory', 350);
      }
    }
  }, [territoryConfirmVersion, tutorialActive, activeStepId, config.territoryIds.length]);

  const handlePrevStep = () => {
    clearPendingAdvance();
    setTutorialStepIndex((idx) => Math.max(0, idx - 1));
  };

  const handleNextStep = () => {
    clearPendingAdvance();
    setTutorialStepIndex((idx) => Math.min(TUTORIAL_STEPS.length - 1, idx + 1));
  };

  const handleSkipTutorial = () => {
    clearPendingAdvance();
    setTutorialActive(false);
  };

  const handleRestartTutorial = () => {
    clearPendingAdvance();
    setNameEdited(false);
    setCapitalEdited(false);
    setLeaderEdited(false);
    setTutorialStepIndex(0);
    setTutorialActive(true);
  };

  const allCountriesSorted = useMemo(() => {
    return Object.values(world.countries).sort((a, b) =>
      a.nameFr.localeCompare(b.nameFr, 'fr', { sensitivity: 'base' })
    );
  }, [world.countries]);

  const anchorCountry = config.territoryIds[0]
    ? world.countries[config.territoryIds[0]]
    : null;

  const canStart = config.nameFr.trim().length >= 2 && config.territoryIds.length > 0;

  const handleUploadImage = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'flag' | 'nation' | 'leader'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    try {
      const dataUrl = await resizeImageFileToDataUrl(file, target === 'nation' ? 560 : 280);
      if (target === 'flag') {
        onChangeConfig((prev) => ({
          ...prev,
          flag: { ...prev.flag, customFlagImage: dataUrl },
        }));
        if (activeStepId === 'flag') scheduleStepAdvance('flag', 550);
      } else if (target === 'nation') {
        onChangeConfig((prev) => ({ ...prev, nationImage: dataUrl }));
      } else {
        onChangeConfig((prev) => ({ ...prev, leaderPortrait: dataUrl }));
        if (activeStepId === 'leader') scheduleStepAdvance('leader', 550);
      }
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Erreur lors du chargement de l’image.'
      );
    } finally {
      e.target.value = '';
    }
  };

  const applyPowerPreset = (preset: 'emergent' | 'regional' | 'super') => {
    if (preset === 'emergent') {
      onChangeConfig((prev) => ({
        ...prev,
        gdp: 180,
        treasury: 32,
        population: 14,
        army: 55,
        stability: 70,
        techLevel: 1.15,
      }));
    } else if (preset === 'regional') {
      onChangeConfig((prev) => ({
        ...prev,
        gdp: 1450,
        treasury: 190,
        population: 48,
        army: 240,
        stability: 76,
        techLevel: 1.55,
      }));
    } else {
      onChangeConfig((prev) => ({
        ...prev,
        gdp: 5200,
        treasury: 680,
        population: 135,
        army: 680,
        stability: 80,
        techLevel: 1.95,
      }));
    }
    if (activeStepId === 'economy') {
      scheduleStepAdvance('economy', 550);
    }
  };

  const handleExpandToNeighbors = () => {
    const currentSet = new Set(config.territoryIds);
    const additions: string[] = [];
    for (const tid of config.territoryIds) {
      const tc = world.countries[tid];
      if (!tc) continue;
      for (const nid of tc.neighbors) {
        if (!currentSet.has(nid) && world.countries[nid] && additions.length < 2) {
          currentSet.add(nid);
          additions.push(nid);
        }
      }
    }
    if (additions.length > 0) {
      onChangeConfig((prev) => ({
        ...prev,
        territoryIds: [...prev.territoryIds, ...additions],
      }));
      if (activeStepId === 'territory') {
        scheduleStepAdvance('territory', 550);
      }
    }
  };

  return (
    <aside className="w-full lg:w-[440px] xl:w-[470px] shrink-0 h-[58vh] lg:h-full bg-[#0C1422] border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col min-h-0">
      {/* Header + Live Identity Preview */}
      <div className="p-3.5 sm:p-4 border-b border-white/10 bg-[#101A2C] space-y-3 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBackToModeChoice}
            className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Changer de mode</span>
          </button>

          <div className="flex items-center gap-2">
            {!tutorialActive && (
              <button
                type="button"
                onClick={handleRestartTutorial}
                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/35 text-[11px] font-medium text-amber-200 cursor-pointer transition-colors"
              >
                <Compass className="w-3 h-3" />
                <span>Guide</span>
              </button>
            )}
            <span className="text-[11px] text-sky-300 font-medium">
              Créer mon propre pays
            </span>
          </div>
        </div>

        {/* Live Nation Header Card */}
        <div className="relative rounded-lg overflow-hidden border border-white/10 bg-[#0A111D]">
          <img
            src={config.nationImage}
            alt={config.nameFr || 'Illustration de la nation'}
            referrerPolicy="no-referrer"
            loading="lazy"
            decoding="async"
            className="w-full h-20 object-cover opacity-75"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#09111E] via-[#09111E]/55 to-transparent" />
          <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <CountryFlag
                flag={config.flag}
                fallbackColor={config.color}
                name={config.nameFr || 'Drapeau'}
                className="w-10 h-6.5 rounded-xs border border-white/25 shadow-md shrink-0"
              />
              <div className="min-w-0">
                <div className="text-sm font-display font-semibold text-white truncate">
                  {config.nameFr.trim() || 'Nom du pays'}
                </div>
                <div className="text-[11px] text-slate-300 truncate">
                  Capitale : {config.capital.trim() || 'À définir'} · {config.territoryIds.length}{' '}
                  {config.territoryIds.length > 1 ? 'territoires' : 'territoire'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenMapPicker('relocate')}
              className="px-2.5 py-1.5 bg-amber-500/95 hover:bg-amber-400 text-slate-950 text-[11px] font-semibold rounded flex items-center gap-1 shrink-0 cursor-pointer whitespace-nowrap shadow"
            >
              <MapPin className="w-3 h-3" />
              <span>Emplacement</span>
            </button>
          </div>
        </div>

        {/* Interactive Guided Tutorial Box */}
        {tutorialActive && (
          <div className="p-3 rounded-lg bg-gradient-to-b from-[#162642] to-[#101C33] border border-amber-400/55 shadow-[0_8px_24px_rgba(2,8,23,0.6)] space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                <Compass className="w-3.5 h-3.5 shrink-0" />
                <span>{currentStep.title}</span>
              </div>
              <span className="text-[11px] font-mono-tabular text-amber-200/90 shrink-0">
                {tutorialStepIndex + 1}/{TUTORIAL_STEPS.length}
              </span>
            </div>

            {/* Progress Segments */}
            <div className="grid grid-cols-8 gap-1">
              {TUTORIAL_STEPS.map((st, idx) => (
                <div
                  key={st.id}
                  className={`h-1 rounded-full transition-colors ${
                    idx < tutorialStepIndex
                      ? 'bg-emerald-400'
                      : idx === tutorialStepIndex
                        ? 'bg-amber-400'
                        : 'bg-white/15'
                  }`}
                />
              ))}
            </div>

            <p className="text-xs text-slate-200 leading-relaxed">
              {currentStep.description}
            </p>

            <div className="flex items-center justify-between gap-2 pt-0.5">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  disabled={tutorialStepIndex === 0}
                  className="px-2.5 py-1.5 rounded bg-[#0C1628] hover:bg-[#172745] disabled:opacity-40 disabled:cursor-not-allowed border border-white/15 text-[11px] font-medium text-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Retour</span>
                </button>
                {tutorialStepIndex < TUTORIAL_STEPS.length - 1 && (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-2.5 py-1.5 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/45 text-[11px] font-semibold text-amber-200 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>Suivant</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleSkipTutorial}
                className="px-2.5 py-1.5 rounded text-[11px] font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer whitespace-nowrap"
              >
                Passer le tutoriel
              </button>
            </div>
          </div>
        )}

        {/* 3 Clean Step Tabs */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-[#09101C] rounded-md">
          <button
            type="button"
            onClick={() => {
              clearPendingAdvance();
              setActiveTab('identite');
            }}
            className={`py-1.5 px-2 text-xs font-medium rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'identite'
                ? 'bg-[#1B2A42] text-amber-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Drapeau & Images</span>
          </button>
          <button
            type="button"
            onClick={() => {
              clearPendingAdvance();
              setActiveTab('territoire');
            }}
            className={`py-1.5 px-2 text-xs font-medium rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'territoire'
                ? 'bg-[#1B2A42] text-amber-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Carte & Territoire</span>
          </button>
          <button
            type="button"
            onClick={() => {
              clearPendingAdvance();
              setActiveTab('pouvoir');
            }}
            className={`py-1.5 px-2 text-xs font-medium rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'pouvoir'
                ? 'bg-[#1B2A42] text-amber-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Éco & Armée</span>
          </button>
        </div>
      </div>

      {/* Scrollable Editor Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {uploadError && (
          <div className="p-2.5 bg-rose-500/15 border border-rose-400/30 rounded text-xs text-rose-200">
            {uploadError}
          </div>
        )}

        {/* TAB 1: IDENTITY, COLORS, FLAG & IMAGES */}
        {activeTab === 'identite' && (
          <>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <GuideSpotlight
                  active={activeStepId === 'name'}
                  pointerLabel={currentStep.pointerLabel}
                >
                  <div>
                    <label className="block text-[11px] text-slate-300 font-medium mb-1">
                      Nom de votre pays
                    </label>
                    <input
                      type="text"
                      maxLength={40}
                      value={config.nameFr}
                      onChange={(e) => {
                        setNameEdited(true);
                        onChangeConfig((prev) => ({ ...prev, nameFr: e.target.value }));
                      }}
                      onBlur={() => {
                        if (
                          activeStepId === 'name' &&
                          nameEdited &&
                          config.nameFr.trim().length >= 2
                        ) {
                          scheduleStepAdvance('name', 250);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (
                          e.key === 'Enter' &&
                          activeStepId === 'name' &&
                          config.nameFr.trim().length >= 2
                        ) {
                          scheduleStepAdvance('name', 150);
                        }
                      }}
                      placeholder="Ex. : République d’Aurelia"
                      className="w-full px-3 py-2 text-xs bg-[#131F34] border border-white/15 rounded-md text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400/70"
                    />
                  </div>
                </GuideSpotlight>

                <GuideSpotlight
                  active={activeStepId === 'capital'}
                  pointerLabel={currentStep.pointerLabel}
                >
                  <div>
                    <label className="block text-[11px] text-slate-300 font-medium mb-1">
                      Capitale
                    </label>
                    <input
                      type="text"
                      maxLength={36}
                      value={config.capital}
                      onChange={(e) => {
                        setCapitalEdited(true);
                        onChangeConfig((prev) => ({ ...prev, capital: e.target.value }));
                      }}
                      onBlur={() => {
                        if (
                          activeStepId === 'capital' &&
                          capitalEdited &&
                          config.capital.trim().length >= 2
                        ) {
                          scheduleStepAdvance('capital', 250);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (
                          e.key === 'Enter' &&
                          activeStepId === 'capital' &&
                          config.capital.trim().length >= 2
                        ) {
                          scheduleStepAdvance('capital', 150);
                        }
                      }}
                      placeholder="Ex. : Port-Souverain"
                      className="w-full px-3 py-2 text-xs bg-[#131F34] border border-white/15 rounded-md text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400/70"
                    />
                  </div>
                </GuideSpotlight>
              </div>

              {/* Territory Color on Map */}
              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                  <span>Couleur du territoire sur la carte</span>
                  <span className="font-mono-tabular text-slate-300">{config.color}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {MAP_COLOR_PRESETS.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => onChangeConfig((prev) => ({ ...prev, color: hex }))}
                      className={`w-6 h-6 rounded border transition-transform cursor-pointer ${
                        config.color.toLowerCase() === hex.toLowerCase()
                          ? 'border-white scale-110'
                          : 'border-white/20 hover:scale-105'
                      }`}
                      style={{ backgroundColor: hex }}
                      aria-label={`Couleur ${hex}`}
                    />
                  ))}
                  <label
                    className="inline-flex items-center gap-1 px-2 py-1 text-[11px] bg-[#131F34] border border-white/15 rounded text-slate-300 hover:text-white cursor-pointer ml-1"
                    title="Choisir une couleur libre"
                  >
                    <input
                      type="color"
                      value={config.color}
                      onChange={(e) =>
                        onChangeConfig((prev) => ({ ...prev, color: e.target.value }))
                      }
                      className="w-4 h-4 bg-transparent border-0 cursor-pointer p-0"
                    />
                    <span>Libre</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Flag Designer */}
            <GuideSpotlight
              active={activeStepId === 'flag'}
              pointerLabel={currentStep.pointerLabel}
            >
              <div className="pt-4 border-t border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Flag className="w-3.5 h-3.5 text-amber-400" />
                    <span>Drapeau national</span>
                  </h3>
                  <div className="flex items-center gap-2">
                    {config.flag.customFlagImage && (
                      <button
                        type="button"
                        onClick={() =>
                          onChangeConfig((prev) => ({
                            ...prev,
                            flag: { ...prev.flag, customFlagImage: undefined },
                          }))
                        }
                        className="text-[11px] text-rose-300 hover:text-rose-200 cursor-pointer"
                      >
                        Revenir au SVG
                      </button>
                    )}
                    <label className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] bg-[#152238] hover:bg-[#1D2F4C] border border-white/15 rounded text-slate-200 cursor-pointer">
                      <Upload className="w-3 h-3 text-sky-400" />
                      <span>Importer une image</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleUploadImage(e, 'flag')}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <CountryFlag
                    flag={config.flag}
                    fallbackColor={config.color}
                    name={config.nameFr || 'Aperçu du drapeau'}
                    className="w-24 h-16 rounded border border-white/20 shadow-lg shrink-0"
                  />
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Motif</label>
                      <select
                        value={config.flag.pattern}
                        onChange={(e) => {
                          onChangeConfig((prev) => ({
                            ...prev,
                            flag: {
                              ...prev.flag,
                              customFlagImage: undefined,
                              pattern: e.target.value as CustomCountryConfig['flag']['pattern'],
                            },
                          }));
                          if (activeStepId === 'flag') scheduleStepAdvance('flag', 600);
                        }}
                        className="w-full px-2 py-1.5 text-xs bg-[#131F34] border border-white/15 rounded text-white focus:outline-none focus:border-amber-400/60"
                      >
                        {FLAG_PATTERNS.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Emblème</label>
                      <select
                        value={config.flag.emblem}
                        onChange={(e) => {
                          onChangeConfig((prev) => ({
                            ...prev,
                            flag: {
                              ...prev.flag,
                              customFlagImage: undefined,
                              emblem: e.target.value as CustomCountryConfig['flag']['emblem'],
                            },
                          }));
                          if (activeStepId === 'flag') scheduleStepAdvance('flag', 600);
                        }}
                        className="w-full px-2 py-1.5 text-xs bg-[#131F34] border border-white/15 rounded text-white focus:outline-none focus:border-amber-400/60"
                      >
                        {FLAG_EMBLEMS.map((em) => (
                          <option key={em.id} value={em.id}>
                            {em.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Flag 3 Colors */}
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ['primaryColor', 'Couleur 1'],
                      ['secondaryColor', 'Couleur 2'],
                      ['accentColor', 'Couleur 3'],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key} className="p-2 bg-[#111B2D] border border-white/10 rounded">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] text-slate-400">{label}</span>
                        <input
                          type="color"
                          value={config.flag[key]}
                          onChange={(e) => {
                            onChangeConfig((prev) => ({
                              ...prev,
                              flag: {
                                ...prev.flag,
                                customFlagImage: undefined,
                                [key]: e.target.value,
                              },
                            }));
                            if (activeStepId === 'flag') scheduleStepAdvance('flag', 650);
                          }}
                          className="w-4 h-4 bg-transparent border-0 cursor-pointer p-0"
                        />
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {FLAG_COLOR_SWATCHES.slice(0, 5).map((sw) => (
                          <button
                            key={sw}
                            type="button"
                            onClick={() => {
                              onChangeConfig((prev) => ({
                                ...prev,
                                flag: {
                                  ...prev.flag,
                                  customFlagImage: undefined,
                                  [key]: sw,
                                },
                              }));
                              if (activeStepId === 'flag') scheduleStepAdvance('flag', 550);
                            }}
                            className={`w-3.5 h-3.5 rounded-xs border cursor-pointer ${
                              config.flag[key].toLowerCase() === sw.toLowerCase()
                                ? 'border-white scale-110'
                                : 'border-white/20'
                            }`}
                            style={{ backgroundColor: sw }}
                            aria-label={`${label} ${sw}`}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </GuideSpotlight>

            {/* National Images Selection */}
            <div className="pt-4 border-t border-white/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                  <span>Images de votre nation</span>
                </h3>
                <label className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] bg-[#152238] hover:bg-[#1D2F4C] border border-white/15 rounded text-slate-200 cursor-pointer">
                  <Upload className="w-3 h-3 text-amber-400" />
                  <span>Importer une photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleUploadImage(e, 'nation')}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {PRESET_NATION_IMAGES.map((img) => {
                  const active = config.nationImage === img.src;
                  return (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() =>
                        onChangeConfig((prev) => ({ ...prev, nationImage: img.src }))
                      }
                      className={`group relative rounded-md overflow-hidden border text-left transition-all cursor-pointer ${
                        active
                          ? 'border-amber-400 ring-1 ring-amber-400/50'
                          : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      <img
                        src={img.src}
                        alt={img.label}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        decoding="async"
                        className="w-full h-16 object-cover"
                      />
                      <div className="px-2 py-1 bg-[#0C1423] text-[10px] text-slate-200 flex items-center justify-between">
                        <span className="truncate">{img.label}</span>
                        {active && <Check className="w-3 h-3 text-amber-400 shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* TAB 2: LOCATION & TERRITORY ON THE MAP */}
        {activeTab === 'territoire' && (
          <div className="space-y-4">
            <GuideSpotlight
              active={activeStepId === 'territory'}
              pointerLabel={currentStep.pointerLabel}
            >
              <div className="p-3 bg-[#111C2F] border border-sky-400/25 rounded-md space-y-2.5">
                <div className="text-xs font-semibold text-sky-200">
                  Emplacement, territoire et frontières sur la carte
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Ouvrez la carte interactive du monde pour placer votre pays avec votre souris
                  ou votre doigt, puis tracez ses frontières sur une ou plusieurs régions.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => onOpenMapPicker('relocate')}
                    className="min-h-[42px] px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shadow-[0_0_16px_rgba(245,158,11,0.3)]"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Définir l’emplacement</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenMapPicker('brush-add')}
                    className="min-h-[42px] px-3 py-2 bg-[#172844] hover:bg-[#1E3356] border border-sky-400/35 text-sky-200 font-semibold text-xs rounded-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tracer les frontières</span>
                  </button>
                </div>
              </div>
            </GuideSpotlight>

            {/* Dropdown A-Z to jump/add any territory */}
            <div className="space-y-1.5">
              <label className="block text-[11px] text-slate-400">
                Localiser ou ajouter un territoire (A → Z)
              </label>
              <div className="flex gap-2">
                <select
                  value={pickerTerritoryId}
                  onChange={(e) => {
                    setPickerTerritoryId(e.target.value);
                    onFocusTerritory(e.target.value);
                  }}
                  className="flex-1 min-w-0 px-2.5 py-2 text-xs bg-[#131F34] border border-white/15 rounded text-white focus:outline-none focus:border-amber-400/60"
                >
                  {allCountriesSorted.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameFr} ({c.region})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    onToggleTerritory(pickerTerritoryId);
                    onFocusTerritory(pickerTerritoryId);
                    if (activeStepId === 'territory') {
                      scheduleStepAdvance('territory', 550);
                    }
                  }}
                  className="px-3 py-2 bg-[#17263F] hover:bg-[#1E3152] border border-white/15 rounded text-xs font-medium text-amber-300 flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>
                    {config.territoryIds.includes(pickerTerritoryId) ? 'Retirer' : 'Ajouter'}
                  </span>
                </button>
              </div>
            </div>

            {/* Selected Territories List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">
                  Territoires intégrés ({config.territoryIds.length})
                </span>
                <button
                  type="button"
                  onClick={handleExpandToNeighbors}
                  className="text-[11px] text-amber-300 hover:text-amber-200 cursor-pointer"
                >
                  + Étendre aux voisins
                </button>
              </div>

              {config.territoryIds.length === 0 ? (
                <div className="p-3 bg-rose-500/10 border border-rose-400/25 rounded text-xs text-rose-200">
                  Sélectionnez au moins un territoire sur la carte pour fonder votre pays.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {config.territoryIds.map((tid, index) => {
                    const tc = world.countries[tid];
                    if (!tc) return null;
                    return (
                      <div
                        key={tid}
                        className="px-3 py-2 bg-[#111B2E] border border-white/10 rounded flex items-center justify-between gap-2"
                      >
                        <button
                          type="button"
                          onClick={() => onFocusTerritory(tid)}
                          className="text-left min-w-0 flex-1 cursor-pointer"
                        >
                          <div className="text-xs font-medium text-slate-100 truncate">
                            {tc.nameFr}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {index === 0 ? 'Cœur national & capitale' : 'Province intégrée'} ·{' '}
                            {tc.region}
                          </div>
                        </button>
                        {config.territoryIds.length > 1 && (
                          <button
                            type="button"
                            onClick={() => onToggleTerritory(tid)}
                            className="p-1 text-slate-400 hover:text-rose-300 cursor-pointer"
                            title="Retirer ce territoire"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {anchorCountry && (
                <div className="text-[11px] text-slate-400">
                  Région d’implantation :{' '}
                  <span className="text-slate-200 font-medium">{anchorCountry.region}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: REGIME, LEADER, ECONOMY & ARMY */}
        {activeTab === 'pouvoir' && (
          <div className="space-y-4">
            {/* Political Regime */}
            <GuideSpotlight
              active={activeStepId === 'regime'}
              pointerLabel={currentStep.pointerLabel}
            >
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-300 font-medium mb-1">
                    Régime politique
                  </label>
                  <select
                    value={config.regime}
                    onChange={(e) => {
                      onChangeConfig((prev) => ({
                        ...prev,
                        regime: e.target.value as RegimeType,
                      }));
                      if (activeStepId === 'regime') scheduleStepAdvance('regime', 450);
                    }}
                    className="w-full px-2 py-1.5 text-xs bg-[#131F34] border border-white/15 rounded text-white focus:outline-none focus:border-amber-400/60"
                  >
                    {REGIMES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-300 font-medium mb-1">
                    Orientation nationale
                  </label>
                  <select
                    value={config.personality}
                    onChange={(e) => {
                      onChangeConfig((prev) => ({
                        ...prev,
                        personality: e.target.value as AIPersonality,
                      }));
                      if (activeStepId === 'regime') scheduleStepAdvance('regime', 450);
                    }}
                    className="w-full px-2 py-1.5 text-xs bg-[#131F34] border border-white/15 rounded text-white focus:outline-none focus:border-amber-400/60"
                  >
                    {PERSONALITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </GuideSpotlight>

            {/* Leader & Portrait */}
            <GuideSpotlight
              active={activeStepId === 'leader'}
              pointerLabel={currentStep.pointerLabel}
            >
              <div className="pt-3 border-t border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-amber-400" />
                    <span>Dirigeant de la nation</span>
                  </h3>
                  <label className="inline-flex items-center gap-1 px-2 py-1 text-[11px] bg-[#152238] hover:bg-[#1D2F4C] border border-white/15 rounded text-slate-200 cursor-pointer">
                    <Upload className="w-3 h-3 text-sky-400" />
                    <span>Portrait</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleUploadImage(e, 'leader')}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  {config.leaderPortrait && (
                    <div className="relative shrink-0">
                      <img
                        src={config.leaderPortrait}
                        alt={config.leaderName}
                        referrerPolicy="no-referrer"
                        className="w-11 h-11 rounded object-cover border border-white/20"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          onChangeConfig((prev) => ({ ...prev, leaderPortrait: undefined }))
                        }
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-slate-900 border border-white/20 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}
                  <div className="grid grid-cols-5 gap-2 flex-1">
                    <div className="col-span-2">
                      <label className="block text-[10px] text-slate-400 mb-1">Titre</label>
                      <select
                        value={config.leaderTitle}
                        onChange={(e) => {
                          onChangeConfig((prev) => ({ ...prev, leaderTitle: e.target.value }));
                          if (activeStepId === 'leader') scheduleStepAdvance('leader', 550);
                        }}
                        className="w-full px-2 py-1.5 text-xs bg-[#131F34] border border-white/15 rounded text-white focus:outline-none"
                      >
                        {LEADER_TITLES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <label className="block text-[10px] text-slate-400 mb-1">
                        Nom du dirigeant
                      </label>
                      <input
                        type="text"
                        maxLength={36}
                        value={config.leaderName}
                        onChange={(e) => {
                          setLeaderEdited(true);
                          onChangeConfig((prev) => ({ ...prev, leaderName: e.target.value }));
                        }}
                        onBlur={() => {
                          if (
                            activeStepId === 'leader' &&
                            leaderEdited &&
                            config.leaderName.trim().length >= 2
                          ) {
                            scheduleStepAdvance('leader', 250);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (
                            e.key === 'Enter' &&
                            activeStepId === 'leader' &&
                            config.leaderName.trim().length >= 2
                          ) {
                            scheduleStepAdvance('leader', 150);
                          }
                        }}
                        placeholder="Ex. : Alexandre Valmont"
                        className="w-full px-2.5 py-1.5 text-xs bg-[#131F34] border border-white/15 rounded text-white focus:outline-none focus:border-amber-400/60"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </GuideSpotlight>

            {/* Economy & Army Sliders */}
            <GuideSpotlight
              active={activeStepId === 'economy'}
              pointerLabel={currentStep.pointerLabel}
            >
              <div className="pt-3 border-t border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                    <span>Économie & Forces armées</span>
                  </h3>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => applyPowerPreset('emergent')}
                      className="px-2 py-0.5 text-[10px] bg-[#142035] hover:bg-[#1B2C48] border border-white/10 rounded text-slate-300 cursor-pointer"
                    >
                      Émergente
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPowerPreset('regional')}
                      className="px-2 py-0.5 text-[10px] bg-[#142035] hover:bg-[#1B2C48] border border-white/10 rounded text-slate-300 cursor-pointer"
                    >
                      Régionale
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPowerPreset('super')}
                      className="px-2 py-0.5 text-[10px] bg-[#142035] hover:bg-[#1B2C48] border border-white/10 rounded text-amber-300 cursor-pointer"
                    >
                      Grande
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-300">PIB initial</span>
                      <span className="font-mono-tabular text-amber-300 font-semibold">
                        {config.gdp.toLocaleString('fr-FR')} Mds $
                      </span>
                    </div>
                    <input
                      type="range"
                      min={40}
                      max={10000}
                      step={20}
                      value={config.gdp}
                      onChange={(e) =>
                        onChangeConfig((prev) => ({
                          ...prev,
                          gdp: Number(e.target.value),
                          treasury: Math.max(10, Math.round(Number(e.target.value) * 0.14)),
                        }))
                      }
                      onPointerUp={() => {
                        if (activeStepId === 'economy') scheduleStepAdvance('economy', 650);
                      }}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-300">Armée active</span>
                      <span className="font-mono-tabular text-rose-300 font-semibold">
                        {config.army.toLocaleString('fr-FR')}k soldats
                      </span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={1200}
                      step={10}
                      value={config.army}
                      onChange={(e) =>
                        onChangeConfig((prev) => ({ ...prev, army: Number(e.target.value) }))
                      }
                      onPointerUp={() => {
                        if (activeStepId === 'economy') scheduleStepAdvance('economy', 650);
                      }}
                      className="w-full accent-rose-400 cursor-pointer"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-slate-300">Population</span>
                        <span className="font-mono-tabular text-sky-300 font-semibold">
                          {config.population.toFixed(1)} M
                        </span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={300}
                        step={1}
                        value={config.population}
                        onChange={(e) =>
                          onChangeConfig((prev) => ({
                            ...prev,
                            population: Number(e.target.value),
                          }))
                        }
                        onPointerUp={() => {
                          if (activeStepId === 'economy') scheduleStepAdvance('economy', 650);
                        }}
                        className="w-full accent-sky-400 cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-slate-300">Trésor public</span>
                        <span className="font-mono-tabular text-amber-200 font-semibold">
                          {config.treasury.toLocaleString('fr-FR')} Md $
                        </span>
                      </div>
                      <input
                        type="range"
                        min={5}
                        max={1500}
                        step={5}
                        value={config.treasury}
                        onChange={(e) =>
                          onChangeConfig((prev) => ({
                            ...prev,
                            treasury: Number(e.target.value),
                          }))
                        }
                        onPointerUp={() => {
                          if (activeStepId === 'economy') scheduleStepAdvance('economy', 650);
                        }}
                        className="w-full accent-amber-400 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-slate-300">Stabilité</span>
                        <span className="font-mono-tabular text-emerald-300 font-semibold">
                          {config.stability} %
                        </span>
                      </div>
                      <input
                        type="range"
                        min={30}
                        max={95}
                        step={1}
                        value={config.stability}
                        onChange={(e) =>
                          onChangeConfig((prev) => ({
                            ...prev,
                            stability: Number(e.target.value),
                          }))
                        }
                        onPointerUp={() => {
                          if (activeStepId === 'economy') scheduleStepAdvance('economy', 650);
                        }}
                        className="w-full accent-emerald-400 cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-slate-300">Technologie</span>
                        <span className="font-mono-tabular text-indigo-300 font-semibold">
                          {config.techLevel.toFixed(2)}x
                        </span>
                      </div>
                      <input
                        type="range"
                        min={1.0}
                        max={2.5}
                        step={0.05}
                        value={config.techLevel}
                        onChange={(e) =>
                          onChangeConfig((prev) => ({
                            ...prev,
                            techLevel: Number(e.target.value),
                          }))
                        }
                        onPointerUp={() => {
                          if (activeStepId === 'economy') scheduleStepAdvance('economy', 650);
                        }}
                        className="w-full accent-indigo-400 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Export</label>
                      <select
                        value={config.exportResource}
                        onChange={(e) => {
                          onChangeConfig((prev) => ({
                            ...prev,
                            exportResource: e.target.value as ResourceType,
                          }));
                          if (activeStepId === 'economy') scheduleStepAdvance('economy', 550);
                        }}
                        className="w-full px-2 py-1.5 text-xs bg-[#131F34] border border-white/15 rounded text-white"
                      >
                        {RESOURCES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Import</label>
                      <select
                        value={config.importResource}
                        onChange={(e) => {
                          onChangeConfig((prev) => ({
                            ...prev,
                            importResource: e.target.value as ResourceType,
                          }));
                          if (activeStepId === 'economy') scheduleStepAdvance('economy', 550);
                        }}
                        className="w-full px-2 py-1.5 text-xs bg-[#131F34] border border-white/15 rounded text-white"
                      >
                        {RESOURCES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Doctrine</label>
                      <select
                        value={config.doctrine}
                        onChange={(e) => {
                          onChangeConfig((prev) => ({
                            ...prev,
                            doctrine: e.target.value as CustomCountryConfig['doctrine'],
                          }));
                          if (activeStepId === 'economy') scheduleStepAdvance('economy', 550);
                        }}
                        className="w-full px-2 py-1.5 text-xs bg-[#131F34] border border-white/15 rounded text-white"
                      >
                        <option value="Défensive">Défensive</option>
                        <option value="Équilibrée">Équilibrée</option>
                        <option value="Offensive">Offensive</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </GuideSpotlight>
          </div>
        )}
      </div>

      {/* Bottom Launch Bar */}
      <div className="p-4 border-t border-white/10 bg-[#101A2C] space-y-2.5 shrink-0">
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono-tabular">
          <span>
            PIB {config.gdp.toLocaleString('fr-FR')} Md · Armée {config.army}k
          </span>
          <span>
            {config.territoryIds.length}{' '}
            {config.territoryIds.length > 1 ? 'territoires' : 'territoire'}
          </span>
        </div>

        <GuideSpotlight
          active={activeStepId === 'launch'}
          pointerLabel={currentStep.pointerLabel}
        >
          <button
            type="button"
            disabled={!canStart}
            onClick={onStartCustomGame}
            className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-45 disabled:cursor-not-allowed text-slate-950 font-semibold text-sm rounded-md transition-colors cursor-pointer whitespace-nowrap shadow-[0_0_20px_rgba(245,158,11,0.22)]"
          >
            Commencer la partie
          </button>
        </GuideSpotlight>
      </div>
    </aside>
  );
};
