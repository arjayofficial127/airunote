import Image from 'next/image';
import Link from 'next/link';

interface AirunoteLogoProps {
  href?: string;
  variant?: 'default' | 'white';
  iconSize?: number;
  textClassName?: string;
  className?: string;
}

export function AirunoteLogo({
  href = '/',
  variant = 'default',
  iconSize = 24,
  textClassName,
  className,
}: AirunoteLogoProps) {
  const src = variant === 'white' ? '/airunote/airunote_logo_white.png' : '/airunote/airunote_logo.png';
  const resolvedTextClassName =
    textClassName ??
    (variant === 'white'
      ? 'text-base font-semibold tracking-tight text-white'
      : 'text-base font-semibold tracking-tight text-gray-900');

  return (
    <Link href={href} className={className ?? 'flex items-center gap-2'}>
      <Image src={src} alt="Airunote" width={iconSize} height={iconSize} className="shrink-0" />
      <span className={resolvedTextClassName}>airunote</span>
    </Link>
  );
}