'use client';
import { useId, useState, type CSSProperties } from 'react';
import { useExamAppearance, useExamAssetUrl } from './ExamAppearanceProvider';

/** A resolution-independent composition; the brand remains a live asset, never baked into artwork. */
export function CreatorGiftScene({ compact = false }: { compact?: boolean }) {
  const { brand, artwork, decorations, colors } = useExamAppearance();
  const selectedLogo = useExamAssetUrl(brand.logo);
  const [failedLogo, setFailedLogo] = useState<string>();
  const [paused, setPaused] = useState(false);
  const id = useId().replace(/:/g, '');
  const paint = (name: string) => `url(#${id}-${name})`;
  const logo = brand.visible && brand.logoVisible && selectedLogo !== failedLogo ? selectedLogo : undefined;
  if (!artwork.visible) return null;
  return <figure className={`creator-scene ${compact ? 'creator-scene-compact' : ''}`} data-paused={paused || !decorations.animated}>
    <div className="creator-scene-glow" aria-hidden="true" />
    <svg className="creator-gifts" viewBox="0 0 440 470" role="img" aria-label={artwork.alt || 'Holiday gifts with gold ribbons'}>
      <defs>
        <filter id={`${id}-logoTint`}><feFlood floodColor={colors.logo}/><feComposite in2="SourceAlpha" operator="in"/></filter>
        <linearGradient id={`${id}-gold`} x1="0" x2="1" y1="0" y2=".3"><stop stopColor="#80551c"/><stop offset=".22" stopColor="#e1b760"/><stop offset=".46" stopColor="#fff0b2"/><stop offset=".6" stopColor="#c4953f"/><stop offset=".82" stopColor="#f3d68a"/><stop offset="1" stopColor="#956120"/></linearGradient>
        <linearGradient id={`${id}-red`} x1="0" x2="1" y1="0" y2="1"><stop stopColor="#d65558"/><stop offset=".4" stopColor="#a52035"/><stop offset="1" stopColor="#641526"/></linearGradient>
        <linearGradient id={`${id}-cream`} x1="0" x2="1" y1="0" y2="1"><stop stopColor="#fffef4"/><stop offset=".5" stopColor="#f5e5bd"/><stop offset="1" stopColor="#d6bc82"/></linearGradient>
        <linearGradient id={`${id}-side`}><stop stopColor="#e4ce9c"/><stop offset="1" stopColor="#ae8a4c"/></linearGradient>
        <radialGradient id={`${id}-bauble`} cx=".3" cy=".25"><stop stopColor="#fff3bd"/><stop offset=".4" stopColor="#d9b35e"/><stop offset=".85" stopColor="#8c5c24"/><stop offset="1" stopColor="#c7a253"/></radialGradient>
        <pattern id={`${id}-paper`} width="22" height="22" patternUnits="userSpaceOnUse"><path d="M0 11h22M11 0v22" stroke="#fff7d5" strokeWidth=".4" opacity=".17"/><circle cx="5" cy="5" r=".7" fill="#fff0c6" opacity=".3"/></pattern>
        <pattern id={`${id}-stars`} width="48" height="48" patternUnits="userSpaceOnUse"><path d="M24 15v18m-9-9h18m-15-6 12 12m0-12-12 12" stroke="#f3d58b" strokeWidth=".7" opacity=".45"/></pattern>
      </defs>
      <ellipse cx="226" cy="427" rx="175" ry="23" fill="#041d17" opacity=".36"/>
      <g className="creator-ornament" fill="none" stroke={paint('gold')}>
        <path d="M350 0v96" strokeWidth="1"/><path d="M344 95h12v8h-12z"/>
        <circle cx="350" cy="128" r="27" fill={paint('bauble')} strokeWidth="1"/>
        <path d="M350 102c-22 14-22 39 0 53m0-53c22 14 22 39 0 53M324 124h52" opacity=".5"/>
        <path d="M295 0v53m0 0 16 24-16 25-16-25z" fill={paint('gold')}/>
      </g>
      <g strokeLinecap="round" fill="none">
        {[0,1,2,3,4].map(i => <g key={i} transform={`translate(${300+i*14} ${405-i*11}) rotate(${15+i*14})`}><path d="M0 0Q0-50 0-125" stroke="#9c9359" strokeWidth="2"/>{Array.from({length:9},(_,j)=><path key={j} d={`M0 ${-j*12}l${-22+j} -19m${22-j} 19l${22-j} -19`} stroke={j%2?'#497761':'#769878'} strokeWidth="2"/>)}</g>)}
        <path d="M65 408Q12 323 46 258" stroke="#53785b" strokeWidth="3"/>
        {[0,1,2,3,4,5].map(i=><path key={i} d={`M${35+i*3} ${290+i*18}q-30 -4 -30 -26m30 26q20 -4 21 -27`} stroke="#729174" strokeWidth="2"/>)}
      </g>
      <g className="creator-present">
        <path d="m75 219 133-26 48 30-135 30z" fill="#da5960"/>
        <path d="m75 219 133-26v204L75 422z" fill={paint('red')}/>
        <path d="m208 193 48 30v174l-48 0z" fill="#681d2b"/>
        <path d="m75 219 133-26v204L75 422z" fill={paint('paper')}/>
        <path d="m75 219 133-26v204L75 422z" fill={paint('stars')}/>
        <path d="m122 210 27-5v205l-27 5z" fill={paint('gold')}/>
        <path d="m68 212 142-28 54 31-143 30z" fill="#dc5a62"/>
        <path d="m68 212 142-28v24L68 238z" fill={paint('red')}/>
        <path d="m210 184 54 31v24l-54-31z" fill="#892339"/>
        <path d="m119 202 27-5 55 32-27 5zM119 202v26l27-5v-26" fill={paint('gold')}/>
        <g fill={paint('gold')} stroke="#f2d48b" strokeWidth=".7">
          <path d="M145 196C52 169 57 99 91 118c29 16 43 59 54 78Zm-9-13c-23-51-41-65-51-56-14 13 24 47 51 56Z" fillRule="evenodd"/>
          <path d="M145 196c-7-92 49-135 55-97 6 34-26 73-55 97Zm7-16c35-34 43-63 34-66-16-6-30 34-34 66Z" fillRule="evenodd"/>
          <path d="M139 191c-10 29-38 41-55 55l23-1 5 22c30-25 32-45 37-70Z"/>
          <path d="M148 192c22 6 38 40 39 67l13-15 17 7c-9-43-31-63-60-67Z"/>
          <path d="M135 188q9-12 21-4l4 18q-11 9-22 0z"/>
        </g>
      </g>
      <g className="creator-cream-present">
        <path d="m223 303 112-18 54 30-113 23z" fill="#fff8e2"/>
        <path d="m223 303 112-18v130l-112 19z" fill={paint('cream')}/>
        <path d="m335 285 54 30v120l-54-20z" fill={paint('side')}/>
        <path d="m223 303 112-18v130l-112 19z" fill={paint('paper')}/>
        <path d="m242 300 15-3v132l-15 2z" fill={paint('gold')}/>
        <path d="m335 303 20 9v112l-20-9z" fill={paint('gold')}/>
        <path d="m215 296 122-21 60 31-121 25z" fill="#fff9e8"/>
        <path d="m215 296 122-21v20l-122 22z" fill={paint('cream')}/>
        <path d="m337 275 60 31v20l-60-31z" fill={paint('side')}/>
        <path d="m239 292 17-3 59 33-18 4zM239 292v21l17-3v-21" fill={paint('gold')}/>
        <g fill={paint('gold')} stroke="#f8df9f" strokeWidth=".7">
          <path d="M277 284c-80-24-90-84-52-69 25 10 41 43 52 69Zm-14-13c-16-35-36-50-44-47-15 7 19 36 44 47Z" fillRule="evenodd"/>
          <path d="M277 284c-8-78 49-112 49-77 0 23-26 53-49 77Zm7-15c23-22 32-42 27-47-8-9-26 25-27 47Z" fillRule="evenodd"/>
          <path d="M273 279q-10 38-27 53l19-4 9 15q16-34 10-59Z"/>
          <path d="M281 281q36 7 45 39l-17-7-8 15q-5-26-25-38Z"/>
          <path d="M268 276q11-9 21-1l2 15q-12 7-21 0z"/>
        </g>
        {logo && <image filter={brand.logo?.source === 'builtin' && brand.logo.assetId === 'starbucks-logo' ? paint('logoTint') : undefined} href={logo} x="271" y="340" width="49" height="49" preserveAspectRatio="xMidYMid meet" transform="rotate(-8 295 364)" onError={() => setFailedLogo(logo)} />}
      </g>
      <path d="M32 430C189 356 376 474 408 384" fill="none" stroke={paint('gold')} strokeWidth="8" opacity=".9"/>
      <path d="M32 426C189 352 376 470 408 380" fill="none" stroke="#ffe8a6" strokeWidth=".7"/>
      {[ [356,374],[371,385],[357,398],[42,353],[51,366] ].map(([cx,cy],i)=><circle key={i} cx={cx} cy={cy} r="5" fill="#ba3543" stroke="#d25b61"/>)}
    </svg>
    {decorations.leaves && <div className="creator-particles" aria-hidden="true">{Array.from({length:16},(_,i)=><i key={i} className={i%3===0?'creator-spark':'creator-gold-drop'} style={{'--x':`${7+(i*29)%87}%`,'--y':`${9+(i*17)%69}%`,'--delay':`${-i*1.37}s`,'--duration':`${6+i%5}s`} as CSSProperties}/>)}</div>}
    {!compact && artwork.caption && <figcaption>{artwork.caption}</figcaption>}
    {!compact && decorations.animated && <button type="button" className="creator-motion-toggle" onClick={() => setPaused(value=>!value)} aria-pressed={paused}>{paused ? 'Play artwork' : 'Pause artwork'}</button>}
  </figure>;
}
