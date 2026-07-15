import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WebSocket } from 'ws';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import {
  deployContract,
  submitCallTx,
  type DeployedContract,
} from '@midnight-ntwrk/midnight-js-contracts';
import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import {
  type EnvironmentConfiguration,
  waitForFunds,
} from '@midnight-ntwrk/testkit-js';
import pino from 'pino';

import { getConfig } from '../config.js';
import {
  MidnightWalletProvider,
  syncWallet,
  type WalletSecret,
} from '../wallet.js';
import { buildProviders, type VotingProviders } from '../providers.js';
import {
  CompiledVotingContract,
  Contract,
  ledger,
  zkConfigPath,
} from '../../contracts/index.js';

// Required for GraphQL subscriptions in Node.js
// @ts-expect-error WebSocket global assignment for apollo
globalThis.WebSocket = WebSocket;

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:', reason);
  console.error('Promise:', promise);
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

const ALICE_LOCAL_SEED =
  '0000000000000000000000000000000000000000000000000000000000000001';
const PRIVATE_STATE_ID = 'AlicePrivateVotingState';

const logger = pino({
  level: process.env['LOG_LEVEL'] ?? 'info',
  transport: { target: 'pino-pretty' },
});

const network = process.env['MIDNIGHT_NETWORK'] ?? 'local';

function resolveSecret(net: string): WalletSecret {
  if (net === 'local') return { kind: 'seed', value: ALICE_LOCAL_SEED };

  const upper = net.toUpperCase();
  const mnemonicEnv = `MIDNIGHT_${upper}_MNEMONIC`;
  const seedEnv = `MIDNIGHT_${upper}_SEED`;
  const mnemonic = process.env[mnemonicEnv]?.trim().replace(/\s+/g, ' ');
  const seedHex = process.env[seedEnv]?.trim();

  if (mnemonic && seedHex) {
    throw new Error(
      `Set only one of ${mnemonicEnv} or ${seedEnv} (both are defined).`,
    );
  }
  if (mnemonic) {
    return { kind: 'mnemonic', value: mnemonic };
  }
  if (seedHex) {
    if (!/^[0-9a-fA-F]+$/.test(seedHex) || seedHex.length % 2 !== 0) {
      throw new Error(
        `${seedEnv} must be a hex string of even length (no 0x prefix).`,
      );
    }
    return { kind: 'seed', value: seedHex };
  }
  throw new Error(
    `Either ${mnemonicEnv} or ${seedEnv} is required for network '${net}'. ` +
      `Set one in .env.${net} or the shell.`,
  );
}

