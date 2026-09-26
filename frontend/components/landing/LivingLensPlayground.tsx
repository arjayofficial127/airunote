'use client';

import Link from 'next/link';
import {
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';

export type DemoLensKey = 'board' | 'canvas' | 'study';

export type DemoProgress = {
  edited: boolean;
  switched: boolean;
};

type DemoLaneKey = 'collect' | 'connect' | 'synthesize';

type DemoNote = {
  id: string;
  title: string;
  body: string;
  tag: string;
  lane: DemoLaneKey;
  x: number;
  y: number;
  color: string;
};

type LivingLensPlaygroundProps = {
  activeLens: DemoLensKey;
  onLensChange: (lens: DemoLensKey) => void;
  onProgressChange?: (progress: DemoProgress) => void;
};

const seedNotes: DemoNote[] = [
  {
    id: 'sources',
    title: 'Sources',
    body: 'Six studies and two expert interviews on durable learning.',
    tag: 'source',
    lane: 'collect',
    x: 20,
    y: 25,
    color: '#38bdf8',
  },
  {
    id: 'interview',
    title: 'Dr. Kim interview',
    body: 'Spacing works best when recall feels effortful, not impossible.',
    tag: 'signal',
    lane: 'collect',
    x: 80,
    y: 25,
    color: '#a78bfa',
  },
  {
    id: 'question',
    title: 'Key question',
    body: 'How does retrieval practice change long-term retention?',
    tag: 'question',
    lane: 'connect',
    x: 50,
    y: 53,
    color: '#34d399',
  },
  {
    id: 'brief',
    title: 'Research brief',
    body: 'Testing memory over time strengthens access to the idea.',
    tag: 'output',
    lane: 'synthesize',
    x: 50,
    y: 81,
    color: '#fbbf24',
  },
];

const lanes: Array<{ id: DemoLaneKey; label: string; hint: string }> = [
  { id: 'collect', label: 'Collect', hint: 'Raw material' },
  { id: 'connect', label: 'Connect', hint: 'Find the pattern' },
  { id: 'synthesize', label: 'Synthesize', hint: 'Shape the output' },
];

const connections: Array<[string, string]> = [
  ['sources', 'question'],
  ['interview', 'question'],
  ['question', 'brief'],
];

function cloneSeedNotes() {
  return seedNotes.map((note) => ({ ...note }));
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function ResetIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M3.2 5.8A5.2 5.2 0 1 1 3 10" strokeLinecap="round" />
      <path d="M3.2 2.7v3.5h3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <path d="M6.6 9.4 9.4 6.6M5.3 11.8l-1.1 1.1a2.2 2.2 0 0 1-3.1-3.1l2.2-2.2a2.2 2.2 0 0 1 3.1 0M10.7 4.2l1.1-1.1a2.2 2.2 0 0 1 3.1 3.1l-2.2 2.2a2.2 2.2 0 0 1-3.1 0" strokeLinecap="round" />
    </svg>
  );
}

function NoteDot({ color }: { color: string }) {
  return <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />;
}

