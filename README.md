# VaultProof

**Privacy-Preserving Voting on the Midnight Network**

[![Midnight Network](https://img.shields.io/badge/Network-Midnight-blueviolet?style=for-the-badge)](https://midnight.network)
[![Language](https://img.shields.io/badge/Language-Compact-orange?style=for-the-badge)](https://midnight.network)
[![Tested With](https://img.shields.io/badge/Tested%20With-Vitest-yellow?style=for-the-badge)](https://vitest.dev)
[![State](https://img.shields.io/badge/Level-4%20Complete-success?style=for-the-badge)](#)
[![Deploy on Vercel](https://img.shields.io/badge/Deploy-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/new/clone?repository-url=https://github.com/npmdeep/VaultProof&root=frontend)


---

## Abstract

VaultProof is a decentralized application (dApp) engineered on the **Midnight Network** utilizing the **Compact** smart contract language. The platform solves the problem of transparent but anonymous decision-making. It allows users to cast votes (Yes/No) that are fully verified on-chain, while keeping the individual choice completely private. The public ledger only maintains the mathematically proven tally and total votes cast, ensuring complete transparency of the outcome without ever disclosing who voted for what.

---

## Table of Contents

1. [Official Submission Links](#official-submission-links)
2. [Architectural Overview](#architectural-overview)
3. [Zero-Knowledge Privacy Model](#zero-knowledge-privacy-model)
4. [Smart Contract Implementation](#smart-contract-implementation)
5. [Hackathon Progression (Levels 1-4)](#hackathon-progression-levels-1-4)
6. [Project Showcase & Verification Proofs](#project-showcase--verification-proofs)
7. [Local Development & Setup Guide](#local-development--setup-guide)

---

## Official Submission Links

- **Live Application:** [https://vermillion-bonbon-14c327.netlify.app/](https://vermillion-bonbon-14c327.netlify.app/)
- **Deployed Contract (Midnight Preprod):** [39767f264df7b2da4ea9ce24b3900f148517c564ec9efbffecad33edcd33332f](https://explorer.1am.xyz/address/39767f264df7b2da4ea9ce24b3900f148517c564ec9efbffecad33edcd33332f?network=preprod)
- **Demo Video Presentation:** [Watch the Demo Video](https://drive.google.com/file/d/1j9dltIV1BAGeE9YzzNgs25eeJelBFPg2/view?usp=sharing)
- **Public Brand Presence (X Profile):** [https://x.com/georgian_deep](https://x.com/georgian_deep)

| Component | Status | Network / Endpoint |
| --- | --- | --- |
| VaultArena Frontend | Live | [Netlify App](https://vermillion-bonbon-14c327.netlify.app/) |
| Midnight Preprod Contract | Deployed | `39767f264df7b2da4ea9ce24b3900f148517c564ec9efbffecad33edcd33332f` |

---

## Architectural Overview

VaultProof bridges modern web infrastructure with cutting-edge cryptographic privacy networks.

- **Smart Contract Layer:** Written in Compact (`voting.compact`), compiled to WebAssembly (WASM) and Zero-Knowledge Intermediate Representation (ZKIR). Deployed on the Midnight Preprod network.
- **Frontend Application Layer:** Built with React, Vite, and Tailwind CSS.
- **Wallet Infrastructure:** Integrated with the `@midnight-ntwrk/dapp-connector-api` to interface directly with the 1AM and Lace browser extension wallets for local proof generation and transaction signing.
- **Testing & CI/CD:** End-to-end testing utilizing Vitest and local Docker-based Midnight environments. Automated CI/CD pipelines via GitHub Actions.

---

## Zero-Knowledge Privacy Model

The core value proposition of VaultProof is absolute data privacy for voters, while maintaining a fully transparent public tally.

### The Traditional Vulnerability
In traditional electronic voting systems, transparency often compromises voter privacy, or privacy compromises the auditability of the tally. Centralized databases that hold voting records can be targeted for data breaches or manipulation.

### The VaultProof ZK Solution
VaultProof verification is entirely mathematical.

1. **Public State (Ledger Data):** The total number of YES and NO votes, and the total count of votes cast. These values are fully transparent and verifiable by any observer.
2. **Private State (Witness):** The actual choice made by the individual voter. The network verifies that the choice was valid (0 or 1) and that the public counters were incremented correctly according to the private choice, without ever disclosing the choice itself to the network observers.
3. **Local Proof Generation:** The user's browser wallet runs a localized Zero-Knowledge circuit. It updates the counters based on the private choice securely.
4. **On-Chain Verification:** The wallet submits a cryptographic proof to the Midnight blockchain. The network validators verify the math without ever seeing the underlying private inputs.

**Observer Matrix:**
- **Visible on-chain:** The total counts of YES, NO, and the total votes, along with the fact that a valid proof of voting was submitted.
- **Hidden permanently:** The individual voter's choice.

---

## Smart Contract Implementation

The Compact contract (`contracts/voting.compact`) is designed for maximum security and data minimization.

```compact
pragma language_version >=0.22.0;

import CompactStandardLibrary;

export ledger total_yes: Counter;
export ledger total_no: Counter;
export ledger total_votes: Counter;
export ledger is_open: Boolean;
export ledger admin: Bytes<32>;

witness adminSecret(): Bytes<32>;

pure circuit adminPublicKey(sk: Bytes<32>): Bytes<32> {
  return persistentHash<Vector<2, Bytes<32>>>([pad(32, "vaultproof:admin:v1"), sk]);
}

constructor(admin_key: Bytes<32>) {
  admin = disclose(admin_key);
