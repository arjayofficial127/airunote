'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { AirunoteLogo } from '@/components/brand/AirunoteLogo';
import type { AiruFolderType } from '@/components/airunote/types';
import { getFolderTypeIcon } from '@/components/airunote/utils/folderTypeIcon';
import { LivingLensPlayground, type DemoLensKey } from '@/components/landing/LivingLensPlayground';

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

const workspaceShapes: Array<{ type: AiruFolderType; label: string; description: string }> = [
  { type: 'box', label: 'Box', description: 'A flexible general workspace.' },
  { type: 'book', label: 'Book', description: 'Structure chapters and long-form writing.' },
  { type: 'board', label: 'Board', description: 'Move work through clear stages.' },
  { type: 'project', label: 'Project', description: 'Keep execution and supporting knowledge together.' },
  { type: 'pipeline', label: 'Pipeline', description: 'Track opportunities and progress.' },
  { type: 'ledger', label: 'Ledger', description: 'Organize financial and numerical records.' },
  { type: 'wiki', label: 'Wiki', description: 'Build connected, reusable knowledge.' },
  { type: 'notebook', label: 'Notebook', description: 'Capture freeform notes as they develop.' },
  { type: 'journal', label: 'Journal', description: 'Keep dated personal or working reflections.' },
  { type: 'contacts', label: 'Contacts', description: 'Create a useful people directory.' },
  { type: 'canvas', label: 'Canvas', description: 'Arrange ideas spatially.' },
  { type: 'manual', label: 'Manual', description: 'Build clear operational documentation.' },
  { type: 'collection', label: 'Collection', description: 'Group related items into one browsable place.' },
];

type WorkflowKey = 'research' | 'teaching' | 'client' | 'personal';
type LensKey = DemoLensKey;
type PublishModeKey = 'exam' | 'quiz' | 'survey' | 'inquiry' | 'feedback' | 'application' | 'check';
type TrustModeKey = 'private' | 'share' | 'team';
type IconName =
  | 'arrow'
  | 'check'
  | 'document'
  | 'download'
  | 'folder'
  | 'grid'
  | 'info'
  | 'layers'
  | 'lock'
  | 'mail'
  | 'move'
  | 'people'
  | 'spark'
  | 'write';

const publishModes: Record<
  PublishModeKey,
  {
    label: string;
    noun: string;
    title: string;
    summary: string;
    goodFor: string[];
    journey: Array<{ label: string; copy: string }>;
    builderLabel: string;
    builderItems: Array<{ label: string; detail: string }>;
    question: string;
    questionLabel: string;
    answers: string[];
    selectedAnswer: number;
    settings: string[];
    action: string;
    liveBadge: string;
    nextAction: string;
    reportTabs: string[];
    metrics: Array<{ label: string; value: string }>;
    reportLabel: string;
    respondents: Array<{ name: string; result: string; status: string; tone: 'green' | 'amber' | 'blue' | 'slate' }>;
  }