export function LivingLensPlayground({ activeLens, onLensChange, onProgressChange }: LivingLensPlaygroundProps) {
  const [notes, setNotes] = useState<DemoNote[]>(cloneSeedNotes);
  const [selectedId, setSelectedId] = useState(seedNotes[3].id);
  const [changeMessage, setChangeMessage] = useState('Step 1: rename the selected note.');
  const [isDirty, setIsDirty] = useState(false);
  const [hasEdited, setHasEdited] = useState(false);
  const [hasSwitchedAfterEdit, setHasSwitchedAfterEdit] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);

  const selectedNote = notes.find((note) => note.id === selectedId) ?? notes[0];
  const notesById = useMemo(() => new Map(notes.map((note) => [note.id, note])), [notes]);

  const markChanged = (message: string) => {
    setIsDirty(true);
    setChangeMessage(message);
  };

  const updateNote = (id: string, updates: Partial<DemoNote>, message: string, countsAsEdit = false) => {
    setNotes((current) => current.map((note) => (note.id === id ? { ...note, ...updates } : note)));
    markChanged(message);
    if (countsAsEdit && !hasEdited) {
      setHasEdited(true);
      onProgressChange?.({ edited: true, switched: hasSwitchedAfterEdit });
    }
  };

  const handleLensChange = (lens: DemoLensKey) => {
    if (lens === activeLens) return;

    if (hasEdited) {
      setHasSwitchedAfterEdit(true);
      setChangeMessage('Same note. New lens. Nothing duplicated.');
      onProgressChange?.({ edited: true, switched: true });
    }

    onLensChange(lens);
  };

  const resetDemo = () => {
    setNotes(cloneSeedNotes());
    setSelectedId(seedNotes[3].id);
    setIsDirty(false);
    setHasEdited(false);
    setHasSwitchedAfterEdit(false);
    setChangeMessage('Step 1: rename the selected note.');
    onProgressChange?.({ edited: false, switched: false });
    onLensChange('board');
  };

  const handleDragStart = (event: DragEvent<HTMLButtonElement>, noteId: string) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', noteId);
    setSelectedId(noteId);
  };

  const handleLaneDrop = (event: DragEvent<HTMLDivElement>, lane: DemoLaneKey) => {
    event.preventDefault();
    const noteId = event.dataTransfer.getData('text/plain');
    const note = notesById.get(noteId);
    if (!note || note.lane === lane) return;
    updateNote(noteId, { lane }, `Moved “${note.title}” to ${lanes.find((item) => item.id === lane)?.label}.`);
  };

  const handleCanvasPointerDown = (event: ReactPointerEvent<HTMLButtonElement>, note: DemoNote) => {
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!bounds) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      id: note.id,
      offsetX: ((event.clientX - bounds.left) / bounds.width) * 100 - note.x,
      offsetY: ((event.clientY - bounds.top) / bounds.height) * 100 - note.y,
    };
    setSelectedId(note.id);
  };

  const handleCanvasPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!drag || !bounds || drag.id !== event.currentTarget.dataset.noteId) return;

    const x = clamp(((event.clientX - bounds.left) / bounds.width) * 100 - drag.offsetX, 17, 83);
    const y = clamp(((event.clientY - bounds.top) / bounds.height) * 100 - drag.offsetY, 15, 85);
    setNotes((current) => current.map((note) => (note.id === drag.id ? { ...note, x, y } : note)));
  };

  const handleCanvasPointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    const note = notesById.get(drag.id);
    dragRef.current = null;
    if (note) markChanged(`Repositioned “${note.title}” on the canvas.`);
  };

  const renderBoard = () => (
    <div className="grid min-h-[300px] gap-2.5 bg-[#f5f7fb] p-3 sm:grid-cols-3">
      {lanes.map((lane) => {
        const laneNotes = notes.filter((note) => note.lane === lane.id);
        return (
          <div
            key={lane.id}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => handleLaneDrop(event, lane.id)}
            className="min-h-[138px] rounded-xl border border-slate-200/80 bg-white/80 p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold text-slate-800">{lane.label}</p>
                <p className="mt-0.5 text-[9px] text-slate-400">{lane.hint}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-500">{laneNotes.length}</span>
            </div>
            <div className="mt-3 space-y-2">
              {laneNotes.map((note) => (
                <button
                  key={note.id}
                  type="button"
                  draggable
                  onDragStart={(event) => handleDragStart(event, note.id)}
                  onClick={() => setSelectedId(note.id)}
                  className={`w-full cursor-grab rounded-xl border bg-white p-2.5 text-left shadow-sm transition-all active:cursor-grabbing ${selectedId === note.id ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200 hover:border-blue-300'}`}
                >
                  <span className="flex items-center gap-2 text-[10px] font-semibold text-slate-800"><NoteDot color={note.color} />{note.title}</span>
                  <span className="mt-2 block line-clamp-2 text-[9px] leading-4 text-slate-500">{note.body}</span>
                  <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-1 text-[8px] font-medium text-slate-500">#{note.tag}</span>
                </button>
              ))}
              {laneNotes.length === 0 ? <div className="grid h-20 place-items-center rounded-xl border border-dashed border-slate-200 text-[9px] text-slate-400">Drop a note here</div> : null}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderCanvas = () => (
    <div
      ref={canvasRef}
      className="relative h-[320px] touch-none overflow-hidden bg-white [background-image:radial-gradient(#d7deea_1px,transparent_1px)] [background-size:18px_18px]"
    >
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {connections.map(([sourceId, targetId]) => {
          const source = notesById.get(sourceId);
          const target = notesById.get(targetId);
          if (!source || !target) return null;
          return <line key={`${sourceId}-${targetId}`} x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke="#93b4f5" strokeWidth="0.45" strokeDasharray="1.5 1.5" vectorEffect="non-scaling-stroke" />;
        })}
      </svg>
      <div className="pointer-events-none absolute left-3 top-3 rounded-full border border-blue-100 bg-blue-50/90 px-3 py-1.5 text-[9px] font-medium text-blue-700">Drag any note</div>
      {notes.map((note) => (
        <button
          key={note.id}
          type="button"
          data-note-id={note.id}
          onPointerDown={(event) => handleCanvasPointerDown(event, note)}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
          onPointerCancel={() => { dragRef.current = null; }}
          style={{ left: `${note.x}%`, top: `${note.y}%` }}
          className={`absolute w-[116px] -translate-x-1/2 -translate-y-1/2 cursor-grab select-none rounded-xl border bg-white p-3 text-left shadow-[0_10px_24px_-14px_rgba(15,23,42,.55)] transition-[border-color,box-shadow] active:cursor-grabbing sm:w-[142px] ${selectedId === note.id ? 'z-10 border-blue-400 ring-2 ring-blue-100' : 'border-slate-200 hover:border-blue-300'}`}
        >
          <span className="flex items-center gap-2 text-[9px] font-semibold leading-4 text-slate-800 sm:text-[10px]"><NoteDot color={note.color} />{note.title}</span>
          <span className="mt-1.5 hidden line-clamp-2 text-[8px] leading-3.5 text-slate-500 sm:block">{note.body}</span>
        </button>
      ))}
    </div>
  );

  const renderStudy = () => {
    const rootNote = notesById.get('question');
    const supportingNotes = notes.filter((note) => note.id !== 'question');

    return (
      <div className="min-h-[300px] bg-[#f7f9fc] p-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_0.38fr]">
          <div className="space-y-2.5">
            {rootNote ? (
              <button
                type="button"
                onClick={() => setSelectedId(rootNote.id)}
                className={`w-full rounded-xl border bg-white p-4 text-left shadow-sm ${selectedId === rootNote.id ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200'}`}
              >
                <span className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-xs font-semibold text-slate-900"><NoteDot color={rootNote.color} />{rootNote.title}</span><span className="rounded-full bg-emerald-50 px-2 py-1 text-[8px] font-semibold text-emerald-700">Focus</span></span>
                <span className="mt-3 block text-[10px] leading-5 text-slate-600">{rootNote.body}</span>
              </button>
            ) : null}
            {supportingNotes.map((note, index) => (
              <button
                key={note.id}
                type="button"
                onClick={() => setSelectedId(note.id)}
                className={`w-full rounded-xl border bg-white p-3.5 text-left shadow-sm transition-colors ${selectedId === note.id ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200 hover:border-blue-300'}`}
              >
                <span className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-[10px] font-semibold text-slate-800"><NoteDot color={note.color} />{note.title}</span><span className="rounded-full bg-blue-50 px-2 py-1 text-[8px] text-blue-700">{index + 1} connection{index === 0 ? '' : 's'}</span></span>
                <span className="mt-2 block line-clamp-2 text-[9px] leading-4 text-slate-500">{note.body}</span>
              </button>
            ))}
          </div>
          <aside className="rounded-xl border border-slate-200 bg-white p-3.5">
            <p className="flex items-center gap-2 text-[10px] font-semibold text-slate-700"><LinkIcon />Connected notes</p>
            <div className="mt-3 space-y-2">
              {notes.map((note) => (
                <button key={note.id} type="button" onClick={() => setSelectedId(note.id)} className={`flex w-full items-center gap-2 rounded-lg p-2 text-left text-[9px] ${selectedId === note.id ? 'bg-blue-50 font-semibold text-blue-800' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}><NoteDot color={note.color} /><span className="truncate">{note.title}</span></button>
              ))}
            </div>
          </aside>
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-full overflow-hidden rounded-[1.55rem] border border-white/15 bg-[#f8fafc] text-slate-950 shadow-[0_35px_85px_-35px_rgba(0,0,0,.8)]" data-demo-mode="memory-only">
      <div className="flex flex-col gap-2.5 border-b border-slate-200 bg-white px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-600 text-[10px] font-bold text-white">A</span>
          <div className="min-w-0">
            <p className="truncate text-[10px] font-semibold text-slate-800">Research / Learning science</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[8px] font-medium text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Interactive demo · no signup · browser only</p>
          </div>
        </div>
        <div className="flex items-center gap-1" role="tablist" aria-label="Interactive demo lenses">
          {(['board', 'canvas', 'study'] as DemoLensKey[]).map((lens) => (
            <button
              key={lens}
              type="button"
              role="tab"
              aria-selected={activeLens === lens}
              onClick={() => handleLensChange(lens)}
              className={`min-h-9 flex-1 rounded-lg px-3 py-2 text-[10px] font-semibold capitalize transition-all sm:flex-none sm:px-4 ${activeLens === lens ? 'bg-blue-600 text-white shadow-sm' : hasEdited && !hasSwitchedAfterEdit && lens === 'canvas' ? 'bg-blue-50 text-blue-700 ring-2 ring-blue-300 motion-safe:animate-pulse' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
            >
              {lens}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="min-w-0" role="tabpanel" aria-label={`${activeLens} lens`}>
          {activeLens === 'board' ? renderBoard() : activeLens === 'canvas' ? renderCanvas() : renderStudy()}
        </div>

        <aside className="border-t border-slate-200 bg-white p-3.5 lg:border-l lg:border-t-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-blue-600">Edit this note</p>
              <p className="mt-1 text-[9px] leading-4 text-slate-400">Then change lenses. Your edit follows.</p>
            </div>
            <NoteDot color={selectedNote.color} />
          </div>

          <label className="mt-4 block text-[9px] font-semibold text-slate-500" htmlFor="demo-note-title">Title</label>
          <input
            id="demo-note-title"
            value={selectedNote.title}
            onChange={(event) => updateNote(selectedNote.id, { title: event.target.value }, 'Great. Now switch to Canvas or Study.', true)}
            className={`mt-1.5 w-full rounded-lg border bg-slate-50 px-3 py-2.5 text-[11px] font-semibold text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 ${!hasEdited ? 'border-blue-300 ring-2 ring-blue-100 shadow-[0_0_0_4px_rgba(59,130,246,.08)] motion-safe:animate-pulse' : 'border-slate-200'}`}
          />

          <label className="mt-3 block text-[9px] font-semibold text-slate-500" htmlFor="demo-note-body">Note</label>
          <textarea
            id="demo-note-body"
            value={selectedNote.body}
            rows={3}
            onChange={(event) => updateNote(selectedNote.id, { body: event.target.value }, 'Great. Now switch to Canvas or Study.', true)}
            className="mt-1.5 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[10px] leading-5 text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
          />

          <label className="mt-3 block text-[9px] font-semibold text-slate-500" htmlFor="demo-note-stage">Board stage</label>
          <select
            id="demo-note-stage"
            value={selectedNote.lane}
            onChange={(event) => {
              const lane = event.target.value as DemoLaneKey;
              updateNote(selectedNote.id, { lane }, `Moved “${selectedNote.title}” to ${lanes.find((item) => item.id === lane)?.label}.`);
            }}
            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[10px] text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          >
            {lanes.map((lane) => <option key={lane.id} value={lane.id}>{lane.label}</option>)}
          </select>
        </aside>
      </div>

      <div className={`flex flex-col gap-2.5 border-t px-4 py-2.5 transition-colors sm:flex-row sm:items-center sm:justify-between ${hasSwitchedAfterEdit ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
        <p className={`flex items-center gap-2 text-[9px] ${hasSwitchedAfterEdit ? 'font-semibold text-emerald-800' : 'text-slate-500'}`} aria-live="polite">
          <span className={`h-2 w-2 rounded-full ${hasSwitchedAfterEdit ? 'bg-emerald-500' : isDirty ? 'bg-blue-500' : 'bg-slate-300'}`} />
          {changeMessage}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={resetDemo} disabled={!isDirty} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[9px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"><ResetIcon />Reset</button>
          <Link href="/register" className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-lg px-4 py-2 text-[9px] font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 ${hasSwitchedAfterEdit ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}>Build your own workspace <span aria-hidden="true">→</span></Link>
        </div>
      </div>
    </div>
  );
}
