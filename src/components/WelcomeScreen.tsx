import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  LogOut,
  Play,
  RotateCcw,
  Settings,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { MAP_HEIGHT, MAP_WIDTH, MapFeature } from '../engine/worldInit';
import { RotatingGlobe } from './RotatingGlobe';

export interface GameUiSettings {
  animationsEnabled: boolean;
  autoPlaySpeedMs: number;
}

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
  settings?: GameUiSettings;
  onUpdateSettings?: (next: GameUiSettings) => void;
  onClearSavedCampaign?: () => void;
  onStartNewSelection: () => void;
  onResumeSaved?: () => void;
}

const SPEED_OPTIONS = [
  { label: 'Normale', value: 2400 },
  { label: 'Rapide', value: 1200 },
  { label: 'Très rapide', value: 650 },
];

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  features,
  spherePath,
  graticulePath,
  countriesCount,
  savedCampaign,
  settings = { animationsEnabled: true, autoPlaySpeedMs: 2400 },
  onUpdateSettings,
  onClearSavedCampaign,
  onStartNewSelection,
  onResumeSaved,
}) => {
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [quitFallbackNote, setQuitFallbackNote] = useState(false);
  const [saveClearedNotice, setSaveClearedNotice] = useState(false);

  const animate = settings.animationsEnabled;

  // Deterministic subtle twinkling stars & golden dust particles
  const ambientParticles = useMemo(
    () => [
      { x: '12%', y: '18%', s: 2.5, d: 0 },
      { x: '22%', y: '34%', s: 2, d: 0.7 },
      { x: '31%', y: '12%', s: 3, d: 1.2 },
      { x: '44%', y: '8%', s: 2, d: 0.4 },
      { x: '58%', y: '10%', s: 2.5, d: 1.5 },
      { x: '71%', y: '16%', s: 3, d: 0.3 },
      { x: '84%', y: '25%', s: 2, d: 1.1 },
      { x: '91%', y: '14%', s: 2.5, d: 0.9 },
      { x: '18%', y: '56%', s: 2, d: 1.8 },
      { x: '79%', y: '51%', s: 2.5, d: 0.6 },
    ],
    []
  );

  const handleConfirmQuit = () => {
    try {
      window.close();
    } catch {
      // Browsers prevent closing tabs not opened via script
    }
    setQuitFallbackNote(true);
  };

  return (
    <div className="relative min-h-screen w-screen bg-[#040915] text-slate-100 overflow-x-hidden overflow-y-auto flex flex-col justify-between select-none">
      {/* 1. Cinematic Sky, Golden Horizon & World Map Backdrop */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Midnight-Blue to Golden-Dawn Sky Gradient */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 90% 65% at 50% 42%, rgba(28, 63, 120, 0.42) 0%, rgba(10, 24, 52, 0.88) 52%, #040915 100%), linear-gradient(180deg, #040916 0%, #091834 44%, #1A2B4C 68%, #4C3422 86%, #070C17 100%)',
          }}
        />

        {/* Warm Amber Horizon Mist */}
        <div
          className="absolute inset-x-0 bottom-0 h-[48%]"
          style={{
            background:
              'radial-gradient(ellipse 75% 55% at 50% 78%, rgba(238, 165, 68, 0.34) 0%, rgba(190, 108, 42, 0.18) 45%, rgba(6, 11, 22, 0) 78%)',
          }}
        />

        {/* Radiant Golden Light Rays Behind Globe */}
        <motion.div
          aria-hidden="true"
          animate={animate ? { rotate: [0, 360] } : undefined}
          transition={
            animate ? { duration: 140, repeat: Infinity, ease: 'linear' } : undefined
          }
          className="absolute left-1/2 top-[22%] -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] opacity-30"
          style={{
            background:
              'repeating-conic-gradient(from 0deg, rgba(250, 210, 115, 0.22) 0deg 6deg, transparent 6deg 18deg)',
            maskImage:
              'radial-gradient(circle at center, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.35) 35%, transparent 66%)',
            WebkitMaskImage:
              'radial-gradient(circle at center, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.35) 35%, transparent 66%)',
          }}
        />

        {/* Detailed Golden-Lit World Map Backdrop */}
        <svg
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          className="absolute inset-0 w-full h-full opacity-40"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="bg-map-gold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F8D886" stopOpacity="0.48" />
              <stop offset="50%" stopColor="#D39D3E" stopOpacity="0.34" />
              <stop offset="100%" stopColor="#946722" stopOpacity="0.22" />
            </linearGradient>
            <radialGradient id="bg-map-mask" cx="50%" cy="38%" r="58%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
              <stop offset="68%" stopColor="#FFFFFF" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.06" />
            </radialGradient>
            <mask id="world-backdrop-fade">
              <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#bg-map-mask)" />
            </mask>
          </defs>
          <g mask="url(#world-backdrop-fade)">
            {spherePath && (
              <path
                d={spherePath}
                fill="none"
                stroke="rgba(244, 202, 100, 0.14)"
                strokeWidth="0.8"
              />
            )}
            {graticulePath && (
              <path
                d={graticulePath}
                fill="none"
                stroke="rgba(244, 202, 100, 0.12)"
                strokeWidth="0.5"
              />
            )}
            {features.map((feat, idx) => (
              <path
                key={`${feat.countryId}-${idx}`}
                d={feat.svgPath}
                fill="url(#bg-map-gold)"
                stroke="rgba(255, 228, 158, 0.42)"
                strokeWidth="0.45"
              />
            ))}
            {/* Subtle diplomatic flight arcs across continents */}
            <path
              d="M 275 185 Q 410 105 510 165"
              fill="none"
              stroke="rgba(252, 224, 146, 0.4)"
              strokeWidth="0.9"
              strokeDasharray="3 4"
            />
            <path
              d="M 510 165 Q 665 95 795 190"
              fill="none"
              stroke="rgba(252, 224, 146, 0.35)"
              strokeWidth="0.9"
              strokeDasharray="3 4"
            />
          </g>
        </svg>

        {/* Subtle Architectural Skyline & Diplomatic Silhouettes Framing Lower Horizon */}
        <svg
          viewBox="0 0 1440 420"
          preserveAspectRatio="xMidYMax slice"
          className="absolute inset-x-0 bottom-0 w-full h-[38vh] min-h-[210px] opacity-85"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="horizon-silhouette" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#14213B" stopOpacity="0.65" />
              <stop offset="55%" stopColor="#091224" stopOpacity="0.94" />
              <stop offset="100%" stopColor="#040812" stopOpacity="1" />
            </linearGradient>
          </defs>
          {/* Distant mountain & capital dome ridge */}
          <path
            d="M0,330 L90,305 L185,320 L290,285 L370,312 L460,332 L620,348 L820,344 L970,295 L1085,260 L1185,305 L1280,290 L1360,265 L1440,295 L1440,420 L0,420 Z"
            fill="rgba(16, 26, 48, 0.72)"
          />
          {/* Left Eiffel-inspired monument silhouette */}
          <path
            d="M322,355 L334,270 L341,210 L345,155 L348,155 L352,210 L359,270 L371,355 L356,355 L351,322 C349,310 344,310 342,322 L337,355 Z"
            fill="rgba(13, 21, 39, 0.85)"
          />
          {/* Left diplomatic flags silhouette */}
          <g fill="rgba(8, 14, 28, 0.92)" stroke="rgba(224, 180, 92, 0.22)" strokeWidth="0.6">
            <rect x="44" y="210" width="3" height="210" />
            <path d="M47,214 C75,208 98,224 128,216 L124,264 C96,272 74,256 47,262 Z" />
            <rect x="148" y="248" width="2.5" height="172" />
            <path d="M150,251 C174,246 192,258 216,252 L213,290 C190,296 172,284 150,289 Z" />
            <rect x="234" y="276" width="2" height="144" />
            <path d="M236,279 C254,275 268,284 286,279 L284,308 C266,313 253,304 236,308 Z" />
          </g>
          {/* Right neoclassical colonnade + diplomatic flag */}
          <path
            d="M1195,420 L1195,282 L1235,260 L1440,260 L1440,420 Z"
            fill="url(#horizon-silhouette)"
          />
          <g fill="#0A1324">
            <rect x="1252" y="276" width="12" height="100" />
            <rect x="1282" y="276" width="12" height="100" />
            <rect x="1312" y="276" width="12" height="100" />
            <rect x="1342" y="276" width="12" height="100" />
            <rect x="1372" y="276" width="12" height="100" />
          </g>
          <rect x="1352" y="138" width="3" height="126" fill="#0B1528" />
          <path
            d="M1355,142 C1385,134 1408,148 1435,140 L1432,192 C1406,200 1384,186 1355,194 Z"
            fill="#0D2246"
            stroke="rgba(232, 190, 92, 0.45)"
            strokeWidth="1"
          />
          {/* Foreground dark terrace base */}
          <path
            d="M0,378 Q720,350 1440,372 L1440,420 L0,420 Z"
            fill="url(#horizon-silhouette)"
          />
        </svg>

        {/* Subtle Animated Golden Particles */}
        {ambientParticles.map((p, idx) => (
          <motion.span
            key={idx}
            aria-hidden="true"
            style={{ left: p.x, top: p.y, width: p.s, height: p.s }}
            animate={
              animate
                ? { opacity: [0.18, 0.75, 0.18], scale: [1, 1.35, 1] }
                : { opacity: 0.35 }
            }
            transition={
              animate
                ? {
                    duration: 3.8 + (idx % 3),
                    delay: p.d,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }
                : undefined
            }
            className="absolute rounded-full bg-amber-200/80 shadow-[0_0_8px_rgba(251,191,36,0.75)]"
          />
        ))}
      </div>

      {/* Top Subtle Header Metadata (Zero-Pill Clean Text) */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-6 pt-5 flex items-center justify-between text-xs text-amber-100/70">
        <span className="tracking-wider uppercase font-medium text-[11px] text-amber-200/80">
          Mon histoire
        </span>
        <span className="font-mono-tabular text-[11px] text-slate-300/80">
          {countriesCount} nations &amp; territoires · Ère 2026
        </span>
      </header>

      {/* 2. Centerpiece Emblem: Crown + Laurel Wreaths + Rotating Globe + Gilded Title + CTA Stack */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-6 sm:py-8">
        {/* Emblem Wrapper */}
        <motion.div
          initial={animate ? { opacity: 0, y: 16, scale: 0.96 } : false}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex flex-col items-center w-full max-w-3xl"
        >
          {/* Royal Crown + Laurel Wreaths + Rotating 3D Globe */}
          <div className="relative flex items-center justify-center">
            {/* Golden Laurel Wreaths SVG Flanking the Globe */}
            <svg
              viewBox="0 0 420 300"
              className="absolute w-[310px] sm:w-[375px] h-auto pointer-events-none drop-shadow-[0_6px_18px_rgba(0,0,0,0.65)]"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="laurel-gold" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFF0B8" />
                  <stop offset="45%" stopColor="#E7B854" />
                  <stop offset="100%" stopColor="#946218" />
                </linearGradient>
              </defs>
              {/* Royal Crown on Top */}
              <g transform="translate(210, 26)">
                <path
                  d="M-32,12 L-38,-8 L-18,2 L0,-16 L18,2 L38,-8 L32,12 Z"
                  fill="url(#laurel-gold)"
                  stroke="#5E3C09"
                  strokeWidth="1.2"
                />
                <rect
                  x="-33"
                  y="11"
                  width="66"
                  height="8"
                  rx="2.5"
                  fill="url(#laurel-gold)"
                  stroke="#5E3C09"
                  strokeWidth="1"
                />
                <circle cx="0" cy="-18" r="3" fill="#FFF3C4" />
                <circle cx="-38" cy="-10" r="2.3" fill="#FFF3C4" />
                <circle cx="38" cy="-10" r="2.3" fill="#FFF3C4" />
                <circle cx="0" cy="4" r="2.6" fill="#1D4ED8" stroke="#FFF3C4" strokeWidth="0.7" />
              </g>

              {/* Left Laurel Branch */}
              <g fill="url(#laurel-gold)" stroke="#5E3C09" strokeWidth="0.7">
                <path
                  d="M118,242 C72,202 62,130 98,74"
                  fill="none"
                  stroke="url(#laurel-gold)"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
                <ellipse cx="95" cy="82" rx="11" ry="4.8" transform="rotate(-32 95 82)" />
                <ellipse cx="83" cy="102" rx="12" ry="5" transform="rotate(-48 83 102)" />
                <ellipse cx="76" cy="124" rx="12.5" ry="5.2" transform="rotate(-62 76 124)" />
                <ellipse cx="74" cy="147" rx="13" ry="5.3" transform="rotate(-78 74 147)" />
                <ellipse cx="77" cy="171" rx="13" ry="5.2" transform="rotate(-95 77 171)" />
                <ellipse cx="86" cy="194" rx="12.5" ry="5" transform="rotate(-112 86 194)" />
                <ellipse cx="99" cy="216" rx="12" ry="4.8" transform="rotate(-130 99 216)" />
                <ellipse cx="114" cy="233" rx="11" ry="4.5" transform="rotate(-145 114 233)" />
              </g>

              {/* Right Laurel Branch */}
              <g fill="url(#laurel-gold)" stroke="#5E3C09" strokeWidth="0.7">
                <path
                  d="M302,242 C348,202 358,130 322,74"
                  fill="none"
                  stroke="url(#laurel-gold)"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
                <ellipse cx="325" cy="82" rx="11" ry="4.8" transform="rotate(32 325 82)" />
                <ellipse cx="337" cy="102" rx="12" ry="5" transform="rotate(48 337 102)" />
                <ellipse cx="344" cy="124" rx="12.5" ry="5.2" transform="rotate(62 344 124)" />
                <ellipse cx="346" cy="147" rx="13" ry="5.3" transform="rotate(78 346 147)" />
                <ellipse cx="343" cy="171" rx="13" ry="5.2" transform="rotate(95 343 171)" />
                <ellipse cx="334" cy="194" rx="12.5" ry="5" transform="rotate(112 334 194)" />
                <ellipse cx="321" cy="216" rx="12" ry="4.8" transform="rotate(130 321 216)" />
                <ellipse cx="306" cy="233" rx="11" ry="4.5" transform="rotate(145 306 233)" />
              </g>
            </svg>

            {/* Rotating 3D Terrestrial Globe */}
            <div className="pt-8 pb-4 relative">
              <div className="hidden sm:block">
                <RotatingGlobe size={240} animate={animate} />
              </div>
              <div className="sm:hidden">
                <RotatingGlobe size={196} animate={animate} />
              </div>
            </div>
          </div>

          {/* Grand Metallic Gold Title Overlapping Lower Globe */}
          <div className="-mt-28 sm:-mt-32 text-center relative z-10 w-full">
            <h1
              className="font-display font-bold tracking-tight leading-[0.94] select-none drop-shadow-[0_6px_18px_rgba(3,7,18,0.92)]"
              style={{
                fontSize: 'clamp(2.75rem, 7vw, 5.25rem)',
                backgroundImage:
                  'linear-gradient(180deg, #FFF7DA 0%, #F7D47A 34%, #D99B36 68%, #986317 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                WebkitTextStroke: '1px rgba(42, 24, 5, 0.55)',
              }}
            >
              <span className="block">Orbis</span>
              <span className="block">Diplomatica</span>
            </h1>

            {/* Gilded Compass Divider */}
            <div className="mt-3 sm:mt-4 flex items-center justify-center gap-3 max-w-md mx-auto px-4">
              <div className="h-[1.5px] flex-1 bg-gradient-to-r from-transparent via-amber-300/80 to-amber-200" />
              <svg
                viewBox="0 0 36 36"
                className="w-7 h-7 shrink-0 drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]"
                aria-hidden="true"
              >
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="#0A1730"
                  stroke="#E8BE5C"
                  strokeWidth="1.4"
                />
                <polygon points="18,4 21,15 32,18 21,21 18,32 15,21 4,18 15,15" fill="#F4CA64" />
                <circle cx="18" cy="18" r="2.4" fill="#FFF7DA" />
              </svg>
              <div className="h-[1.5px] flex-1 bg-gradient-to-l from-transparent via-amber-300/80 to-amber-200" />
            </div>

            {/* Tagline */}
            <p className="mt-2.5 text-sm sm:text-lg font-display italic tracking-wide text-amber-100/95 drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
              — Construis. Négocie. Conquiers. —
            </p>
          </div>
        </motion.div>

        {/* 3. Action Buttons Stack */}
        <motion.div
          initial={animate ? { opacity: 0, y: 14 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 sm:mt-7 flex flex-col items-center gap-3 w-full max-w-sm relative z-10"
        >
          {/* Primary Button: Commencer */}
          <motion.button
            type="button"
            onClick={onStartNewSelection}
            whileHover={animate ? { scale: 1.025 } : undefined}
            whileTap={animate ? { scale: 0.985 } : undefined}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="group relative w-full max-w-[340px] py-3.5 px-7 rounded-full border-2 border-amber-300/85 text-white font-display font-semibold text-xl tracking-wide shadow-[0_10px_32px_rgba(2,8,23,0.85),0_0_24px_rgba(245,180,66,0.28)] overflow-hidden cursor-pointer flex items-center justify-center gap-3.5 focus-visible:outline-2 focus-visible:outline-amber-300"
            style={{
              background:
                'linear-gradient(180deg, #163973 0%, #0B2149 52%, #071532 100%)',
            }}
          >
            {/* Inner Gold Rim */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-[3px] rounded-full border border-amber-200/35"
            />
            {/* Hover Sheen */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-amber-200/20 to-transparent"
            />
            <Play className="w-5 h-5 fill-amber-300 text-amber-300 shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]" />
            <span className="relative whitespace-nowrap">Commencer</span>
          </motion.button>

          {/* Optional Resume Saved Campaign Button (Preserves Existing Save Feature) */}
          {savedCampaign && onResumeSaved && (
            <button
              type="button"
              onClick={onResumeSaved}
              className="w-full max-w-[270px] py-2 px-5 rounded-full border border-amber-400/50 bg-[#0A1832]/90 hover:bg-[#12284E] text-amber-100 text-xs sm:text-sm font-medium shadow-md flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span className="truncate">
                Reprendre ({savedCampaign.countryName} · {savedCampaign.dateLabel})
              </span>
            </button>
          )}

          {/* Secondary Stack: Paramètres & Quitter */}
          <div className="mt-1 flex flex-col items-center gap-2.5 w-full max-w-[220px]">
            <motion.button
              type="button"
              onClick={() => {
                setSaveClearedNotice(false);
                setShowSettingsModal(true);
              }}
              whileHover={animate ? { scale: 1.02 } : undefined}
              whileTap={animate ? { scale: 0.98 } : undefined}
              transition={{ duration: 0.14 }}
              className="w-full py-2.5 px-5 rounded-full border border-amber-300/65 hover:border-amber-200 text-slate-100 text-sm font-medium shadow-[0_6px_18px_rgba(2,8,23,0.75)] flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
              style={{
                background: 'linear-gradient(180deg, #132544 0%, #091429 100%)',
              }}
            >
              <Settings className="w-4 h-4 text-amber-300 shrink-0" />
              <span>Paramètres</span>
            </motion.button>

            <motion.button
              type="button"
              onClick={() => {
                setQuitFallbackNote(false);
                setShowQuitModal(true);
              }}
              whileHover={animate ? { scale: 1.02 } : undefined}
              whileTap={animate ? { scale: 0.98 } : undefined}
              transition={{ duration: 0.14 }}
              className="w-full py-2.5 px-5 rounded-full border border-amber-300/65 hover:border-amber-200 text-slate-100 text-sm font-medium shadow-[0_6px_18px_rgba(2,8,23,0.75)] flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
              style={{
                background: 'linear-gradient(180deg, #132544 0%, #091429 100%)',
              }}
            >
              <LogOut className="w-4 h-4 text-amber-300 shrink-0" />
              <span>Quitter</span>
            </motion.button>
          </div>
        </motion.div>
      </main>

      {/* Quiet Footer */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-6 pb-4 flex items-center justify-between text-[11px] text-slate-400/80">
        <span>Simulation géopolitique mondiale</span>
        <span>Sauvegarde automatique locale</span>
      </footer>

      {/* 4. Working Paramètres Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0A1426] border border-amber-400/40 rounded-xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-amber-300" />
                <h2 className="text-base font-display font-semibold text-amber-100">
                  Paramètres du jeu
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Fermer les paramètres"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5 text-sm">
              {/* Animations Toggle */}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium text-slate-100 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Animations &amp; rotation du globe</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Désactiver pour économiser la batterie sur tablette ou téléphone.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings?.({
                      ...settings,
                      animationsEnabled: !settings.animationsEnabled,
                    })
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer shrink-0 ${
                    settings.animationsEnabled
                      ? 'bg-amber-500/20 border-amber-400/60 text-amber-200'
                      : 'bg-slate-800 border-white/10 text-slate-300'
                  }`}
                >
                  {settings.animationsEnabled ? 'Activées' : 'Réduites'}
                </button>
              </div>

              {/* Auto Simulation Speed */}
              <div className="space-y-2">
                <div className="font-medium text-slate-100">
                  Vitesse du mode lecture automatique
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {SPEED_OPTIONS.map((opt) => {
                    const active = settings.autoPlaySpeedMs === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          onUpdateSettings?.({
                            ...settings,
                            autoPlaySpeedMs: opt.value,
                          })
                        }
                        className={`py-2 px-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                          active
                            ? 'bg-amber-500 text-slate-950 border-amber-400 font-semibold'
                            : 'bg-[#101E36] text-slate-200 border-white/10 hover:border-amber-400/40'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Local Save Inspection / Reset */}
              <div className="pt-3 border-t border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-100">Sauvegarde locale</span>
                  <span className="text-xs text-slate-400">
                    {savedCampaign
                      ? `${savedCampaign.countryName} · ${savedCampaign.dateLabel}`
                      : 'Aucune partie en cours'}
                  </span>
                </div>
                {savedCampaign && onClearSavedCampaign && (
                  <button
                    type="button"
                    onClick={() => {
                      onClearSavedCampaign();
                      setSaveClearedNotice(true);
                    }}
                    className="w-full py-2 px-3 rounded-lg bg-rose-950/60 hover:bg-rose-900/70 border border-rose-500/35 text-rose-200 text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Effacer la sauvegarde enregistrée</span>
                  </button>
                )}
                {saveClearedNotice && (
                  <p className="text-xs text-emerald-300">
                    Sauvegarde locale effacée avec succès.
                  </p>
                )}
              </div>
            </div>

            <div className="px-5 py-3.5 bg-[#070F1E] border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-colors cursor-pointer"
              >
                Enregistrer et fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Working Quitter Modal */}
      {showQuitModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#0A1426] border border-amber-400/40 rounded-xl shadow-2xl p-6 space-y-4 text-center">
            <h2 className="text-lg font-display font-semibold text-amber-100">
              Quitter Orbis Diplomatica
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {quitFallbackNote
                ? 'Votre progression reste sauvegardée automatiquement. Vous pouvez maintenant fermer cet onglet en toute sécurité.'
                : 'Souhaitez-vous fermer la session de jeu ? Votre progression locale reste sauvegardée.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowQuitModal(false)}
                className="flex-1 py-2.5 px-4 rounded-lg bg-[#132544] hover:bg-[#1B335D] border border-white/15 text-slate-100 text-xs font-medium transition-colors cursor-pointer"
              >
                Revenir au menu
              </button>
              {!quitFallbackNote && (
                <button
                  type="button"
                  onClick={handleConfirmQuit}
                  className="flex-1 py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Fermer la session
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