> = {
  exam: {
    label: 'Exam', noun: 'exam', title: 'Cell Biology — Midterm',
    summary: 'Turn a unit of notes into a timed, graded exam and see where the class needs another pass.',
    goodFor: ['Teachers', 'Tutors', 'Students'],
    journey: [{ label: 'Start with lesson notes', copy: 'Reuse the material you already teach.' }, { label: 'Set scoring & time', copy: 'Grade questions and control attempts.' }, { label: 'Send it to the class', copy: 'Share one focused exam link.' }, { label: 'Review every score', copy: 'See class and question-level gaps.' }],
    builderLabel: 'Question set', builderItems: [{ label: 'Single choice', detail: '12 questions' }, { label: 'Short answer', detail: '3 questions' }, { label: 'True / False', detail: '5 questions' }],
    questionLabel: 'Question 8 of 20', question: 'Which organelle produces most of a cell’s ATP?', answers: ['Nucleus', 'Mitochondrion', 'Ribosome'], selectedAnswer: 1,
    settings: ['45 minute limit', 'Shuffle questions', 'Maximum 2 attempts'], action: 'Publish exam', liveBadge: '42:18', nextAction: 'Next question',
    reportTabs: ['Scorebook', 'Answer matrix', 'Item analysis'], metrics: [{ label: 'Attempts', value: '84' }, { label: 'Live', value: '12' }, { label: 'Submitted', value: '72' }, { label: 'Average score', value: '81%' }], reportLabel: 'Student results',
    respondents: [{ name: 'Mia Santos', result: '91%', status: 'Submitted', tone: 'green' }, { name: 'Jamal Reed', result: '78%', status: 'Review', tone: 'amber' }, { name: 'Noah Lim', result: 'In progress', status: 'Active', tone: 'blue' }, { name: 'Ava Cruz', result: '86%', status: 'Submitted', tone: 'green' }],
  },
  quiz: {
    label: 'Quiz', noun: 'quiz', title: 'Café Food-Safety Quiz',
    summary: 'Give every new hire the same quick food-safety check before their first busy shift.',
    goodFor: ['Cafeterias', 'Trainers', 'New hires'],
    journey: [{ label: 'Start with the SOP', copy: 'Pull questions from the team manual.' }, { label: 'Choose the essentials', copy: 'Keep the quiz short and practical.' }, { label: 'Share before the shift', copy: 'Open one link on any device.' }, { label: 'Spot training gaps', copy: 'See what needs a live refresher.' }],
    builderLabel: 'Quiz blocks', builderItems: [{ label: 'Single choice', detail: '8 questions' }, { label: 'True / False', detail: '4 questions' }, { label: 'Short text', detail: '2 questions' }],
    questionLabel: 'Question 4 of 14', question: 'Where should raw chicken be stored in the refrigerator?', answers: ['On the top shelf', 'On the bottom shelf', 'Beside ready-to-eat food'], selectedAnswer: 1,
    settings: ['Public link', 'Shuffle options', 'Show review after submit'], action: 'Publish quiz', liveBadge: '06:42', nextAction: 'Check answer',
    reportTabs: ['Completions', 'Answer breakdown', 'Question review'], metrics: [{ label: 'Completed', value: '43' }, { label: 'First try', value: '35' }, { label: 'Needs review', value: '8' }, { label: 'Average score', value: '88%' }], reportLabel: 'Shift readiness',
    respondents: [{ name: 'Lea Mendoza', result: '100%', status: 'Ready', tone: 'green' }, { name: 'Marco Tan', result: '79%', status: 'Review', tone: 'amber' }, { name: 'Sam Dizon', result: 'In progress', status: 'Active', tone: 'blue' }, { name: 'Ivy Ramos', result: '93%', status: 'Ready', tone: 'green' }],
  },
  survey: {
    label: 'Survey', noun: 'survey', title: 'Clinic Visit Experience',
    summary: 'Ask patients one clear set of questions and watch service patterns emerge while visits are still fresh.',
    goodFor: ['Clinics', 'Cafeterias', 'Local businesses'],
    journey: [{ label: 'Start with a service goal', copy: 'Decide what the team needs to learn.' }, { label: 'Mix scales & comments', copy: 'Keep the survey fast to answer.' }, { label: 'Share by link or QR', copy: 'Meet people where the visit ends.' }, { label: 'Read the patterns', copy: 'Turn responses into next actions.' }],
    builderLabel: 'Survey sections', builderItems: [{ label: 'Experience scale', detail: '4 questions' }, { label: 'Multiple choice', detail: '2 questions' }, { label: 'Open comment', detail: '1 question' }],
    questionLabel: 'Question 3 of 7', question: 'How clear were the next steps after your visit?', answers: ['Completely clear', 'Mostly clear', 'I still have questions'], selectedAnswer: 0,
    settings: ['Ungraded', 'Optional email', 'One question at a time'], action: 'Publish survey', liveBadge: 'Live', nextAction: 'Continue',
    reportTabs: ['Response trends', 'Answer matrix', 'Comments'], metrics: [{ label: 'Responses', value: '126' }, { label: 'Today', value: '18' }, { label: 'Complete', value: '119' }, { label: 'Clarity score', value: '4.3/5' }], reportLabel: 'Recent visits',
    respondents: [{ name: 'Maria L.', result: '5/5', status: 'Complete', tone: 'green' }, { name: 'Daniel R.', result: '3/5', status: 'Follow up', tone: 'amber' }, { name: 'Visit #1048', result: 'In progress', status: 'Live', tone: 'blue' }, { name: 'Jean P.', result: '4/5', status: 'Complete', tone: 'green' }],
  },
  inquiry: {
    label: 'Inquiry', noun: 'inquiry form', title: 'New Patient Inquiry',
    summary: 'Collect the right details before the first call so staff can route each request with confidence.',
    goodFor: ['Clinics', 'Consultancies', 'Service teams'],
    journey: [{ label: 'Start with your services', copy: 'Reuse the information people ask about.' }, { label: 'Ask only what helps', copy: 'Collect contact details and intent.' }, { label: 'Place one public link', copy: 'Use it on your site or profile.' }, { label: 'Triage each request', copy: 'See what is new and who replied.' }],
    builderLabel: 'Inquiry fields', builderItems: [{ label: 'Contact details', detail: 'Name + email' }, { label: 'Service selection', detail: '1 required field' }, { label: 'Short description', detail: 'Up to 500 characters' }],
    questionLabel: 'Request 2 of 5', question: 'What kind of appointment are you looking for?', answers: ['Initial consultation', 'Follow-up visit', 'Records request'], selectedAnswer: 0,
    settings: ['Required email', 'Public link', 'Response review'], action: 'Open inquiries', liveBadge: 'Open', nextAction: 'Send inquiry',
    reportTabs: ['Inbox', 'Service mix', 'Response time'], metrics: [{ label: 'New', value: '28' }, { label: 'Today', value: '6' }, { label: 'Awaiting reply', value: '7' }, { label: 'Booked', value: '14' }], reportLabel: 'Inquiry queue',
    respondents: [{ name: 'Ana Velasco', result: 'Consultation', status: 'New', tone: 'blue' }, { name: 'Rico Flores', result: 'Follow-up', status: 'Replied', tone: 'green' }, { name: 'Tess Uy', result: 'Records', status: 'Review', tone: 'amber' }, { name: 'Ben Chua', result: 'Consultation', status: 'Booked', tone: 'green' }],
  },
  feedback: {
    label: 'Feedback', noun: 'feedback form', title: 'School Lunch Feedback',
    summary: 'Give students a quick voice, then show the cafeteria team exactly what to improve next week.',
    goodFor: ['Students', 'Cafeterias', 'Campus teams'],
    journey: [{ label: 'Start with the menu', copy: 'Ask about a real shared experience.' }, { label: 'Keep it lightweight', copy: 'Use one choice and one comment.' }, { label: 'Post the response link', copy: 'Let students answer on the way out.' }, { label: 'Choose the next change', copy: 'See top requests without guesswork.' }],
    builderLabel: 'Feedback prompts', builderItems: [{ label: 'Quick choice', detail: '2 questions' }, { label: 'Optional comment', detail: '1 question' }, { label: 'Meal selection', detail: '1 field' }],
    questionLabel: 'Question 2 of 4', question: 'What would make lunch better next week?', answers: ['More vegetarian options', 'Shorter serving lines', 'Quieter seating areas'], selectedAnswer: 0,
    settings: ['Ungraded', 'Short text enabled', 'Optional identity'], action: 'Collect feedback', liveBadge: 'Live', nextAction: 'Send feedback',
    reportTabs: ['Top requests', 'Comments', 'Meal breakdown'], metrics: [{ label: 'Responses', value: '94' }, { label: 'Today', value: '31' }, { label: 'Actionable', value: '67' }, { label: 'Top request', value: 'Veg options' }], reportLabel: 'Latest feedback',
    respondents: [{ name: 'Grade 8A', result: 'Veg options', status: 'New', tone: 'blue' }, { name: 'Student #248', result: 'Shorter lines', status: 'Noted', tone: 'green' }, { name: 'Grade 10C', result: 'Quiet seating', status: 'Review', tone: 'amber' }, { name: 'Student #117', result: 'Veg options', status: 'Noted', tone: 'green' }],
  },
  application: {
    label: 'Application', noun: 'application', title: 'Front-of-House Team Application',
    summary: 'Turn a job post into a structured application that is easier for candidates to complete and teams to review.',
    goodFor: ['Job posts', 'Hiring teams', 'Volunteer programs'],
    journey: [{ label: 'Start with the job post', copy: 'Carry the role details into the form.' }, { label: 'Ask for evidence', copy: 'Collect availability and experience.' }, { label: 'Share where you recruit', copy: 'Use one application link everywhere.' }, { label: 'Build the shortlist', copy: 'Review comparable answers together.' }],
    builderLabel: 'Application sections', builderItems: [{ label: 'Contact details', detail: '3 required fields' }, { label: 'Availability', detail: '2 questions' }, { label: 'Experience', detail: '2 short answers' }],
    questionLabel: 'Section 2 of 3', question: 'Which schedule can you reliably work?', answers: ['Weekday mornings', 'Evenings and weekends', 'A flexible mix'], selectedAnswer: 1,
    settings: ['Required answers', 'Multiple sections', 'Identity fields'], action: 'Open applications', liveBadge: 'Hiring', nextAction: 'Continue application',
    reportTabs: ['Candidates', 'Answer compare', 'Pipeline'], metrics: [{ label: 'Applications', value: '42' }, { label: 'New', value: '9' }, { label: 'Shortlisted', value: '11' }, { label: 'Interviews', value: '6' }], reportLabel: 'Candidate pipeline',
    respondents: [{ name: 'Nina Garcia', result: 'Flexible mix', status: 'Shortlist', tone: 'green' }, { name: 'Owen Lee', result: 'Weekends', status: 'New', tone: 'blue' }, { name: 'Paolo Reyes', result: 'Mornings', status: 'Review', tone: 'amber' }, { name: 'Grace Yu', result: 'Flexible mix', status: 'Interview', tone: 'green' }],
  },
  check: {
    label: 'Knowledge check', noun: 'knowledge check', title: 'Clinic Onboarding Check',
    summary: 'Confirm that new staff understand privacy and safety essentials before they begin working independently.',
    goodFor: ['Onboarding', 'Clinics', 'Certification teams'],
    journey: [{ label: 'Start with the handbook', copy: 'Pull out the non-negotiable rules.' }, { label: 'Create a short check', copy: 'Grade only what must be understood.' }, { label: 'Assign it to new staff', copy: 'Send one link during onboarding.' }, { label: 'Confirm readiness', copy: 'See completions and retry needs.' }],
    builderLabel: 'Check topics', builderItems: [{ label: 'Patient privacy', detail: '4 questions' }, { label: 'Safety process', detail: '3 questions' }, { label: 'Escalation path', detail: '2 questions' }],
    questionLabel: 'Question 5 of 9', question: 'Before discussing a patient case, what should you confirm?', answers: ['That you are in a private setting', 'That the waiting room is quiet', 'That your shift is nearly over'], selectedAnswer: 0,
    settings: ['Graded questions', 'Review after submit', 'Maximum 2 attempts'], action: 'Publish check', liveBadge: '09:14', nextAction: 'Next question',
    reportTabs: ['Readiness', 'Question review', 'Retries'], metrics: [{ label: 'Assigned', value: '32' }, { label: 'Complete', value: '29' }, { label: 'Needs retry', value: '3' }, { label: 'Average score', value: '93%' }], reportLabel: 'Onboarding status',
    respondents: [{ name: 'Kara Villanueva', result: '100%', status: 'Ready', tone: 'green' }, { name: 'Luis Ong', result: '78%', status: 'Retry', tone: 'amber' }, { name: 'Mae Rivera', result: 'In progress', status: 'Active', tone: 'blue' }, { name: 'John Sy', result: '92%', status: 'Ready', tone: 'green' }],
  },
};

