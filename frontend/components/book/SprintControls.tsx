'use client';
import { useEffect, useState } from 'react';
import { sprintSchema } from '@/lib/book';
import { today, addDays } from './domain';
import type { BookWorkspaceModel } from './useBookWorkspace';
export function SprintControls({ model, selected, onSelect }: { model: BookWorkspaceModel; selected: string; onSelect: (id: string) => void }) {
  const { setDraftFlag } = model;
  const [adding, setAdding] = useState(false); const [name, setName] = useState(''); const [start, setStart] = useState(today); const [end, setEnd] = useState(() => addDays(today(), 13));
  useEffect(() => { setDraftFlag('sprint', adding && !!name.trim()); return () => setDraftFlag('sprint', false); }, [adding, name, setDraftFlag]);
  return <><div className="ab-sprint-controls"><select aria-label="Selected sprint" value={selected} onChange={event => onSelect(event.target.value)}><option value="">Choose a sprint</option>{model.config.sprints.map(sprint => <option key={sprint.id} value={sprint.id}>{sprint.name}{sprint.closed ? ' (closed)' : ''}</option>)}</select><button onClick={() => setAdding(value => !value)}>+ Sprint</button></div>{adding && <form className="ab-small-form" onSubmit={event => {
    event.preventDefault(); const parsed = sprintSchema.safeParse({ id: crypto.randomUUID(), name, start, end, closed: false });
    if (!parsed.success) { model.actions.setError(parsed.error.issues[0]?.message ?? 'Check the sprint dates'); return; }
    void model.actions.configure({ sprints: [...model.config.sprints, parsed.data], views: model.config.views, templates: model.config.templates }).then(saved => { if (saved) { onSelect(parsed.data.id); setAdding(false); setName(''); } });
  }}><label>Sprint name<input required maxLength={120} value={name} onChange={event => setName(event.target.value)} /></label><div className="ab-form-pair"><label>Start<input required type="date" value={start} onChange={event => setStart(event.target.value)} /></label><label>End<input required type="date" value={end} min={start} onChange={event => setEnd(event.target.value)} /></label></div><button disabled={model.actions.busy}>Create sprint</button><button type="button" onClick={() => setAdding(false)}>Cancel</button></form>}</>;
}
