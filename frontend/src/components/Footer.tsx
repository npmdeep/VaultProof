import { Link } from 'react-router-dom';
import { config } from '../config';

const VaultProofLogo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 7V5a4 4 0 0 0-8 0v2" />
    <line x1="12" y1="11" x2="12" y2="15" />
    <line x1="10" y1="13" x2="14" y2="13" />
  </svg>
);

export default function Footer() {
  return (
    <footer className="footer" id="main-footer">
      <div className="footer-grid">
        <div className="footer-brand">
          <div className="footer-brand-name">
            <VaultProofLogo />
            VaultProof
          </div>
          <p className="footer-desc">
            Anonymous ballots with publicly verifiable tallies, powered by zero-knowledge proofs on Midnight Network.
          </p>
        </div>

        <div className="footer-col">
          <h4>Product</h4>
          <Link to="/vote">Cast Ballot</Link>
          <Link to="/results">View Results</Link>
          <Link to="/about">How It Works</Link>
        </div>

        <div className="footer-col">
          <h4>Resources</h4>
          <a href="https://midnight.network" target="_blank" rel="noopener noreferrer">Midnight Network</a>
          <a href="https://docs.midnight.network" target="_blank" rel="noopener noreferrer">Documentation</a>
          <a href="https://docs.midnight.network/compact" target="_blank" rel="noopener noreferrer">Compact Language</a>
        </div>

        <div className="footer-col">
          <h4>Network</h4>
          <a href={`https://explorer.preprod.midnight.network`} target="_blank" rel="noopener noreferrer">Block Explorer</a>
          {config.contractAddress && (
            <span className="text-xs text-secondary" style={{ wordBreak: 'break-all' }}>
              Contract: {config.contractAddress.slice(0, 12)}…
            </span>
          )}
        </div>
      </div>

      <div className="footer-bottom">
        <span className="footer-status">
          <span className="footer-status-dot" />
          Midnight Preprod
        </span>
        {' · '}
        VaultProof © {new Date().getFullYear()}
        {' · '}
        Built with Compact & ZK Proofs
      </div>
    </footer>
  );
}
