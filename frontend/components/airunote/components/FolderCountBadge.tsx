/**
 * FolderCountBadge Component
 * Premium polish: Shows direct counts by default, total on hover
 */

'use client';

interface FolderCountBadgeProps {
  directFolders: number;
  directFiles: number;
  subFolders: number;
  subFiles: number;
  compact?: boolean;
}

export function FolderCountBadge({
  directFolders,
  directFiles,
  subFolders,
  subFiles,
  compact = false,
}: FolderCountBadgeProps) {
  // Calculate totals
  const totalFolders = directFolders + subFolders;
  const totalFiles = directFiles + subFiles;
  const totalItems = totalFolders + totalFiles;

  if (compact) {
    // Sidebar badge shows DIRECT children only.
    // This matches folder header summary.
    // Recursive totals belong only in analytics or folder info views.
    const directItems = directFolders + directFiles;
    return (
      <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-700 rounded-full flex-shrink-0">
        {directItems}
      </span>
    );
  }

  // Full version: Show direct by default, total on hover (premium polish)
  const formatCounts = (folders: number, files: number) => {
    const parts: string[] = [];
    if (folders > 0) {
      parts.push(`${folders} ${folders === 1 ? 'folder' : 'folders'}`);
    }
    if (files > 0) {
      parts.push(`${files} ${files === 1 ? 'file' : 'files'}`);
    }
    return parts.length > 0 ? parts.join(' • ') : '0 items';
  };

  const directText = formatCounts(directFolders, directFiles);
  const totalText = formatCounts(totalFolders, totalFiles);
  const hasSubItems = subFolders > 0 || subFiles > 0;

  return (
    <div className="group relative flex-shrink-0">
      <div className="text-xs text-gray-600">
        {directText}
      </div>
      {hasSubItems && (
        <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-10 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
          <div className="font-semibold">Total: {totalText}</div>
        </div>
      )}
    </div>
  );
}
