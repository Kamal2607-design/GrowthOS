import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Brain, CalendarCheck, Lightbulb, MessageCircleQuestion, Plus, Sparkles, Target, Wand2 } from 'lucide-react';

import * as api from '../lib/api.js';
import { useAppData } from '../lib/AppDataContext.jsx';
import { localDateKey } from '../lib/format.js';
import { isPlaceholderGoal, shortGoalName } from '../lib/goals.js';
import { errorMessage, generationErrorMessage } from '../lib/messages.js';
import { useResource } from '../lib/useResource.js';
import SuggestionCard from '../components/SuggestionCard.jsx';
import { useToast } from '../components/Toast.jsx';
import {
  AiBadge,
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBlock,
  LoadingBlock,
  PageHeader,
  ProposalCard,
  SectionTitle,
  Select,
  TextArea,
  cn,
} from '../components/ui.jsx';

const EXAMPLES = [
  'Plan my next three days for my most important goal',
  'I keep skipping workouts. What small steps would help?',
  'What should I focus on this week?',
];

function plural(count, word, pluralWord = `${word}s`) {
  return `${count} ${count === 1 ? word : pluralWord}`;
}

function aiFailure(error) {
  if (error?.status === 503 || error?.code === 'AI_UNAVAILABLE') {
    return 'The AI is offline. Start Ollama and try again.';
  }
  if (error?.status === 502) {
    return 'The AI returned an answer GrowthOS could not use. Try again or rephrase.';
  }
  return errorMessage(error);
}

