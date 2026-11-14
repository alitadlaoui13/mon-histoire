import React, { useMemo, useState } from 'react';
import { ArrowLeft, Globe2, Search, Shield, TrendingUp, Users } from 'lucide-react';
import { WorldState } from '../types/game';
import { CountryFlag } from './CountryFlag';

interface NationSelectPanelProps {
  world: WorldState;
  onSelectCountry: (countryId: string) => void;
  onFocusCountry: (countryId: string) => void;
  onStartGame: (countryId: string) => void;
  onBackToModeChoice?: () => void;
}

export const NationSelectPanel: React.FC<NationSelectPanelProps> = ({
  world,
  onSelectCountry,
  onFocusCountry,
  onStartGame,
  onBackToModeChoice,
}) => {
  const [filterText, setFilterText] = useState('');
  const [selectedLetter, setSelectedLetter] = useState<string>('ALL');

  const selectedId = world.selectedCountryId || '250';
  const country = world.countries[selectedId] || world.countries['250'];

  // Sort ALL world countries alphabetically A -> Z in French locale
  const allCountriesSorted = useMemo(() => {
    return Object.values(world.countries).sort((a, b) =>
      a.nameFr.localeCompare(b.nameFr, 'fr', { sensitivity: 'base' })
    );
  }, [world.countries]);

  const availableLetters = useMemo(() => {
    const set = new Set<string>();
    for (const c of allCountriesSorted) {
      const base = c.nameFr
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .charAt(0)
        .toUpperCase();
      if (base) set.add(base);
    }
    return Array.from(set).sort();
  }, [allCountriesSorted]);

  const filteredCountries = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    return allCountriesSorted.filter((c) => {
      if (selectedLetter !== 'ALL') {
        const first = c.nameFr
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .charAt(0)
          .toUpperCase();
        if (first !== selectedLetter) return false;
      }
      if (!q) return true;
      return (
        c.nameFr.toLowerCase().includes(q) ||
        c.capital.toLowerCase().includes(q) ||
        c.region.toLowerCase().includes(q)
      );
    });
  }, [allCountriesSorted, filterText, selectedLetter]);

  const alliances = useMemo(() => {
    if (!country) return [];
    return world.alliances.filter((al) => al.memberIds.includes(country.id));
  }, [world.alliances, country]);

  const handlePickCountry = (id: string) => {
    onSelectCountry(id);
    onFocusCountry(id);
  };

  return (
    <aside className="w-full lg:w-[410px] xl:w-[440px] shrink-0 h-[56vh] lg:h-full bg-[#0C1422] border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col min-h-0">
      {/* Header & Alphabetical Dropdown */}
      <div className="p-4 border-b border-white/10 bg-[#101A2C] space-y-3 shrink-0">
        {onBackToModeChoice && (
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onBackToModeChoice}
              className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Changer de mode</span>
            </button>
            <span className="text-[11px] text-amber-300 font-medium">
              Pays existant (A → Z)
            </span>
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] text-amber-400 font-medium tracking-wide">
              Nouvelle campagne · Novembre 2026
            </p>
            <h2 className="text-xl font-display font-semibold text-white mt-0.5">
              Choisissez votre nation
            </h2>
          </div>
          <span className="text-[11px] font-mono-tabular text-slate-400 shrink-0">
            {allCountriesSorted.length} pays
          </span>
        </div>

        {/* Full A-Z Dropdown Selector */}
        <div>
          <label className="block text-[11px] text-slate-400 mb-1">
            Menu déroulant (ordre alphabétique A → Z)
          </label>
          <select
            aria-label="Choisir un pays par ordre alphabétique"
            value={selectedId}
            onChange={(e) => handlePickCountry(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-[#142035] border border-white/15 rounded-md text-white focus:outline-none focus:border-amber-400/70 cursor-pointer"
          >
            {allCountriesSorted.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameFr} — {c.region} ({Math.round(c.gdp).toLocaleString('fr-FR')} Md $)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Selected Nation Dossier */}
      {country && (
        <div className="p-4 border-b border-white/10 bg-[#121D30] space-y-3 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-sm shrink-0"
                  style={{ backgroundColor: country.color }}
                />
                <h3 className="text-lg font-display font-semibold text-white">
                  {country.nameFr}
                </h3>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {country.capital} · {country.region}
              </p>
            </div>
            <span className="text-[11px] text-slate-300 font-medium text-right">
              {country.regime}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div className="p-2 bg-[#0B1220] border border-white/5 rounded">
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <TrendingUp className="w-3 h-3 text-amber-400" />
                <span>PIB</span>
              </div>
              <div className="text-xs font-mono-tabular font-semibold text-white mt-0.5">
                {Math.round(country.gdp).toLocaleString('fr-FR')} Md
              </div>
            </div>

            <div className="p-2 bg-[#0B1220] border border-white/5 rounded">
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <Shield className="w-3 h-3 text-rose-400" />
                <span>Armée</span>
              </div>
              <div className="text-xs font-mono-tabular font-semibold text-white mt-0.5">
                {country.army.toLocaleString('fr-FR')}k
              </div>
            </div>

            <div className="p-2 bg-[#0B1220] border border-white/5 rounded">
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <Users className="w-3 h-3 text-sky-400" />
                <span>Pop.</span>
              </div>
              <div className="text-xs font-mono-tabular font-semibold text-white mt-0.5">
                {country.population.toFixed(1)} M
              </div>
            </div>

            <div className="p-2 bg-[#0B1220] border border-white/5 rounded">
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <Globe2 className="w-3 h-3 text-emerald-400" />
                <span>Stab.</span>
              </div>
              <div className="text-xs font-mono-tabular font-semibold text-white mt-0.5">
                {Math.round(country.stability)} %
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-300">
            <span>
              <span className="text-slate-400">Dirigeant : </span>
              {country.leaderTitle} {country.leaderName}
            </span>
            {country.resources && (
              <span className="text-teal-300">{country.resources.exportResource}</span>
            )}
          </div>

          {alliances.length > 0 && (
            <div className="text-[11px] text-slate-400 truncate">
              Traités : <span className="text-slate-300">{alliances.map((a) => a.name).join(' · ')}</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => onStartGame(country.id)}
            className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm rounded-md transition-colors cursor-pointer whitespace-nowrap shadow-[0_0_20px_rgba(245,158,11,0.2)] flex items-center justify-center gap-2"
          >
            <CountryFlag
              flag={country.flag}
              fallbackColor={country.color}
              name={country.nameFr}
              className="w-5 h-3.5 rounded-xs border border-slate-900/30 shrink-0"
            />
            <span>Commencer la partie</span>
          </button>
        </div>
      )}

      {/* Search & Alphabetical Quick Filter + Scrollable A-Z List */}
      <div className="p-3 border-b border-white/10 bg-[#0D1626] space-y-2 shrink-0">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filtrer dans la liste A–Z..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#131F34] border border-white/10 rounded text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400/60"
          />
        </div>

        {/* Alphabetical Index Strip */}
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setSelectedLetter('ALL')}
            className={`px-1.5 py-0.5 text-[10px] font-semibold rounded cursor-pointer transition-colors ${
              selectedLetter === 'ALL'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Tous
          </button>
          {availableLetters.map((letter) => (
            <button
              key={letter}
              type="button"
              onClick={() => setSelectedLetter(letter)}
              className={`w-5 py-0.5 text-[10px] font-mono-tabular font-semibold rounded text-center cursor-pointer transition-colors ${
                selectedLetter === letter
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {letter}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable A -> Z Nation List */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/5">
        {filteredCountries.length === 0 ? (
          <p className="p-4 text-xs text-slate-500">Aucun pays ne correspond à votre filtre.</p>
        ) : (
          filteredCountries.map((c) => {
            const active = selectedId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => handlePickCountry(c.id)}
                className={`w-full px-4 py-2.5 text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                  active ? 'bg-amber-500/15' : 'hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: c.color }}
                  />
                  <div className="min-w-0">
                    <div
                      className={`text-xs font-medium truncate ${
                        active ? 'text-amber-200' : 'text-slate-100'
                      }`}
                    >
                      {c.nameFr}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">
                      {c.capital} · {c.region}
                    </div>
                  </div>
                </div>
                <span className="text-[11px] font-mono-tabular text-slate-400 shrink-0">
                  {Math.round(c.gdp).toLocaleString('fr-FR')} Md $
                </span>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
};
