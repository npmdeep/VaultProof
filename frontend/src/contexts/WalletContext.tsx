import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
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

      // Try preferred network first, then fall back to preview/preprod/undeployed if network ID mismatches
      const candidateNetworks = Array.from(new Set([network, 'preview', 'preprod', 'undeployed']));
      let api: any = null;
      let lastErr: any = null;

      for (const net of candidateNetworks) {
        try {
          api = await wallet.connect(net);
          console.log(`Wallet authorized successfully on network '${net}', initializing session...`);
          break;
        } catch (err: any) {
          lastErr = err;
          const reason = String(err?.reason || err?.message || err);
          if (reason.includes('Network ID mismatch')) {
            console.warn(`Wallet is not set to '${net}', trying next candidate network...`);
            continue;
          }
          throw err;
        }
      }

      if (!api) throw lastErr;

      const sess = await createConnectedSession(api);
      setSession(sess);
      setAddress(sess.unshieldedAddress);
      setIsConnected(true);
      return sess;
    } catch (err: any) {
      console.error('Wallet connection error stack:', err);
      const msg = err?.message || String(err);
      if (msg.includes('syncing')) {
        alert('1AM Wallet is currently syncing with the network. Please open your 1AM extension popup, wait for sync to complete (100%), and try connecting again.');
      } else if (msg.includes('locked') || String(err?.reason || '').includes('locked')) {
        alert('Your wallet is locked! Please open your Lace wallet extension, enter your passcode to unlock it, and try connecting again.');
      } else {
        console.error('Wallet connection error:', err);
      }
      throw err;
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
    // Re-poll for wallet after disconnect
    const startedAt = Date.now();
    const id = setInterval(() => {
      const w1am = (window as any).midnight?.['1am'];
      const wLace = (window as any).midnight?.mnLace;
      if (w1am) { setWalletType('1am'); setWalletStatus('detected'); clearInterval(id); return; }
      if (wLace) { setWalletType('lace'); setWalletStatus('detected'); clearInterval(id); return; }
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
