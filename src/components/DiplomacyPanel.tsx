import React, { useState } from 'react';
import {
  ArrowLeft,
  Coins,
  Handshake,
  Loader2,
  Send,
  Shield,
  Swords,
  TrendingUp,
} from 'lucide-react';
import {
  formatDateFr,
  getCountryTotalStats,
  getMilitaryPowerIndex,
  getRelation,
  getRelationStatusFr,
  isAtWarBetween,
  pairKey,
  sharesAlliance,
} from '../engine/simulationEngine';
import { DiplomaticThreadMessage, WorldState } from '../types/game';

interface DiplomacyPanelProps {
  world: WorldState;
  targetCountryId: string;
  onBackToOwnCountry: () => void;
  onDeclareWar: (targetId: string) => void;
  onFormCoalition: (type: 'ALLIANCE' | 'ECONOMIC_UNION', targetId: string) => void;
  onSendAid: (targetId: string, amount: number) => void;
  onSignNonAggression: (targetId: string) => void;
  onSignTradeDeal: (targetId: string) => void;
  onPeaceTreaty: (
    warId: string,
    terms: 'STATUS_QUO' | 'REPARATIONS' | 'ANNEXATION' | 'CAPITULATION',
    forcedWinnerId?: string
  ) => void;
  onLaunchOffensive: (warId: string) => void;
  onSendAiMessage: (targetId: string, message: string) => Promise<void>;
  isAiSending: boolean;
  diplomaticFeedback: string | null;
}

