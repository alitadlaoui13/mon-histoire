import React, { useMemo, useRef, useState } from 'react';
import { Crosshair, Minus, Plus, Search } from 'lucide-react';
import { MAP_HEIGHT, MAP_WIDTH, MapFeature } from '../engine/worldInit';
import { getRelation, getRelationStatusFr, isAtWarBetween } from '../engine/simulationEngine';
import { CountryState, MapMode, WorldState } from '../types/game';

interface WorldMapProps {
  features: MapFeature[];
  spherePath?: string;
  graticulePath?: string;
  world: WorldState;
  mapMode: MapMode;
  onSelectCountry: (
    countryId: string,
    territoryId?: string,
    svgCoords?: [number, number]
  ) => void;
  focusTarget?: [number, number] | null;
  brushMode?: 'add' | 'remove' | null;
  onBrushTerritory?: (territoryId: string) => void;
  customPreview?: {
    territoryIds: string[];
    nameFr: string;
    color: string;
    capital: string;
    capitalCoords?: [number, number];
  } | null;
}

function getEconomyColor(gdp: number): string {
  if (gdp >= 5000) return '#D9A738';
  if (gdp >= 1500) return '#94A348';
  if (gdp >= 450) return '#3A827A';
  if (gdp >= 120) return '#2B5B78';
  return '#1E324B';
}

function getMilitaryColor(army: number): string {
  if (army >= 800) return '#B93838';
  if (army >= 300) return '#C46833';
  if (army >= 120) return '#B08D3B';
  if (army >= 40) return '#4D6B80';
  return '#223347';
}

function getRelationColor(score: number, isAtWar: boolean): string {
  if (isAtWar) return '#BE2E3E';
  if (score >= 60) return '#248A5E';
  if (score >= 25) return '#397A94';
  if (score >= -15) return '#324256';
  if (score >= -50) return '#A66D32';
  return '#993842';
}

