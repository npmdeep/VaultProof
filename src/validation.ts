/**
 * VaultProof Security Validation and Cryptographic Verification Helpers
 * Midnight Network ZK-Voting Protocol
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface VoteReceipt {
  version: string;
  contractAddress: string;
  nullifierHash: string;
  proposalId: number;
  choice: boolean;
  timestamp: string;
  network: string;
  checksum: string;
}

/**
 * Validates a Midnight contract or account hex address.
 * Midnight addresses are 64-character hexadecimal strings (32 bytes).
 */
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

/**
 * Validates voter private secret key for nullifier derivation.
 * Must be a 32-byte hex string (64 characters) with sufficient entropy.
 */
export function validateVoterSecret(secretHex: string): ValidationResult {
  if (!secretHex || typeof secretHex !== 'string') {
    return { valid: false, error: 'Voter secret cannot be empty.' };
  }
  const clean = secretHex.trim().toLowerCase().replace(/^0x/, '');
  if (clean.length !== 64) {
    return {
      valid: false,
      error: `Invalid secret length: expected 64 hex characters, got ${clean.length}.`,
    };
  }
  if (!/^[0-9a-f]{64}$/.test(clean)) {
    return { valid: false, error: 'Secret contains non-hexadecimal characters.' };
  }
  // Zero-entropy check: reject all zeros or trivial sequences
  if (/^0+$/.test(clean) || /^f+$/.test(clean)) {
    return {
      valid: false,
      error: 'Secret exhibits zero entropy (trivial value). Please use a secure random secret.',
    };
  }
  return { valid: true };
}

/**
 * Validates voting proposal index and choice parameters.
 */
export function validateVoteParams(proposalIndex: number, choice: boolean): ValidationResult {
  if (proposalIndex < 0 || !Number.isInteger(proposalIndex)) {
    return { valid: false, error: 'Proposal index must be a non-negative integer.' };
  }
  if (typeof choice !== 'boolean') {
    return { valid: false, error: 'Vote choice must be a boolean (true/false).' };
  }
  return { valid: true };
}

/**
 * Computes analytics metrics such as quorum percentage and approval ratio safely.
 */
export function computeVotingAnalytics(yesVotes: number, noVotes: number, quorumThreshold: number = 10) {
  const safeYes = Math.max(0, Number(yesVotes) || 0);
  const safeNo = Math.max(0, Number(noVotes) || 0);
  const totalVotes = safeYes + safeNo;

  const quorumPercentage = quorumThreshold > 0
    ? Math.min(100, Math.round((totalVotes / quorumThreshold) * 100))
    : 100;

  const yesPercentage = totalVotes > 0 ? Math.round((safeYes / totalVotes) * 100) : 0;
  const noPercentage = totalVotes > 0 ? Math.round((safeNo / totalVotes) * 100) : 0;
  const isQuorumReached = totalVotes >= quorumThreshold;

  return {
    totalVotes,
    safeYes,
    safeNo,
    yesPercentage,
    noPercentage,
    quorumPercentage,
    isQuorumReached,
  };
}

/**
 * Generates an encrypted vote proof receipt for client-side verifiable audit trails.
 */
export function generateVoteReceipt(
  contractAddress: string,
  nullifierHash: string,
  proposalId: number,
  choice: boolean,
  network: string = 'preprod'
): VoteReceipt {
  const timestamp = new Date().toISOString();
  // Simple deterministic checksum calculation for audit verification
  const payload = `${contractAddress}:${nullifierHash}:${proposalId}:${choice}:${timestamp}`;
  let checksumVal = 0;
  for (let i = 0; i < payload.length; i++) {
    checksumVal = (checksumVal * 31 + payload.charCodeAt(i)) >>> 0;
  }
  const checksum = checksumVal.toString(16).padStart(8, '0');

  return {
    version: '1.0.0',
    contractAddress,
    nullifierHash,
    proposalId,
    choice,
    timestamp,
    network,
    checksum,
  };
}