export const DiplomacyPanel: React.FC<DiplomacyPanelProps> = ({
  world,
  targetCountryId,
  onBackToOwnCountry,
  onDeclareWar,
  onFormCoalition,
  onSendAid,
  onSignNonAggression,
  onSignTradeDeal,
  onPeaceTreaty,
  onLaunchOffensive,
  onSendAiMessage,
  isAiSending,
  diplomaticFeedback,
}) => {
  const [messageInput, setMessageInput] = useState('');
  const [confirmWar, setConfirmWar] = useState(false);

  const player = world.playerCountryId ? world.countries[world.playerCountryId] : null;
  const target = world.countries[targetCountryId];
  if (!player || !target) return null;

  const targetTotals = getCountryTotalStats(world, target.id);
  const playerPower = getMilitaryPowerIndex(player);
  const targetPower = getMilitaryPowerIndex(target, true);
  const relation = getRelation(world, player.id, target.id);
  const activeWar = isAtWarBetween(world, player.id, target.id);
  const relStatus = getRelationStatusFr(relation, Boolean(activeWar));

  const sharedAlliance = sharesAlliance(world.alliances, player.id, target.id, 'ALLIANCE');
  const sharedUnion = sharesAlliance(world.alliances, player.id, target.id, 'ECONOMIC_UNION');
  const hasPact = world.nonAggressionPacts.includes(pairKey(player.id, target.id));
  const hasTradeDeal = (world.tradeDeals ?? []).some(
    (td) =>
      (td.exporterId === player.id && td.importerId === target.id) ||
      (td.exporterId === target.id && td.importerId === player.id)
  );
  const clickedTerritory =
    world.selectedTerritoryId && world.selectedTerritoryId !== target.id
      ? world.countries[world.selectedTerritoryId]
      : null;

  const threadKey = pairKey(player.id, target.id);
  const messages: DiplomaticThreadMessage[] = world.threads[threadKey] || [];

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = messageInput.trim();
    if (!trimmed || isAiSending) return;
    setMessageInput('');
    await onSendAiMessage(target.id, trimmed);
  };

  const quickPrompts = activeWar
    ? [
        'Nous proposons un cessez-le-feu immédiat et des négociations de paix.',
        'Capitulez maintenant ou notre offensive s’intensifiera.',
      ]
    : [
        'Proposons un partenariat commercial et une union économique.',
        'Souhaitez-vous conclure une alliance militaire défensive ?',
        'Nous demandons le respect strict de nos intérêts régionaux.',
      ];

  const aidAmount = Math.max(2, Number((player.gdp * 0.008).toFixed(1)));

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/10 bg-[#121C2E] space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBackToOwnCountry}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Mon pays</span>
          </button>
          <span
            className={`text-xs font-medium ${
              relStatus.tone === 'emerald'
                ? 'text-emerald-400'
                : relStatus.tone === 'sky'
                  ? 'text-sky-400'
                  : relStatus.tone === 'amber'
                    ? 'text-amber-400'
                    : relStatus.tone === 'rose'
                      ? 'text-rose-400'
                      : 'text-slate-300'
            }`}
          >
            {relStatus.label} ({relation > 0 ? `+${relation}` : relation})
          </span>
        </div>

        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-sm shrink-0"
                style={{ backgroundColor: target.color }}
              />
              <h2 className="text-lg font-display font-semibold text-white">{target.nameFr}</h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {target.leaderTitle} {target.leaderName} · {target.personality}
            </p>
          </div>
          <span className="text-[11px] text-slate-400 text-right">{target.regime}</span>
        </div>

        {/* Compact Key Stats */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <div className="px-2.5 py-1.5 bg-[#0B1220] border border-white/5 rounded text-xs">
            <div className="text-[10px] text-slate-400 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-amber-400" /> PIB
            </div>
            <div className="font-mono-tabular font-semibold text-slate-100 mt-0.5">
              {targetTotals.totalGdp.toLocaleString('fr-FR')} Md
            </div>
          </div>
          <div className="px-2.5 py-1.5 bg-[#0B1220] border border-white/5 rounded text-xs">
            <div className="text-[10px] text-slate-400 flex items-center gap-1">
              <Shield className="w-3 h-3 text-rose-400" /> Combat
            </div>
            <div className="font-mono-tabular font-semibold text-slate-100 mt-0.5">
              {targetPower.toLocaleString('fr-FR')}
            </div>
            <div className="text-[10px] text-slate-500 font-mono-tabular">
              Vous : {playerPower.toLocaleString('fr-FR')}
            </div>
          </div>
          <div className="px-2.5 py-1.5 bg-[#0B1220] border border-white/5 rounded text-xs">
            <div className="text-[10px] text-slate-400">Stabilité</div>
            <div className="font-mono-tabular font-semibold text-slate-100 mt-0.5">
              {Math.round(target.stability)} %
            </div>
            <div className="text-[10px] text-slate-500 font-mono-tabular">
              {target.army.toLocaleString('fr-FR')}k soldats
            </div>
          </div>
        </div>
        {target.resources && (
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-0.5">
            <span>
              Exporte : <span className="text-teal-300">{target.resources.exportResource}</span>
            </span>
            <span>
              Demande : <span className="text-amber-300">{target.resources.importResource}</span>
            </span>
          </div>
        )}

        {clickedTerritory && (
          <div className="px-2.5 py-1.5 bg-amber-500/10 border border-amber-400/25 rounded text-[11px] text-amber-200">
            Territoire cliqué : <span className="font-semibold">{clickedTerritory.nameFr}</span> ·
            Propriétaire actuel : <span className="font-semibold">{target.nameFr}</span>
          </div>
        )}
      </div>

      {diplomaticFeedback && (
        <div className="px-4 py-2 bg-amber-500/15 border-b border-amber-400/30 text-xs text-amber-200">
          {diplomaticFeedback}
        </div>
      )}

      {/* Diplomatic Actions Bar */}
      <div className="p-3 border-b border-white/10 bg-[#0F1726] space-y-2">
        {!activeWar ? (
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              disabled={Boolean(sharedAlliance)}
              onClick={() => onFormCoalition('ALLIANCE', target.id)}
              className="py-1.5 px-2.5 text-xs font-medium rounded border border-white/10 bg-[#141F32] hover:bg-[#1B2B45] disabled:opacity-45 text-slate-100 flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:cursor-default whitespace-nowrap"
            >
              <Handshake className="w-3.5 h-3.5 text-sky-400" />
              <span>{sharedAlliance ? 'Déjà alliés' : 'Alliance'}</span>
            </button>

            <button
              type="button"
              disabled={Boolean(sharedUnion)}
              onClick={() => onFormCoalition('ECONOMIC_UNION', target.id)}
              className="py-1.5 px-2.5 text-xs font-medium rounded border border-white/10 bg-[#141F32] hover:bg-[#1B2B45] disabled:opacity-45 text-slate-100 flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:cursor-default whitespace-nowrap"
            >
              <Coins className="w-3.5 h-3.5 text-emerald-400" />
              <span>{sharedUnion ? 'Même union' : 'Union éco.'}</span>
            </button>

            <button
              type="button"
              onClick={() => onSendAid(target.id, aidAmount)}
              className="py-1.5 px-2.5 text-xs font-medium rounded border border-white/10 bg-[#141F32] hover:bg-[#1B2B45] text-slate-100 transition-colors cursor-pointer whitespace-nowrap"
            >
              Aide ({aidAmount} Mds $)
            </button>

            <button
              type="button"
              disabled={hasPact}
              onClick={() => onSignNonAggression(target.id)}
              className="py-1.5 px-2.5 text-xs font-medium rounded border border-white/10 bg-[#141F32] hover:bg-[#1B2B45] disabled:opacity-45 text-slate-100 transition-colors cursor-pointer disabled:cursor-default whitespace-nowrap"
            >
              {hasPact ? 'Pacte actif' : 'Non-agression'}
            </button>

            <button
              type="button"
              disabled={hasTradeDeal}
              onClick={() => onSignTradeDeal(target.id)}
              className="col-span-2 py-1.5 px-2.5 text-xs font-medium rounded border border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/20 disabled:opacity-50 text-teal-200 transition-colors cursor-pointer disabled:cursor-default whitespace-nowrap"
            >
              {hasTradeDeal
                ? 'Accord commercial actif'
                : `Accord commercial (${target.resources?.exportResource ?? 'Échanges'})`}
            </button>

            {!confirmWar ? (
              <button
                type="button"
                onClick={() => setConfirmWar(true)}
                className="col-span-2 py-1.5 px-2.5 text-xs font-medium rounded border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Swords className="w-3.5 h-3.5" />
                <span>Déclarer la guerre</span>
              </button>
            ) : (
              <div className="col-span-2 flex items-center gap-2 p-2 bg-rose-950/50 border border-rose-500/50 rounded">
                <span className="text-[11px] text-rose-200 flex-1">
                  Confirmer la guerre contre {target.nameFr} ?
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmWar(false);
                    onDeclareWar(target.id);
                  }}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded cursor-pointer"
                >
                  Attaquer
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmWar(false)}
                  className="px-2 py-1 text-[11px] bg-white/10 text-slate-200 rounded cursor-pointer"
                >
                  Annuler
                </button>
              </div>
            )}
          </div>
        ) : (
          (() => {
            const isAgg =
              activeWar.aggressorId === player.id ||
              activeWar.aggressorAllies.includes(player.id);
            const playerOcc = isAgg
              ? activeWar.aggressorOccupation ?? 0
              : activeWar.defenderOccupation ?? 0;
            const playerAdv = isAgg ? activeWar.warScore : -activeWar.warScore;
            const offensiveOrdered = isAgg
              ? Boolean(activeWar.offensiveBoostAggressor)
              : Boolean(activeWar.offensiveBoostDefender);

            return (
              <div className="p-2.5 bg-rose-950/40 border border-rose-500/40 rounded space-y-2">
                <div className="flex items-center justify-between text-xs text-rose-200">
                  <span className="font-semibold">
                    En guerre ({activeWar.monthsDuration} mois)
                  </span>
                  <span className="font-mono-tabular text-emerald-300">
                    Avancée : {playerOcc} %
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{ width: `${playerOcc}%` }}
                  />
                </div>
                {activeWar.lastBattleSummary && (
                  <p className="text-[11px] text-slate-300 leading-snug">
                    {activeWar.lastBattleSummary}
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    disabled={offensiveOrdered}
                    onClick={() => onLaunchOffensive(activeWar.id)}
                    className="flex-1 py-1.5 px-2 text-xs font-medium bg-rose-600/80 hover:bg-rose-500 disabled:opacity-45 text-white rounded cursor-pointer disabled:cursor-default whitespace-nowrap"
                  >
                    {offensiveOrdered ? 'Offensive prête' : 'Offensive (+25%)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onPeaceTreaty(activeWar.id, 'STATUS_QUO')}
                    className="flex-1 py-1.5 px-2 text-xs font-medium bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-100 rounded cursor-pointer whitespace-nowrap"
                  >
                    Paix
                  </button>
                  {(playerOcc >= 68 || playerAdv >= 58) && (
                    <button
                      type="button"
                      onClick={() =>
                        onPeaceTreaty(activeWar.id, 'CAPITULATION', player.id)
                      }
                      className="w-full py-1.5 px-2 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded cursor-pointer"
                    >
                      Exiger la capitulation
                    </button>
                  )}
                </div>
              </div>
            );
          })()
        )}
      </div>

      {/* Live AI Diplomatic Correspondence */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between text-xs text-slate-400">
          <span>Chancellerie directe (IA)</span>
          <span>{formatDateFr(world.year, world.month)}</span>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {messages.length === 0 ? (
            <div className="text-xs text-slate-400 p-3 bg-[#111A2A] border border-white/5 rounded-md space-y-2">
              <p>
                Écrivez directement à {target.leaderTitle} {target.leaderName}. Le dirigeant
                analysera vos arguments et répondra selon ses intérêts stratégiques.
              </p>
              <div className="space-y-1 pt-1">
                {quickPrompts.map((qp) => (
                  <button
                    key={qp}
                    type="button"
                    onClick={() => setMessageInput(qp)}
                    className="w-full text-left text-[11px] px-2.5 py-1.5 bg-[#172338] hover:bg-[#1E2E4A] text-slate-200 rounded transition-colors cursor-pointer"
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
                className={`p-2.5 rounded-md text-xs leading-relaxed ${
                  m.sender === 'player'
                    ? 'bg-amber-500/15 border border-amber-400/30 text-amber-50 ml-4'
                    : m.sender === 'system'
                      ? 'bg-white/5 text-slate-300 text-[11px] text-center'
                      : 'bg-[#152033] border border-white/10 text-slate-100 mr-4'
                }`}
              >
                {m.sender !== 'system' && (
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span className="font-medium text-slate-300">{m.senderLabel}</span>
                    <span>{m.dateLabel}</span>
                  </div>
                )}
                <p>{m.text}</p>
              </div>
            ))
          )}
          {isAiSending && (
            <div className="flex items-center gap-2 text-xs text-slate-400 px-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
              <span>La chancellerie de {target.nameFr} rédige sa réponse...</span>
            </div>
          )}
        </div>

        {/* Message Form */}
        <form onSubmit={handleSend} className="p-3 border-t border-white/10 bg-[#0D1523]">
          <div className="flex gap-2">
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder={`Message à ${target.nameFr}...`}
              disabled={isAiSending}
              className="flex-1 px-3 py-2 text-xs bg-[#141F33] border border-white/10 rounded-md text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400/60"
            />
            <button
              type="submit"
              disabled={!messageInput.trim() || isAiSending}
              className="px-3 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 rounded-md transition-colors cursor-pointer disabled:cursor-default shrink-0"
              title="Envoyer la dépêche"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
