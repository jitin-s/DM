import React, { useMemo } from 'react';

interface Particle {
  id: number;
  left: string;
  bottom: string;
  size: number;
  duration: string;
  delay: string;
  driftX: string;
  color: string;
  opacity: number;
}

interface AnimeEmberParticlesProps {
  count?: number;
  className?: string;
}

export const AnimeEmberParticles: React.FC<AnimeEmberParticlesProps> = ({
  count = 20,
  className = '',
}) => {
  // Generate deterministic particles based on count
  const particles: Particle[] = useMemo(() => {
    const colors = [
      '#F01428', // Devil Crimson
      '#FF2B44', // Ember Red
      '#F59E0B', // Golden Arcane Flame
      '#EF4444', // Fiery Red
    ];

    return Array.from({ length: count }, (_, i) => {
      // Seed-based pseudo randoms to avoid layout shift between renders
      const pseudoRand1 = ((i * 37 + 13) % 100) / 100;
      const pseudoRand2 = ((i * 61 + 29) % 100) / 100;
      const pseudoRand3 = ((i * 89 + 47) % 100) / 100;
      const pseudoRand4 = ((i * 17 + 73) % 100) / 100;

      const size = 2 + Math.floor(pseudoRand1 * 3.5); // 2px - 5px
      const left = `${5 + Math.floor(pseudoRand2 * 90)}%`;
      const bottom = `${Math.floor(pseudoRand3 * 25)}%`;
      const duration = `${5.5 + pseudoRand4 * 4.5}s`; // 5.5s - 10s
      const delay = `${(i * 0.4) % 5}s`;
      const driftX = `${(pseudoRand1 > 0.5 ? 1 : -1) * (20 + Math.floor(pseudoRand3 * 40))}px`;
      const color = colors[i % colors.length];
      const opacity = 0.35 + pseudoRand2 * 0.45;

      return {
        id: i,
        left,
        bottom,
        size,
        duration,
        delay,
        driftX,
        color,
        opacity,
      };
    });
  }, [count]);

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden z-10 ${className}`}
      aria-hidden="true"
    >
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute rounded-full animate-ember"
          style={
            {
              left: p.left,
              bottom: p.bottom,
              width: `${p.size}px`,
              height: `${p.size}px`,
              backgroundColor: p.color,
              boxShadow: `0 0 ${p.size * 2.5}px ${p.color}, 0 0 ${p.size * 5}px rgba(240, 20, 40, 0.5)`,
              animationDuration: p.duration,
              animationDelay: p.delay,
              '--drift-x': p.driftX,
              opacity: p.opacity,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
};
