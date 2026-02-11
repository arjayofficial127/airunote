/**
 * Client-Side Encryption Utility
 * 
 * Uses Web Crypto API (AES-GCM) for industry-standard encryption.
 * Password is NEVER sent to the server - only encrypted content is stored.
 * 
 * Security:
 * - AES-256-GCM (authenticated encryption)
 * - PBKDF2 key derivation (100,000 iterations)
 * - Random IV for each encryption
 * - Password never leaves the browser
 */

/**
 * Derive encryption key from password using PBKDF2
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  // Ensure salt is a proper BufferSource (convert to new Uint8Array if needed)
  const saltBuffer = new Uint8Array(salt);

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 100000, // Industry standard: 100k iterations
      hash: 'SHA-256',
    },
    passwordKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Generate random salt (16 bytes)
 */
function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

/**
 * Generate random IV (12 bytes for AES-GCM)
 */
function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(12));
}

/**
 * Encrypt text content with password
 * 
 * @param plaintext - The text to encrypt
 * @param password - User's password (never sent to server)
 * @returns Encrypted string in format: salt:iv:encryptedData (base64)
 * 
 * Format: base64(salt) + ":" + base64(iv) + ":" + base64(encryptedData)
 */
export async function encryptContent(plaintext: string, password: string): Promise<string> {
  if (!plaintext) {
    return '';
  }

  if (!password || password.length === 0) {
    throw new Error('Password is required for encryption');
  }

  try {
    // Generate random salt and IV
    const salt = generateSalt();
    const iv = generateIV();

    // Derive key from password
    const key = await deriveKey(password, salt);

    // Encrypt
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    // Ensure IV is a proper BufferSource
    const ivBuffer = new Uint8Array(iv);

    const encryptedData = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: ivBuffer,
      },
      key,
      data
    );

    // Combine salt, IV, and encrypted data
    // Format: salt:iv:encryptedData (all base64)
    const saltB64 = btoa(String.fromCharCode(...salt));
    const ivB64 = btoa(String.fromCharCode(...iv));
    const encryptedB64 = btoa(String.fromCharCode(...new Uint8Array(encryptedData)));

    return `${saltB64}:${ivB64}:${encryptedB64}`;
  } catch (error) {
    console.error('[encryptContent] Error:', error);
    throw new Error('Encryption failed. Please try again.');
  }
}

/**
 * Decrypt encrypted content with password
 * 
 * @param encryptedString - Encrypted string in format: salt:iv:encryptedData
 * @param password - User's password (never sent to server)
 * @returns Decrypted plaintext
 */
export async function decryptContent(encryptedString: string, password: string): Promise<string> {
  if (!encryptedString) {
    return '';
  }

  if (!password || password.length === 0) {
    throw new Error('Password is required for decryption');
  }

  try {
    // Parse encrypted string
    const parts = encryptedString.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted format');
    }

    const [saltB64, ivB64, encryptedB64] = parts;

    // Decode from base64
    const salt = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0));
    const encryptedData = Uint8Array.from(atob(encryptedB64), (c) => c.charCodeAt(0));

    // Derive key from password
    const key = await deriveKey(password, salt);

    // Decrypt
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      encryptedData
    );

    // Convert to string
    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  } catch (error) {
    console.error('[decryptContent] Error:', error);
    // Don't reveal if it's wrong password vs invalid format
    throw new Error('Decryption failed. Wrong password or corrupted data.');
  }
}

/**
 * Check if a string is encrypted (has the format salt:iv:data)
 */
export function isEncrypted(value: string): boolean {
  if (!value) return false;
  const parts = value.split(':');
  return parts.length === 3 && parts.every(part => part.length > 0);
}
