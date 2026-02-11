'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { encryptContent, decryptContent, isEncrypted } from '@/lib/utils/clientEncryption';

interface EncryptedTextFieldProps {
  value: string; // Encrypted value from server
  onChange: (encryptedValue: string) => void; // Callback with encrypted value
  placeholder?: string;
  label?: string;
  rows?: number;
  className?: string;
  disabled?: boolean;
  onPasswordSet?: (hasPassword: boolean) => void; // Callback when password is set/cleared
}

/**
 * Encrypted Text Field Component
 * 
 * Features:
 * - Encrypts content client-side before sending to API
 * - Password is NEVER sent to server
 * - Decrypts content when password is entered
 * - Shows encrypted indicator when content is encrypted
 * 
 * Usage:
 * ```tsx
 * <EncryptedTextField
 *   value={record.encryptedField} // Encrypted value from API
 *   onChange={(encrypted) => {
 *     // Save encrypted value to API
 *     updateRecord({ encryptedField: encrypted });
 *   }}
 * />
 * ```
 */
export function EncryptedTextField({
  value,
  onChange,
  placeholder = 'Enter text...',
  label,
  rows = 4,
  className = '',
  disabled = false,
  onPasswordSet,
}: EncryptedTextFieldProps) {
  const [password, setPassword] = useState('');
  const [decryptedText, setDecryptedText] = useState('');
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const contentIsEncrypted = isEncrypted(value);

  const handleDecrypt = useCallback(async () => {
    if (!password || !contentIsEncrypted) {
      return;
    }

    setIsDecrypting(true);
    setError(null);

    try {
      const decrypted = await decryptContent(value, password);
      setDecryptedText(decrypted);
      setShowPasswordInput(false);
    } catch (err: any) {
      setError(err.message || 'Failed to decrypt. Wrong password?');
      setDecryptedText('');
    } finally {
      setIsDecrypting(false);
    }
  }, [value, password, contentIsEncrypted]);

  // Auto-decrypt when password is entered and content is encrypted
  useEffect(() => {
    if (contentIsEncrypted && password && !isEditing) {
      handleDecrypt();
    } else if (!contentIsEncrypted && password) {
      // Content is not encrypted, show as plain text
      setDecryptedText('');
      setError(null);
    }
  }, [value, password, contentIsEncrypted, handleDecrypt, isEditing]);

  const handleTextChange = useCallback(async (newText: string) => {
    setDecryptedText(newText);
    setError(null);

    if (!password) {
      // No password set - show prompt
      setShowPasswordInput(true);
      return;
    }

    // Encrypt and send to parent
    try {
      if (newText.trim() === '') {
        // Empty text - send empty string
        onChange('');
        return;
      }

      const encrypted = await encryptContent(newText, password);
      onChange(encrypted);
    } catch (err: any) {
      setError(err.message || 'Failed to encrypt');
    }
  }, [password, onChange]);

  const handlePasswordSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setError('Password cannot be empty');
      return;
    }

    if (contentIsEncrypted) {
      // Decrypt existing content
      await handleDecrypt();
    } else {
      // Just set password for future encryption
      setShowPasswordInput(false);
      onPasswordSet?.(true);
    }
  }, [password, contentIsEncrypted, handleDecrypt, onPasswordSet]);

  const handleClearPassword = useCallback(() => {
    setPassword('');
    setDecryptedText('');
    setError(null);
    setShowPasswordInput(true);
    onPasswordSet?.(false);
    passwordInputRef.current?.focus();
  }, [onPasswordSet]);

  // Show password input if:
  // 1. Content is encrypted and not decrypted yet
  // 2. User is editing and no password set
  const shouldShowPasswordInput = showPasswordInput || (contentIsEncrypted && !decryptedText && !isDecrypting);

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {contentIsEncrypted && (
            <span className="ml-2 text-xs text-blue-600">🔒 Encrypted</span>
          )}
        </label>
      )}

      {/* Password Input */}
      {shouldShowPasswordInput && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-2">
          <form onSubmit={handlePasswordSubmit} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {contentIsEncrypted ? 'Enter password to decrypt:' : 'Set password to encrypt:'}
            </label>
            <div className="flex gap-2">
              <input
                ref={passwordInputRef}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your encryption password"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <button
                type="submit"
                disabled={!password.trim() || isDecrypting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {contentIsEncrypted ? (isDecrypting ? 'Decrypting...' : 'Decrypt') : 'Set Password'}
              </button>
            </div>
            <p className="text-xs text-gray-600">
              {contentIsEncrypted 
                ? 'This content is encrypted. Enter your password to view it.'
                : 'Password is stored locally and never sent to the server.'}
            </p>
          </form>
        </div>
      )}

      {/* Text Area */}
      {(!shouldShowPasswordInput || decryptedText) && (
        <div className="space-y-2">
          <div className="relative">
            <textarea
              value={decryptedText}
              onChange={(e) => {
                setIsEditing(true);
                handleTextChange(e.target.value);
              }}
              onBlur={() => setIsEditing(false)}
              placeholder={placeholder}
              rows={rows}
              disabled={disabled || isDecrypting}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
            />
            {password && (
              <button
                type="button"
                onClick={handleClearPassword}
                className="absolute top-2 right-2 text-xs text-gray-500 hover:text-gray-700"
                title="Clear password"
              >
                🔓 Clear Password
              </button>
            )}
          </div>
          
          {password && (
            <p className="text-xs text-gray-500">
              ✓ Content will be encrypted before saving. Password never leaves your browser.
            </p>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Encrypted Indicator (when not editing) */}
      {contentIsEncrypted && !decryptedText && !shouldShowPasswordInput && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            🔒 This content is encrypted. Enter password above to view/edit.
          </p>
        </div>
      )}
    </div>
  );
}
