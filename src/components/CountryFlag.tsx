import React from 'react';
import { CountryFlagConfig, FlagEmblem, FlagPattern } from '../types/game';
import metropolisImg from '../assets/images/nation_metropolis_1794694445816.jpg';
import citadelImg from '../assets/images/nation_citadel_1794694446067.jpg';
import oasisImg from '../assets/images/nation_oasis_1794694447300.jpg';
import highlandsImg from '../assets/images/nation_highlands_1794694447701.jpg';

export const PRESET_NATION_IMAGES = [
  { id: 'metropolis', label: 'Métropole maritime', src: metropolisImg },
  { id: 'citadel', label: 'Capitale historique', src: citadelImg },
  { id: 'oasis', label: 'Cité solaire & port', src: oasisImg },
  { id: 'highlands', label: 'Fjords & montagnes', src: highlandsImg },
];

export const FLAG_PATTERNS: Array<{ id: FlagPattern; label: string }> = [
  { id: 'vertical3', label: 'Tricolore vertical' },
  { id: 'horizontal3', label: 'Tricolore horizontal' },
  { id: 'bicolorH', label: 'Bicolore horizontal' },
  { id: 'bicolorV', label: 'Bicolore vertical' },
  { id: 'nordic', label: 'Croix nordique' },
  { id: 'diagonal', label: 'Bande diagonale' },
  { id: 'canton', label: 'Canton & bandes' },
  { id: 'circle', label: 'Disque central' },
];

export const FLAG_EMBLEMS: Array<{ id: FlagEmblem; label: string }> = [
  { id: 'none', label: 'Aucun' },
  { id: 'star', label: 'Étoile' },
  { id: 'crown', label: 'Couronne' },
  { id: 'shield', label: 'Écu' },
  { id: 'sun', label: 'Soleil' },
  { id: 'crescent', label: 'Croissant' },
  { id: 'laurel', label: 'Lauriers' },
  { id: 'eagle', label: 'Aigle' },
  { id: 'globe', label: 'Globe' },
];

export function resizeImageFileToDataUrl(file: File, maxWidth = 360): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Impossible de lire ce fichier image.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Format d’image non pris en charge.'));
      img.onload = () => {
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

interface CountryFlagProps {
  flag?: CountryFlagConfig;
  fallbackColor?: string;
  name?: string;
  className?: string;
}

function renderEmblemSvg(emblem: FlagEmblem, color: string, cx: number, cy: number) {
  if (emblem === 'none') return null;

  if (emblem === 'star') {
    return (
      <polygon
        points={`${cx},${cy - 11} ${cx + 3.2},${cy - 3.5} ${cx + 11},${cy - 3.2} ${cx + 4.8},${cy + 1.8} ${cx + 7},${cy + 9.5} ${cx},${cy + 5} ${cx - 7},${cy + 9.5} ${cx - 4.8},${cy + 1.8} ${cx - 11},${cy - 3.2} ${cx - 3.2},${cy - 3.5}`}
        fill={color}
      />
    );
  }
  if (emblem === 'crown') {
    return (
      <g fill={color} transform={`translate(${cx - 12}, ${cy - 9})`}>
        <polygon points="2,15 0,4 7,9 12,1 17,9 24,4 22,15" />
        <rect x="2" y="16" width="20" height="3" rx="1" />
      </g>
    );
  }
  if (emblem === 'shield') {
    return (
      <path
        d={`M ${cx - 9} ${cy - 10} H ${cx + 9} V ${cy + 1} C ${cx + 9} ${cy + 8}, ${cx} ${cy + 12}, ${cx} ${cy + 12} C ${cx} ${cy + 12}, ${cx - 9} ${cy + 8}, ${cx - 9} ${cy + 1} Z`}
        fill={color}
      />
    );
  }
  if (emblem === 'sun') {
    return (
      <g fill={color} stroke={color} strokeWidth="1.8" strokeLinecap="round">
        <circle cx={cx} cy={cy} r="5.5" stroke="none" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          return (
            <line
              key={deg}
              x1={cx + Math.cos(rad) * 7.5}
              y1={cy + Math.sin(rad) * 7.5}
              x2={cx + Math.cos(rad) * 11.5}
              y2={cy + Math.sin(rad) * 11.5}
            />
          );
        })}
      </g>
    );
  }
  if (emblem === 'crescent') {
    return (
      <g fill={color}>
        <path
          d={`M ${cx + 3} ${cy - 10} A 10 10 0 1 0 ${cx + 3} ${cy + 10} A 7.5 7.5 0 1 1 ${cx + 3} ${cy - 10} Z`}
        />
        <polygon
          points={`${cx + 5},${cy - 4} ${cx + 6.2},${cy - 1} ${cx + 9.2},${cy - 1} ${cx + 6.8},${cy + 1} ${cx + 7.7},${cy + 4} ${cx + 5},${cy + 2.2} ${cx + 2.3},${cy + 4} ${cx + 3.2},${cy + 1} ${cx + 0.8},${cy - 1} ${cx + 3.8},${cy - 1}`}
        />
      </g>
    );
  }
  if (emblem === 'laurel') {
    return (
      <g fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round">
        <path d={`M ${cx - 2} ${cy + 10} C ${cx - 11} ${cy + 7}, ${cx - 12} ${cy - 4}, ${cx - 5} ${cy - 10}`} />
        <path d={`M ${cx + 2} ${cy + 10} C ${cx + 11} ${cy + 7}, ${cx + 12} ${cy - 4}, ${cx + 5} ${cy - 10}`} />
        <circle cx={cx} cy={cy - 1} r="3.5" fill={color} stroke="none" />
      </g>
    );
  }
  if (emblem === 'eagle') {
    return (
      <path
        d={`M ${cx} ${cy - 10} L ${cx + 3} ${cy - 6} L ${cx + 13} ${cy - 7} L ${cx + 9} ${cy - 1} L ${cx + 11} ${cy + 2} L ${cx + 4} ${cy + 1} L ${cx + 5} ${cy + 10} L ${cx} ${cy + 7} L ${cx - 5} ${cy + 10} L ${cx - 4} ${cy + 1} L ${cx - 11} ${cy + 2} L ${cx - 9} ${cy - 1} L ${cx - 13} ${cy - 7} L ${cx - 3} ${cy - 6} Z`}
        fill={color}
      />
    );
  }
  // globe
  return (
    <g fill="none" stroke={color} strokeWidth="1.6">
      <circle cx={cx} cy={cy} r="9.5" />
      <ellipse cx={cx} cy={cy} rx="4.5" ry="9.5" />
      <line x1={cx - 9.5} y1={cy} x2={cx + 9.5} y2={cy} />
    </g>
  );
}