// Derive the admin public key the same way the contract does
function deriveAdminKey(seedHex: string): Uint8Array {
  // For testing we use a deterministic admin key derived from a fixed seed
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(seedHex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

const ADMIN_SECRET = '0000000000000000000000000000000000000000000000000000000000000099';

describe(`Voting Contract (${network})`, () => {
  let wallet: MidnightWalletProvider;
  let providers: VotingProviders;
  let contractAddress: ContractAddress;

  const config = getConfig();
  const secret = resolveSecret(network);
  const isRemote = config.faucet !== '';
  const syncTimeoutMs = Number(
    process.env['MIDNIGHT_SYNC_TIMEOUT_MS'] ??
      (isRemote ? 60 * 60_000 : 10 * 60_000),
  );

  async function queryLedger(p: VotingProviders) {
    const state = await p.publicDataProvider.queryContractState(contractAddress);
    expect(state).not.toBeNull();
    return ledger(state!.data);
  }

  beforeAll(async () => {
    setNetworkId(config.networkId);

    const envConfig: EnvironmentConfiguration = {
      walletNetworkId: config.networkId,
      networkId: config.networkId,
      indexer: config.indexer,
      indexerWS: config.indexerWS,
      node: config.node,
      nodeWS: config.nodeWS,
      faucet: config.faucet,
      proofServer: config.proofServer,
    };

    wallet = await MidnightWalletProvider.build(logger, envConfig, secret);
    await wallet.start();
    await syncWallet(logger, wallet.wallet, syncTimeoutMs);

    if (isRemote) {
      const nightBalance = await waitForFunds(
        wallet.wallet,
        envConfig,
        true,
        wallet.unshieldedKeystore,
      );
      logger.info(`Wallet NIGHT balance on '${network}': ${nightBalance}`);
    }

    providers = buildProviders(wallet, zkConfigPath, config);
    logger.info(`Providers initialized on '${network}'. Ready to test!`);
  });

  afterAll(async () => {
    if (wallet) {
      logger.info('Stopping wallet...');
      await wallet.stop();
    }
  });

  it('Deploys the voting contract', async () => {
    logger.info('Deploying Voting Contract...');

    const adminKeyBytes = deriveAdminKey(ADMIN_SECRET);

    const deployed: DeployedContract<Contract> =
      await (deployContract<Contract>)(providers, {
        compiledContract: CompiledVotingContract,
        privateStateId: PRIVATE_STATE_ID,
        initialPrivateState: {
          adminSecret: () => adminKeyBytes,
        },
        args: [adminKeyBytes],
      });

    contractAddress = deployed.deployTxData.public.contractAddress;
    logger.info(`Contract deployed at: ${contractAddress}`);
    expect(contractAddress).toBeDefined();

    const state = await queryLedger(providers);
    expect(state.is_open).toEqual(true);
  });

  it('Casts a Yes vote successfully', async () => {
    logger.info('Casting a Yes vote...');

    await (submitCallTx<Contract, 'cast_vote'>)(providers, {
      compiledContract: CompiledVotingContract,
      contractAddress,
      privateStateId: PRIVATE_STATE_ID,
      circuitId: 'cast_vote',
      args: [1n],
    });

    logger.info('Yes vote cast successfully.');
  });

  it('Casts a No vote successfully', async () => {
    logger.info('Casting a No vote...');

    await (submitCallTx<Contract, 'cast_vote'>)(providers, {
      compiledContract: CompiledVotingContract,
      contractAddress,
      privateStateId: PRIVATE_STATE_ID,
      circuitId: 'cast_vote',
      args: [0n],
    });

    logger.info('No vote cast successfully.');
  });

  it('Rejects an invalid vote choice', async () => {
    logger.info('Attempting invalid vote choice (2)...');

    await expect(
      (submitCallTx<Contract, 'cast_vote'>)(providers, {
        compiledContract: CompiledVotingContract,
        contractAddress,
        privateStateId: PRIVATE_STATE_ID,
        circuitId: 'cast_vote',
        args: [2n],
      })
    ).rejects.toThrow();

    logger.info('Invalid vote rejected as expected.');
  });

  it('Verifies vote tallies are correct', async () => {
    logger.info('Checking vote tallies...');

    const state = await queryLedger(providers);
    // After 1 Yes + 1 No vote
    expect(state.total_votes).toEqual(2n);
    logger.info(`Tallies — total: ${state.total_votes}`);
  });

  it('Admin closes the poll', async () => {
    logger.info('Admin closing poll...');

    const adminKeyBytes = deriveAdminKey(ADMIN_SECRET);

    await (submitCallTx<Contract, 'close_poll'>)(providers, {
      compiledContract: CompiledVotingContract,
      contractAddress,
      privateStateId: PRIVATE_STATE_ID,
      circuitId: 'close_poll',
      args: [],
    });

    const state = await queryLedger(providers);
    expect(state.is_open).toEqual(false);
    logger.info('Poll closed successfully.');
  });

  it('Rejects votes after poll is closed', async () => {
    logger.info('Attempting vote on closed poll...');

    await expect(
      (submitCallTx<Contract, 'cast_vote'>)(providers, {
        compiledContract: CompiledVotingContract,
        contractAddress,
        privateStateId: PRIVATE_STATE_ID,
        circuitId: 'cast_vote',
        args: [1n],
      })
    ).rejects.toThrow();

    logger.info('Vote on closed poll rejected as expected.');
  });
});
