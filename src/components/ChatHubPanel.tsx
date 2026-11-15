import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Coins,
  Handshake,
  Loader2,
  MapPin,
  MessageSquareText,
  Scale,
  Search,
  Send,
  Shield,
  Sparkles,
  Swords,
  Users,
  X,
} from 'lucide-react';
import {
  formatFullDateFr,
  getRelation,
  getRelationStatusFr,
  isAtWarBetween,
  pairKey,
  sharesAlliance,
} from '../engine/simulationEngine';
import { DiplomaticThreadMessage, WorldState } from '../types/game';
import { CountryFlag } from './CountryFlag';

interface ChatHubPanelProps {
  world: WorldState;
  selectedTargetId: string | null;
  onSelectTargetCountry: (countryId: string) => void;
  onFocusCountry: (countryId: string) => void;
  onSendAiMessage: (targetId: string, message: string) => Promise<void>;
  onFormCoalition: (type: 'ALLIANCE' | 'ECONOMIC_UNION', targetId: string) => void;
  onSignTradeDeal: (targetId: string) => void;
  onSignNonAggression: (targetId: string) => void;
  onSendAid: (targetId: string, amount: number) => void;
  onDeclareWar: (targetId: string) => void;
  onPeaceTreaty: (
    warId: string,
    terms: 'STATUS_QUO' | 'REPARATIONS' | 'ANNEXATION' | 'CAPITULATION',
    forcedWinnerId?: string
  ) => void;
  onLaunchOffensive: (warId: string) => void;
  isAiSending: boolean;
  feedback?: string | null;
}

type DirectoryFilter = 'all' | 'threads' | 'allies' | 'wars';

