/**
 * LoadingSkeleton Component
 * Skeleton loaders for Airunote pages
 */

'use client';

export function FolderTreeSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-10 bg-gray-200 rounded-md animate-pulse" />
      ))}
    </div>
  );
}

export function DocumentListSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-gray-200 rounded w-3/4 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DocumentEditorSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse mb-2" />
        <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse" />
      </div>
      <div className="flex-1 bg-gray-50 p-4">
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
