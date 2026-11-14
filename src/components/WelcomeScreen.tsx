import React from 'react';
import { ArrowRight, Compass, Globe2, Handshake, Play, Swords } from 'lucide-react';
import { MAP_HEIGHT, MAP_WIDTH, MapFeature } from '../engine/worldInit';

interface WelcomeScreenProps {
  features: MapFeature[];
  spherePath: string;
  graticulePath: string;
  countriesCount: number;
  savedCampaign?: {
    countryName: string;
    dateLabel: string;
    color: string;
  } | null;
  onStartNewSelection: () => void;
  onResumeSaved?: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  features,
  spherePath,
  graticulePath,
  countriesCount,
  savedCampaign,
  onStartNewSelection,
  onResumeSaved,
}) => {
  return (
    <div className="relative h-screen w-screen bg-[#060C16] text-slate-100 overflow-hidden flex flex-col justify-between">
      {/* Cartographic Illuminated Backdrop */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <svg
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          className="w-full h-full object-cover opacity-35 scale-105"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <radialGradient id="welcome-ocean" cx="50%" cy="48%" r="60%">
              <stop offset="0%" stopColor="#132946" />
              <stop offset="65%" stopColor="#091526" />
              <stop offset="100%" stopColor="#050A13" />
            </radialGradient>
          </defs>
          {spherePath && (
            <path
              d={spherePath}
              fill="url(#welcome-ocean)"
              stroke="rgba(224, 184, 76, 0.25)"
              strokeWidth="1.2"
            />
          )}
          {graticulePath && (
            <path
              d={graticulePath}
              fill="none"
              stroke="rgba(148, 163, 184, 0.14)"
              strokeWidth="0.6"
            />
          )}
          {features.map((feat) => (
            <path
              key={feat.countryId}
              d={feat.svgPath}
              fill="#192B44"
              fillOpacity={0.78}
              stroke="#070E1A"
              strokeWidth="0.45"
            />
          ))}
        </svg>

        {/* Atmospheric Radial Vignette */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at 50% 45%, rgba(7, 13, 24, 0.32) 0%, rgba(6, 12, 22, 0.88) 70%, rgba(5, 9, 17, 0.98) 100%)',
          }}
        />
      </div>

      {/* Top Subtle Header Bar */}
      <header className="relative z-10 px-6 sm:px-10 pt-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Compass className="w-5 h-5 text-amber-400" />
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300/90">
            Mon histoire · Atlas Géopolitique
          </span>
        </div>
        <span className="text-xs font-mono-tabular text-slate-400">
          {countriesCount} territoires &amp; États · Départ Novembre 2026
        </span>
      </header>

      {/* Center Hero Content */}
      <main className="relative z-10 max-w-4xl mx-auto px-6 text-center space-y-8 my-auto py-8">
        <div className="space-y-4">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-display font-semibold tracking-tight text-white drop-shadow-lg">
            Orbis Diplomatica
          </h1>
          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Choisissez un pays existant ou fondez votre propre nation sur une carte mondiale détaillée.
            Négociez avec des dirigeants autonomes, forgez des alliances, menez des guerres
            et façonnez l’équilibre du monde.
          </p>
        </div>

        {/* Primary Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
          <button
            type="button"
            onClick={onStartNewSelection}
            className="w-full sm:w-auto px-8 py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-base rounded-lg shadow-[0_0_32px_rgba(245,158,11,0.28)] flex items-center justify-center gap-2.5 transition-all cursor-pointer"
          >
            <span>Commencer</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {savedCampaign && onResumeSaved && (
            <button
              type="button"
              onClick={onResumeSaved}
              className="w-full sm:w-auto px-6 py-3.5 bg-[#111C2F]/90 hover:bg-[#192944] border border-white/15 text-slate-100 font-medium text-sm rounded-lg flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 text-amber-400" />
              <span>
                Reprendre ({savedCampaign.countryName} · {savedCampaign.dateLabel})
              </span>
            </button>
          )}
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-6 text-left">
          <div className="p-4 bg-[#0D1626]/85 border border-white/10 rounded-lg backdrop-blur-xs space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
              <Globe2 className="w-4 h-4" />
              <span>Monde autonome</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tous les pays agissent librement chaque mois : commerce, élections, crises et réactions diplomatiques.
            </p>
          </div>

          <div className="p-4 bg-[#0D1626]/85 border border-white/10 rounded-lg backdrop-blur-xs space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-sky-300">
              <Handshake className="w-4 h-4" />
              <span>Haute diplomatie</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Correspondez avec les dirigeants, créez des unions économiques, pactes de défense et accords commerciaux.
            </p>
          </div>

          <div className="p-4 bg-[#0D1626]/85 border border-white/10 rounded-lg backdrop-blur-xs space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-rose-300">
              <Swords className="w-4 h-4" />
              <span>Guerres &amp; Conquêtes</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Offensives stratégiques, capitulations, traités de paix et simulation pluriannuelle jusqu’à la date choisie.
            </p>
          </div>
        </div>
      </main>

      {/* Bottom Footer */}
      <footer className="relative z-10 px-6 sm:px-10 pb-5 flex items-center justify-between text-[11px] text-slate-500">
        <span>Simulation géopolitique temps réel &amp; tour par tour</span>
        <span>Carte mondiale haute précision</span>
      </footer>
    </div>
  );
};
