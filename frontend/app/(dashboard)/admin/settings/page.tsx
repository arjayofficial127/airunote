'use client';

import { useState } from 'react';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import UnauthorizedError from '@/components/errors/UnauthorizedError';
import { encryptContent, decryptContent, isEncrypted } from '@/lib/utils/clientEncryption';

/**
 * Super Admin Settings Page
 * 
 * Features:
 * - Encrypt/Decrypt text tool
 * - Supports multiple encryption layers (double, triple, etc.)
 * - Password-based encryption (never sent to server)
 */
export default function SuperAdminSettingsPage() {
  const { isSuperAdmin, loading } = useSuperAdmin();
  const [text, setText] = useState('');
  const [password, setPassword] = useState('');
  const [encryptionCount, setEncryptionCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-gray-600">Checking permissions...</div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <UnauthorizedError 
        statusCode={403} 
        message="Only Super Admins can access settings." 
      />
    );
  }

  const handleEncrypt = async () => {
    if (!text.trim()) {
      setError('Please enter text to encrypt');
      return;
    }

    if (!password.trim()) {
      setError('Please enter a password');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const encrypted = await encryptContent(text, password);
      setText(encrypted);
      setEncryptionCount(prev => prev + 1);
    } catch (err: any) {
      setError(err.message || 'Encryption failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecrypt = async () => {
    if (!text.trim()) {
      setError('Please enter encrypted text to decrypt');
      return;
    }

    if (!password.trim()) {
      setError('Please enter the password');
      return;
    }

    // Check if text appears to be encrypted (has the format salt:iv:data)
    // But allow decrypt even if encryptionCount is 0 (user might have pasted encrypted text)
    if (!isEncrypted(text)) {
      // If encryptionCount is 0, text might not be encrypted
      if (encryptionCount === 0) {
        setError('Text does not appear to be encrypted. Make sure it has the format: salt:iv:data');
        return;
      }
      // If encryptionCount > 0 but text doesn't look encrypted, something's wrong
      // But try anyway - might be a false negative
    }

    setIsProcessing(true);
    setError(null);

    try {
      const decrypted = await decryptContent(text, password);
      setText(decrypted);
      setEncryptionCount(prev => Math.max(0, prev - 1));
    } catch (err: any) {
      setError(err.message || 'Decryption failed. Wrong password or not encrypted?');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClear = () => {
    setText('');
    setPassword('');
    setEncryptionCount(0);
    setError(null);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      // Show temporary success message
      const originalError = error;
      setError(null);
      setTimeout(() => setError(originalError), 2000);
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Super Admin Settings</h1>
        <p className="text-gray-600">Encrypt and decrypt sensitive data (passwords, keys, tokens, etc.)</p>
      </div>

      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 space-y-6">
        {/* Password Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Encryption Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your encryption password"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Password is never sent to the server. It stays in your browser.
          </p>
        </div>

        {/* Text Area */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Text Content
            </label>
            <div className="flex items-center gap-2">
              {encryptionCount > 0 && (
                <span className="text-xs text-blue-600 font-medium">
                  🔒 Encrypted {encryptionCount} time{encryptionCount > 1 ? 's' : ''}
                </span>
              )}
              {isEncrypted(text) && encryptionCount === 0 && (
                <span className="text-xs text-blue-600 font-medium">
                  🔒 Encrypted
                </span>
              )}
            </div>
          </div>
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setError(null);
            }}
            placeholder="Paste your text here (e.g., DATA=123&#10;JWT=AAB&#10;SUPA=ht123)"
            rows={12}
            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            Paste key-value pairs, secrets, tokens, or any sensitive data here.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className={`p-3 rounded-md ${
            error.includes('Failed') || error.includes('Wrong') 
              ? 'bg-red-50 border border-red-200 text-red-800' 
              : 'bg-yellow-50 border border-yellow-200 text-yellow-800'
          }`}>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleEncrypt}
            disabled={isProcessing || !text.trim() || !password.trim()}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
          >
            {isProcessing ? 'Processing...' : '🔒 Encrypt'}
          </button>
          
          <button
            onClick={handleDecrypt}
            disabled={isProcessing || !text.trim() || !password.trim()}
            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
          >
            {isProcessing ? 'Processing...' : '🔓 Decrypt'}
          </button>
          
          <button
            onClick={handleCopy}
            disabled={!text.trim()}
            className="px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            title="Copy to clipboard"
          >
            📋 Copy
          </button>
          
          <button
            onClick={handleClear}
            className="px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
          >
            🗑️ Clear
          </button>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">How it works:</h3>
          <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
            <li>Enter your password (never sent to server)</li>
            <li>Paste your text (key-value pairs, secrets, tokens, etc.)</li>
            <li>Click <strong>Encrypt</strong> to encrypt the text</li>
            <li>Click <strong>Encrypt</strong> again to double-encrypt (or triple, etc.)</li>
            <li>Click <strong>Decrypt</strong> to decrypt once (must decrypt in reverse order)</li>
            <li>Copy the encrypted result and paste it wherever you need (Gmail, notes, etc.)</li>
          </ul>
          <div className="mt-3 p-2 bg-yellow-100 border border-yellow-300 rounded text-xs text-yellow-800">
            <strong>⚠️ Warning:</strong> Multiple encryption layers don&apos;t significantly improve security. 
            AES-256 is already military-grade. Use a strong password instead.
          </div>
        </div>

        {/* Encryption Status */}
        {encryptionCount > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800">
              <strong>Current Status:</strong> Text is encrypted {encryptionCount} time{encryptionCount > 1 ? 's' : ''}.
              {encryptionCount > 1 && (
                <span className="block mt-1">
                  To decrypt, you must click &quot;Decrypt&quot; {encryptionCount} times (in reverse order).
                </span>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
