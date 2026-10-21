import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarCheck,
  Flame,
  ListTodo,
  NotebookPen,
  Sparkles,
  Target,
} from 'lucide-react';

import * as api from '../lib/api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { useAppData } from '../lib/AppDataContext.jsx';
import { formatDayHeading, formatShortDate, humanize, localDateKey, parseList } from '../lib/format.js';
import { isPlaceholderGoal, shortGoalName } from '../lib/goals.js';
import { completionStreak, dailyActivity, firstName, greeting, reflectionStreak } from '../lib/insights.js';
import { errorMessage } from '../lib/messages.js';
import { useResource } from '../lib/useResource.js';
import { ActivityChart, ProgressRing, ScoreLine } from '../components/charts.jsx';
import SuggestionCard from '../components/SuggestionCard.jsx';
import { useToast } from '../components/Toast.jsx';
import {
  AiBadge,
  Badge,
  Button,
  Card,
  ErrorBlock,
  PageHeader,
  ProgressBar,
  SectionTitle,
  Skeleton,
  StatTile,
  TextInput,
} from '../components/ui.jsx';

const MOOD_LABELS = {
  very_bad: 'Very bad',
  bad: 'Bad',
  neutral: 'Neutral',
  good: 'Good',
  very_good: 'Very good',
};

const TREND_TONES = {
  improving: 'success',
  stable: 'progress',
  declining: 'danger',
};

function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading dashboard" className="flex flex-col gap-4">
      <div className="grid gap-4 xl:grid-cols-[1.2fr_2fr]">
        <Skeleton className="h-52" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}

