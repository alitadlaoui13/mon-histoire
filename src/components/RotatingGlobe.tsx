import React, { useEffect, useMemo, useRef } from 'react';
import { geoGraticule10, geoOrthographic, geoPath } from 'd3-geo';
import * as topojson from 'topojson-client';
import type { Feature, Geometry } from 'geojson';
import landAtlas from 'world-atlas/land-110m.json';

interface RotatingGlobeProps {
  size?: number;
  animate?: boolean;
}

export const RotatingGlobe: React.FC<RotatingGlobeProps> = ({
  size = 280,
  animate = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const { landFeature, graticule } = useMemo(() => {
    const atlas = landAtlas as unknown as {
      type: 'Topology';
      objects: { land: unknown };
    };
    const feature = topojson.feature(
      atlas as never,
      atlas.objects.land as never
    ) as unknown as Feature<Geometry>;
    return {
      landFeature: feature,
      graticule: geoGraticule10(),
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const radius = size * 0.46;
    const center = size / 2;

    const projection = geoOrthographic()
      .scale(radius)
      .translate([center, center])
      .clipAngle(90);

    const path = geoPath(projection, ctx);

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const shouldAnimate = animate && !prefersReducedMotion;
    let lon = -14;
    let rafId = 0;
    let lastTime = 0;

    const drawFrame = () => {
      ctx.clearRect(0, 0, size, size);

      projection.rotate([lon, -18, 4]);

      // Outer atmospheric halo
      const haloGrad = ctx.createRadialGradient(
        center - radius * 0.25,
        center - radius * 0.3,
        radius * 0.65,
        center,
        center,
        radius * 1.12
      );
      haloGrad.addColorStop(0, 'rgba(248, 207, 110, 0.22)');
      haloGrad.addColorStop(0.7, 'rgba(56, 118, 210, 0.16)');
      haloGrad.addColorStop(1, 'rgba(5, 11, 24, 0)');
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(center, center, radius * 1.1, 0, Math.PI * 2);
      ctx.fill();

      // Deep midnight-blue ocean sphere
      const oceanGrad = ctx.createRadialGradient(
        center - radius * 0.34,
        center - radius * 0.36,
        radius * 0.12,
        center + radius * 0.15,
        center + radius * 0.2,
        radius * 1.08
      );
      oceanGrad.addColorStop(0, '#1D4985');
      oceanGrad.addColorStop(0.42, '#0C254E');
      oceanGrad.addColorStop(0.82, '#06132B');
      oceanGrad.addColorStop(1, '#030814');

      ctx.beginPath();
      path({ type: 'Sphere' });
      ctx.fillStyle = oceanGrad;
      ctx.fill();

      // Delicate golden graticule meridians
      ctx.beginPath();
      path(graticule);
      ctx.strokeStyle = 'rgba(244, 202, 100, 0.17)';
      ctx.lineWidth = 0.65;
      ctx.stroke();

      // Gilded continents
      const landGrad = ctx.createLinearGradient(
        center - radius,
        center - radius,
        center + radius,
        center + radius
      );
      landGrad.addColorStop(0, '#FCE39D');
      landGrad.addColorStop(0.45, '#DFAD4B');
      landGrad.addColorStop(0.85, '#9F6D22');
      landGrad.addColorStop(1, '#6C4713');

      ctx.beginPath();
      path(landFeature);
      ctx.fillStyle = landGrad;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 240, 194, 0.45)';
      ctx.lineWidth = 0.6;
      ctx.stroke();

      // Specular twilight highlight & crisp gold rim
      const rimGrad = ctx.createRadialGradient(
        center - radius * 0.32,
        center - radius * 0.35,
        radius * 0.1,
        center,
        center,
        radius
      );
      rimGrad.addColorStop(0, 'rgba(255, 244, 210, 0.18)');
      rimGrad.addColorStop(0.6, 'rgba(255, 244, 210, 0)');
      rimGrad.addColorStop(0.92, 'rgba(244, 198, 92, 0.18)');
      rimGrad.addColorStop(1, 'rgba(244, 198, 92, 0.55)');

      ctx.beginPath();
      path({ type: 'Sphere' });
      ctx.fillStyle = rimGrad;
      ctx.fill();

      ctx.beginPath();
      path({ type: 'Sphere' });
      ctx.strokeStyle = 'rgba(235, 190, 92, 0.72)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    };

    drawFrame();

    if (!shouldAnimate) {
      return;
    }

    const tick = (now: number) => {
      if (lastTime === 0) lastTime = now;
      const dt = Math.min(now - lastTime, 100);
      lastTime = now;
      lon = (lon + dt * 0.011) % 360;
      drawFrame();
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [size, animate, landFeature, graticule]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className="block select-none pointer-events-none"
      aria-hidden="true"
    />
  );
};
