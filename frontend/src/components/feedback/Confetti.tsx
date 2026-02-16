import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface ConfettiProps {
  /** Whether to trigger the confetti */
  trigger?: boolean;
  /** Number of confetti pieces */
  particleCount?: number;
  /** Duration in milliseconds */
  duration?: number;
  /** Colors for confetti */
  colors?: string[];
  /** Additional className */
  className?: string;
  /** Callback when animation completes */
  onComplete?: () => void;
}

const DEFAULT_COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
];

export function Confetti({
  trigger = false,
  particleCount = 50,
  duration = 3000,
  colors = DEFAULT_COLORS,
  className,
  onComplete,
}: ConfettiProps) {
  const [particles, setParticles] = useState<Array<{
    id: number;
    left: number;
    delay: number;
    duration: number;
    color: string;
  }>>([]);

  useEffect(() => {
    if (trigger) {
      // Generate random particles
      const newParticles = Array.from({ length: particleCount }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 500,
        duration: duration + Math.random() * 1000,
        color: colors[Math.floor(Math.random() * colors.length)],
      }));

      setParticles(newParticles);

      // Call onComplete after animation
      const timer = setTimeout(() => {
        setParticles([]);
        if (onComplete) {
          onComplete();
        }
      }, duration + 1000);

      return () => clearTimeout(timer);
    }
  }, [trigger, particleCount, duration, colors, onComplete]);

  if (particles.length === 0) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 pointer-events-none z-[9999] overflow-hidden",
        className
      )}
      aria-hidden="true"
    >
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute top-0 w-2 h-2 rounded-sm"
          style={{
            left: `${particle.left}%`,
            backgroundColor: particle.color,
            animation: `confetti-fall ${particle.duration}ms ease-out ${particle.delay}ms forwards`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
