'use client';

import { useEffect, useLayoutEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useExamAppearance, useExamAssetUrl } from './ExamAppearanceProvider';

/** Presentation only: opening a gift never starts an attempt or its timer. */
export function CreatorEntryReveal({ title, children, initiallyOpen = false }: { title: string; children: ReactNode; initiallyOpen?: boolean }) {
  const appearance = useExamAppearance();
  const opening = appearance.giftOpening;
  const helperText = opening?.helperText ?? 'Your timer hasn’t started.';
  const buttonLabel = opening?.labelMode === 'instructions' ? 'Read Instructions'
    : opening?.labelMode === 'custom' ? opening.customLabel.trim() || 'Unwrap & Begin'
    : 'Unwrap & Begin';
  const [phase, setPhase] = useState<'closed' | 'opening' | 'open'>(initiallyOpen ? 'open' : 'closed');
  const [failedLogo, setFailedLogo] = useState<string>();
  const [failedArt, setFailedArt] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const origin = useRef({ x: 0, y: 0, width: 200 });
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();
  const logo = useExamAssetUrl(appearance.brand.logo);
  const enabled = appearance.renderer === 'creator' && appearance.artwork.visible;

  const beginOpening = () => {
    if (phase !== 'closed') return;
    const rect = stage.current?.getBoundingClientRect();
    if (rect) origin.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height * .49, width: rect.width * .64 };
    const reduced = button.current?.ownerDocument.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setPhase(reduced || !appearance.decorations.animated ? 'open' : 'opening');
  };
  useLayoutEffect(() => {
    if (phase !== 'opening' || !panel.current) return;
    const element = panel.current;
    const view = element.ownerDocument.defaultView;
    if (!view) { setPhase('open'); return; }
    const previousOverflow = element.ownerDocument.body.style.overflow;
    element.ownerDocument.body.style.overflow = 'hidden';
    element.setAttribute('inert', '');
    const rect = element.getBoundingClientRect();
    const y = origin.current.y - rect.top;
    // Size the emerging sheet from the gift, never from the remaining space
    // above it (which can be tiny after the user scrolls to the button).
    const scale = Math.min(1, origin.current.width / Math.max(1, rect.width));
    const x = origin.current.x - rect.left - rect.width * scale / 2;
    // Keep the bottom edge occluded at the box mouth while the page rises.
    // The same real page then travels forward to fill the viewport: no swap or fade-in.
    const paperHeight = rect.height * scale;
    const rise = Math.min(paperHeight, Math.max(120, y - 24));
    const liftedY = y - rise;
    const hiddenBottom = (visible: number) => `${Math.max(0, 100 - visible / paperHeight * 100)}%`;
    const animation = element.animate([
      { opacity: 0, transform: `translate(${x}px, ${y}px) scale(${scale})`, clipPath: 'inset(0 0 100% 0 round 16px)', offset: 0 },
      { opacity: 0, transform: `translate(${x}px, ${y}px) scale(${scale})`, clipPath: 'inset(0 0 100% 0 round 16px)', offset: .22 },
      { opacity: 1, transform: `translate(${x}px, ${y - rise * .28}px) scale(${scale})`, clipPath: `inset(0 0 ${hiddenBottom(rise * .28)} 0 round 16px)`, offset: .34 },
      { opacity: 1, transform: `translate(${x}px, ${y - rise * .82}px) scale(${scale})`, clipPath: `inset(0 0 ${hiddenBottom(rise * .82)} 0 round 16px)`, offset: .52 },
      { opacity: 1, transform: `translate(${x}px, ${liftedY}px) scale(${scale})`, clipPath: `inset(0 0 ${hiddenBottom(rise)} 0 round 16px)`, easing: 'cubic-bezier(.4,0,.15,1)', offset: .65 },
      { opacity: 1, transform: 'translate(0, 0) scale(1)', clipPath: 'inset(0 round 0px)', offset: 1 },
    ], { duration: 3600, easing: 'linear', fill: 'both' });
    const finish = () => setPhase('open');
    animation.onfinish = finish;
    const timer = view.setTimeout(finish, 3800);
    // Preview iframes resize themselves as their content changes. Those resize
    // events must never finish the opening early and erase the animation.
    return () => {
      animation.cancel();
      view.clearTimeout(timer);
      element.removeAttribute('inert');
      element.ownerDocument.body.style.overflow = previousOverflow;
    };
  }, [phase]);
  useEffect(() => {
    if (phase === 'open') {
      panel.current?.ownerDocument.defaultView?.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      panel.current?.focus({ preventScroll: true });
    }
  }, [phase]);
  useEffect(() => { setPhase(initiallyOpen ? 'open' : 'closed'); }, [enabled, initiallyOpen]);
  const replay = () => {
    setPhase('closed');
    panel.current?.ownerDocument.defaultView?.requestAnimationFrame(() => {
      button.current?.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior });
      button.current?.focus({ preventScroll: true });
    });
  };

  if (!enabled) return <>{children}</>;
  return <div className="gift-reveal" data-phase={phase} data-motion={appearance.decorations.animated}>
    {phase !== 'open' && <div className="gift-invitation">
      {appearance.decorations.leaves && <div className="gift-botanical-frame" aria-hidden="true">
        {(['top', 'bottom'] as const).map(corner => <div key={corner} className={`gift-botanical-corner gift-botanical-${corner}`}>
          <img src={`/exam-assets/creator/holiday-corner-${corner}.png`} alt="" width="1280" height="1280" draggable={false} />
          {(corner === 'top' ? [[22, 3], [50, 2], [67, 8], [11, 20], [7, 43], [8, 55]] : [[92, 21], [92, 37], [94, 55], [61, 82], [38, 87]]).map(([x, y], i) => <i key={i} className="gift-fairy-light" style={{ left: `${x}%`, top: `${y}%`, '--twinkle-delay': `${-i * .83}s`, '--twinkle-duration': `${2.8 + i * .31}s` } as CSSProperties} />)}
        </div>)}
      </div>}
      <p className="gift-eyebrow">{appearance.headerLabel}</p>
      <h1>{title}</h1>
      <div ref={stage} className="gift-stage" aria-hidden="true" data-fallback={failedArt}>
        <div className="gift-halo" />
        <div className="gift-contact-shadow" />
        <div className="gift-light" />
        {appearance.decorations.leaves && <>
          <img className="gift-coffee-sprig gift-coffee-right" src="/exam-assets/creator/coffee-cherry-sprig.png" alt="" draggable={false} />
          <img className="gift-coffee-sprig gift-coffee-left" src="/exam-assets/creator/coffee-cherry-sprig.png" alt="" draggable={false} />
        </>}
        <div className="gift-body-layer">
          <img src="/exam-assets/creator/gift-body-embossed.png" alt="" width="1475" height="1066" draggable={false} onError={() => setFailedArt(true)} />
        </div>
        {appearance.brand.visible && appearance.brand.logoVisible && logo && logo !== failedLogo && <div className="gift-brand-seal" data-builtin={appearance.brand.logo?.source === 'builtin' && appearance.brand.logo.assetId === 'starbucks-logo'} style={{ '--gift-seal-color': appearance.colors.logo } as CSSProperties}>
          {appearance.brand.logo?.source === 'builtin' && appearance.brand.logo.assetId === 'starbucks-logo'
            ? <span style={{ maskImage: `url("${logo}")`, WebkitMaskImage: `url("${logo}")`, backgroundColor: 'color-mix(in srgb, var(--gift-seal-color) 55%, #102c21)'  }} />
            : <img src={logo} alt="" onError={() => setFailedLogo(logo)} />}
        </div>}
        <div className="gift-top-layer">
          <div className="gift-lid-layer"><img src="/exam-assets/creator/gift-lid-embossed.png" alt="" width="1536" height="1024" draggable={false} onError={() => setFailedArt(true)} /></div>
          <div className="gift-bow-layer"><img src="/exam-assets/creator/gift-bow-embossed.png" alt="" width="1536" height="1024" draggable={false} onError={() => setFailedArt(true)} /></div>
        </div>
        {appearance.decorations.leaves && <div className="gift-pinecone-trio">{[1, 2, 3].map(cone => <img key={cone} className={`gift-pinecone gift-pinecone-${cone}`} src={`/exam-assets/creator/pinecone-natural-${cone}.png`} alt="" draggable={false} />)}</div>}
        {appearance.decorations.leaves && <div className="gift-dust">{Array.from({ length: 18 }, (_, i) => <i key={i} style={{ '--x': `${5 + i * 37 % 90}%`, '--delay': `${-i * .73}s`, '--duration': `${4 + i % 4}s` } as CSSProperties} />)}</div>}
      </div>
      <p className="gift-caption">{appearance.artwork.caption || 'A little joy before you begin'}</p>
      <button ref={button} type="button" className="gift-open-button" disabled={phase === 'opening'} onClick={beginOpening} aria-controls={id} aria-expanded={false}>{phase === 'opening' ? 'Opening your gift…' : buttonLabel}<span aria-hidden="true"> ✦</span></button>
      {helperText.trim() && <p className="gift-reassurance whitespace-pre-wrap" role="status">{helperText}</p>}
    </div>}
    <div id={id} ref={panel} tabIndex={-1} hidden={phase === 'closed'} aria-hidden={phase === 'opening'} className="gift-revealed-content" aria-label="Exam instructions and entry form">
      {phase !== 'closed' && <>{(opening?.showReplay ?? false) && <button type="button" disabled={phase !== 'open'} className="gift-replay" onClick={replay}>Replay Gift Opening</button>}{children}</>}
    </div>
  </div>;
}