export const WorldMap: React.FC<WorldMapProps> = React.memo(({
  features,
  spherePath,
  graticulePath,
  world,
  mapMode,
  onSelectCountry,
  focusTarget,
  brushMode = null,
  onBrushTerritory,
  customPreview,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [isBrushing, setIsBrushing] = useState(false);
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartRef = useRef<{ dist: number; scale: number; midX: number; midY: number } | null>(
    null
  );
  const lastBrushedIdRef = useRef<string | null>(null);
  const dragStartRef = useRef<{
    x: number;
    y: number;
    tx: number;
    ty: number;
    moved: boolean;
  }>({
    x: 0,
    y: 0,
    tx: 0,
    ty: 0,
    moved: false,
  });

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  // Recenter smoothly when focusTarget changes
  React.useEffect(() => {
    if (!focusTarget) return;
    const targetScale = 2.4;
    const cx = focusTarget[0];
    const cy = focusTarget[1];
    setTransform({
      scale: targetScale,
      x: MAP_WIDTH / 2 - cx * targetScale,
      y: MAP_HEIGHT / 2 - cy * targetScale,
    });
  }, [focusTarget]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return Object.values(world.countries)
      .filter((c) => c.nameFr.toLowerCase().includes(q) || c.capital.toLowerCase().includes(q))
      .sort((a, b) => a.nameFr.localeCompare(b.nameFr, 'fr', { sensitivity: 'base' }))
      .slice(0, 10);
  }, [searchQuery, world.countries]);

  const clampTransform = (x: number, y: number, scale: number) => {
    const clampedScale = Math.max(1, Math.min(12, scale));
    const maxOffsetX = (MAP_WIDTH * (clampedScale - 1)) / 2 + 240;
    const maxOffsetY = (MAP_HEIGHT * (clampedScale - 1)) / 2 + 150;
    const minX = MAP_WIDTH - MAP_WIDTH * clampedScale - 180;
    const minY = MAP_HEIGHT - MAP_HEIGHT * clampedScale - 110;
    return {
      scale: clampedScale,
      x: Math.max(minX, Math.min(maxOffsetX, x)),
      y: Math.max(minY, Math.min(maxOffsetY, y)),
    };
  };

  const clientToSvgCoords = (clientX: number, clientY: number): [number, number] | undefined => {
    if (!svgRef.current) return undefined;
    const rect = svgRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return undefined;
    const viewBoxX = ((clientX - rect.left) / rect.width) * MAP_WIDTH;
    const viewBoxY = ((clientY - rect.top) / rect.height) * MAP_HEIGHT;
    const mapX = (viewBoxX - transform.x) / transform.scale;
    const mapY = (viewBoxY - transform.y) / transform.scale;
    return [Number(mapX.toFixed(2)), Number(mapY.toFixed(2))];
  };

  const detectTerritoryUnderPointer = (clientX: number, clientY: number): string | null => {
    const el = document.elementFromPoint(clientX, clientY);
    if (!el) return null;
    const tid = el.getAttribute('data-territory-id');
    return tid || null;
  };

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * MAP_WIDTH;
    const mouseY = ((e.clientY - rect.top) / rect.height) * MAP_HEIGHT;

    const factor = e.deltaY < 0 ? 1.22 : 0.82;
    setTransform((prev) => {
      const nextScale = Math.max(1, Math.min(12, prev.scale * factor));
      const ratio = nextScale / prev.scale;
      const nextX = mouseX - (mouseX - prev.x) * ratio;
      const nextY = mouseY - (mouseY - prev.y) * ratio;
      return clampTransform(nextX, nextY, nextScale);
    });
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Pinch-to-zoom with 2 fingers on touch devices
    if (activePointersRef.current.size === 2 && svgRef.current) {
      const pts = Array.from(activePointersRef.current.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const rect = svgRef.current.getBoundingClientRect();
      const midX = (((pts[0].x + pts[1].x) / 2 - rect.left) / rect.width) * MAP_WIDTH;
      const midY = (((pts[0].y + pts[1].y) / 2 - rect.top) / rect.height) * MAP_HEIGHT;
      pinchStartRef.current = { dist, scale: transform.scale, midX, midY };
      setIsDragging(false);
      setIsBrushing(false);
      return;
    }

    // Brush-paint borders mode (single mouse button or finger)
    if (brushMode && onBrushTerritory) {
      setIsBrushing(true);
      dragStartRef.current.moved = true;
      lastBrushedIdRef.current = null;
      const tid = detectTerritoryUnderPointer(e.clientX, e.clientY);
      if (tid) {
        lastBrushedIdRef.current = tid;
        onBrushTerritory(tid);
      }
      return;
    }

    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      tx: transform.x,
      ty: transform.y,
      moved: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      setCursorPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }

    if (activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // Two-finger pinch zoom
    if (activePointersRef.current.size === 2 && pinchStartRef.current) {
      const pts = Array.from(activePointersRef.current.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      if (pinchStartRef.current.dist > 10) {
        const nextScale = Math.max(
          1,
          Math.min(12, pinchStartRef.current.scale * (dist / pinchStartRef.current.dist))
        );
        const { midX, midY } = pinchStartRef.current;
        setTransform((prev) => {
          const ratio = nextScale / prev.scale;
          return clampTransform(midX - (midX - prev.x) * ratio, midY - (midY - prev.y) * ratio, nextScale);
        });
      }
      return;
    }

    // Touch / mouse continuous border brush
    if (isBrushing && brushMode && onBrushTerritory) {
      const tid = detectTerritoryUnderPointer(e.clientX, e.clientY);
      if (tid && tid !== lastBrushedIdRef.current) {
        lastBrushedIdRef.current = tid;
        onBrushTerritory(tid);
      }
      return;
    }

    if (!isDragging || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragStartRef.current.x) / rect.width) * MAP_WIDTH;
    const dy = ((e.clientY - dragStartRef.current.y) / rect.height) * MAP_HEIGHT;
    if (
      Math.abs(e.clientX - dragStartRef.current.x) > 7 ||
      Math.abs(e.clientY - dragStartRef.current.y) > 7
    ) {
      dragStartRef.current.moved = true;
    }
    setTransform((prev) =>
      clampTransform(dragStartRef.current.tx + dx, dragStartRef.current.ty + dy, prev.scale)
    );
  };

  const handlePointerUpOrCancel = (e: React.PointerEvent<SVGSVGElement>) => {
    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size < 2) {
      pinchStartRef.current = null;
    }
    setIsDragging(false);
    setIsBrushing(false);
    lastBrushedIdRef.current = null;
  };

  const zoomBy = (factor: number) => {
    setTransform((prev) => {
      const nextScale = Math.max(1, Math.min(12, prev.scale * factor));
      const ratio = nextScale / prev.scale;
      const cx = MAP_WIDTH / 2;
      const cy = MAP_HEIGHT / 2;
      return clampTransform(cx - (cx - prev.x) * ratio, cy - (cy - prev.y) * ratio, nextScale);
    });
  };

  const resetZoom = () => {
    setTransform({ x: 0, y: 0, scale: 1 });
  };

  const referenceCountryId = world.playerCountryId || world.selectedCountryId || '250';

  const getFillColor = (country: CountryState): string => {
    const sovereign = world.countries[country.ownerId] || country;
    if (mapMode === 'politique') {
      return sovereign.color;
    }
    if (mapMode === 'economie') {
      return getEconomyColor(sovereign.gdp);
    }
    if (mapMode === 'militaire') {
      return getMilitaryColor(sovereign.army);
    }
    if (mapMode === 'relations') {
      if (sovereign.id === referenceCountryId) return '#D4A93B';
      const rel = getRelation(world, referenceCountryId, sovereign.id);
      const war = Boolean(isAtWarBetween(world, referenceCountryId, sovereign.id));
      return getRelationColor(rel, war);
    }
    if (mapMode === 'alliances') {
      const milAl = world.alliances.find(
        (a) => a.type === 'ALLIANCE' && a.memberIds.includes(sovereign.id)
      );
      if (milAl) return milAl.color;
      const ecoAl = world.alliances.find(
        (a) => a.type === 'ECONOMIC_UNION' && a.memberIds.includes(sovereign.id)
      );
      if (ecoAl) return ecoAl.color;
      return '#263447';
    }
    return sovereign.color;
  };

  const hoveredCountry = hoveredId ? world.countries[hoveredId] : null;
  const hoveredSovereign = hoveredCountry
    ? world.countries[hoveredCountry.ownerId] || hoveredCountry
    : null;

  return (
    <div className="relative w-full h-full bg-[#070D17] overflow-hidden select-none">
      {/* Subtle Cartographic Latitude/Longitude Grid Backdrop */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 45%, rgba(56, 102, 160, 0.16), transparent 70%)',
        }}
      />

      {/* Quick Country Search Bar */}
      <div className="absolute top-3 left-3 z-20 w-52 sm:w-64">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-amber-300/80 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setTimeout(() => setSearchOpen(false), 180)}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearchOpen(true);
            }}
            placeholder="Localiser un État..."
            className="w-full min-h-[38px] pl-8 pr-3 py-1.5 text-xs bg-[#081327]/92 backdrop-blur-md border border-white/15 rounded-lg text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-amber-400 shadow-lg"
          />
        </div>
        {searchOpen && searchResults.length > 0 && (
          <div className="mt-1.5 bg-[#09152C]/95 backdrop-blur-md border border-white/15 rounded-lg shadow-2xl overflow-hidden divide-y divide-white/5">
            {searchResults.map((c) => (
              <button
                key={c.id}
                type="button"
                onMouseDown={() => {
                  const sovereignId = c.ownerId || c.id;
                  onSelectCountry(sovereignId, c.id);
                  setTransform({
                    scale: 2.5,
                    x: MAP_WIDTH / 2 - c.centroid[0] * 2.5,
                    y: MAP_HEIGHT / 2 - c.centroid[1] * 2.5,
                  });
                  setSearchQuery('');
                  setSearchOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-amber-400/10 transition-colors cursor-pointer"
              >
                <span className="font-medium text-slate-100 truncate">{c.nameFr}</span>
                <span className="text-[11px] text-amber-300 font-mono-tabular shrink-0 ml-2">
                  {Math.round(c.gdp)} Mds $
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Zoom Controls */}
      <div className="absolute right-3 bottom-3 z-20 flex flex-col gap-1 bg-[#081327]/92 backdrop-blur-md border border-white/15 rounded-lg p-1 shadow-xl">
        <button
          type="button"
          onClick={() => zoomBy(1.35)}
          title="Zoomer"
          className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-amber-400/15 text-amber-100 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => zoomBy(0.75)}
          title="Dézoomer"
          className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-amber-400/15 text-amber-100 transition-colors cursor-pointer"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={resetZoom}
          title="Vue globale"
          className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-amber-400/15 text-amber-300 transition-colors cursor-pointer"
        >
          <Crosshair className="w-4 h-4" />
        </button>
      </div>

      {/* Map Legend */}
      {mapMode !== 'politique' && (
        <div className="absolute top-3 left-60 sm:left-72 z-20 hidden xl:flex items-center gap-3 px-3 py-1.5 bg-[#081327]/92 backdrop-blur-md border border-white/15 rounded-lg text-[11px] text-slate-200">
          {mapMode === 'relations' && (
            <>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#248A5E]" /> Allié
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#324256]" /> Neutre
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#A66D32]" /> Tendu
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#BE2E3E]" /> Guerre / Hostile
              </span>
            </>
          )}
          {mapMode === 'economie' && (
            <>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#D9A738]" /> &gt; 5 000 Mds $
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#3A827A]" /> 450–1 500
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#1E324B]" /> &lt; 120
              </span>
            </>
          )}
          {mapMode === 'militaire' && (
            <>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#B93838]" /> &gt; 800k soldats
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#B08D3B]" /> 120k–300k
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#223347]" /> &lt; 40k
              </span>
            </>
          )}
          {mapMode === 'alliances' && (
            <>
              <span>Couleurs par coalition ou union économique · Gris : Non-aligné</span>
            </>
          )}
        </div>
      )}

      {/* Main SVG Cartographic Viewport */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        style={{ touchAction: 'none' }}
        className={`w-full h-full ${
          brushMode
            ? 'cursor-crosshair'
            : isDragging
              ? 'cursor-grabbing'
              : 'cursor-grab'
        }`}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUpOrCancel}
        onPointerCancel={handlePointerUpOrCancel}
        onPointerLeave={() => {
          setIsDragging(false);
          setIsBrushing(false);
          setHoveredId(null);
        }}
      >
        <defs>
          <radialGradient id="atlas-ocean" cx="50%" cy="46%" r="62%">
            <stop offset="0%" stopColor="#102952" />
            <stop offset="62%" stopColor="#081732" />
            <stop offset="100%" stopColor="#040B1A" />
          </radialGradient>
        </defs>
        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
          {/* Celestial Midnight & Gold Atlas Ocean Sphere + Graticule */}
          <rect x={-500} y={-500} width={MAP_WIDTH + 1000} height={MAP_HEIGHT + 1000} fill="#030712" />
          {spherePath ? (
            <path
              d={spherePath}
              fill="url(#atlas-ocean)"
              stroke="rgba(232, 190, 92, 0.35)"
              strokeWidth={1.25 / Math.sqrt(transform.scale)}
            />
          ) : (
            <rect x={0} y={0} width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#atlas-ocean)" />
          )}
          {graticulePath && (
            <path
              d={graticulePath}
              fill="none"
              stroke="rgba(232, 190, 92, 0.13)"
              strokeWidth={0.45 / Math.sqrt(transform.scale)}
              className="pointer-events-none"
            />
          )}

          {/* Country Polygons */}
          {features.map((feat, featIdx) => {
            const country = world.countries[feat.countryId];
            if (!country) return null;

            const isCustomPreviewed = Boolean(
              customPreview?.territoryIds.includes(country.id)
            );
            const isOccupiedProvince = country.ownerId !== country.id;
            const isPlayer =
              world.playerCountryId && country.ownerId === world.playerCountryId;
            const isSelected =
              isCustomPreviewed ||
              world.selectedCountryId === country.id ||
              world.selectedCountryId === country.ownerId;
            const isTerritorySelected =
              isCustomPreviewed || world.selectedTerritoryId === country.id;
            const isHovered = hoveredId === country.id;

            const fill = isCustomPreviewed ? customPreview!.color : getFillColor(country);
            const strokeColor = isTerritorySelected
              ? '#FEF08A'
              : isSelected
                ? '#FDE68A'
                : isPlayer
                  ? '#E0B84C'
                  : isHovered
                    ? '#F8FAFC'
                    : isOccupiedProvince
                      ? 'rgba(255, 255, 255, 0.18)'
                      : '#050911';
            const strokeWidth =
              (isTerritorySelected
                ? 1.75
                : isSelected
                  ? 1.45
                  : isPlayer
                    ? 1.2
                    : isHovered
                      ? 1.05
                      : isOccupiedProvince
                        ? 0.35
                        : 0.78) / Math.sqrt(transform.scale);

            return (
              <path
                key={`${feat.countryId}-${featIdx}`}
                data-territory-id={country.id}
                d={feat.svgPath}
                fill={fill}
                fillOpacity={
                  isCustomPreviewed
                    ? 0.96
                    : isHovered
                      ? 0.98
                      : isSelected
                        ? 0.94
                        : isOccupiedProvince
                          ? 0.88
                          : 0.87
                }
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeLinejoin="round"
                className="transition-[fill-opacity] duration-150 cursor-pointer"
                onPointerEnter={() => setHoveredId(country.id)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!brushMode && !dragStartRef.current.moved) {
                    const coords = clientToSvgCoords(e.clientX, e.clientY);
                    onSelectCountry(country.ownerId, country.id, coords);
                  }
                }}
              />
            );
          })}

          {/* On-Map Uppercase Country Labels (update dynamically on conquest & zoom) */}
          <g className="pointer-events-none select-none">
            {features.map((feat, featIdx) => {
              const country = world.countries[feat.countryId];
              if (!country) return null;
              const sovereign = world.countries[country.ownerId] || country;
              const isCustomPreviewed = Boolean(
                customPreview?.territoryIds.includes(country.id)
              );

              const isPlayerOrSelected =
                isCustomPreviewed ||
                sovereign.id === world.playerCountryId ||
                sovereign.id === world.selectedCountryId ||
                country.id === world.selectedTerritoryId;

              const minArea =
                transform.scale >= 3.8
                  ? 0
                  : transform.scale >= 2.5
                    ? 0.9
                    : transform.scale >= 1.8
                      ? 3.2
                      : transform.scale >= 1.25
                        ? 8.5
                        : 18;

              if (!isPlayerOrSelected && feat.area < minArea) return null;

              const baseFontSize = Math.max(3.2, Math.min(7.4, 2.25 + Math.sqrt(feat.area) * 0.24));
              const fontSize = Math.max(1.5, baseFontSize / Math.pow(transform.scale, 0.74));
              const labelText = isCustomPreviewed
                ? (customPreview?.nameFr.trim() || 'NOUVEAU PAYS').toUpperCase()
                : sovereign.nameFr.toUpperCase();

              return (
                <text
                  key={`lbl-${feat.countryId}-${featIdx}`}
                  x={feat.labelPoint[0]}
                  y={feat.labelPoint[1]}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={isPlayerOrSelected ? '#FEF3C7' : '#F8FAFC'}
                  fillOpacity={country.ownerId !== country.id ? 0.92 : 0.96}
                  stroke="#04080F"
                  strokeWidth={fontSize * 0.38}
                  strokeLinejoin="round"
                  style={{
                    paintOrder: 'stroke',
                    fontSize: `${fontSize}px`,
                    fontWeight: 600,
                    letterSpacing: '0.07em',
                  }}
                >
                  {labelText}
                </text>
              );
            })}
          </g>

          {/* Capital Marker for Custom Nation Preview or Active Player Nation */}
          {(() => {
            const capitalTargetId =
              customPreview?.territoryIds[0] || world.playerCountryId;
            if (!capitalTargetId) return null;
            const capCountry = world.countries[capitalTargetId];
            if (!capCountry) return null;
            const capName = customPreview
              ? customPreview.capital.trim() || capCountry.capital
              : capCountry.capital;
            const [cx, cy] = customPreview?.capitalCoords ||
              capCountry.capitalCoords || [capCountry.centroid[0], capCountry.centroid[1] + 5.5];
            const r = 2.6 / Math.pow(transform.scale, 0.65);
            const capFont = Math.max(2.1, 4.3 / Math.pow(transform.scale, 0.72));
            return (
              <g className="pointer-events-none select-none">
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="#FDE047"
                  stroke="#04080F"
                  strokeWidth={r * 0.45}
                />
                {(customPreview || transform.scale >= 1.5) && (
                  <text
                    x={cx + r * 1.9}
                    y={cy}
                    dominantBaseline="central"
                    fill="#FDE68A"
                    stroke="#04080F"
                    strokeWidth={capFont * 0.36}
                    style={{
                      paintOrder: 'stroke',
                      fontSize: `${capFont}px`,
                      fontWeight: 600,
                    }}
                  >
                    ★ {capName}
                  </text>
                )}
              </g>
            );
          })()}

          {/* Active War Vectors */}
          {world.wars.map((war) => {
            const agg = world.countries[war.aggressorId];
            const def = world.countries[war.defenderId];
            if (!agg || !def) return null;
            return (
              <g key={war.id} className="pointer-events-none">
                <line
                  x1={agg.centroid[0]}
                  y1={agg.centroid[1]}
                  x2={def.centroid[0]}
                  y2={def.centroid[1]}
                  stroke="#EF4444"
                  strokeWidth={1.6 / Math.sqrt(transform.scale)}
                  className="war-line"
                />
                <circle
                  cx={(agg.centroid[0] + def.centroid[0]) / 2}
                  cy={(agg.centroid[1] + def.centroid[1]) / 2}
                  r={3.5 / Math.sqrt(transform.scale)}
                  fill="#EF4444"
                />
              </g>
            );
          })}

          {/* Living Player Decrees & Megaprojects on Map */}
          {(world.mapProjects ?? []).map((proj) => {
            const fromC = world.countries[proj.fromCountryId];
            if (!fromC) return null;
            const toC = proj.toCountryId ? world.countries[proj.toCountryId] : null;
            const strokeColor =
              proj.kind === 'nuclear'
                ? '#F97316'
                : proj.kind === 'war'
                  ? '#EF4444'
                  : proj.kind === 'bridge'
                    ? '#FACC15'
                    : proj.kind === 'trade'
                      ? '#2DD4BF'
                      : proj.kind === 'alliance'
                        ? '#60A5FA'
                        : '#EAB308';

            if (!toC) {
              return (
                <g key={proj.id} className="pointer-events-none">
                  <circle
                    cx={fromC.centroid[0]}
                    cy={fromC.centroid[1]}
                    r={6 / Math.sqrt(transform.scale)}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={1.2 / Math.sqrt(transform.scale)}
                    strokeOpacity={0.85}
                  />
                </g>
              );
            }

            const [x1, y1] = fromC.centroid;
            const [x2, y2] = toC.centroid;
            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2 - Math.min(36, Math.hypot(x2 - x1, y2 - y1) * 0.22);

            return (
              <g key={proj.id} className="pointer-events-none">
                <path
                  d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={(proj.kind === 'bridge' ? 2.4 : 1.5) / Math.sqrt(transform.scale)}
                  strokeDasharray={proj.kind === 'bridge' ? undefined : '4 3'}
                  strokeOpacity={0.9}
                />
                {proj.kind === 'nuclear' && (
                  <circle
                    cx={x2}
                    cy={y2}
                    r={9 / Math.sqrt(transform.scale)}
                    fill="rgba(249, 115, 22, 0.25)"
                    stroke="#FB923C"
                    strokeWidth={1.3 / Math.sqrt(transform.scale)}
                  />
                )}
                <circle
                  cx={x1}
                  cy={y1}
                  r={2.5 / Math.sqrt(transform.scale)}
                  fill={strokeColor}
                />
                <circle
                  cx={x2}
                  cy={y2}
                  r={2.8 / Math.sqrt(transform.scale)}
                  fill={strokeColor}
                />
              </g>
            );
          })}

          {/* Alliance Links for Selected Country */}
          {world.selectedCountryId &&
            world.countries[world.selectedCountryId] &&
            world.alliances
              .filter((al) => al.memberIds.includes(world.selectedCountryId!))
              .slice(0, 2)
              .map((al) => {
                const origin = world.countries[world.selectedCountryId!];
                return al.memberIds
                  .filter((mid) => mid !== world.selectedCountryId && world.countries[mid])
                  .slice(0, 12)
                  .map((mid) => {
                    const target = world.countries[mid];
                    return (
                      <line
                        key={`${al.id}-${mid}`}
                        x1={origin.centroid[0]}
                        y1={origin.centroid[1]}
                        x2={target.centroid[0]}
                        y2={target.centroid[1]}
                        stroke={al.type === 'ALLIANCE' ? '#60A5FA' : '#34D399'}
                        strokeOpacity={0.35}
                        strokeWidth={0.8 / Math.sqrt(transform.scale)}
                        className="pointer-events-none"
                      />
                    );
                  });
              })}
        </g>
      </svg>

      {/* Hover Tooltip */}
      {hoveredCountry && hoveredSovereign && (
        <div
          className="pointer-events-none absolute z-30 bg-[#0E1726]/95 border border-white/15 rounded-md px-3 py-2 shadow-xl max-w-[260px]"
          style={{
            left: Math.min(cursorPos.x + 16, window.innerWidth - 280),
            top: Math.max(12, cursorPos.y - 12),
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-white truncate">
              {hoveredCountry.nameFr}
            </span>
            <span className="text-[11px] font-mono-tabular text-amber-300 shrink-0">
              {Math.round(hoveredSovereign.gdp)} Mds $
            </span>
          </div>
          {hoveredCountry.ownerId !== hoveredCountry.id && (
            <div className="text-[11px] text-rose-300 mt-0.5">
              Territoire contrôlé par {hoveredSovereign.nameFr}
            </div>
          )}
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
            <span>{hoveredSovereign.regime}</span>
            <span>·</span>
            <span className="font-mono-tabular">{hoveredSovereign.army}k soldats</span>
            {world.playerCountryId && hoveredSovereign.id !== world.playerCountryId && (
              <>
                <span>·</span>
                <span className="text-slate-200">
                  {
                    getRelationStatusFr(
                      getRelation(world, world.playerCountryId, hoveredSovereign.id),
                      Boolean(isAtWarBetween(world, world.playerCountryId, hoveredSovereign.id))
                    ).label
                  }
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

