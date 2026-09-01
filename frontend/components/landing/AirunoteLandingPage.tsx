'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { AirunoteLogo } from '@/components/brand/AirunoteLogo';

type FeatureIcon = 'folders' | 'lenses' | 'offline' | 'people' | 'records' | 'exams';

const capabilities: Array<{ icon: FeatureIcon; title: string; copy: string; meta: string }> = [
  { icon: 'folders', title: 'Folders that match the work', copy: 'Build a wiki, project, journal, book, pipeline, ledger, canvas, or your own nested system.', meta: '14 workspace types' },
  { icon: 'lenses', title: 'One idea, many lenses', copy: 'Move from focused writing to board, canvas, study, book, or saved views without duplicating content.', meta: 'Flexible projection' },
  { icon: 'offline', title: 'Ready when the network is not', copy: 'Local drafts, optimistic updates, connectivity awareness, and conflict-safe sync keep momentum intact.', meta: 'Offline-first' },
  { icon: 'people', title: 'Personal clarity, team context', copy: 'Create multiple organizations, invite members, define access, and keep private and shared work distinct.', meta: 'Multi-workspace' },
  { icon: 'records', title: 'More than documents', copy: 'Publish posts, group collections, attach files, and shape reusable records around the information you manage.', meta: 'Structured content' },
  { icon: 'exams', title: 'Turn knowledge into action', copy: 'Build public assessments, configure learning journeys, and understand outcomes through reporting.', meta: 'Exams + reports' },
];

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