const landingChapters = [
  { id: 'lenses', number: '01', short: 'Shape', label: 'Shape your work' },
  { id: 'publish', number: '02', short: 'Publish', label: 'Publish outcomes' },
  { id: 'workspaces', number: '03', short: 'Own & collaborate', label: 'Own & collaborate' },
  { id: 'start', number: '04', short: 'Start', label: 'Start' },
] as const;

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
    grid: <><rect x="2" y="2" width="3" height="3" rx=".6" /><rect x="6.5" y="2" width="3" height="3" rx=".6" /><rect x="11" y="2" width="3" height="3" rx=".6" /><rect x="2" y="6.5" width="3" height="3" rx=".6" /><rect x="6.5" y="6.5" width="3" height="3" rx=".6" /><rect x="11" y="6.5" width="3" height="3" rx=".6" /><rect x="2" y="11" width="3" height="3" rx=".6" /><rect x="6.5" y="11" width="3" height="3" rx=".6" /><rect x="11" y="11" width="3" height="3" rx=".6" /></>,
    info: <><circle cx="8" cy="8" r="6" /><path d="M8 7.25v4M8 4.5h.01" /></>,
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

function AssessmentFlow({ mode }: { mode: (typeof publishModes)[PublishModeKey] }) {
  const statusStyles = {
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-700',
    slate: 'bg-slate-100 text-slate-600',
  } as const;

  return (
    <div className="relative grid gap-5 lg:grid-cols-3">
      <span className="absolute left-[31.8%] top-7 hidden h-px w-[3.2%] bg-blue-300 lg:block" />
      <span className="absolute left-[65.1%] top-7 hidden h-px w-[3.2%] bg-blue-300 lg:block" />
      <article>
        <div className="mb-4 flex items-center gap-3"><NumberBadge>1</NumberBadge><div><h3 className="font-semibold text-slate-950">Build</h3><p className="text-xs text-slate-500">Shape the {mode.noun}</p></div></div>
        <div className="min-h-[360px] rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_45px_-34px_rgba(15,23,42,.55)] sm:min-h-[370px]">
          <label className="text-[10px] font-semibold text-slate-600">Title</label><div className="mt-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-medium text-slate-700">{mode.title}</div>
          <div className="mt-4 grid grid-cols-[1.08fr_0.92fr] gap-3"><div><p className="text-[10px] font-semibold text-slate-600">{mode.builderLabel}</p>{mode.builderItems.map((item, index) => <div key={item.label} className="mt-2 flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2 text-[9px] text-slate-600"><span className="grid h-4 w-4 shrink-0 place-items-center rounded bg-white text-[8px]">{index + 1}</span><span className="min-w-0"><span className="block truncate font-medium text-slate-700">{item.label}</span><span className="block truncate text-[8px] text-slate-400">{item.detail}</span></span></div>)}</div><div><p className="text-[10px] font-semibold text-slate-600">Settings</p><div className="mt-2 rounded-lg bg-blue-50 p-3 text-[9px] leading-5 text-blue-800">{mode.settings.map((setting) => <span key={setting} className="block">{setting}</span>)}</div></div></div>
          <button type="button" className="mt-4 w-full rounded-lg bg-blue-600 py-2.5 text-[10px] font-semibold text-white">{mode.action}</button>
        </div>
      </article>

      <article>
        <div className="mb-4 flex items-center gap-3"><NumberBadge>2</NumberBadge><div><h3 className="font-semibold text-slate-950">Share</h3><p className="text-xs text-slate-500">One clear public link</p></div></div>
        <div className="min-h-[360px] rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_45px_-34px_rgba(15,23,42,.55)] sm:min-h-[370px]">
          <div className="flex items-center justify-between gap-3"><p className="truncate text-xs font-semibold text-slate-900">{mode.title}</p><span className="shrink-0 rounded-lg bg-slate-950 px-2.5 py-1.5 text-[9px] font-semibold text-white">{mode.liveBadge}</span></div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-1/2 rounded-full bg-blue-600" /></div>
          <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-700">{mode.questionLabel}</p><h4 className="mt-2 text-sm font-semibold leading-5 text-slate-900">{mode.question}</h4>
          <div className="mt-4 space-y-2">{mode.answers.map((answer, index) => <div key={answer} className={`flex items-center gap-3 rounded-xl border p-3 text-[10px] ${index === mode.selectedAnswer ? 'border-blue-300 bg-blue-50 text-blue-900' : 'border-slate-200 text-slate-600'}`}><span className={`h-3 w-3 shrink-0 rounded-full border ${index === mode.selectedAnswer ? 'border-[4px] border-blue-600' : 'border-slate-300'}`} />{answer}</div>)}</div>
          <div className="mt-5 flex items-center justify-between"><button type="button" className="text-[10px] font-semibold text-slate-500">Previous</button><button type="button" className="rounded-lg bg-blue-600 px-5 py-2.5 text-[10px] font-semibold text-white">{mode.nextAction}</button></div>
        </div>
      </article>

      <article>
        <div className="mb-4 flex items-center gap-3"><NumberBadge>3</NumberBadge><div><h3 className="font-semibold text-slate-950">Understand</h3><p className="text-xs text-slate-500">Review results as they arrive</p></div></div>
        <div className="min-h-[360px] rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_45px_-34px_rgba(15,23,42,.55)] sm:min-h-[370px]">
          <div className="flex gap-3 overflow-hidden border-b border-slate-100 pb-3 text-[9px] font-semibold">{mode.reportTabs.map((tab, index) => <span key={tab} className={`whitespace-nowrap ${index === 0 ? 'text-blue-700' : 'text-slate-400'}`}>{tab}</span>)}</div>
          <div className="mt-4 grid grid-cols-4 gap-2">{mode.metrics.map((metric) => <div key={metric.label} className="min-w-0 rounded-lg bg-slate-50 p-2"><p className="truncate text-[8px] text-slate-400">{metric.label}</p><p className="mt-1 truncate text-sm font-semibold text-slate-900">{metric.value}</p></div>)}</div>
          <div className="mt-4 flex items-center justify-between"><p className="text-[10px] font-semibold text-slate-700">{mode.reportLabel}</p><div className="flex gap-1"><span className="rounded border border-slate-200 px-2 py-1 text-[8px] text-slate-500">CSV</span><span className="rounded border border-slate-200 px-2 py-1 text-[8px] text-slate-500">XLSX</span></div></div>
          <div className="mt-2 divide-y divide-slate-100">{mode.respondents.map((respondent) => <div key={respondent.name} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 py-3 text-[9px]"><span className="truncate font-medium text-slate-700">{respondent.name}</span><span className="max-w-[70px] truncate text-slate-500">{respondent.result}</span><span className={`rounded-full px-2 py-1 ${statusStyles[respondent.tone]}`}>{respondent.status}</span></div>)}</div>
        </div>
      </article>
    </div>
  );
}

const demoAnatomy: Array<{ icon: IconName; title: string; description: string }> = [
  { icon: 'move', title: 'Drag & arrange', description: 'Shape ideas spatially.' },
  { icon: 'write', title: 'Edit in place', description: 'Change a note without leaving the view.' },
  { icon: 'download', title: 'Export to PDF', description: 'Take the current view with you.' },
];

function DemoAnatomy() {
  return (
    <div className="space-y-2">
      {demoAnatomy.map((item) => (
        <div key={item.title} className="flex items-start gap-3 rounded-xl border border-[#74462f]/15 bg-[#fff8e9]/65 p-3 shadow-[0_10px_24px_-22px_rgba(55,29,18,.75)] backdrop-blur-sm">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#fffaf0] text-[#70452f] shadow-sm"><Icon name={item.icon} className="h-4 w-4" /></span>
          <div><p className="text-xs font-semibold text-[#2d1912]">{item.title}</p><p className="mt-1 text-[11px] leading-4 text-[#684333]">{item.description}</p></div>
        </div>
      ))}
    </div>
  );
}

function WorkspaceShapeGrid() {
  const [activeType, setActiveType] = useState<AiruFolderType>('box');
  const activeShape = workspaceShapes.find((shape) => shape.type === activeType) ?? workspaceShapes[0];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-950 shadow-[0_22px_60px_-28px_rgba(2,8,23,.75)]">
      <div className="grid grid-cols-4 gap-1.5" aria-label="Airunote workspace shapes">
        {workspaceShapes.map((shape) => (
          <button
            key={shape.type}
            type="button"
            aria-pressed={activeType === shape.type}
            aria-label={`${shape.label}: ${shape.description}`}
            onMouseEnter={() => setActiveType(shape.type)}
            onFocus={() => setActiveType(shape.type)}
            onClick={() => setActiveType(shape.type)}
            className={`flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 text-center transition-all ${activeType === shape.type ? 'border-blue-500 bg-blue-50 text-blue-800 shadow-sm' : 'border-slate-100 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50/60 hover:text-blue-700'}`}
          >
            <span className="text-base leading-none" aria-hidden="true">{getFolderTypeIcon(shape.type)}</span>
            <span className="max-w-full truncate text-[9px] font-semibold">{shape.label}</span>
          </button>
        ))}
      </div>
      <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2" aria-live="polite">
        <p className="text-[10px] font-semibold text-slate-800"><span aria-hidden="true">{getFolderTypeIcon(activeShape.type)}</span> {activeShape.label}</p>
        <p className="mt-0.5 text-[9px] leading-4 text-slate-500">{activeShape.description}</p>
      </div>
    </div>
  );
}

function DesktopDemoRail() {
  return (
    <aside className="hidden min-w-0 lg:block" aria-label="Live demo capabilities">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#43281d]">What you can do</p>
      <div className="mt-4"><DemoAnatomy /></div>
      <div className="group relative mt-4">
        <button type="button" aria-haspopup="dialog" className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#5c3525]/25 bg-[#382118]/90 px-3 py-2.5 text-center text-xs font-semibold text-[#fff7e8] shadow-[0_12px_28px_-20px_rgba(44,22,13,.9)] transition-all hover:-translate-y-0.5 hover:bg-[#2d1912]">
          <Icon name="grid" className="h-4 w-4 text-[#efcaa8]" /> Explore 13 workspace types
        </button>
        <div role="dialog" aria-label="13 workspace types" className="pointer-events-none invisible absolute right-0 top-[calc(100%+0.75rem)] z-20 w-[330px] translate-y-1 opacity-0 transition-all group-hover:pointer-events-auto group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
          <div className="absolute -top-2 right-8 h-4 w-4 rotate-45 border-l border-t border-slate-200 bg-white" aria-hidden="true" />
          <WorkspaceShapeGrid />
        </div>
      </div>
    </aside>
  );
}

function MobileDemoControls() {
  const [openPanel, setOpenPanel] = useState<'anatomy' | 'shapes' | null>(null);

  return (
    <div className="mt-5 lg:hidden">
      <div className="grid grid-cols-2 gap-2">
        <button type="button" aria-expanded={openPanel === 'anatomy'} aria-controls="mobile-demo-anatomy" onClick={() => setOpenPanel((current) => current === 'anatomy' ? null : 'anatomy')} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-colors ${openPanel === 'anatomy' ? 'border-[#503021] bg-[#382118] text-[#fff7e8]' : 'border-[#70452f]/20 bg-[#fff8e9]/65 text-[#3c241a]'}`}><Icon name="info" className="h-4 w-4" /> How it works</button>
        <button type="button" aria-expanded={openPanel === 'shapes'} aria-controls="mobile-workspace-shapes" onClick={() => setOpenPanel((current) => current === 'shapes' ? null : 'shapes')} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-colors ${openPanel === 'shapes' ? 'border-[#503021] bg-[#382118] text-[#fff7e8]' : 'border-[#70452f]/20 bg-[#fff8e9]/65 text-[#3c241a]'}`}><Icon name="grid" className="h-4 w-4" /> 13 types</button>
      </div>
      {openPanel === 'anatomy' && <div id="mobile-demo-anatomy" className="mt-2 rounded-2xl border border-[#70452f]/20 bg-[#b67c55] p-3"><DemoAnatomy /></div>}
      {openPanel === 'shapes' && <div id="mobile-workspace-shapes" className="mt-2"><WorkspaceShapeGrid /></div>}
    </div>
  );
}

