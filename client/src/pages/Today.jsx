import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Sparkles } from 'lucide-react';

import * as api from '../lib/api.js';
import { useAppData } from '../lib/AppDataContext.jsx';
import { formatDayHeading, formatShortDate, localDateKey } from '../lib/format.js';
import { isPlaceholderGoal, shortGoalName } from '../lib/goals.js';
import { errorMessage, generationErrorMessage } from '../lib/messages.js';
import { useResource } from '../lib/useResource.js';
import ActionForm from '../components/ActionForm.jsx';
import ActionRow from '../components/ActionRow.jsx';
import Confetti from '../components/Confetti.jsx';
import Dialog from '../components/Dialog.jsx';
import SuggestionCard from '../components/SuggestionCard.jsx';
import { useToast } from '../components/Toast.jsx';
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBlock,
  GroupLabel,
  LoadingBlock,
  PageHeader,
  ProgressBar,
  SectionTitle,
} from '../components/ui.jsx';

function plural(count, word, pluralWord = `${word}s`) {
  return `${count} ${count === 1 ? word : pluralWord}`;
}

export default function Today() {
  const toast = useToast();
  const { refreshCounts } = useAppData();
  const today = useResource(api.fetchToday, []);
  const context = today.data;

  const activeGoals = context?.goals?.active ?? [];
  const goalIdsKey = activeGoals.map((goal) => goal.id).join(',');

  const progress = useResource(
    () =>
      Promise.all(
        activeGoals.map((goal) =>
          api.fetchGoalProgress(goal.id).catch(() => null),
        ),
      ),
    [goalIdsKey],
  );

  const [busy, setBusy] = useState({});
  const [notice, setNotice] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [editor, setEditor] = useState(null);
  const [celebrate, setCelebrate] = useState(0);

  const goalsById = useMemo(
    () => new Map(activeGoals.map((goal) => [goal.id, goal])),
    [activeGoals],
  );

  if (today.loading && !context) {
    return (
      <>
        <PageHeader title="Today" />
        <LoadingBlock label="Loading today" />
      </>
    );
  }

  if (today.error && !context) {
    return (
      <>
        <PageHeader title="Today" />
        <ErrorBlock message={errorMessage(today.error)} onRetry={today.reload} />
      </>
    );
  }

  const { date, timeZone } = context;
  const reloadAll = () => Promise.all([today.reload(), progress.reload()]);

  const goalName = (goalId) => {
    const goal = goalsById.get(goalId);
    return goal ? shortGoalName(goal) : null;
  };

  const isTestAction = (action) => isPlaceholderGoal(goalsById.get(action.goalId));

  const overdue = context.actions.overdue;
  const overdueIds = new Set(overdue.map((action) => action.id));
  const inProgress = context.actions.inProgress.filter((action) => !overdueIds.has(action.id));
  const pending = context.actions.pending.filter((action) => !overdueIds.has(action.id));
  const completed = context.actions.completedToday;
  const openCount = overdue.length + inProgress.length + pending.length;
  const dayTotal = openCount + completed.length;

  const pendingSuggestions = context.suggestions.pending;
  const freshSuggestions = pendingSuggestions.filter(
    (suggestion) => localDateKey(suggestion.createdAt, timeZone) === date,
  );
  const olderSuggestions = pendingSuggestions.filter(
    (suggestion) => localDateKey(suggestion.createdAt, timeZone) !== date,
  );

  const isNewUser = !context.vision && activeGoals.length === 0;

  // Progress loaded for a different set of goals is stale, not unavailable.
  const progressPending =
    progress.loading || (progress.data?.length ?? -1) !== activeGoals.length;

  function actionMeta(action) {
    const parts = [];
    const name = goalName(action.goalId);

    if (name) parts.push(name);
    if (action.priority > 0) parts.push(`P${action.priority}`);

    if (action.dueDate) {
      parts.push(
        localDateKey(action.dueDate, timeZone) === date
          ? 'Due today'
          : `Due ${formatShortDate(action.dueDate, timeZone)}`,
      );
    }

    return parts.join(' · ');
  }

  async function runBusy(key, task) {
    setBusy((previous) => ({ ...previous, [key.id]: key.kind }));
    setNotice(null);

    try {
      return await task();
    } catch (error) {
      toast.show(errorMessage(error), { tone: 'danger' });
      await today.reload();
      return undefined;
    } finally {
      setBusy((previous) => {
        const next = { ...previous };
        delete next[key.id];
        return next;
      });
    }
  }

  const accept = (suggestion) =>
    runBusy({ id: `s${suggestion.id}`, kind: 'accept' }, async () => {
      await api.acceptSuggestion(suggestion.id);
      toast.show(`Added "${suggestion.title}" to your actions.`);
      await reloadAll();
      refreshCounts();
    });

  const reject = (suggestion) =>
    runBusy({ id: `s${suggestion.id}`, kind: 'reject' }, async () => {
      await api.rejectSuggestion(suggestion.id);
      toast.show('Suggestion dismissed.', { tone: 'info' });
      await today.reload();
      refreshCounts();
    });

  const toggleAction = (action) =>
    runBusy({ id: `a${action.id}`, kind: 'toggle' }, async () => {
      const completing = action.status !== 'completed';
      await api.setActionStatus(action.id, completing ? 'completed' : 'pending');
      const [next] = await reloadAll();

      if (!completing || !next) return;

      const remaining =
        next.actions.pending.length + next.actions.inProgress.length;

      if (remaining === 0) {
        setCelebrate(Date.now());
        toast.show('Everything is done. Take a moment to reflect tonight.');
      } else {
        toast.show(`Done: ${action.title}`);
      }
    });

  const startAction = (action) =>
    runBusy({ id: `a${action.id}`, kind: 'start' }, async () => {
      await api.setActionStatus(action.id, 'in_progress');
      toast.show(`Started: ${action.title}`, { tone: 'info' });
      await today.reload();
    });

  const deleteAction = (action) => {
    if (!window.confirm(`Delete “${action.title}”?`)) return undefined;

    return runBusy({ id: `a${action.id}`, kind: 'delete' }, async () => {
      await api.deleteAction(action.id);
      toast.show('Action deleted.', { tone: 'info' });
      await reloadAll();
    });
  };

  async function saveAction(fields) {
    if (editor?.action) {
      await api.updateAction(editor.action.id, fields);
      toast.show('Action updated.');
    } else {
      await api.createAction(fields);
      toast.show(`Added “${fields.title}”.`);
    }

    setEditor(null);
    await reloadAll();
  }

  async function generate() {
    setGenerating(true);
    setNotice(null);

    try {
      const result = await api.generateSuggestions();
      const basis = result.intelligence
        ? ` Based on ${plural(result.intelligence.relevantMemoryCount, 'memory', 'memories')} and progress for ${plural(result.intelligence.goalProgressCount, 'goal')}.`
        : '';
      setNotice({
        tone: 'success',
        text: `${plural(result.createdCount, 'new suggestion')} added.${basis}${
          result.attempts > 1 ? ' The first draft failed validation and was re-planned automatically.' : ''
        }`,
      });
      await today.reload();
      refreshCounts();
    } catch (error) {
      setNotice({
        tone: error.status === 409 ? 'info' : error.status === 503 ? 'danger' : 'warning',
        text: generationErrorMessage(error),
      });
    } finally {
      setGenerating(false);
    }
  }

  const renderActions = (list, options = {}) => (
    <ul className="m-0 list-none p-0">
      {list.map((action) => (
        <ActionRow
          key={action.id}
          action={action}
          meta={actionMeta(action)}
          metaTone={options.metaTone}
          isTest={isTestAction(action)}
          busy={Boolean(busy[`a${action.id}`])}
          onToggle={toggleAction}
          onStart={options.allowStart ? startAction : undefined}
          onEdit={(item) => setEditor({ action: item })}
          onDelete={deleteAction}
        />
      ))}
    </ul>
  );

  return (
    <>
      <Confetti trigger={celebrate} />

      <PageHeader eyebrow={timeZone} title={formatDayHeading(date)}>
        {!isNewUser && (
          <div className="flex w-full flex-col gap-2 sm:w-64">
            <p className="m-0 text-[15px] text-ink-soft">
              {inProgress.length} in progress · {pending.length + overdue.length} pending ·{' '}
              {completed.length} done today
            </p>
            {dayTotal > 0 && (
              <ProgressBar
                value={(completed.length / dayTotal) * 100}
                tone={completed.length === dayTotal ? 'success' : 'brand'}
                label={`${completed.length} of ${dayTotal} actions done`}
              />
            )}
          </div>
        )}
      </PageHeader>

      {isNewUser ? (
        <EmptyState
          icon={Sparkles}
          title="Start with where you want to go"
          action={
            <Link
              to="/goals"
              className="inline-flex min-h-11 items-center self-start rounded-xl bg-brand px-5 font-semibold text-white no-underline hover:brightness-110"
            >
              Write your vision
            </Link>
          }
        >
          GrowthOS turns your vision into small daily actions. Write your vision and one or two
          goals, and suggestions for today will appear here.
        </EmptyState>
      ) : (
        <>
          {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}

          <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
            <div className="flex min-w-0 flex-1 flex-col gap-6">
              <Card aria-labelledby="actions-heading" className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <SectionTitle id="actions-heading">Your actions</SectionTitle>
                  <Button variant="secondary" onClick={() => setEditor({ action: null })} className="hidden md:inline-flex">
                    <Plus aria-hidden="true" className="size-4" />
                    Add action
                  </Button>
                </div>

                {openCount === 0 && completed.length === 0 && (
                  <p className="m-0 text-[15px] text-muted">
                    No open actions. Add your own or accept a suggestion below.
                  </p>
                )}

                {inProgress.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <GroupLabel tone="progress">In progress · {inProgress.length}</GroupLabel>
                    {renderActions(inProgress)}
                  </div>
                )}

                {overdue.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <GroupLabel tone="danger">Overdue · {overdue.length}</GroupLabel>
                    {renderActions(overdue, { metaTone: 'danger', allowStart: true })}
                  </div>
                )}

                {pending.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <GroupLabel>Pending · {pending.length}</GroupLabel>
                    {renderActions(pending, { allowStart: true })}
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <GroupLabel tone="brand">Done today · {completed.length}</GroupLabel>
                  {completed.length === 0 ? (
                    <p className="m-0 py-2 text-sm text-muted">
                      Nothing finished yet. Tick an action when it's done.
                    </p>
                  ) : (
                    renderActions(completed)
                  )}
                </div>
              </Card>

              <section aria-labelledby="suggest-heading" className="flex flex-col gap-3.5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <SectionTitle id="suggest-heading">
                      <span className="ai-gradient-text">Suggested for today</span>
                    </SectionTitle>
                    <p className="m-0 text-sm text-muted">
                      AI proposes, you decide. Nothing is added until you accept it.
                    </p>
                  </div>
                  <Button variant="ai" onClick={generate} loading={generating}>
                    {!generating && <Sparkles aria-hidden="true" className="size-[18px]" />}
                    {generating ? 'Planning…' : 'Suggest actions'}
                  </Button>
                </div>

                <p className="m-0 text-[13px] text-muted">
                  Uses your vision, {plural(activeGoals.length, 'active goal')},{' '}
                  {plural(openCount, 'open action')}, relevant memories and goal progress.
                  {context.reflection ? ' Includes today’s reflection.' : ' No reflection yet today.'}
                </p>

                {generating && (
                  <Alert>Qwen is planning on your machine. This usually takes 10 to 40 seconds.</Alert>
                )}

                {freshSuggestions.map((suggestion, index) => (
                  <SuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    goalName={goalName(suggestion.goalId)}
                    busy={busy[`s${suggestion.id}`]}
                    onAccept={accept}
                    onReject={reject}
                    style={{ animationDelay: `${index * 60}ms` }}
                  />
                ))}

                {freshSuggestions.length === 0 && !generating && (
                  <Card className="!p-4 text-[15px] text-ink-soft">
                    No new suggestions today. Press <strong>Suggest actions</strong> to ask Qwen, or open the{' '}
                    <Link to="/planner" className="font-semibold text-brand-ink">AI Planner</Link> for more options.
                  </Card>
                )}

                {olderSuggestions.length > 0 && (
                  <details className="rounded-2xl border border-line bg-surface px-4 py-3">
                    <summary className="min-h-7 text-sm font-medium">
                      {plural(olderSuggestions.length, 'older suggestion')} still waiting
                    </summary>
                    <p className="mb-3 mt-2 text-sm text-muted">
                      Suggestions from earlier days. Dismiss the ones you won't do so they stop
                      blocking similar new ones, or clear them all in the{' '}
                      <Link to="/planner" className="font-semibold text-brand-ink">AI Planner</Link>.
                    </p>
                    <div className="flex flex-col gap-3">
                      {olderSuggestions.map((suggestion) => (
                        <SuggestionCard
                          key={suggestion.id}
                          suggestion={suggestion}
                          goalName={goalName(suggestion.goalId)}
                          busy={busy[`s${suggestion.id}`]}
                          onAccept={accept}
                          onReject={reject}
                        />
                      ))}
                    </div>
                  </details>
                )}
              </section>
            </div>

            <aside
              aria-label="Goals and reflection"
              className="flex w-full flex-col gap-6 xl:w-[340px] xl:flex-none"
            >
              <Card aria-labelledby="goals-heading" className="flex flex-col gap-4">
                <div className="flex items-baseline justify-between gap-2">
                  <SectionTitle id="goals-heading" className="!text-lg">
                    Active goals
                  </SectionTitle>
                  <Link to="/goals" className="text-sm font-semibold text-brand-ink">
                    View all
                  </Link>
                </div>

                {activeGoals.length === 0 && (
                  <p className="m-0 text-sm text-muted">No active goals yet.</p>
                )}

                {activeGoals.map((goal, index) => {
                  const data = progressPending ? null : progress.data?.[index];
                  const stats = data?.progress;
                  const test = isPlaceholderGoal(goal);

                  return (
                    <div key={goal.id} className="flex flex-col gap-2 border-b border-subtle pb-3.5 last:border-b-0 last:pb-0">
                      <span className="text-[15px] font-medium leading-snug">{goal.title}</span>
                      {stats && stats.activeActions > 0 && (
                        <ProgressBar
                          value={stats.completionPercentage}
                          label={`${goal.title}: ${Math.round(stats.completionPercentage)}% of actions done`}
                        />
                      )}
                      {test && <Badge className="self-start">Test goal · not used for suggestions</Badge>}
                      <span className="text-[13px] text-muted">
                        {stats
                          ? stats.activeActions > 0
                            ? `${stats.completedActions} of ${stats.activeActions} actions done · trend ${data.activity?.trend?.replace(/_/g, ' ') ?? 'unknown'}`
                            : 'No actions yet'
                          : progressPending
                            ? 'Loading progress…'
                            : 'Progress unavailable'}
                      </span>
                    </div>
                  );
                })}

                <p className="m-0 text-[13px] leading-relaxed text-muted">
                  Completed actions show activity. Your reflections show whether it felt like real
                  progress.
                </p>
              </Card>

              <Card aria-labelledby="reflect-heading" className="flex flex-col gap-3">
                <SectionTitle id="reflect-heading" className="!text-lg">
                  Today's reflection
                </SectionTitle>
                {context.reflection ? (
                  <>
                    <p className="m-0 line-clamp-4 text-[15px] leading-relaxed text-ink-soft">
                      {context.reflection.content}
                    </p>
                    <Link to="/reflect" className="text-sm font-semibold text-brand-ink">
                      {context.reflectionAnalysis ? 'View reflection and analysis' : 'View or analyse'}
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="m-0 text-[15px] leading-relaxed text-ink-soft">
                      You haven't reflected today. A few lines tonight help tomorrow's suggestions
                      fit how your day actually went.
                    </p>
                    <Link
                      to="/reflect"
                      className="inline-flex min-h-11 items-center self-start rounded-xl border border-line-strong px-4 text-sm font-medium text-ink no-underline hover:bg-hover"
                    >
                      Write reflection
                    </Link>
                  </>
                )}
              </Card>
            </aside>
          </div>

          <button
            type="button"
            onClick={() => setEditor({ action: null })}
            aria-label="Add action"
            className="fixed bottom-24 right-4 z-30 grid size-14 place-items-center rounded-2xl bg-brand text-white shadow-[0_12px_24px_-8px_rgb(106_61_245/0.8)] transition-transform active:scale-95 md:hidden"
          >
            <Plus aria-hidden="true" className="size-6" />
          </button>
        </>
      )}

      <Dialog
        open={Boolean(editor)}
        title={editor?.action ? 'Edit action' : 'Add an action'}
        onClose={() => setEditor(null)}
      >
        {editor && (
          <ActionForm
            key={editor.action?.id ?? 'new'}
            initial={editor.action}
            goals={activeGoals}
            submitLabel={editor.action ? 'Save changes' : 'Add action'}
            onSubmit={saveAction}
            onCancel={() => setEditor(null)}
          />
        )}
      </Dialog>
    </>
  );
}
