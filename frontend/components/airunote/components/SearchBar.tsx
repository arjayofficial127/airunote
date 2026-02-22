/**
 * SearchBar Component
 * Real-time search for folders and documents
 */

'use client';

import { useState, useEffect } from 'react';
import { useAirunoteStore } from '../stores/airunoteStore';

interface SearchBarProps {
  onSearchChange?: (query: string) => void;
  placeholder?: string;
}

export function SearchBar({ onSearchChange, placeholder = 'Search...' }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const { setSearchQuery } = useAirunoteStore();

  useEffect(() => {
    // Update store search query
    setSearchQuery(query);
    // Call optional callback
    onSearchChange?.(query);
  }, [query, setSearchQuery, onSearchChange]);

  return (
    <div className="relative mb-4">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg
          className="h-5 w-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
      />
      {query && (
        <button
          onClick={() => setQuery('')}
          className="absolute inset-y-0 right-0 pr-3 flex items-center"
        >
          <svg
            className="h-5 w-5 text-gray-400 hover:text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
