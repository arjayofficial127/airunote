'use client';
import { CreatorBotanicalFrame } from './CreatorEntryReveal';
import { useState, type CSSProperties } from 'react';
import { useExamAppearance, useExamAssetUrl } from './ExamAppearanceProvider';

export function ExamTopBanner({ title }: { title: string }) {
  const appearance = useExamAppearance();
  const custom = useExamAssetUrl(appearance.banner?.image ?? null);
  const logo = useExamAssetUrl(appearance.brand.logo);
  const builtinLogo = appearance.brand.logo?.source === 'builtin' && appearance.brand.logo.assetId === 'starbucks-logo';
  const [failed, setFailed] = useState<string>();
  const selected = custom && custom !== failed ? custom : '/exam-assets/creator/holiday-banner.png';
  const holidayBanner = selected === '/exam-assets/creator/holiday-banner.png';
  const src = holidayBanner && failed !== '/exam-assets/creator/holiday-banner-clean.png'
    ? '/exam-assets/creator/holiday-banner-clean.png' : selected;
  return <div className="exam-top-banner"><div className="exam-top-banner-inner">
    <img className="exam-top-banner-art" src={src} alt={appearance.banner?.alt || 'Wrapped in Joy'} onError={() => setFailed(src)} />
    {holidayBanner && src.endsWith('holiday-banner-clean.png') && <CreatorBotanicalFrame corners={['top']} />}
    {holidayBanner && appearance.decorations.leaves && <div className="exam-banner-right-art" aria-hidden="true" data-motion={appearance.decorations.animated}>
      <img src="/exam-assets/creator/holiday-corner-right-red.png" alt="" width="1024" height="1536" />
      {[[60, 4.5], [53, 9], [44, 13], [87, 10], [89, 16], [74, 20], [94, 26], [76, 29], [86, 39], [94, 43], [86, 67], [84, 74]].map(([x, y], i) => <i key={i} className="gift-fairy-light" style={{left: `${x}%`, top: `${y}%`, '--twinkle-delay': `${-i * .83}s`, '--twinkle-duration': `${2.8 + i * .31}s`} as CSSProperties} />)}
    </div>}
    <div className="exam-top-banner-brand">
      <span>AIRUNOTE EXAMS</span>
      {appearance.brand.visible && <>
        <strong>{appearance.brand.logoVisible && logo && (builtinLogo ? <span className="exam-banner-logo" role="img" aria-label={appearance.brand.logoAlt || 'Starbucks'}><span style={{ maskImage: `url("${logo}")`, WebkitMaskImage: `url("${logo}")` }} /></span> : <img src={logo} alt={appearance.brand.logoAlt} />)}{appearance.brand.name}</strong>
        {appearance.brand.badgeVisible && <span className="exam-top-banner-badge">{appearance.brand.badge}</span>}
      </>}
    </div>
    <div className="exam-top-banner-context">
      <p>{appearance.headerLabel}</p>
      <h1>{title}</h1>
    </div>
  </div></div>;
}
