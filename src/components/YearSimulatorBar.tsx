import React from 'react';
import { CalendarRange, FastForward } from 'lucide-react';

interface YearSimulatorBarProps {
  currentYear: number;
  currentDateLabel: string;
  targetYear: number;
  onChangeTargetYear: (year: number) => void;
  isSimulating: boolean;
  onStartSimulation: () => void;
  pausedByModal?: boolean;
}

export const YearSimulatorBar: React.FC<YearSimulatorBarProps> = ({
  currentYear,
  currentDateLabel,
  targetYear,
  onChangeTargetYear,
  isSimulating,
  onStartSimulation,
  pausedByModal = false,
}) => {
  const canSimulate = !isSimulating && targetYear > currentYear && !pausedByModal;

  const yearsList: number[] = [];
  if (targetYear === currentYear) {
    yearsList.push(currentYear);
  }
  for (let y = currentYear + 1; y <= currentYear + 50; y++) {
    yearsList.push(y);
  }

  return (
    <div className="px-4 py-1.5 bg-[#0A111E] border-b border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0 z-20">
      {/* Left: Current & Selected Year Telemetry */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5 text-slate-300">
          <CalendarRange className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-slate-400">Année actuelle :</span>
          <span className="font-mono-tabular font-semibold text-white">{currentYear}</span>
          <span className="text-[11px] text-slate-400 hidden sm:inline font-mono-tabular">
            ({currentDateLabel})
          </span>
        </div>

        <span className="text-slate-600 hidden sm:inline">·</span>

        <div className="flex items-center gap-1.5 text-slate-300">
          <span className="text-slate-400">Année sélectionnée :</span>
          <span
            className={`font-mono-tabular font-semibold ${
              targetYear > currentYear ? 'text-amber-300' : 'text-emerald-400'
            }`}
          >
            {targetYear}
          </span>
          {targetYear === currentYear && !isSimulating && (
            <span className="text-[11px] text-emerald-400 hidden md:inline">
              (Date atteinte)
            </span>
          )}
        </div>
      </div>

      {/* Right: Year Dropdown Selector + Simuler jusqu'à cette date */}
      <div className="flex items-center gap-2.5">
        <label className="flex items-center gap-2 text-xs text-slate-300">
          <span className="text-slate-400 hidden sm:inline whitespace-nowrap">
            Destination :
          </span>
          <select
            aria-label="Choisir l'année de destination"
            value={targetYear}
            disabled={isSimulating}
            onChange={(e) => onChangeTargetYear(Number(e.target.value))}
            className="px-2.5 py-1 text-xs font-mono-tabular bg-[#121D30] border border-white/15 rounded text-white focus:outline-none focus:border-amber-400/70 disabled:opacity-50 cursor-pointer"
          >
            {yearsList.map((y) => (
              <option key={y} value={y} disabled={y <= currentYear}>
                {y}
                {y === currentYear ? ' (actuelle)' : ''}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          disabled={!canSimulate}
          onClick={onStartSimulation}
          className="px-3 py-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 text-slate-950 text-xs font-semibold rounded flex items-center gap-1.5 transition-colors cursor-pointer disabled:cursor-not-allowed whitespace-nowrap shrink-0"
          title={
            targetYear <= currentYear
              ? 'Sélectionnez une année future dans le menu'
              : `Simuler mois par mois jusqu’en Janvier ${targetYear}`
          }
        >
          <FastForward className="w-3.5 h-3.5" />
          <span>{isSimulating ? 'Simulation...' : 'Simuler jusqu’à cette date'}</span>
        </button>
      </div>
    </div>
  );
};
