import React, { useMemo, useState } from 'react';
import {
  ChevronDown,
  Globe2,
  Handshake,
  Loader2,
  MessageSquareText,
  Search,
  Send,
  Shield,
  Sparkles,
  Swords,
  Users,
  X,
} from 'lucide-react';
import {
  formatDateFr,
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
  onCloseMobilePanel?: () => void;
  isAiSending: boolean;
}

type DirectoryFilter = 'all' | 'threads' | 'allies' | 'wars';

export const ChatHubPanel: React.FC<ChatHubPanelProps> = ({
  world,
  selectedTargetId,
  onSelectTargetCountry,
  onFocusCountry,
  onSendAiMessage,
  onCloseMobilePanel,
  isAiSending,
}) => {
  const player = world.playerCountryId ? world.countries[world.playerCountryId] : null;
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<DirectoryFilter>('all');
  const [showDirectory, setShowDirectory] = useState<boolean>(() => !selectedTargetId);
  const [messageInput, setMessageInput] = useState('');

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
      : null;

  const quickStripCountries = sovereignCountries.slice(0, 12);

  const handlePickCountry = (countryId: string) => {
    onSelectTargetCountry(countryId);
    onFocusCountry(countryId);
    setShowDirectory(false);
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
    <div className="flex flex-col h-full bg-gradient-to-b from-[#0A1529] via-[#0B162C] to-[#081020] text-slate-100">
      {/* Salon Header */}
      <div className="px-4 py-3 border-b border-amber-400/20 bg-gradient-to-r from-[#0E1E3A] to-[#0A162B] flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400/20 to-amber-600/10 border border-amber-400/40 flex items-center justify-center shrink-0">
            <MessageSquareText className="w-4.5 h-4.5 text-amber-300" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-display font-semibold text-amber-100 truncate">
              Chancellerie &amp; Chat
            </h2>
            <p className="text-[11px] text-slate-400 truncate">
              Correspondance directe avec les dirigeants
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowDirectory((prev) => !prev)}
            className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors cursor-pointer ${
              showDirectory
                ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                : 'bg-[#122444] hover:bg-[#172D54] border-amber-400/25 text-slate-200'
            }`}
          >
            <Globe2 className="w-3.5 h-3.5 text-amber-300" />
            <span>{showDirectory && validTarget ? 'Retour chat' : 'Pays'}</span>
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

      {/* Horizontal Quick-Flag Bar when chatting */}
      {!showDirectory && quickStripCountries.length > 0 && (
        <div className="px-3 py-2 border-b border-white/10 bg-[#091224] flex items-center gap-2 overflow-x-auto shrink-0">
          {quickStripCountries.map((c) => {
            const isSelected = validTarget?.id === c.id;
            const atWar = Boolean(isAtWarBetween(world, player.id, c.id));
            const allied = sharesAlliance(world.alliances, player.id, c.id, 'ALLIANCE');
            const threadCount = (world.threads[pairKey(player.id, c.id)] || []).length;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => handlePickCountry(c.id)}
                title={c.nameFr}
                className={`min-h-[40px] px-2.5 py-1.5 rounded-lg border flex items-center gap-2 shrink-0 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-b from-[#1A315B] to-[#122343] border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.22)] text-amber-100'
                    : 'bg-[#0F1C36] hover:bg-[#152647] border-white/10 text-slate-300'
                }`}
              >
                <CountryFlag
                  flag={c.flag}
                  fallbackColor={c.color}
                  name={c.nameFr}
                  className="w-6 h-4 rounded-xs border border-white/20 shrink-0"
                />
                <span className="text-xs font-medium whitespace-nowrap max-w-[105px] truncate">
                  {c.nameFr}
                </span>
                {atWar && <Swords className="w-3 h-3 text-rose-400 shrink-0" />}
                {!atWar && allied && <Shield className="w-3 h-3 text-sky-400 shrink-0" />}
                {!atWar && !allied && threadCount > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* DIRECTORY VIEW OR CONVERSATION VIEW */}
      {showDirectory || !validTarget ? (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Search & Filters */}
          <div className="p-3 border-b border-white/10 bg-[#0C1830] space-y-2.5 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 text-amber-300/70 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un pays, capitale ou dirigeant..."
                className="w-full min-h-[42px] pl-9 pr-8 py-2 text-xs bg-[#081122] border border-amber-400/25 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
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

            <div className="grid grid-cols-4 gap-1 p-1 bg-[#081020] border border-white/10 rounded-lg">
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
                  className={`min-h-[34px] px-2 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    filter === key
                      ? 'bg-gradient-to-b from-amber-400/25 to-amber-500/15 text-amber-200 border border-amber-400/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Country Directory List with Prominent Flags */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredCountries.length === 0 ? (
              <div className="text-center py-8 px-4 text-xs text-slate-400">
                Aucun État ne correspond à ce filtre.
              </div>
            ) : (
              filteredCountries.map((c) => {
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
                    className="w-full min-h-[58px] p-2.5 rounded-xl bg-gradient-to-r from-[#0F1E38] to-[#0C172C] hover:from-[#162A4E] hover:to-[#11203D] border border-white/10 hover:border-amber-400/45 flex items-center justify-between gap-3 text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <CountryFlag
                        flag={c.flag}
                        fallbackColor={c.color}
                        name={c.nameFr}
                        className="w-10 h-7 rounded-sm border border-amber-300/30 shadow-sm shrink-0"
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

                    <div className="flex flex-col items-end gap-1 shrink-0">
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
                      {msgCount > 0 ? (
                        <span className="text-[10px] text-amber-300 flex items-center gap-1 font-mono-tabular">
                          <MessageSquareText className="w-3 h-3" />
                          {msgCount}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">Discuter</span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* ACTIVE DIPLOMATIC CHAT CONVERSATION */
        <div className="flex-1 flex flex-col min-h-0">
          {/* Bilateral Diplomatic Banner with Both Flags */}
          <div className="p-3.5 border-b border-amber-400/20 bg-gradient-to-r from-[#10213F] via-[#0E1C35] to-[#10213F] shrink-0 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex items-center -space-x-2 shrink-0">
                  <CountryFlag
                    flag={player.flag}
                    fallbackColor={player.color}
                    name={player.nameFr}
                    className="w-7 h-5 rounded-xs border border-amber-300/60 shadow-sm z-10"
                  />
                  <CountryFlag
                    flag={validTarget.flag}
                    fallbackColor={validTarget.color}
                    name={validTarget.nameFr}
                    className="w-10 h-7 rounded-sm border border-amber-300/60 shadow-md"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-display font-semibold text-white truncate">
                      {validTarget.nameFr}
                    </h3>
                    {activeWar && <Swords className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                  </div>
                  <p className="text-[11px] text-slate-300 truncate">
                    {validTarget.leaderTitle} {validTarget.leaderName} ·{' '}
                    <span className="text-amber-300/90">{validTarget.personality}</span>
                  </p>
                </div>
              </div>

              <div className="min-w-0">
                <span className="text-[10px] uppercase tracking-wider text-amber-300/80 font-semibold">
                  {validTarget.capital}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] pt-0.5">
              <span className="text-slate-400 flex items-center gap-1.5 truncate">
                <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{validTarget.regime}</span>
              </span>
              <span
                className={`font-semibold font-mono-tabular shrink-0 ${
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
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
            {messages.length === 0 ? (
              <div className="p-3.5 rounded-xl bg-[#0F1E38]/90 border border-amber-400/20 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-200">
                  <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>Ouverture du canal diplomatique</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Adressez une dépêche officielle à {validTarget.leaderTitle}{' '}
                  {validTarget.leaderName}. Votre message influencera les relations et les
                  traités.
                </p>
                <div className="space-y-1.5 pt-1">
                  {quickPrompts.map((qp) => (
                    <button
                      key={qp}
                      type="button"
                      onClick={() => setMessageInput(qp)}
                      className="w-full min-h-[40px] text-left text-xs px-3 py-2 bg-[#142748] hover:bg-[#1B335D] border border-white/10 hover:border-amber-400/40 text-slate-100 rounded-lg transition-colors cursor-pointer"
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
                  className={`p-3 rounded-xl text-xs leading-relaxed ${
                    m.sender === 'player'
                      ? 'bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-400/35 text-amber-50 ml-5'
                      : m.sender === 'system'
                        ? 'bg-white/5 border border-white/10 text-slate-300 text-[11px] text-center'
                        : 'bg-gradient-to-br from-[#122444] to-[#0E1C36] border border-sky-400/20 text-slate-100 mr-5'
                  }`}
                >
                  {m.sender !== 'system' && (
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5">
                      <span className="font-semibold text-amber-200/90 flex items-center gap-1.5">
                        <CountryFlag
                          flag={m.sender === 'player' ? player.flag : validTarget.flag}
                          fallbackColor={m.sender === 'player' ? player.color : validTarget.color}
                          name={m.senderLabel}
                          className="w-4 h-2.5 rounded-xs border border-white/20 shrink-0"
                        />
                        {m.senderLabel}
                      </span>
                      <span className="font-mono-tabular">{m.dateLabel}</span>
                    </div>
                  )}
                  <p>{m.text}</p>
                </div>
              ))
            )}

            {isAiSending && (
              <div className="flex items-center gap-2 text-xs text-amber-200/90 px-2 py-1">
                <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                <span>La chancellerie de {validTarget.nameFr} rédige sa réponse...</span>
              </div>
            )}
          </div>

          {/* Diplomatic Compose Form */}
          <form
            onSubmit={handleSend}
            className="p-3 border-t border-amber-400/20 bg-[#0A1428] shrink-0 space-y-2"
          >
            {messages.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                {quickPrompts.map((qp, idx) => (
                  <button
                    key={qp}
                    type="button"
                    onClick={() => setMessageInput(qp)}
                    className="px-2.5 py-1 text-[11px] rounded-md bg-[#132545] hover:bg-[#1B3460] border border-white/10 text-slate-300 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Suggestion {idx + 1}
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
                className="flex-1 min-h-[44px] px-3.5 py-2 text-xs bg-[#11203D] border border-amber-400/25 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                disabled={!messageInput.trim() || isAiSending}
                className="min-h-[44px] min-w-[48px] px-4 py-2 bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 disabled:opacity-40 text-slate-950 font-semibold rounded-xl transition-all cursor-pointer disabled:cursor-default shrink-0 flex items-center justify-center shadow-[0_0_16px_rgba(245,158,11,0.25)]"
                title="Envoyer la dépêche"
                aria-label="Envoyer la dépêche"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="text-[10px] text-slate-500 flex items-center justify-between px-0.5">
              <span>Canal chiffré · {formatDateFr(world.year, world.month)}</span>
              <span>Réponse immédiate</span>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
