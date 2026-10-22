import { Link } from 'react-router-dom';
import { LoaderCircle, Sparkles, TriangleAlert } from 'lucide-react';

export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

const BUTTON_VARIANTS = {
  primary:
    'bg-brand text-white hover:brightness-110 border border-transparent font-semibold shadow-[0_6px_16px_-8px_rgb(106_61_245/0.7)]',
  ai: 'ai-gradient text-white border border-transparent font-semibold shadow-[0_8px_20px_-8px_rgb(190_24_93/0.55)] hover:brightness-110',
  secondary:
    'bg-surface text-ink border border-line-strong hover:bg-hover hover:border-field font-medium',
  ghost: 'bg-transparent text-brand-ink hover:bg-brand-soft border border-transparent font-semibold',
  danger: 'bg-transparent text-danger hover:bg-danger-soft border border-transparent font-semibold',
};

export function Button({
  variant = 'primary',
  loading = false,
  disabled,
  className,
  children,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-[15px] transition-[transform,background-color,box-shadow,filter] duration-150 active:scale-[0.97] disabled:opacity-60 disabled:active:scale-100',
        BUTTON_VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {loading && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

export function IconButton({ label, className, children, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'grid size-11 flex-none place-items-center rounded-xl text-muted transition-colors hover:bg-hover hover:text-ink disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Card({ as: Tag = 'section', className, interactive = false, children, ...props }) {
  return (
    <Tag
      className={cn(
        'rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] md:p-6',
        interactive && 'transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]',
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

/** Container for anything the AI proposed and the user has not accepted. */
export function ProposalCard({ as: Tag = 'article', className, children, ...props }) {
  return (
    <Tag
      className={cn(
        'rounded-[20px] border-[1.5px] border-dashed border-propose bg-propose-ground p-4 md:p-5',
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

const BADGE_TONES = {
  neutral: 'bg-subtle text-ink-soft',
  brand: 'bg-brand-soft text-brand-ink',
  propose: 'bg-propose-soft text-propose-ink',
  progress: 'bg-progress-soft text-progress',
  success: 'bg-success-soft text-success',
  danger: 'bg-danger-soft text-danger',
  warn: 'bg-warn-soft text-warn',
  energy: 'bg-energy-soft text-energy',
};

export function Badge({ tone = 'neutral', className, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        BADGE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Marks AI-generated content. */
export function AiBadge({ children = 'AI suggestion', className }) {
  return (
    <span
      className={cn(
        'ai-gradient inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white',
        className,
      )}
    >
      <Sparkles aria-hidden="true" className="size-3" strokeWidth={2.5} />
      {children}
    </span>
  );
}

const ALERT_TONES = {
  info: 'bg-surface border border-line text-ink-soft',
  success: 'bg-success-soft text-success',
  warning: 'bg-warn-soft text-warn',
  danger: 'bg-danger-soft text-danger',
};

export function Alert({ tone = 'info', children, className }) {
  const urgent = tone === 'warning' || tone === 'danger';

  return (
    <div
      role={urgent ? 'alert' : 'status'}
      className={cn('flex animate-fade-up gap-3 rounded-2xl px-4 py-3 text-sm leading-relaxed', ALERT_TONES[tone], className)}
    >
      {urgent && <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 flex-none" />}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function PageHeader({ eyebrow, title, children }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        {eyebrow && <span className="text-sm font-medium text-muted">{eyebrow}</span>}
        <h1 className="m-0 font-display text-[26px] font-semibold tracking-tight md:text-[34px]">
          {title}
        </h1>
      </div>
      {children}
    </header>
  );
}

export function SectionTitle({ id, children, className }) {
  return (
    <h2 id={id} className={cn('m-0 font-display text-lg font-semibold md:text-xl', className)}>
      {children}
    </h2>
  );
}

export function GroupLabel({ tone = 'muted', children }) {
  const color = {
    muted: 'text-muted',
    progress: 'text-progress',
    danger: 'text-danger',
    brand: 'text-success',
  }[tone];

  return (
    <h3 className={cn('m-0 text-[13px] font-semibold uppercase tracking-wide', color)}>{children}</h3>
  );
}

const FIELD_CLASS =
  'w-full rounded-xl border border-field bg-surface px-3 text-[15px] text-ink placeholder:text-muted/80 transition-colors focus:border-brand';

export function Field({ label, hint, children, className }) {
  return (
    <label className={cn('flex flex-col gap-1.5 text-sm font-medium', className)}>
      <span>{label}</span>
      {children}
      {hint && <span className="text-[13px] font-normal text-muted">{hint}</span>}
    </label>
  );
}

export function TextInput({ className, ...props }) {
  return <input className={cn(FIELD_CLASS, 'min-h-11', className)} {...props} />;
}

export function TextArea({ className, rows = 3, ...props }) {
  return <textarea rows={rows} className={cn(FIELD_CLASS, 'resize-y py-2.5 leading-relaxed', className)} {...props} />;
}

export function Select({ className, children, ...props }) {
  return (
    <select className={cn(FIELD_CLASS, 'min-h-11', className)} {...props}>
      {children}
    </select>
  );
}

const PROGRESS_FILLS = {
  brand: 'bg-brand',
  success: 'bg-success-fill',
  progress: 'bg-progress-fill',
};

export function ProgressBar({ value, label, tone = 'brand', className }) {
  const clamped = Math.max(0, Math.min(100, Number(value) || 0));

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      className={cn('h-2 overflow-hidden rounded-full bg-subtle', className)}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-700 ease-out', PROGRESS_FILLS[tone])}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

const STAT_TONES = {
  brand: 'bg-brand-soft text-brand-ink',
  success: 'bg-success-soft text-success',
  progress: 'bg-progress-soft text-progress',
  energy: 'bg-energy-soft text-energy',
  ai: 'ai-gradient text-white',
};

/** Small metric tile: icon, value and label. */
export function StatTile({ icon: Icon, value, label, detail, tone = 'brand', to, className }) {
  const content = (
    <>
      <span className={cn('grid size-10 place-items-center rounded-2xl', STAT_TONES[tone])}>
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <span className="flex flex-col">
        <span className="text-2xl font-semibold tabular-nums leading-tight">{value}</span>
        <span className="text-sm text-muted">{label}</span>
        {detail && <span className="mt-0.5 text-xs text-muted">{detail}</span>}
      </span>
    </>
  );

  const classes = cn(
    'flex items-center gap-3 rounded-3xl border border-line bg-surface p-4 text-ink no-underline shadow-[var(--shadow-card)]',
    to && 'transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]',
    className,
  );

  return to ? (
    <Link to={to} className={classes}>{content}</Link>
  ) : (
    <div className={classes}>{content}</div>
  );
}

export function Skeleton({ className }) {
  return <div aria-hidden="true" className={cn('skeleton rounded-3xl', className)} />;
}

export function LoadingBlock({ label = 'Loading' }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-3">
      <Skeleton className="h-16" />
      <Skeleton className="h-36" />
      <Skeleton className="h-52" />
    </div>
  );
}

export function ErrorBlock({ message, onRetry }) {
  return (
    <Alert tone="danger">
      <p className="m-0">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-2 min-h-11 font-semibold underline">
          Try again
        </button>
      )}
    </Alert>
  );
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-3xl border border-dashed border-line-strong bg-raised p-5">
      {Icon && (
        <span className="grid size-10 place-items-center rounded-2xl bg-brand-soft text-brand-ink">
          <Icon aria-hidden="true" className="size-5" />
        </span>
      )}
      <div className="flex flex-col gap-1">
        <h3 className="m-0 text-base font-semibold">{title}</h3>
        {children && <p className="m-0 text-sm leading-relaxed text-muted">{children}</p>}
      </div>
      {action}
    </div>
  );
}
