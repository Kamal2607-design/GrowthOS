import { useRef, useState } from 'react';
import { Archive, FileText, Search, Trash2, Upload } from 'lucide-react';

import * as api from '../lib/api.js';
import { humanize } from '../lib/format.js';
import { errorMessage } from '../lib/messages.js';
import { useResource } from '../lib/useResource.js';
import { useToast } from '../components/Toast.jsx';
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
  Select,
  TextArea,
  TextInput,
  cn,
} from '../components/ui.jsx';

const ACCEPTED_TYPES = '.pdf,.png,.jpg,.jpeg,.txt,application/pdf,image/png,image/jpeg,text/plain';

const MEMORY_TYPES = ['fact', 'preference', 'experience', 'learning', 'belief', 'insight'];

const CANDIDATE_KINDS = [
  { kind: 'memory', label: 'Memory', acceptLabel: 'Save memory' },
  { kind: 'goal', label: 'Goal', acceptLabel: 'Add goal' },
  { kind: 'action', label: 'Action', acceptLabel: 'Add action' },
];

function documentStage(document) {
  if (document.processingStatus === 'processing') {
    return { label: 'Processing', tone: 'progress', next: null };
  }
  if (document.processingStatus === 'failed') {
    return { label: 'Failed', tone: 'danger', next: 'extract', nextLabel: 'Try again' };
  }
  if (document.structuredData) {
    return { label: 'Analysed', tone: 'brand', next: 'review', nextLabel: 'Review findings' };
  }
  if (document.extractedText) {
    return { label: 'Text extracted', tone: 'progress', next: 'analyze', nextLabel: 'Analyse' };
  }
  return { label: 'Uploaded', tone: 'neutral', next: 'extract', nextLabel: 'Extract text' };
}

