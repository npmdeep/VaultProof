import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LockKeyhole, ShieldCheck, Zap, ChevronRight, User, Cpu, Database } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-section">
        <motion.div 
          className="hero-content"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="badge-pill">Powered by Midnight Network</div>
          <h1 className="hero-title">
            Vote Anonymously.<br/>
            <span className="text-accent">Verify Publicly.</span>
          </h1>
          <p className="hero-subtitle">
            Cast your ballot without revealing your choice. Built on zero-knowledge proofs for true cryptographic privacy and public accountability.
          </p>
          <div className="hero-actions">
            <Link to="/vote" className="btn btn-primary btn-lg">
              Cast Ballot <ChevronRight size={20} />
            </Link>
            <Link to="/results" className="btn btn-secondary btn-lg">
              View Live Results
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Ecosystem Stats (Mock) */}
      <section className="stats-section mb-xl">
        <div className="card max-w-3xl mx-auto stats-row card-accent">
          <div className="stat-item">
            <div className="stat-value">100%</div>
            <div className="stat-label">Cryptographic Privacy</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">Zero</div>
            <div className="stat-label">Knowledge Disclosed</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">Public</div>
            <div className="stat-label">Verifiable Tallies</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section mb-2xl">
        <div className="features-grid">
          <motion.div 
            className="feature-card"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <div className="feature-icon"><LockKeyhole size={32} /></div>
            <h3>Absolute Privacy</h3>
            <p>Your vote choice never leaves your device. The blockchain only receives a mathematical proof that you cast a valid ballot.</p>
          </motion.div>
          <motion.div 
            className="feature-card"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <div className="feature-icon"><ShieldCheck size={32} /></div>
            <h3>Verifiable Tallies</h3>
            <p>The total votes for each option are updated publicly on the Midnight ledger. Anyone can audit the final results.</p>
          </motion.div>
          <motion.div 
            className="feature-card"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            <div className="feature-icon"><Zap size={32} /></div>
            <h3>Unstoppable Logic</h3>
            <p>The rules of the poll are enforced by the Compact smart contract. The ZK circuit prevents double-voting or invalid choices.</p>
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works mb-2xl max-w-3xl mx-auto">
        <h2 className="title-md text-center mb-xl">How VaultProof Works</h2>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr', gap: '2rem' }}>
          
          <div className="card" style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
            <div className="feature-icon" style={{ marginBottom: 0, flexShrink: 0, width: 48, height: 48 }}>
              <User size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold mb-xs">1. Select Your Choice</h3>
              <p className="text-secondary">Choose your option locally. Your selection acts as a private witness and is never sent to the network.</p>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
            <div className="feature-icon" style={{ marginBottom: 0, flexShrink: 0, width: 48, height: 48 }}>
              <Cpu size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold mb-xs">2. Generate ZK Proof</h3>
              <p className="text-secondary">A WASM circuit on your device generates a zero-knowledge proof. It proves that you incremented exactly one counter, without revealing which one.</p>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
            <div className="feature-icon" style={{ marginBottom: 0, flexShrink: 0, width: 48, height: 48 }}>
              <Database size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold mb-xs">3. Transparent Tallying</h3>
              <p className="text-secondary">The Midnight network verifies the proof and updates the on-chain counters. The public ledger reflects the new tally, but your individual choice remains an absolute secret.</p>
            </div>
          </div>

        </div>
      </section>
      
      {/* Final CTA */}
      <section className="text-center py-xl border-t" style={{ borderTop: '1px solid var(--border)', paddingTop: '4rem', paddingBottom: '2rem' }}>
        <h2 className="title-md mb-md">Ready to experience private voting?</h2>
        <Link to="/vote" className="btn btn-primary btn-lg">
          Cast Your Ballot
        </Link>
      </section>
    </div>
  );
}
