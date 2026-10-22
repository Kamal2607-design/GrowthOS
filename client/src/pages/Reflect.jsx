import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';

import * as api from '../lib/api.js';
import { useAppData } from '../lib/AppDataContext.jsx';
import { useToast } from '../components/Toast.jsx';
import {
  formatDayHeading,
  formatShortDate,
  localDateKey,
  parseList,
  parseObject,
  sortByDateDesc,
} from '../lib/format.js';
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
  ProposalCard,
  SectionTitle,
  TextArea,
  cn,
} from '../components/ui.jsx';

// Values accepted by the reflection API.
export const MOODS = [
  { value: 'very_bad', label: 'Very bad' },
  { value: 'bad', label: 'Bad' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'good', label: 'Good' },
  { value: 'very_good', label: 'Very good' },
];

const moodLabel = (value) => MOODS.find((mood) => mood.value === value)?.label ?? null;

const EMPTY_FORM = {
  content: '',
  mood: null,
  productivity: null,
  highlights: '',
  challenges: '',
  learnings: '',
};

function itemText(item) {
  if (typeof item === 'string') return item;
  return item?.title ?? item?.text ?? item?.summary ?? '';
}

function ReflectionForm({ initial, onSaved, onCancel }) {
  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    ...Object.fromEntries(
      Object.keys(EMPTY_FORM).map((key) => [key, initial?.[key] ?? EMPTY_FORM[key]]),
    ),
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const text = (key) => ({
    value: form[key] ?? '',
    onChange: (event) => setForm({ ...form, [key]: event.target.value }),
  });

  async function submit(event) {
    event.preventDefault();

    if (!form.content.trim()) {
      setError('Write at least a sentence about your day.');
      return;
    }

    setSaving(true);
    setError('');

    const fields = {
      content: form.content.trim(),
      mood: form.mood,
      productivity: form.productivity,
      highlights: form.highlights?.trim() || null,
      challenges: form.challenges?.trim() || null,
      learnings: form.learnings?.trim() || null,
    };

    try {
      await onSaved(fields);
    } catch (cause) {
      setError(errorMessage(cause));
      setSaving(false);
    }
  }

  return (
    <Card as="form" onSubmit={submit} aria-labelledby="form-heading" className="flex flex-col gap-5">
      <SectionTitle id="form-heading">How did today go?</SectionTitle>
      {error && <Alert tone="danger">{error}</Alert>}

      <Field label="In your own words (required)">
        <TextArea rows={5} placeholder="What happened today, and how did it feel?" {...text('content')} />
      </Field>

      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-2 p-0 text-sm font-medium">Mood</legend>
        <div className="flex flex-wrap gap-2">
          {MOODS.map((mood) => (
            <button
              key={mood.value}
              type="button"
              aria-pressed={form.mood === mood.value}
              onClick={() => setForm({ ...form, mood: form.mood === mood.value ? null : mood.value })}
              className={cn(
                'min-h-11 rounded-full px-4 text-sm font-medium',
                form.mood === mood.value
                  ? 'border-2 border-brand bg-brand-soft text-brand-strong'
                  : 'border border-line-strong bg-surface text-ink-soft hover:bg-hover',
              )}
            >
              {mood.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-2 p-0 text-sm font-medium">
          Productivity, 1 to 10{form.productivity ? ` · ${form.productivity}` : ''}
        </legend>
        <div className="grid max-w-[520px] grid-cols-5 gap-1.5 sm:grid-cols-10">
          {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={form.productivity === value}
              aria-label={`Productivity ${value}`}
              onClick={() =>
                setForm({ ...form, productivity: form.productivity === value ? null : value })
              }
              className={cn(
                'min-h-11 rounded-[10px] text-[15px] font-semibold',
                form.productivity === value
                  ? 'border-2 border-brand bg-brand text-white'
                  : 'border border-line-strong bg-surface text-ink-soft hover:bg-hover',
              )}
            >
              {value}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Field label="Highlights"><TextArea rows={3} {...text('highlights')} /></Field>
        <Field label="Challenges"><TextArea rows={3} {...text('challenges')} /></Field>
        <Field label="Learnings"><TextArea rows={3} {...text('learnings')} /></Field>
      </div>

      <div className="flex gap-2">
        <Button type="submit" loading={saving}>Save reflection</Button>
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>
        )}
      </div>
    </Card>
  );
}

function AnalysisView({ analysis, sentCount }) {
  const highlights = parseList(analysis.highlights).map(itemText).filter(Boolean);
  const challenges = parseList(analysis.challenges).map(itemText).filter(Boolean);
  const learnings = parseList(analysis.learnings).map(itemText).filter(Boolean);
  const alignment = parseList(analysis.goalAlignment);
  const recommended = parseList(analysis.recommendedActions);
  const progress = parseObject(analysis.progressAnalysis);

  return (
    <ProposalCard as="section" aria-labelledby="analysis-heading" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Badge tone="propose" className="self-start">AI analysis</Badge>
        <SectionTitle id="analysis-heading">What today shows</SectionTitle>
      </div>

      {analysis.summary && <p className="m-0 text-base leading-relaxed">{analysis.summary}</p>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          ['Highlights', highlights, 'text-brand-strong'],
          ['Challenges', challenges, 'text-danger'],
          ['Learnings', learnings, 'text-progress'],
        ]
          .filter(([, items]) => items.length)
          .map(([title, items, color]) => (
            <div key={title} className="flex flex-col gap-1.5">
              <h3 className={cn('m-0 text-sm font-semibold', color)}>{title}</h3>
              <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-sm leading-relaxed text-ink-soft">
                {items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          ))}
      </div>

      {(analysis.moodAnalysis || analysis.productivityAnalysis || progress?.summary) && (
        <div className="flex flex-col gap-1.5 text-sm leading-relaxed text-ink-soft">
          {analysis.moodAnalysis && <p className="m-0"><strong className="font-semibold text-ink">Mood:</strong> {analysis.moodAnalysis}</p>}
          {analysis.productivityAnalysis && <p className="m-0"><strong className="font-semibold text-ink">Productivity:</strong> {analysis.productivityAnalysis}</p>}
          {progress?.summary && <p className="m-0"><strong className="font-semibold text-ink">Actions:</strong> {progress.summary}</p>}
        </div>
      )}

      {alignment.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <h3 className="m-0 text-sm font-semibold">Goal alignment</h3>
          {alignment.map((item, index) => (
            <p key={`${item.goal}-${index}`} className="m-0 text-sm leading-relaxed text-ink-soft">
              <strong className="font-semibold text-ink">{item.goal}:</strong>{' '}
              {item.alignment ? `${item.alignment} alignment. ` : ''}
              {item.reason}
            </p>
          ))}
        </div>
      )}

      {recommended.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-propose pt-3">
          <h3 className="m-0 text-sm font-semibold">Recommended next</h3>
          <p className="m-0 text-sm text-muted">
            {sentCount > 0
              ? `${sentCount} of these were sent to Today as suggestions. Accept or dismiss them there.`
              : 'Recommendations become suggestions on Today when they are new.'}
          </p>
          <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-[15px]">
            {recommended.map((item, index) => (
              <li key={`${itemText(item)}-${index}`}>
                {itemText(item)}
                {item?.reason && <span className="text-sm text-muted"> · {item.reason}</span>}
              </li>
            ))}
          </ul>
          <Link to="/" className="self-start text-[15px] font-medium text-brand">Review on Today</Link>
        </div>
      )}
    </ProposalCard>
  );
}

export default function Reflect() {
  const toast = useToast();
  const { refreshCounts } = useAppData();
  const today = useResource(api.fetchToday, []);
  const history = useResource(api.fetchReflections, []);
  const [editing, setEditing] = useState(false);
  const [analysis, setAnalysis] = useState({ loading: false, error: null, data: null, sent: 0 });

  if (today.loading && !today.data) {
    return (
      <>
        <PageHeader title="Reflect" />
        <LoadingBlock label="Loading reflection" />
      </>
    );
  }

  if (today.error && !today.data) {
    return (
      <>
        <PageHeader title="Reflect" />
        <ErrorBlock message={errorMessage(today.error)} onRetry={today.reload} />
      </>
    );
  }

  const context = today.data;
  const reflection = context.reflection;
  const currentAnalysis = analysis.data ?? context.reflectionAnalysis;

  const earlier = sortByDateDesc(
    (history.data ?? []).filter(
      (item) => localDateKey(item.reflectionDate, context.timeZone) !== context.date,
    ),
    'reflectionDate',
  ).slice(0, 10);

  async function save(fields) {
    if (reflection) {
      await api.updateReflection(reflection.id, fields);
    } else {
      await api.createReflection(fields);
    }

    setEditing(false);
    setAnalysis({ loading: false, error: null, data: null, sent: 0 });
    toast.show(reflection ? 'Reflection updated.' : 'Reflection saved. Analyse it to get AI insights.');
    await Promise.all([today.reload(), history.reload()]);
  }

  async function removeEarlier(item) {
    if (!window.confirm('Delete this reflection? Its analysis is deleted too.')) return;

    try {
      await api.deleteReflection(item.id);
      toast.show('Reflection deleted.', { tone: 'info' });
      await history.reload();
    } catch (cause) {
      toast.show(errorMessage(cause), { tone: 'danger' });
    }
  }

  async function analyze() {
    setAnalysis({ loading: true, error: null, data: null, sent: 0 });

    try {
      const result = await api.analyzeReflection(reflection.id);
      const sent = result.suggestions?.length ?? 0;
      setAnalysis({
        loading: false,
        error: null,
        data: result.analysis,
        sent,
      });
      toast.show(sent ? `Analysis ready. ${sent} suggestion(s) sent to your inbox.` : 'Analysis ready.');
      refreshCounts();
    } catch (error) {
      setAnalysis({ loading: false, error, data: null, sent: 0 });
    }
  }

  return (
    <>
      <PageHeader eyebrow={formatDayHeading(context.date)} title="Reflect on today" />

      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {(!reflection || editing) && (
            <ReflectionForm
              key={reflection?.id ?? 'new'}
              initial={reflection}
              onSaved={save}
              onCancel={editing ? () => setEditing(false) : undefined}
            />
          )}

          {reflection && !editing && (
            <Card aria-labelledby="saved-heading" className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <SectionTitle id="saved-heading">Today's reflection</SectionTitle>
                <Badge tone="brand">Saved</Badge>
              </div>
              <p className="m-0 whitespace-pre-line text-base leading-relaxed">{reflection.content}</p>
              <p className="m-0 text-sm text-muted">
                {[
                  moodLabel(reflection.mood) && `Mood: ${moodLabel(reflection.mood)}`,
                  reflection.productivity && `Productivity ${reflection.productivity}/10`,
                ]
                  .filter(Boolean)
                  .join(' · ') || 'No mood or productivity recorded'}
              </p>
              {analysis.error && (
                <Alert tone="warning">
                  {analysis.error.status >= 500
                    ? 'The analysis could not be generated. Check that Ollama is running, then try again.'
                    : errorMessage(analysis.error)}
                </Alert>
              )}
              <div className="flex flex-wrap gap-2">
                <Button onClick={analyze} loading={analysis.loading}>
                  {analysis.loading ? 'Analysing…' : currentAnalysis ? 'Analyse again' : 'Analyse with AI'}
                </Button>
                <Button variant="secondary" onClick={() => setEditing(true)} disabled={analysis.loading}>
                  Edit
                </Button>
              </div>
            </Card>
          )}

          {reflection && !editing && currentAnalysis && (
            <AnalysisView analysis={currentAnalysis} sentCount={analysis.sent} />
          )}
        </div>

        <Card as="aside" aria-labelledby="history-heading" className="flex w-full flex-col gap-3 xl:w-[340px] xl:flex-none">
          <SectionTitle id="history-heading" className="!text-lg">Earlier reflections</SectionTitle>
          {history.loading && !history.data && <p className="m-0 text-sm text-muted">Loading…</p>}
          {history.error && <p className="m-0 text-sm text-danger">{errorMessage(history.error)}</p>}
          {history.data && earlier.length === 0 && (
            <p className="m-0 text-sm text-muted">Your past reflections will appear here.</p>
          )}
          {earlier.map((item) => (
            <article key={item.id} className="group flex flex-col gap-1 rounded-2xl bg-raised p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-muted">
                  {formatShortDate(item.reflectionDate, context.timeZone)}
                  {moodLabel(item.mood) ? ` · ${moodLabel(item.mood)}` : ''}
                  {item.productivity ? ` · ${item.productivity}/10` : ''}
                </span>
                <button
                  type="button"
                  onClick={() => removeEarlier(item)}
                  aria-label={`Delete reflection from ${formatShortDate(item.reflectionDate, context.timeZone)}`}
                  className="grid size-9 place-items-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              </div>
              <p className="m-0 line-clamp-3 text-sm leading-relaxed">{item.content}</p>
            </article>
          ))}
        </Card>
      </div>
    </>
  );
}
