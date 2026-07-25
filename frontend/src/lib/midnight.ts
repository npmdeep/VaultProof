import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { ContractState } from '@midnight-ntwrk/compact-runtime';
import type { MidnightProvider, WalletProvider } from '@midnight-ntwrk/midnight-js-types';

// ---------------------------------------------------------------------------
// Hex helpers — never skip padStart
// ---------------------------------------------------------------------------
export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function fromHex(hex: string): Uint8Array {
  const normalized = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (normalized.length % 2 !== 0) throw new Error('Invalid hex string from wallet.');
  const bytes = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < normalized.length; i += 2) {
    bytes[i / 2] = parseInt(normalized.slice(i, i + 2), 16);
  }
  return bytes;
}

// ---------------------------------------------------------------------------
// Patched Public Data Provider
// Fixes the `offset: null` GraphQL bug on preprod/preview indexers.
// ---------------------------------------------------------------------------
export function createPatchedPublicDataProvider(queryUrl: string, subscriptionUrl: string) {
  const base = indexerPublicDataProvider(queryUrl, subscriptionUrl);

  async function queryLatest(query: string, address: string) {
    const res = await fetch(queryUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query, variables: { address } }),
    });
    if (!res.ok) throw new Error(`Indexer HTTP error: ${res.status}`);
    const payload = await res.json();
    if (payload.errors?.length) throw new Error(payload.errors.map((e: any) => e.message).join('; '));
    return payload.data?.contractAction ?? null;
  }

  return {
    ...base,
    async queryContractState(contractAddress: string, config?: any) {
      if (config) return base.queryContractState(contractAddress, config);
      const action = await queryLatest(
        `query LATEST_CONTRACT_STATE($address: HexEncoded!) {
          contractAction(address: $address) { state }
        }`,
        contractAddress,
      );
      return action ? ContractState.deserialize(fromHex(action.state)) : null;
    },
  };
}

// ---------------------------------------------------------------------------
// In-memory Private State Provider
// ---------------------------------------------------------------------------
export function createPrivateStateProvider() {
  let scope = '';
  const stateStore = new Map<string, unknown>();
  const signingKeyStore = new Map<string, unknown>();
  const key = (id: string) => `${scope}:${id}`;

  return {
    setContractAddress(address: string) { scope = address; },
    async set(id: string, state: unknown) { stateStore.set(key(id), state); },
    async get(id: string) { return stateStore.get(key(id)) ?? null; },
    async remove(id: string) { stateStore.delete(key(id)); },
    async clear() { stateStore.clear(); },
    async setSigningKey(addr: string, k: unknown) { signingKeyStore.set(addr, k); },
    async getSigningKey(addr: string) { return signingKeyStore.get(addr) ?? null; },
    async removeSigningKey(addr: string) { signingKeyStore.delete(addr); },
    async clearSigningKeys() { signingKeyStore.clear(); },
    async exportPrivateStates(): Promise<never> { throw new Error('Not implemented.'); },
    async importPrivateStates(): Promise<never> { throw new Error('Not implemented.'); },
    async exportSigningKeys(): Promise<never> { throw new Error('Not implemented.'); },
    async importSigningKeys(): Promise<never> { throw new Error('Not implemented.'); },
  };
}

// ---------------------------------------------------------------------------
// Connected Session Type
// ---------------------------------------------------------------------------
export type ConnectedSession = {
  api: any;
  config: any;
  providers: {
    privateStateProvider: ReturnType<typeof createPrivateStateProvider>;
    publicDataProvider: ReturnType<typeof createPatchedPublicDataProvider>;
    zkConfigProvider: FetchZkConfigProvider;
    proofProvider: { proveTx: (unprovenTx: any, _config: any) => Promise<any> };
    walletProvider: WalletProvider;
    midnightProvider: MidnightProvider;
  };
  unshieldedAddress: string;
};

