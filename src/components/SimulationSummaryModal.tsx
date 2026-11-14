import React from 'react';
import { Crown, Flag, Globe2, Shield, Swords, TrendingUp, X } from 'lucide-react';
import { SimulationSummary, WorldState } from '../types/game';

interface SimulationSummaryModalProps {
  summary: SimulationSummary;
  world: WorldState;
  onClose: () => void;
  onFocusCountry: (countryId: string) => void;
}

function formatDelta(val: number, suffix = ''): string {
  const rounded = Number(val.toFixed(1));
  return `${rounded > 0 ? '+' : ''}${rounded.toLocaleString('fr-FR')}${suffix}`;
}

export const SimulationSummaryModal: React.FC<SimulationSummaryModalProps> = ({
  summary,
  world,
  onClose,
  onFocusCountry,
}) => {
  const player = world.playerCountryId ? world.countries[world.playerCountryId] : null;
  const hasWarsSection =
    summary.playerWarOutcomes.length > 0 || summary.ongoingPlayerWars.length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-3xl max-h-[88vh] bg-[#0E1727] border border-amber-400/35 rounded-lg shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-[#121D31] border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-amber-300">
              <Globe2 className="w-4 h-4" />
              <span>Rapport de simulation pluriannuelle</span>
            </div>
            <h2 className="text-lg font-display font-semibold text-white mt-0.5">
              {summary.startDateLabel} → {summary.endDateLabel}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono-tabular text-slate-400">
              {summary.monthsSimulated} mois simulés
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* 1. Player War Results (Top Priority) */}
          {hasWarsSection && (
            <section className="space-y-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
                <Swords className="w-3.5 h-3.5" />
                <span>Bilan de vos guerres</span>
              </h3>

              {summary.playerWarOutcomes.map((wo, idx) => {
                const winner = world.countries[wo.winnerId];
                const loser = world.countries[wo.loserId];
                return (
                  <div
                    key={`${wo.warId}-${idx}`}
                    className={`p-3.5 rounded-md border ${
                      wo.playerWon
                        ? 'bg-emerald-950/35 border-emerald-500/40'
                        : 'bg-rose-950/35 border-rose-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {wo.playerWon ? (
                          <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                        ) : (
                          <Flag className="w-4 h-4 text-rose-400 shrink-0" />
                        )}
                        <span className="text-sm font-semibold text-white">{wo.warName}</span>
                      </div>
                      <span
                        className={`text-xs font-semibold ${
                          wo.playerWon ? 'text-emerald-300' : 'text-rose-300'
                        }`}
                      >
                        {wo.reason === 'CAPITULATION'
                          ? wo.playerWon
                            ? 'Victoire par capitulation'
                            : 'Défaite par capitulation'
                          : wo.playerWon
                            ? 'Victoire'
                            : wo.reason === 'ARMISTICE'
                              ? 'Paix négociée'
                              : 'Défaite'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 mt-1.5 leading-relaxed">{wo.summary}</p>
                    <div className="flex flex-wrap gap-4 mt-2 text-[11px] font-mono-tabular text-slate-400">
                      <span>Vainqueur : {winner?.nameFr ?? wo.winnerId}</span>
                      <span>Vaincu : {loser?.nameFr ?? wo.loserId}</span>
                      <span>Durée : {wo.monthsDuration} mois</span>
                      <span>Pertes totales : {wo.casualtiesTotal.toLocaleString('fr-FR')}k</span>
                    </div>
                  </div>
                );
              })}

              {summary.ongoingPlayerWars.map((w) => {
                const isAgg =
                  player &&
                  (w.aggressorId === player.id || w.aggressorAllies.includes(player.id));
                const occ = isAgg ? w.aggressorOccupation : w.defenderOccupation;
                return (
                  <div
                    key={w.id}
                    className="p-3 bg-[#19151E] border border-amber-500/35 rounded-md space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white">{w.name} (En cours)</span>
                      <span className="font-mono-tabular text-amber-300">
                        Avancée : {occ} % · {w.monthsDuration} mois
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">{w.lastBattleSummary}</p>
                  </div>
                );
              })}
            </section>
          )}

          {/* 2. Player Nation Evolution */}
          {player && summary.playerBefore && summary.playerAfter && (
            <section className="space-y-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Évolution de {player.nameFr}</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="p-3 bg-[#131E31] border border-white/10 rounded-md">
                  <div className="text-[11px] text-slate-400">PIB effectif</div>
                  <div className="text-sm font-mono-tabular font-semibold text-white mt-0.5">
                    {summary.playerAfter.gdp.toLocaleString('fr-FR')} Mds $
                  </div>
                  <div
                    className={`text-[11px] font-mono-tabular ${
                      summary.playerAfter.gdp >= summary.playerBefore.gdp
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {formatDelta(summary.playerAfter.gdp - summary.playerBefore.gdp, ' Mds $')}
                  </div>
                </div>

                <div className="p-3 bg-[#131E31] border border-white/10 rounded-md">
                  <div className="text-[11px] text-slate-400">Trésor public</div>
                  <div className="text-sm font-mono-tabular font-semibold text-white mt-0.5">
                    {summary.playerAfter.treasury.toLocaleString('fr-FR')} Mds $
                  </div>
                  <div
                    className={`text-[11px] font-mono-tabular ${
                      summary.playerAfter.treasury >= summary.playerBefore.treasury
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {formatDelta(
                      summary.playerAfter.treasury - summary.playerBefore.treasury,
                      ' Mds $'
                    )}
                  </div>
                </div>

                <div className="p-3 bg-[#131E31] border border-white/10 rounded-md">
                  <div className="text-[11px] text-slate-400">Armée active</div>
                  <div className="text-sm font-mono-tabular font-semibold text-white mt-0.5">
                    {summary.playerAfter.army.toLocaleString('fr-FR')}k soldats
                  </div>
                  <div
                    className={`text-[11px] font-mono-tabular ${
                      summary.playerAfter.army >= summary.playerBefore.army
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {formatDelta(summary.playerAfter.army - summary.playerBefore.army, 'k')}
                  </div>
                </div>

                <div className="p-3 bg-[#131E31] border border-white/10 rounded-md">
                  <div className="text-[11px] text-slate-400">Territoires contrôlés</div>
                  <div className="text-sm font-mono-tabular font-semibold text-white mt-0.5">
                    {summary.playerAfter.territories}
                  </div>
                  <div
                    className={`text-[11px] font-mono-tabular ${
                      summary.playerAfter.territories >= summary.playerBefore.territories
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {formatDelta(
                      summary.playerAfter.territories - summary.playerBefore.territories
                    )}
                  </div>
                </div>

                <div className="p-3 bg-[#131E31] border border-white/10 rounded-md">
                  <div className="text-[11px] text-slate-400">Population</div>
                  <div className="text-sm font-mono-tabular font-semibold text-white mt-0.5">
                    {summary.playerAfter.population.toFixed(1)} M
                  </div>
                  <div className="text-[11px] font-mono-tabular text-sky-400">
                    {formatDelta(
                      summary.playerAfter.population - summary.playerBefore.population,
                      ' M'
                    )}
                  </div>
                </div>

                <div className="p-3 bg-[#131E31] border border-white/10 rounded-md">
                  <div className="text-[11px] text-slate-400">Stabilité</div>
                  <div className="text-sm font-mono-tabular font-semibold text-white mt-0.5">
                    {summary.playerAfter.stability} %
                  </div>
                  <div
                    className={`text-[11px] font-mono-tabular ${
                      summary.playerAfter.stability >= summary.playerBefore.stability
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {formatDelta(summary.playerAfter.stability - summary.playerBefore.stability, ' pts')}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* 3. Global Activity Counters */}
          <section className="space-y-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-sky-400" />
              <span>Activité géopolitique mondiale</span>
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
              <div className="p-2.5 bg-[#121C2E] border border-white/5 rounded">
                <div className="text-base font-mono-tabular font-semibold text-rose-400">
                  {summary.counts.warsStarted}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Guerres</div>
              </div>
              <div className="p-2.5 bg-[#121C2E] border border-white/5 rounded">
                <div className="text-base font-mono-tabular font-semibold text-emerald-400">
                  {summary.counts.peacesSigned}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Traités paix</div>
              </div>
              <div className="p-2.5 bg-[#121C2E] border border-white/5 rounded">
                <div className="text-base font-mono-tabular font-semibold text-teal-300">
                  {summary.counts.tradeDealsSigned}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Commerce</div>
              </div>
              <div className="p-2.5 bg-[#121C2E] border border-white/5 rounded">
                <div className="text-base font-mono-tabular font-semibold text-sky-300">
                  {summary.counts.alliancesEvents}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Alliances</div>
              </div>
              <div className="p-2.5 bg-[#121C2E] border border-white/5 rounded">
                <div className="text-base font-mono-tabular font-semibold text-indigo-300">
                  {summary.counts.politicalEvents}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Politique</div>
              </div>
              <div className="p-2.5 bg-[#121C2E] border border-white/5 rounded">
                <div className="text-base font-mono-tabular font-semibold text-amber-300">
                  {summary.counts.economicEvents}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Éco & Crises</div>
              </div>
            </div>
          </section>

          {/* 4. Territorial Changes */}
          {summary.territorialChanges.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Conquêtes et changements de frontières ({summary.territorialChanges.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {summary.territorialChanges.map((tc) => (
                  <button
                    key={tc.territoryId}
                    type="button"
                    onClick={() => {
                      onFocusCountry(tc.territoryId);
                      onClose();
                    }}
                    className={`px-3 py-2 rounded border text-left text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                      tc.involvesPlayer
                        ? 'bg-amber-500/10 border-amber-400/35 hover:bg-amber-500/20'
                        : 'bg-[#121C2E] border-white/10 hover:bg-[#18263E]'
                    }`}
                  >
                    <span className="font-semibold text-white truncate">{tc.territoryName}</span>
                    <span className="text-[11px] text-slate-300 shrink-0">
                      {tc.previousOwnerName} →{' '}
                      <span className="text-amber-300 font-medium">{tc.newOwnerName}</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* 5. Chronological Highlights */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Faits marquants de la période
            </h3>
            {summary.highlights.length === 0 ? (
              <p className="text-xs text-slate-500">Aucun événement majeur enregistré.</p>
            ) : (
              <div className="space-y-2">
                {summary.highlights.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => {
                      if (ev.involvedCountryIds[0]) {
                        onFocusCountry(ev.involvedCountryIds[0]);
                        onClose();
                      }
                    }}
                    className="p-2.5 bg-[#121C2E] hover:bg-[#17243B] border border-white/5 rounded cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span
                        className={`font-medium ${
                          ev.category === 'GUERRE'
                            ? 'text-rose-400'
                            : ev.category === 'PAIX'
                              ? 'text-emerald-400'
                              : ev.category === 'COMMERCE'
                                ? 'text-teal-300'
                                : ev.category === 'POLITIQUE'
                                  ? 'text-indigo-300'
                                  : ev.category === 'CRISE'
                                    ? 'text-orange-400'
                                    : ev.category === 'ÉCONOMIE'
                                      ? 'text-amber-300'
                                      : 'text-sky-300'
                        }`}
                      >
                        {ev.category}
                      </span>
                      <span className="font-mono-tabular">{ev.dateLabel}</span>
                    </div>
                    <div className="text-xs font-semibold text-white mt-0.5">{ev.title}</div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{ev.description}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#121D31] border-t border-white/10 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold rounded cursor-pointer transition-colors"
          >
            Continuer en {summary.endYear}
          </button>
        </div>
      </div>
    </div>
  );
};
