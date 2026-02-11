'use client';

import React, { useEffect, useState } from 'react';

interface GoldenLightTrailProps {
  gridSize?: number; // Grid cell size in pixels (default: 64)
  instanceId?: number; // Unique ID for this instance
}

interface LightInstance {
  currentPos: { x: number; y: number };
  path: Array<{ x: number; y: number; opacity: number }>;
  direction: 'up' | 'down' | 'left' | 'right' | null;
}

function SingleLightTrail({ gridSize = 64, instanceId = 0 }: GoldenLightTrailProps) {
  const [light, setLight] = useState<LightInstance | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || typeof window === 'undefined') return;

    // Get container dimensions (fallback to window if not available)
    const getContainerDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      }
      return { width: window.innerWidth, height: window.innerHeight };
    };

    // Initialize starting position randomly on the grid
    const getRandomGridPosition = () => {
      const { width, height } = getContainerDimensions();
      const cols = Math.floor(width / gridSize);
      const rows = Math.floor(height / gridSize);
      return {
        x: Math.floor(Math.random() * cols) * gridSize,
        y: Math.floor(Math.random() * rows) * gridSize,
      };
    };

    // Initialize with random position and direction
    const startPos = getRandomGridPosition();
    const directions = ['up', 'down', 'left', 'right'] as const;
    const initialDirection = directions[Math.floor(Math.random() * directions.length)] as 'up' | 'down' | 'left' | 'right';
    
    setLight({
      currentPos: startPos,
      path: [{ ...startPos, opacity: 1 }],
      direction: initialDirection,
    });

    const { width, height } = getContainerDimensions();
    const cols = Math.floor(width / gridSize);
    const rows = Math.floor(height / gridSize);

    // Animate continuously without restarting
    const interval = setInterval(() => {
      setLight((prev) => {
        if (!prev) return prev;

        const { currentPos, path, direction } = prev;
        let x = currentPos.x;
        let y = currentPos.y;
        let newDirection = direction;
        const directions = ['up', 'down', 'left', 'right'] as const;
        let lastDirection = direction;

        // Choose next direction (avoid going back, avoid hitting boundaries)
        let attempts = 0;
        do {
          newDirection = directions[Math.floor(Math.random() * directions.length)] as typeof direction;
          attempts++;
          if (attempts > 20) break; // Prevent infinite loop
        } while (
          (lastDirection === 'up' && newDirection === 'down') ||
          (lastDirection === 'down' && newDirection === 'up') ||
          (lastDirection === 'left' && newDirection === 'right') ||
          (lastDirection === 'right' && newDirection === 'left') ||
          (newDirection === 'up' && y === 0) ||
          (newDirection === 'down' && y >= (rows - 1) * gridSize) ||
          (newDirection === 'left' && x === 0) ||
          (newDirection === 'right' && x >= (cols - 1) * gridSize)
        );

        // Move along grid (1 grid cell per step)
        const stepSize = gridSize;
        switch (newDirection) {
          case 'up':
            y = Math.max(0, y - stepSize);
            break;
          case 'down':
            y = Math.min((rows - 1) * gridSize, y + stepSize);
            break;
          case 'left':
            x = Math.max(0, x - stepSize);
            break;
          case 'right':
            x = Math.min((cols - 1) * gridSize, x + stepSize);
            break;
        }

        const newPos = { x, y };
        const newPath = [...path, { ...newPos, opacity: 1 }];
        
        // Keep only last 12 segments in trail (fade out older ones)
        const trailLength = 12;
        const trimmedPath = newPath.slice(-trailLength).map((point, idx, arr) => ({
          ...point,
          opacity: Math.max(0, (idx + 1) / arr.length * 0.6), // Fade from 0.6 to 0
        }));

        return {
          currentPos: newPos,
          path: trimmedPath,
          direction: newDirection,
        };
      });
    }, 120 + instanceId * 10); // Slight delay variation per instance

    return () => clearInterval(interval);
  }, [gridSize, isMounted, instanceId]);

  if (!isMounted || !light) return null;

  return (
    <div ref={containerRef} className="absolute inset-0">
      {/* Golden nuggets left at grid line intersections */}
      {light.path.map((point, index) => {
        // Random size for each nugget (4-7px)
        const size = 4 + Math.random() * 3;
        
        return (
          <div
            key={`nugget-${instanceId}-${index}-${point.x}-${point.y}`}
            className="absolute"
            style={{
              left: `${point.x}px`,
              top: `${point.y}px`,
              width: `${size}px`,
              height: `${size}px`,
              transform: 'translate(-50%, -50%)', // Center at intersection
              opacity: point.opacity,
              background: `radial-gradient(circle, rgba(255, 215, 0, 0.9) 0%, rgba(251, 191, 36, 0.7) 40%, rgba(234, 179, 8, 0.5) 70%, transparent 100%)`,
              borderRadius: '50%',
              boxShadow: `0 0 ${size * 2}px rgba(251, 191, 36, ${point.opacity * 0.6}), 0 0 ${size * 3}px rgba(234, 179, 8, ${point.opacity * 0.3})`,
              transition: 'opacity 0.3s ease-out',
              pointerEvents: 'none',
            }}
          />
        );
      })}

      {/* Current light position - centered at grid intersection */}
      <div
        className="absolute"
        style={{
          left: `${light.currentPos.x}px`,
          top: `${light.currentPos.y}px`,
          transform: 'translate(-50%, -50%)', // Center at intersection
          transition: 'left 0.12s linear, top 0.12s linear',
          pointerEvents: 'none',
        }}
      >
        {/* Main circle - solid gold */}
        <div
          className="absolute"
          style={{
            width: '7px',
            height: '7px',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 215, 0, 0.9)',
          }}
        />
      </div>
    </div>
  );
}

export function GoldenLightTrail({ gridSize = 64, lightCount = 13 }: { gridSize?: number; lightCount?: number }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
      {Array.from({ length: lightCount }).map((_, index) => (
        <SingleLightTrail key={index} gridSize={gridSize} instanceId={index} />
      ))}
    </div>
  );
}

