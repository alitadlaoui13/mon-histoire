import React, { useRef, useState } from 'react';
import {
  Calendar,
  Crown,
  Loader2,
  MapPin,
  ScrollText,
  Send,
  Sparkles,
} from 'lucide-react';
import { FreeActionLogEntry } from '../engine/freeActionEngine';
import { getCountryTotalStats } from '../engine/simulationEngine';
import { WorldState } from '../types/game';
import { CountryFlag } from './CountryFlag';

interface ActionHubPanelProps {
  world: WorldState;
  dateLabel: string;
  actionLogs: FreeActionLogEntry[];
  isExecutingFreeAction: boolean;
  onExecuteFreeAction: (prompt: string) => Promise<void>;
  onFocusCountry: (countryId: string) => void;
  feedback: string | null;
}

const INSPIRATION_PROMPTS = [
  {
    label: 'Pont Maroc–Espagne',
    text: "Construire un pont stratégique entre le Maroc et l'Espagne.",
  },
  {
    label: 'Alliance Portugal',
    text: 'Créer une alliance stratégique et économique avec le Portugal.',
  },
  {
    label: 'Développer économie',
    text: 'Lancer un grand plan industriel pour développer mon économie et mes infrastructures.',
  },
  {
    label: 'Modifier régime',
    text: 'Modifier mon régime politique vers une république fédérale moderne.',
  },
  {
    label: 'Déclarer une guerre',
    text: 'Déclarer la guerre à un pays rival et mobiliser les forces armées.',
  },
];

export const ActionHubPanel: React.FC<ActionHubPanelProps> = ({
  world,
  dateLabel,
  actionLogs,
  isExecutingFreeAction,
  onExecuteFreeAction,
  onFocusCountry,
  feedback,
}) => {
  const [freeInput, setFreeInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const player = world.playerCountryId ? world.countries[world.playerCountryId] : null;
  if (!player) return null;

  const totals = getCountryTotalStats(world, player.id);

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

  const handleFillExample = (text: string) => {
    setFreeInput(text);
    textareaRef.current?.focus();
  };

  return (
    <div className="h-full flex flex-col bg-[#0B1322] text-slate-100 min-h-0">
      {/* Compact Sovereign Context Header */}
      <div className="px-3.5 py-2.5 border-b border-white/10 bg-[#0F1B30] shrink-0">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-amber-200 flex items-center gap-1.5">
            <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>Décision libre</span>
          </span>
          <span className="text-[11px] text-slate-400 font-mono-tabular flex items-center gap-1.5 truncate">
            <Calendar className="w-3 h-3 text-amber-300 shrink-0" />
            <span>{dateLabel}</span>
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-300 font-mono-tabular flex-wrap">
          <span>Trésor {player.treasury.toFixed(1)} Md$</span>
          <span className="text-slate-600">·</span>
          <span>PIB {totals.totalGdp.toLocaleString('fr-FR')} Md$</span>
          <span className="text-slate-600">·</span>
          <span>Infl. {Math.round(player.influence ?? 50)}/100</span>
          <span className="text-slate-600">·</span>
          <span className="font-sans text-amber-200 truncate">{player.regime}</span>
        </div>
      </div>

      {/* Free-Form Decision Composer */}
      <form
        onSubmit={handleSubmitFreeAction}
        className="p-3.5 border-b border-white/10 bg-[#0D1729] space-y-2.5 shrink-0"
      >
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor="free-action-textarea"
            className="text-xs font-semibold text-amber-200 flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>Écrivez votre décision en langage naturel</span>
          </label>
          <span className="text-[10px] text-slate-500 hidden sm:inline">Ctrl+Entrée</span>
        </div>

        <textarea
          ref={textareaRef}
          id="free-action-textarea"
          rows={3}
          value={freeInput}
          onChange={(e) => setFreeInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isExecutingFreeAction}
          placeholder="Ex : Construire un pont entre le Maroc et l'Espagne, Créer une alliance avec le Portugal, Développer mon économie, Modifier mon régime politique..."
          className="w-full min-h-[96px] px-3.5 py-2.5 text-xs bg-[#070F1D] border border-amber-400/35 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-300 resize-y leading-relaxed"
        />

        <div className="space-y-1.5">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
            Exemples rapides à personnaliser :
          </div>
          <div className="flex flex-wrap gap-1.5">
            {INSPIRATION_PROMPTS.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => handleFillExample(item.text)}
                className="px-2 py-1 text-[11px] rounded-md bg-[#14233F] hover:bg-[#1B3057] border border-white/10 text-slate-200 hover:text-amber-200 transition-colors cursor-pointer whitespace-nowrap"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={!freeInput.trim() || isExecutingFreeAction}
          className="w-full min-h-[44px] px-4 py-2 rounded-lg bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 disabled:opacity-45 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:cursor-default"
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
        <div className="px-3.5 py-2 bg-amber-500/15 border-b border-amber-400/30 text-xs text-amber-200 shrink-0">
          {feedback}
        </div>
      )}

      {/* Executed Decisions & World Consequences History */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 min-h-0">
        {actionLogs.length === 0 ? (
          <div className="p-4 rounded-xl bg-[#0F1B30] border border-white/10 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-200">
              <ScrollText className="w-4 h-4 text-amber-300 shrink-0" />
              <span>Gouvernance & décisions libres</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Chaque phrase rédigée ci-dessus est interprétée et appliquée directement à la
              simulation : grands travaux tracés sur la carte, alliances, guerres, réformes
              économiques, infrastructures ou changement de régime politique.
            </p>
          </div>
        ) : (
          actionLogs.map((entry) => (
            <div
              key={entry.id}
              className="p-3 rounded-xl bg-[#101D35] border border-amber-400/20 space-y-2"
            >
              <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                <span className="font-semibold uppercase tracking-wider text-amber-300">
                  {entry.effect.category}
                </span>
                <span className="font-mono-tabular">{entry.dateLabel}</span>
              </div>

              <div className="text-xs text-amber-100 italic bg-[#081020] px-2.5 py-1.5 rounded-lg border border-white/5">
                « {entry.prompt} »
              </div>

              <div className="text-xs font-semibold text-white">{entry.effect.summaryTitle}</div>
              <p className="text-[11px] text-slate-300 leading-relaxed">{entry.effect.narrative}</p>

              {entry.effect.targetImpacts && entry.effect.targetImpacts.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {entry.effect.targetImpacts.map((imp, idx) => {
                    const target = world.countries[imp.countryId];
                    if (!target) return null;
                    return (
                      <button
                        key={`${imp.countryId}-${idx}`}
                        type="button"
                        onClick={() => onFocusCountry(target.id)}
                        className="px-2 py-1 rounded-md bg-[#081224] hover:bg-[#122447] border border-white/15 text-[11px] text-amber-100 flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <CountryFlag
                          flag={target.flag}
                          fallbackColor={target.color}
                          name={target.nameFr}
                          className="w-4 h-2.5 rounded-xs border border-white/20 shrink-0"
                        />
                        <span>{target.nameFr}</span>
                        <MapPin className="w-3 h-3 text-amber-300/80 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}

              {entry.statBadges.length > 0 && (
                <div className="flex flex-wrap gap-x-2.5 gap-y-1 pt-1.5 border-t border-white/10 text-[11px] font-mono-tabular text-amber-200">
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
  );
};
