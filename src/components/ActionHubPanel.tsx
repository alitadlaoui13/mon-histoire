import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Building2,
  Calendar,
  ChevronDown,
  Crown,
  FastForward,
  Handshake,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  ScrollText,
  Search,
  Send,
  SlidersHorizontal,
  Sparkles,
  Swords,
} from 'lucide-react';
import { CountryPolicy, WorldState } from '../types/game';
import { CountryFlag } from './CountryFlag';
import { DiplomacyPanel } from './DiplomacyPanel';
import { NationalPanel } from './NationalPanel';
import { FreeActionLogEntry } from '../engine/freeActionEngine';
import { getRelation, isAtWarBetween } from '../engine/simulationEngine';

export type ActionSubView = 'free' | 'nation' | 'diplomacy' | 'tools';

interface ActionHubPanelProps {
  world: WorldState;
  dateLabel: string;
  autoPlay: boolean;
  onToggleAutoPlay: () => void;
  onAdvanceMonth: () => void;
  onTriggerCrisis: () => void;
  isGeneratingCrisis: boolean;
  onOpenStats: () => void;
  onResetGame: () => void;
  activeSubView: ActionSubView;
  onChangeSubView: (view: ActionSubView) => void;
  selectedForeignId: string | null;
  onSelectForeignCountry: (countryId: string) => void;
  onOpenChatForCountry: (countryId: string) => void;
  onCloseMobilePanel?: () => void;
  // Free-form natural language decision execution
  actionLogs: FreeActionLogEntry[];
  isExecutingFreeAction: boolean;
  onExecuteFreeAction: (prompt: string) => Promise<void>;
  // NationalPanel handlers
  onUpdatePolicy: (policy: Partial<CountryPolicy>) => void;
  onRecruit: (troopsK: number) => void;
  onEnactDirective: (directive: 'INFRASTRUCTURE' | 'COHESION' | 'RECHERCHE') => void;
  onLeaveCoalition: (allianceId: string) => void;
  onPeaceTreaty: (
    warId: string,
    terms: 'STATUS_QUO' | 'REPARATIONS' | 'ANNEXATION' | 'CAPITULATION',
    forcedWinnerId?: string
  ) => void;
  onLaunchOffensive: (warId: string) => void;
  onFocusCountry: (countryId: string) => void;
  // DiplomacyPanel handlers
  onBackToOwnCountry: () => void;
  onDeclareWar: (targetId: string) => void;
  onFormCoalition: (type: 'ALLIANCE' | 'ECONOMIC_UNION', targetId: string) => void;
  onSendAid: (targetId: string, amount: number) => void;
  onSignNonAggression: (targetId: string) => void;
  onSignTradeDeal: (targetId: string) => void;
  onSendAiMessage: (targetId: string, message: string) => Promise<void>;
  isAiSending: boolean;
  feedback: string | null;
}

