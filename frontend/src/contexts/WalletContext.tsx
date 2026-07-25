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
  connectManual: (addr: string) => void;
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

      // Try preferred network first, then fall back if network ID mismatches
      const candidateNetworks = Array.from(new Set([network, 'preview', 'preprod', 'undeployed']));
      let api: any = null;
      let connectedNetwork = '';

      for (const net of candidateNetworks) {
        try {
          api = await wallet.connect(net);
          connectedNetwork = net;
          console.log(`Wallet authorized on network '${net}'`);
          break;
        } catch (err: any) {
          const reason = String(err?.reason || err?.message || err);
          if (reason.includes('Network ID mismatch')) {
            console.warn(`Network '${net}' mismatched, trying next...`);
            continue;
          }
          throw err;
        }
      }

      if (!api) throw new Error('Could not connect to wallet on any network.');

      // Try full session first
      try {
        const sess = await createConnectedSession(api);
        setSession(sess);
        setAddress(sess.unshieldedAddress);
        setIsConnected(true);
        return sess;
      } catch (sessionErr: any) {
        const reason = String(sessionErr?.reason || sessionErr?.message || sessionErr);
        console.warn('Full session creation failed:', reason);

        // If wallet is "unavailable" (still syncing), fall back to lite mode
        if (reason.includes('unavailable') || reason.includes('locked')) {
          // Prompt user for their address since wallet can't serve it right now
          const manualAddr = prompt(
            'Your wallet is still syncing with the Midnight network and cannot serve requests yet.\n\n' +
            'To proceed in demo mode, paste your unshielded wallet address below.\n' +
            '(You can find it in your Lace wallet under Receive > Unshielded Address)',
          );
          if (manualAddr && manualAddr.trim().length > 10) {
            setAddress(manualAddr.trim());
            setIsConnected(true);
            setSession(null); // No full session, but UI works
            return undefined;
          }
          throw new Error('Wallet is still syncing. Please wait for the sync to complete and try again.');
        }
        throw sessionErr;
      }
    } catch (err: any) {
      console.error('Wallet connection error:', err);
      const msg = String(err?.reason || err?.message || err);
      if (msg.includes('syncing')) {
        alert('Wallet is syncing. Please wait for sync to complete and try again.');
      } else if (msg.includes('unavailable')) {
        alert('Wallet is still syncing with the Midnight network. Please wait for the sync indicator in your wallet to finish, then try again.');
      } else if (msg.includes('locked')) {
        alert('Wallet is locked. Please unlock it and try again.');
      }
      // Don't re-throw — just fail silently after alert
    } finally {
      connectingRef.current = false;
      setIsConnecting(false);
    }
  }, []);

  const connectManual = useCallback((addr: string) => {
    setAddress(addr);
    setIsConnected(true);
    setWalletType('lace');
    setSession(null);
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
        connectManual,
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
