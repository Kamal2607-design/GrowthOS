import { useEffect, useState } from 'react';
import { Plus, Sparkles } from 'lucide-react';

import * as api from '../lib/api.js';
import { useAppData } from '../lib/AppDataContext.jsx';
import ActionForm from '../components/ActionForm.jsx';
import ActionRow from '../components/ActionRow.jsx';
import { ActivityChart } from '../components/charts.jsx';
import SuggestionCard from '../components/SuggestionCard.jsx';
import { useToast } from '../components/Toast.jsx';
import { dateInputToInstant, formatShortDate, humanize, instantToDateInput } from '../lib/format.js';
import { GOAL_STATUSES, isPlaceholderGoal } from '../lib/goals.js';
import { errorMessage } from '../lib/messages.js';
import { useResource } from '../lib/useResource.js';
import {
  Alert,
  Badge,
  Button,
  Card,
  ErrorBlock,
  Field,
  LoadingBlock,
  PageHeader,
  ProgressBar,
  ProposalCard,
  SectionTitle,
  Select,
  Skeleton,
  TextArea,
  TextInput,
  cn,
} from '../components/ui.jsx';

const VISION_FIELDS = [
  { key: 'statement', label: 'Statement', placeholder: 'Who you want to become', required: true },
  { key: 'values', label: 'Values', placeholder: 'What matters to you' },
  { key: 'identity', label: 'Identity', placeholder: 'Who you are becoming' },
  { key: 'futureSelf', label: 'Future self', placeholder: 'A day in your future life' },
];

const PRIORITIES = [
  { value: 0, label: 'Not set' },
  { value: 1, label: 'High' },
  { value: 2, label: 'Medium' },
  { value: 3, label: 'Low' },
];