function Icon({ name }: { name: FeatureIcon }) {
  const paths: Record<FeatureIcon, ReactNode> = {
    folders: <><path d="M3.5 7.5h6l2-2h9a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-17a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z" /><path d="M7 12h10M7 16h7" /></>,
    lenses: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="3.5" /><path d="M12 3.5V8.5M20.5 12h-5M12 20.5v-5M3.5 12h5" /></>,
    offline: <><path d="M6.2 16.4a5.3 5.3 0 0 1 1.2-10.1A7 7 0 0 1 20.6 9a4.2 4.2 0 0 1-1.2 8.2" /><path d="m8.5 15 3.5 3.5 3.5-3.5M12 10.5v8" /></>,
    people: <><circle cx="9" cy="8" r="3" /><path d="M3.5 19c.5-4 2.4-6 5.5-6s5 2 5.5 6" /><path d="M15 5.5a3 3 0 0 1 0 5.5M16 13c2.7.4 4.2 2.4 4.5 5" /></>,
    records: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><path d="M14 17.5h7M17.5 14v7" /></>,
    exams: <><path d="m4 6 8-3 8 3-8 3-8-3Z" /><path d="M7 8v5.5c3 2 7 2 10 0V8M20 6v7" /></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Arrow() {
  return <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h9M9 4.5 12.5 8 9 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function AirunoteLandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [heroStory, setHeroStory] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => {
      setHeroStory((current) => (current + 1) % heroStories.length);
    }, 3200);
    return () => window.clearInterval(timer);
  }, []);

  const activeStory = heroStories[heroStory];

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
            <Link href="/register" className="group inline-flex items-center gap-2 rounded-full bg-[#101727] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-900/15">Start free <span className="h-4 w-4 transition-transform group-hover:translate-x-0.5"><Arrow /></span></Link>
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
                  <span className="hero-shape-word block whitespace-nowrap">
                    <span className="sr-only">shape.</span>
                    <span aria-hidden="true"><span className="hero-shape-glint">sha</span><span className="hero-shape-triangle" /><span className="hero-shape-glint">e.</span></span>
                  </span>
                  <span key={activeStory.line1} className="hero-story-enter hidden bg-gradient-to-r from-blue-700 via-blue-500 to-[#7a72ef] bg-clip-text pb-2 text-transparent">
                    <span className="block whitespace-nowrap">{activeStory.line1}</span>
                  </span>
                </h1>
                <p className="mt-7 max-w-xl text-balance text-lg leading-8 text-slate-600 sm:text-xl">Bring every kind of knowledge work into one calm workspace - from onboarding and teaching to client delivery, research, recruiting, coaching, CRM, and personal notes,</p>
                <p className="hero-organized-line max-w-xl text-balance text-lg leading-8 text-slate-600 sm:text-xl">organized the way your brain works.</p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link href="/register" className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#101727] px-7 py-3.5 text-[15px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-950/15">Create your workspace <span className="h-4 w-4 transition-transform group-hover:translate-x-0.5"><Arrow /></span></Link><Link href="#use-cases" className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white/90 px-7 py-3.5 text-[15px] font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-white">See what you can build</Link></div>
                <div className="mt-8 hidden items-center gap-2" aria-label="Choose highlighted use case">{heroStories.map((story, index) => <button key={story.label} type="button" aria-label={`Show ${story.label}`} aria-pressed={index === heroStory} onClick={() => setHeroStory(index)} className={`h-1.5 rounded-full transition-all duration-500 ${index === heroStory ? 'w-10 bg-blue-600' : 'w-4 bg-slate-300 hover:bg-slate-400'}`} />)}</div>
              </div>
              <div className="relative mx-auto w-full max-w-4xl">
                <div className="relative aspect-[3/2] overflow-hidden rounded-[1.6rem] border border-white shadow-[0_42px_110px_-38px_rgba(15,27,61,0.5)] sm:rounded-[2rem]">
                  <Image src="/airunote/knowledge-terrain-v1.png" alt="Airunote knowledge terrain" fill priority unoptimized className="object-cover" />
                  <div className="terrain-sun-glow" aria-hidden="true" />
                  <svg className="river-trajectory-layer" viewBox="0 0 1000 667" preserveAspectRatio="none" aria-hidden="true">
                    <path id="river-paper-boat-path" d="M757 308 C770 319 766 333 742 354 C646 378 642 404 643 432 C619 467 495 482 448 497 C424 507 432 527 392 548 C308 552 285 590 222 607 C202 617 215 627 179 637" fill="none" />
                    <use href="#river-paper-boat-path" className="river-trajectory-guide" />
                    <use href="#river-paper-boat-path" className="river-trajectory-flow" />
                    <circle className="river-trajectory-point river-trajectory-point-start" cx="750" cy="308" r="5" />
                    <circle className="river-trajectory-point river-trajectory-point-end" cx="212" cy="642" r="5" />
                    <g className="river-paper-boat-vector">
                      <animateMotion dur="180s" repeatCount="indefinite" rotate="0" calcMode="linear" keyPoints="0;1;1" keyTimes="0;0.88;1">
                        <mpath href="#river-paper-boat-path" />
                      </animateMotion>
                      <ellipse className="river-paper-boat-ripple" cx="0" cy="10" rx="18" ry="4" />
                      <g transform="rotate(-18)">
                        <image className="river-paper-boat-vector-image" href="/airunote/paper-boat-3d-v1.png" x="-27" y="-18" width="54" height="36" preserveAspectRatio="xMidYMid meet" />
                      </g>
                    </g>
                    <g className="river-paper-boat-vector-static" transform="translate(212 642) rotate(-18)">
                      <ellipse className="river-paper-boat-ripple" cx="0" cy="10" rx="18" ry="4" />
                      <image className="river-paper-boat-vector-image" href="/airunote/paper-boat-3d-v1.png" x="-27" y="-18" width="54" height="36" preserveAspectRatio="xMidYMid meet" />
                    </g>
                    <g className="terrain-wave-flag" transform="translate(245 85)">
                      {/* <line className="terrain-wave-flag-mast" x1="0" y1="-45" x2="0" y2="0" /> */}
                      <g className="terrain-wave-flag-cloth">
                        <image
                          className="terrain-wave-flag-mark"
                          href="/airunote/airunote-swoosh.svg?v=20260901-blue"
                          x="2"
                          y="-45"
                          width="40"
                          height="20"
                          preserveAspectRatio="xMidYMid meet"
                        />
                      </g>
                    </g>
                  </svg>
                </div>
              </div>
            </div>
            <div id="use-cases" className="mt-16 scroll-mt-24 overflow-hidden border-y border-slate-200 py-5"><div className="hero-marquee flex w-max gap-3 pr-3">{[...workflowValues, ...workflowValues].map((story, index) => <button key={`${story.label}-${index}`} type="button" onClick={() => setHeroStory(index % heroStories.length)} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-blue-200 hover:text-blue-700"><span className={`h-1.5 w-1.5 rounded-full ${story.accent}`} />{story.label}</button>)}</div></div>
          </div>
        </section>

        <section id="system" className="scroll-mt-20 px-5 py-24 sm:px-8 sm:py-32 lg:px-12">
          <div className="mx-auto max-w-[1440px]">
            <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">One connected system</p><h2 className="mt-5 max-w-xl text-balance text-4xl font-semibold leading-[1.02] tracking-[-0.045em] text-slate-950 sm:text-6xl">One foundation. Dozens of real workflows.</h2></div><p className="max-w-2xl text-lg leading-8 text-slate-600 lg:justify-self-end">Onboard employees, teach a course, run freelance projects, survey customers, coach clients, document operations, conduct research, or build a personal knowledge system—without rebuilding your workspace each time.</p></div>
            <div className="mt-14 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{capabilities.map((feature, index) => <article key={feature.title} className={`group relative overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_22px_55px_-30px_rgba(30,58,139,0.38)] sm:p-8 ${index === 1 || index === 4 ? 'xl:translate-y-8 xl:hover:translate-y-7' : ''}`}><div className="flex items-start justify-between gap-4"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700 transition-colors group-hover:bg-blue-600 group-hover:text-white"><span className="h-6 w-6"><Icon name={feature.icon} /></span></span><span className="rounded-full bg-slate-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.11em] text-slate-500">{feature.meta}</span></div><h3 className="mt-8 text-xl font-semibold tracking-[-0.025em] text-slate-950">{feature.title}</h3><p className="mt-3 text-[15px] leading-7 text-slate-600">{feature.copy}</p><span className="pointer-events-none absolute -bottom-10 -right-8 h-28 w-28 rounded-full bg-blue-100/60 blur-2xl transition-transform group-hover:scale-150" /></article>)}</div>
          </div>
        </section>

        <section id="lenses" className="scroll-mt-20 px-5 py-24 sm:px-8 sm:py-32 lg:px-12">
          <div className="mx-auto max-w-[1440px] overflow-hidden rounded-[2rem] bg-[#101727] text-white sm:rounded-[3rem]"><div className="grid lg:grid-cols-[0.86fr_1.14fr]">
            <div className="flex flex-col justify-between p-8 sm:p-14 lg:p-16"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-300">Lenses, not lock-in</p><h2 className="mt-5 text-balance text-4xl font-semibold leading-[1.03] tracking-[-0.045em] sm:text-6xl">Same knowledge.<br /><span className="text-blue-300">Better angle.</span></h2><p className="mt-7 max-w-lg text-lg leading-8 text-slate-300">A document is not trapped in one layout. Read it as a page, organize it on a board, place it on a canvas, or pull it into a study flow.</p></div><div className="mt-12 flex flex-wrap gap-2">{['Document', 'Board', 'Canvas', 'Book', 'Study', 'Saved'].map((lens, index) => <span key={lens} className={`rounded-full border px-3.5 py-2 text-xs font-semibold ${index === 2 ? 'border-blue-400 bg-blue-500 text-white' : 'border-white/15 bg-white/5 text-slate-300'}`}>{lens}</span>)}</div></div>
            <div className="relative min-h-[430px] overflow-hidden border-t border-white/10 bg-[radial-gradient(circle_at_30%_20%,rgba(95,141,255,0.22),transparent_45%),linear-gradient(145deg,#151e33,#0b1120)] p-7 sm:min-h-[560px] sm:p-12 lg:border-l lg:border-t-0"><div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:44px_44px]" /><div className="relative h-full min-h-[370px]">{[
              { title: 'Research direction', copy: 'Connect the themes before the details disappear.', x: '8%', y: '7%', color: 'bg-blue-300' },
              { title: 'Project brief', copy: 'The source of truth for the next release.', x: '48%', y: '28%', color: 'bg-violet-300' },
              { title: 'User signal', copy: '“I need to see the whole idea, not another list.”', x: '13%', y: '57%', color: 'bg-emerald-300' },
            ].map((card, index) => <div key={card.title} className="absolute w-[72%] max-w-[280px] rounded-2xl border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur-md" style={{ left: card.x, top: card.y, transform: `rotate(${index === 0 ? -2 : index === 1 ? 2 : -1}deg)` }}><div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${card.color}`} /><p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-300">{card.title}</p></div><p className="mt-3 text-sm leading-6 text-white">{card.copy}</p></div>)}<svg className="absolute inset-0 h-full w-full text-blue-300/40" viewBox="0 0 600 450" fill="none" preserveAspectRatio="none" aria-hidden="true"><path d="M235 80C330 80 260 180 355 190M200 310C285 305 270 235 350 220" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 7" /></svg></div></div>
          </div></div>
        </section>

        <section id="workspaces" className="scroll-mt-20 px-5 py-24 sm:px-8 sm:py-32 lg:px-12"><div className="mx-auto max-w-[1440px]"><div className="grid gap-5 lg:grid-cols-2">
          <article className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-8 sm:p-12"><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Built to work together</p><h2 className="mt-5 max-w-xl text-balance text-4xl font-semibold leading-[1.04] tracking-[-0.045em] text-slate-950 sm:text-5xl">Private by default. Collaborative by choice.</h2><p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">Move between personal and organization workspaces, manage members, and choose what stays private, what the team can use, and what can be public.</p><div className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">{[['Research notebook', 'Private', 'You'], ['Product knowledge', 'Organization', '12 members'], ['Learning check', 'Public', 'Anyone with link']].map(([name, access, members], index) => <div key={name} className={`flex items-center gap-4 py-3 ${index !== 2 ? 'border-b border-slate-200' : ''}`}><span className={`h-9 w-9 rounded-xl ${index === 0 ? 'bg-blue-100' : index === 1 ? 'bg-violet-100' : 'bg-emerald-100'}`} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-900">{name}</p><p className="text-xs text-slate-500">{members}</p></div><span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">{access}</span></div>)}</div></article>
          <article className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-700 to-blue-950 p-8 text-white sm:p-12"><div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border-[45px] border-white/5" /><p className="relative text-xs font-bold uppercase tracking-[0.16em] text-blue-200">Designed for momentum</p><h2 className="relative mt-5 max-w-xl text-balance text-4xl font-semibold leading-[1.04] tracking-[-0.045em] sm:text-5xl">Keep working through the messy middle.</h2><p className="relative mt-6 max-w-xl text-lg leading-8 text-blue-100">Draft locally, recover gracefully, sync deliberately, and see the state of your work—without turning connectivity into your problem.</p><div className="relative mt-12 grid gap-3 sm:grid-cols-3">{[['01', 'Capture', 'Write while offline'], ['02', 'Review', 'Preview sync changes'], ['03', 'Continue', 'Return fully hydrated']].map(([number, title, copy]) => <div key={title} className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm"><p className="text-xs font-bold text-blue-200">{number}</p><p className="mt-8 font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-blue-100/80">{copy}</p></div>)}</div></article>
        </div></div></section>

        <section className="px-5 pb-24 pt-8 sm:px-8 sm:pb-32 lg:px-12"><div className="relative mx-auto max-w-[1440px] overflow-hidden rounded-[2rem] border border-slate-200 bg-white px-7 py-16 text-center shadow-[0_24px_80px_-50px_rgba(15,27,61,.35)] sm:rounded-[3rem] sm:px-14 sm:py-24"><div className="pointer-events-none absolute inset-x-0 -top-32 mx-auto h-72 max-w-3xl rounded-full bg-blue-100 blur-3xl" /><div className="relative"><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">A calmer place to think</p><h2 className="mx-auto mt-5 max-w-4xl text-balance text-4xl font-semibold leading-[0.98] tracking-[-0.05em] text-slate-950 sm:text-7xl">Build the system your ideas deserve.</h2><p className="mx-auto mt-7 max-w-xl text-lg leading-8 text-slate-600">Start with a folder and a document. Let Airunote grow with the way you think and the work you do.</p><div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/register" className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#101727] px-7 py-3.5 text-[15px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl">Start building free <span className="h-4 w-4 transition-transform group-hover:translate-x-0.5"><Arrow /></span></Link><Link href="/login" className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-7 py-3.5 text-[15px] font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-950">I already have a workspace</Link></div></div></div></section>
      </main>

      <footer className="border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12"><div><AirunoteLogo iconSize={20} textClassName="text-sm font-semibold text-slate-950" /><p className="mt-2 text-xs text-slate-500">A knowledge workspace by AOTECH.</p></div><div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-slate-500"><Link href="#system" className="hover:text-slate-950">System</Link><Link href="#lenses" className="hover:text-slate-950">Lenses</Link><Link href="/login" className="hover:text-slate-950">Sign in</Link><span>© {new Date().getFullYear()} airunote</span></div></div></footer>
    </div>
  );
}
