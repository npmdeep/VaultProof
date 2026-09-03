import { describe, it, expect } from 'vitest';
import {
  validateMidnightAddress,
  validateVoterSecret,
  validateVoteParams,
  computeVotingAnalytics,
  generateVoteReceipt,
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

  describe('Analytics and Quorum Calculations', () => {
    it('computes correct percentage and quorum stats for balanced votes', () => {
      const stats = computeVotingAnalytics(6, 4, 10);
      expect(stats.totalVotes).toBe(10);
      expect(stats.yesPercentage).toBe(60);
      expect(stats.noPercentage).toBe(40);
      expect(stats.quorumPercentage).toBe(100);
      expect(stats.isQuorumReached).toBe(true);
    });

    it('handles zero vote edge cases gracefully without NaN', () => {
      const stats = computeVotingAnalytics(0, 0, 10);
      expect(stats.totalVotes).toBe(0);
      expect(stats.yesPercentage).toBe(0);
      expect(stats.noPercentage).toBe(0);
      expect(stats.quorumPercentage).toBe(0);
      expect(stats.isQuorumReached).toBe(false);
    });

    it('handles negative or undefined inputs safely', () => {
      // @ts-expect-error test invalid inputs
      const stats = computeVotingAnalytics(-5, null, 10);
      expect(stats.totalVotes).toBe(0);
      expect(stats.safeYes).toBe(0);
      expect(stats.safeNo).toBe(0);
    });
  });

  describe('Audit Trail Receipt Generator', () => {
    it('generates a verifiable cryptographic receipt with checksum', () => {
      const receipt = generateVoteReceipt(
        '39767f264df7b2da4ea9ce24b3900f148517c564ec9efbffecad33edcd33332f',
        'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
        0,
        true,
        'preprod'
      );

      expect(receipt.version).toBe('1.0.0');
      expect(receipt.choice).toBe(true);
      expect(receipt.proposalId).toBe(0);
      expect(receipt.network).toBe('preprod');
      expect(receipt.checksum).toBeDefined();
      expect(receipt.checksum.length).toBe(8);
      expect(Date.parse(receipt.timestamp)).not.toBeNaN();
    });
  });
});
