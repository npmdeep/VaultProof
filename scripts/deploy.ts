import * as dotenv from 'dotenv';
dotenv.config({ path: `.env.${process.env['MIDNIGHT_NETWORK'] ?? 'local'}` });
import pino from 'pino';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { deployContract, type DeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import type { EnvironmentConfiguration } from '@midnight-ntwrk/testkit-js';
import { getConfig } from '../src/config.js';
import { MidnightWalletProvider, syncWallet, type WalletSecret } from '../src/wallet.js';
import { buildProviders } from '../src/providers.js';
import { CompiledVotingContract, Contract, zkConfigPath } from '../contracts/index.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Rx from 'rxjs';

const logger = pino({
  level: process.env['LOG_LEVEL'] ?? 'info',
  transport: { target: 'pino-pretty' },
});

const network = process.env['MIDNIGHT_NETWORK'] ?? 'local';
const PRIVATE_STATE_ID = 'DeployerVotingState';

// Admin secret for the poll — in production this would be securely managed
const ADMIN_SECRET = '0000000000000000000000000000000000000000000000000000000000000099';

function resolveSecret(net: string): WalletSecret {
  const upper = net.toUpperCase();
  const mnemonicEnv = `MIDNIGHT_${upper}_MNEMONIC`;
  const seedEnv = `MIDNIGHT_${upper}_SEED`;
  const mnemonic = process.env[mnemonicEnv]?.trim().replace(/\s+/g, ' ');
  const seedHex = process.env[seedEnv]?.trim();

  if (mnemonic && seedHex) {
    throw new Error(`Set only one of ${mnemonicEnv} or ${seedEnv} (both are defined).`);
  }
  if (mnemonic) {
    return { kind: 'mnemonic', value: mnemonic };
  }
  if (seedHex) {
    if (!/^[0-9a-fA-F]+$/.test(seedHex) || seedHex.length % 2 !== 0) {
      throw new Error(`${seedEnv} must be a hex string of even length (no 0x prefix).`);
    }
    return { kind: 'seed', value: seedHex };
  }
  throw new Error(
    `Either ${mnemonicEnv} or ${seedEnv} is required for network '${net}'. Set one in environment or .env.${net} file.`
  );
}

function deriveAdminKey(seedHex: string): Uint8Array {
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(seedHex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

async function main() {
  const config = getConfig();
  setNetworkId(config.networkId);
  const secret = resolveSecret(network);
  
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

  logger.info(`Connecting and syncing wallet on ${network}...`);
  const wallet = await MidnightWalletProvider.build(logger, envConfig, secret);
  
  await wallet.start();

  try {
    const syncTimeoutMs = 30 * 60_000;
    await syncWallet(logger, wallet.wallet, syncTimeoutMs);

    logger.info('Checking for DUST...');
    const state = await Rx.firstValueFrom(wallet.wallet.state().pipe(Rx.filter((s) => s.isSynced)));
    if (state.dust.availableCoins.length === 0) {
      logger.info('No DUST found. Registering NIGHT UTXOs for DUST generation...');
      const nightUtxos = state.unshielded.availableCoins.filter(
        (coin: any) => coin.meta?.registeredForDustGeneration !== true,
      );

      if (nightUtxos.length > 0) {
        const recipe = await wallet.wallet.registerNightUtxosForDustGeneration(
          nightUtxos,
          wallet.unshieldedKeystore.getPublicKey(),
          (payload) => wallet.unshieldedKeystore.signData(payload),
        );
        const finalized = await wallet.wallet.finalizeRecipe(recipe);
        await wallet.wallet.submitTransaction(finalized);
        logger.info('Transaction submitted. Waiting for DUST...');
      } else {
        logger.info('No unregistered NIGHT UTXOs found. Waiting for DUST anyway...');
      }

      await Rx.firstValueFrom(
        wallet.wallet.state().pipe(
          Rx.throttleTime(5_000),
          Rx.filter((s) => s.isSynced),
          Rx.filter((s) => s.dust.balance(new Date()) > 0n),
        ),
      );
      logger.info('DUST is now available.');
    } else {
      logger.info(`DUST already available: ${state.dust.balance(new Date())}`);
    }

    logger.info('Building providers...');
    const providers = buildProviders(wallet, zkConfigPath, config);

    const adminKeyBytes = deriveAdminKey(ADMIN_SECRET);
    
    logger.info(`Deploying VaultProof Voting Contract to ${network}...`);
    const deployed = await deployContract<Contract>(providers, {
      compiledContract: CompiledVotingContract,
      privateStateId: PRIVATE_STATE_ID,
      initialPrivateState: {
        adminSecret: adminKeyBytes,
      },
      args: [adminKeyBytes],
    });

    const address = deployed.deployTxData.public.contractAddress;
    logger.info(`SUCCESS! Contract deployed at: ${address}`);

    // Save deployed address for frontend use
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const outputDir = path.resolve(currentDir, '..', 'contracts', 'managed');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(path.resolve(outputDir, `${network}-address.txt`), address);
    logger.info(`Saved address to contracts/managed/${network}-address.txt`);
  } catch (err: any) {
    logger.error(`Deployment failed: ${err.message || err}`);
  } finally {
    await wallet.stop();
  }
}

main().catch((err) => {
  logger.error(err);
  process.exitCode = 1;
});