// ---------------------------------------------------------------------------
// Main session factory — call after wallet.connect()
// ---------------------------------------------------------------------------
export async function createConnectedSession(api: any): Promise<ConnectedSession> {
  console.log('[createConnectedSession] Step 1: Getting configuration...');
  let config: any;
  try {
    config = await api.getConfiguration();
    console.log('[createConnectedSession] Config retrieved:', config);
  } catch (err) {
    console.warn('[createConnectedSession] api.getConfiguration() failed, using preprod defaults:', err);
    config = {
      networkId: 'preview',
      indexerUri: 'https://indexer.preview.midnight.network/api/v4/graphql',
      indexerWsUri: 'wss://indexer.preview.midnight.network/api/v4/graphql/ws',
      substrateNodeUri: 'https://rpc.preview.midnight.network',
    };
  }

  console.log('[createConnectedSession] Step 2: Getting unshielded address...');
  let unshieldedAddr: any = null;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      unshieldedAddr = await api.getUnshieldedAddress();
      if (unshieldedAddr?.unshieldedAddress) break;
    } catch (e: any) {
      console.warn(`[createConnectedSession] getUnshieldedAddress attempt ${attempt}/5 failed:`, e);
      if (attempt === 5) throw e;
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  console.log('[createConnectedSession] Unshielded address retrieved:', unshieldedAddr);
  
  let shieldedAddress = { shieldedCoinPublicKey: '0'.repeat(64), shieldedEncryptionPublicKey: '0'.repeat(64) };
  try {
    console.log('[createConnectedSession] Step 3: Getting shielded addresses...');
    shieldedAddress = await api.getShieldedAddresses();
    console.log('[createConnectedSession] Shielded addresses retrieved');
  } catch (e) {
    console.warn('[createConnectedSession] api.getShieldedAddresses() unavailable, proceeding with unshielded fallback:', e);
  }

  // Must be called before any SDK operations
  setNetworkId(config.networkId || 'preview');

  // ZK assets are served from /managed relative to origin
  const zkConfigProvider = new FetchZkConfigProvider(
    new URL('/managed', window.location.origin).toString(),
    window.fetch.bind(window),
  );

  let provingProvider: any;
  try {
    console.log('[createConnectedSession] Step 4: Getting proving provider...');
    provingProvider = await api.getProvingProvider(zkConfigProvider);
    console.log('[createConnectedSession] Proving provider retrieved');
  } catch (e) {
    console.warn('[createConnectedSession] api.getProvingProvider() unavailable:', e);
  }

  // Use direct unprovenTx.prove() — do NOT use createProofProvider()
  const proofProvider = {
    async proveTx(unprovenTx: any, _config: any) {
      if (!provingProvider) {
        throw new Error('Proving provider is not supported by your wallet connection.');
      }
      const { CostModel } = await import('@midnight-ntwrk/ledger-v8');
      return unprovenTx.prove(provingProvider, CostModel.initialCostModel());
    },
  };

  const walletProvider: WalletProvider = {
    getCoinPublicKey: () => shieldedAddress.shieldedCoinPublicKey,
    getEncryptionPublicKey: () => shieldedAddress.shieldedEncryptionPublicKey,
    balanceTx: async (tx: any) => {
      const txHex = toHex(tx.serialize());
      const balanced = await api.balanceUnsealedTransaction(txHex);
      if (!balanced?.tx) throw new Error('balanceUnsealedTransaction returned invalid result');
      const { Transaction } = await import('@midnight-ntwrk/ledger-v8');
      return Transaction.deserialize('signature', 'proof', 'binding', fromHex(balanced.tx));
    },
  };

  const midnightProvider: MidnightProvider = {
    submitTx: async (tx: any) => {
      const txHex = toHex(tx.serialize());
      const result = await api.submitTransaction(txHex);
      if (typeof result === 'string' && result) return result;
      if (result?.transactionId) return result.transactionId;
      if (result?.id) return result.id;
      return txHex.slice(0, 64);
    },
  };

  const publicDataProvider = createPatchedPublicDataProvider(config.indexerUri, config.indexerWsUri);

  return {
    api,
    config,
    providers: {
      privateStateProvider: createPrivateStateProvider(),
      publicDataProvider,
      zkConfigProvider,
      proofProvider,
      walletProvider,
      midnightProvider,
    },
    unshieldedAddress: unshieldedAddr.unshieldedAddress,
  };
}

// ---------------------------------------------------------------------------
// Polling helpers
// ---------------------------------------------------------------------------
export async function waitForContractDeployment(
  publicDataProvider: ReturnType<typeof createPatchedPublicDataProvider>,
  contractAddress: string,
  pollIntervalMs = 2000,
  maxAttempts = 45,
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    const state = await publicDataProvider.queryContractState(contractAddress);
    if (state?.data) return;
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }
  throw new Error(`Contract not indexed after ${maxAttempts * pollIntervalMs}ms — check address or indexer lag`);
}
