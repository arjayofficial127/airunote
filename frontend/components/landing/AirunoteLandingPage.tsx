'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { AirunoteLogo } from '@/components/brand/AirunoteLogo';

const heroStories = [
  { line1: 'Searchable wiki', label: 'Searchable wiki', accent: 'bg-sky-500' },
  { line1: 'Exams or surveys', label: 'Exams or surveys', accent: 'bg-emerald-500' },
  { line1: 'Knowledge Stash', label: 'Knowledge Stash', accent: 'bg-amber-500' },
] as const;

const workflowValues = [
  { label: 'Onboarding', accent: 'bg-blue-500' },
  { label: 'Teaching', accent: 'bg-violet-500' },
  { label: 'Freelancing', accent: 'bg-amber-500' },
  { label: 'Surveys', accent: 'bg-emerald-500' },
  { label: 'Certification', accent: 'bg-cyan-500' },
  { label: 'Consulting', accent: 'bg-indigo-500' },
  { label: 'Agency delivery', accent: 'bg-fuchsia-500' },
  { label: 'Research', accent: 'bg-rose-500' },
  { label: 'Company wiki', accent: 'bg-sky-500' },
  { label: 'Recruitment', accent: 'bg-orange-500' },
  { label: 'Coaching', accent: 'bg-teal-500' },
  { label: 'Lightweight CRM', accent: 'bg-lime-500' },
  { label: 'Personal knowledge', accent: 'bg-slate-700' },
] as const;

type WorkflowKey = 'research' | 'teaching' | 'client' | 'personal';
type LensKey = 'board' | 'canvas' | 'study';
type IconName =
  | 'arrow'
  | 'check'
  | 'document'
  | 'download'
  | 'folder'
  | 'layers'
  | 'lock'
  | 'mail'
  | 'move'
  | 'people'
  | 'spark'
  | 'write';

const workflows: Record<
  WorkflowKey,
  {
    label: string;
    heading: string;
    description: string;
    pastedTitle: string;
    documentTitle: string;
    folders: string[];
    canvasItems: string[];
  }
> = {
  research: {
    label: 'Research',
    heading: 'From pasted notes to an organized research workspace.',
    description: 'Paste text, Markdown, or rich content. Arrange it in nested folders, then choose the view that helps you think.',
    pastedTitle: 'Study on Retrieval Practice',
    documentTitle: 'Research brief',
    folders: ['Sources', 'Articles', 'Interview notes'],
    canvasItems: ['Sources', 'Dr. Kim interview', 'Key questions', 'Research brief'],
  },
  teaching: {
    label: 'Teaching',
    heading: 'From lesson material to a focused learning workspace.',
    description: 'Bring in lesson notes, organize the material, and shape the same content into a study view or public assessment.',
    pastedTitle: 'Learning objectives',
    documentTitle: 'Module guide',
    folders: ['Lesson notes', 'Reading list', 'Activities'],
    canvasItems: ['Objectives', 'Core concepts', 'Practice activity', 'Module guide'],
  },
  client: {
    label: 'Client work',
    heading: 'From project notes to a clear client workspace.',
    description: 'Keep briefs, decisions, and delivery notes together, then move the same work between a board and visual canvas.',
    pastedTitle: 'Client kickoff notes',
    documentTitle: 'Delivery brief',
    folders: ['Briefs', 'Decisions', 'Delivery notes'],
    canvasItems: ['Brief', 'Open decisions', 'Milestones', 'Delivery brief'],
  },
  personal: {
    label: 'Personal knowledge',
    heading: 'From passing thoughts to a system you can return to.',
    description: 'Capture notes quickly, arrange them in your own hierarchy, and change the view as your thinking develops.',
    pastedTitle: 'Notes from today',
    documentTitle: 'Working ideas',
    folders: ['Notebook', 'Reading notes', 'Projects'],
    canvasItems: ['Questions', 'References', 'Next steps', 'Working ideas'],
  },
};

const faqs = [
  {
    question: 'Can I start with one folder?',
    answer: 'Yes. Start with one folder and one document, then add structure only when it helps.',
  },
  {
    question: 'Can I paste existing notes?',
    answer: 'Yes. Paste Dock accepts plain text, Markdown, or rich HTML and creates a new note you can organize immediately.',
  },
  {
    question: 'Can the same content use multiple views?',
    answer: 'Yes. Board, Canvas, and Study lenses reference the same folders and documents, so changing the view does not create copies.',
  },
  {
    question: 'Can I publish an assessment?',
    answer: 'Yes. Build a public assessment, configure timing and question behavior, then review live attempts and question-level reports.',
  },
] as const;

