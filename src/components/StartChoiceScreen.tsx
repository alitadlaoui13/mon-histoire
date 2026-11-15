import React from 'react';
import { ArrowRight, Flag, Globe2, Sparkles } from 'lucide-react';
import { MAP_HEIGHT, MAP_WIDTH, MapFeature } from '../engine/worldInit';

interface StartChoiceScreenProps {
  features: MapFeature[];
  spherePath: string;
  graticulePath: string;
  countriesCount: number;
  onSelectExistingMode: () => void;
  onSelectCustomMode: () => void;
}

export const StartChoiceScreen: React.FC<StartChoiceScreenProps> = ({
  features,
  spherePath,
  graticulePath,
  countriesCount,
  onSelectExistingMode,
  onSelectCustomMode,
}) => {
  return (
    <div className="relative flex-1 w-full bg-[#060C16] text-slate-100 overflow-y-auto flex items-center justify-center p-6">
      {/* Subtle Cartographic Backdrop */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
        <svg
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          className="w-full h-full object-cover opacity-25 scale-105"
          preserveAspectRatio="xMidYMid slice"
        >
          {spherePath && (
            <path
              d={spherePath}
              fill="#0A1729"
              stroke="rgba(224, 184, 76, 0.2)"
              strokeWidth="1"
            />
          )}
          {graticulePath && (
            <path
              d={graticulePath}
              fill="none"
              stroke="rgba(148, 163, 184, 0.12)"
              strokeWidth="0.5"
            />
          )}
          {features.map((feat, idx) => (
            <path
              key={`${feat.countryId}-${idx}`}
              d={feat.svgPath}
              fill="#172840"
              stroke="#070E1A"
              strokeWidth="0.45"
            />
          ))}
        </svg>
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at 50% 45%, rgba(7, 13, 24, 0.38) 0%, rgba(6, 12, 22, 0.92) 72%, rgba(5, 9, 17, 0.98) 100%)',
          }}
        />
      </div>

      {/* Mandatory Two-Choice Panel */}
      <div className="relative z-10 w-full max-w-4xl space-y-8 py-4">
        <div className="text-center space-y-2.5 max-w-2xl mx-auto">
          <p className="text-xs font-medium tracking-wide text-amber-400">
            Mon histoire · Nouvelle partie
          </p>
          <h1 className="text-3xl sm:text-4xl font-display font-semibold tracking-tight text-white">
            Comment souhaitez-vous commencer ?
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Choisissez l’un des deux modes ci-dessous pour débuter votre campagne géopolitique
            à partir de novembre 2026.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
          {/* Option 1: Existing Country */}
          <button
            type="button"
            onClick={onSelectExistingMode}
            className="group text-left p-6 bg-[#0D1728]/95 hover:bg-[#122038] border border-white/12 hover:border-amber-400/50 rounded-xl transition-all flex flex-col justify-between gap-6 cursor-pointer shadow-xl"
          >
            <div className="space-y-4">
              <div className="w-11 h-11 rounded-lg bg-[#15243D] border border-white/10 flex items-center justify-center text-amber-400">
                <Globe2 className="w-5 h-5" />
              </div>

              <div className="space-y-2">
                <div className="text-xs font-mono-tabular text-slate-400">
                  Option 1 · {countriesCount} nations disponibles
                </div>
                <h2 className="text-xl font-display font-semibold text-white group-hover:text-amber-200 transition-colors">
                  1. Choisir un pays existant
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Parcourez tous les pays du monde classés par ordre alphabétique de A à Z,
                  inspectez leurs statistiques sur la carte et prenez les commandes de l’État de votre choix.
                </p>
              </div>

              <ul className="space-y-1.5 text-xs text-slate-400 pt-1">
                <li>· Liste complète triée de A à Z et menu déroulant</li>
                <li>· Frontières, alliances et économies réelles dès 2026</li>
                <li>· Clic direct sur la carte mondiale haute précision</li>
              </ul>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-sm font-semibold text-amber-400 group-hover:text-amber-300">
              <span>Explorer les pays (A → Z)</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </div>
          </button>

          {/* Option 2: Create Custom Country */}
          <button
            type="button"
            onClick={onSelectCustomMode}
            className="group text-left p-6 bg-[#0D1728]/95 hover:bg-[#122038] border border-white/12 hover:border-sky-400/50 rounded-xl transition-all flex flex-col justify-between gap-6 cursor-pointer shadow-xl"
          >
            <div className="space-y-4">
              <div className="w-11 h-11 rounded-lg bg-[#15243D] border border-white/10 flex items-center justify-center text-sky-400">
                <Flag className="w-5 h-5" />
              </div>

              <div className="space-y-2">
                <div className="text-xs font-mono-tabular text-slate-400">
                  Option 2 · Éditeur de nation sur mesure
                </div>
                <h2 className="text-xl font-display font-semibold text-white group-hover:text-sky-200 transition-colors">
                  2. Créer mon propre pays
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Fondez votre propre État : inventez son nom, dessinez son drapeau et ses images,
                  placez son territoire sur la carte et réglez son économie et son armée.
                </p>
              </div>

              <ul className="space-y-1.5 text-xs text-slate-400 pt-1">
                <li>· Drapeau personnalisable, emblèmes, couleurs et images</li>
                <li>· Sélection libre du territoire et de la capitale sur la carte</li>
                <li>· Dirigeant, régime politique, économie et armée sur mesure</li>
              </ul>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-sm font-semibold text-sky-400 group-hover:text-sky-300">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span>Créer ma nation</span>
              </span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
