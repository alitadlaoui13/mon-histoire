import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Mail, Newspaper } from 'lucide-react';
import { WorldState } from '../types/game';

interface WorldChronicleProps {
  world: WorldState;
  onFocusCountry: (countryId: string) => void;
  onResolveProposal: (proposalId: string, accept: boolean) => void;
}

export const WorldChronicle: React.FC<WorldChronicleProps> = ({
  world,
  onFocusCountry,
  onResolveProposal,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [tab, setTab] = useState<'events' | 'inbox'>('events');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const proposalCount = world.proposals.length;

  const filteredEvents =
    categoryFilter === 'ALL'
      ? world.events
      : categoryFilter === 'WAR_PEACE'
        ? world.events.filter((e) => e.category === 'GUERRE' || e.category === 'PAIX')
        : categoryFilter === 'TRADE'
          ? world.events.filter((e) => e.category === 'COMMERCE' || e.category === 'ÉCONOMIE')
          : categoryFilter === 'DIPLO'
            ? world.events.filter((e) => e.category === 'DIPLOMATIE')
            : world.events.filter((e) => e.category === 'POLITIQUE' || e.category === 'CRISE');

  return (
    <div
      className={`absolute bottom-3 left-3 z-20 w-[340px] sm:w-[400px] bg-[#0D1523]/95 border border-white/10 rounded-lg shadow-2xl overflow-hidden transition-all ${
        collapsed ? 'h-10' : 'h-[285px]'
      } flex flex-col`}
    >
      {/* Header Bar */}
      <div className="h-10 px-3 border-b border-white/10 flex items-center justify-between gap-2 shrink-0 bg-[#111B2D]">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setTab('events');
              setCollapsed(false);
            }}
            className={`px-2 py-1 text-xs font-medium rounded flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              tab === 'events' ? 'text-amber-300 bg-white/5' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Newspaper className="w-3.5 h-3.5" />
            <span>Chronique mondiale</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTab('inbox');
              setCollapsed(false);
            }}
            className={`px-2 py-1 text-xs font-medium rounded flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              tab === 'inbox' ? 'text-amber-300 bg-white/5' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>
              Dépêches{proposalCount > 0 ? ` (${proposalCount})` : ''}
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="p-1 text-slate-400 hover:text-white cursor-pointer"
          title={collapsed ? 'Agrandir' : 'Réduire'}
        >
          {collapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Filter Strip when viewing Chronicle */}
      {!collapsed && tab === 'events' && (
        <div className="px-3 py-1.5 border-b border-white/5 bg-[#0E1829] flex items-center gap-2 overflow-x-auto shrink-0">
          {(
            [
              ['ALL', 'Tous'],
              ['WAR_PEACE', 'Guerres & Paix'],
              ['TRADE', 'Commerce & Éco'],
              ['DIPLO', 'Alliances'],
              ['POLITICS', 'Politique & Crises'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setCategoryFilter(key)}
              className={`text-[11px] font-medium whitespace-nowrap cursor-pointer transition-colors ${
                categoryFilter === key
                  ? 'text-amber-300 underline underline-offset-4'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Body */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {tab === 'events' ? (
            filteredEvents.length === 0 ? (
              <p className="text-xs text-slate-500">Aucun événement dans cette catégorie.</p>
            ) : (
              filteredEvents.slice(0, 45).map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => {
                    if (ev.involvedCountryIds[0]) {
                      onFocusCountry(ev.involvedCountryIds[0]);
                    }
                  }}
                  className="p-2.5 bg-[#121D30] hover:bg-[#17253D] border border-white/5 rounded-md cursor-pointer transition-colors"
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
                              : ev.category === 'ÉCONOMIE'
                                ? 'text-amber-300'
                                : ev.category === 'CRISE'
                                  ? 'text-orange-400'
                                  : ev.category === 'POLITIQUE'
                                    ? 'text-indigo-300'
                                    : 'text-sky-300'
                      }`}
                    >
                      {ev.category}
                    </span>
                    <span className="font-mono-tabular">{ev.dateLabel}</span>
                  </div>
                  <div className="text-xs font-semibold text-slate-100 mt-0.5">{ev.title}</div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    {ev.description}
                  </p>
                </div>
              ))
            )
          ) : world.proposals.length === 0 ? (
            <p className="text-xs text-slate-500 p-2">
              Aucune proposition diplomatique en attente. Les dirigeants IA vous contacteront au
              fil des mois.
            </p>
          ) : (
            world.proposals.map((prop) => {
              const sender = world.countries[prop.fromCountryId];
              return (
                <div
                  key={prop.id}
                  className="p-3 bg-[#142034] border border-amber-400/25 rounded-md space-y-2"
                >
                  <div className="flex items-center justify-between text-[11px] text-amber-300">
                    <button
                      type="button"
                      onClick={() => onFocusCountry(prop.fromCountryId)}
                      className="font-semibold hover:underline cursor-pointer"
                    >
                      {sender?.nameFr ?? prop.fromCountryId}
                    </button>
                    <span className="text-slate-400 font-mono-tabular">{prop.dateLabel}</span>
                  </div>
                  <div className="text-xs font-semibold text-white">{prop.title}</div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">{prop.message}</p>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onResolveProposal(prop.id, true)}
                      className="flex-1 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded cursor-pointer transition-colors"
                    >
                      Accepter
                    </button>
                    <button
                      type="button"
                      onClick={() => onResolveProposal(prop.id, false)}
                      className="flex-1 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 text-slate-200 rounded cursor-pointer transition-colors"
                    >
                      Refuser
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
