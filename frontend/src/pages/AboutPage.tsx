import { motion } from 'framer-motion';
import { Shield, BookOpen, Code, Terminal } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="page-container">
      <div className="max-w-3xl mx-auto">
        <motion.div 
          className="mb-xl text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Shield size={48} className="text-accent mx-auto mb-md" />
          <h1 className="title-lg mb-sm">About VaultProof</h1>
          <p className="text-secondary text-lg">
            Privacy-preserving voting built on the Midnight Network.
          </p>
        </motion.div>

        <div className="space-y-lg" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <motion.section 
            className="card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="title-md mb-sm flex items-center gap-sm">
              <BookOpen className="text-accent" size={24} /> The Problem
            </h2>
            <p className="text-secondary leading-relaxed">
              Traditional online voting systems force users to trust a centralized authority. If the system is fully public (like most blockchains), everyone can see who you voted for. If it's private (like a web2 server), the admins could manipulate the results secretly.
            </p>
          </motion.section>

          <motion.section 
            className="card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="title-md mb-sm flex items-center gap-sm">
              <Code className="text-accent" size={24} /> The ZK Solution
            </h2>
            <p className="text-secondary leading-relaxed mb-md">
              VaultProof utilizes Midnight's Zero-Knowledge (ZK) capabilities to solve the secret ballot problem.
            </p>
            <ul className="text-secondary" style={{ paddingLeft: '1.5rem', listStyleType: 'disc', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>Your vote choice acts as a <strong>private witness</strong>.</li>
              <li>A local WASM circuit computes a zero-knowledge proof that you cast a valid vote (e.g., 0 for No, 1 for Yes).</li>
              <li>Only the proof and the intent to increment the tally are submitted to the blockchain.</li>
              <li>Your specific choice remains a mathematical secret, but the public tally is provably correct.</li>
            </ul>
          </motion.section>

          <motion.section 
            className="card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="title-md mb-sm flex items-center gap-sm">
              <Terminal className="text-accent" size={24} /> Open Source
            </h2>
            <p className="text-secondary leading-relaxed mb-md">
              This project demonstrates the power of the <strong>Compact smart contract language</strong> for privacy-first decentralized applications. The frontend is built using React and the Midnight.js SDK.
            </p>
          </motion.section>
        </div>
      </div>
    </div>
  );
}
