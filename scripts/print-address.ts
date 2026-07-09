import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.preview' });
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { unshieldedAddress } from '@midnight-ntwrk/wallet-sdk-address-format';
import { getConfig } from '../src/config.js';
import { MidnightWalletProvider, type WalletSecret } from '../src/wallet.js';
import pino from 'pino';

const logger = pino({ level: 'info' });
const network = 'preview';

function resolveSecret(net: string): WalletSecret {
  const mnemonic = process.env[`MIDNIGHT_${net.toUpperCase()}_MNEMONIC`]?.trim().replace(/\s+/g, ' ');
  if (mnemonic) return { kind: 'mnemonic', value: mnemonic };
  throw new Error('No mnemonic');
}

async function main() {
  const config = getConfig();
  setNetworkId(config.networkId);
  const secret = resolveSecret(network);
  const envConfig = {
    walletNetworkId: config.networkId,
    networkId: config.networkId,
    indexer: config.indexer,
    indexerWS: config.indexerWS,
    node: config.node,
    nodeWS: config.nodeWS,
    faucet: config.faucet,
    proofServer: config.proofServer,
  };

  const provider = await MidnightWalletProvider.build(logger, envConfig, secret);
  
  const address = unshieldedAddress(config.networkId, provider.unshieldedKeystore.getPublicKey());
  console.log('\n========================================');
  console.log('UNSHIELDED_ADDRESS=' + address);
  console.log('========================================\n');
  
  process.exit(0);
}

main().catch(console.error);