function Composer({ initialQuestion, onPlanned }) {
  const toast = useToast();
  const [text, setText] = useState(initialQuestion ?? '');
  const [mode, setMode] = useState(null);
  const [plan, setPlan] = useState(null);
  const [answer, setAnswer] = useState(null);
  const [error, setError] = useState('');
  const [added, setAdded] = useState({});

  const busy = mode !== null;

  async function makePlan() {
    setMode('plan');
    setError('');
    setAnswer(null);

    try {
      const result = await api.runActionPlanner(text.trim());
      setPlan(result);
      await onPlanned();
    } catch (cause) {
      setError(aiFailure(cause));
    } finally {
      setMode(null);
    }
  }

  async function ask() {
    setMode('ask');
    setError('');
    setPlan(null);

    try {
      setAnswer(await api.askGrowthOS(text.trim()));
      setAdded({});
    } catch (cause) {
      setError(aiFailure(cause));
    } finally {
      setMode(null);
    }
  }

  async function addRecommendation(item, index) {
    try {
      await api.createAction({ title: item.title, description: item.reason ?? null });
      setAdded((previous) => ({ ...previous, [index]: true }));
      toast.show(`Added “${item.title}” to your actions.`);
    } catch (cause) {
      toast.show(errorMessage(cause), { tone: 'danger' });
    }
  }

  const insights = answer?.answer?.keyInsights ?? [];
  const recommendations = answer?.answer?.recommendedActions ?? [];

  return (
    <Card aria-labelledby="composer-heading" className="relative flex flex-col gap-4 overflow-hidden">
      <div className="ai-gradient pointer-events-none absolute -right-20 -top-20 size-56 rounded-full opacity-15 blur-3xl" />
      <div className="relative flex flex-col gap-1">
        <SectionTitle id="composer-heading">What do you want to work on?</SectionTitle>
        <p className="m-0 text-sm text-muted">
          GrowthOS gives Qwen your vision, goals, recent actions, reflections and relevant memories.
        </p>
      </div>

      <label className="relative flex flex-col gap-1.5 text-sm font-medium">
        <span className="sr-only">Your request</span>
        <TextArea
          rows={3}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Describe a goal, a problem or a question…"
        />
      </label>

      <div className="relative flex flex-wrap gap-2">
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => setText(example)}
            className="min-h-9 rounded-full border border-line-strong bg-surface px-3 text-[13px] text-ink-soft transition-colors hover:border-brand hover:text-brand-ink"
          >
            {example}
          </button>
        ))}
      </div>

      <div className="relative flex flex-wrap gap-2">
        <Button variant="ai" onClick={makePlan} loading={mode === 'plan'} disabled={busy || !text.trim()}>
          {mode !== 'plan' && <Wand2 aria-hidden="true" className="size-4" />}
          {mode === 'plan' ? 'Planning…' : 'Make a plan'}
        </Button>
        <Button variant="secondary" onClick={ask} loading={mode === 'ask'} disabled={busy || !text.trim()}>
          {mode !== 'ask' && <MessageCircleQuestion aria-hidden="true" className="size-4" />}
          {mode === 'ask' ? 'Thinking…' : 'Ask GrowthOS'}
        </Button>
      </div>

      {busy && (
        <Alert>
          <span className="inline-flex items-center gap-2">
            <Brain aria-hidden="true" className="size-4 animate-pulse text-brand-ink" />
            Qwen is working on your machine. This usually takes 10 to 40 seconds.
          </span>
        </Alert>
      )}
      {error && <Alert tone="warning">{error}</Alert>}

      {plan && (
        <Alert tone="success">
          {plan.suggestions.length > 0
            ? `${plural(plan.suggestions.length, 'new suggestion')} added to your inbox below.`
            : 'Nothing new: everything the plan proposed is already on your list.'}
          {plan.skippedCount > 0 && ` ${plural(plan.skippedCount, 'idea')} skipped because you already have them.`}
        </Alert>
      )}

      {answer && (
        <ProposalCard as="section" aria-label="GrowthOS answer" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <AiBadge>Answer</AiBadge>
            {answer.contextSummary && (
              <span className="text-xs text-muted">
                Based on {plural(answer.contextSummary.goals, 'goal')}, {plural(answer.contextSummary.actions, 'action')},{' '}
                {plural(answer.contextSummary.reflections, 'reflection')} and {plural(answer.contextSummary.memories, 'memory', 'memories')}
              </span>
            )}
          </div>
          <p className="m-0 whitespace-pre-line text-[15px] leading-relaxed">{answer.answer?.answer}</p>

          {insights.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="m-0 flex items-center gap-2 text-sm font-semibold">
                <Lightbulb aria-hidden="true" className="size-4 text-warn" />
                Key insights
              </h3>
              <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-sm leading-relaxed text-ink-soft">
                {insights.map((insight, index) => (
                  <li key={index}>{typeof insight === 'string' ? insight : insight?.text ?? JSON.stringify(insight)}</li>
                ))}
              </ul>
            </div>
          )}

          {recommendations.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="m-0 text-sm font-semibold">Suggested next steps</h3>
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {recommendations.map((item, index) => (
                  <li key={index} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface p-3">
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="font-medium">{item.title}</span>
                      {item.reason && <span className="text-sm text-muted">{item.reason}</span>}
                    </span>
                    <Button
                      variant={added[index] ? 'ghost' : 'secondary'}
                      className="min-h-10 text-sm"
                      disabled={added[index]}
                      onClick={() => addRecommendation(item, index)}
                    >
                      {added[index] ? 'Added' : (
                        <>
                          <Plus aria-hidden="true" className="size-4" />
                          Add as action
                        </>
                      )}
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </ProposalCard>
      )}
    </Card>
  );
}

function Generators({ goals, onGenerated }) {
  const toast = useToast();
  const [state, setState] = useState({ running: null, notice: null });
  const plannable = goals.filter((goal) => !isPlaceholderGoal(goal));
  const [goalId, setGoalId] = useState('');

  useEffect(() => {
    if (!goalId && plannable[0]) setGoalId(String(plannable[0].id));
  }, [goalId, plannable]);

  async function daily() {
    setState({ running: 'daily', notice: null });

    try {
      const result = await api.generateSuggestions();
      const basis = result.intelligence
        ? ` Used ${plural(result.intelligence.relevantMemoryCount, 'memory', 'memories')} and progress for ${plural(result.intelligence.goalProgressCount, 'goal')}.`
        : '';
      setState({
        running: null,
        notice: {
          tone: 'success',
          text: `${plural(result.createdCount, 'new suggestion')} for today.${basis}${result.attempts > 1 ? ' The first draft was rejected by validation and re-planned automatically.' : ''}`,
        },
      });
      toast.show(`${plural(result.createdCount, 'new suggestion')} ready.`);
      await onGenerated();
    } catch (error) {
      setState({
        running: null,
        notice: {
          tone: error.status === 409 ? 'info' : error.status === 503 ? 'danger' : 'warning',
          text: generationErrorMessage(error),
        },
      });
    }
  }

  async function forGoal() {
    if (!goalId) return;
    setState({ running: 'goal', notice: null });

    try {
      const result = await api.generateGoalSuggestions(Number(goalId));
      setState({
        running: null,
        notice: {
          tone: result.suggestions.length > 0 ? 'success' : 'info',
          text: result.suggestions.length > 0
            ? `${plural(result.suggestions.length, 'new suggestion')} for this goal.${result.skippedCount ? ` ${result.skippedCount} skipped as already planned.` : ''}`
            : 'Nothing new for this goal: everything proposed is already planned.',
        },
      });
      await onGenerated();
    } catch (error) {
      setState({ running: null, notice: { tone: 'warning', text: aiFailure(error) } });
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card interactive aria-labelledby="daily-heading" className="flex flex-col gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-brand-soft text-brand-ink">
          <CalendarCheck aria-hidden="true" className="size-5" />
        </span>
        <SectionTitle id="daily-heading" className="!text-lg">Suggestions for today</SectionTitle>
        <p className="m-0 text-sm leading-relaxed text-muted">
          The daily planner reads today's actions, your reflection, memories and goal progress, and
          proposes 1 to 3 next steps. Each one is checked for duplicates, the right goal and grounding.
        </p>
        <Button variant="ai" className="mt-auto self-start" onClick={daily} loading={state.running === 'daily'} disabled={Boolean(state.running)}>
          {state.running !== 'daily' && <Sparkles aria-hidden="true" className="size-4" />}
          {state.running === 'daily' ? 'Planning your day…' : 'Plan my day'}
        </Button>
      </Card>

      <Card interactive aria-labelledby="goal-gen-heading" className="flex flex-col gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-success-soft text-success">
          <Target aria-hidden="true" className="size-5" />
        </span>
        <SectionTitle id="goal-gen-heading" className="!text-lg">Ideas for one goal</SectionTitle>
        <p className="m-0 text-sm leading-relaxed text-muted">
          Get several concrete actions for a single goal. Anything already on your list is skipped.
        </p>
        {plannable.length === 0 ? (
          <p className="m-0 text-sm text-muted">Add an active goal first.</p>
        ) : (
          <div className="mt-auto flex flex-wrap items-end gap-2">
            <label className="flex min-w-[180px] flex-1 flex-col gap-1.5 text-sm font-medium">
              Goal
              <Select value={goalId} onChange={(event) => setGoalId(event.target.value)}>
                {plannable.map((goal) => (
                  <option key={goal.id} value={goal.id}>{goal.title}</option>
                ))}
              </Select>
            </label>
            <Button variant="secondary" onClick={forGoal} loading={state.running === 'goal'} disabled={Boolean(state.running)}>
              {state.running !== 'goal' && <Wand2 aria-hidden="true" className="size-4" />}
              Suggest actions
            </Button>
          </div>
        )}
      </Card>

      {state.running && (
        <Alert className="md:col-span-2">Qwen is planning on your machine. With one automatic re-plan this can take up to a minute.</Alert>
      )}
      {state.notice && (
        <Alert tone={state.notice.tone} className="md:col-span-2">{state.notice.text}</Alert>
      )}
    </div>
  );
}

function Inbox({ suggestions, goals, timeZone, todayKey, onChanged }) {
  const toast = useToast();
  const [busy, setBusy] = useState({});
  const [filter, setFilter] = useState('all');
  const [clearing, setClearing] = useState(false);

  const goalsById = useMemo(() => new Map(goals.map((goal) => [goal.id, goal])), [goals]);

  const filtered = suggestions.filter((suggestion) => {
    if (filter === 'all') return true;
    if (filter === 'none') return suggestion.goalId == null;
    return String(suggestion.goalId) === filter;
  });

  const sorted = [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const fresh = sorted.filter((item) => localDateKey(item.createdAt, timeZone) === todayKey);
  const older = sorted.filter((item) => localDateKey(item.createdAt, timeZone) !== todayKey);

  const filterOptions = [
    { value: 'all', label: `All · ${suggestions.length}` },
    ...goals
      .filter((goal) => suggestions.some((item) => item.goalId === goal.id))
      .map((goal) => ({ value: String(goal.id), label: shortGoalName(goal) })),
    ...(suggestions.some((item) => item.goalId == null) ? [{ value: 'none', label: 'No goal' }] : []),
  ];

  async function decide(suggestion, accept) {
    setBusy((previous) => ({ ...previous, [suggestion.id]: accept ? 'accept' : 'reject' }));

    try {
      if (accept) {
        await api.acceptSuggestion(suggestion.id);
        toast.show(`Added “${suggestion.title}” to your actions.`);
      } else {
        await api.rejectSuggestion(suggestion.id);
      }
      await onChanged();
    } catch (error) {
      toast.show(errorMessage(error), { tone: 'danger' });
      await onChanged();
    } finally {
      setBusy((previous) => ({ ...previous, [suggestion.id]: undefined }));
    }
  }

  async function dismissOlder() {
    if (!window.confirm(`Dismiss ${plural(older.length, 'older suggestion')}? This can't be undone.`)) return;
    setClearing(true);

    const results = await Promise.allSettled(older.map((item) => api.rejectSuggestion(item.id)));
    const failed = results.filter((result) => result.status === 'rejected').length;

    toast.show(
      failed
        ? `Dismissed ${older.length - failed}; ${failed} could not be dismissed.`
        : `Dismissed ${plural(older.length, 'older suggestion')}.`,
      { tone: failed ? 'warning' : 'info' },
    );
    setClearing(false);
    await onChanged();
  }

  const renderList = (list) =>
    list.map((suggestion, index) => (
      <SuggestionCard
        key={suggestion.id}
        suggestion={suggestion}
        goalName={goalsById.get(suggestion.goalId) ? shortGoalName(goalsById.get(suggestion.goalId)) : null}
        busy={busy[suggestion.id]}
        onAccept={(item) => decide(item, true)}
        onReject={(item) => decide(item, false)}
        style={{ animationDelay: `${Math.min(index, 6) * 50}ms` }}
      />
    ));

  return (
    <section aria-labelledby="inbox-heading" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <SectionTitle id="inbox-heading">Suggestion inbox</SectionTitle>
          <p className="m-0 text-sm text-muted">Every pending suggestion, from any planner. Accept to add it to your actions.</p>
        </div>
        {older.length > 0 && (
          <Button variant="danger" onClick={dismissOlder} loading={clearing}>
            Dismiss {plural(older.length, 'older suggestion')}
          </Button>
        )}
      </div>

      {filterOptions.length > 2 && (
        <div role="group" aria-label="Filter suggestions by goal" className="flex flex-wrap gap-2">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={filter === option.value}
              onClick={() => setFilter(option.value)}
              className={cn(
                'min-h-9 rounded-full px-3.5 text-sm transition-colors',
                filter === option.value
                  ? 'bg-brand font-semibold text-white'
                  : 'border border-line-strong bg-surface text-ink-soft hover:bg-hover',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {suggestions.length === 0 && (
        <EmptyState icon={Sparkles} title="Your inbox is clear">
          Ask for a plan above, or use “Plan my day” to get fresh suggestions.
        </EmptyState>
      )}

      {fresh.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="m-0 flex items-center gap-2 text-sm font-semibold">
            New today <Badge tone="brand">{fresh.length}</Badge>
          </h3>
          {renderList(fresh)}
        </div>
      )}

      {older.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="m-0 flex items-center gap-2 text-sm font-semibold text-muted">
            Earlier <Badge>{older.length}</Badge>
          </h3>
          {renderList(older)}
        </div>
      )}
    </section>
  );
}

export default function Planner() {
  const [params] = useSearchParams();
  const { refreshCounts } = useAppData();
  const today = useResource(api.fetchToday, []);
  const suggestions = useResource(() => api.fetchSuggestions('pending'), []);

  const refresh = async () => {
    await suggestions.reload();
    refreshCounts();
  };

  const context = today.data;

  return (
    <>
      <PageHeader eyebrow="Powered by Qwen, running on your machine" title={<span className="ai-gradient-text">AI Planner</span>}>
        <p className="m-0 max-w-md text-sm text-muted">
          AI proposes, you decide. Suggestions wait here until you accept or dismiss them.
        </p>
      </PageHeader>

      <Composer initialQuestion={params.get('ask') ?? ''} onPlanned={refresh} />

      {context && <Generators goals={context.goals.active} onGenerated={refresh} />}
      {today.error && !context && <ErrorBlock message={errorMessage(today.error)} onRetry={today.reload} />}

      {suggestions.loading && !suggestions.data ? (
        <LoadingBlock label="Loading suggestions" />
      ) : suggestions.error && !suggestions.data ? (
        <ErrorBlock message={errorMessage(suggestions.error)} onRetry={suggestions.reload} />
      ) : (
        <Inbox
          suggestions={suggestions.data ?? []}
          goals={context?.goals?.active ?? []}
          timeZone={context?.timeZone}
          todayKey={context?.date}
          onChanged={refresh}
        />
      )}
    </>
  );
}
