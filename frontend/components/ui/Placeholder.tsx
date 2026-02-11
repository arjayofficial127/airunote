'use client';

interface PlaceholderProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

/**
 * Placeholder Component
 * 
 * Displays a loading placeholder with shimmer animation.
 * Used to improve perceived performance while data is loading.
 */
export function Placeholder({
  className,
  variant = 'rectangular',
  width,
  height,
  lines,
}: PlaceholderProps) {
  const baseClasses = 'animate-pulse bg-gray-200 rounded';
  
  const variantClasses = {
    text: 'h-4',
    circular: 'rounded-full',
    rectangular: 'rounded',
  };

  if (lines && lines > 1) {
    return (
      <div className={`space-y-2 ${className || ''}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`${baseClasses} ${variantClasses[variant]} ${i === lines - 1 ? 'w-3/4' : ''} ${className || ''}`}
            style={{
              width: i === lines - 1 ? '75%' : width || '100%',
              height: height || (variant === 'text' ? '1rem' : '1rem'),
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className || ''}`}
      style={{
        width: width || '100%',
        height: height || (variant === 'text' ? '1rem' : '1rem'),
      }}
    />
  );
}

/**
 * Post Placeholder - Specific placeholder for post cards
 */
export function PostPlaceholder() {
  return (
    <div className="bg-white rounded-lg shadow p-8">
      <Placeholder variant="text" height="2rem" className="mb-4 w-3/4" />
      <Placeholder variant="text" height="1rem" className="mb-2 w-1/2" />
      <Placeholder lines={3} className="mb-4" />
      <Placeholder variant="rectangular" height="200px" className="mb-4" />
      <div className="flex gap-4">
        <Placeholder variant="rectangular" width="80px" height="32px" />
        <Placeholder variant="text" width="120px" />
      </div>
    </div>
  );
}

/**
 * Comment Placeholder - Specific placeholder for comment cards
 */
export function CommentPlaceholder() {
  return (
    <div className="border-b pb-4">
      <Placeholder variant="text" height="1rem" className="mb-2 w-1/4" />
      <Placeholder lines={2} className="mb-2" />
      <Placeholder variant="text" width="100px" height="0.75rem" />
    </div>
  );
}

/**
 * List Placeholder - Generic placeholder for list items
 */
export function ListPlaceholder({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow p-4">
          <Placeholder variant="text" height="1.5rem" className="mb-2 w-3/4" />
          <Placeholder lines={2} className="mb-2" />
          <Placeholder variant="text" width="120px" height="0.75rem" />
        </div>
      ))}
    </div>
  );
}
