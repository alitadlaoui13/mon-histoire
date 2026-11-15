import React from 'react';
import {
  Handshake,
  MessageSquareText,
  Shield,
  Sparkles,
  Swords,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  getCountryTotalStats,
  getRelation,
  getRelationStatusFr,
  isAtWarBetween,
} from '../engine/simulationEngine';
import { WorldState } from '../types/game';
import { CountryFlag } from './CountryFlag';

interface CountryInspectorPopupProps {
  world: WorldState;
  targetCountryId: string;
  onClose: () => void;
  onOpenChat: (countryId: string) => void;
  onOpenDiplomacy: (countryId: string) => void;
  onOpenActionPrompt: () => void;
}

export const CountryInspectorPopup: React.FC<CountryInspectorPopupProps> = ({
  world,
  targetCountryId,
  onClose,
  onOpenChat,
  onOpenDiplomacy,
  onOpenActionPrompt,
}) => {
  const playerId = world.playerCountryId;
  const target = world.countries[targetCountryId];
  if (!playerId || !target || target.id === playerId) return null;

  const totals = getCountryTotalStats(world, target.id);
  const relation = getRelation(world, playerId, target.id);
  const atWar = Boolean(isAtWarBetween(world, playerId, target.id));
  const relStatus = getRelationStatusFr(relation, atWar);

  return (
    <div className="absolute left-3 top-15 z-20 w-[calc(100vw-24px)] sm:w-[320px] bg-[#0B1322]/95 backdrop-blur-md border border-white/15 rounded-xl shadow-2xl p-3 space-y-2.5 text-slate-100">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <CountryFlag
            flag={target.flag}
            fallbackColor={target.color}
            name={target.nameFr}
            className="w-9 h-6 rounded-xs border border-amber-300/40 shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-display font-semibold text-white truncate">
                {target.nameFr}
              </h3>
              {atWar && <Swords className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
            </div>
            <p className="text-[11px] text-slate-300 truncate">
              {target.leaderTitle} {target.leaderName} · {target.capital}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 rounded-md bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white flex items-center justify-center shrink-0 cursor-pointer"
          aria-label="Fermer la fiche pays"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-300 pt-1 border-t border-white/10">
        <span className="font-mono-tabular flex items-center gap-1">
          <TrendingUp className="w-3 h-3 text-amber-300" />
          {totals.totalGdp.toLocaleString('fr-FR')} Md $
        </span>
        <span className="font-mono-tabular flex items-center gap-1">
          <Shield className="w-3 h-3 text-rose-300" />
          {target.army.toLocaleString('fr-FR')}k
        </span>
        <span
          className={`font-mono-tabular font-semibold ${
            atWar
              ? 'text-rose-400'
              : relation >= 35
                ? 'text-emerald-400'
                : relation <= -20
                  ? 'text-rose-400'
                  : 'text-amber-300'
          }`}
        >
          {relStatus.label} ({relation > 0 ? `+${relation}` : relation})
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1.5 pt-0.5">
        <button
          type="button"
          onClick={() => onOpenChat(target.id)}
          className="min-h-[36px] px-2 py-1 rounded-lg bg-[#152542] hover:bg-[#1D335B] border border-amber-400/35 text-amber-100 text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
        >
          <MessageSquareText className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          <span>CHAT</span>
        </button>
        <button
          type="button"
          onClick={() => onOpenDiplomacy(target.id)}
          className="min-h-[36px] px-2 py-1 rounded-lg bg-[#121D32] hover:bg-[#192844] border border-white/10 text-slate-100 text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
        >
          <Handshake className="w-3.5 h-3.5 text-sky-300 shrink-0" />
          <span>Traités</span>
        </button>
        <button
          type="button"
          onClick={onOpenActionPrompt}
          className="min-h-[36px] px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
        >
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span>ACTION</span>
        </button>
      </div>
    </div>
  );
};