export const ActionHubPanel: React.FC<ActionHubPanelProps> = ({
  world,
  dateLabel,
  autoPlay,
  onToggleAutoPlay,
  onAdvanceMonth,
  onTriggerCrisis,
  isGeneratingCrisis,
  onOpenStats,
  onResetGame,
  activeSubView,
  onChangeSubView,
  selectedForeignId,
  onSelectForeignCountry,
  onOpenChatForCountry,
  onCloseMobilePanel,
  actionLogs,
  isExecutingFreeAction,
  onExecuteFreeAction,
  onUpdatePolicy,
  onRecruit,
  onEnactDirective,
  onLeaveCoalition,
  onPeaceTreaty,
  onLaunchOffensive,
  onFocusCountry,
  onBackToOwnCountry,
  onDeclareWar,
  onFormCoalition,
  onSendAid,
  onSignNonAggression,
  onSignTradeDeal,
  onSendAiMessage,
  isAiSending,
  feedback,
}) => {
  const [freeInput, setFreeInput] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

  const player = world.playerCountryId ? world.countries[world.playerCountryId] : null;
  const foreignTarget =
    selectedForeignId &&
    player &&
    selectedForeignId !== player.id &&
    world.countries[selectedForeignId]
      ? world.countries[selectedForeignId]
      : null;

  const foreignList = useMemo(() => {
    if (!player) return [];
    const q = countrySearch.trim().toLowerCase();
    return Object.values(world.countries)
      .filter((c) => c.ownerId === c.id && c.id !== player.id)
      .filter(
        (c) =>
          !q ||
          c.nameFr.toLowerCase().includes(q) ||
          c.leaderName.toLowerCase().includes(q)
      )
      .sort((a, b) => b.gdp - a.gdp)
      .slice(0, 30);
  }, [world.countries, player, countrySearch]);

  if (!player) return null;

  const handleSubmitFreeAction = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = freeInput.trim();
    if (!trimmed || isExecutingFreeAction) return;
    setFreeInput('');
    await onExecuteFreeAction(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      const trimmed = freeInput.trim();
      if (trimmed && !isExecutingFreeAction) {
        setFreeInput('');
        void onExecuteFreeAction(trimmed);
      }
    }
  };

  const isToolsMode = activeSubView !== 'free';

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#0A1529] via-[#0B162C] to-[#081020] text-slate-100">
      {/* Header */}
      <div className="px-4 py-3 border-b border-amber-400/20 bg-gradient-to-r from-[#0E1E3A] to-[#0A162B] flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400/25 to-amber-600/10 border border-amber-400/45 flex items-center justify-center shrink-0">
            <Crown className="w-4.5 h-4.5 text-amber-300" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-display font-semibold text-amber-100 truncate">
              {isToolsMode ? 'Gestion & Simulation' : 'Décisions Libres'}
            </h2>
            <p className="text-[11px] text-slate-400 font-mono-tabular flex items-center gap-1.5 truncate">
              <Calendar className="w-3 h-3 text-amber-300/80 shrink-0" />
              <span>{dateLabel}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onAdvanceMonth}
            className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap transition-colors"
            title="Avancer d'un mois"
          >
            <span className="hidden sm:inline">Mois</span>
            <FastForward className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onChangeSubView(isToolsMode ? 'free' : 'tools')}
            className={`min-h-[38px] px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              isToolsMode
                ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                : 'bg-[#122444] hover:bg-[#172D54] border-amber-400/25 text-slate-200'
            }`}
            title={isToolsMode ? 'Revenir aux décisions libres' : 'Temps, statistiques et gestion'}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-300" />
            <span>{isToolsMode ? 'Décisions' : 'Gestion'}</span>
          </button>

          {onCloseMobilePanel && (
            <button
              type="button"
              onClick={onCloseMobilePanel}
              className="lg:hidden min-h-[38px] min-w-[38px] rounded-lg bg-[#122444] border border-white/15 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
              aria-label="Voir la carte"
              title="Voir la carte"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* PRIMARY MODE: FREE-FORM NATURAL LANGUAGE DECISION SYSTEM */}
      {activeSubView === 'free' && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Free-text Decree Box */}
          <form
            onSubmit={handleSubmitFreeAction}
            className="p-3.5 border-b border-amber-400/20 bg-[#0D1A33] space-y-2.5 shrink-0"
          >
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="free-action-textarea"
                className="text-xs font-semibold text-amber-200 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>Écrivez librement votre décision</span>
              </label>
              <span className="text-[11px] font-mono-tabular text-slate-400">
                Trésor : {player.treasury.toFixed(1)} Md $
              </span>
            </div>

            <textarea
              id="free-action-textarea"
              rows={3}
              value={freeInput}
              onChange={(e) => setFreeInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isExecutingFreeAction}
              placeholder="Ex : Construire un pont entre l'Espagne et le Maroc, Déclarer la guerre à Madagascar, Créer une alliance économique avec plusieurs pays, Construire des routes..."
              className="w-full min-h-[88px] px-3.5 py-2.5 text-xs sm:text-sm bg-[#081122] border border-amber-400/35 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 resize-y leading-relaxed"
            />

            <button
              type="submit"
              disabled={!freeInput.trim() || isExecutingFreeAction}
              className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 disabled:opacity-45 text-slate-950 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all cursor-pointer disabled:cursor-default"
            >
              {isExecutingFreeAction ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Simulation des conséquences...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Exécuter la décision</span>
                </>
              )}
            </button>
          </form>

          {feedback && (
            <div className="px-4 py-2 bg-amber-500/15 border-b border-amber-400/30 text-xs text-amber-200 shrink-0">
              {feedback}
            </div>
          )}

          {/* Decision Consequences History Log */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
            {actionLogs.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#0F1E38]/90 border border-amber-400/20 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-200">
                  <ScrollText className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>Pouvoir souverain sans limite</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Formulez n’importe quelle décision en français. Le moteur interprète votre
                  phrase, applique des conséquences réelles sur votre économie, vos armées, vos
                  relations et la carte du monde.
                </p>
                <div className="pt-1 border-t border-white/10 space-y-1.5 text-[11px] text-slate-400">
                  <div className="text-amber-300/90 font-medium">Exemples d’ordres possibles :</div>
                  <p>« Construire un pont entre l’Espagne et le Maroc »</p>
                  <p>« Déclarer la guerre à Madagascar »</p>
                  <p>« Lancer une opération nucléaire fictive contre la France dans le jeu »</p>
                  <p>« Créer une alliance économique avec plusieurs pays »</p>
                  <p>« Construire des routes et développer mon économie »</p>
                </div>
              </div>
            ) : (
              actionLogs.map((entry) => (
                <div
                  key={entry.id}
                  className="p-3.5 rounded-xl bg-gradient-to-br from-[#10203E] to-[#0B162C] border border-amber-400/25 space-y-2 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400">
                    <span className="font-semibold uppercase tracking-wider text-amber-300">
                      {entry.effect.category}
                    </span>
                    <span className="font-mono-tabular">{entry.dateLabel}</span>
                  </div>

                  <div className="text-xs font-medium text-amber-100/95 italic bg-[#081122]/80 px-2.5 py-1.5 rounded-lg border border-white/5">
                    « {entry.prompt} »
                  </div>

                  <div className="text-xs font-semibold text-white">
                    {entry.effect.summaryTitle}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {entry.effect.narrative}
                  </p>

                  {entry.statBadges.length > 0 && (
                    <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1.5 border-t border-white/10 text-[11px] font-mono-tabular text-amber-200">
                      {entry.statBadges.map((badge) => (
                        <span key={badge}>{badge}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SECONDARY MODE: PRESERVED EXISTING MANAGEMENT, TIME & STATS TOOLS */}
      {isToolsMode && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Sub-navigation between Tools Overview, Mon pays, Diplomatie */}
          <div className="p-3 border-b border-amber-400/20 bg-[#0D1A33] space-y-2.5 shrink-0">
            <div className="grid grid-cols-3 gap-1 p-1 bg-[#081020] border border-amber-400/20 rounded-xl">
              <button
                type="button"
                onClick={() => onChangeSubView('tools')}
                className={`min-h-[36px] px-2 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeSubView === 'tools'
                    ? 'bg-[#18305A] text-amber-200 border border-amber-400/45'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Temps &amp; Stats
              </button>
              <button
                type="button"
                onClick={() => onChangeSubView('nation')}
                className={`min-h-[36px] px-2 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeSubView === 'nation'
                    ? 'bg-[#18305A] text-amber-200 border border-amber-400/45'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Mon pays
              </button>
              <button
                type="button"
                onClick={() => onChangeSubView('diplomacy')}
                className={`min-h-[36px] px-2 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeSubView === 'diplomacy'
                    ? 'bg-[#18305A] text-amber-200 border border-amber-400/45'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Diplomatie
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">
            {activeSubView === 'tools' && (
              <div className="p-4 space-y-3 overflow-y-auto h-full">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={onAdvanceMonth}
                    className="min-h-[44px] px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Mois suivant</span>
                    <FastForward className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={onToggleAutoPlay}
                    className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                      autoPlay
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                        : 'bg-[#10203D] hover:bg-[#172D55] border-amber-400/25 text-slate-200'
                    }`}
                  >
                    {autoPlay ? (
                      <>
                        <Pause className="w-4 h-4 text-amber-300" />
                        <span>Pause auto</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 text-amber-300" />
                        <span>Avance auto</span>
                      </>
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onTriggerCrisis}
                  disabled={isGeneratingCrisis}
                  className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-[#10203D] hover:bg-[#172D55] border border-amber-400/25 text-xs font-semibold text-slate-100 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>{isGeneratingCrisis ? 'Analyse...' : 'Sommet IA (Crise mondiale)'}</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenStats}
                  className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-[#10203D] hover:bg-[#172D55] border border-amber-400/25 text-xs font-semibold text-slate-100 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <BarChart3 className="w-4 h-4 text-sky-300" />
                  <span>Statistiques &amp; Classement mondial</span>
                </button>

                <button
                  type="button"
                  onClick={() => onChangeSubView('nation')}
                  className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-[#10203D] hover:bg-[#172D55] border border-amber-400/25 text-xs font-semibold text-slate-100 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Building2 className="w-4 h-4 text-amber-300" />
                  <span>Gestion nationale (Budget, Armée, Traités)</span>
                </button>

                <button
                  type="button"
                  onClick={() => onChangeSubView('diplomacy')}
                  className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-[#10203D] hover:bg-[#172D55] border border-amber-400/25 text-xs font-semibold text-slate-100 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Handshake className="w-4 h-4 text-emerald-300" />
                  <span>Traités bilatéraux par pays</span>
                </button>

                <div className="pt-3 border-t border-white/10">
                  {!confirmReset ? (
                    <button
                      type="button"
                      onClick={() => setConfirmReset(true)}
                      className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 border border-rose-500/35 text-xs font-semibold text-rose-200 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Recommencer la partie</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmReset(false);
                          onResetGame();
                        }}
                        className="flex-1 min-h-[42px] px-3 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl cursor-pointer"
                      >
                        Confirmer
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmReset(false)}
                        className="flex-1 min-h-[42px] px-3 py-2 text-xs bg-white/10 hover:bg-white/20 text-slate-200 rounded-xl cursor-pointer"
                      >
                        Annuler
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeSubView === 'nation' && (
              <NationalPanel
                world={world}
                onUpdatePolicy={onUpdatePolicy}
                onRecruit={onRecruit}
                onEnactDirective={onEnactDirective}
                onLeaveCoalition={onLeaveCoalition}
                onPeaceTreaty={onPeaceTreaty}
                onLaunchOffensive={onLaunchOffensive}
                onSelectCountry={(countryId) => {
                  onFocusCountry(countryId);
                  onSelectForeignCountry(countryId);
                  onChangeSubView('diplomacy');
                }}
                actionFeedback={feedback}
              />
            )}

            {activeSubView === 'diplomacy' &&
              (foreignTarget ? (
                <DiplomacyPanel
                  world={world}
                  targetCountryId={foreignTarget.id}
                  onBackToOwnCountry={() => {
                    onBackToOwnCountry();
                    onChangeSubView('nation');
                  }}
                  onDeclareWar={onDeclareWar}
                  onFormCoalition={onFormCoalition}
                  onSendAid={onSendAid}
                  onSignNonAggression={onSignNonAggression}
                  onSignTradeDeal={onSignTradeDeal}
                  onPeaceTreaty={onPeaceTreaty}
                  onLaunchOffensive={onLaunchOffensive}
                  onSendAiMessage={onSendAiMessage}
                  isAiSending={isAiSending}
                  diplomaticFeedback={feedback}
                  actionsOnly={true}
                  onOpenChat={onOpenChatForCountry}
                />
              ) : (
                <div className="flex flex-col h-full p-3.5 space-y-3">
                  <div className="relative shrink-0">
                    <Search className="w-4 h-4 text-amber-300/70 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={countrySearch}
                      onChange={(e) => setCountrySearch(e.target.value)}
                      placeholder="Rechercher un pays cible..."
                      className="w-full min-h-[42px] pl-9 pr-3 py-2 text-xs bg-[#081122] border border-amber-400/25 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
                    {foreignList.map((c) => {
                      const rel = getRelation(world, player.id, c.id);
                      const war = Boolean(isAtWarBetween(world, player.id, c.id));
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            onFocusCountry(c.id);
                            onSelectForeignCountry(c.id);
                          }}
                          className="w-full min-h-[48px] px-3 py-2 rounded-xl bg-[#0F1E38] hover:bg-[#162A4E] border border-white/10 hover:border-amber-400/45 flex items-center justify-between gap-2 text-left transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <CountryFlag
                              flag={c.flag}
                              fallbackColor={c.color}
                              name={c.nameFr}
                              className="w-8 h-5 rounded-xs border border-white/20 shrink-0"
                            />
                            <span className="text-xs font-semibold text-white truncate">
                              {c.nameFr}
                            </span>
                            {war && <Swords className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                          </div>
                          <span
                            className={`text-xs font-mono-tabular font-semibold shrink-0 ${
                              war
                                ? 'text-rose-400'
                                : rel >= 35
                                  ? 'text-emerald-400'
                                  : rel <= -20
                                    ? 'text-rose-400'
                                    : 'text-amber-300'
                            }`}
                          >
                            {rel > 0 ? `+${rel}` : rel}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
