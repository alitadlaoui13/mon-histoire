import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { CrisisEvent } from '../types/game';

interface CrisisModalProps {
  crisis: CrisisEvent;
  onChoose: (option: 'A' | 'B') => void;
}

export const CrisisModal: React.FC<CrisisModalProps> = ({ crisis, onChoose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#0E1726] border border-amber-400/35 rounded-lg shadow-2xl overflow-hidden">
        <div className="px-6 py-4 bg-[#141F33] border-b border-white/10 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <div className="text-xs text-amber-300 font-medium">Dépêche urgente</div>
            <h3 className="text-lg font-display font-semibold text-white">{crisis.title}</h3>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-sm text-slate-300 leading-relaxed">{crisis.description}</p>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => onChoose('A')}
              className="w-full p-3.5 bg-[#152238] hover:bg-[#1C2D4A] border border-white/15 rounded-md text-left transition-colors cursor-pointer space-y-1"
            >
              <div className="text-sm font-semibold text-white">{crisis.optionALabel}</div>
              <div className="text-xs font-mono-tabular text-slate-400 flex gap-3">
                <span>
                  Trésor : {crisis.optionATreasuryDelta >= 0 ? '+' : ''}
                  {crisis.optionATreasuryDelta} Mds $
                </span>
                <span>
                  Stabilité : {crisis.optionAStabilityDelta >= 0 ? '+' : ''}
                  {crisis.optionAStabilityDelta} %
                </span>
                <span>
                  PIB : {crisis.optionAGdpPctDelta >= 0 ? '+' : ''}
                  {crisis.optionAGdpPctDelta} %
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onChoose('B')}
              className="w-full p-3.5 bg-[#152238] hover:bg-[#1C2D4A] border border-white/15 rounded-md text-left transition-colors cursor-pointer space-y-1"
            >
              <div className="text-sm font-semibold text-white">{crisis.optionBLabel}</div>
              <div className="text-xs font-mono-tabular text-slate-400 flex gap-3">
                <span>
                  Trésor : {crisis.optionBTreasuryDelta >= 0 ? '+' : ''}
                  {crisis.optionBTreasuryDelta} Mds $
                </span>
                <span>
                  Stabilité : {crisis.optionBStabilityDelta >= 0 ? '+' : ''}
                  {crisis.optionBStabilityDelta} %
                </span>
                <span>
                  PIB : {crisis.optionBGdpPctDelta >= 0 ? '+' : ''}
                  {crisis.optionBGdpPctDelta} %
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
