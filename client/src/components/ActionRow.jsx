import { Check, Pencil, Play, Trash2 } from 'lucide-react';

import { Badge, cn } from './ui.jsx';

const BOX_STYLES = {
  pending: 'border-2 border-field bg-surface group-hover/check:border-brand',
  in_progress: 'border-2 border-progress-fill bg-progress-soft',
  completed: 'bg-success-fill animate-pop',
};

export default function ActionRow({
  action,
  meta,
  metaTone = 'muted',
  isTest = false,
  busy = false,
  onToggle,
  onStart,
  onEdit,
  onDelete,
}) {
  const done = action.status === 'completed';

  return (
    <li className="group flex min-h-[56px] items-center gap-1.5 border-b border-subtle last:border-b-0">
      <button
        type="button"
        onClick={() => onToggle(action)}
        disabled={busy}
        aria-label={`${done ? 'Mark not done' : 'Mark done'}: ${action.title}`}
        className="group/check grid size-11 flex-none place-items-center disabled:opacity-50"
      >
        <span
          className={cn(
            'grid size-6 place-items-center rounded-lg transition-colors',
            BOX_STYLES[action.status] ?? BOX_STYLES.pending,
          )}
        >
          {done && <Check aria-hidden="true" className="size-4 text-white" strokeWidth={3} />}
        </span>
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5 py-2">
        <span
          className={cn(
            'text-[15px] font-medium leading-snug transition-colors',
            done && 'text-muted line-through',
          )}
        >
          {action.title}
        </span>
        {meta && (
          <span className={cn('text-[13px]', metaTone === 'danger' ? 'text-danger' : 'text-muted')}>
            {meta}
          </span>
        )}
      </div>

      {isTest && <Badge className="flex-none">Test data</Badge>}

      <div className="flex flex-none items-center">
        {onStart && action.status === 'pending' && (
          <button
            type="button"
            onClick={() => onStart(action)}
            disabled={busy}
            className="flex min-h-11 items-center gap-1 rounded-lg px-2.5 text-sm font-semibold text-progress hover:bg-progress-soft disabled:opacity-50"
            aria-label={`Start: ${action.title}`}
          >
            <Play aria-hidden="true" className="size-3.5" />
            <span className="hidden sm:inline">Start</span>
          </button>
        )}
        {onEdit && (
          <button
            type="button"
            onClick={() => onEdit(action)}
            disabled={busy}
            aria-label={`Edit: ${action.title}`}
            className="grid size-10 place-items-center rounded-lg text-muted hover:bg-hover hover:text-ink disabled:opacity-50"
          >
            <Pencil aria-hidden="true" className="size-4" />
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(action)}
            disabled={busy}
            aria-label={`Delete: ${action.title}`}
            className="grid size-10 place-items-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger disabled:opacity-50"
          >
            <Trash2 aria-hidden="true" className="size-4" />
          </button>
        )}
      </div>
    </li>
  );
}
