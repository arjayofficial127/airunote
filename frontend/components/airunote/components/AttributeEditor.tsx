/**
 * AttributeEditor Component
 * Phase 7 — Hybrid Attribute Engine
 * 
 * Allows editing document attributes based on folder schema
 */

'use client';

import { useState, useEffect } from 'react';
import type { AiruFolder } from '../types';

interface AttributeEditorProps {
  attributes: Record<string, any>;
  folder: AiruFolder | null;
  onChange: (attributes: Record<string, any>) => void;
}

interface SchemaField {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required?: boolean;
  options?: string[]; // For select type
}

export function AttributeEditor({ attributes, folder, onChange }: AttributeEditorProps) {
  const [localAttributes, setLocalAttributes] = useState<Record<string, any>>(attributes || {});
  const [customAttributes, setCustomAttributes] = useState<Array<{ key: string; value: any }>>([]);

  // Get schema from folder metadata
  const schema = folder?.metadata?.schema as Record<string, SchemaField> | undefined;

  // Initialize custom attributes from attributes not in schema
  useEffect(() => {
    if (attributes) {
      const schemaKeys = schema ? Object.keys(schema) : [];
      const custom = Object.entries(attributes)
        .filter(([key]) => !schemaKeys.includes(key))
        .map(([key, value]) => ({ key, value }));
      setCustomAttributes(custom);
    }
  }, [attributes, schema]);

  // Update local attributes when props change
  useEffect(() => {
    setLocalAttributes(attributes || {});
  }, [attributes]);

  const handleSchemaFieldChange = (key: string, value: any) => {
    const updated = { ...localAttributes, [key]: value };
    setLocalAttributes(updated);
    onChange(updated);
  };

  const handleCustomAttributeChange = (index: number, key: string, value: any) => {
    const updated = [...customAttributes];
    updated[index] = { key, value };
    setCustomAttributes(updated);

    // Update local attributes
    const updatedAttrs = { ...localAttributes };
    // Remove old key if it changed
    if (updated[index].key !== key && localAttributes[updated[index].key] !== undefined) {
      delete updatedAttrs[updated[index].key];
    }
    updatedAttrs[key] = value;
    setLocalAttributes(updatedAttrs);
    onChange(updatedAttrs);
  };

  const handleAddCustomAttribute = () => {
    setCustomAttributes([...customAttributes, { key: '', value: '' }]);
  };

  const handleRemoveCustomAttribute = (index: number) => {
    const updated = [...customAttributes];
    const removed = updated.splice(index, 1)[0];
    setCustomAttributes(updated);

    // Remove from local attributes
    const updatedAttrs = { ...localAttributes };
    if (removed.key) {
      delete updatedAttrs[removed.key];
    }
    setLocalAttributes(updatedAttrs);
    onChange(updatedAttrs);
  };

  const renderField = (key: string, field: SchemaField) => {
    const value = localAttributes[key];
    const isRequired = field.required === true;

    switch (field.type) {
      case 'string':
        if (field.options && field.options.length > 0) {
          // Select dropdown
          return (
            <select
              value={value || ''}
              onChange={(e) => handleSchemaFieldChange(key, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required={isRequired}
            >
              <option value="">Select...</option>
              {field.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          );
        }
        // Text input
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleSchemaFieldChange(key, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={`Enter ${key}`}
            required={isRequired}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => handleSchemaFieldChange(key, e.target.value ? Number(e.target.value) : undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={`Enter ${key}`}
            required={isRequired}
          />
        );

      case 'boolean':
        return (
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={value === true}
              onChange={(e) => handleSchemaFieldChange(key, e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">{key}</span>
          </label>
        );

      case 'array':
        // Tags input (comma-separated)
        const tagsValue = Array.isArray(value) ? value.join(', ') : '';
        return (
          <input
            type="text"
            value={tagsValue}
            onChange={(e) => {
              const tags = e.target.value
                .split(',')
                .map((tag) => tag.trim())
                .filter((tag) => tag.length > 0);
              handleSchemaFieldChange(key, tags);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter tags separated by commas"
            required={isRequired}
          />
        );

      case 'object':
        return (
          <textarea
            value={value ? JSON.stringify(value, null, 2) : ''}
            onChange={(e) => {
              try {
                const parsed = e.target.value ? JSON.parse(e.target.value) : null;
                handleSchemaFieldChange(key, parsed);
              } catch {
                // Invalid JSON, don't update
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            placeholder="Enter JSON object"
            rows={3}
            required={isRequired}
          />
        );

      default:
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleSchemaFieldChange(key, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required={isRequired}
          />
        );
    }
  };

  if (!schema || Object.keys(schema).length === 0) {
    // No schema - show simple tags input
    const tagsValue = Array.isArray(localAttributes.tags) 
      ? localAttributes.tags.join(', ') 
      : (localAttributes.tags || '');
    
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tags
          </label>
          <input
            type="text"
            value={tagsValue}
            onChange={(e) => {
              const tags = e.target.value
                .split(',')
                .map((tag) => tag.trim())
                .filter((tag) => tag.length > 0);
              const updated = { ...localAttributes, tags };
              setLocalAttributes(updated);
              onChange(updated);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter tags separated by commas"
          />
          <p className="mt-1 text-xs text-gray-500">
            Add tags to categorize this document
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Schema-defined fields */}
      {Object.entries(schema).map(([key, field]) => (
        <div key={key}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {key}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {renderField(key, field)}
          {field.type === 'array' && (
            <p className="mt-1 text-xs text-gray-500">
              Enter values separated by commas
            </p>
          )}
        </div>
      ))}

      {/* Custom attributes */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Custom Attributes
          </label>
          <button
            type="button"
            onClick={handleAddCustomAttribute}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            + Add
          </button>
        </div>
        {customAttributes.map((attr, index) => (
          <div key={index} className="flex items-center gap-2 mb-2">
            <input
              type="text"
              value={attr.key}
              onChange={(e) => handleCustomAttributeChange(index, e.target.value, attr.value)}
              placeholder="Key"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <input
              type="text"
              value={typeof attr.value === 'string' ? attr.value : JSON.stringify(attr.value)}
              onChange={(e) => {
                // Try to parse as JSON, fallback to string
                let value: any = e.target.value;
                try {
                  value = JSON.parse(e.target.value);
                } catch {
                  // Keep as string
                }
                handleCustomAttributeChange(index, attr.key, value);
              }}
              placeholder="Value"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <button
              type="button"
              onClick={() => handleRemoveCustomAttribute(index)}
              className="px-2 py-2 text-red-600 hover:text-red-700"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
