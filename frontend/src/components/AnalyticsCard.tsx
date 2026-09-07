import React from 'react';
import { Activity, ShieldCheck, Download, Award, CheckCircle2, AlertCircle } from 'lucide-react';
import { computeVotingAnalytics, type VoteReceipt } from '../lib/validation';

interface AnalyticsCardProps {
  yesVotes: number;
  noVotes: number;
  quorumThreshold?: number;
  contractAddress: string;
  latestReceipt?: VoteReceipt | null;
}

export const AnalyticsCard: React.FC<AnalyticsCardProps> = ({
  yesVotes,
  noVotes,
  quorumThreshold = 10,
  contractAddress,
  latestReceipt,
}) => {
  const stats = computeVotingAnalytics(yesVotes, noVotes, quorumThreshold);

  const downloadReceipt = () => {
    if (!latestReceipt) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(latestReceipt, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `VaultProof_Receipt_${latestReceipt.proposalId}_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="card-cyber rounded-2xl p-6 relative overflow-hidden border border-cyan-500/20 bg-[#070b14]/90 backdrop-blur-xl shadow-2xl">
      <div className="flex items-center justify-between pb-4 border-b border-cyan-500/10 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100 tracking-wide">Voting Telemetry & Analytics</h3>
            <p className="text-xs text-slate-400">Midnight Preprod Privacy Metrics</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>ZK-Shielded State</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <span className="text-xs uppercase tracking-wider text-slate-400">Total Valid Ballots</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-cyan-400">{stats.totalVotes}</span>
            <span className="text-xs text-slate-500">votes recorded</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Sybil nullifiers tracked on ledger
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <span className="text-xs uppercase tracking-wider text-slate-400">Quorum Target</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-200">{stats.quorumPercentage}%</span>
            <span className="text-xs text-slate-500">of {quorumThreshold} threshold</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                stats.isQuorumReached ? 'bg-emerald-400' : 'bg-cyan-400'
              }`}
              style={{ width: `${stats.quorumPercentage}%` }}
            />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <span className="text-xs uppercase tracking-wider text-slate-400">Quorum Status</span>
          <div className="mt-2 flex items-center gap-2">
            {stats.isQuorumReached ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-semibold text-emerald-400">Quorum Met</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-amber-400" />
                <span className="text-sm font-semibold text-amber-400">Pending Quorum</span>
              </>
            )}
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            {stats.isQuorumReached ? 'Proposal results are legally binding' : `${quorumThreshold - stats.totalVotes} more needed`}
          </div>
        </div>
      </div>

      {latestReceipt && (
        <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Award className="w-5 h-5 text-cyan-400" />
            <div>
              <p className="text-xs font-semibold text-slate-200">Cryptographic Vote Receipt Generated</p>
              <p className="text-[11px] text-cyan-400/80 font-mono">Checksum: {latestReceipt.checksum}</p>
            </div>
          </div>
          <button
            onClick={downloadReceipt}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-semibold transition"
          >
            <Download className="w-3.5 h-3.5" />
            Export Audit Proof
          </button>
        </div>
      )}
    </div>
  );
};
