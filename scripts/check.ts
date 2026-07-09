import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.preview' });
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { getConfig } from '../src/config.js';
import { MidnightWalletProvider, syncWallet } from '../src/wallet.js';
import pino from 'pino';
import * as Rx from 'rxjs';

const logger = pino({ level: 'info' });

async function main() {
  const config = getConfig();
  setNetworkId(config.networkId);
  const secret = process.env.MIDNIGHT_PREVIEW_MNEMONIC;
  
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

  const provider = await MidnightWalletProvider.build(logger, envConfig, { kind: 'mnemonic', value: secret! });
  await provider.wallet.start();
  
  console.log("Syncing...");
  await syncWallet(logger, provider.wallet, 300_000);
  
  const state = await Rx.firstValueFrom(provider.wallet.state().pipe(Rx.filter(s => s.isSynced)));
  console.log('Unshielded coins:', state.unshielded.availableCoins);
  console.log('Unshielded balance:', state.unshielded.balances);
  console.log('Shielded balance:', state.shielded.state.balances);
  console.log('DUST balance:', state.dust.balance(new Date()));
  console.log('Unshielded Address:', provider.unshieldedKeystore.getPublicKey().toAddress(config.networkId));
  
  await provider.wallet.stop();
}

main().catch(console.error);
