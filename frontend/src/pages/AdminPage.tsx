import React, { useState, useCallback, useEffect } from 'react';
import { CompiledContract } from '@midnight-ntwrk/compact-js';
import { createUnprovenDeployTx, submitTxAsync, createUnprovenCallTx } from '@midnight-ntwrk/midnight-js-contracts';
import { sampleSigningKey } from '@midnight-ntwrk/compact-runtime';
import { BrowserCompiledVotingContract, Contract } from '../contract';
import { useWallet } from '../contexts/WalletContext';
import { Settings, Loader2, CheckCircle, AlertCircle, Lock, Copy, ExternalLink, ShieldAlert } from 'lucide-react';
import { config } from '../config';
import { validateMidnightAddress } from '../lib/validation';

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
  const { session, isConnected, connect } = useWallet();
  const [status, setStatus] = useState<'idle' | 'deploying' | 'closing' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deployedAddress, setDeployedAddress] = useState<string | null>(
    localStorage.getItem('DEPLOYED_CONTRACT_ADDRESS') || config.contractAddress || null
  );
  const [copied, setCopied] = useState(false);

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
      localStorage.setItem('DEPLOYED_CONTRACT_ADDRESS', contractAddress);
      setStatus('success');
      
    } catch (e: any) {
      setStatus('error');
      setErrorMsg(e?.message ?? String(e));
    }
  }, [session, isConnected]);

  const copyAddress = () => {
    if (!deployedAddress) return;
    navigator.clipboard.writeText(deployedAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClosePoll = useCallback(async () => {
    if (!session || !isConnected || !deployedAddress) return;

    const validation = validateMidnightAddress(deployedAddress);
    if (!validation.valid) {
      setStatus('error');
      setErrorMsg(validation.error || 'Invalid target contract address.');
      return;
    }

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
          <Settings size={48} className="text-secondary mx-auto mb-md text-cyan-400" />
          <h2 className="title-md">Admin Portal</h2>
          <p className="text-secondary mb-lg">Please connect your 1AM wallet on the Preprod network to deploy or manage contracts.</p>
          <button className="btn btn-primary btn-block" onClick={() => connect(config.networkId)}>
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="max-w-2xl mx-auto">
        <div className="mb-xl">
          <h1 className="title-lg mb-sm">Admin Settings</h1>
          <p className="text-secondary">Deploy or manage the VaultProof voting contract on Midnight Preprod.</p>
        </div>

        <div className="card border-accent mb-lg">
          <h2 className="title-md mb-sm flex items-center">
            <Settings size={20} className="mr-sm text-cyan-400" /> Deploy New Poll
          </h2>
          <p className="text-secondary mb-lg">
            Deploy a new VaultProof contract to the network. This initializes a tamper-proof poll with a zeroed nullifier set.
          </p>

          <button 
            className="btn btn-primary btn-block mb-md" 
            onClick={handleDeploy}
            disabled={status === 'deploying' || status === 'closing'}
          >
            {status === 'deploying' ? (
              <><Loader2 className="spinner-icon mr-sm animate-spin" size={18} /> Deploying via 1AM...</>
            ) : 'Deploy Contract'}
          </button>
        </div>

        {deployedAddress && (
          <div className="card border-accent">
            <h2 className="title-md mb-sm flex items-center">
              <Lock size={20} className="mr-sm text-cyan-400" /> Manage Poll
            </h2>
            <p className="text-secondary mb-lg">
              Active contract: <code className="text-xs bg-slate-900 border border-slate-800 p-1.5 rounded font-mono text-cyan-400">{deployedAddress.slice(0,16)}...{deployedAddress.slice(-8)}</code>
            </p>

            <div className="flex gap-2 mb-lg">
              <button 
                className="btn btn-secondary flex-1 flex items-center justify-center gap-1 text-xs"
                onClick={copyAddress}
              >
                <Copy size={14} />
                {copied ? 'Copied Address!' : 'Copy Contract Address'}
              </button>
              <a
                href={`https://explorer.1am.xyz/address/${deployedAddress}?network=preprod`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary flex-1 flex items-center justify-center gap-1 text-xs"
              >
                <ExternalLink size={14} />
                View on 1AM Explorer
              </a>
            </div>

            <button 
              className="btn btn-error btn-block" 
              onClick={handleClosePoll}
              disabled={status === 'deploying' || status === 'closing'}
            >
              {status === 'closing' ? (
                <><Loader2 className="spinner-icon mr-sm animate-spin" size={18} /> Finalizing Poll...</>
              ) : 'Finalize & Close Poll'}
            </button>
          </div>
        )}

        {status === 'success' && (
          <div className="result-box success mt-lg">
            <CheckCircle size={24} className="mb-sm text-emerald-400" />
            <div className="result-title">Transaction Confirmed!</div>
            <div className="result-desc">
              Your administrative transaction has been confirmed on the Midnight Preprod ledger.
            </div>
          </div>
        )}

        {status === 'error' && errorMsg && (
          <div className="result-box error mt-lg">
            <AlertCircle size={24} className="mb-sm text-red-400" />
            <div className="result-title">Admin Action Failed</div>
            <div className="result-desc break-words">{errorMsg}</div>
          </div>
        )}
      </div>
    </div>
  );
}
