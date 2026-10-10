'use client';

import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useExamAppearance, useExamAssetUrl, useExamPreview } from './ExamAppearanceProvider';

/** Presentation only: opening a gift never starts an attempt or its timer. */
export function CreatorEntryReveal({ title, children }: { title: string; children: ReactNode }) {
  const appearance = useExamAppearance();
  const preview = useExamPreview();
  const [phase, setPhase] = useState<'closed' | 'opening' | 'open'>('closed');
  const [failedLogo, setFailedLogo] = useState<string>();
  const [failedArt, setFailedArt] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();
  const logo = useExamAssetUrl(appearance.brand.logo);
  const enabled = appearance.renderer === 'creator' && appearance.artwork.visible;

  useEffect(() => {
    if (phase !== 'opening') return;
    // Use the element's window: the editor renders inside an isolated preview iframe.
    const reduced = button.current?.ownerDocument.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(() => setPhase('open'), reduced || !appearance.decorations.animated ? 0 : 1900);
    return () => window.clearTimeout(timer);
  }, [phase, appearance.decorations.animated]);
  useEffect(() => {
    if (phase === 'open') panel.current?.focus({ preventScroll: true });
  }, [phase]);
  useEffect(() => { setPhase('closed'); }, [enabled]);

  if (!enabled) return <>{children}</>;
  return <div className="gift-reveal" data-phase={phase} data-motion={appearance.decorations.animated}>
    {phase !== 'open' && <div className="gift-invitation">
      <p className="gift-eyebrow">{appearance.headerLabel}</p>
      <h1>{title}</h1>
      <div className="gift-stage" aria-hidden="true" data-fallback={failedArt}>
        <div className="gift-halo" />
        <div className="gift-light" />
        <div className="gift-body-layer">
          <img src="/exam-assets/creator/gift-body.webp" alt="" width="1475" height="1066" draggable={false} onError={() => setFailedArt(true)} />
        </div>
        {appearance.brand.visible && appearance.brand.logoVisible && logo && logo !== failedLogo && <div className="gift-brand-seal">
          {appearance.brand.logo?.source === 'builtin' && appearance.brand.logo.assetId === 'starbucks-logo'
            ? <span style={{ maskImage: `url("${logo}")`, WebkitMaskImage: `url("${logo}")`, backgroundColor: appearance.colors.logo }} />
            : <img src={logo} alt="" onError={() => setFailedLogo(logo)} />}
        </div>}
        <div className="gift-lid-layer"><img src="/exam-assets/creator/gift-lid.webp" alt="" width="1536" height="1024" draggable={false} onError={() => setFailedArt(true)} /></div>
        <div className="gift-bow-layer"><img className="gift-bow-left" src="/exam-assets/creator/gift-bow.webp" alt="" width="1536" height="1024" draggable={false} onError={() => setFailedArt(true)} /><img className="gift-bow-right" src="/exam-assets/creator/gift-bow.webp" alt="" width="1536" height="1024" draggable={false} /></div>
        {appearance.decorations.leaves && <div className="gift-dust">{Array.from({ length: 18 }, (_, i) => <i key={i} style={{ '--x': `${5 + i * 37 % 90}%`, '--delay': `${-i * .73}s`, '--duration': `${4 + i % 4}s` } as CSSProperties} />)}</div>}
      </div>
      <p className="gift-caption">{appearance.artwork.caption || 'A little joy before you begin'}</p>
      <button ref={button} type="button" className="gift-open-button" disabled={phase === 'opening'} onClick={() => setPhase('opening')} aria-controls={id} aria-expanded={false}>{phase === 'opening' ? 'Opening your gift…' : 'Unwrap & begin'}<span aria-hidden="true"> ✦</span></button>
      <p className="gift-reassurance" role="status">{phase === 'opening' ? 'Your instructions are on their way.' : 'Read the instructions next. Your timer hasn’t started.'}</p>
    </div>}
    <div id={id} ref={panel} tabIndex={-1} hidden={phase !== 'open'} className="gift-revealed-content" aria-label="Exam instructions and entry form">
      {phase === 'open' && <>{preview && <button type="button" className="gift-replay" onClick={() => setPhase('closed')}>Replay gift opening</button>}{children}</>}
    </div>
  </div>;
}


export function CreatorCompletionGift() {
  const appearance = useExamAppearance();
  const logo = useExamAssetUrl(appearance.brand.logo);
  if (appearance.renderer !== 'creator' || !appearance.decorations.completion) return null;
  return <div className="gift-completion" aria-hidden="true" data-motion={appearance.decorations.animated}>
    {appearance.artwork.visible && <div className="gift-stage">
      <div className="gift-body-layer"><img src="/exam-assets/creator/gift-body.webp" alt="" /></div>
      <div className="gift-lid-layer"><img src="/exam-assets/creator/gift-lid.webp" alt="" /></div>
      <div className="gift-bow-layer"><img src="/exam-assets/creator/gift-bow.webp" alt="" /></div>
      {appearance.brand.visible && appearance.brand.logoVisible && logo && <div className="gift-brand-seal">{appearance.brand.logo?.source === 'builtin' && appearance.brand.logo.assetId === 'starbucks-logo' ? <span style={{maskImage:`url("${logo}")`,WebkitMaskImage:`url("${logo}")`,backgroundColor:appearance.colors.logo}} /> : <img src={logo} alt="" />}</div>}
    </div>}
    <div className="gift-dust">{Array.from({length:18},(_,i)=><i key={i} style={{'--x':`${4+i*37%92}%`,'--delay':`${i*.06}s`,'--duration':'2.8s'} as CSSProperties}/>)}</div>
  </div>;
}
