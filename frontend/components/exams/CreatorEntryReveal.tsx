'use client';

import { useEffect, useLayoutEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useExamAppearance, useExamAssetUrl } from './ExamAppearanceProvider';

/** Presentation only: opening a gift never starts an attempt or its timer. */
export function CreatorEntryReveal({ title, children }: { title: string; children: ReactNode }) {
  const appearance = useExamAppearance();
  const opening = appearance.giftOpening;
  const buttonLabel = opening?.labelMode === 'instructions' ? 'Read Instructions'
    : opening?.labelMode === 'custom' ? opening.customLabel.trim() || 'Unwrap & Begin'
    : 'Unwrap & Begin';
  const [phase, setPhase] = useState<'closed' | 'opening' | 'open'>('closed');
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
    const scale = Math.min(.45, origin.current.width / Math.max(1, rect.width), Math.max(80, y - 48) / Math.max(1, rect.height));
    const x = origin.current.x - rect.left - rect.width * scale / 2;
    // Keep the bottom edge occluded at the box mouth while the page rises.
    // The same real page then travels forward to fill the viewport: no swap or fade-in.
    const paperHeight = rect.height * scale;
    const liftedY = y - paperHeight - 24;
    const animation = element.animate([
      { opacity: 0, transform: `translate(${x}px, ${y}px) scale(${scale})`, clipPath: 'inset(0 0 100% 0 round 16px)', offset: 0 },
      { opacity: 0, transform: `translate(${x}px, ${y}px) scale(${scale})`, clipPath: 'inset(0 0 100% 0 round 16px)', offset: .22 },
      { opacity: 1, transform: `translate(${x}px, ${y - paperHeight * .28}px) scale(${scale})`, clipPath: 'inset(0 0 72% 0 round 16px)', offset: .34 },
      { opacity: 1, transform: `translate(${x}px, ${y - paperHeight * .82}px) scale(${scale})`, clipPath: 'inset(0 0 18% 0 round 16px)', offset: .52 },
      { opacity: 1, transform: `translate(${x}px, ${liftedY}px) scale(${scale})`, clipPath: 'inset(0 round 16px)', easing: 'cubic-bezier(.4,0,.15,1)', offset: .65 },
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
  useEffect(() => { setPhase('closed'); }, [enabled]);
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
      <p className="gift-eyebrow">{appearance.headerLabel}</p>
      <h1>{title}</h1>
      <div ref={stage} className="gift-stage" aria-hidden="true" data-fallback={failedArt}>
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
        <div className="gift-top-layer">
          <div className="gift-lid-layer"><img src="/exam-assets/creator/gift-lid.webp" alt="" width="1536" height="1024" draggable={false} onError={() => setFailedArt(true)} /></div>
          <div className="gift-bow-layer"><img src="/exam-assets/creator/gift-bow.webp" alt="" width="1536" height="1024" draggable={false} onError={() => setFailedArt(true)} /></div>
        </div>
        {appearance.decorations.leaves && <div className="gift-dust">{Array.from({ length: 18 }, (_, i) => <i key={i} style={{ '--x': `${5 + i * 37 % 90}%`, '--delay': `${-i * .73}s`, '--duration': `${4 + i % 4}s` } as CSSProperties} />)}</div>}
      </div>
      <p className="gift-caption">{appearance.artwork.caption || 'A little joy before you begin'}</p>
      <button ref={button} type="button" className="gift-open-button" disabled={phase === 'opening'} onClick={beginOpening} aria-controls={id} aria-expanded={false}>{phase === 'opening' ? 'Opening your gift…' : buttonLabel}<span aria-hidden="true"> ✦</span></button>
      <p className="gift-reassurance" role="status">{phase === 'opening' ? 'Your instructions are on their way.' : 'Read the instructions next. Your timer hasn’t started.'}</p>
    </div>}
    <div id={id} ref={panel} tabIndex={-1} hidden={phase === 'closed'} aria-hidden={phase === 'opening'} className="gift-revealed-content" aria-label="Exam instructions and entry form">
      {phase !== 'closed' && <>{(opening?.showReplay ?? true) && <button type="button" disabled={phase !== 'open'} className="gift-replay" onClick={replay}>Replay Gift Opening</button>}{children}</>}
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