export const ChatHubPanel: React.FC<ChatHubPanelProps> = ({
  world,
  selectedTargetId,
  onSelectTargetCountry,
  onFocusCountry,
  onSendAiMessage,
  onFormCoalition,
  onSignTradeDeal,
  onSignNonAggression,
  onSendAid,
  onDeclareWar,
  onPeaceTreaty,
  onLaunchOffensive,
  isAiSending,
  feedback,
}) => {
  const player = world.playerCountryId ? world.countries[world.playerCountryId] : null;
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<DirectoryFilter>('all');
  const [viewMode, setViewMode] = useState<'directory' | 'thread'>(() =>
    selectedTargetId ? 'thread' : 'directory'
  );
  const [showTreatyBar, setShowTreatyBar] = useState(true);
  const [confirmWarId, setConfirmWarId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');

  useEffect(() => {
    if (selectedTargetId && player && selectedTargetId !== player.id) {
      setViewMode('thread');
      setConfirmWarId(null);
    }
  }, [selectedTargetId, player]);

  const sovereignCountries = useMemo(() => {
    if (!player) return [];
    return Object.values(world.countries)
      .filter((c) => c.ownerId === c.id && c.id !== player.id)
      .sort((a, b) => {
        const warA = isAtWarBetween(world, player.id, a.id) ? 1 : 0;
        const warB = isAtWarBetween(world, player.id, b.id) ? 1 : 0;
        if (warA !== warB) return warB - warA;

        const lenA = (world.threads[pairKey(player.id, a.id)] || []).length;
        const lenB = (world.threads[pairKey(player.id, b.id)] || []).length;
        if ((lenA > 0) !== (lenB > 0)) return lenB - lenA;

        const allyA = sharesAlliance(world.alliances, player.id, a.id, 'ALLIANCE') ? 1 : 0;
        const allyB = sharesAlliance(world.alliances, player.id, b.id, 'ALLIANCE') ? 1 : 0;
        if (allyA !== allyB) return allyB - allyA;

        return b.gdp - a.gdp;
      });
  }, [world, player]);

  const filteredCountries = useMemo(() => {
    if (!player) return [];
    const q = search.trim().toLowerCase();
    return sovereignCountries.filter((c) => {
      if (filter === 'threads') {
        const msgs = world.threads[pairKey(player.id, c.id)] || [];
        if (msgs.length === 0) return false;
      } else if (filter === 'allies') {
        const allied =
          sharesAlliance(world.alliances, player.id, c.id, 'ALLIANCE') ||
          sharesAlliance(world.alliances, player.id, c.id, 'ECONOMIC_UNION');
        if (!allied) return false;
      } else if (filter === 'wars') {
        if (!isAtWarBetween(world, player.id, c.id)) return false;
      }
      if (!q) return true;
      return (
        c.nameFr.toLowerCase().includes(q) ||
        c.leaderName.toLowerCase().includes(q) ||
        c.capital.toLowerCase().includes(q)
      );
    });
  }, [sovereignCountries, filter, search, world, player]);

  if (!player) return null;

  const validTarget =
    selectedTargetId &&
    selectedTargetId !== player.id &&
    world.countries[selectedTargetId]?.ownerId === selectedTargetId
      ? world.countries[selectedTargetId]
      : sovereignCountries[0] ?? null;

  const handlePickCountry = (countryId: string) => {
    onSelectTargetCountry(countryId);
    onFocusCountry(countryId);
    setConfirmWarId(null);
    setViewMode('thread');
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validTarget) return;
    const trimmed = messageInput.trim();
    if (!trimmed || isAiSending) return;
    setMessageInput('');
    await onSendAiMessage(validTarget.id, trimmed);
  };

  const activeWar = validTarget ? isAtWarBetween(world, player.id, validTarget.id) : null;
  const relation = validTarget ? getRelation(world, player.id, validTarget.id) : 0;
  const relStatus = getRelationStatusFr(relation, Boolean(activeWar));
  const messages: DiplomaticThreadMessage[] = validTarget
    ? world.threads[pairKey(player.id, validTarget.id)] || []
    : [];

  const isAllied = validTarget
    ? Boolean(sharesAlliance(world.alliances, player.id, validTarget.id, 'ALLIANCE'))
    : false;
  const isSameUnion = validTarget
    ? Boolean(sharesAlliance(world.alliances, player.id, validTarget.id, 'ECONOMIC_UNION'))
    : false;
  const hasNap = validTarget
    ? world.nonAggressionPacts.includes(pairKey(player.id, validTarget.id))
    : false;
  const hasTradeDeal = validTarget
    ? (world.tradeDeals ?? []).some(
        (td) =>
          (td.exporterId === player.id && td.importerId === validTarget.id) ||
          (td.exporterId === validTarget.id && td.importerId === player.id)
      )
    : false;

  const isWarAgg = activeWar
    ? activeWar.aggressorId === player.id || activeWar.aggressorAllies.includes(player.id)
    : false;
  const playerWarAdvantage = activeWar ? (isWarAgg ? activeWar.warScore : -activeWar.warScore) : 0;
  const offensiveOrdered = activeWar
    ? isWarAgg
      ? Boolean(activeWar.offensiveBoostAggressor)
      : Boolean(activeWar.offensiveBoostDefender)
    : false;

  const quickPrompts = activeWar
    ? [
        'Nous proposons un cessez-le-feu immédiat et des négociations de paix.',
        'Capitulez maintenant ou notre offensive s’intensifiera.',
      ]
    : [
        'Proposons un partenariat commercial et une union économique.',
        'Souhaitez-vous conclure une alliance militaire défensive ?',
        'Nous souhaitons renforcer la coopération diplomatique entre nos deux nations.',
      ];

  return (
    <div className="h-full flex flex-col bg-[#0B1322] text-slate-100 min-h-0">
      {viewMode === 'directory' || !validTarget ? (
        <>
          {/* Directory Search & Filter Header */}
          <div className="p-3 border-b border-white/10 space-y-2.5 shrink-0 bg-[#0D1628]">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-200">
                <MessageSquareText className="w-4 h-4 text-amber-300 shrink-0" />
                <span>Chancelleries étrangères</span>
              </div>
              {validTarget && (
                <button
                  type="button"
                  onClick={() => setViewMode('thread')}
                  className="text-[11px] font-medium text-amber-300 hover:text-amber-200 flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <span>Reprendre avec {validTarget.nameFr}</span>
                </button>
              )}
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-amber-300/75 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un pays, dirigeant, capitale..."
                className="w-full min-h-[40px] pl-9 pr-8 py-2 text-xs bg-[#08101E] border border-white/15 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  aria-label="Effacer la recherche"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-4 gap-1 p-1 bg-[#070E1B] border border-white/10 rounded-lg">
              {(
                [
                  ['all', 'Tous'],
                  ['threads', 'Échanges'],
                  ['allies', 'Alliés'],
                  ['wars', 'Guerres'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={`min-h-[30px] px-1.5 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    filter === key
                      ? 'bg-[#17294A] text-amber-200 border border-amber-400/35'
                      : 'text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Country List */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 min-h-0">
            {filteredCountries.length === 0 ? (
              <div className="text-center py-8 px-4 text-xs text-slate-400">
                Aucun État ne correspond à ce filtre.
              </div>
            ) : (
              filteredCountries.map((c) => {
                const isActive = validTarget?.id === c.id;
                const rel = getRelation(world, player.id, c.id);
                const war = Boolean(isAtWarBetween(world, player.id, c.id));
                const allied = sharesAlliance(world.alliances, player.id, c.id, 'ALLIANCE');
                const union = sharesAlliance(world.alliances, player.id, c.id, 'ECONOMIC_UNION');
                const msgCount = (world.threads[pairKey(player.id, c.id)] || []).length;

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handlePickCountry(c.id)}
                    className={`w-full min-h-[56px] p-2.5 rounded-lg border flex items-center justify-between gap-2.5 text-left transition-colors cursor-pointer group ${
                      isActive
                        ? 'bg-[#142544] border-amber-400/60'
                        : 'bg-[#0F1B30] hover:bg-[#152440] border-white/10 hover:border-amber-400/35'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CountryFlag
                        flag={c.flag}
                        fallbackColor={c.color}
                        name={c.nameFr}
                        className="w-10 h-6.5 rounded-xs border border-amber-300/35 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-white group-hover:text-amber-200 truncate">
                            {c.nameFr}
                          </span>
                          {war && <Swords className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                          {!war && allied && <Shield className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                          {!war && !allied && union && (
                            <Handshake className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {c.leaderTitle} {c.leaderName} · {c.capital}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                      <span
                        className={`text-xs font-mono-tabular font-semibold ${
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
                      {msgCount > 0 && (
                        <span className="text-[10px] text-amber-300 flex items-center gap-1 font-mono-tabular">
                          <MessageSquareText className="w-3 h-3" />
                          {msgCount}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </>
      ) : (
        <>
          {/* Active Country Header */}
          <div className="p-3 border-b border-white/10 bg-[#0F1B30] shrink-0 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => setViewMode('directory')}
                  className="min-h-[34px] px-2 py-1 rounded-lg bg-[#162746] hover:bg-[#1E355E] border border-white/10 text-xs text-amber-200 flex items-center gap-1 shrink-0 cursor-pointer whitespace-nowrap"
                  title="Changer de pays"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Pays</span>
                </button>

                <CountryFlag
                  flag={validTarget.flag}
                  fallbackColor={validTarget.color}
                  name={validTarget.nameFr}
                  className="w-9 h-6 rounded-xs border border-amber-300/50 shrink-0"
                />

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-display font-semibold text-white truncate">
                      {validTarget.nameFr}
                    </h3>
                    {activeWar && <Swords className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                  </div>
                  <p className="text-[11px] text-slate-300 truncate">
                    {validTarget.leaderTitle} {validTarget.leaderName} ·{' '}
                    <span className="text-amber-300">{validTarget.personality}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onFocusCountry(validTarget.id)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-amber-300 cursor-pointer"
                  title="Centrer sur la carte"
                  aria-label="Centrer sur la carte"
                >
                  <MapPin className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowTreatyBar((v) => !v)}
                  aria-expanded={showTreatyBar}
                  className={`px-2 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                    showTreatyBar
                      ? 'bg-amber-400/15 border-amber-400/45 text-amber-200'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:text-white'
                  }`}
                >
                  <Scale className="w-3 h-3 shrink-0" />
                  <span>Traités</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5 truncate">
                <Users className="w-3 h-3 shrink-0" />
                <span className="truncate">
                  {validTarget.regime} · {validTarget.capital}
                </span>
              </span>
              <span
                className={`font-mono-tabular font-semibold whitespace-nowrap ${
                  relStatus.tone === 'emerald'
                    ? 'text-emerald-400'
                    : relStatus.tone === 'sky'
                      ? 'text-sky-400'
                      : relStatus.tone === 'amber'
                        ? 'text-amber-300'
                        : relStatus.tone === 'rose'
                          ? 'text-rose-400'
                          : 'text-slate-300'
                }`}
              >
                {relStatus.label} ({relation > 0 ? `+${relation}` : relation})
              </span>
            </div>

            {/* Direct Treaty & Alliance Negotiation Bar */}
            {showTreatyBar && (
              <div className="pt-2 border-t border-white/10 space-y-1.5">
                {activeWar ? (
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      disabled={offensiveOrdered}
                      onClick={() => onLaunchOffensive(activeWar.id)}
                      className="min-h-[34px] px-2.5 py-1 text-[11px] font-semibold bg-rose-600 hover:bg-rose-500 disabled:opacity-45 text-white rounded-lg cursor-pointer whitespace-nowrap"
                    >
                      {offensiveOrdered ? 'Offensive prête' : 'Lancer offensive (+25%)'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onPeaceTreaty(activeWar.id, 'STATUS_QUO')}
                      className="min-h-[34px] px-2.5 py-1 text-[11px] font-medium bg-[#182947] hover:bg-[#20365D] border border-white/15 text-white rounded-lg cursor-pointer whitespace-nowrap"
                    >
                      Paix blanche
                    </button>
                    {playerWarAdvantage >= 15 && (
                      <button
                        type="button"
                        onClick={() => onPeaceTreaty(activeWar.id, 'REPARATIONS')}
                        className="min-h-[34px] px-2.5 py-1 text-[11px] font-medium bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 rounded-lg cursor-pointer whitespace-nowrap"
                      >
                        Exiger réparations
                      </button>
                    )}
                    {playerWarAdvantage >= 30 && (
                      <button
                        type="button"
                        onClick={() => onPeaceTreaty(activeWar.id, 'ANNEXATION')}
                        className="min-h-[34px] px-2.5 py-1 text-[11px] font-semibold bg-rose-500/25 hover:bg-rose-500/40 border border-rose-400/40 text-rose-100 rounded-lg cursor-pointer whitespace-nowrap"
                      >
                        Annexer territoire
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      disabled={isAllied}
                      onClick={() => onFormCoalition('ALLIANCE', validTarget.id)}
                      className="min-h-[34px] px-2.5 py-1 text-[11px] font-medium bg-[#152645] hover:bg-[#1D3560] disabled:opacity-50 border border-sky-400/30 text-sky-100 rounded-lg flex items-center gap-1 cursor-pointer disabled:cursor-default whitespace-nowrap"
                    >
                      <Shield className="w-3 h-3 text-sky-300 shrink-0" />
                      <span>{isAllied ? 'Alliés' : 'Alliance (+40)'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={isSameUnion}
                      onClick={() => onFormCoalition('ECONOMIC_UNION', validTarget.id)}
                      className="min-h-[34px] px-2.5 py-1 text-[11px] font-medium bg-[#152645] hover:bg-[#1D3560] disabled:opacity-50 border border-emerald-400/30 text-emerald-100 rounded-lg flex items-center gap-1 cursor-pointer disabled:cursor-default whitespace-nowrap"
                    >
                      <Handshake className="w-3 h-3 text-emerald-300 shrink-0" />
                      <span>{isSameUnion ? 'Union active' : 'Union éco (+25)'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={hasTradeDeal}
                      onClick={() => onSignTradeDeal(validTarget.id)}
                      className="min-h-[34px] px-2.5 py-1 text-[11px] font-medium bg-[#152645] hover:bg-[#1D3560] disabled:opacity-50 border border-white/15 text-slate-100 rounded-lg cursor-pointer disabled:cursor-default whitespace-nowrap"
                    >
                      {hasTradeDeal ? 'Commerce actif' : 'Accord commercial'}
                    </button>
                    <button
                      type="button"
                      disabled={hasNap}
                      onClick={() => onSignNonAggression(validTarget.id)}
                      className="min-h-[34px] px-2.5 py-1 text-[11px] font-medium bg-[#152645] hover:bg-[#1D3560] disabled:opacity-50 border border-white/15 text-slate-100 rounded-lg cursor-pointer disabled:cursor-default whitespace-nowrap"
                    >
                      {hasNap ? 'Non-agression signée' : 'Pacte non-agression'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onSendAid(validTarget.id, 10)}
                      className="min-h-[34px] px-2.5 py-1 text-[11px] font-medium bg-[#152645] hover:bg-[#1D3560] border border-amber-400/30 text-amber-200 rounded-lg flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    >
                      <Coins className="w-3 h-3 shrink-0" />
                      <span>Aide 10 Md$</span>
                    </button>
                    {confirmWarId === validTarget.id ? (
                      <button
                        type="button"
                        onClick={() => {
                          onDeclareWar(validTarget.id);
                          setConfirmWarId(null);
                        }}
                        className="min-h-[34px] px-2.5 py-1 text-[11px] font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-lg cursor-pointer whitespace-nowrap"
                      >
                        Confirmer guerre
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmWarId(validTarget.id)}
                        className="min-h-[34px] px-2.5 py-1 text-[11px] font-medium bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/35 text-rose-200 rounded-lg flex items-center gap-1 cursor-pointer whitespace-nowrap"
                      >
                        <Swords className="w-3 h-3 shrink-0" />
                        <span>Guerre</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {feedback && (
            <div className="px-3 py-1.5 bg-amber-500/15 border-b border-amber-400/30 text-[11px] text-amber-200 shrink-0">
              {feedback}
            </div>
          )}

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-0">
            {messages.length === 0 ? (
              <div className="p-3.5 rounded-xl bg-[#0F1D36] border border-white/10 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-200">
                  <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>Ouverture du canal diplomatique</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Écrivez directement à {validTarget.leaderTitle} {validTarget.leaderName}. Vos
                  propos influencent vos relations et permettent de négocier alliances, accords ou
                  cessez-le-feu.
                </p>
                <div className="space-y-1.5 pt-1">
                  {quickPrompts.map((qp) => (
                    <button
                      key={qp}
                      type="button"
                      onClick={() => setMessageInput(qp)}
                      className="w-full min-h-[38px] text-left text-xs px-3 py-2 bg-[#142646] hover:bg-[#1B335E] border border-white/10 hover:border-amber-400/35 text-slate-100 rounded-lg transition-colors cursor-pointer"
                    >
                      « {qp} »
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`p-3 rounded-xl text-xs leading-relaxed max-w-[92%] ${
                    m.sender === 'player'
                      ? 'bg-amber-500/15 border border-amber-400/35 text-amber-50 ml-auto'
                      : m.sender === 'system'
                        ? 'bg-white/5 border border-white/10 text-slate-300 text-[11px] text-center mx-auto'
                        : 'bg-[#122240] border border-sky-400/25 text-slate-100 mr-auto'
                  }`}
                >
                  {m.sender !== 'system' && (
                    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400 mb-1">
                      <span className="font-semibold text-amber-200 flex items-center gap-1.5 truncate">
                        <CountryFlag
                          flag={m.sender === 'player' ? player.flag : validTarget.flag}
                          fallbackColor={
                            m.sender === 'player' ? player.color : validTarget.color
                          }
                          name={m.senderLabel}
                          className="w-4.5 h-3 rounded-xs border border-white/25 shrink-0"
                        />
                        <span className="truncate">{m.senderLabel}</span>
                      </span>
                      <span className="font-mono-tabular shrink-0">{m.dateLabel}</span>
                    </div>
                  )}
                  <p>{m.text}</p>
                </div>
              ))
            )}

            {isAiSending && (
              <div className="flex items-center gap-2 text-xs text-amber-200 px-1 py-1">
                <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                <span>La chancellerie de {validTarget.nameFr} rédige sa réponse...</span>
              </div>
            )}
          </div>

          {/* Compose Form */}
          <form
            onSubmit={handleSend}
            className="p-3 border-t border-white/10 bg-[#091222] shrink-0 space-y-2"
          >
            {messages.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                {quickPrompts.map((qp, idx) => (
                  <button
                    key={qp}
                    type="button"
                    onClick={() => setMessageInput(qp)}
                    className="px-2 py-1 text-[11px] rounded-md bg-[#132545] hover:bg-[#1B3460] border border-white/10 text-slate-300 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Modèle {idx + 1}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder={`Écrire à ${validTarget.nameFr}...`}
                disabled={isAiSending}
                className="flex-1 min-h-[44px] px-3.5 py-2 text-xs bg-[#101F3A] border border-white/15 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                disabled={!messageInput.trim() || isAiSending}
                className="min-h-[44px] min-w-[48px] px-3.5 py-2 bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 disabled:opacity-40 text-slate-950 font-bold rounded-lg transition-all cursor-pointer disabled:cursor-default shrink-0 flex items-center justify-center gap-1.5"
                title="Envoyer la dépêche"
                aria-label="Envoyer la dépêche"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline text-xs">Envoyer</span>
              </button>
            </div>
            <div className="text-[10px] text-slate-500 flex items-center justify-between">
              <span>{formatFullDateFr(world.year, world.month, world.day)}</span>
              <span>Chancellerie active</span>
            </div>
          </form>
        </>
      )}
    </div>
  );
};
