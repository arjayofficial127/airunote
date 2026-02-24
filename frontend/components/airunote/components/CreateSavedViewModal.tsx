/**
 * CreateSavedViewModal Component
 * Phase 6 — Saved Views
 * 
 * Modal for creating a new saved view with structured filters
 */

'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { airunoteApi } from '../services/airunoteApi';
import { toast } from '@/lib/toast';
import type { LensQuery } from '../types';
import type { AiruLens } from '@/lib/api/airunoteLensesApi';

interface CreateSavedViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  userId: string;
  onSuccess?: (lens: AiruLens) => void;
}

export function CreateSavedViewModal({
  isOpen,
  onClose,
  orgId,
  userId,
  onSuccess,
}: CreateSavedViewModalProps) {
  const [lensName, setLensName] = useState('');
  const [searchText, setSearchText] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [attributeFilters, setAttributeFilters] = useState<Array<{ key: string; value: string }>>([]); // Phase 7: Attribute filters
  const [sortField, setSortField] = useState<'createdAt' | 'updatedAt'>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async () => {
      // Build LensQuery
      const query: LensQuery = {
        filters: {},
        sort: {
          field: sortField,
          direction: sortDirection,
        },
      };

      // Add text filter if provided
      if (searchText.trim()) {
        query.filters!.text = searchText.trim();
      }

      // Add state filter if provided
      if (selectedStates.length > 0) {
        query.filters!.state = selectedStates;
      }

      // Add tags filter if provided
      if (tagsInput.trim()) {
        // Parse tags: split by comma, trim, filter empty
        const tags = tagsInput
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0);
        if (tags.length > 0) {
          query.filters!.tags = tags;
        }
      }

      // Phase 7: Add attribute filters if provided
      if (attributeFilters.length > 0) {
        const attrs: Record<string, any> = {};
        attributeFilters.forEach(({ key, value }) => {
          if (key.trim() && value.trim()) {
            // Try to parse value as JSON, fallback to string
            try {
              attrs[key.trim()] = JSON.parse(value);
            } catch {
              attrs[key.trim()] = value.trim();
            }
          }
        });
        if (Object.keys(attrs).length > 0) {
          query.filters!.attributes = attrs;
        }
      }

      // Remove filters object if empty
      if (Object.keys(query.filters || {}).length === 0) {
        delete query.filters;
      }

      const response = await airunoteApi.createDesktopLens(
        orgId,
        userId,
        lensName.trim(),
        query as Record<string, unknown>,
        {},
        'saved'
      );
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to create saved view');
      }
      return response.data.lens;
    },
    onSuccess: (lens) => {
      queryClient.invalidateQueries({ queryKey: ['lens'] });
      toast('Saved view created successfully', 'success');
      setLensName('');
      setSearchText('');
      setTagsInput('');
      setSelectedStates([]);
      setAttributeFilters([]);
      setSortField('createdAt');
      setSortDirection('desc');
      setError(null);
      onSuccess?.(lens);
      onClose();
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Failed to create saved view');
      toast(err instanceof Error ? err.message : 'Failed to create saved view', 'error');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!lensName.trim()) {
      setError('View name is required');
      return;
    }

    createMutation.mutate();
  };

  const handleClose = () => {
    setLensName('');
    setSearchText('');
    setTagsInput('');
    setSelectedStates([]);
    setAttributeFilters([]);
    setSortField('createdAt');
    setSortDirection('desc');
    setError(null);
    onClose();
  };

  const handleAddAttributeFilter = () => {
    setAttributeFilters([...attributeFilters, { key: '', value: '' }]);
  };

  const handleRemoveAttributeFilter = (index: number) => {
    setAttributeFilters(attributeFilters.filter((_, i) => i !== index));
  };

  const handleAttributeFilterChange = (index: number, key: string, value: string) => {
    const updated = [...attributeFilters];
    updated[index] = { key, value };
    setAttributeFilters(updated);
  };

  const toggleState = (state: string) => {
    setSelectedStates((prev) =>
      prev.includes(state) ? prev.filter((s) => s !== state) : [...prev, state]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Create Saved View</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="lensName" className="block text-sm font-medium text-gray-700 mb-2">
              View Name
            </label>
            <input
              type="text"
              id="lensName"
              value={lensName}
              onChange={(e) => setLensName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter view name"
              autoFocus
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>

          {/* Filters Section */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Filters</h3>

            {/* Text Search */}
            <div className="mb-3">
              <label htmlFor="searchText" className="block text-sm font-medium text-gray-700 mb-1">
                Search Text
              </label>
              <input
                type="text"
                id="searchText"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search in document names and content"
              />
            </div>

            {/* State Filter */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Document State
              </label>
              <div className="flex flex-wrap gap-2">
                {['active', 'archived', 'trashed'].map((state) => (
                  <button
                    key={state}
                    type="button"
                    onClick={() => toggleState(state)}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                      selectedStates.includes(state)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {state.charAt(0).toUpperCase() + state.slice(1)}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Select one or more states to filter by. Leave empty to include all states.
              </p>
            </div>

            {/* Tags Filter */}
            <div className="mb-3">
              <label htmlFor="tagsInput" className="block text-sm font-medium text-gray-700 mb-1">
                Tags
              </label>
              <input
                type="text"
                id="tagsInput"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter tags separated by commas (e.g., #priority, #work, #personal)"
              />
              <p className="mt-1 text-xs text-gray-500">
                Enter tags separated by commas. Tags are used for filtering (future feature).
              </p>
            </div>

            {/* Phase 7: Attribute Filters */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Attribute Filters
                </label>
                <button
                  type="button"
                  onClick={handleAddAttributeFilter}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  + Add Filter
                </button>
              </div>
              {attributeFilters.map((filter, index) => (
                <div key={index} className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={filter.key}
                    onChange={(e) => handleAttributeFilterChange(index, e.target.value, filter.value)}
                    placeholder="Attribute key"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <input
                    type="text"
                    value={filter.value}
                    onChange={(e) => handleAttributeFilterChange(index, filter.key, e.target.value)}
                    placeholder="Value (or JSON)"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveAttributeFilter(index)}
                    className="px-2 py-2 text-red-600 hover:text-red-700"
                  >
                    ×
                  </button>
                </div>
              ))}
              <p className="mt-1 text-xs text-gray-500">
                Filter documents by attribute key-value pairs. Values can be strings or JSON.
              </p>
            </div>
          </div>

          {/* Sort Section */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Sort</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="sortField" className="block text-sm font-medium text-gray-700 mb-1">
                  Sort By
                </label>
                <select
                  id="sortField"
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value as 'createdAt' | 'updatedAt')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="createdAt">Created Date</option>
                  <option value="updatedAt">Updated Date</option>
                </select>
              </div>
              <div>
                <label htmlFor="sortDirection" className="block text-sm font-medium text-gray-700 mb-1">
                  Direction
                </label>
                <select
                  id="sortDirection"
                  value={sortDirection}
                  onChange={(e) => setSortDirection(e.target.value as 'asc' | 'desc')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createMutation.isPending ? 'Creating...' : 'Create View'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
