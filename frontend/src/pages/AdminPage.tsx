import React, { useState, useCallback, useEffect } from 'react';
import { CompiledContract } from '@midnight-ntwrk/compact-js';
import { createUnprovenDeployTx, submitTxAsync, createUnprovenCallTx } from '@midnight-ntwrk/midnight-js-contracts';
import { sampleSigningKey } from '@midnight-ntwrk/compact-runtime';
import { BrowserCompiledVotingContract, Contract } from '../contract';
import { useWallet } from '../contexts/WalletContext';
import { Settings, Loader2, CheckCircle, AlertCircle, Lock } from 'lucide-react';
import { config } from '../config';

// Deterministic admin secret for hackathon demo
const ADMIN_SECRET = '0000000000000000000000000000000000000000000000000000000000000099';

function deriveAdminKey(seedHex: string): Uint8Array {
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(seedHex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export default function AdminPage() {
  const { session, isConnected } = useWallet();
  const [status, setStatus] = useState<'idle' | 'deploying' | 'closing' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deployedAddress, setDeployedAddress] = useState<string | null>(config.contractAddress || null);

  const handleDeploy = useCallback(async () => {
    if (!session || !isConnected) return;
    setStatus('deploying');
    setErrorMsg(null);

    try {
      const adminKeyBytes = deriveAdminKey(ADMIN_SECRET);
      
      const deployTxData = await createUnprovenDeployTx(session.providers as any, {
        compiledContract: BrowserCompiledVotingContract,
        args: [adminKeyBytes],
        privateStateId: 'DeployerState',
        initialPrivateState: {
          adminSecret: adminKeyBytes,
        },
        signingKey: sampleSigningKey(),
      });

      const contractAddress = deployTxData.public.contractAddress;
      
      await submitTxAsync(session.providers as any, {
        unprovenTx: deployTxData.private.unprovenTx,
      });

      setDeployedAddress(contractAddress);
      setStatus('success');
      
    } catch (e: any) {
      setStatus('error');
      setErrorMsg(e?.message ?? String(e));
    }
  }, [session, isConnected]);

  const handleClosePoll = useCallback(async () => {
    if (!session || !isConnected || !deployedAddress) return;
    setStatus('closing');
    setErrorMsg(null);

    try {
      const adminKeyBytes = deriveAdminKey(ADMIN_SECRET);

      const txData = await createUnprovenCallTx(session.providers as any, {
        compiledContract: BrowserCompiledVotingContract,
        contractAddress: deployedAddress,
        circuitId: 'close_poll',
        args: [],
        privateStateId: 'AdminState',
        initialPrivateState: {
          adminSecret: adminKeyBytes,
        },
        signingKey: sampleSigningKey(),
      });
      
      await submitTxAsync(session.providers as any, {
        unprovenTx: txData.private.unprovenTx,
      });

      setStatus('success');
    } catch (e: any) {
      setStatus('error');
      setErrorMsg(e?.message ?? String(e));
    }
  }, [session, isConnected, deployedAddress]);

  if (!isConnected) {
    return (
      <div className="page-container flex-center">
        <div className="card text-center max-w-md mx-auto">
          <Settings size={48} className="text-secondary mx-auto mb-md" />
          <h2 className="title-md">Admin Portal</h2>
          <p className="text-secondary">Please connect your wallet to access the admin interface.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="max-w-2xl mx-auto">
        <div className="mb-xl">
          <h1 className="title-lg mb-sm">Admin Settings</h1>
          <p className="text-secondary">Deploy or manage the VaultProof voting contract.</p>
        </div>

        <div className="card border-accent mb-lg">
          <h2 className="title-md mb-sm flex items-center">
            <Settings size={20} className="mr-sm" /> Deploy New Poll
          </h2>
          <p className="text-secondary mb-lg">
            Deploy a new VaultProof contract to the network. This will generate a new poll with zero votes.
          </p>

          <button 
            className="btn btn-primary btn-block mb-md" 
            onClick={handleDeploy}
            disabled={status === 'deploying' || status === 'closing'}
          >
            {status === 'deploying' ? (
              <><Loader2 className="spinner-icon mr-sm" size={18} /> Deploying...</>
            ) : 'Deploy Contract'}
          </button>
        </div>

        {deployedAddress && (
          <div className="card border-accent">
            <h2 className="title-md mb-sm flex items-center">
              <Lock size={20} className="mr-sm" /> Manage Poll
            </h2>
            <p className="text-secondary mb-lg">
              Active contract: <code className="text-xs bg-main p-xs rounded">{deployedAddress.slice(0,16)}...</code>
            </p>
            <p className="text-secondary mb-lg text-sm">
              Closing the poll will prevent any further votes from being cast. This action is irreversible.
            </p>

            <button 
              className="btn btn-secondary btn-block text-error border-error" 
              onClick={handleClosePoll}
              disabled={status === 'deploying' || status === 'closing'}
              style={{ borderColor: 'var(--error)', color: 'var(--error)' }}
            >
              {status === 'closing' ? (
                <><Loader2 className="spinner-icon mr-sm" size={18} /> Closing Poll...</>
              ) : 'Close Poll'}
            </button>
          </div>
        )}

        {status === 'success' && (
          <div className="result-box success mt-md">
            <CheckCircle size={32} className="mb-sm" />
            <div className="result-title">Success!</div>
            {deployedAddress && <div className="result-tx font-mono">{deployedAddress}</div>}
          </div>
        )}

        {status === 'error' && errorMsg && (
          <div className="result-box error mt-md">
            <AlertCircle size={24} className="mb-sm" />
            <div className="result-title">Transaction Failed</div>
            <div className="result-desc break-words">{errorMsg}</div>
          </div>
        )}
      </div>
    </div>
  );
}
