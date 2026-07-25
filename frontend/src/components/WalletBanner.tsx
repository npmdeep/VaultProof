import React from 'react';
import { useWallet } from '../contexts/WalletContext';

export default function WalletBanner() {
  const { address, isConnected, walletType, walletStatus, isConnecting, connect, connectManual, disconnect } = useWallet();

  if (walletStatus === 'checking') {
    return (
      <div className="wallet-pill loading">
        <span className="spinner-small"></span>
        <span>Detecting wallet...</span>
      </div>
    );
  }

  if (isConnected && address) {
    return (
      <div className="wallet-pill connected">
        <div className="status-dot connected"></div>
        <div className="wallet-pill-info">
          <div className="wallet-pill-type">{walletType === '1am' ? '1AM' : 'Lace'}</div>
          <div className="wallet-pill-address">{address.slice(0, 8)}…{address.slice(-6)}</div>
        </div>
        <button className="btn-icon" onClick={disconnect} title="Disconnect Wallet">
          ✕
        </button>
      </div>
    );
  }

  const handleConnect = async () => {
    try {
      await connect('preprod');
    } catch {
      // Error already handled inside connect()
    }
  };

  const handleManualConnect = () => {
    const addr = prompt(
      'Enter your Midnight unshielded wallet address:\n\n' +
      '(Open your Lace wallet → Click Receive → Copy the Unshielded Address)'
    );
    if (addr && addr.trim().length > 10) {
      connectManual(addr.trim());
    }
  };

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <button
        className="btn btn-primary btn-sm"
        onClick={handleConnect}
        disabled={isConnecting || walletStatus === 'not-found'}
      >
        {isConnecting ? (
          <>
            <span className="spinner-small"></span>
            Connecting
          </>
        ) : (
          'Connect Wallet'
        )}
      </button>
      {walletStatus === 'not-found' && (
        <button
          className="btn btn-sm"
          onClick={handleManualConnect}
          style={{ opacity: 0.8, fontSize: '0.75rem' }}
        >
          Enter Address
        </button>
      )}
    </div>
  );
}
