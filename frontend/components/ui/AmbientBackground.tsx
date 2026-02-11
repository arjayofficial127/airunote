'use client';

import { GoldenLightTrail } from './GoldenLightTrail';

interface AmbientBackgroundProps {
  /** Grid size in pixels (default: 64) */
  gridSize?: number;
  /** Number of golden light trails (default: 13) */
  lightCount?: number;
  /** Enable canvas grain texture (default: true) */
  enableGrain?: boolean;
  /** Grain opacity (default: 0.091320) */
  grainOpacity?: number;
  /** Enable gradient overlay (default: true) */
  enableGradient?: boolean;
  /** Gradient opacity (default: 0.16) */
  gradientOpacity?: number;
  /** Custom className for the container */
  className?: string;
}

/**
 * AmbientBackground Component
 * 
 * A reusable background that combines:
 * - Grid pattern
 * - Gradient overlay
 * - Canvas grain texture
 * - Golden light trails with nuggets
 * 
 * Usage:
 * <AmbientBackground />
 * <AmbientBackground gridSize={32} lightCount={5} />
 */
export function AmbientBackground({
  gridSize = 64,
  lightCount = 13,
  enableGrain = true,
  grainOpacity = 0.091320,
  enableGradient = true,
  gradientOpacity = 0.16,
  className = '',
}: AmbientBackgroundProps) {
  return (
    <div className={`pointer-events-none absolute inset-0 ${className}`}>
      {/* Gradient overlay */}
      {enableGradient && (
        <div 
          className="absolute inset-0"
          style={{
            background: `radial-gradient(60% 40% at 50% 30%, rgba(6, 182, 212, ${gradientOpacity}), transparent 60%)`,
          }}
        />
      )}
      
      {/* Grid pattern */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(17, 24, 39, 0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(17, 24, 39, 0.04) 1px, transparent 1px)
          `,
          backgroundSize: `${gridSize}px ${gridSize}px`,
        }}
      />
      
      {/* Canvas grain texture */}
      {enableGrain && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.25' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            backgroundSize: '200px 200px',
            backgroundRepeat: 'repeat',
            opacity: grainOpacity,
            mixBlendMode: 'multiply',
          }}
          aria-hidden="true"
        />
      )}

      {/* Golden light trails */}
      <GoldenLightTrail gridSize={gridSize} lightCount={lightCount} />
    </div>
  );
}