function formatSize(bytes) {
  if (!Number.isFinite(bytes)) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentAnalysis({ document }) {
  const analysis = useResource(() => api.fetchDocumentAnalysis(document.id), [document.id]);
  const data = analysis.data?.analysis;

  if (analysis.loading && !analysis.data) {
    return <p className="m-0 text-sm text-muted">Loading analysis…</p>;
  }

  if (!data) {
    return null;
  }

  const lists = [
    ['Key points', data.keyPoints],
    ['Insights', data.insights],
  ].filter(([, items]) => Array.isArray(items) && items.length);

  return (
    <ProposalCard as="section" aria-label="Document analysis" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="propose">AI analysis</Badge>
        {data.documentType && <Badge>{humanize(data.documentType)}</Badge>}
        {(data.topics ?? []).slice(0, 4).map((topic) => (
          <Badge key={topic} tone="brand">{topic}</Badge>
        ))}
      </div>
      {(data.summary || analysis.data.summary) && (
        <p className="m-0 text-[15px] leading-relaxed">{data.summary || analysis.data.summary}</p>
      )}
      {lists.map(([title, items]) => (
        <div key={title} className="flex flex-col gap-1">
          <h3 className="m-0 text-sm font-semibold">{title}</h3>
          <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-sm leading-relaxed text-ink-soft">
            {items.slice(0, 6).map((item, index) => <li key={index}>{String(item)}</li>)}
          </ul>
        </div>
      ))}
    </ProposalCard>
  );
}

function Candidates({ document }) {
  const candidates = useResource(
    async () => {
      const lists = await Promise.all(
        CANDIDATE_KINDS.map(({ kind }) =>
          api.fetchDocumentCandidates(document.id, kind).then((items) =>
            items.map((item) => ({ ...item, kind })),
          ),
        ),
      );
      return lists.flat().filter((item) => item.status === 'pending');
    },
    [document.id],
  );
  const [busy, setBusy] = useState({});
  const [finding, setFinding] = useState(false);
  const [error, setError] = useState('');

  async function decide(candidate, accept) {
    setBusy({ ...busy, [candidate.id]: accept ? 'accept' : 'reject' });
    setError('');

    try {
      await api.decideDocumentCandidate(candidate.kind, candidate.id, accept);
      await candidates.reload();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy((previous) => ({ ...previous, [candidate.id]: undefined }));
    }
  }

  async function find() {
    setFinding(true);
    setError('');

    try {
      await api.generateDocumentCandidates(document.id);
      await candidates.reload();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setFinding(false);
    }
  }

  const list = candidates.data ?? [];

  return (
    <Card aria-labelledby="cand-heading" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <SectionTitle id="cand-heading">Found in “{document.fileName}”</SectionTitle>
        <p className="m-0 text-sm text-muted">
          The AI found these in your document. Accept what's true and useful; dismiss the rest.
        </p>
      </div>

      <DocumentAnalysis document={document} />

      {error && <Alert tone="danger">{error}</Alert>}
      {candidates.loading && !candidates.data && <p className="m-0 text-sm text-muted">Loading…</p>}
      {candidates.error && (
        <ErrorBlock message={errorMessage(candidates.error)} onRetry={candidates.reload} />
      )}

      {candidates.data && list.length === 0 && (
        <div className="flex flex-col items-start gap-3">
          <p className="m-0 text-[15px] text-ink-soft">Nothing waiting for review.</p>
          <Button variant="secondary" onClick={find} loading={finding}>
            Find memories, goals and actions
          </Button>
        </div>
      )}

      {list.map((candidate) => {
        const kind = CANDIDATE_KINDS.find((item) => item.kind === candidate.kind);
        const title = candidate.title || candidate.content;

        return (
          <ProposalCard key={`${candidate.kind}-${candidate.id}`} className="flex flex-col gap-2 !p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="propose">{kind.label}</Badge>
              <span className="text-[15px] font-semibold leading-snug">{title}</span>
            </div>
            {candidate.title && candidate.content && (
              <p className="m-0 text-sm leading-relaxed text-ink-soft">{candidate.content}</p>
            )}
            {candidate.reason && (
              <p className="m-0 text-sm leading-relaxed text-muted">{candidate.reason}</p>
            )}
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <Button
                className="min-h-10 text-sm"
                loading={busy[candidate.id] === 'accept'}
                disabled={Boolean(busy[candidate.id])}
                onClick={() => decide(candidate, true)}
              >
                {kind.acceptLabel}
              </Button>
              <Button
                variant="secondary"
                className="min-h-10 text-sm"
                loading={busy[candidate.id] === 'reject'}
                disabled={Boolean(busy[candidate.id])}
                onClick={() => decide(candidate, false)}
              >
                Dismiss
              </Button>
            </div>
          </ProposalCard>
        );
      })}
    </Card>
  );
}

function Documents() {
  const documents = useResource(api.fetchDocuments, []);
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState({});
  const [error, setError] = useState('');
  const [reviewId, setReviewId] = useState(null);
  const [dragging, setDragging] = useState(false);

  async function upload(file) {
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      await api.uploadDocument(file);
      await documents.reload();
    } catch (cause) {
      setError(
        cause.status === 413
          ? 'That file is too large. The limit is 20 MB.'
          : cause.status === 415
            ? 'That file type is not supported. Use PDF, PNG, JPEG or plain text.'
            : errorMessage(cause),
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function advance(document) {
    const stage = documentStage(document);

    if (stage.next === 'review') {
      setReviewId(document.id);
      return;
    }

    setBusy({ ...busy, [document.id]: true });
    setError('');

    try {
      if (stage.next === 'extract') {
        await api.extractDocument(document.id);
      } else if (stage.next === 'analyze') {
        await api.analyzeDocument(document.id);
      }
      await documents.reload();
    } catch (cause) {
      setError(
        cause.status === 409
          ? cause.message
          : stage.next === 'analyze' && cause.status >= 500
            ? 'Analysis failed. Check that Ollama is running, then try again.'
            : errorMessage(cause),
      );
      await documents.reload();
    } finally {
      setBusy((previous) => ({ ...previous, [document.id]: false }));
    }
  }

  async function remove(document) {
    if (!window.confirm(`Delete “${document.fileName}”? Its stored file is removed too.`)) {
      return;
    }

    setBusy({ ...busy, [document.id]: true });

    try {
      await api.deleteDocument(document.id);
      if (reviewId === document.id) setReviewId(null);
      await documents.reload();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy((previous) => ({ ...previous, [document.id]: false }));
    }
  }

  const list = documents.data ?? [];
  const reviewing = list.find((document) => document.id === reviewId);

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6">
      <Card aria-labelledby="docs-heading" className="flex flex-col gap-4">
        <SectionTitle id="docs-heading">Documents</SectionTitle>

        <label
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            upload(event.dataTransfer.files?.[0]);
          }}
          className={cn(
            'flex cursor-pointer flex-col items-center gap-2 rounded-[14px] border-2 border-dashed px-6 py-7 text-center focus-within:outline-2 focus-within:outline-brand',
            dragging ? 'border-brand bg-brand-soft' : 'border-field bg-raised hover:border-brand',
          )}
        >
          <Upload aria-hidden="true" className="size-7 text-brand" />
          <span className="text-base font-semibold">
            {uploading ? 'Uploading…' : 'Drop a file or choose one'}
          </span>
          <span className="text-[13px] text-muted">
            PDF, PNG, JPEG or plain text, up to 20 MB. Scanned PDFs are read with OCR.
          </span>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            disabled={uploading}
            className="sr-only"
            onChange={(event) => upload(event.target.files?.[0])}
          />
        </label>

        {error && <Alert tone="danger">{error}</Alert>}
        {documents.loading && !documents.data && <LoadingBlock label="Loading documents" />}
        {documents.error && (
          <ErrorBlock message={errorMessage(documents.error)} onRetry={documents.reload} />
        )}
        {documents.data && list.length === 0 && (
          <p className="m-0 text-[15px] text-muted">
            No documents yet. Upload a plan, notes or a photo of a page.
          </p>
        )}

        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {list.map((document) => {
            const stage = documentStage(document);

            return (
              <li
                key={document.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-line px-4 py-3"
              >
                <FileText aria-hidden="true" className="size-5 flex-none text-muted" />
                <div className="flex min-w-[160px] flex-1 flex-col gap-0.5">
                  <span className="break-all text-[15px] font-medium">{document.fileName}</span>
                  <span className="text-[13px] text-muted">
                    {[document.mimeType, formatSize(document.fileSize), document.extractionMethod && humanize(document.extractionMethod)]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </div>
                <Badge tone={stage.tone}>{stage.label}</Badge>
                {stage.next && (
                  <Button
                    variant="secondary"
                    className="min-h-10 text-sm"
                    loading={Boolean(busy[document.id])}
                    onClick={() => advance(document)}
                  >
                    {stage.nextLabel}
                  </Button>
                )}
                <button
                  type="button"
                  onClick={() => remove(document)}
                  disabled={Boolean(busy[document.id])}
                  aria-label={`Delete ${document.fileName}`}
                  className="grid size-10 place-items-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger disabled:opacity-50"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      {reviewing && <Candidates key={reviewing.id} document={reviewing} />}
    </div>
  );
}

function Memory() {
  const toast = useToast();
  const memories = useResource(api.fetchMemories, []);
  const [busy, setBusy] = useState({});
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState({ loading: false, results: null, error: null });
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ type: 'insight', content: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function runSearch(event) {
    event.preventDefault();

    if (!query.trim()) {
      setSearch({ loading: false, results: null, error: null });
      return;
    }

    setSearch({ loading: true, results: null, error: null });

    try {
      setSearch({ loading: false, results: await api.searchMemories(query.trim()), error: null });
    } catch (cause) {
      setSearch({ loading: false, results: null, error: cause });
    }
  }

  async function addMemory(event) {
    event.preventDefault();

    if (!draft.content.trim()) {
      setError('Write the memory first.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const memory = await api.createMemory({ type: draft.type, content: draft.content.trim(), source: 'user' });
      setDraft({ type: draft.type, content: '' });
      setAdding(false);
      await memories.reload();

      // Normalising also embeds the memory, which makes it searchable and
      // available to the AI planners. Best effort: Ollama may be offline.
      try {
        await api.normalizeMemory(memory.id);
        toast.show('Memory saved and ready for search.');
      } catch {
        toast.show('Memory saved. It becomes searchable once the AI is available.', { tone: 'info' });
      }
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  async function manage(memory, kind) {
    if (kind === 'delete' && !window.confirm('Delete this memory permanently?')) return;
    setBusy((previous) => ({ ...previous, [memory.id]: kind }));

    try {
      if (kind === 'archive') {
        await api.archiveMemory(memory.id);
        toast.show('Memory archived. It no longer informs suggestions.', { tone: 'info' });
      } else {
        await api.deleteMemory(memory.id);
        toast.show('Memory deleted.', { tone: 'info' });
      }
      await memories.reload();
    } catch (cause) {
      toast.show(errorMessage(cause), { tone: 'danger' });
    } finally {
      setBusy((previous) => ({ ...previous, [memory.id]: undefined }));
    }
  }

  const shown = search.results
    ? search.results.map((item) => ({
        id: item.memoryId,
        content: item.content,
        label: `Match · ${Math.round((item.similarity ?? 0) * 100)}%`,
        manageable: false,
      }))
    : (memories.data ?? [])
        .filter((item) => item.status !== 'archived')
        .map((item) => ({ id: item.id, content: item.content, label: humanize(item.type), manageable: true }));

  return (
    <Card as="aside" aria-labelledby="memory-heading" className="flex w-full flex-col gap-4 xl:w-[360px] xl:flex-none">
      <SectionTitle id="memory-heading" className="!text-lg">Memory</SectionTitle>

      <form role="search" onSubmit={runSearch} className="flex items-end gap-2">
        <Field label="Search by meaning" className="flex-1">
          <TextInput
            type="search"
            value={query}
            placeholder="e.g. how I work best"
            onChange={(event) => {
              setQuery(event.target.value);
              if (!event.target.value) setSearch({ loading: false, results: null, error: null });
            }}
          />
        </Field>
        <Button type="submit" variant="secondary" loading={search.loading} aria-label="Search memories" className="!px-3">
          {!search.loading && <Search aria-hidden="true" className="size-4" />}
        </Button>
      </form>

      {search.error && (
        <Alert tone="warning">
          {search.error.status >= 500
            ? 'Search needs the embedding model. Check that Ollama is running.'
            : errorMessage(search.error)}
        </Alert>
      )}
      {search.results && (
        <p className="m-0 text-sm text-muted">
          {search.results.length === 0 ? 'No closely related memories.' : `${search.results.length} related memories`}
        </p>
      )}

      {memories.loading && !memories.data && <p className="m-0 text-sm text-muted">Loading…</p>}
      {memories.error && <ErrorBlock message={errorMessage(memories.error)} onRetry={memories.reload} />}
      {memories.data && memories.data.length === 0 && !search.results && (
        <p className="m-0 text-sm text-muted">
          Nothing saved yet. Memories come from documents you review or ones you add yourself.
        </p>
      )}

      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {shown.map((memory) => (
          <li key={memory.id} className="flex flex-col gap-1.5 rounded-2xl bg-raised p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">{memory.label}</span>
              {memory.manageable && (
                <span className="flex">
                  <button
                    type="button"
                    onClick={() => manage(memory, 'archive')}
                    disabled={Boolean(busy[memory.id])}
                    aria-label="Archive memory"
                    title="Archive"
                    className="grid size-9 place-items-center rounded-lg text-muted hover:bg-hover hover:text-ink disabled:opacity-50"
                  >
                    <Archive aria-hidden="true" className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => manage(memory, 'delete')}
                    disabled={Boolean(busy[memory.id])}
                    aria-label="Delete memory"
                    title="Delete"
                    className="grid size-9 place-items-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger disabled:opacity-50"
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                  </button>
                </span>
              )}
            </div>
            <span className="text-sm leading-relaxed">{memory.content}</span>
          </li>
        ))}
      </ul>

      {adding ? (
        <form onSubmit={addMemory} className="flex flex-col gap-3 border-t border-line pt-4">
          {error && <Alert tone="danger">{error}</Alert>}
          <Field label="Type">
            <Select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value })}>
              {MEMORY_TYPES.map((type) => <option key={type} value={type}>{humanize(type)}</option>)}
            </Select>
          </Field>
          <Field label="What should GrowthOS remember?">
            <TextArea rows={3} value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" loading={saving}>Save memory</Button>
            <Button variant="secondary" onClick={() => setAdding(false)} disabled={saving}>Cancel</Button>
          </div>
        </form>
      ) : (
        <Button variant="secondary" onClick={() => setAdding(true)} className="self-start">
          Add a memory
        </Button>
      )}
    </Card>
  );
}

export default function Library() {
  return (
    <>
      <PageHeader title="Library">
        <p className="m-0 w-full text-[15px] text-muted">
          Documents you upload and the memories GrowthOS uses to personalise suggestions.
        </p>
      </PageHeader>
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
        <Documents />
        <Memory />
      </div>
    </>
  );
}
