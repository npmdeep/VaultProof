# VaultProof - Private Voting on Midnight Network

VaultProof is a decentralized, privacy-preserving voting application built on the Midnight Network.

## The Product Idea (New Moon to Full Submission)
VaultProof solves the problem of transparent but anonymous decision-making. In traditional voting systems, transparency often compromises voter privacy. VaultProof leverages Midnight Network's ZK-SNARK capabilities to allow users to cast votes (Yes/No) that are fully verified on-chain, while keeping the individual choice completely private. The public ledger only maintains the mathematically proven tally and total votes cast, ensuring complete transparency of the outcome without ever disclosing who voted for what.

## Tech Stack
- **Smart Contract**: Midnight Compact
- **Frontend**: React, Vite, Tailwind CSS
- **Wallet Integration**: Midnight 1AM Wallet / Lace Wallet
- **Proving**: client-side ZK-SNARK proving via `@midnight-ntwrk/midnight-js`

## Setup & Local Development

1. Ensure you have Node.js 22+, Docker, and Yarn installed.
2. Clone this repository and install dependencies:
   ```bash
   yarn install
   ```
3. Compile the Compact contract (requires WSL on Windows):
   ```bash
   yarn compile
   ```
4. Start the local Midnight node, indexer, and proof server:
   ```bash
   yarn env:up
   ```
5. Run the frontend development server:
   ```bash
   cd frontend
   npm run dev
   ```

## Privacy Model
- **Public State**: The total number of YES and NO votes, and the total count of votes cast.
- **Private State (Witness)**: The actual choice made by the individual voter. The network verifies that the choice was valid (0 or 1) and that the public counters were incremented correctly according to the private choice, without ever disclosing the choice itself to the network observers.

## Submission Details
- **Network**: Preprod
- **Contract Address**: *(Will be added upon successful deployment)*
