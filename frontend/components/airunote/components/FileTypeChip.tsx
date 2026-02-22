/**
 * FileTypeChip Component
 * Displays file type as a rounded chip
 */

'use client';

interface FileTypeChipProps {
  type: 'TXT' | 'MD' | 'RTF';
  className?: string;
}

export function FileTypeChip({ type, className = '' }: FileTypeChipProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border bg-white border-gray-300 text-gray-700 ${className}`}
    >
      {type}
    </span>
  );
}
