import { describe, it, expect } from 'vitest';
import {
  validateMidnightAddress,
  validateVoterSecret,
  validateVoteParams,
} from '../validation.js';

describe('VaultProof Security & Validation Engine', () => {
  describe('Midnight Address Validation', () => {
    it('accepts a valid 64-character hexadecimal address', () => {
      const validAddr = '39767f264df7b2da4ea9ce24b3900f148517c564ec9efbffecad33edcd33332f';
      const result = validateMidnightAddress(validAddr);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('accepts valid address with 0x prefix and normalizes it', () => {
      const prefixedAddr = '0x39767f264df7b2da4ea9ce24b3900f148517c564ec9efbffecad33edcd33332f';
      const result = validateMidnightAddress(prefixedAddr);
      expect(result.valid).toBe(true);
    });

    it('rejects addresses with invalid lengths', () => {
      const shortAddr = '39767f264df7b2da4ea9ce24b3900f148517c564ec9efbffecad33edcd3333';
      const result = validateMidnightAddress(shortAddr);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid address length');
    });

    it('rejects addresses with non-hex characters', () => {
      const invalidHex = '39767f264df7b2da4ea9ce24b3900f148517c564ec9efbffecad33edcd3333zg';
      const result = validateMidnightAddress(invalidHex);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('non-hexadecimal');
    });

    it('rejects empty or null addresses', () => {
      // @ts-expect-error test invalid inputs
      expect(validateMidnightAddress('').valid).toBe(false);
      // @ts-expect-error test invalid inputs
      expect(validateMidnightAddress(null).valid).toBe(false);
    });
  });

  describe('Voter Secret Key Validation', () => {
    it('accepts valid 32-byte (64 hex char) random secrets', () => {
      const validSecret = '1111111111111111111111111111111111111111111111111111111111111112';
      const result = validateVoterSecret(validSecret);
      expect(result.valid).toBe(true);
    });

    it('rejects zero-entropy trivial secrets', () => {
      const zeroSecret = '0000000000000000000000000000000000000000000000000000000000000000';
      const result = validateVoterSecret(zeroSecret);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('zero entropy');
    });

    it('rejects secrets with invalid length or non-hex characters', () => {
      expect(validateVoterSecret('short_secret').valid).toBe(false);
      expect(validateVoterSecret('11111111111111111111111111111111111111111111111111111111111111xx').valid).toBe(false);
    });
  });

  describe('Voting Parameters Validation', () => {
    it('accepts valid integer proposal indices and boolean choices', () => {
      expect(validateVoteParams(0, true).valid).toBe(true);
      expect(validateVoteParams(5, false).valid).toBe(true);
    });

    it('rejects negative or fractional proposal indices', () => {
      expect(validateVoteParams(-1, true).valid).toBe(false);
      expect(validateVoteParams(1.5, false).valid).toBe(false);
    });
  });
});
