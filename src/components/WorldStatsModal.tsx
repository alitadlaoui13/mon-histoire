import React, { useMemo, useState } from 'react';
import { BarChart3, Handshake, Swords, X } from 'lucide-react';
import { getCountryTotalStats } from '../engine/simulationEngine';
import { WorldState } from '../types/game';

interface WorldStatsModalProps {
  world: WorldState;
  onClose: () => void;
  onFocusCountry: (countryId: string) => void;
}

type ModalTab = 'classement' | 'evolution' | 'traites';

function buildSparklinePoints(values: number[], width: number, height: number): string {
  if (values.length === 0) return '';
  if (values.length === 1) return `0,${height / 2} ${width},${height / 2}`;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(0.01, max - min);
  return values
    .map((val, idx) => {
      const x = (idx / (values.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 16) - 8;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export const WorldStatsModal: React.FC<WorldStatsModalProps> = ({
  world,
  onClose,
  onFocusCountry,
}) => {
  const [tab, setTab] = useState<ModalTab>('classement');
  const [sortBy, setSortBy] = useState<'gdp' | 'army' | 'pop' | 'territories'>('gdp');

  const rankings = useMemo(() => {
    const sovereigns = Object.values(world.countries).filter((c) => c.ownerId === c.id);
    const enriched = sovereigns.map((c) => {
      const totals = getCountryTotalStats(world, c.id);
      return {
        country: c,
        totalGdp: totals.totalGdp,
        totalPop: totals.totalPop,
        territories: totals.territories,
      };
    });

    enriched.sort((a, b) => {
      if (sortBy === 'gdp') return b.totalGdp - a.totalGdp;
      if (sortBy === 'army') return b.country.army - a.country.army;
      if (sortBy === 'pop') return b.totalPop - a.totalPop;
      return b.territories - a.territories;
    });

    return enriched;
  }, [world, sortBy]);

  const player = world.playerCountryId ? world.countries[world.playerCountryId] : null;
  const history = world.history;

  const gdpSeries = history.map((h) => h.playerGdp);
  const treasurySeries = history.map((h) => h.playerTreasury);
  const armySeries = history.map((h) => h.playerArmy);
  const stabilitySeries = history.map((h) => h.playerStability);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl max-h-[86vh] bg-[#0D1625] border border-white/15 rounded-lg shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between gap-4 bg-[#111C2F]">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-lg font-display font-semibold text-white">
                Statistiques & Ordre mondial
              </h2>
              <p className="text-xs text-slate-400">
                {rankings.length} nations souveraines · {world.wars.length} guerre(s) active(s) ·{' '}
                {world.alliances.length} traités multilatéraux
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 py-2.5 border-b border-white/10 flex items-center gap-2 bg-[#0A111D]">
          <button
            type="button"
            onClick={() => setTab('classement')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer whitespace-nowrap ${
              tab === 'classement'
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'text-slate-300 hover:bg-white/5'
            }`}
          >
            Classement des puissances
          </button>
          <button
            type="button"
            onClick={() => setTab('evolution')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer whitespace-nowrap ${
              tab === 'evolution'
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'text-slate-300 hover:bg-white/5'
            }`}
          >
            Évolution de {player?.nameFr ?? 'votre nation'}
          </button>
          <button
            type="button"
            onClick={() => setTab('traites')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer whitespace-nowrap ${
              tab === 'traites'
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'text-slate-300 hover:bg-white/5'
            }`}
          >
            Alliances, Unions & Conflits
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'classement' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs text-slate-400">
                  Cliquez sur un pays pour centrer la carte sur sa capitale.
                </span>
                <div className="flex items-center gap-1 p-1 bg-[#131F33] rounded-md">
                  {(
                    [
                      ['gdp', 'PIB'],
                      ['army', 'Armée'],
                      ['pop', 'Population'],
                      ['territories', 'Territoires'],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSortBy(key)}
                      className={`px-2.5 py-1 text-xs rounded cursor-pointer ${
                        sortBy === key
                          ? 'bg-[#1F314F] text-amber-300 font-medium'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border border-white/10 rounded-md overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#121D30] text-slate-400 border-b border-white/10">
                      <th className="py-2.5 px-3 font-medium">#</th>
                      <th className="py-2.5 px-3 font-medium">Nation</th>
                      <th className="py-2.5 px-3 font-medium">Régime</th>
                      <th className="py-2.5 px-3 font-medium text-right">PIB (Mds $)</th>
                      <th className="py-2.5 px-3 font-medium text-right">Armée</th>
                      <th className="py-2.5 px-3 font-medium text-right">Population</th>
                      <th className="py-2.5 px-3 font-medium text-right">Stabilité</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {rankings.slice(0, 45).map((item, idx) => {
                      const isPlayer = item.country.id === world.playerCountryId;
                      return (
                        <tr
                          key={item.country.id}
                          onClick={() => {
                            onFocusCountry(item.country.id);
                            onClose();
                          }}
                          className={`cursor-pointer transition-colors ${
                            isPlayer
                              ? 'bg-amber-500/15 hover:bg-amber-500/20'
                              : 'hover:bg-white/5'
                          }`}
                        >
                          <td className="py-2 px-3 font-mono-tabular text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 font-medium text-white">
                            {item.country.nameFr}{' '}
                            {item.territories > 1 && (
                              <span className="text-[11px] text-amber-300 font-mono-tabular">
                                ({item.territories} terr.)
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-slate-400">{item.country.regime}</td>
                          <td className="py-2 px-3 text-right font-mono-tabular text-slate-100">
                            {item.totalGdp.toLocaleString('fr-FR')}
                          </td>
                          <td className="py-2 px-3 text-right font-mono-tabular text-slate-200">
                            {item.country.army.toLocaleString('fr-FR')}k
                          </td>
                          <td className="py-2 px-3 text-right font-mono-tabular text-slate-200">
                            {item.totalPop.toFixed(1)} M
                          </td>
                          <td className="py-2 px-3 text-right font-mono-tabular text-slate-300">
                            {Math.round(item.country.stability)} %
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'evolution' && (
            <div className="space-y-4">
              {history.length < 2 ? (
                <p className="text-sm text-slate-400 py-8 text-center">
                  Faites avancer le temps d’au moins un mois pour observer l’évolution de vos
                  courbes statistiques.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      title: 'Produit Intérieur Brut (Mds $)',
                      series: gdpSeries,
                      stroke: '#F59E0B',
                      unit: ' Mds $',
                    },
                    {
                      title: 'Trésor public (Mds $)',
                      series: treasurySeries,
                      stroke: '#38BDF8',
                      unit: ' Mds $',
                    },
                    {
                      title: 'Effectifs militaires (milliers)',
                      series: armySeries,
                      stroke: '#FB7185',
                      unit: 'k',
                    },
                    {
                      title: 'Stabilité nationale (%)',
                      series: stabilitySeries,
                      stroke: '#34D399',
                      unit: ' %',
                    },
                  ].map((chart) => {
                    const latest = chart.series[chart.series.length - 1];
                    const first = chart.series[0];
                    const delta = latest - first;
                    return (
                      <div
                        key={chart.title}
                        className="p-4 bg-[#121D30] border border-white/10 rounded-md space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-300">{chart.title}</span>
                          <span className="text-sm font-mono-tabular font-semibold text-white">
                            {latest.toLocaleString('fr-FR')}
                            {chart.unit}
                          </span>
                        </div>
                        <svg viewBox="0 0 320 80" className="w-full h-24 overflow-visible">
                          <polyline
                            fill="none"
                            stroke={chart.stroke}
                            strokeWidth="2.2"
                            points={buildSparklinePoints(chart.series, 320, 80)}
                          />
                        </svg>
                        <div className="flex justify-between text-[11px] text-slate-400 font-mono-tabular">
                          <span>{history[0].dateLabel}</span>
                          <span className={delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            Variation : {delta >= 0 ? '+' : ''}
                            {delta.toFixed(1)}
                            {chart.unit}
                          </span>
                          <span>{history[history.length - 1].dateLabel}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === 'traites' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Handshake className="w-4 h-4 text-sky-400" />
                  <span>Alliances & Unions Économiques ({world.alliances.length})</span>
                </h3>
                {world.alliances.map((al) => (
                  <div
                    key={al.id}
                    className="p-3 bg-[#121D30] border border-white/10 rounded-md space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white">{al.name}</span>
                      <span className="text-[11px] text-slate-400">
                        {al.type === 'ALLIANCE' ? 'Alliance' : 'Union éco.'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {al.memberIds
                        .map((id) => world.countries[id]?.nameFr || id)
                        .slice(0, 8)
                        .join(', ')}
                      {al.memberIds.length > 8 ? ` et ${al.memberIds.length - 8} autres` : ''}
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Swords className="w-4 h-4 text-rose-400" />
                  <span>Guerres mondiales en cours ({world.wars.length})</span>
                </h3>
                {world.wars.length === 0 ? (
                  <p className="text-xs text-slate-500">Aucun conflit armé actif dans le monde.</p>
                ) : (
                  world.wars.map((w) => {
                    const agg = world.countries[w.aggressorId];
                    const def = world.countries[w.defenderId];
                    return (
                      <div
                        key={w.id}
                        className="p-3 bg-[#18131B] border border-rose-500/30 rounded-md space-y-1"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-white">{w.name}</span>
                          <span className="font-mono-tabular text-rose-300">
                            {w.monthsDuration} mois
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-300">
                          {agg?.nameFr} vs {def?.nameFr} · Score : {w.warScore} · Pertes :{' '}
                          {w.casualtiesTotal}k
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
