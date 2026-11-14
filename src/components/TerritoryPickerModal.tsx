import React, { useState } from 'react';
import {
  Check,
  Crosshair,
  Eraser,
  Layers,
  MapPin,
  Paintbrush,
  Plus,
  X,
} from 'lucide-react';
import { MapFeature } from '../engine/worldInit';
import { CustomCountryConfig, WorldState } from '../types/game';
import { CountryFlag } from './CountryFlag';
import { WorldMap } from './WorldMap';

export type PickerToolMode = 'relocate' | 'toggle' | 'brush-add' | 'brush-remove';

interface TerritoryPickerModalProps {
  features: MapFeature[];
  spherePath: string;
  graticulePath: string;
  world: WorldState;
  config: CustomCountryConfig;
  initialTool?: PickerToolMode;
  onUpdateConfig: React.Dispatch<React.SetStateAction<CustomCountryConfig>>;
  onConfirm: () => void;
  onCancel: () => void;
}

export const TerritoryPickerModal: React.FC<TerritoryPickerModalProps> = ({
  features,
  spherePath,
  graticulePath,
  world,
  config,
  initialTool = 'relocate',
  onUpdateConfig,
  onConfirm,
  onCancel,
}) => {
  const [tool, setTool] = useState<PickerToolMode>(initialTool);
  const [focusTarget, setFocusTarget] = useState<[number, number] | null>(() => {
    const first = config.territoryIds[0] ? world.countries[config.territoryIds[0]] : null;
    return first ? [...first.centroid] : null;
  });

  const anchorCountry = config.territoryIds[0]
    ? world.countries[config.territoryIds[0]]
    : null;

  const handleMapSelect = (
    _countryId: string,
    territoryId?: string,
    svgCoords?: [number, number]
  ) => {
    const tid = territoryId ?? _countryId;
    if (!world.countries[tid]) return;

    if (tool === 'relocate') {
      onUpdateConfig((prev) => ({
        ...prev,
        territoryIds: [tid],
        capitalCoords: svgCoords ?? world.countries[tid].centroid,
      }));
    } else if (tool === 'toggle') {
      onUpdateConfig((prev) => {
        const exists = prev.territoryIds.includes(tid);
        if (exists) {
          if (prev.territoryIds.length <= 1) return prev;
          return {
            ...prev,
            territoryIds: prev.territoryIds.filter((id) => id !== tid),
          };
        }
        return {
          ...prev,
          territoryIds: [...prev.territoryIds, tid],
        };
      });
    }
  };

  const handleBrushTerritory = (tid: string) => {
    if (!world.countries[tid]) return;
    if (tool === 'brush-add') {
      onUpdateConfig((prev) => {
        if (prev.territoryIds.includes(tid)) return prev;
        return {
          ...prev,
          territoryIds: [...prev.territoryIds, tid],
        };
      });
    } else if (tool === 'brush-remove') {
      onUpdateConfig((prev) => {
        if (prev.territoryIds.length <= 1 || !prev.territoryIds.includes(tid)) return prev;
        return {
          ...prev,
          territoryIds: prev.territoryIds.filter((id) => id !== tid),
        };
      });
    }
  };

  const handleExpandNeighbors = () => {
    onUpdateConfig((prev) => {
      const next = new Set(prev.territoryIds);
      let added = 0;
      for (const tid of prev.territoryIds) {
        const c = world.countries[tid];
        if (!c) continue;
        for (const nid of c.neighbors) {
          if (!next.has(nid) && world.countries[nid] && added < 3) {
            next.add(nid);
            added++;
          }
        }
      }
      return { ...prev, territoryIds: Array.from(next) };
    });
  };

  const handleCenterOnNation = () => {
    if (anchorCountry) {
      setFocusTarget([...(config.capitalCoords || anchorCountry.centroid)]);
    }
  };

  const brushMode =
    tool === 'brush-add' ? 'add' : tool === 'brush-remove' ? 'remove' : null;

  const toolHint =
    tool === 'relocate'
      ? 'Touchez ou cliquez sur un pays de la carte pour y placer votre pays et sa capitale.'
      : tool === 'toggle'
        ? 'Touchez ou cliquez sur des régions pour les ajouter ou les retirer de vos frontières.'
        : tool === 'brush-add'
          ? 'Maintenez le clic ou votre doigt et glissez sur la carte pour tracer votre territoire.'
          : 'Maintenez le clic ou votre doigt et glissez sur des régions pour les retirer.';

  return (
    <div className="fixed inset-0 z-50 bg-[#060C16] flex flex-col">
      {/* Top Toolbar */}
      <header className="px-3 sm:px-5 py-2.5 bg-[#0D1626] border-b border-white/10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <CountryFlag
              flag={config.flag}
              fallbackColor={config.color}
              name={config.nameFr || 'Drapeau'}
              className="w-8 h-5 rounded-xs border border-white/20 shrink-0"
            />
            <div className="min-w-0">
              <div className="text-sm font-display font-semibold text-white truncate">
                {config.nameFr.trim() || 'Nouveau pays'} — Emplacement & Frontières
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                {config.territoryIds.length}{' '}
                {config.territoryIds.length > 1 ? 'territoires sélectionnés' : 'territoire sélectionné'}
                {anchorCountry ? ` · Siège : ${anchorCountry.nameFr}` : ''}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="lg:hidden p-2 text-slate-400 hover:text-white rounded border border-white/10 cursor-pointer"
            aria-label="Fermer la carte"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Interactive Mode Switcher (Mouse & Touch Friendly >= 40px) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 lg:pb-0">
          <button
            type="button"
            onClick={() => setTool('relocate')}
            className={`min-h-[40px] px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              tool === 'relocate'
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'bg-[#152238] text-slate-200 hover:bg-[#1D2F4C] border border-white/10'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Placer l’emplacement</span>
          </button>

          <button
            type="button"
            onClick={() => setTool('toggle')}
            className={`min-h-[40px] px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              tool === 'toggle'
                ? 'bg-sky-500 text-slate-950 font-semibold'
                : 'bg-[#152238] text-slate-200 hover:bg-[#1D2F4C] border border-white/10'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Ajouter / Retirer</span>
          </button>

          <button
            type="button"
            onClick={() => setTool('brush-add')}
            className={`min-h-[40px] px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              tool === 'brush-add'
                ? 'bg-emerald-500 text-slate-950 font-semibold'
                : 'bg-[#152238] text-slate-200 hover:bg-[#1D2F4C] border border-white/10'
            }`}
          >
            <Paintbrush className="w-3.5 h-3.5" />
            <span>Tracer les frontières</span>
          </button>

          <button
            type="button"
            onClick={() => setTool('brush-remove')}
            className={`min-h-[40px] px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              tool === 'brush-remove'
                ? 'bg-rose-500 text-slate-950 font-semibold'
                : 'bg-[#152238] text-slate-200 hover:bg-[#1D2F4C] border border-white/10'
            }`}
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>Gomme</span>
          </button>
        </div>
      </header>

      {/* Instruction Ribbon */}
      <div className="px-4 py-2 bg-[#111D32] border-b border-white/10 text-xs text-amber-200 flex items-center justify-between gap-3 shrink-0">
        <span>{toolHint}</span>
        <span className="hidden md:inline text-[11px] text-slate-400 whitespace-nowrap">
          Zoom : molette, deux doigts ou boutons + / −
        </span>
      </div>

      {/* Full-Viewport Interactive Map */}
      <div className="flex-1 relative min-h-0">
        <WorldMap
          features={features}
          spherePath={spherePath}
          graticulePath={graticulePath}
          world={world}
          mapMode="politique"
          onSelectCountry={handleMapSelect}
          focusTarget={focusTarget}
          brushMode={brushMode}
          onBrushTerritory={handleBrushTerritory}
          customPreview={{
            territoryIds: config.territoryIds,
            nameFr: config.nameFr,
            color: config.color,
            capital: config.capital,
            capitalCoords: config.capitalCoords,
          }}
        />
      </div>

      {/* Bottom Validation Bar */}
      <footer className="px-3 sm:px-5 py-3 bg-[#0D1626] border-t border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExpandNeighbors}
            className="min-h-[40px] px-3 py-1.5 text-xs font-medium bg-[#152238] hover:bg-[#1E2F4C] border border-white/15 rounded-md text-slate-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>+ Voisins</span>
          </button>
          <button
            type="button"
            onClick={handleCenterOnNation}
            className="min-h-[40px] px-3 py-1.5 text-xs font-medium bg-[#152238] hover:bg-[#1E2F4C] border border-white/15 rounded-md text-slate-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Crosshair className="w-3.5 h-3.5 text-sky-400" />
            <span>Centrer</span>
          </button>
        </div>

        <div className="flex items-center gap-2.5 ml-auto">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[44px] px-4 py-2 text-xs font-medium bg-[#152238] hover:bg-[#1E2F4C] border border-white/15 rounded-md text-slate-300 hover:text-white cursor-pointer whitespace-nowrap"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-[44px] px-5 py-2 text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-md flex items-center gap-2 shadow-[0_0_24px_rgba(245,158,11,0.25)] cursor-pointer whitespace-nowrap"
          >
            <Check className="w-4 h-4" />
            <span>Valider l’emplacement ({config.territoryIds.length})</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
