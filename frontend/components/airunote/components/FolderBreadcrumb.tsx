/**
 * FolderBreadcrumb Component
 * Dynamic hierarchical breadcrumb with sibling dropdown
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { FolderPathItem } from '../utils/folderPath';

interface FolderBreadcrumbProps {
  path: FolderPathItem[];
  orgId: string;
}

export function FolderBreadcrumb({ path, orgId }: FolderBreadcrumbProps) {
  const params = useParams();
  const orgIdFromParams = params.orgId as string;
  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null);
  const dropdownRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        openDropdownIndex !== null &&
        dropdownRefs.current[openDropdownIndex] &&
        !dropdownRefs.current[openDropdownIndex]?.contains(event.target as Node)
      ) {
        setOpenDropdownIndex(null);
      }
    };

    if (openDropdownIndex !== null) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [openDropdownIndex]);

  const handleBreadcrumbClick = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    setOpenDropdownIndex(openDropdownIndex === index ? null : index);
  };

  // Home is always first
  const homePath = `/orgs/${orgIdFromParams}/airunote`;

  return (
    <nav className="mb-6">
      <ol className="flex items-center space-x-2 text-sm text-gray-600 flex-wrap">
        {/* Home */}
        <li className="flex items-center">
          <Link
            href={homePath}
            className="hover:text-blue-600 transition-colors"
          >
            Home
          </Link>
        </li>

        {/* Folder path items */}
        {path.map((item, index) => {
          const isLast = index === path.length - 1;
          const folderPath = `/orgs/${orgIdFromParams}/airunote/folder/${item.folder.id}`;
          const hasSiblings = item.siblings.length > 0;
          const isDropdownOpen = openDropdownIndex === index;

          return (
            <li key={item.folder.id} className="flex items-center">
              <span className="mx-2 text-gray-400">/</span>
              {isLast ? (
                <span className="text-gray-900 font-medium">
                  {item.folder.humanId}
                </span>
              ) : hasSiblings ? (
                <div className="relative" ref={(el) => { dropdownRefs.current[index] = el; }}>
                  <button
                    onClick={(e) => handleBreadcrumbClick(index, e)}
                    className="flex items-center hover:text-blue-600 transition-colors"
                  >
                    <span>{item.folder.humanId}</span>
                    <svg
                      className={`w-4 h-4 ml-1 transition-transform ${
                        isDropdownOpen ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {/* Sibling Dropdown */}
                  {isDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                      <div className="py-1">
                        {/* Current folder (highlighted) */}
                        <Link
                          href={folderPath}
                          onClick={() => setOpenDropdownIndex(null)}
                          className="block px-4 py-2 text-sm text-gray-900 bg-blue-50 font-medium hover:bg-blue-100"
                        >
                          {item.folder.humanId}
                        </Link>

                        {/* Siblings */}
                        {item.siblings.map((sibling) => {
                          const siblingPath = `/orgs/${orgIdFromParams}/airunote/folder/${sibling.id}`;
                          return (
                            <Link
                              key={sibling.id}
                              href={siblingPath}
                              onClick={() => setOpenDropdownIndex(null)}
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <div className="flex items-center justify-between">
                                <span>{sibling.humanId}</span>
                                <span className="text-xs text-gray-500">
                                  {/* TODO: Replace with metadata count once aggregation exists */}
                                  #
                                </span>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href={folderPath}
                  className="hover:text-blue-600 transition-colors"
                >
                  {item.folder.humanId}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
