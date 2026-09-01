/**
 * VaultProof Security Validation Helpers
 * Midnight Network ZK-Voting Protocol
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateMidnightAddress(address: string): ValidationResult {
  if (!address || typeof address !== 'string') {
    return { valid: false, error: 'Address must be a non-empty string.' };
  }
  const clean = address.trim().toLowerCase().replace(/^0x/, '');
  if (clean.length !== 64) {
    return {
      valid: false,
      error: `Invalid address length: expected 64 hex characters (32 bytes), received ${clean.length}.`,
    };
  }
  if (!/^[0-9a-f]{64}$/.test(clean)) {
    return {
      valid: false,
      error: 'Address contains non-hexadecimal characters.',
    };
  }
  return { valid: true };
}
