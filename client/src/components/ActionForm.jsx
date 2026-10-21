import { useState } from 'react';

import { dateInputToInstant, instantToDateInput } from '../lib/format.js';
import { errorMessage } from '../lib/messages.js';
import { Alert, Button, Field, Select, TextArea, TextInput } from './ui.jsx';

const PRIORITIES = [
  { value: 0, label: 'Not set' },
  { value: 1, label: '1 · Highest' },
  { value: 2, label: '2 · High' },
  { value: 3, label: '3 · Medium' },
  { value: 4, label: '4 · Low' },
  { value: 5, label: '5 · Lowest' },
];

/**
 * Create or edit an Action the user owns. `goals` lists the goals the
 * action can belong to; `defaultGoalId` preselects one.
 */
export default function ActionForm({
  initial,
  goals = [],
  defaultGoalId = null,
  submitLabel = 'Add action',
  onSubmit,
  onCancel,
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    goalId: initial ? (initial.goalId ?? '') : (defaultGoalId ?? ''),
    priority: initial?.priority ?? 0,
    dueDate: instantToDateInput(initial?.dueDate),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  async function submit(event) {
    event.preventDefault();

    if (!form.title.trim()) {
      setError('Give the action a title.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await onSubmit({
        title: form.title.trim(),
        description: form.description.trim() || null,
        goalId: form.goalId === '' ? null : Number(form.goalId),
        priority: Number(form.priority),
        dueDate: dateInputToInstant(form.dueDate),
      });
    } catch (cause) {
      setError(errorMessage(cause));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
      {error && <Alert tone="danger" className="sm:col-span-2">{error}</Alert>}
      <Field label="What will you do? (required)" className="sm:col-span-2">
        <TextInput
          autoFocus
          value={form.title}
          placeholder="For example: Run 3 km before work"
          onChange={update('title')}
        />
      </Field>
      <Field label="Details" className="sm:col-span-2">
        <TextArea rows={2} value={form.description} placeholder="Optional" onChange={update('description')} />
      </Field>
      <Field label="Goal">
        <Select value={form.goalId} onChange={update('goalId')}>
          <option value="">No goal</option>
          {goals.map((goal) => (
            <option key={goal.id} value={goal.id}>{goal.title}</option>
          ))}
        </Select>
      </Field>
      <Field label="Due date">
        <TextInput type="date" value={form.dueDate} onChange={update('dueDate')} />
      </Field>
      <Field label="Priority">
        <Select value={form.priority} onChange={update('priority')}>
          {PRIORITIES.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>
      </Field>
      <div className="flex items-end gap-2 sm:col-span-2">
        <Button type="submit" loading={saving}>{submitLabel}</Button>
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>
        )}
      </div>
    </form>
  );
}
