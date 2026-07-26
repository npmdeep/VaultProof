import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  useEffect,
} from 'react';
import { createConnectedSession, type ConnectedSession } from '../lib/midnight';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type WalletType = '1am' | 'lace' | null;
type WalletStatus = 'checking' | 'detected' | 'not-found';

type WalletContextType = {
  address: string | null;
  isConnected: boolean;
  walletType: WalletType;
  isConnecting: boolean;
  walletStatus: WalletStatus;
  session: ConnectedSession | null;
  state: 'disconnected' | 'connecting' | 'connected';
  connect: (network?: string) => Promise<ConnectedSession | undefined>;
  disconnect: () => void;
};

// ---------------------------------------------------------------------------
// Helpers: enumerate wallets from window.midnight using Object.values()
// Wallets inject under UUID keys — never hardcode 'mnLace' or '1am'.
// ---------------------------------------------------------------------------
function listWallets(): any[] {
  const injected = (window as any).midnight;
  return injected ? Object.values(injected) : [];
}

function detectWalletType(wallet: any): '1am' | 'lace' {
  const name = String(wallet?.name ?? '').toLowerCase();
  if (name.includes('1am')) return '1am';
  return 'lace';
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const WalletContext = createContext<WalletContextType | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [walletType, setWalletType] = useState<WalletType>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletStatus, setWalletStatus] = useState<WalletStatus>('checking');
  const [session, setSession] = useState<ConnectedSession | null>(null);
  const connectingRef = useRef(false);

  // Poll for wallet injection — runs once on mount
  useEffect(() => {
    const startedAt = Date.now();
    const id = setInterval(() => {
      const wallets = listWallets();
      if (wallets.length > 0) {
        setWalletType(detectWalletType(wallets[0]));
        setWalletStatus('detected');
        clearInterval(id);
        return;
      }
      if (Date.now() - startedAt >= 6000) {
        setWalletStatus('not-found');
        clearInterval(id);
      }
    }, 300);
    return () => clearInterval(id);
  }, []);

  const connect = useCallback(async (network = 'preview') => {
    if (connectingRef.current) return;
    connectingRef.current = true;
    setIsConnecting(true);
    try {
      const wallets = listWallets();
      const wallet = wallets[0];
      if (!wallet) throw new Error('No wallet found. Please install a Midnight wallet extension.');

      console.log(`[wallet] Found wallet: ${wallet.name}, connecting to '${network}'...`);
      const api = await wallet.connect(network);
      console.log(`[wallet] connect() resolved`);

      // Check connection status before querying addresses
      try {
        const status = await api.getConnectionStatus();
        console.log('[wallet] Connection status:', status);
        if (status?.status !== 'connected') {
          throw new Error(`Wallet status is '${status?.status}'. Please wait for it to finish syncing.`);
        }
      } catch (statusErr: any) {
        // Some wallets don't implement getConnectionStatus — continue anyway
        console.warn('[wallet] getConnectionStatus not available, continuing...');
      }

      const sess = await createConnectedSession(api);
      setSession(sess);
      setAddress(sess.unshieldedAddress);
      setWalletType(detectWalletType(wallet));
      setIsConnected(true);
      return sess;
    } catch (err: any) {
      console.error('Wallet connection error:', err);
      const reason = String(err?.reason || err?.message || err);

      if (reason.includes('Network ID mismatch') || reason.includes('network')) {
        alert(
          `Your wallet is set to a different network than '${network}'.\n\n` +
          'Please open your wallet extension, go to Settings → Network, ' +
          'and switch to the correct network (Preview or Preprod), then try again.'
        );
      } else if (reason.includes('unavailable') || reason.includes('syncing')) {
        alert(
          'Wallet is still syncing. Please:\n\n' +
          '1. Open your wallet extension popup\n' +
          '2. Wait until the loading/sync indicator stops\n' +
          '3. Then click Connect Wallet again'
        );
      } else if (reason.includes('locked')) {
        alert('Wallet is locked. Please unlock it first and try again.');
      } else {
        alert('Wallet connection failed: ' + reason);
      }
    } finally {
      connectingRef.current = false;
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setIsConnected(false);
    setSession(null);
    setWalletStatus('checking');
    setWalletType(null);
    // Re-detect wallet after disconnect
    const startedAt = Date.now();
    const id = setInterval(() => {
      const wallets = listWallets();
      if (wallets.length > 0) {
        setWalletType(detectWalletType(wallets[0]));
        setWalletStatus('detected');
        clearInterval(id);
        return;
      }
      if (Date.now() - startedAt >= 3000) { setWalletStatus('not-found'); clearInterval(id); }
    }, 200);
  }, []);

  const state = isConnecting ? 'connecting' : isConnected ? 'connected' : 'disconnected';

  return (
    <WalletContext.Provider
      value={{
        address,
        isConnected,
        walletType,
        isConnecting,
        walletStatus,
        session,
        state,
        connect,
        disconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useWallet(): WalletContextType {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within a WalletProvider');
  return ctx;
}