export const CountryFlag: React.FC<CountryFlagProps> = ({
  flag,
  fallbackColor = '#3A7CA5',
  name = 'Drapeau national',
  className = 'w-8 h-5 rounded-xs border border-white/15 shrink-0',
}) => {
  if (flag?.customFlagImage) {
    return (
      <img
        src={flag.customFlagImage}
        alt={`Drapeau : ${name}`}
        referrerPolicy="no-referrer"
        className={`${className} object-cover`}
      />
    );
  }

  if (!flag) {
    return (
      <span
        className={`${className} inline-block`}
        style={{ backgroundColor: fallbackColor }}
        aria-label={name}
      />
    );
  }

  const { pattern, primaryColor, secondaryColor, accentColor, emblem } = flag;
  const emblemCenterX = pattern === 'canton' ? 18 : pattern === 'nordic' ? 32 : 45;
  const emblemCenterY = pattern === 'canton' ? 16 : 30;
  const emblemColor =
    pattern === 'circle'
      ? primaryColor
      : pattern === 'canton'
        ? secondaryColor
        : accentColor;

  return (
    <svg
      viewBox="0 0 90 60"
      className={`${className} overflow-hidden`}
      role="img"
      aria-label={`Drapeau : ${name}`}
    >
      {pattern === 'vertical3' && (
        <>
          <rect x="0" y="0" width="30" height="60" fill={primaryColor} />
          <rect x="30" y="0" width="30" height="60" fill={secondaryColor} />
          <rect x="60" y="0" width="30" height="60" fill={accentColor} />
        </>
      )}
      {pattern === 'horizontal3' && (
        <>
          <rect x="0" y="0" width="90" height="20" fill={primaryColor} />
          <rect x="0" y="20" width="90" height="20" fill={secondaryColor} />
          <rect x="0" y="40" width="90" height="20" fill={accentColor} />
        </>
      )}
      {pattern === 'bicolorH' && (
        <>
          <rect x="0" y="0" width="90" height="30" fill={primaryColor} />
          <rect x="0" y="30" width="90" height="30" fill={secondaryColor} />
        </>
      )}
      {pattern === 'bicolorV' && (
        <>
          <rect x="0" y="0" width="45" height="60" fill={primaryColor} />
          <rect x="45" y="0" width="45" height="60" fill={secondaryColor} />
        </>
      )}
      {pattern === 'nordic' && (
        <>
          <rect x="0" y="0" width="90" height="60" fill={primaryColor} />
          <rect x="24" y="0" width="16" height="60" fill={secondaryColor} />
          <rect x="0" y="22" width="90" height="16" fill={secondaryColor} />
          <rect x="27" y="0" width="10" height="60" fill={accentColor} />
          <rect x="0" y="25" width="90" height="10" fill={accentColor} />
        </>
      )}
      {pattern === 'diagonal' && (
        <>
          <rect x="0" y="0" width="90" height="60" fill={primaryColor} />
          <polygon points="0,60 90,0 90,60" fill={secondaryColor} />
          <polygon points="0,60 0,48 74,0 90,0 90,12 16,60" fill={accentColor} />
        </>
      )}
      {pattern === 'canton' && (
        <>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect
              key={i}
              x="0"
              y={i * 10}
              width="90"
              height="10"
              fill={i % 2 === 0 ? primaryColor : secondaryColor}
            />
          ))}
          <rect x="0" y="0" width="38" height="32" fill={accentColor} />
        </>
      )}
      {pattern === 'circle' && (
        <>
          <rect x="0" y="0" width="90" height="60" fill={primaryColor} />
          <circle cx="45" cy="30" r="16" fill={secondaryColor} />
        </>
      )}

      {renderEmblemSvg(emblem, emblemColor, emblemCenterX, emblemCenterY)}
    </svg>
  );
};