function Onboarding() {
  const steps = [
    { icon: Sparkles, title: 'Write your vision', text: 'Who do you want to become? Everything else builds on this.', to: '/goals', cta: 'Write vision' },
    { icon: Target, title: 'Add a goal or two', text: 'Goals turn the vision into something you can measure.', to: '/goals', cta: 'Add goals' },
    { icon: CalendarCheck, title: 'Plan your day with AI', text: 'Qwen suggests small, concrete actions. You decide what to keep.', to: '/planner', cta: 'Open AI Planner' },
  ];

  return (
    <Card className="relative overflow-hidden">
      <div className="ai-gradient pointer-events-none absolute -right-24 -top-24 size-64 rounded-full opacity-20 blur-3xl" />
      <div className="relative flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <AiBadge className="self-start">Welcome to GrowthOS</AiBadge>
          <h2 className="m-0 font-display text-2xl font-semibold">Let's turn your vision into today's actions</h2>
          <p className="m-0 max-w-2xl text-base leading-relaxed text-ink-soft">
            Three steps to your first plan. AI proposes, you decide: nothing is added until you accept it.
          </p>
        </div>
        <ol className="m-0 grid list-none gap-3 p-0 md:grid-cols-3">
          {steps.map(({ icon: Icon, title, text, to, cta }, index) => (
            <li key={title} className="flex animate-fade-up flex-col gap-3 rounded-2xl border border-line bg-raised p-4" style={{ animationDelay: `${index * 80}ms` }}>
              <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand-ink">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <span className="font-semibold">{index + 1}. {title}</span>
              <span className="text-sm leading-relaxed text-muted">{text}</span>
              <Link to={to} className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-brand-ink">
                {cta}
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { refreshCounts } = useAppData();
  const toast = useToast();
  const navigate = useNavigate();

  const today = useResource(api.fetchToday, []);
  const actions = useResource(() => api.fetchActions(), []);
  const reflections = useResource(api.fetchReflections, []);

  const context = today.data;
  const activeGoals = context?.goals?.active ?? [];
  const goalIdsKey = activeGoals.map((goal) => goal.id).join(',');
  const progress = useResource(
    () => Promise.all(activeGoals.map((goal) => api.fetchGoalProgress(goal.id).catch(() => null))),
    [goalIdsKey],
  );

  const [busy, setBusy] = useState({});
  const [question, setQuestion] = useState('');

  const goalsById = useMemo(() => new Map(activeGoals.map((goal) => [goal.id, goal])), [activeGoals]);

  if (today.loading && !context) {
    return (
      <>
        <PageHeader eyebrow="Loading your day" title={greeting()} />
        <DashboardSkeleton />
      </>
    );
  }

  if (today.error && !context) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <ErrorBlock message={errorMessage(today.error)} onRetry={today.reload} />
      </>
    );
  }

  const { date, timeZone } = context;
  const name = firstName(user);
  const isNewUser = !context.vision && activeGoals.length === 0;

  const activity = dailyActivity(actions.data ?? [], date, timeZone, 14);
  const streak = completionStreak(activity);
  const reflectStreak = reflectionStreak(reflections.data ?? [], date, timeZone);
  const twoWeekTotal = activity.reduce((sum, day) => sum + day.completed, 0);
  const bestDay = activity.reduce((best, day) => (day.completed > (best?.completed ?? 0) ? day : best), null);

  const overdueIds = new Set(context.actions.overdue.map((action) => action.id));
  const dueToday = context.actions.pending.filter(
    (action) => !overdueIds.has(action.id) && localDateKey(action.dueDate, timeZone) === date,
  );
  const focus = [...context.actions.inProgress, ...context.actions.overdue.filter((a) => a.status === 'pending'), ...dueToday];
  const doneToday = context.actions.completedToday.length;
  const focusTotal = focus.length + doneToday;
  const focusPct = focusTotal ? (doneToday / focusTotal) * 100 : 0;
  const openCount = context.actions.pending.length + context.actions.inProgress.length;

  const pendingSuggestions = context.suggestions.pending;
  const topSuggestions = [...pendingSuggestions]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 2);

  const recentReflections = (reflections.data ?? [])
    .filter((item) => Number.isFinite(item.productivity))
    .slice(0, 14)
    .reverse()
    .map((item) => ({
      key: item.id,
      value: item.productivity,
      label: formatShortDate(item.reflectionDate, timeZone),
      detail: MOOD_LABELS[item.mood] ? `mood ${MOOD_LABELS[item.mood].toLowerCase()}` : null,
    }));

  const analysis = context.reflectionAnalysis;

  async function decide(suggestion, accept) {
    setBusy((previous) => ({ ...previous, [suggestion.id]: accept ? 'accept' : 'reject' }));

    try {
      if (accept) {
        await api.acceptSuggestion(suggestion.id);
        toast.show(`Added “${suggestion.title}” to today's actions.`);
      } else {
        await api.rejectSuggestion(suggestion.id);
        toast.show('Suggestion dismissed.', { tone: 'info' });
      }
      await Promise.all([today.reload(), actions.reload()]);
      refreshCounts();
    } catch (error) {
      toast.show(errorMessage(error), { tone: 'danger' });
    } finally {
      setBusy((previous) => ({ ...previous, [suggestion.id]: undefined }));
    }
  }

  function ask(event) {
    event.preventDefault();
    navigate(`/planner?ask=${encodeURIComponent(question.trim())}`);
  }

  return (
    <>
      <PageHeader eyebrow={formatDayHeading(date)} title={`${greeting()}${name ? `, ${name}` : ''}`}>
        <div className="flex flex-wrap gap-2">
          {streak > 0 && (
            <Badge tone="energy" className="!px-3 !py-1 text-sm">
              <Flame aria-hidden="true" className="size-4" />
              {streak}-day streak
            </Badge>
          )}
          {reflectStreak > 1 && (
            <Badge tone="progress" className="!px-3 !py-1 text-sm">
              <NotebookPen aria-hidden="true" className="size-4" />
              Reflected {reflectStreak} days running
            </Badge>
          )}
        </div>
      </PageHeader>

      {isNewUser ? (
        <Onboarding />
      ) : (
        <>
          {context.vision && (
            <Link
              to="/goals"
              className="group flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-line bg-surface px-5 py-4 text-ink no-underline shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-lift)]"
            >
              <span className="flex min-w-0 flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted">Your vision</span>
                <span className="font-display text-lg font-medium">{context.vision.statement}</span>
              </span>
              <ArrowRight aria-hidden="true" className="size-5 text-muted transition-transform group-hover:translate-x-1" />
            </Link>
          )}

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,2fr)]">
            <Card aria-labelledby="focus-heading" className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-2">
                <SectionTitle id="focus-heading">Today's focus</SectionTitle>
                <Link to="/today" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-ink">
                  Open Today
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </div>
              <div className="flex items-center gap-5">
                <ProgressRing
                  value={focusPct}
                  tone={focusTotal > 0 && doneToday === focusTotal ? 'success' : 'brand'}
                  label={`${doneToday} of ${focusTotal} focus actions done today`}
                >
                  <span className="flex flex-col">
                    <span className="text-[44px] font-semibold leading-none tabular-nums">{doneToday}</span>
                    <span className="text-xs text-muted">of {focusTotal} done</span>
                  </span>
                </ProgressRing>
                <div className="flex min-w-0 flex-col gap-2 text-sm">
                  {focusTotal === 0 ? (
                    <p className="m-0 leading-relaxed text-ink-soft">
                      Nothing is due today. Accept a suggestion or add an action to set today's focus.
                    </p>
                  ) : doneToday === focusTotal ? (
                    <p className="m-0 font-semibold text-success">Everything due today is done. Great work.</p>
                  ) : (
                    <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                      {focus.slice(0, 3).map((action) => (
                        <li key={action.id} className="flex items-center gap-2">
                          <span
                            aria-hidden="true"
                            className={`size-2 flex-none rounded-full ${overdueIds.has(action.id) ? 'bg-danger' : action.status === 'in_progress' ? 'bg-progress-fill' : 'bg-brand'}`}
                          />
                          <span className="truncate">{action.title}</span>
                        </li>
                      ))}
                      {focus.length > 3 && <li className="text-muted">+{focus.length - 3} more</li>}
                    </ul>
                  )}
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <StatTile icon={ListTodo} value={openCount} label="Open actions" detail={`${context.actions.overdue.length} overdue`} to="/today" />
              <StatTile icon={Sparkles} tone="ai" value={pendingSuggestions.length} label="AI suggestions waiting" to="/planner" />
              <StatTile icon={Flame} tone="energy" value={streak} label="Day completion streak" detail={`${twoWeekTotal} done in 14 days`} />
              <StatTile icon={NotebookPen} tone="progress" value={reflectStreak} label="Day reflection streak" detail={context.reflection ? 'Reflected today' : 'Not yet today'} to="/reflect" />
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card aria-labelledby="activity-heading" className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <SectionTitle id="activity-heading">Completed actions, last 14 days</SectionTitle>
                <p className="m-0 text-sm text-muted">
                  {twoWeekTotal > 0
                    ? `${plural(twoWeekTotal, 'action')} completed${bestDay ? `; best day ${bestDay.label} with ${bestDay.completed}` : ''}.`
                    : 'Complete an action to start your activity history.'}
                </p>
              </div>
              {actions.loading && !actions.data ? <Skeleton className="h-40" /> : <ActivityChart days={activity} />}
            </Card>

            <Card aria-labelledby="insights-heading" className="relative flex flex-col gap-4 overflow-hidden">
              <div className="ai-gradient pointer-events-none absolute -right-16 -top-16 size-40 rounded-full opacity-15 blur-2xl" />
              <div className="relative flex items-center justify-between gap-2">
                <SectionTitle id="insights-heading">
                  <span className="ai-gradient-text">AI insights</span>
                </SectionTitle>
                <Link to="/planner" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-ink">
                  AI Planner
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </div>

              {analysis?.summary ? (
                <div className="relative flex flex-col gap-1.5 rounded-2xl bg-propose-soft p-4">
                  <span className="text-xs font-semibold uppercase tracking-wide text-propose-ink">From today's reflection</span>
                  <p className="m-0 text-[15px] leading-relaxed">{analysis.summary}</p>
                  {parseList(analysis.recommendedActions).length > 0 && (
                    <span className="text-sm text-muted">
                      {plural(parseList(analysis.recommendedActions).length, 'recommendation')} sent to your suggestions.
                    </span>
                  )}
                </div>
              ) : (
                <p className="relative m-0 rounded-2xl bg-raised p-4 text-sm leading-relaxed text-ink-soft">
                  {context.reflection
                    ? 'Your reflection is saved. Analyse it on the Reflect page to get an AI insight here.'
                    : 'Reflect tonight and Qwen will summarise your day and recommend next steps here.'}
                </p>
              )}

              <div className="relative flex flex-col gap-3">
                {topSuggestions.length > 0 ? (
                  topSuggestions.map((suggestion) => (
                    <SuggestionCard
                      key={suggestion.id}
                      compact
                      suggestion={suggestion}
                      goalName={goalsById.get(suggestion.goalId) ? shortGoalName(goalsById.get(suggestion.goalId)) : null}
                      busy={busy[suggestion.id]}
                      onAccept={(item) => decide(item, true)}
                      onReject={(item) => decide(item, false)}
                    />
                  ))
                ) : (
                  <Button variant="ai" onClick={() => navigate('/planner')} className="self-start">
                    <Sparkles aria-hidden="true" className="size-4" />
                    Get suggestions for today
                  </Button>
                )}
              </div>

              <form onSubmit={ask} className="relative mt-auto flex items-end gap-2" role="search" aria-label="Ask GrowthOS">
                <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium">
                  Ask GrowthOS
                  <TextInput
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    placeholder="e.g. What should I focus on this week?"
                  />
                </label>
                <Button type="submit" variant="ai" disabled={!question.trim()} aria-label="Ask">
                  <ArrowRight aria-hidden="true" className="size-5" />
                </Button>
              </form>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <Card aria-labelledby="goals-heading" className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-2">
                <SectionTitle id="goals-heading">Goal progress</SectionTitle>
                <Link to="/goals" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-ink">
                  All goals
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </div>
              {activeGoals.length === 0 && (
                <p className="m-0 text-sm text-muted">No active goals. <Link to="/goals" className="font-semibold text-brand-ink">Add one</Link> to track progress.</p>
              )}
              <ul className="m-0 flex list-none flex-col gap-4 p-0">
                {activeGoals.map((goal, index) => {
                  const data = progress.data?.length === activeGoals.length ? progress.data[index] : null;
                  const stats = data?.progress;
                  const trend = data?.activity?.trend;

                  return (
                    <li key={goal.id} className="flex animate-fade-up flex-col gap-2" style={{ animationDelay: `${index * 60}ms` }}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="min-w-0 flex-1 font-medium leading-snug">{goal.title}</span>
                        {isPlaceholderGoal(goal) ? (
                          <Badge>Test goal</Badge>
                        ) : (
                          trend && trend !== 'insufficient_data' && <Badge tone={TREND_TONES[trend] ?? 'neutral'}>{humanize(trend)}</Badge>
                        )}
                      </div>
                      <ProgressBar
                        value={stats?.completionPercentage ?? 0}
                        tone={stats && stats.completionPercentage >= 100 ? 'success' : 'brand'}
                        label={`${goal.title}: ${Math.round(stats?.completionPercentage ?? 0)}% of actions done`}
                      />
                      <span className="text-[13px] text-muted">
                        {stats
                          ? stats.activeActions > 0
                            ? `${stats.completedActions} of ${stats.activeActions} actions done · ${Math.round(stats.completionPercentage)}%`
                            : 'No actions yet. Ask the AI Planner for ideas.'
                          : progress.error
                            ? 'Progress unavailable'
                            : 'Loading progress…'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Card>

            <Card aria-labelledby="mood-heading" className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <SectionTitle id="mood-heading">Productivity from reflections</SectionTitle>
                <p className="m-0 text-sm text-muted">Your own 1–10 rating, last {recentReflections.length || 'few'} reflections.</p>
              </div>
              {recentReflections.length >= 2 ? (
                <ScoreLine points={recentReflections} caption="Productivity rating per reflection" />
              ) : (
                <p className="m-0 rounded-2xl bg-raised p-4 text-sm leading-relaxed text-ink-soft">
                  Rate your productivity when you reflect; your trend appears after two reflections.{' '}
                  <Link to="/reflect" className="font-semibold text-brand-ink">Reflect now</Link>
                </p>
              )}
            </Card>
          </div>
        </>
      )}
    </>
  );
}
