import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import { Contract, ledger } from './managed/contract/index.js';

export { Contract, ledger };

export const witnesses = {
  adminSecret: (ctx: any) => [ctx.privateState, ctx.privateState.adminSecret],
};

export const BrowserCompiledVotingContract = CompiledContract.make(
  'VotingContract',
  Contract,
).pipe(
  CompiledContract.withWitnesses(witnesses),
  CompiledContract.withCompiledFileAssets('/zk/voting')
);
