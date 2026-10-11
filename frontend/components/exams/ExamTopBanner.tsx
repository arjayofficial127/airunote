'use client';
import { useState } from 'react';
import { useExamAppearance, useExamAssetUrl } from './ExamAppearanceProvider';

export function ExamTopBanner({ title }: { title: string }) {
  const appearance = useExamAppearance();
  const custom = useExamAssetUrl(appearance.banner?.image ?? null);
  const logo = useExamAssetUrl(appearance.brand.logo);
  const builtinLogo = appearance.brand.logo?.source === 'builtin' && appearance.brand.logo.assetId === 'starbucks-logo';
  const [failed, setFailed] = useState<string>();
  const src = custom && custom !== failed ? custom : '/exam-assets/creator/holiday-banner.png';
  return <div className="exam-top-banner"><div className="exam-top-banner-inner">
    <img className="exam-top-banner-art" src={src} alt={appearance.banner?.alt || 'Wrapped in Joy'} onError={() => setFailed(src)} />
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
