import React, { useState } from 'react';
import {
  Building2,
  Coins,
  Handshake,
  Shield,
  Sparkles,
  Swords,
  Users,
} from 'lucide-react';
import { getCountryTotalStats, getMilitaryPowerIndex } from '../engine/simulationEngine';
import { CountryPolicy, WorldState } from '../types/game';
import { CountryFlag } from './CountryFlag';

interface NationalPanelProps {
  world: WorldState;
  onUpdatePolicy: (policy: Partial<CountryPolicy>) => void;
  onRecruit: (troopsK: number) => void;
  onEnactDirective: (directive: 'INFRASTRUCTURE' | 'COHESION' | 'RECHERCHE') => void;
  onLeaveCoalition: (allianceId: string) => void;
  onPeaceTreaty: (
    warId: string,
    terms: 'STATUS_QUO' | 'REPARATIONS' | 'ANNEXATION' | 'CAPITULATION',
    forcedWinnerId?: string
  ) => void;
  onLaunchOffensive: (warId: string) => void;
  onSelectCountry: (countryId: string) => void;
  actionFeedback: string | null;
}

type SubTab = 'economie' | 'armee' | 'societe';

export const NationalPanel: React.FC<NationalPanelProps> = ({
  world,
  onUpdatePolicy,
  onRecruit,
  onEnactDirective,
  onLeaveCoalition,
  onPeaceTreaty,
  onLaunchOffensive,
  onSelectCountry,
  actionFeedback,
}) => {
  const [subTab, setSubTab] = useState<SubTab>('economie');
  const player = world.playerCountryId ? world.countries[world.playerCountryId] : null;
  if (!player) return null;

  const powerIndex = getMilitaryPowerIndex(player);
  const offensiveCost = Math.max(4, Number((player.gdp * 0.01).toFixed(1)));

  const totals = getCountryTotalStats(world, player.id);
  const myAlliances = world.alliances.filter((a) => a.memberIds.includes(player.id));
  const myTradeDeals = (world.tradeDeals ?? []).filter(
    (td) => td.exporterId === player.id || td.importerId === player.id
  );
  const clickedTerritory =
    world.selectedTerritoryId &&
    world.selectedTerritoryId !== player.id &&
    world.countries[world.selectedTerritoryId]?.ownerId === player.id
      ? world.countries[world.selectedTerritoryId]
      : null;
  const myWars = world.wars.filter(
    (w) =>
      w.aggressorId === player.id ||
      w.defenderId === player.id ||
      w.aggressorAllies.includes(player.id) ||
      w.defenderAllies.includes(player.id)
  );

  const directiveCost = Math.max(4, Number((player.gdp * 0.015).toFixed(1)));

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/10 bg-[#121C2E]">
        {player.nationImage && (
          <div className="relative mb-3 rounded-md overflow-hidden border border-white/10 h-20">
            <img
              src={player.nationImage}
              alt={player.nameFr}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#121C2E] via-[#121C2E]/25 to-transparent" />
            <div className="absolute bottom-1.5 left-2.5 text-[11px] font-medium text-slate-200">
              Capitale : {player.capital}
            </div>
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <CountryFlag
              flag={player.flag}
              fallbackColor={player.color}
              name={player.nameFr}
              className="w-7 h-5 rounded-xs border border-white/20 shrink-0"
            />
            <h2 className="text-lg font-display font-semibold text-white truncate">
              {player.nameFr}
            </h2>
          </div>
          <span className="text-xs text-amber-300 font-medium whitespace-nowrap shrink-0">
            Votre nation
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          {player.leaderPortrait && (
            <img
              src={player.leaderPortrait}
              alt={player.leaderName}
              referrerPolicy="no-referrer"
              className="w-6 h-6 rounded object-cover border border-white/20 shrink-0"
            />
          )}
          <p className="text-xs text-slate-400 truncate">
            {player.leaderTitle} {player.leaderName} · {player.regime}
          </p>
        </div>
        {clickedTerritory && (
          <div className="mt-2 px-2.5 py-1.5 bg-amber-500/10 border border-amber-400/25 rounded text-[11px] text-amber-200">
            Territoire cliqué : <span className="font-semibold">{clickedTerritory.nameFr}</span> ·
            Propriétaire : <span className="font-semibold">{player.nameFr}</span>
          </div>
        )}

        {/* Sub-navigation Tabs */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-[#0A111D] rounded-md mt-3">
          <button
            type="button"
            onClick={() => setSubTab('economie')}
            className={`py-1.5 px-2 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
              subTab === 'economie'
                ? 'bg-[#1B2940] text-amber-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Économie
          </button>
          <button
            type="button"
            onClick={() => setSubTab('armee')}
            className={`py-1.5 px-2 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
              subTab === 'armee'
                ? 'bg-[#1B2940] text-amber-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Armée {myWars.length > 0 ? `(${myWars.length})` : ''}
          </button>
          <button
            type="button"
            onClick={() => setSubTab('societe')}
            className={`py-1.5 px-2 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
              subTab === 'societe'
                ? 'bg-[#1B2940] text-amber-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Société & Traités
          </button>
        </div>
      </div>

      {actionFeedback && (
        <div className="px-4 py-2 bg-amber-500/15 border-b border-amber-400/30 text-xs text-amber-200">
          {actionFeedback}
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {subTab === 'economie' && (
          <>
            {/* Financial Summary */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 bg-[#141F32] border border-white/10 rounded-md">
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  <span>Trésor public</span>
                </div>
                <div className="text-base font-mono-tabular font-semibold text-white mt-1">
                  {player.treasury.toFixed(1)} Mds $
                </div>
                <div
                  className={`text-[11px] font-mono-tabular mt-0.5 ${
                    player.monthlyBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {player.monthlyBalance >= 0 ? '+' : ''}
                  {player.monthlyBalance.toFixed(2)} Mds $ / mois
                </div>
              </div>

              <div className="p-3 bg-[#141F32] border border-white/10 rounded-md">
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-sky-400" />
                  <span>PIB effectif</span>
                </div>
                <div className="text-base font-mono-tabular font-semibold text-white mt-1">
                  {totals.totalGdp.toLocaleString('fr-FR')} Mds $
                </div>
                <div
                  className={`text-[11px] font-mono-tabular mt-0.5 ${
                    player.gdpGrowthMonthly >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {player.gdpGrowthMonthly >= 0 ? '+' : ''}
                  {player.gdpGrowthMonthly.toFixed(2)} % / mois
                </div>
              </div>
            </div>

            {/* Fiscal & Budget Sliders */}
            <div className="space-y-4 pt-2 border-t border-white/10">
              <h3 className="text-xs font-semibold text-slate-300">
                Politique fiscale & budgétaire
              </h3>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Taux d’imposition</span>
                  <span className="font-mono-tabular text-amber-300 font-medium">
                    {player.policy.taxRate} %
                  </span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={48}
                  value={player.policy.taxRate}
                  onChange={(e) => onUpdatePolicy({ taxRate: Number(e.target.value) })}
                  className="w-full accent-amber-400 cursor-pointer"
                />
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Plus élevé = recettes fiscales accrues, croissance et stabilité réduites.
                </p>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Budget infrastructures & industrie</span>
                  <span className="font-mono-tabular text-sky-300 font-medium">
                    {player.policy.infrastructureBudget} %
                  </span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={45}
                  value={player.policy.infrastructureBudget}
                  onChange={(e) =>
                    onUpdatePolicy({ infrastructureBudget: Number(e.target.value) })
                  }
                  className="w-full accent-sky-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Dépenses sociales & services</span>
                  <span className="font-mono-tabular text-emerald-300 font-medium">
                    {player.policy.socialBudget} %
                  </span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={45}
                  value={player.policy.socialBudget}
                  onChange={(e) => onUpdatePolicy({ socialBudget: Number(e.target.value) })}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>
            </div>

            {/* Strategic Economic Directives */}
            <div className="space-y-2.5 pt-3 border-t border-white/10">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">Directives nationales</span>
                <span className="font-mono-tabular text-slate-400">
                  Coût : {directiveCost} Mds $
                </span>
              </div>

              <button
                type="button"
                onClick={() => onEnactDirective('INFRASTRUCTURE')}
                className="w-full p-2.5 bg-[#141F32] hover:bg-[#1A2840] border border-white/10 rounded-md text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs font-medium text-white">
                  <span>Plan de relance industrielle</span>
                  <span className="text-emerald-400 font-mono-tabular">+2,2 % PIB</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Accroît la capacité productive et la croissance mensuelle.
                </p>
              </button>

              <button
                type="button"
                onClick={() => onEnactDirective('RECHERCHE')}
                className="w-full p-2.5 bg-[#141F32] hover:bg-[#1A2840] border border-white/10 rounded-md text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs font-medium text-white">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                    Programme de recherche avancée
                  </span>
                  <span className="text-sky-400 font-mono-tabular">+0,08 Tech</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Améliore l’efficacité militaire et la productivité.
                </p>
              </button>
            </div>
          </>
        )}

        {subTab === 'armee' && (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 bg-[#141F32] border border-white/10 rounded-md">
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-rose-400" />
                  <span>Effectifs & Puissance</span>
                </div>
                <div className="text-base font-mono-tabular font-semibold text-white mt-1">
                  {player.army.toLocaleString('fr-FR')}k
                </div>
                <div className="text-[11px] text-amber-300 font-mono-tabular mt-0.5">
                  Indice combat : {powerIndex.toLocaleString('fr-FR')}
                </div>
              </div>

              <div className="p-3 bg-[#141F32] border border-white/10 rounded-md">
                <div className="text-[11px] text-slate-400">Technologie & Moral</div>
                <div className="text-base font-mono-tabular font-semibold text-white mt-1">
                  Tech {player.techLevel.toFixed(2)}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 font-mono-tabular">
                  Fatigue : {Math.round(player.warExhaustion)} % · {player.policy.doctrine}
                </div>
              </div>
            </div>

            {/* Military Budget & Doctrine */}
            <div className="space-y-3 pt-2 border-t border-white/10">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Budget de la Défense</span>
                  <span className="font-mono-tabular text-rose-300 font-medium">
                    {player.policy.militaryBudget} %
                  </span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={45}
                  value={player.policy.militaryBudget}
                  onChange={(e) => onUpdatePolicy({ militaryBudget: Number(e.target.value) })}
                  className="w-full accent-rose-400 cursor-pointer"
                />
              </div>

              <div>
                <span className="text-xs text-slate-300 block mb-1.5">Doctrine militaire</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['Défensive', 'Équilibrée', 'Offensive'] as const).map((doc) => (
                    <button
                      key={doc}
                      type="button"
                      onClick={() => onUpdatePolicy({ doctrine: doc })}
                      className={`py-1.5 px-2 text-xs font-medium rounded border transition-colors cursor-pointer ${
                        player.policy.doctrine === doc
                          ? 'bg-rose-500/20 border-rose-400/60 text-rose-200'
                          : 'bg-[#121B2B] border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      {doc}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Instant Recruitment */}
            <div className="space-y-2 pt-3 border-t border-white/10">
              <h3 className="text-xs font-semibold text-slate-300">
                Mobilisation & Recrutement immédiat
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {[10, 25, 50].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => onRecruit(amt)}
                    className="py-2 px-2 bg-[#141F32] hover:bg-[#1E2D47] border border-white/10 rounded text-center transition-colors cursor-pointer"
                  >
                    <div className="text-xs font-semibold text-white font-mono-tabular">
                      +{amt}k
                    </div>
                    <div className="text-[11px] text-amber-300 font-mono-tabular">
                      {(amt * 0.25).toFixed(1)} Mds $
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Active Wars */}
            <div className="space-y-2.5 pt-3 border-t border-white/10">
              <h3 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Swords className="w-3.5 h-3.5 text-rose-400" />
                <span>Conflits en cours ({myWars.length})</span>
              </h3>
              {myWars.length === 0 ? (
                <p className="text-xs text-slate-500">
                  Votre nation est actuellement en paix.
                </p>
              ) : (
                myWars.map((war) => {
                  const isAgg =
                    war.aggressorId === player.id || war.aggressorAllies.includes(player.id);
                  const enemyId = isAgg ? war.defenderId : war.aggressorId;
                  const enemy = world.countries[enemyId];
                  const playerAdvantage = isAgg ? war.warScore : -war.warScore;
                  const playerOcc = isAgg
                    ? war.aggressorOccupation ?? 0
                    : war.defenderOccupation ?? 0;
                  const enemyOcc = isAgg
                    ? war.defenderOccupation ?? 0
                    : war.aggressorOccupation ?? 0;
                  const battlesWon = isAgg
                    ? war.battlesWonAggressor ?? 0
                    : war.battlesWonDefender ?? 0;
                  const battlesLost = isAgg
                    ? war.battlesWonDefender ?? 0
                    : war.battlesWonAggressor ?? 0;
                  const offensiveOrdered = isAgg
                    ? Boolean(war.offensiveBoostAggressor)
                    : Boolean(war.offensiveBoostDefender);

                  return (
                    <div
                      key={war.id}
                      className="p-3 bg-[#1A141B] border border-rose-500/30 rounded-md space-y-2.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <button
                          type="button"
                          onClick={() => onSelectCountry(enemyId)}
                          className="font-semibold text-white hover:text-amber-300 text-left cursor-pointer"
                        >
                          {war.name}
                        </button>
                        <span className="font-mono-tabular text-rose-300">
                          {war.monthsDuration} mois
                        </span>
                      </div>

                      {/* Occupation Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-mono-tabular">
                          <span className="text-emerald-300">
                            Avancée : {playerOcc} %
                          </span>
                          <span className="text-rose-300">
                            Invasion subie : {enemyOcc} %
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
                          <div
                            className="bg-emerald-500 h-full transition-all"
                            style={{ width: `${playerOcc}%` }}
                          />
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-300 flex justify-between font-mono-tabular">
                        <span>
                          Batailles : {battlesWon}V · {battlesLost}D
                        </span>
                        <span>Pertes : {war.casualtiesTotal}k</span>
                      </div>

                      {war.lastBattleSummary && (
                        <p className="text-[11px] text-slate-300 leading-snug bg-black/25 p-2 rounded">
                          {war.lastBattleSummary}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <button
                          type="button"
                          disabled={offensiveOrdered}
                          onClick={() => onLaunchOffensive(war.id)}
                          className="px-2.5 py-1 text-[11px] font-medium bg-rose-600/80 hover:bg-rose-500 disabled:opacity-45 text-white rounded cursor-pointer disabled:cursor-default"
                        >
                          {offensiveOrdered
                            ? 'Offensive prête'
                            : `Offensive (+25%, ${offensiveCost} Md)`}
                        </button>
                        <button
                          type="button"
                          onClick={() => onPeaceTreaty(war.id, 'STATUS_QUO')}
                          className="px-2.5 py-1 text-[11px] bg-white/10 hover:bg-white/20 text-white rounded cursor-pointer"
                        >
                          Paix blanche
                        </button>
                        {playerAdvantage >= 15 && (
                          <button
                            type="button"
                            onClick={() => onPeaceTreaty(war.id, 'REPARATIONS')}
                            className="px-2.5 py-1 text-[11px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 rounded cursor-pointer"
                          >
                            Réparations
                          </button>
                        )}
                        {playerAdvantage >= 30 && enemy && (
                          <button
                            type="button"
                            onClick={() => onPeaceTreaty(war.id, 'ANNEXATION')}
                            className="px-2.5 py-1 text-[11px] bg-rose-500/25 hover:bg-rose-500/40 text-rose-100 rounded cursor-pointer"
                          >
                            Annexer
                          </button>
                        )}
                        {(playerOcc >= 68 || playerAdvantage >= 58) && (
                          <button
                            type="button"
                            onClick={() =>
                              onPeaceTreaty(war.id, 'CAPITULATION', player.id)
                            }
                            className="px-2.5 py-1 text-[11px] font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded cursor-pointer"
                          >
                            Exiger capitulation
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {subTab === 'societe' && (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 bg-[#141F32] border border-white/10 rounded-md">
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-sky-400" />
                  <span>Population totale</span>
                </div>
                <div className="text-base font-mono-tabular font-semibold text-white mt-1">
                  {totals.totalPop.toFixed(1)} M
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {totals.territories} territoire(s)
                </div>
              </div>

              <div className="p-3 bg-[#141F32] border border-white/10 rounded-md">
                <div className="text-[11px] text-slate-400">Stabilité & Soutien</div>
                <div className="text-base font-mono-tabular font-semibold text-white mt-1">
                  {Math.round(player.stability)} %
                </div>
                <div className="text-[11px] text-emerald-400 font-mono-tabular mt-0.5">
                  Approbation : {Math.round(player.approval)} %
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-white/10 space-y-2">
              <button
                type="button"
                onClick={() => onEnactDirective('COHESION')}
                className="w-full p-2.5 bg-[#141F32] hover:bg-[#1A2840] border border-white/10 rounded-md text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs font-medium text-white">
                  <span>Programme de cohésion sociale</span>
                  <span className="text-emerald-400 font-mono-tabular">+8 Stabilité</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Coût : {directiveCost} Mds $ · Apaise les tensions et réduit la fatigue de guerre.
                </p>
              </button>
            </div>

            {/* Active Alliances & Economic Unions */}
            <div className="space-y-2.5 pt-3 border-t border-white/10">
              <h3 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Handshake className="w-3.5 h-3.5 text-amber-400" />
                <span>Alliances & Unions ({myAlliances.length})</span>
              </h3>
              {myAlliances.length === 0 ? (
                <p className="text-xs text-slate-500">
                  Vous n’appartenez à aucune alliance ni union économique. Sélectionnez un autre
                  pays sur la carte pour négocier un traité.
                </p>
              ) : (
                myAlliances.map((al) => (
                  <div
                    key={al.id}
                    className="p-3 bg-[#141F32] border border-white/10 rounded-md space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-white">{al.name}</span>
                      <span className="text-[11px] text-slate-400 shrink-0">
                        {al.type === 'ALLIANCE' ? 'Alliance militaire' : 'Union économique'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {al.memberIds.length} membres · Depuis {al.foundedDate}
                    </div>
                    <button
                      type="button"
                      onClick={() => onLeaveCoalition(al.id)}
                      className="text-[11px] text-rose-400 hover:text-rose-300 cursor-pointer"
                    >
                      Quitter ce traité
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Active Trade Deals */}
            <div className="space-y-2 pt-3 border-t border-white/10">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">
                  Accords commerciaux ({myTradeDeals.length})
                </span>
                {player.resources && (
                  <span className="text-[11px] text-teal-300">
                    Exporte : {player.resources.exportResource}
                  </span>
                )}
              </div>
              {myTradeDeals.length === 0 ? (
                <p className="text-xs text-slate-500">
                  Aucun accord commercial bilatéral actif. Sélectionnez un pays sur la carte pour commercer.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {myTradeDeals.slice(0, 8).map((td) => {
                    const partnerId = td.exporterId === player.id ? td.importerId : td.exporterId;
                    const partner = world.countries[partnerId];
                    if (!partner) return null;
                    return (
                      <button
                        key={td.id}
                        type="button"
                        onClick={() => onSelectCountry(partnerId)}
                        className="w-full px-2.5 py-1.5 bg-[#141F32] hover:bg-[#1A2840] border border-white/10 rounded flex items-center justify-between text-xs cursor-pointer"
                      >
                        <span className="text-slate-100 truncate">{partner.nameFr}</span>
                        <span className="text-[11px] font-mono-tabular text-teal-300 shrink-0 ml-2">
                          {td.resource} · {td.valueMds} Md $
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
