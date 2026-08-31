'use client';

import Image from 'next/image';

export function ExamSponsorBrand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex items-center ${compact ? 'gap-3' : 'gap-4'}`} aria-label="airunote exams, sponsored by Starbucks 386 Nepo Center, Marry Furrmily">
      <div className="shrink-0">
        <div className="text-[9px] font-bold uppercase tracking-[0.24em] text-[#9a6b45]">airunote exams</div>
        <div className="mt-1 flex items-center gap-2">
          <span
            aria-hidden="true"
            className={compact ? 'h-8 w-8 shrink-0 bg-[#00754a]' : 'h-11 w-11 shrink-0 bg-[#00754a]'}
            style={{
              WebkitMask: 'url(/exams/store-9/starbucks.svg) center / contain no-repeat',
              mask: 'url(/exams/store-9/starbucks.svg) center / contain no-repeat',
            }}
          />
          <span className={`${compact ? 'text-sm' : 'text-lg'} font-black tracking-[0.12em] text-[#1e3932]`}>STARBUCKS</span>
        </div>
      </div>
      <span className="h-9 w-px bg-[#d8c4ac]" aria-hidden="true" />
      <div className="rounded-full border border-[#d39a50] bg-[#fff8e7] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#7b4a25]">
        386 Nepo Center
      </div>
    </div>
  );
}

export function StoreNineCats({ compact = false }: { compact?: boolean }) {
  return (
    <figure className={compact ? 'w-24 shrink-0' : 'w-full max-w-[220px] shrink-0'}>
      <div className={`relative overflow-hidden rounded-[1.4rem] border border-[#d99a49] bg-[#f7ead4] shadow-[0_18px_45px_rgba(79,45,20,0.2)] ${compact ? 'aspect-[3/4]' : 'aspect-[3/4]'}`}>
        <Image
          src="/exams/store-9/cats.png"
          alt="Marry Furrmily"
          fill
          priority={!compact}
          sizes={compact ? '96px' : '(max-width: 768px) 180px, 220px'}
          className="object-contain"
        />
      </div>
      {!compact && <figcaption className="mt-3 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-[#7d5132]">Marry Furrmily</figcaption>}
    </figure>
  );
}
