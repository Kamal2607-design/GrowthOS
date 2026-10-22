import { Check, X } from 'lucide-react';

import { AiBadge, Badge, Button, ProposalCard, cn } from './ui.jsx';

const SOURCE_LABELS = {
  ai: 'AI suggestion',
  manual: 'Saved idea',
};

export default function SuggestionCard({
  suggestion,
  goalName,
  busy,
  onAccept,
  onReject,
  compact = false,
  style,
}) {
  const headingId = `suggestion-${suggestion.id}`;

  return (
    <ProposalCard
      aria-labelledby={headingId}
      className={cn('flex animate-fade-up flex-col gap-2.5', compact && '!p-4')}
      style={style}
    >
      <div className="flex flex-wrap items-center gap-2">
        {suggestion.source === 'manual' ? (
          <Badge tone="propose">{SOURCE_LABELS.manual}</Badge>
        ) : (
          <AiBadge />
        )}
        {suggestion.priority > 0 && (
          <span className="text-xs font-semibold text-muted">Priority {suggestion.priority}</span>
        )}
        {goalName && <Badge>{goalName}</Badge>}
        {suggestion.reflectionId && <Badge tone="progress">From your reflection</Badge>}
      </div>

      <h3 id={headingId} className="m-0 text-[17px] font-semibold leading-snug">
        {suggestion.title}
      </h3>

      {!compact && suggestion.description && (
        <p className="m-0 text-[15px] leading-relaxed text-ink-soft">{suggestion.description}</p>
      )}

      {suggestion.reasoning && (
        <p className={cn('m-0 text-sm leading-relaxed text-muted', compact && 'line-clamp-2')}>
          <strong className="font-semibold text-ink-soft">Why:</strong> {suggestion.reasoning}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 pt-1 sm:flex">
        <Button
          onClick={() => onAccept(suggestion)}
          loading={busy === 'accept'}
          disabled={Boolean(busy)}
          aria-label={`Accept: ${suggestion.title}`}
          className={compact ? 'min-h-10 text-sm' : undefined}
        >
          {busy !== 'accept' && <Check aria-hidden="true" className="size-4" strokeWidth={2.5} />}
          Accept
        </Button>
        <Button
          variant="secondary"
          onClick={() => onReject(suggestion)}
          loading={busy === 'reject'}
          disabled={Boolean(busy)}
          aria-label={`Dismiss: ${suggestion.title}`}
          className={compact ? 'min-h-10 text-sm' : undefined}
        >
          {busy !== 'reject' && <X aria-hidden="true" className="size-4" />}
          Dismiss
        </Button>
      </div>
    </ProposalCard>
  );
}
