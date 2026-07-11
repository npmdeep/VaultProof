// Frontend configuration for VaultProof
export const config = {
  // Contract address on Midnight Preprod — set via env or after deploy
  contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS ?? '',
  
  // Midnight Preprod infrastructure
  indexer: import.meta.env.VITE_INDEXER_URL ?? 'https://indexer.preprod.midnight.network/api/v1/graphql',
  indexerWS: import.meta.env.VITE_INDEXER_WS_URL ?? 'wss://indexer.preprod.midnight.network/api/v1/graphql/ws',
  node: import.meta.env.VITE_NODE_URL ?? 'https://rpc.preprod.midnight.network',
  proofServer: import.meta.env.VITE_PROOF_SERVER_URL ?? 'https://bsp.preprod.midnight.network',
  networkId: import.meta.env.VITE_NETWORK_ID ?? 'preprod',
};
