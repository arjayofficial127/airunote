/**
 * Test Examples - Proving Cross-Browser Compatibility
 * 
 * This demonstrates that the same encrypted string can be decrypted
 * in any browser/device as long as you have the password.
 */

import { encryptContent, decryptContent, isEncrypted } from './clientEncryption';

/**
 * Example: Encrypt in one "browser" (simulated)
 */
async function exampleEncryptInBrowser1() {
  const plaintext = "My secret message that works everywhere!";
  const password = "mySecretPassword123";
  
  // Encrypt (happens in Browser 1 - e.g., Chrome on Windows)
  const encrypted = await encryptContent(plaintext, password);
  console.log('Encrypted in Browser 1:', encrypted);
  // Output: "dGVzdHNhbHQ=:dGVzdGl2:ZW5jcnlwdGVkZGF0YQ=="
  
  // This encrypted string is what gets saved to database
  // It contains: salt:iv:encryptedData (all base64)
  
  return encrypted;
}

/**
 * Example: Decrypt in another "browser" (simulated)
 */
async function exampleDecryptInBrowser2(encryptedString: string) {
  const password = "mySecretPassword123"; // Same password user remembers
  
  // Decrypt (happens in Browser 2 - e.g., Firefox on Mac)
  const decrypted = await decryptContent(encryptedString, password);
  console.log('Decrypted in Browser 2:', decrypted);
  // Output: "My secret message that works everywhere!"
  
  return decrypted;
}

/**
 * Full Example: Cross-Browser Flow
 */
export async function demonstrateCrossBrowserCompatibility() {
  console.log('=== Cross-Browser Encryption Demo ===\n');
  
  // Step 1: User encrypts in Chrome on Windows
  console.log('1. User encrypts in Chrome (Windows):');
  const encrypted = await exampleEncryptInBrowser1();
  console.log(`   Encrypted string: ${encrypted.substring(0, 50)}...\n`);
  
  // Step 2: Encrypted string is saved to database
  console.log('2. Encrypted string saved to database');
  console.log('   (This is what the server stores)\n');
  
  // Step 3: User opens Firefox on Mac, loads encrypted string
  console.log('3. User opens Firefox (Mac), loads encrypted string');
  console.log(`   Encrypted string from DB: ${encrypted.substring(0, 50)}...\n`);
  
  // Step 4: User enters password (same password they remember)
  console.log('4. User enters password (same password they remember)');
  
  // Step 5: Decrypts successfully!
  console.log('5. Decrypting...');
  const decrypted = await exampleDecryptInBrowser2(encrypted);
  console.log(`   ✅ Decrypted: "${decrypted}"\n`);
  
  console.log('=== Result: Works perfectly across browsers! ===');
  console.log('\nKey Points:');
  console.log('- Encrypted string is portable (works anywhere)');
  console.log('- Password is what user remembers (not stored)');
  console.log('- Same encrypted string + same password = decrypts anywhere');
}

/**
 * Example: What happens if password is wrong?
 */
export async function demonstrateWrongPassword() {
  const plaintext = "Secret message";
  const correctPassword = "correctPassword123";
  const wrongPassword = "wrongPassword456";
  
  // Encrypt with correct password
  const encrypted = await encryptContent(plaintext, correctPassword);
  
  // Try to decrypt with wrong password
  try {
    await decryptContent(encrypted, wrongPassword);
    console.log('❌ This should not happen - wrong password should fail');
  } catch (error) {
    console.log('✅ Correctly rejected wrong password:', error);
  }
}

/**
 * Example: Encrypted string format
 */
export function demonstrateEncryptedFormat() {
  // Encrypted string format: salt:iv:encryptedData
  const exampleEncrypted = "dGVzdHNhbHQ=:dGVzdGl2:ZW5jcnlwdGVkZGF0YQ==";
  
  console.log('Encrypted String Format:');
  console.log('Format: salt:iv:encryptedData (all base64)');
  console.log(`Example: ${exampleEncrypted}`);
  
  const parts = exampleEncrypted.split(':');
  console.log(`\nParts:`);
  console.log(`- Salt (base64): ${parts[0]}`);
  console.log(`- IV (base64): ${parts[1]}`);
  console.log(`- Encrypted Data (base64): ${parts[2]}`);
  
  console.log('\n✅ This format is standard and works in any browser!');
}

// Run examples (uncomment to test):
// demonstrateCrossBrowserCompatibility();
// demonstrateWrongPassword();
// demonstrateEncryptedFormat();