function Icon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    arrow: <><path d="M3 8h9" /><path d="m9 4.5 3.5 3.5L9 11.5" /></>,
    check: <path d="m4 8 2.5 2.5L12 5" />,
    document: <><path d="M4 2.5h5L12.5 6v7.5H4Z" /><path d="M9 2.5V6h3.5M6.5 9h3.5M6.5 11.5h2.5" /></>,
    download: <><path d="M8 2.5v7" /><path d="m5.5 7 2.5 2.5L10.5 7M3 12.5h10" /></>,
    folder: <><path d="M2.5 5h4l1.3-1.5h5.7v9H2.5Z" /><path d="M2.5 6.5h11" /></>,
    layers: <><path d="m8 2 6 3-6 3-6-3Z" /><path d="m2 8 6 3 6-3M2 11l6 3 6-3" /></>,
    lock: <><rect x="3.5" y="7" width="9" height="7" rx="2" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" /></>,
    mail: <><rect x="2" y="3.5" width="12" height="9" rx="2" /><path d="m3 5 5 4 5-4" /></>,
    move: <><path d="M8 1.5v13M1.5 8h13" /><path d="m5.5 4 2.5-2.5L10.5 4M5.5 12 8 14.5l2.5-2.5M4 5.5 1.5 8 4 10.5M12 5.5 14.5 8 12 10.5" /></>,
    people: <><circle cx="6" cy="5" r="2.5" /><path d="M1.8 13c.5-3.1 1.9-4.7 4.2-4.7s3.7 1.6 4.2 4.7" /><path d="M10 3.3a2.5 2.5 0 0 1 0 4.2M11 9c1.9.5 2.9 1.8 3.2 4" /></>,
    spark: <><path d="m8 1 1.3 4.2L13.5 6.5 9.3 7.8 8 12l-1.3-4.2L2.5 6.5l4.2-1.3Z" /><path d="m13 10 .6 1.7 1.7.6-1.7.6-.6 1.7-.6-1.7-1.7-.6 1.7-.6Z" /></>,
    write: <><path d="m10.5 2.5 3 3-7.7 7.7-3.5.8.8-3.5Z" /><path d="m8.8 4.2 3 3" /></>,
  };

  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function Arrow() {
  return <Icon name="arrow" className="h-4 w-4" />;
}

function NumberBadge({ children }: { children: ReactNode }) {
  return <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-[0_7px_18px_-7px_rgba(37,99,235,.8)]">{children}</span>;
}

