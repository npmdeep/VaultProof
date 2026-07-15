import React, { useState, useEffect } from 'react';
import { createPatchedPublicDataProvider } from '../lib/midnight';
import { ledger } from '../contract';
import { config } from '../config';
import { BarChart3, RefreshCw, AlertCircle } from 'lucide-react';

export default function ResultsPage() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pollData, setPollData] = useState<{
    isOpen: boolean;
    totalVotes: number;
    yesVotes: number;
    noVotes: number;
  } | null>(null);

  const fetchResults = async () => {
    if (!config.contractAddress) {
      setErrorMsg('No contract address configured. Please set VITE_CONTRACT_ADDRESS.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const publicDataProvider = createPatchedPublicDataProvider(config.indexer, config.indexerWS);
      const state = await publicDataProvider.queryContractState(config.contractAddress);
      
      if (!state || !state.data) {
        throw new Error('Contract state not found. Ensure it is deployed and indexed.');
      }

      const decodedLedger = ledger(state.data);
      
      setPollData({
        isOpen: decodedLedger.is_open,
        totalVotes: Number(decodedLedger.total_votes),
        yesVotes: Number(decodedLedger.yes_votes),
        noVotes: Number(decodedLedger.total_votes) - Number(decodedLedger.yes_votes),
      });
    } catch (e: any) {
      setErrorMsg(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchResults, 10000);
    return () => clearInterval(interval);
  }, []);

  const calculatePercentage = (count: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
  };

  return (
    <div className="page-container">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-xl">
          <div>
            <h1 className="title-lg mb-sm">Live Results</h1>
            <p className="text-secondary">Public, verifiable tallies straight from the Midnight ledger.</p>
          </div>
          <button 
            className="btn-icon" 
            onClick={fetchResults}
            disabled={loading}
            title="Refresh Results"
          >
            <RefreshCw size={24} className={loading ? 'spinner-icon' : ''} />
          </button>
        </div>

        {errorMsg ? (
          <div className="result-box error">
            <AlertCircle size={32} className="mb-sm mx-auto" />
            <div className="result-title">Error Fetching Results</div>
            <div className="result-desc break-words">{errorMsg}</div>
          </div>
        ) : loading && !pollData ? (
          <div className="card flex-center min-h-[300px]">
            <div className="text-center">
              <BarChart3 size={48} className="text-secondary mx-auto mb-md animate-pulse" />
              <div className="title-md mb-xs">Querying Blockchain</div>
              <div className="text-sm text-secondary">Fetching latest state from indexer...</div>
            </div>
          </div>
        ) : pollData ? (
          <div className="card">
            <div className="flex justify-between items-center mb-xl border-b pb-md" style={{ borderColor: 'var(--border)' }}>
              <div>
                <div className="text-sm text-secondary uppercase tracking-widest mb-xs">Poll Status</div>
                <div className={`font-bold ${pollData.isOpen ? 'text-success' : 'text-error'}`}>
                  {pollData.isOpen ? 'ACTIVE' : 'CLOSED'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-secondary uppercase tracking-widest mb-xs">Total Votes</div>
                <div className="font-bold text-xl">{pollData.totalVotes}</div>
              </div>
            </div>

            <h3 className="title-md mb-lg">Decentralized Governance Proposal</h3>

            <div className="results-bar-container mb-xl">
              <div className="result-bar-row">
                <div className="result-bar-label">Yes</div>
                <div className="result-bar-track">
                  <div 
                    className="result-bar-fill" 
                    style={{ width: `${Math.max(calculatePercentage(pollData.yesVotes, pollData.totalVotes), 2)}%` }}
                  />
                </div>
                <div className="result-bar-count">{pollData.yesVotes}</div>
              </div>
              <div className="text-xs text-right text-secondary mt-[-0.5rem] mb-md">
                {calculatePercentage(pollData.yesVotes, pollData.totalVotes)}%
              </div>

              <div className="result-bar-row">
                <div className="result-bar-label">No</div>
                <div className="result-bar-track">
                  <div 
                    className="result-bar-fill no" 
                    style={{ width: `${Math.max(calculatePercentage(pollData.noVotes, pollData.totalVotes), 2)}%` }}
                  />
                </div>
                <div className="result-bar-count">{pollData.noVotes}</div>
              </div>
              <div className="text-xs text-right text-secondary mt-[-0.5rem]">
                {calculatePercentage(pollData.noVotes, pollData.totalVotes)}%
              </div>
            </div>

            <div className="bg-main p-md rounded-md border text-sm text-secondary flex items-start gap-sm mt-xl" style={{ borderColor: 'var(--border)' }}>
              <AlertCircle size={16} className="mt-[2px] flex-shrink-0 text-accent" />
              <div>
                <strong>Zero-Knowledge Assurance:</strong> These tallies are computationally verified. While everyone can see these results, cryptographic commitments guarantee that individual voter choices remain permanently hidden.
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
