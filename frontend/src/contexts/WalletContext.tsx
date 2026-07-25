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
  connect: (network?: string) => Promise<ConnectedSession | undefined>;
  disconnect: () => void;
};

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
      const injected = (window as any).midnight;
      if (injected) {
        const wallets = Object.values(injected);
        if (wallets.length > 0) {
          const wallet: any = wallets[0];
          setWalletType(wallet.name?.toLowerCase().includes('1am') ? '1am' : 'lace');
          setWalletStatus('detected');
          clearInterval(id);
          return;
        }
      }
      if (Date.now() - startedAt >= 6000) {
        setWalletStatus('not-found');
        clearInterval(id);
      }
    }, 300);
    return () => clearInterval(id);
  }, []);

  const connect = useCallback(async (network = 'preprod') => {
    if (connectingRef.current) return;
    connectingRef.current = true;
    setIsConnecting(true);
    try {
      const injected = (window as any).midnight;
      const wallets = injected ? Object.values(injected) : [];
      const wallet: any = wallets[0];

      if (!wallet) throw new Error('No wallet found. Please install a Midnight wallet.');

      // CRITICAL: Call connect() exactly ONCE. Multiple connect() calls corrupt
      // Lace's internal message bridge, causing all subsequent API calls to fail
      // with "Wallet is unavailable".
      let api: any;
      try {
        api = await wallet.connect(network);
      } catch (connectErr: any) {
        const r = String(connectErr?.reason || connectErr?.message || '');
        // If network mismatch, try the other common network ONCE
        if (r.includes('Network ID mismatch')) {
          const fallback = network === 'preprod' ? 'preview' : 'preprod';
          console.log(`Network '${network}' mismatched, trying '${fallback}'...`);
          api = await wallet.connect(fallback);
        } else {
          throw connectErr;
        }
      }
      console.log(`Wallet connected on network '${network}'`);

      const sess = await createConnectedSession(api);
      setSession(sess);
      setAddress(sess.unshieldedAddress);
      setIsConnected(true);
      return sess;
    } catch (err: any) {
      console.error('Wallet connection error:', err);
      const reason = String(err?.reason || err?.message || err);

      if (reason.includes('Network ID mismatch')) {
        alert(
          `Your wallet is set to a different network than '${network}'.\n\n` +
          'Please open your wallet extension, go to Settings → Network, ' +
          'and switch to the correct network (Preview or Preprod), then try again.'
        );
      } else if (reason.includes('syncing')) {
        alert('Wallet is syncing with the network. Please wait for sync to complete and try again.');
      } else if (reason.includes('unavailable')) {
        alert(
          'Wallet is still initializing. Please:\n\n' +
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
    const startedAt = Date.now();
    const id = setInterval(() => {
      const injected = (window as any).midnight;
      if (injected) {
        const wallets = Object.values(injected);
        if (wallets.length > 0) {
          const wallet: any = wallets[0];
          setWalletType(wallet.name?.toLowerCase().includes('1am') ? '1am' : 'lace');
          setWalletStatus('detected');
          clearInterval(id);
          return;
        }
      }
      if (Date.now() - startedAt >= 3000) { setWalletStatus('not-found'); clearInterval(id); }
    }, 200);
  }, []);

  return (
    <WalletContext.Provider
      value={{
        address,
        isConnected,
        walletType,
        isConnecting,
        walletStatus,
        session,
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