function ProductTour({ workflow }: { workflow: (typeof workflows)[WorkflowKey] }) {
  return (
    <div className="relative rounded-[1.7rem] border border-slate-200 bg-[#fbfcfe] p-3 shadow-[0_28px_80px_-52px_rgba(15,23,42,.5)] sm:p-5">
      <div className="grid gap-4 xl:grid-cols-[0.83fr_1.17fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-900"><Icon name="spark" className="h-4 w-4 text-blue-600" />Paste Dock</div>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-blue-700">Markdown detected</span>
          </div>
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-[10px] leading-5 text-slate-500">
            <span className="text-blue-700"># {workflow.pastedTitle}</span><br />
            ## Notes<br />
            - Main question<br />
            - Evidence to review<br />
            - Follow-up ideas
          </div>
          <button type="button" className="mt-3 w-full rounded-lg bg-blue-600 px-3 py-2.5 text-xs font-semibold text-white">Create note</button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex h-10 items-center justify-between border-b border-slate-100 px-4 text-[10px] font-medium text-slate-500">
            <span>Workspace / {workflow.documentTitle}</span>
            <div className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-slate-300" /><span className="h-1.5 w-1.5 rounded-full bg-slate-300" /><span className="h-1.5 w-1.5 rounded-full bg-slate-300" /></div>
          </div>
          <div className="grid min-h-[230px] grid-cols-[0.43fr_0.57fr]">
            <aside className="border-r border-slate-100 bg-slate-50/70 p-3">
              <p className="flex items-center gap-2 rounded-lg bg-blue-50 px-2.5 py-2 text-[11px] font-semibold text-blue-800"><Icon name="folder" className="h-4 w-4" />{workflow.label}</p>
              <div className="mt-2 space-y-1 pl-2">
                {workflow.folders.map((folder) => <p key={folder} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[10px] text-slate-500"><Icon name="folder" className="h-3.5 w-3.5 text-slate-400" />{folder}</p>)}
              </div>
            </aside>
            <div className="p-4">
              <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold tracking-[-0.02em] text-slate-950">{workflow.documentTitle}</p><span className="rounded-full border border-slate-200 px-2 py-1 text-[9px] font-medium text-slate-500">Private</span></div>
              <p className="mt-4 text-[10px] font-semibold text-slate-800">Overview</p>
              <div className="mt-2 space-y-2"><span className="block h-1.5 w-full rounded bg-slate-100" /><span className="block h-1.5 w-4/5 rounded bg-slate-100" /><span className="block h-1.5 w-11/12 rounded bg-slate-100" /></div>
              <p className="mt-5 text-[10px] font-semibold text-slate-800">Key questions</p>
              <div className="mt-2 space-y-2 text-[9px] text-slate-500"><p>• What matters most here?</p><p>• Which ideas belong together?</p><p>• What should happen next?</p></div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap justify-center gap-1.5 border-b border-slate-100 p-2.5">
          {['Grid', 'Tree', 'Board', 'Canvas', 'Study'].map((view) => <span key={view} className={`rounded-lg px-4 py-1.5 text-[10px] font-semibold ${view === 'Canvas' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500'}`}>{view}</span>)}
        </div>
        <div className="relative h-[220px] overflow-hidden bg-[radial-gradient(circle_at_center,rgba(219,234,254,.55),transparent_58%)] sm:h-[250px]">
          <div className="absolute inset-0 opacity-50 [background-image:radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:18px_18px]" />
          <svg className="absolute inset-0 h-full w-full text-blue-300" viewBox="0 0 700 240" fill="none" preserveAspectRatio="none" aria-hidden="true"><path d="M130 70C210 70 205 120 320 120M570 67C490 67 495 120 380 120M350 145v45" stroke="currentColor" strokeWidth="1.5" /></svg>
          {workflow.canvasItems.map((item, index) => {
            const positions = ['left-[8%] top-8', 'right-[8%] top-8', 'left-1/2 top-[42%] -translate-x-1/2', 'left-1/2 bottom-5 -translate-x-1/2'];
            return <div key={item} className={`absolute ${positions[index]} min-w-28 rounded-xl border ${index === 3 ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white'} px-3 py-3 text-[10px] font-semibold text-slate-700 shadow-sm`}><span className="flex items-center gap-2"><Icon name={index === 0 ? 'folder' : 'document'} className="h-3.5 w-3.5 text-blue-600" />{item}</span></div>;
          })}
        </div>
      </div>
    </div>
  );
}

function LensWorkspace({ activeLens }: { activeLens: LensKey }) {
  const sharedItems = ['Research brief', 'Sources', 'Interview notes', 'Key questions'];

  return (
    <div className="relative mx-auto min-h-[390px] w-full max-w-4xl sm:min-h-[430px]">
      <div className="absolute left-0 top-12 hidden h-[310px] w-[38%] -rotate-2 rounded-2xl border border-white/10 bg-white/[0.06] p-4 opacity-70 shadow-2xl lg:block">
        <p className="text-xs font-semibold text-white">Board</p>
        <div className="mt-5 grid grid-cols-2 gap-3">{['To review', 'Connected'].map((column, columnIndex) => <div key={column} className="rounded-xl bg-white/[0.06] p-2"><p className="text-[9px] font-semibold uppercase tracking-wide text-blue-200">{column}</p>{sharedItems.slice(columnIndex * 2, columnIndex * 2 + 2).map((item) => <div key={item} className="mt-2 rounded-lg bg-white/10 p-2 text-[9px] text-slate-200">{item}</div>)}</div>)}</div>
      </div>

      <div className="absolute right-0 top-12 hidden h-[310px] w-[38%] rotate-2 rounded-2xl border border-white/10 bg-white/[0.06] p-4 opacity-70 shadow-2xl lg:block">
        <p className="text-xs font-semibold text-white">Study</p>
        <div className="mt-5 space-y-2">{sharedItems.map((item, index) => <div key={item} className="rounded-lg bg-white/10 p-3"><div className="flex items-center justify-between text-[9px] text-slate-200"><span>{item}</span><span className="rounded-full bg-emerald-300/20 px-2 py-0.5 text-emerald-200">{index + 2} notes</span></div></div>)}</div>
      </div>

      <div className="relative z-10 mx-auto w-full overflow-hidden rounded-[1.5rem] border border-white/15 bg-[#f8fafc] text-slate-950 shadow-[0_35px_85px_-35px_rgba(0,0,0,.8)] lg:w-[68%]">
        <div className="flex items-center justify-center gap-1 border-b border-slate-200 bg-white p-2.5">
          {(['board', 'canvas', 'study'] as LensKey[]).map((lens) => <span key={lens} className={`rounded-lg px-5 py-2 text-[11px] font-semibold capitalize ${lens === activeLens ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>{lens}</span>)}
        </div>
        {activeLens === 'board' && (
          <div className="grid h-[330px] grid-cols-3 gap-3 p-4">
            {['To review', 'In progress', 'Connected'].map((column, columnIndex) => <div key={column} className="rounded-xl bg-slate-100 p-3"><div className="flex items-center justify-between"><p className="text-[10px] font-semibold text-slate-600">{column}</p><span className="text-[9px] text-slate-400">{columnIndex + 1}</span></div>{sharedItems.slice(columnIndex, columnIndex + 2).map((item) => <div key={item} className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-[10px] font-medium text-slate-700 shadow-sm">{item}</div>)}</div>)}
          </div>
        )}
        {activeLens === 'canvas' && (
          <div className="relative h-[330px] bg-white opacity-100 [background-image:radial-gradient(#dbe3ef_1px,transparent_1px)] [background-size:18px_18px]">
            <svg className="absolute inset-0 h-full w-full text-blue-300" viewBox="0 0 600 330" fill="none" aria-hidden="true"><path d="M130 82C210 80 210 160 300 165M470 82C390 80 390 160 300 165M300 200v70" stroke="currentColor" strokeWidth="1.5" /></svg>
            {sharedItems.map((item, index) => { const position = ['left-8 top-12', 'right-8 top-12', 'left-1/2 top-[42%] -translate-x-1/2', 'left-1/2 bottom-8 -translate-x-1/2'][index]; return <div key={item} className={`absolute ${position} min-w-32 rounded-xl border ${index === 2 ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white'} p-3 text-[10px] font-semibold shadow-sm`}>{item}</div>; })}
          </div>
        )}
        {activeLens === 'study' && (
          <div className="grid h-[330px] grid-cols-[0.68fr_0.32fr] gap-4 p-4">
            <div className="space-y-3">{sharedItems.map((item, index) => <div key={item} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><p className="text-[11px] font-semibold text-slate-800">{item}</p><span className="rounded-full bg-blue-50 px-2 py-1 text-[9px] text-blue-700">{['method', 'source', 'signal', 'question'][index]}</span></div><div className="mt-3 h-1.5 w-4/5 rounded bg-slate-100" /></div>)}</div>
            <aside className="rounded-xl bg-slate-100 p-3"><p className="text-[10px] font-semibold text-slate-700">Connected notes</p><div className="mt-3 space-y-2">{sharedItems.slice(0, 3).map((item) => <p key={item} className="rounded-lg bg-white p-2 text-[9px] text-slate-500">{item}</p>)}</div></aside>
          </div>
        )}
      </div>
    </div>
  );
}

function AssessmentFlow() {
  return (
    <div className="relative mt-14 grid gap-5 lg:grid-cols-3">
      <span className="absolute left-[31.8%] top-7 hidden h-px w-[3.2%] bg-blue-300 lg:block" />
      <span className="absolute left-[65.1%] top-7 hidden h-px w-[3.2%] bg-blue-300 lg:block" />
      <article>
        <div className="mb-4 flex items-center gap-3"><NumberBadge>1</NumberBadge><div><h3 className="font-semibold text-slate-950">Build</h3><p className="text-xs text-slate-500">Create the assessment</p></div></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_45px_-34px_rgba(15,23,42,.55)]">
          <label className="text-[10px] font-semibold text-slate-600">Assessment title</label><div className="mt-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[10px] text-slate-700">Retrieval practice: key concepts</div>
          <div className="mt-4 grid grid-cols-[1fr_0.78fr] gap-3"><div><p className="text-[10px] font-semibold text-slate-600">Questions</p>{['Single choice', 'Multiple choice', 'True / False', 'Short text'].map((type, index) => <div key={type} className="mt-2 flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2 text-[9px] text-slate-600"><span className="grid h-4 w-4 place-items-center rounded bg-white text-[8px]">{index + 1}</span>{type}</div>)}</div><div><p className="text-[10px] font-semibold text-slate-600">Settings</p><div className="mt-2 rounded-lg bg-blue-50 p-3 text-[9px] leading-5 text-blue-800">30 minute limit<br />Public link<br />Shuffle questions</div></div></div>
          <button type="button" className="mt-4 w-full rounded-lg bg-blue-600 py-2.5 text-[10px] font-semibold text-white">Publish assessment</button>
        </div>
      </article>

      <article>
        <div className="mb-4 flex items-center gap-3"><NumberBadge>2</NumberBadge><div><h3 className="font-semibold text-slate-950">Run</h3><p className="text-xs text-slate-500">A clear public experience</p></div></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_45px_-34px_rgba(15,23,42,.55)]">
          <div className="flex items-center justify-between"><p className="text-xs font-semibold text-slate-900">Retrieval practice</p><span className="rounded-lg bg-slate-950 px-2.5 py-1.5 font-mono text-[10px] font-semibold text-white">26:48</span></div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-1/2 rounded-full bg-blue-600" /></div>
          <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-700">Question 2 of 10</p><h4 className="mt-2 text-sm font-semibold leading-5 text-slate-900">Which statement best describes retrieval practice?</h4>
          <div className="mt-4 space-y-2">{['Rereading material repeatedly', 'Trying to recall information from memory', 'Highlighting important sentences'].map((answer, index) => <div key={answer} className={`flex items-center gap-3 rounded-xl border p-3 text-[10px] ${index === 1 ? 'border-blue-300 bg-blue-50 text-blue-900' : 'border-slate-200 text-slate-600'}`}><span className={`h-3 w-3 rounded-full border ${index === 1 ? 'border-[4px] border-blue-600' : 'border-slate-300'}`} />{answer}</div>)}</div>
          <div className="mt-5 flex items-center justify-between"><button type="button" className="text-[10px] font-semibold text-slate-500">Previous</button><button type="button" className="rounded-lg bg-blue-600 px-5 py-2.5 text-[10px] font-semibold text-white">Save &amp; next</button></div>
        </div>
      </article>

      <article>
        <div className="mb-4 flex items-center gap-3"><NumberBadge>3</NumberBadge><div><h3 className="font-semibold text-slate-950">Understand</h3><p className="text-xs text-slate-500">Review results as they arrive</p></div></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_45px_-34px_rgba(15,23,42,.55)]">
          <div className="flex gap-3 border-b border-slate-100 pb-3 text-[9px] font-semibold"><span className="text-blue-700">Live attempts</span><span className="text-slate-400">Answer matrix</span><span className="text-slate-400">Question analytics</span></div>
          <div className="mt-4 grid grid-cols-4 gap-2">{[['Attempts', '28'], ['Active', '4'], ['Submitted', '24'], ['Needs review', '3']].map(([label, value]) => <div key={label} className="rounded-lg bg-slate-50 p-2"><p className="text-[8px] text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold text-slate-900">{value}</p></div>)}</div>
          <div className="mt-4 flex items-center justify-between"><p className="text-[10px] font-semibold text-slate-700">Recent attempts</p><div className="flex gap-1"><span className="rounded border border-slate-200 px-2 py-1 text-[8px] text-slate-500">CSV</span><span className="rounded border border-slate-200 px-2 py-1 text-[8px] text-slate-500">XLSX</span></div></div>
          <div className="mt-2 divide-y divide-slate-100">{[['Alex Kim', '88%', 'Submitted'], ['Taylor Morgan', '68%', 'Review'], ['Jordan Lee', 'In progress', 'Active'], ['Casey Park', '92%', 'Submitted']].map(([name, score, status]) => <div key={name} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 py-3 text-[9px]"><span className="font-medium text-slate-700">{name}</span><span className="text-slate-500">{score}</span><span className={`rounded-full px-2 py-1 ${status === 'Submitted' ? 'bg-emerald-50 text-emerald-700' : status === 'Active' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>{status}</span></div>)}</div>
        </div>
      </article>
    </div>
  );
}

export function AirunoteLandingPage() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [heroStory, setHeroStory] = useState(0);
  const [activeWorkflow, setActiveWorkflow] = useState<WorkflowKey>('research');
  const [activeLens, setActiveLens] = useState<LensKey>('canvas');
  const [openFaq, setOpenFaq] = useState(0);
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => {
      setHeroStory((current) => (current + 1) % heroStories.length);
    }, 3200);
    return () => window.clearInterval(timer);
  }, []);

  const activeStory = heroStories[heroStory];
  const workflow = workflows[activeWorkflow];

  const handleSignup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = email.trim() ? `?email=${encodeURIComponent(email.trim())}` : '';
    router.push(`/register${query}`);
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#f7f8fa] text-[#101727] selection:bg-blue-200 selection:text-blue-950">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/70 bg-[#f7f8fa]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <AirunoteLogo iconSize={22} textClassName="text-[15px] font-semibold tracking-[-0.02em] text-slate-950" />
          <nav className="hidden items-center gap-8 text-sm text-slate-600 md:flex" aria-label="Primary navigation">
            <Link href="#system" className="transition-colors hover:text-slate-950">System</Link>
            <Link href="#lenses" className="transition-colors hover:text-slate-950">Lenses</Link>
            <Link href="#workspaces" className="transition-colors hover:text-slate-950">Workspaces</Link>
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <Link href="/login" className="rounded-full px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-white hover:text-slate-950">Sign in</Link>
            <Link href="/register" className="group inline-flex items-center gap-2 rounded-full bg-[#101727] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-900/15">Start free <Arrow /></Link>
          </div>
          <button type="button" className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white md:hidden" aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
            <span className="relative block h-4 w-5"><span className={`absolute left-0 top-1 h-px w-5 bg-slate-950 transition-transform ${menuOpen ? 'translate-y-1.5 rotate-45' : ''}`} /><span className={`absolute bottom-1 left-0 h-px w-5 bg-slate-950 transition-transform ${menuOpen ? '-translate-y-1.5 -rotate-45' : ''}`} /></span>
          </button>
        </div>
        {menuOpen && <nav className="border-t border-slate-200 bg-white px-5 py-5 md:hidden" aria-label="Mobile navigation"><div className="flex flex-col gap-1">{['system', 'lenses', 'workspaces'].map((item) => <Link key={item} href={`#${item}`} onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-sm font-medium capitalize text-slate-700 hover:bg-slate-50">{item}</Link>)}<div className="mt-3 grid grid-cols-2 gap-3"><Link href="/login" className="rounded-full border border-slate-200 px-4 py-3 text-center text-sm font-semibold">Sign in</Link><Link href="/register" className="rounded-full bg-[#101727] px-4 py-3 text-center text-sm font-semibold text-white">Start free</Link></div></div></nav>}
      </header>

      <main>
        <section className="relative px-5 pb-16 pt-28 sm:px-8 sm:pb-24 sm:pt-36 lg:px-12 lg:pt-40">
          <div className="pointer-events-none absolute left-1/2 top-20 h-[580px] w-[1000px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(55,105,230,0.12),rgba(255,255,255,0)_66%)]" />
          <div className="relative mx-auto max-w-[1440px]">
            <div className="grid gap-12 lg:grid-cols-[0.88fr_1.12fr] lg:items-center lg:gap-16">
              <div>
                <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-white/80 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.13em] text-blue-700 shadow-sm shadow-blue-900/5"><span className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_0_4px_rgba(52,95,209,0.12)]" />One system. Many kinds of work.</div>
                <h1 className="text-left text-[clamp(2.75rem,5.2vw,6rem)] font-semibold leading-[0.89] tracking-[-0.07em] text-[#101727]">
                  <span className="block whitespace-nowrap">Think in</span>
                  <span className="block whitespace-nowrap">your own</span>
                  <span className="hero-shape-word block whitespace-nowrap"><span className="sr-only">shape.</span><span aria-hidden="true"><span className="hero-shape-glint">shape.</span></span></span>
                  <span key={activeStory.line1} className="hero-story-enter hidden bg-gradient-to-r from-blue-700 via-blue-500 to-[#7a72ef] bg-clip-text pb-2 text-transparent"><span className="block whitespace-nowrap">{activeStory.line1}</span></span>
                </h1>
                <p className="mt-7 max-w-xl text-balance text-lg leading-8 text-slate-600 sm:text-xl">Bring every kind of knowledge work into one calm workspace - from onboarding and teaching to client delivery, research, recruiting, coaching, CRM, and personal notes,</p>
                <p className="hero-organized-line max-w-xl text-balance text-lg leading-8 text-slate-600 sm:text-xl">organized the way your brain works.</p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link href="/register" className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#101727] px-7 py-3.5 text-[15px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-950/15">Create your workspace <Arrow /></Link><Link href="#system" className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white/90 px-7 py-3.5 text-[15px] font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-white">See what you can build</Link></div>
              </div>
              <div className="relative mx-auto w-full max-w-4xl">
                <div className="relative aspect-[3/2] overflow-hidden rounded-[1.6rem] border border-white shadow-[0_42px_110px_-38px_rgba(15,27,61,0.5)] sm:rounded-[2rem]">
                  <Image src="/airunote/knowledge-terrain-v1.png" alt="Airunote knowledge terrain" fill priority unoptimized className="object-cover" />
                  <div className="terrain-sun-glow" aria-hidden="true" />
                  <svg className="river-trajectory-layer" viewBox="0 0 1000 667" preserveAspectRatio="none" aria-hidden="true">
                    <path id="river-paper-boat-path" d="M757 308 C770 319 766 333 742 354 C646 378 642 404 643 432 C619 467 495 482 448 497 C424 507 432 527 392 548 C308 552 285 590 222 607 C202 617 215 627 179 637" fill="none" />
                    <use href="#river-paper-boat-path" className="river-trajectory-guide" /><use href="#river-paper-boat-path" className="river-trajectory-flow" /><circle className="river-trajectory-point river-trajectory-point-start" cx="750" cy="308" r="5" /><circle className="river-trajectory-point river-trajectory-point-end" cx="212" cy="642" r="5" />
                    <g className="river-paper-boat-vector"><animateMotion dur="180s" repeatCount="indefinite" rotate="0" calcMode="linear" keyPoints="0;1;1" keyTimes="0;0.88;1"><mpath href="#river-paper-boat-path" /></animateMotion><ellipse className="river-paper-boat-ripple" cx="0" cy="10" rx="18" ry="4" /><g transform="rotate(-18)"><image className="river-paper-boat-vector-image" href="/airunote/paper-boat-3d-v1.png" x="-27" y="-18" width="54" height="36" preserveAspectRatio="xMidYMid meet" /></g></g>
                    <g className="river-paper-boat-vector-static" transform="translate(212 642) rotate(-18)"><ellipse className="river-paper-boat-ripple" cx="0" cy="10" rx="18" ry="4" /><image className="river-paper-boat-vector-image" href="/airunote/paper-boat-3d-v1.png" x="-27" y="-18" width="54" height="36" preserveAspectRatio="xMidYMid meet" /></g>
                    <g className="terrain-wave-flag" transform="translate(245 85)"><g className="terrain-wave-flag-cloth"><image className="terrain-wave-flag-mark" href="/airunote/airunote-swoosh.svg?v=20260901-blue" x="2" y="-45" width="40" height="20" preserveAspectRatio="xMidYMid meet" /></g></g>
                  </svg>
                </div>
              </div>
            </div>
            <div id="use-cases" className="mt-16 scroll-mt-24 overflow-hidden border-y border-slate-200 py-5"><div className="hero-marquee flex w-max gap-3 pr-3">{[...workflowValues, ...workflowValues].map((story, index) => <button key={`${story.label}-${index}`} type="button" onClick={() => setHeroStory(index % heroStories.length)} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-blue-200 hover:text-blue-700"><span className={`h-1.5 w-1.5 rounded-full ${story.accent}`} />{story.label}</button>)}</div></div>
          </div>
        </section>

        <section aria-label="Airunote assurances" className="border-y border-slate-200 bg-white/70 px-5 sm:px-8 lg:px-12">
          <div className="mx-auto grid max-w-[1280px] divide-y divide-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {[
              { icon: 'spark' as IconName, title: 'Start free', copy: 'No credit card' },
              { icon: 'lock' as IconName, title: 'Private by default', copy: 'Yours from the start' },
              { icon: 'layers' as IconName, title: 'Same content', copy: 'Many useful views' },
            ].map((item) => <div key={item.title} className="flex items-center justify-center gap-3 px-5 py-5"><span className="grid h-10 w-10 place-items-center rounded-full bg-blue-50 text-blue-700"><Icon name={item.icon} /></span><div><p className="text-sm font-semibold text-slate-950">{item.title}</p><p className="mt-0.5 text-xs text-slate-500">{item.copy}</p></div></div>)}
          </div>
        </section>

        <section id="system" className="scroll-mt-20 px-5 py-20 sm:px-8 sm:py-28 lg:px-12 lg:py-32">
          <div className="mx-auto max-w-[1280px]">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">See Airunote at work</p>
            <div className="mt-4 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
              <h2 className="max-w-2xl text-balance text-4xl font-semibold leading-[1.01] tracking-[-0.05em] text-slate-950 sm:text-6xl">Start with what you know. Shape it for what comes next.</h2>
              <div className="flex flex-wrap gap-2 lg:justify-end" role="tablist" aria-label="Example workflows">
                {(Object.keys(workflows) as WorkflowKey[]).map((key) => <button key={key} type="button" role="tab" aria-selected={activeWorkflow === key} onClick={() => setActiveWorkflow(key)} className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition-all ${activeWorkflow === key ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-900/15' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700'}`}>{workflows[key].label}</button>)}
              </div>
            </div>

            <div className="mt-12 grid gap-8 lg:grid-cols-[0.36fr_0.64fr] lg:items-start">
              <div className="lg:sticky lg:top-28">
                <h3 className="max-w-md text-3xl font-semibold leading-tight tracking-[-0.035em] text-slate-950">{workflow.heading}</h3>
                <p className="mt-5 max-w-md text-base leading-7 text-slate-600">{workflow.description}</p>
                <ol className="relative mt-9 space-y-6 before:absolute before:bottom-4 before:left-[15px] before:top-4 before:w-px before:bg-blue-200">
                  {[
                    ['Paste', 'Turn existing text into a note.'],
                    ['Organize', 'Nest folders and documents your way.'],
                    ['Reframe', 'Change the view, not the content.'],
                  ].map(([title, copy], index) => <li key={title} className="relative flex gap-4"><NumberBadge>{index + 1}</NumberBadge><div><p className="text-sm font-semibold text-slate-900">{title}</p><p className="mt-1 text-sm leading-6 text-slate-500">{copy}</p></div></li>)}
                </ol>
                <div className="mt-9 flex flex-wrap items-center gap-5"><Link href="/register" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/15 transition-transform hover:-translate-y-0.5">Start free <Arrow /></Link><Link href="#lenses" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700">Tour the workspace <Arrow /></Link></div>
              </div>
              <ProductTour workflow={workflow} />
            </div>
          </div>
        </section>

        <section id="lenses" className="scroll-mt-20 px-5 py-10 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-[1320px] overflow-hidden rounded-[2rem] bg-[#081a3a] px-6 py-14 text-white shadow-[0_35px_90px_-55px_rgba(8,26,58,.85)] sm:rounded-[2.5rem] sm:px-10 sm:py-20 lg:px-16">
            <div className="grid gap-10 lg:grid-cols-[0.32fr_0.68fr] lg:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-300">One content system</p>
                <h2 className="mt-5 text-balance text-4xl font-semibold leading-[1.02] tracking-[-0.05em] sm:text-6xl">Change the lens. Keep the work.</h2>
                <p className="mt-6 max-w-md text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">The same folders and documents can become a board, a spatial canvas, or a focused study view—without creating copies.</p>
                <div className="mt-8 flex flex-wrap gap-2" role="tablist" aria-label="Airunote lenses">{(['board', 'canvas', 'study'] as LensKey[]).map((lens) => <button key={lens} type="button" role="tab" aria-selected={activeLens === lens} onClick={() => setActiveLens(lens)} className={`min-h-11 rounded-full border px-4 py-2 text-sm font-semibold capitalize transition-all ${activeLens === lens ? 'border-blue-400 bg-blue-500 text-white' : 'border-white/15 bg-white/5 text-slate-300 hover:bg-white/10'}`}>{lens}</button>)}</div>
                <Link href="#assessments" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-blue-200">Explore lenses <Arrow /></Link>
              </div>
              <LensWorkspace activeLens={activeLens} />
            </div>
            <div className="mt-10 grid gap-3 border-t border-white/10 pt-8 sm:grid-cols-3">
              {[
                { icon: 'move' as IconName, title: 'Drag & resize', copy: 'Arrange ideas spatially.' },
                { icon: 'write' as IconName, title: 'Edit in place', copy: 'Open a note without leaving the view.' },
                { icon: 'download' as IconName, title: 'Export canvas to PDF', copy: 'Take the arrangement with you.' },
              ].map((item) => <div key={item.title} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-blue-200"><Icon name={item.icon} /></span><div><p className="text-sm font-semibold text-white">{item.title}</p><p className="mt-1 text-xs leading-5 text-slate-400">{item.copy}</p></div></div>)}
            </div>
          </div>
        </section>

        <section id="assessments" className="scroll-mt-20 px-5 py-24 sm:px-8 sm:py-32 lg:px-12">
          <div className="mx-auto max-w-[1280px]">
            <div className="mx-auto max-w-4xl text-center"><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">From knowledge to outcome</p><h2 className="mt-5 text-balance text-4xl font-semibold leading-[1.02] tracking-[-0.05em] text-slate-950 sm:text-6xl">Create the material. Publish the assessment. See what landed.</h2><p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">Build timed public assessments, collect responses, and review live and question-level results.</p></div>
            <AssessmentFlow />
            <div className="mt-10 text-center"><Link href="/register" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/15 transition-transform hover:-translate-y-0.5">Start free <Arrow /></Link></div>
          </div>
        </section>

        <section id="workspaces" className="scroll-mt-20 px-5 pb-24 sm:px-8 sm:pb-32 lg:px-12">
          <div className="mx-auto grid max-w-[1280px] gap-5 lg:grid-cols-2">
            <article className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-7 shadow-[0_22px_60px_-45px_rgba(15,23,42,.45)] sm:p-10">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Trust by design</p><h2 className="mt-4 text-4xl font-semibold tracking-[-0.045em] text-slate-950">Private by default.</h2><p className="mt-4 max-w-lg text-base leading-7 text-slate-600">Your folders and documents begin private and remain user-owned.</p>
              <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"><div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3"><p className="flex items-center gap-2 text-xs font-semibold text-slate-900"><Icon name="folder" className="h-4 w-4 text-blue-600" />My workspace</p><span className="flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[9px] font-semibold text-blue-700"><Icon name="lock" className="h-3 w-3" />Private</span></div><div className="grid grid-cols-[0.4fr_0.6fr]"><div className="border-r border-slate-200 p-3">{['Research', 'Notes', 'Ideas'].map((folder) => <p key={folder} className="flex items-center gap-2 rounded-lg px-2 py-2 text-[10px] text-slate-600"><Icon name="folder" className="h-3.5 w-3.5 text-amber-500" />{folder}</p>)}</div><div className="grid min-h-40 place-items-center p-5 text-center"><div><span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white text-slate-500 shadow-sm"><Icon name="lock" className="h-5 w-5" /></span><p className="mt-3 text-[10px] font-medium text-slate-600">Choose a document to begin</p></div></div></div></div>
            </article>

            <article className="overflow-hidden rounded-[2rem] border border-blue-100 bg-gradient-to-br from-white to-blue-50/80 p-7 shadow-[0_22px_60px_-45px_rgba(30,64,175,.4)] sm:p-10">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Workspaces when they help</p><h2 className="mt-4 max-w-xl text-4xl font-semibold leading-[1.05] tracking-[-0.045em] text-slate-950">Personal when it should be. A workspace when it helps.</h2><p className="mt-4 max-w-lg text-base leading-7 text-slate-600">Keep personal work separate, create another workspace for a team, and manage membership with a join code.</p>
              <div className="mt-8 grid gap-3 sm:grid-cols-[1fr_1fr_1.15fr]"><div className="rounded-2xl border border-slate-200 bg-white p-4"><span className="grid h-9 w-9 place-items-center rounded-full bg-blue-50 text-blue-700"><Icon name="lock" className="h-4 w-4" /></span><p className="mt-6 text-xs font-semibold text-slate-900">My workspace</p><p className="mt-1 text-[10px] text-slate-500">Personal</p></div><div className="rounded-2xl border border-slate-200 bg-white p-4"><span className="grid h-9 w-9 place-items-center rounded-full bg-violet-50 text-violet-700"><Icon name="people" className="h-4 w-4" /></span><p className="mt-6 text-xs font-semibold text-slate-900">Design team</p><p className="mt-1 text-[10px] text-slate-500">Workspace</p></div><div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-semibold text-slate-700">Join a workspace</p><label className="mt-3 block text-[9px] text-slate-500">Enter join code</label><div className="mt-1.5 rounded-lg border border-slate-200 px-3 py-2 font-mono text-[10px] tracking-widest text-slate-700">A1B2-C3D4</div><button type="button" className="mt-2 w-full rounded-lg bg-blue-600 py-2 text-[10px] font-semibold text-white">Join workspace</button></div></div>
            </article>
          </div>
        </section>

        <section className="border-t border-slate-200 bg-white/60 px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
          <div className="mx-auto grid max-w-[1280px] gap-5 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 sm:p-8"><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Questions before you start</p><h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">A clear place to begin.</h2><div className="mt-6 divide-y divide-slate-200 border-y border-slate-200">{faqs.map((faq, index) => <div key={faq.question}><button type="button" className="flex min-h-14 w-full items-center justify-between gap-4 py-3 text-left text-sm font-semibold text-slate-800" aria-expanded={openFaq === index} onClick={() => setOpenFaq(openFaq === index ? -1 : index)}><span>{faq.question}</span><span className={`text-lg font-normal text-slate-400 transition-transform ${openFaq === index ? 'rotate-45' : ''}`}>+</span></button>{openFaq === index && <p className="max-w-xl pb-5 pr-8 text-sm leading-6 text-slate-500">{faq.answer}</p>}</div>)}</div></div>

            <div className="relative overflow-hidden rounded-[2rem] border border-blue-100 bg-[radial-gradient(circle_at_50%_0%,rgba(191,219,254,.8),transparent_45%),linear-gradient(145deg,#ffffff,#eff6ff)] p-7 text-center shadow-[0_24px_70px_-50px_rgba(30,64,175,.5)] sm:p-12"><div className="relative"><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">A calmer place to think</p><h2 className="mx-auto mt-4 max-w-2xl text-balance text-4xl font-semibold leading-[1] tracking-[-0.05em] text-slate-950 sm:text-6xl">Build a workspace around the way you actually work.</h2><p className="mx-auto mt-5 max-w-xl text-base leading-7 text-slate-600">Start free with email. We&apos;ll send an 8-digit verification code.</p><form onSubmit={handleSignup} className="mx-auto mt-7 flex max-w-xl flex-col gap-2 sm:flex-row"><label htmlFor="landing-signup-email" className="sr-only">Email address</label><div className="flex min-h-12 flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 text-slate-400 shadow-sm focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100"><Icon name="mail" className="h-4 w-4 shrink-0" /><input id="landing-signup-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="w-full bg-transparent py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400" /></div><button type="submit" className="min-h-12 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/15 transition-transform hover:-translate-y-0.5">Start free</button></form><p className="mt-4 text-xs text-slate-500">No credit card required.</p><p className="mt-3 text-xs text-slate-500">Already have an account? <Link href="/login" className="font-semibold text-blue-700 hover:underline">Sign in</Link></p></div></div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-[1280px] flex-col gap-8 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12"><div><AirunoteLogo iconSize={20} textClassName="text-sm font-semibold text-slate-950" /><p className="mt-2 text-xs text-slate-500">A knowledge workspace by AOTECH.</p></div><div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-slate-500"><Link href="#system" className="hover:text-slate-950">System</Link><Link href="#lenses" className="hover:text-slate-950">Lenses</Link><Link href="/login" className="hover:text-slate-950">Sign in</Link><span>© {new Date().getFullYear()} airunote</span></div></div></footer>
    </div>
  );
}