export function CreatorCompletionGift() {
  const appearance = useExamAppearance();
  const logo = useExamAssetUrl(appearance.brand.logo);
  if (appearance.renderer !== 'creator' || !appearance.decorations.completion) return null;
  return <div className="gift-completion" aria-hidden="true" data-motion={appearance.decorations.animated}>
    {appearance.artwork.visible && <div className="gift-stage">
      <div className="gift-body-layer"><img src="/exam-assets/creator/gift-body-embossed.png" alt="" /></div>
      <div className="gift-lid-layer"><img src="/exam-assets/creator/gift-lid-embossed.png" alt="" /></div>
      <div className="gift-bow-layer"><img src="/exam-assets/creator/gift-bow-embossed.png" alt="" /></div>
      {appearance.brand.visible && appearance.brand.logoVisible && logo && <div className="gift-brand-seal" data-builtin={appearance.brand.logo?.source === 'builtin' && appearance.brand.logo.assetId === 'starbucks-logo'} style={{ '--gift-seal-color': appearance.colors.logo } as CSSProperties}>{appearance.brand.logo?.source === 'builtin' && appearance.brand.logo.assetId === 'starbucks-logo' ? <span style={{maskImage:`url("${logo}")`,WebkitMaskImage:`url("${logo}")`,backgroundColor:'color-mix(in srgb, var(--gift-seal-color) 55%, #102c21)'}} /> : <img src={logo} alt="" />}</div>}
    </div>}
    <div className="gift-dust">{Array.from({length:18},(_,i)=><i key={i} style={{'--x':`${4+i*37%92}%`,'--delay':`${i*.06}s`,'--duration':'2.8s'} as CSSProperties}/>)}</div>
  </div>;
}
