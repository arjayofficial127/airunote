'use client';

function Leaf({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 42 24" fill="none" aria-hidden="true">
      <path d="M39 3C24 1 9 6 3 20c14 2 29-3 36-17Z" fill="currentColor" />
      <path d="M5 19c8-5 17-9 29-13M17 13l-2-6m8 3 2-6" stroke="rgba(74,39,17,.42)" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function AutumnBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <svg className="absolute -bottom-8 -left-14 h-72 w-72 text-[#cc6a2d]/15" viewBox="0 0 220 220" fill="none">
        <path d="M8 211C55 152 86 93 109 12M50 166c30-5 50-19 65-47M76 116c-13-22-17-44-11-67M102 73c24-7 43-22 55-45" stroke="currentColor" strokeWidth="2" />
        <path d="M42 169c11-16 26-21 44-15-8 15-22 22-44 15Zm28-55c-14-10-20-25-16-44 16 6 24 20 16 44Zm38-42c5-18 17-29 35-32 0 18-11 30-35 32Zm2 49c15-12 31-14 48-5-11 14-27 16-48 5Z" stroke="currentColor" strokeWidth="1.4" />
      </svg>
      <svg className="absolute -right-16 top-12 h-80 w-80 rotate-180 text-[#9f5a2d]/10" viewBox="0 0 220 220" fill="none">
        <path d="M8 211C55 152 86 93 109 12M50 166c30-5 50-19 65-47M76 116c-13-22-17-44-11-67M102 73c24-7 43-22 55-45" stroke="currentColor" strokeWidth="2" />
        <path d="M42 169c11-16 26-21 44-15-8 15-22 22-44 15Zm28-55c-14-10-20-25-16-44 16 6 24 20 16 44Zm38-42c5-18 17-29 35-32 0 18-11 30-35 32Zm2 49c15-12 31-14 48-5-11 14-27 16-48 5Z" stroke="currentColor" strokeWidth="1.4" />
      </svg>
      {['#d66a22', '#e8a13c', '#8d8a43', '#c84d1c', '#d98b35', '#879455'].map((color, index) => (
        <span key={color} className={`autumn-floating-leaf autumn-floating-leaf--${index + 1}`} style={{ color }}><Leaf className="h-full w-full" /></span>
      ))}
    </div>
  );
}

export function AutumnHeroBranches() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <svg className="autumn-branch-sway absolute -bottom-7 -left-3 h-40 w-40 text-[#dc6a1f] opacity-80" viewBox="0 0 170 170" fill="none">
        <path d="M10 165C39 127 62 83 78 12M39 128c24-5 43-18 57-39M55 91C43 73 38 55 40 37M73 48c21-5 37-17 49-34" stroke="currentColor" strokeWidth="2" />
        <path d="M32 132c8-13 20-19 36-16-5 13-17 20-36 16Zm9-43c-12-7-18-18-18-33 13 4 20 15 18 33Zm34-40c6-14 17-22 31-23-2 14-12 22-31 23Zm9 43c13-9 26-10 39-2-10 11-23 12-39 2Z" fill="currentColor" />
      </svg>
      <svg className="autumn-branch-sway-reverse absolute -bottom-8 -right-5 h-44 w-44 -scale-x-100 text-[#df711f] opacity-75" viewBox="0 0 170 170" fill="none">
        <path d="M10 165C39 127 62 83 78 12M39 128c24-5 43-18 57-39M55 91C43 73 38 55 40 37M73 48c21-5 37-17 49-34" stroke="currentColor" strokeWidth="2" />
        <path d="M32 132c8-13 20-19 36-16-5 13-17 20-36 16Zm9-43c-12-7-18-18-18-33 13 4 20 15 18 33Zm34-40c6-14 17-22 31-23-2 14-12 22-31 23Zm9 43c13-9 26-10 39-2-10 11-23 12-39 2Z" fill="currentColor" />
      </svg>
    </div>
  );
}
