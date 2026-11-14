import React from 'react';
import { Award, ShieldAlert } from 'lucide-react';
import { WarOutcome, WorldState } from '../types/game';

interface WarOutcomeModalProps {
  outcome: WarOutcome;
  world: WorldState;
  onClose: () => void;
}

export const WarOutcomeModal: React.FC<WarOutcomeModalProps> = ({
  outcome,
  world,
  onClose,
}) => {
  const winner = world.countries[outcome.winnerId];
  const loser = world.countries[outcome.loserId];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#0E1726] border border-white/15 rounded-lg shadow-2xl overflow-hidden">
        <div
          className={`px-6 py-4 border-b border-white/10 flex items-center gap-3 ${
            outcome.playerWon ? 'bg-[#132520]' : 'bg-[#261419]'
          }`}
        >
          {outcome.playerWon ? (
            <Award className="w-6 h-6 text-amber-400 shrink-0" />
          ) : (
            <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0" />
          )}
          <div>
            <div
              className={`text-xs font-medium ${
                outcome.playerWon ? 'text-emerald-300' : 'text-rose-300'
              }`}
            >
              {outcome.reason === 'CAPITULATION'
                ? 'Capitulation officielle'
                : outcome.reason === 'VICTORY'
                  ? 'Traité de victoire'
                  : 'Fin des hostilités'}
            </div>
            <h3 className="text-lg font-display font-semibold text-white">
              {outcome.playerWon ? 'Victoire stratégique' : 'Défaite et paix imposée'}
            </h3>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="text-xs text-slate-400">
            {outcome.warName} · Vainqueur :{' '}
            <span className="text-white font-semibold">{winner?.nameFr}</span> · Vaincu :{' '}
            <span className="text-slate-200">{loser?.nameFr}</span>
          </div>

          <p className="text-sm text-slate-200 leading-relaxed">{outcome.summary}</p>

          <div className="grid grid-cols-3 gap-2.5 text-xs">
            <div className="p-3 bg-[#131D30] border border-white/10 rounded">
              <div className="text-[11px] text-slate-400">Durée</div>
              <div className="font-mono-tabular font-semibold text-white mt-0.5">
                {outcome.monthsDuration} mois
              </div>
            </div>
            <div className="p-3 bg-[#131D30] border border-white/10 rounded">
              <div className="text-[11px] text-slate-400">Pertes totales</div>
              <div className="font-mono-tabular font-semibold text-rose-300 mt-0.5">
                {outcome.casualtiesTotal}k soldats
              </div>
            </div>
            <div className="p-3 bg-[#131D30] border border-white/10 rounded">
              <div className="text-[11px] text-slate-400">Score final</div>
              <div className="font-mono-tabular font-semibold text-amber-300 mt-0.5">
                {Math.abs(outcome.warScore)} pts
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm rounded-md transition-colors cursor-pointer"
          >
            Poursuivre la gouvernance
          </button>
        </div>
      </div>
    </div>
  );
};
