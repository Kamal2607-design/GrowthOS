import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { cn } from './ui.jsx';

function niceMax(value) {
  if (value <= 4) return 4;
  if (value <= 5) return 5;
  if (value <= 10) return 10;
  return Math.ceil(value / 5) * 5;
}

function useElementWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    setWidth(element.getBoundingClientRect().width);

    if (typeof ResizeObserver === 'undefined') return undefined;

    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, width];
}

// Tables ignore overflow:hidden, so the visually-hidden clip goes on a
// wrapping block; otherwise the table's width causes horizontal scrolling.
function VisuallyHiddenTable({ caption, columns, rows }) {
  return (
    <div className="sr-only">
    <table>
      <caption>{caption}</caption>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column} scope="col">{column}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row[0]}>
            {row.map((cell, index) => (
              <td key={index}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}

/**
 * Column chart of completed actions per day. One series, so no legend;
 * the card title names it. Each column is focusable and shows a tooltip.
 */
export function ActivityChart({ days, caption = 'Completed actions per day' }) {
  const [active, setActive] = useState(null);
  const max = niceMax(Math.max(0, ...days.map((day) => day.completed)));
  const total = days.reduce((sum, day) => sum + day.completed, 0);
  const height = 150;

  return (
    <figure className="m-0 flex flex-col gap-2">
      <div className="relative flex gap-2" style={{ height }}>
        <div aria-hidden="true" className="flex w-6 flex-none flex-col justify-between text-right text-[11px] tabular-nums text-muted">
          <span>{max}</span>
          <span>{max / 2}</span>
          <span>0</span>
        </div>

        <div className="relative flex-1">
          {[0, 0.5, 1].map((fraction) => (
            <div
              key={fraction}
              aria-hidden="true"
              className="absolute inset-x-0 h-px bg-chart-grid"
              style={{ top: `${fraction * 100}%` }}
            />
          ))}

          <div className="absolute inset-0 flex items-end justify-between gap-[2px]">
            {days.map((day, index) => {
              const barHeight = day.completed > 0 ? Math.max(6, (day.completed / max) * height) : 0;

              return (
                <div
                  key={day.date}
                  tabIndex={0}
                  role="img"
                  aria-label={`${day.label}: ${day.completed} completed, ${day.created} created`}
                  onMouseEnter={() => setActive(index)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(index)}
                  onBlur={() => setActive(null)}
                  className="group relative flex h-full flex-1 items-end justify-center rounded-md outline-offset-0"
                >
                  <div
                    className={cn(
                      'w-full max-w-[24px] rounded-t-[4px] bg-chart-activity transition-[height,opacity] duration-500 ease-out',
                      active !== null && active !== index && 'opacity-45',
                    )}
                    style={{ height: barHeight }}
                  />
                  {active === index && (
                    <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink shadow-[var(--shadow-lift)]">
                      <div className="font-semibold">{day.label}</div>
                      <div className="text-muted">
                        {day.completed} completed · {day.created} created
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {total === 0 && (
            <p className="absolute inset-0 m-0 grid place-items-center text-center text-sm text-muted">
              No completed actions in this period yet.
            </p>
          )}
        </div>
      </div>

      <div aria-hidden="true" className="ml-8 flex justify-between text-[11px] text-muted">
        <span>{days[0]?.shortLabel}</span>
        <span>{days[Math.floor(days.length / 2)]?.shortLabel}</span>
        <span>Today</span>
      </div>

      <VisuallyHiddenTable
        caption={caption}
        columns={['Day', 'Completed', 'Created']}
        rows={days.map((day) => [day.label, day.completed, day.created])}
      />
    </figure>
  );
}

/**
 * Line chart for a 1–10 score over time (one series). Hover or focus a
 * point for details; a crosshair marks the active point.
 */
export function ScoreLine({ points, min = 1, max = 10, caption }) {
  const [ref, width] = useElementWidth();
  const [active, setActive] = useState(null);
  const height = 140;
  const padX = 10;
  const padY = 12;

  const usable = points.filter((point) => Number.isFinite(point.value));
  const innerWidth = Math.max(0, width - padX * 2);
  const x = (index) => padX + (usable.length <= 1 ? innerWidth / 2 : (index / (usable.length - 1)) * innerWidth);
  const y = (value) => padY + (1 - (value - min) / (max - min)) * (height - padY * 2);

  const path = usable.map((point, index) => `${index ? 'L' : 'M'}${x(index)},${y(point.value)}`).join(' ');
  const area = usable.length > 1
    ? `${path} L${x(usable.length - 1)},${height - padY} L${x(0)},${height - padY} Z`
    : '';

  const activePoint = active !== null ? usable[active] : null;

  return (
    <figure className="m-0 flex flex-col gap-2">
      <div ref={ref} className="relative" style={{ height }}>
        {width > 0 && usable.length > 0 && (
          <svg width={width} height={height} aria-hidden="true" className="overflow-visible">
            {[min, (min + max) / 2, max].map((tick) => (
              <line key={tick} x1={0} x2={width} y1={y(tick)} y2={y(tick)} stroke="var(--color-chart-grid)" strokeWidth="1" />
            ))}
            {area && <path d={area} fill="var(--color-chart-productivity)" opacity="0.1" />}
            <path d={path} fill="none" stroke="var(--color-chart-productivity)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            {activePoint && (
              <line x1={x(active)} x2={x(active)} y1={padY} y2={height - padY} stroke="var(--color-line-strong)" strokeWidth="1" />
            )}
            {usable.map((point, index) => (
              <circle
                key={point.key}
                cx={x(index)}
                cy={y(point.value)}
                r={active === index ? 6 : 4}
                fill="var(--color-chart-productivity)"
                stroke="var(--color-surface)"
                strokeWidth="2"
              />
            ))}
          </svg>
        )}

        <div className="absolute inset-0 flex">
          {usable.map((point, index) => (
            <div
              key={point.key}
              tabIndex={0}
              role="img"
              aria-label={`${point.label}: ${point.value} of ${max}${point.detail ? `, ${point.detail}` : ''}`}
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(index)}
              onBlur={() => setActive(null)}
              className="h-full flex-1"
            />
          ))}
        </div>

        {activePoint && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink shadow-[var(--shadow-lift)]"
            style={{ left: x(active), top: y(activePoint.value) - 10 }}
          >
            <div className="font-semibold">{activePoint.label}</div>
            <div className="text-muted">
              {activePoint.value}/{max}
              {activePoint.detail ? ` · ${activePoint.detail}` : ''}
            </div>
          </div>
        )}
      </div>

      <VisuallyHiddenTable
        caption={caption}
        columns={['Day', 'Score', 'Notes']}
        rows={usable.map((point) => [point.label, point.value, point.detail ?? ''])}
      />
    </figure>
  );
}

/** Circular progress meter; the centre shows the children. */
export function ProgressRing({ value, size = 132, stroke = 12, label, children, tone = 'brand' }) {
  const clamped = Math.max(0, Math.min(100, Number(value) || 0));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const [shown, setShown] = useState(0);

  // Animate from 0 on mount and between values.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(clamped));
    return () => cancelAnimationFrame(frame);
  }, [clamped]);

  const color = tone === 'success' ? 'var(--color-success-fill)' : 'var(--color-brand)';

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      className="relative grid flex-none place-items-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} aria-hidden="true" className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-subtle)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - shown / 100)}
          style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.2, 0.8, 0.2, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}
