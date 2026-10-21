import { useEffect, useState } from 'react';

const COLORS = ['#7C3AED', '#BE185D', '#10B981', '#0EA5E9', '#F59E0B', '#F472B6'];

/**
 * Short celebratory burst (decorative, hidden from assistive tech).
 * Re-runs whenever `trigger` changes to a new truthy value. Reduced-motion
 * users get no animation (handled globally in CSS).
 */
export default function Confetti({ trigger }) {
  const [pieces, setPieces] = useState([]);

  useEffect(() => {
    if (!trigger) return undefined;

    setPieces(
      Array.from({ length: 42 }, (_, index) => ({
        id: `${trigger}-${index}`,
        left: Math.random() * 100,
        delay: Math.random() * 0.35,
        duration: 1.6 + Math.random() * 1.2,
        drift: (Math.random() - 0.5) * 160,
        spin: 360 + Math.random() * 540,
        color: COLORS[index % COLORS.length],
        size: 6 + Math.random() * 6,
      })),
    );

    const timer = setTimeout(() => setPieces([]), 3200);
    return () => clearTimeout(timer);
  }, [trigger]);

  if (pieces.length === 0) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[70] overflow-hidden">
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className="absolute top-0 block rounded-[2px]"
          style={{
            left: `${piece.left}%`,
            width: piece.size,
            height: piece.size * 0.45,
            background: piece.color,
            '--drift': `${piece.drift}px`,
            '--spin': `${piece.spin}deg`,
            animation: `confetti-fall ${piece.duration}s cubic-bezier(0.2, 0.6, 0.4, 1) ${piece.delay}s both`,
          }}
        />
      ))}
    </div>
  );
}