function VisionSection() {
  const vision = useResource(api.fetchVision, []);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function startEditing() {
    const current = vision.data ?? {};
    setForm(Object.fromEntries(VISION_FIELDS.map(({ key }) => [key, current[key] ?? ''])));
    setError('');
    setEditing(true);
  }

  async function save(event) {
    event.preventDefault();

    if (!form.statement?.trim()) {
      setError('Write a vision statement first.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const fields = Object.fromEntries(
        VISION_FIELDS.map(({ key }) => [key, form[key]?.trim() ? form[key].trim() : null]),
      );
      await api.saveVision(fields, Boolean(vision.data));
      await vision.reload();
      setEditing(false);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card aria-labelledby="vision-heading" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle id="vision-heading">Your vision</SectionTitle>
        {!editing && vision.data !== undefined && (
          <Button variant="secondary" onClick={startEditing} className="min-h-10 text-sm">
            {vision.data ? 'Edit vision' : 'Write vision'}
          </Button>
        )}
      </div>

      {vision.loading && vision.data === undefined && <Skeleton className="h-20" />}
      {vision.error && <ErrorBlock message={errorMessage(vision.error)} onRetry={vision.reload} />}

      {!editing && vision.data === null && (
        <p className="m-0 text-[15px] text-ink-soft">
          You haven't written a vision yet. It's the starting point for every suggestion.
        </p>
      )}

      {!editing && vision.data && (
        <dl className="m-0 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {VISION_FIELDS.map(({ key, label }) => (
            <div key={key} className="flex flex-col gap-1">
              <dt className="text-[13px] font-semibold text-muted">{label}</dt>
              <dd className="m-0 text-base leading-relaxed">
                {vision.data[key] || <span className="text-muted">Not set</span>}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {editing && (
        <form onSubmit={save} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {error && <Alert tone="danger" className="md:col-span-2">{error}</Alert>}
          {VISION_FIELDS.map(({ key, label, placeholder, required }) => (
            <Field key={key} label={required ? `${label} (required)` : label}>
              <TextArea
                rows={2}
                placeholder={placeholder}
                value={form[key]}
                onChange={(event) => setForm({ ...form, [key]: event.target.value })}
              />
            </Field>
          ))}
          <div className="flex gap-2 md:col-span-2">
            <Button type="submit" loading={saving}>Save vision</Button>
            <Button variant="secondary" onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}

function GoalForm({ initial, submitLabel, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    priority: initial?.priority ?? 0,
    targetDate: instantToDateInput(initial?.targetDate),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();

    if (!form.title.trim()) {
      setError('Give the goal a title.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await onSubmit({
        title: form.title.trim(),
        description: form.description.trim() || null,
        priority: Number(form.priority),
        targetDate: dateInputToInstant(form.targetDate),
      });
    } catch (cause) {
      setError(errorMessage(cause));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {error && <Alert tone="danger" className="sm:col-span-2">{error}</Alert>}
      <Field label="Title (required)" className="sm:col-span-2">
        <TextInput
          value={form.title}
          placeholder="For example: Run a half marathon"
          onChange={(event) => setForm({ ...form, title: event.target.value })}
        />
      </Field>
      <Field label="Description" className="sm:col-span-2">
        <TextArea
          rows={2}
          value={form.description}
          placeholder="What success looks like"
          onChange={(event) => setForm({ ...form, description: event.target.value })}
        />
      </Field>
      <Field label="Priority">
        <Select
          value={form.priority}
          onChange={(event) => setForm({ ...form, priority: event.target.value })}
        >
          {PRIORITIES.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>
      </Field>
      <Field label="Target date">
        <TextInput
          type="date"
          value={form.targetDate}
          onChange={(event) => setForm({ ...form, targetDate: event.target.value })}
        />
      </Field>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" loading={saving}>{submitLabel}</Button>
        <Button variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>
      </div>
    </form>
  );
}

function ProgressAnalysis({ goalId }) {
  const [state, setState] = useState({ loading: false, data: null, error: null });

  useEffect(() => {
    setState({ loading: false, data: null, error: null });
  }, [goalId]);

  async function analyze() {
    setState({ loading: true, data: null, error: null });

    try {
      setState({ loading: false, data: await api.analyzeGoalProgress(goalId), error: null });
    } catch (error) {
      setState({ loading: false, data: null, error });
    }
  }

  const analysis = state.data;

  return (
    <ProposalCard as="section" aria-labelledby="analysis-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="analysis-heading" className="m-0 text-base font-semibold">Progress analysis</h3>
        <Button variant="secondary" onClick={analyze} loading={state.loading} className="min-h-10 text-sm">
          {state.loading ? 'Analysing…' : analysis ? 'Analyse again' : 'Analyse progress'}
        </Button>
      </div>

      {state.error && (
        <Alert tone="warning">
          {state.error.status >= 500
            ? 'The analysis could not be generated. Check that Ollama is running, then try again.'
            : errorMessage(state.error)}
        </Alert>
      )}

      {!analysis && !state.error && (
        <p className="m-0 text-sm text-muted">
          Ask Qwen to read this goal's actions and reflections. The analysis is shown to you, not
          saved over your data.
        </p>
      )}

      {analysis && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Badge tone="propose">Progress: {humanize(analysis.progressLevel)}</Badge>
            <Badge>Trend: {humanize(analysis.trend)}</Badge>
          </div>
          <p className="m-0 text-[15px] leading-relaxed text-ink-soft">{analysis.summary}</p>
          {[
            ['Strengths', analysis.strengths],
            ['Blockers', analysis.blockers],
            ['From your reflections', analysis.reflectionInsights],
          ]
            .filter(([, items]) => items?.length)
            .map(([title, items]) => (
              <div key={title} className="flex flex-col gap-1">
                <h4 className="m-0 text-sm font-semibold">{title}</h4>
                <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-sm text-ink-soft">
                  {items.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            ))}
          {analysis.recommendations?.length > 0 && (
            <div className="flex flex-col gap-1">
              <h4 className="m-0 text-sm font-semibold">Ideas</h4>
              <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5 text-sm text-ink-soft">
                {analysis.recommendations.map((item) => (
                  <li key={item.title}>
                    <strong className="font-semibold text-ink">{item.title}.</strong> {item.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </ProposalCard>
  );
}

function goalActivityDays(activity) {
  return (activity?.daily ?? []).map((day) => ({
    date: day.date,
    label: formatDayLabel(day.date, { weekday: 'short', day: 'numeric', month: 'short' }),
    shortLabel: formatDayLabel(day.date, { day: 'numeric', month: 'short' }),
    completed: day.completedCount ?? 0,
    created: day.createdCount ?? 0,
  }));
}

function formatDayLabel(dateKey, options) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', ...options }).format(
    new Date(`${dateKey}T12:00:00Z`),
  );
}

function GoalSuggestions({ goal, onAccepted }) {
  const toast = useToast();
  const { refreshCounts } = useAppData();
  const [state, setState] = useState({ loading: false, error: null, suggestions: null, skipped: 0 });
  const [busy, setBusy] = useState({});

  useEffect(() => {
    setState({ loading: false, error: null, suggestions: null, skipped: 0 });
  }, [goal.id]);

  async function generate() {
    setState({ loading: true, error: null, suggestions: null, skipped: 0 });

    try {
      const result = await api.generateGoalSuggestions(goal.id);
      setState({ loading: false, error: null, suggestions: result.suggestions, skipped: result.skippedCount ?? 0 });
      refreshCounts();
    } catch (error) {
      setState({ loading: false, error, suggestions: null, skipped: 0 });
    }
  }

  async function decide(suggestion, accept) {
    setBusy((previous) => ({ ...previous, [suggestion.id]: accept ? 'accept' : 'reject' }));

    try {
      if (accept) {
        await api.acceptSuggestion(suggestion.id);
        toast.show(`Added “${suggestion.title}” to this goal.`);
        await onAccepted();
      } else {
        await api.rejectSuggestion(suggestion.id);
      }
      setState((previous) => ({
        ...previous,
        suggestions: previous.suggestions.filter((item) => item.id !== suggestion.id),
      }));
      refreshCounts();
    } catch (error) {
      toast.show(errorMessage(error), { tone: 'danger' });
    } finally {
      setBusy((previous) => ({ ...previous, [suggestion.id]: undefined }));
    }
  }

  if (isPlaceholderGoal(goal)) {
    return null;
  }

  return (
    <section aria-labelledby="goal-ai-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="goal-ai-heading" className="m-0 text-base font-semibold">
          <span className="ai-gradient-text">Ideas from Qwen</span>
        </h3>
        <Button variant="ai" onClick={generate} loading={state.loading} className="min-h-10 text-sm">
          {!state.loading && <Sparkles aria-hidden="true" className="size-4" />}
          {state.loading ? 'Thinking…' : state.suggestions ? 'Suggest more' : 'Suggest actions with AI'}
        </Button>
      </div>
      {state.loading && <Alert>Qwen is drafting actions for this goal. This usually takes 10 to 30 seconds.</Alert>}
      {state.error && (
        <Alert tone="warning">
          {state.error.status === 503
            ? 'The AI is offline. Start Ollama and try again.'
            : state.error.status === 502
              ? 'The AI returned an unusable answer. Try again.'
              : errorMessage(state.error)}
        </Alert>
      )}
      {state.suggestions && state.suggestions.length === 0 && (
        <Alert>Nothing new: everything Qwen proposed is already on your list.</Alert>
      )}
      {state.suggestions?.map((suggestion) => (
        <SuggestionCard
          key={suggestion.id}
          compact
          suggestion={suggestion}
          busy={busy[suggestion.id]}
          onAccept={(item) => decide(item, true)}
          onReject={(item) => decide(item, false)}
        />
      ))}
      {state.skipped > 0 && (
        <p className="m-0 text-xs text-muted">{state.skipped} idea(s) skipped because they repeat existing work.</p>
      )}
    </section>
  );
}

function GoalActions({ goal, onChanged }) {
  const toast = useToast();
  const actions = useResource(() => api.fetchActions({ goalId: goal.id }), [goal.id]);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState({});

  async function run(action, task) {
    setBusy((previous) => ({ ...previous, [action.id]: true }));
    try {
      await task();
      await Promise.all([actions.reload(), onChanged()]);
    } catch (error) {
      toast.show(errorMessage(error), { tone: 'danger' });
    } finally {
      setBusy((previous) => ({ ...previous, [action.id]: false }));
    }
  }

  const list = (actions.data ?? []).filter((action) => action.status !== 'cancelled');
  const open = list.filter((action) => action.status !== 'completed');
  const done = list.filter((action) => action.status === 'completed');

  return (
    <section aria-labelledby="goal-actions-heading" className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="goal-actions-heading" className="m-0 text-base font-semibold">
          Actions <span className="font-normal text-muted">· {open.length} open, {done.length} done</span>
        </h3>
        {!adding && (
          <Button variant="ghost" className="min-h-10 text-sm" onClick={() => setAdding(true)}>
            <Plus aria-hidden="true" className="size-4" />
            Add action
          </Button>
        )}
      </div>
      {adding && (
        <div className="rounded-2xl border border-line bg-raised p-4">
          <ActionForm
            goals={[goal]}
            defaultGoalId={goal.id}
            onCancel={() => setAdding(false)}
            onSubmit={async (fields) => {
              await api.createAction(fields);
              toast.show(`Added “${fields.title}”.`);
              setAdding(false);
              await Promise.all([actions.reload(), onChanged()]);
            }}
          />
        </div>
      )}
      {actions.loading && !actions.data && <Skeleton className="h-16" />}
      {actions.error && <ErrorBlock message={errorMessage(actions.error)} onRetry={actions.reload} />}
      {actions.data && list.length === 0 && !adding && (
        <p className="m-0 text-sm text-muted">No actions yet. Add one, or ask Qwen for ideas.</p>
      )}
      <ul className="m-0 list-none p-0">
        {[...open, ...done.slice(0, 5)].map((action) => (
          <ActionRow
            key={action.id}
            action={action}
            meta={action.dueDate ? `Due ${formatShortDate(action.dueDate)}` : null}
            busy={Boolean(busy[action.id])}
            onToggle={(item) =>
              run(item, () => api.setActionStatus(item.id, item.status === 'completed' ? 'pending' : 'completed'))
            }
            onStart={(item) => run(item, () => api.setActionStatus(item.id, 'in_progress'))}
            onDelete={(item) => {
              if (window.confirm(`Delete “${item.title}”?`)) {
                run(item, () => api.deleteAction(item.id));
              }
            }}
          />
        ))}
      </ul>
    </section>
  );
}

function GoalDetail({ goal, onChanged }) {
  const toast = useToast();
  const detail = useResource(() => api.fetchGoalProgress(goal.id), [goal.id]);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setEditing(false);
    setError('');
  }, [goal.id]);

  async function setStatus(status) {
    setBusy(status);
    setError('');

    try {
      await api.updateGoal(goal.id, { status });
      toast.show(status === 'completed' ? 'Goal completed. Congratulations!' : `Goal ${humanize(status).toLowerCase()}.`);
      await onChanged();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete “${goal.title}”? Its actions and suggestions are deleted too.`)) return;
    setBusy('delete');

    try {
      await api.deleteGoal(goal.id);
      toast.show('Goal deleted.', { tone: 'info' });
      await onChanged();
    } catch (cause) {
      setError(errorMessage(cause));
      setBusy(null);
    }
  }

  const stats = detail.data?.progress;
  const activity = detail.data?.activity;
  const reflectionCount = detail.data?.reflectionCorrelation?.count ?? 0;
  const days = goalActivityDays(activity);

  return (
    <Card aria-labelledby="detail-heading" className="flex min-w-0 animate-fade-up flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-muted">
          {goal.targetDate ? `Target ${formatShortDate(goal.targetDate)}` : 'No target date'} ·{' '}
          {humanize(goal.status)}
        </span>
        <h2 id="detail-heading" className="m-0 font-display text-[22px] font-semibold leading-snug">
          {goal.title}
        </h2>
        {goal.description && <p className="m-0 text-[15px] text-ink-soft">{goal.description}</p>}
        {isPlaceholderGoal(goal) && (
          <Badge className="self-start">Test goal · not used for suggestions</Badge>
        )}
      </div>

      {error && <Alert tone="danger">{error}</Alert>}

      {editing ? (
        <GoalForm
          initial={goal}
          submitLabel="Save goal"
          onCancel={() => setEditing(false)}
          onSubmit={async (fields) => {
            await api.updateGoal(goal.id, fields);
            setEditing(false);
            toast.show('Goal updated.');
            await onChanged();
          }}
        />
      ) : (
        <>
          {detail.loading && !detail.data && <Skeleton className="h-24" />}
          {detail.error && <ErrorBlock message={errorMessage(detail.error)} onRetry={detail.reload} />}
          {stats && (
            <>
              <dl className="m-0 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ['Done', stats.completedActions, 'text-success'],
                  ['Open', stats.pendingActions + stats.inProgressActions, 'text-brand-ink'],
                  ['Done in last 7 days', activity?.recentCompleted ?? 0, 'text-progress'],
                  ['Linked reflections', reflectionCount, 'text-energy'],
                ].map(([label, value, color]) => (
                  <div key={label} className="flex flex-col gap-1 rounded-2xl bg-raised p-3">
                    <dt className="order-2 text-[13px] text-muted">{label}</dt>
                    <dd className={cn('order-1 m-0 text-2xl font-semibold tabular-nums', color)}>{value}</dd>
                  </div>
                ))}
              </dl>
              {stats.activeActions > 0 && (
                <ProgressBar
                  value={stats.completionPercentage}
                  tone={stats.completionPercentage >= 100 ? 'success' : 'brand'}
                  label={`${Math.round(stats.completionPercentage)}% of actions done`}
                />
              )}
              {days.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h3 className="m-0 text-sm font-semibold">Completed actions per day</h3>
                  <ActivityChart days={days} caption={`Completed actions per day for ${goal.title}`} />
                </div>
              )}
              <p className="m-0 text-sm leading-relaxed text-muted">
                These numbers measure activity. The analysis also reads your reflections, because
                finishing tasks is not the same as meaningful progress.
              </p>
            </>
          )}

          <ProgressAnalysis goalId={goal.id} />

          <GoalSuggestions goal={goal} onAccepted={detail.reload} />

          <GoalActions goal={goal} onChanged={detail.reload} />

          <div className="flex flex-wrap gap-2 border-t border-line pt-4">
            <Button variant="secondary" onClick={() => setEditing(true)}>Edit goal</Button>
            {goal.status === 'active' ? (
              <>
                <Button variant="secondary" loading={busy === 'paused'} onClick={() => setStatus('paused')}>
                  Pause
                </Button>
                <Button variant="secondary" loading={busy === 'completed'} onClick={() => setStatus('completed')}>
                  Mark completed
                </Button>
              </>
            ) : (
              <Button variant="secondary" loading={busy === 'active'} onClick={() => setStatus('active')}>
                Make active again
              </Button>
            )}
            <Button variant="danger" loading={busy === 'delete'} onClick={remove} className="ml-auto">
              Delete goal
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}

export default function Goals() {
  const toast = useToast();
  const [status, setStatus] = useState('active');
  const goals = useResource(() => api.fetchGoals(status), [status]);
  const [selectedId, setSelectedId] = useState(null);
  const [creating, setCreating] = useState(false);

  const list = goals.data ?? [];
  const selected = list.find((goal) => goal.id === selectedId) ?? list[0] ?? null;

  function selectGoal(id) {
    setSelectedId(id);

    // On narrow screens the detail sits below the list; bring it into view.
    if (window.matchMedia?.('(max-width: 1279px)').matches) {
      requestAnimationFrame(() =>
        document.getElementById('goal-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      );
    }
  }

  return (
    <>
      <PageHeader title="Goals & vision">
        <Button onClick={() => setCreating(true)} disabled={creating}>
          <Plus aria-hidden="true" className="size-[18px]" />
          New goal
        </Button>
      </PageHeader>

      <VisionSection />

      {creating && (
        <Card aria-labelledby="new-goal-heading" className="flex flex-col gap-4">
          <SectionTitle id="new-goal-heading">New goal</SectionTitle>
          <GoalForm
            submitLabel="Add goal"
            onCancel={() => setCreating(false)}
            onSubmit={async (fields) => {
              const goal = await api.createGoal(fields);
              toast.show(`Goal “${goal.title}” added. Ask the AI Planner for first steps.`);
              setCreating(false);
              setStatus('active');
              await goals.reload();
              setSelectedId(goal.id);
            }}
          />
        </Card>
      )}

      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
        <section aria-labelledby="goal-list-heading" className="flex min-w-0 flex-col gap-3 xl:w-[380px] xl:flex-none">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SectionTitle id="goal-list-heading">{humanize(status)} goals</SectionTitle>
          </div>
          <div role="group" aria-label="Filter goals by status" className="flex gap-1 overflow-x-auto rounded-xl bg-hover p-1">
            {GOAL_STATUSES.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={status === option.value}
                onClick={() => {
                  setStatus(option.value);
                  setSelectedId(null);
                }}
                className={cn(
                  'min-h-9 flex-1 whitespace-nowrap rounded-lg px-3 text-[13px]',
                  status === option.value ? 'bg-surface font-semibold' : 'text-ink-soft',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          {goals.loading && !goals.data && <LoadingBlock label="Loading goals" />}
          {goals.error && <ErrorBlock message={errorMessage(goals.error)} onRetry={goals.reload} />}
          {goals.data && list.length === 0 && (
            <Card className="!p-4 text-[15px] text-ink-soft">
              {status === 'active'
                ? 'No active goals. Add one to start getting suggestions.'
                : `No ${status} goals.`}
            </Card>
          )}

          {list.map((goal) => (
            <button
              key={goal.id}
              type="button"
              onClick={() => selectGoal(goal.id)}
              aria-pressed={selected?.id === goal.id}
              className={cn(
                'flex w-full flex-col gap-2 rounded-2xl bg-surface px-4 py-3.5 text-left shadow-[var(--shadow-card)] transition-[transform,box-shadow] hover:-translate-y-0.5',
                selected?.id === goal.id ? 'border-2 border-brand' : 'border border-line hover:border-field',
              )}
            >
              <span className="text-base font-semibold leading-snug">{goal.title}</span>
              {isPlaceholderGoal(goal) && <Badge className="self-start">Test goal · not used for suggestions</Badge>}
              <span className="text-[13px] text-muted">
                {goal.targetDate ? `Target ${formatShortDate(goal.targetDate)}` : 'No target date'}
              </span>
            </button>
          ))}
        </section>

        <div id="goal-detail" className="min-w-0 flex-1 scroll-mt-4">
          {selected && (
            <GoalDetail
              key={selected.id}
              goal={selected}
              onChanged={goals.reload}
            />
          )}
        </div>
      </div>
    </>
  );
}