function JourneyRail({ activeId }: { activeId: string }) {
  const activeIndex = Math.max(0, landingChapters.findIndex((chapter) => chapter.id === activeId));
  const activeChapter = landingChapters[activeIndex];

  return (
    <nav aria-label="Page chapters" className="sticky top-16 z-40 mt-5 border-y border-blue-200/70 bg-[#eaf0fb]/95 shadow-[0_10px_30px_-28px_rgba(30,64,175,.8)] backdrop-blur-xl">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-12">
        <div className="relative hidden h-[82px] items-center gap-2 md:grid md:grid-cols-4">
          <span className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-1/2 h-px bg-blue-200" aria-hidden="true" />
          {landingChapters.map((chapter, index) => {
            const active = chapter.id === activeId;
            const visited = index < activeIndex;
            return (
              <Link key={chapter.id} href={`#${chapter.id}`} aria-current={active ? 'step' : undefined} className={`group relative z-10 flex h-[58px] items-center gap-3 rounded-2xl border px-4 transition-all ${active ? 'border-[#163a7a] bg-[#102d63] text-white shadow-[0_10px_24px_-14px_rgba(15,45,99,.9)]' : 'border-white/80 bg-white/75 text-slate-700 hover:border-blue-200 hover:bg-white'}`}>
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-bold transition-colors ${active ? 'bg-white text-blue-800' : visited ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-50 text-slate-500'}`}>{visited ? <Icon name="check" className="h-3.5 w-3.5" /> : chapter.number}</span>
                <span><span className={`block text-[9px] font-bold uppercase tracking-[0.15em] ${active ? 'text-blue-200' : 'text-slate-400'}`}>Chapter {chapter.number}</span><span className={`mt-1 block text-sm font-semibold ${active ? 'text-white' : 'text-slate-700'}`}>{chapter.label}</span></span>
              </Link>
            );
          })}
        </div>
        <div className="flex h-[68px] items-center justify-between gap-5 md:hidden">
          <div><p className="text-[9px] font-bold uppercase tracking-[0.15em] text-blue-700">Chapter {activeChapter.number} of 04</p><p className="mt-1 text-sm font-semibold text-slate-950">{activeChapter.label}</p></div>
          <div className="flex w-28 gap-1.5 rounded-full bg-white/70 p-1.5" aria-hidden="true">{landingChapters.map((chapter, index) => <span key={chapter.id} className={`h-1 flex-1 rounded-full ${index <= activeIndex ? 'bg-blue-700' : 'bg-blue-100'}`} />)}</div>
        </div>
      </div>
    </nav>
  );
}

function PublishOutcomesSection({ activeMode, onModeChange }: { activeMode: PublishModeKey; onModeChange: (mode: PublishModeKey) => void }) {
  const mode = publishModes[activeMode];
  const journeyIcons: IconName[] = ['document', 'write', 'arrow', 'layers'];

  return (
    <section id="publish" className="scroll-mt-36 bg-[linear-gradient(180deg,#f7f8fa_0%,#ffffff_18%,#eef4ff_100%)] px-5 py-20 sm:px-8 sm:py-28 lg:px-12 lg:py-32">
      <div className="mx-auto max-w-[1280px]">
        <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Publish what you know</p>
            <h2 className="mt-4 max-w-2xl text-balance text-4xl font-semibold leading-[1.01] tracking-[-0.05em] text-slate-950 sm:text-6xl">Turn what you know into what comes next.</h2>
          </div>
          <div className="lg:pb-1">
            <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">Create an exam, run a survey, collect an inquiry, or gather feedback. Share one link and watch every response arrive.</p>
            <div className="mt-6 flex snap-x gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Things you can publish">
              {(Object.keys(publishModes) as PublishModeKey[]).map((key) => <button key={key} type="button" role="tab" aria-selected={activeMode === key} onClick={() => onModeChange(key)} className={`snap-start whitespace-nowrap rounded-full border px-4 py-2.5 text-sm font-semibold transition-all ${activeMode === key ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-900/15' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700'}`}>{publishModes[key].label}</button>)}
            </div>
          </div>
        </div>

        <div className="mt-12 overflow-hidden rounded-[2rem] border border-blue-100 bg-white shadow-[0_32px_90px_-58px_rgba(30,64,175,.65)]">
          <div className="grid divide-y divide-slate-200 bg-slate-50/70 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
            {mode.journey.map((item, index) => <div key={item.label} className="flex gap-3 p-5"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-100 text-blue-700"><Icon name={journeyIcons[index]} className="h-4 w-4" /></span><div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-blue-600">0{index + 1}</p><p className="mt-1 text-sm font-semibold text-slate-900">{item.label}</p><p className="mt-1 text-xs leading-5 text-slate-500">{item.copy}</p></div></div>)}
          </div>
          <div className="p-5 sm:p-8 lg:p-10">
            <div className="mb-8 flex flex-col gap-5 border-b border-slate-100 pb-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-600">Now showing · {mode.label}</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-3xl">{mode.title}</h3>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">Good for</span>
                  {mode.goodFor.map((audience) => <span key={audience} className="rounded-full border border-blue-100 bg-blue-50/70 px-3 py-1.5 text-[10px] font-semibold text-blue-800">{audience}</span>)}
                </div>
              </div>
              <p className="max-w-lg text-sm leading-6 text-slate-500">{mode.summary}</p>
            </div>
            <AssessmentFlow mode={mode} />
          </div>
          <div className="grid divide-y divide-slate-200 border-t border-slate-200 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
            {['Public links', 'Graded or ungraded', 'Live responses', 'Question analytics'].map((capability) => <div key={capability} className="flex items-center gap-2 px-5 py-4 text-xs font-semibold text-slate-700"><span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-50 text-emerald-700"><Icon name="check" className="h-3 w-3" /></span>{capability}</div>)}
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustWorkspaceVisual({ mode }: { mode: TrustModeKey }) {
  if (mode === 'private') {
    return (
      <div className="overflow-hidden rounded-[1.35rem] border border-blue-100 bg-blue-50/40">
        <div className="flex items-center justify-between border-b border-blue-100 bg-white/90 px-4 py-3"><p className="flex items-center gap-2 text-xs font-semibold text-slate-900"><Icon name="folder" className="h-3.5 w-3.5 text-blue-600" />My workspace</p><span className="flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[9px] font-semibold text-blue-700"><Icon name="lock" className="h-3 w-3" />Only you</span></div>
        <div className="grid min-h-[240px] grid-cols-[0.44fr_0.56fr]"><div className="border-r border-blue-100 bg-white/65 p-3">{['Research', 'Notes', 'Ideas'].map((folder, index) => <p key={folder} className={`flex items-center gap-2 rounded-lg px-2.5 py-2.5 text-[10px] ${index === 0 ? 'bg-blue-100/70 font-semibold text-blue-800' : 'text-slate-500'}`}><Icon name="folder" className={`h-3.5 w-3.5 ${index === 0 ? 'text-blue-600' : 'text-amber-500'}`} />{folder}</p>)}</div><div className="grid place-items-center p-4 text-center"><div><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-blue-700 shadow-sm"><Icon name="lock" className="h-5 w-5" /></span><p className="mt-4 text-xs font-semibold leading-5 text-slate-900">Private until you decide otherwise.</p><p className="mt-1 text-[10px] leading-4 text-slate-500">No audience. No accidental sharing.</p></div></div></div>
      </div>
    );
  }

  if (mode === 'share') {
    return (
      <div className="rounded-[1.35rem] border border-emerald-100 bg-emerald-50/35 p-4">
        <div className="flex items-center justify-between border-b border-emerald-100 pb-3"><div><p className="text-xs font-semibold text-slate-900">Research brief</p><p className="mt-1 text-[10px] text-slate-500">Access to this document</p></div><span className="rounded-full bg-white px-2.5 py-1 text-[9px] font-semibold text-emerald-700 shadow-sm">You own it</span></div>
        <div className="mt-3 space-y-2">{[
          ['You', 'Owner', 'bg-blue-100 text-blue-700'],
          ['Alex Kim', 'Can edit', 'bg-violet-100 text-violet-700'],
          ['Taylor Morgan', 'Can view', 'bg-amber-100 text-amber-700'],
        ].map(([person, access, color], index) => <div key={person} className="flex items-center justify-between rounded-xl border border-white bg-white/90 p-2.5 shadow-sm"><div className="flex items-center gap-2.5"><span className={`grid h-8 w-8 place-items-center rounded-full text-[9px] font-bold ${color}`}>{person.split(' ').map((part) => part[0]).join('')}</span><div><p className="text-[10px] font-semibold text-slate-900">{person}</p><p className="mt-0.5 text-[9px] text-slate-400">{index === 0 ? 'Personal workspace' : 'Shared directly'}</p></div></div><span className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[9px] font-semibold text-slate-600">{access}</span></div>)}
        </div>
        <div className="mt-3 flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-[10px] font-semibold text-white"><Icon name="people" className="h-3.5 w-3.5" />Invite exactly who you need</div>
      </div>
    );
  }

  return (
    <div className="rounded-[1.35rem] border border-violet-100 bg-violet-50/45 p-4">
      <div className="grid grid-cols-2 gap-2.5"><div className="rounded-xl border border-blue-100 bg-white p-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-700"><Icon name="lock" className="h-4 w-4" /></span><p className="mt-5 text-xs font-semibold text-slate-950">My workspace</p><p className="mt-1 text-[9px] text-slate-500">Personal · only yours</p></div><div className="rounded-xl border border-violet-200 bg-white p-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-50 text-violet-700"><Icon name="people" className="h-4 w-4" /></span><p className="mt-5 text-xs font-semibold text-slate-950">Design team</p><p className="mt-1 text-[9px] text-slate-500">8 members · shared space</p></div></div>
      <div className="mt-3 rounded-xl border border-white bg-white/90 p-3 shadow-sm"><div className="flex items-center justify-between gap-2"><div><p className="text-[10px] font-semibold text-slate-900">Invite the team</p><p className="mt-1 text-[9px] text-slate-500">One code. Clear roles.</p></div><span className="rounded-lg bg-violet-600 px-2.5 py-2 font-mono text-[9px] tracking-wider text-white">A1B2-C3D4</span></div><div className="mt-3 flex flex-wrap gap-1.5">{['Admin', 'Member', 'Viewer'].map((role) => <span key={role} className="rounded-full bg-violet-50 px-2.5 py-1 text-[9px] font-semibold text-violet-700">{role}</span>)}</div></div>
    </div>
  );
}

function TrustCollaborationSection() {
  const modes: Array<{ key: TrustModeKey; icon: IconName; eyebrow: string; title: string; copy: string; iconStyle: string; borderStyle: string }> = [
    { key: 'private', icon: 'lock', eyebrow: 'Personal', title: 'Private by default', copy: 'Every workspace starts with you—and stays yours until you share it.', iconStyle: 'bg-blue-600 text-white', borderStyle: 'border-blue-200' },
    { key: 'share', icon: 'layers', eyebrow: 'Permissioned', title: 'Share deliberately', copy: 'Invite specific people as viewers or editors without giving up ownership.', iconStyle: 'bg-emerald-600 text-white', borderStyle: 'border-emerald-200' },
    { key: 'team', icon: 'people', eyebrow: 'Collaborative', title: 'Built for teams', copy: 'Create a separate team space with clear roles, members, and boundaries.', iconStyle: 'bg-violet-600 text-white', borderStyle: 'border-violet-200' },
  ];

  return (
    <section id="workspaces" className="scroll-mt-36 bg-[#f2f4f8] px-5 py-20 sm:px-8 sm:py-28 lg:px-12 lg:py-32">
      <div className="mx-auto max-w-[1280px]">
        <div className="mx-auto max-w-4xl text-center"><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Yours until you share it</p><h2 className="mt-4 text-balance text-4xl font-semibold leading-[1.01] tracking-[-0.05em] text-slate-950 sm:text-6xl">Private from the start. Powerful when shared.</h2><p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">Keep your thinking personal, invite exactly who you need, or give a team its own place to build together.</p></div>
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {modes.map((item, index) => <article key={item.key} className={`flex min-w-0 flex-col rounded-[2rem] border bg-white p-5 shadow-[0_24px_70px_-50px_rgba(15,23,42,.48)] sm:p-6 ${item.borderStyle}`}><div className="mb-6 flex items-start gap-4"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl shadow-sm ${item.iconStyle}`}><Icon name={item.icon} className="h-5 w-5" /></span><div><p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400">0{index + 1} · {item.eyebrow}</p><h3 className="mt-1.5 text-xl font-semibold tracking-[-0.03em] text-slate-950">{item.title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{item.copy}</p></div></div><div className="mt-auto"><TrustWorkspaceVisual mode={item.key} /></div></article>)}
        </div>
      </div>
    </section>
  );
}

function WorkflowSystemSection({
  activeWorkflow,
  onWorkflowChange,
}: {
  activeWorkflow: WorkflowKey;
  onWorkflowChange: (workflow: WorkflowKey) => void;
}) {
  const workflow = workflows[activeWorkflow];

  return (
    <section id="system" className="scroll-mt-20 px-5 py-20 sm:px-8 sm:py-28 lg:px-12 lg:py-32">
      <div className="mx-auto max-w-[1280px]">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">See how work enters Airunote</p>
        <div className="mt-4 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <h2 className="max-w-2xl text-balance text-4xl font-semibold leading-[1.01] tracking-[-0.05em] text-slate-950 sm:text-6xl">Start with what you know. Shape it for what comes next.</h2>
          <div className="flex flex-wrap gap-2 lg:justify-end" role="tablist" aria-label="Example workflows">
            {(Object.keys(workflows) as WorkflowKey[]).map((key) => <button key={key} type="button" role="tab" aria-selected={activeWorkflow === key} onClick={() => onWorkflowChange(key)} className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition-all ${activeWorkflow === key ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-900/15' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700'}`}>{workflows[key].label}</button>)}
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
            <div className="mt-9 flex flex-wrap items-center gap-5"><Link href="/register" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/15 transition-transform hover:-translate-y-0.5">Start free <Arrow /></Link><Link href="#assessments" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700">See what comes next <Arrow /></Link></div>
          </div>
          <ProductTour workflow={workflow} />
        </div>
      </div>
    </section>
  );
}

export function AirunoteLandingPage() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [heroStory, setHeroStory] = useState(0);
  const [activeLens, setActiveLens] = useState<LensKey>('board');
  const [activePublishMode, setActivePublishMode] = useState<PublishModeKey>('exam');
  const [activeChapter, setActiveChapter] = useState('lenses');
  const [openFaq, setOpenFaq] = useState(0);
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => {
      setHeroStory((current) => (current + 1) % heroStories.length);
    }, 3200);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const sections = landingChapters.map((chapter) => document.getElementById(chapter.id)).filter((section): section is HTMLElement => Boolean(section));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActiveChapter(visible.target.id);
      },
      { rootMargin: '-24% 0px -58% 0px', threshold: [0, 0.08, 0.2] },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const activeStory = heroStories[heroStory];
  const handleSignup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = email.trim() ? `?email=${encodeURIComponent(email.trim())}` : '';
    router.push(`/register${query}`);
  };

  return (
    <div className="min-h-screen overflow-x-clip bg-[#f7f8fa] text-[#101727] selection:bg-blue-200 selection:text-blue-950">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/70 bg-[#f7f8fa]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <AirunoteLogo iconSize={22} textClassName="text-[15px] font-semibold tracking-[-0.02em] text-slate-950" />
          <nav className="hidden items-center gap-8 text-sm text-slate-600 md:flex" aria-label="Primary navigation">
            <Link href="#lenses" className="transition-colors hover:text-slate-950">Live demo</Link>
            <Link href="#publish" className="transition-colors hover:text-slate-950">Publish</Link>
            <Link href="#workspaces" className="transition-colors hover:text-slate-950">Teams</Link>
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <Link href="/login" className="rounded-full px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-white hover:text-slate-950">Sign in</Link>
            <Link href="/register" className="group inline-flex items-center gap-2 rounded-full bg-[#101727] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-900/15">Start free <Arrow /></Link>
          </div>
          <button type="button" className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white md:hidden" aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
            <span className="relative block h-4 w-5"><span className={`absolute left-0 top-1 h-px w-5 bg-slate-950 transition-transform ${menuOpen ? 'translate-y-1.5 rotate-45' : ''}`} /><span className={`absolute bottom-1 left-0 h-px w-5 bg-slate-950 transition-transform ${menuOpen ? '-translate-y-1.5 -rotate-45' : ''}`} /></span>
          </button>
        </div>
        {menuOpen && <nav className="border-t border-slate-200 bg-white px-5 py-5 md:hidden" aria-label="Mobile navigation"><div className="flex flex-col gap-1">{[{ id: 'lenses', label: 'Live demo' }, { id: 'publish', label: 'Publish' }, { id: 'workspaces', label: 'Teams' }].map((item) => <Link key={item.id} href={`#${item.id}`} onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">{item.label}</Link>)}<div className="mt-3 grid grid-cols-2 gap-3"><Link href="/login" className="rounded-full border border-slate-200 px-4 py-3 text-center text-sm font-semibold">Sign in</Link><Link href="/register" className="rounded-full bg-[#101727] px-4 py-3 text-center text-sm font-semibold text-white">Start free</Link></div></div></nav>}
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
                <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link href="/register" className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#101727] px-7 py-3.5 text-[15px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-950/15">Create your workspace <Arrow /></Link><Link href="#lenses" className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white/90 px-7 py-3.5 text-[15px] font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-white">Try Airunote now</Link></div>
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

        <section aria-label="Airunote assurances" className="bg-[#edf1f6] px-5 py-7 sm:px-8 sm:py-9 lg:px-12">
          <div className="mx-auto grid max-w-[1280px] gap-2 rounded-[1.5rem] border border-white bg-white/90 p-2 shadow-[0_20px_55px_-42px_rgba(15,23,42,.55)] sm:grid-cols-3">
            {[
              { icon: 'spark' as IconName, title: 'Start free', copy: 'No credit card', iconStyle: 'bg-emerald-50 text-emerald-700' },
              { icon: 'lock' as IconName, title: 'Private by default', copy: 'Yours from the start', iconStyle: 'bg-blue-50 text-blue-700' },
              { icon: 'layers' as IconName, title: 'One note, 13 ways to work', copy: 'Board, Canvas, Study, and more', iconStyle: 'bg-violet-50 text-violet-700' },
            ].map((item) => <div key={item.title} className="flex items-center gap-3 rounded-[1.1rem] bg-slate-50/75 px-5 py-4 sm:justify-center"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${item.iconStyle}`}><Icon name={item.icon} /></span><div><p className="text-sm font-semibold text-slate-950">{item.title}</p><p className="mt-0.5 text-xs text-slate-500">{item.copy}</p></div></div>)}
          </div>
        </section>

        <JourneyRail activeId={activeChapter} />

        <section
          id="lenses"
          className="relative isolate scroll-mt-20 overflow-hidden text-[#2d1912]"
          style={{
            backgroundColor: '#a86d49',
            backgroundImage: 'radial-gradient(circle, rgba(255,246,222,.2) 0 .8px, transparent 1.5px), radial-gradient(circle, rgba(67,35,22,.13) 0 1px, transparent 1.8px), repeating-linear-gradient(7deg, rgba(78,42,27,.025) 0 1px, transparent 1px 13px), linear-gradient(145deg,#c58c64 0%,#ad704a 52%,#8d5539 100%)',
            backgroundPosition: '0 0, 17px 23px, 0 0, 0 0',
            backgroundSize: '38px 38px, 61px 61px, auto, auto',
          }}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/35" aria-hidden="true" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#71422e]/25 to-transparent" aria-hidden="true" />
          <div className="relative mx-auto max-w-[1440px] px-5 py-14 sm:px-8 sm:py-16 lg:px-12 lg:py-20">
            <div className="mx-auto max-w-4xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#4a291d]">One note. Thirteen ways to work.</p>
              <h2 className="mt-4 text-balance text-4xl font-semibold leading-[1.01] tracking-[-0.05em] text-[#24130e] sm:text-6xl">Your work. From every angle.</h2>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#553325] sm:text-lg">Try Board, Canvas, and Study live below—then explore all 13 workspace types. Your work stays together.</p>
              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#5d3829]/20 bg-[#fff5e4]/60 px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.13em] text-[#3a2118] shadow-sm backdrop-blur-sm"><span className="h-2 w-2 rounded-full bg-emerald-600 shadow-[0_0_0_4px_rgba(5,150,105,.12)]" />Try it live · no signup</div>
            </div>

            <div className="mt-10 grid min-w-0 gap-7 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-start xl:gap-9">
              <div className="relative">
                <span className="absolute -top-2 left-9 z-20 h-4 w-4 rounded-full border border-[#8a5a20]/30 bg-gradient-to-br from-[#ffe1a1] via-[#ca8c32] to-[#7b4617] shadow-[0_4px_8px_rgba(68,35,16,.35)]" aria-hidden="true" />
                <span className="absolute -top-2 right-9 z-20 h-4 w-4 rounded-full border border-[#8a5a20]/30 bg-gradient-to-br from-[#ffe1a1] via-[#ca8c32] to-[#7b4617] shadow-[0_4px_8px_rgba(68,35,16,.35)]" aria-hidden="true" />
                <LivingLensPlayground activeLens={activeLens} onLensChange={setActiveLens} />
              </div>
              <DesktopDemoRail />
            </div>
            <MobileDemoControls />
          </div>
        </section>

        <PublishOutcomesSection activeMode={activePublishMode} onModeChange={setActivePublishMode} />

        <TrustCollaborationSection />

        <section id="start" className="scroll-mt-36 border-t border-slate-200 bg-white/60 px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
          <div className="mx-auto grid max-w-[1280px] gap-5 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 sm:p-8"><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Questions before you start</p><h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">A clear place to begin.</h2><div className="mt-6 divide-y divide-slate-200 border-y border-slate-200">{faqs.map((faq, index) => <div key={faq.question}><button type="button" className="flex min-h-14 w-full items-center justify-between gap-4 py-3 text-left text-sm font-semibold text-slate-800" aria-expanded={openFaq === index} onClick={() => setOpenFaq(openFaq === index ? -1 : index)}><span>{faq.question}</span><span className={`text-lg font-normal text-slate-400 transition-transform ${openFaq === index ? 'rotate-45' : ''}`}>+</span></button>{openFaq === index && <p className="max-w-xl pb-5 pr-8 text-sm leading-6 text-slate-500">{faq.answer}</p>}</div>)}</div></div>

            <div className="relative overflow-hidden rounded-[2rem] border border-blue-100 bg-[radial-gradient(circle_at_50%_0%,rgba(191,219,254,.8),transparent_45%),linear-gradient(145deg,#ffffff,#eff6ff)] p-7 text-center shadow-[0_24px_70px_-50px_rgba(30,64,175,.5)] sm:p-12"><div className="relative"><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Ready when you are</p><h2 className="mx-auto mt-4 max-w-2xl text-balance text-4xl font-semibold leading-[1] tracking-[-0.05em] text-slate-950 sm:text-6xl">Build the workspace your work deserves.</h2><p className="mx-auto mt-5 max-w-xl text-base leading-7 text-slate-600">Start free with email. We&apos;ll send an 8-digit verification code.</p><form onSubmit={handleSignup} className="mx-auto mt-7 flex max-w-xl flex-col gap-2 sm:flex-row"><label htmlFor="landing-signup-email" className="sr-only">Email address</label><div className="flex min-h-12 flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 text-slate-400 shadow-sm focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100"><Icon name="mail" className="h-4 w-4 shrink-0" /><input id="landing-signup-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="w-full bg-transparent py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400" /></div><button type="submit" className="min-h-12 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/15 transition-transform hover:-translate-y-0.5">Start free</button></form><p className="mt-4 text-xs text-slate-500">No credit card required.</p><p className="mt-3 text-xs text-slate-500">Already have an account? <Link href="/login" className="font-semibold text-blue-700 hover:underline">Sign in</Link></p></div></div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-[1280px] flex-col gap-8 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12"><div><AirunoteLogo iconSize={20} textClassName="text-sm font-semibold text-slate-950" /><p className="mt-2 text-xs text-slate-500">A knowledge workspace by AOTECH.</p></div><div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-slate-500"><Link href="#lenses" className="hover:text-slate-950">Live demo</Link><Link href="#publish" className="hover:text-slate-950">Publish</Link><Link href="#workspaces" className="hover:text-slate-950">Teams</Link><Link href="/login" className="hover:text-slate-950">Sign in</Link><span>© {new Date().getFullYear()} airunote</span></div></div></footer>
    </div>
  );
}
