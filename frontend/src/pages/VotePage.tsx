import React, { useState, useCallback } from 'react';
import { createUnprovenCallTx, submitTxAsync } from '@midnight-ntwrk/midnight-js-contracts';
import { sampleSigningKey } from '@midnight-ntwrk/compact-runtime';
import { BrowserCompiledVotingContract } from '../contract';
import { useWallet } from '../contexts/WalletContext';
import { config } from '../config';
import { CheckCircle, AlertCircle, Loader2, ThumbsUp, ThumbsDown, UserCircle2 } from 'lucide-react';
import PrivacyFlowViz from '../components/PrivacyFlowViz';
import { AnalyticsCard } from '../components/AnalyticsCard';
import { validateVoterSecret, generateVoteReceipt, type VoteReceipt } from '../lib/validation';

export default function VotePage() {
  const { session, isConnected } = useWallet();
  const [choice, setChoice] = useState<number | null>(null);
  const [status, setStatus] = useState<'idle' | 'proving' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<VoteReceipt | null>(null);

  const handleVote = useCallback(async () => {
    if (!session || !isConnected || choice === null) return;
    if (!config.contractAddress) {
      setStatus('error');
      setErrorMsg('No contract address configured. Please set VITE_CONTRACT_ADDRESS.');
      return;
    }

    setStatus('proving');
    setErrorMsg(null);

    try {
      // Generate or retrieve a persistent voter secret for this browser session
      let secretHex = localStorage.getItem('vaultproof_voter_secret');
      if (!secretHex) {
        const randomBytes = new Uint8Array(32);
        crypto.getRandomValues(randomBytes);
        secretHex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
        localStorage.setItem('vaultproof_voter_secret', secretHex);
      }

      const secretValidation = validateVoterSecret(secretHex);
      if (!secretValidation.valid) {
        throw new Error(secretValidation.error || 'Invalid voter secret key.');
      }
      
      const voterSecret = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        voterSecret[i] = parseInt(secretHex.slice(i * 2, i * 2 + 2), 16);
      }

      const txData = await createUnprovenCallTx(session.providers as any, {
        compiledContract: BrowserCompiledVotingContract,
        contractAddress: config.contractAddress,
        circuitId: 'cast_vote',
        args: [BigInt(choice)],
        privateStateId: 'VoterState_' + secretHex.slice(0, 8), 
        initialPrivateState: { voterSecret },
        signingKey: sampleSigningKey(), // Generate a new ephemeral signing key for the tx
      });

      setStatus('submitting');
      
      await submitTxAsync(session.providers as any, {
        unprovenTx: txData.private.unprovenTx,
      });

      // Generate verifiable client-side cryptographic receipt
      const voteReceipt = generateVoteReceipt(
        config.contractAddress,
        secretHex.slice(0, 16) + '...',
        0,
        choice === 1,
        'preprod'
      );
      setReceipt(voteReceipt);
      setStatus('success');
    } catch (e: any) {
      setStatus('error');
      setErrorMsg(e?.message ?? String(e));
    }
  }, [session, isConnected, choice]);

  if (!isConnected) {
    return (
      <div className="page-container flex-center">
        <div className="card text-center max-w-md mx-auto">
          <UserCircle2 size={48} className="text-secondary mx-auto mb-md" />
          <h2 className="title-md mb-sm">Connect Wallet to Vote</h2>
          <p className="text-secondary mb-lg">You need to connect your Midnight wallet (1AM or Lace) to cast a ballot.</p>
          <div className="text-sm text-muted">Use the connect button in the top right.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="mb-6 text-center">
          <h1 className="title-lg mb-sm">Cast Your Ballot</h1>
          <p className="text-secondary">Select an option below. Your choice remains private while your vote is tallied publicly.</p>
        </div>

        {status === 'success' ? (
          <div className="result-box success mt-md space-y-4">
            <CheckCircle size={48} className="mb-md mx-auto text-emerald-400" />
            <div className="result-title">Vote Successfully Cast!</div>
            <div className="result-desc mt-sm">Your zero-knowledge proof has been verified and recorded by the Midnight blockchain.</div>
            
            <AnalyticsCard
              yesVotes={choice === 1 ? 1 : 0}
              noVotes={choice === 0 ? 1 : 0}
              quorumThreshold={10}
              contractAddress={config.contractAddress}
              latestReceipt={receipt}
            />

            <div className="pt-4">
              <button className="btn btn-secondary" onClick={() => { setStatus('idle'); setChoice(null); }}>
                Cast Another Ballot
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="card mb-6">
              <h2 className="title-md mb-md text-center">Do you support the new decentralized governance proposal?</h2>
              
              <div className="vote-options mb-xl">
                <div 
                  className={`vote-option ${choice === 1 ? 'selected' : ''}`}
                  onClick={() => status === 'idle' || status === 'error' ? setChoice(1) : null}
                  style={status !== 'idle' && status !== 'error' ? { opacity: 0.7, cursor: 'not-allowed' } : {}}
                >
                  <ThumbsUp size={40} className="vote-icon text-cyan-400" />
                  <div className="vote-label font-bold text-slate-100">Yes, Support</div>
                </div>
                
                <div 
                  className={`vote-option ${choice === 0 ? 'selected' : ''}`}
                  onClick={() => status === 'idle' || status === 'error' ? setChoice(0) : null}
                  style={status !== 'idle' && status !== 'error' ? { opacity: 0.7, cursor: 'not-allowed' } : {}}
                >
                  <ThumbsDown size={40} className="vote-icon text-slate-400" />
                  <div className="vote-label font-bold text-slate-100">No, Reject</div>
                </div>
              </div>

              {status === 'idle' || status === 'error' ? (
                <button 
                  className="btn btn-primary btn-block btn-lg" 
                  onClick={handleVote}
                  disabled={choice === null}
                >
                  Submit Vote Securely
                </button>
              ) : (
                <button className="btn btn-primary btn-block btn-lg" disabled>
                  <Loader2 className="spinner-icon mr-sm animate-spin" size={20} />
                  {status === 'proving' ? 'Generating ZK Proof...' : 'Submitting to Blockchain...'}
                </button>
              )}
            </div>

            <AnalyticsCard
              yesVotes={0}
              noVotes={0}
              quorumThreshold={10}
              contractAddress={config.contractAddress}
              latestReceipt={null}
            />

            {status !== 'idle' && status !== 'success' && (
              <PrivacyFlowViz status={status as any} />
            )}

            {status === 'error' && errorMsg && (
              <div className="result-box error mt-md">
                <AlertCircle size={24} className="mb-sm text-red-400" />
                <div className="result-title">Transaction Failed</div>
                <div className="result-desc break-words">{errorMsg}</div>
                {errorMsg.includes('closed') && (
                  <div className="mt-sm font-bold text-error">The poll may be closed.</div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
