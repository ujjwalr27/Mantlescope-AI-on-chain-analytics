# MantleScope

**AI-powered on-chain analytics for Mantle Network.**

Track smart money flows, DeFi protocol health, and whale behavior — with AI insights written trustlessly on-chain so any contract can consume them.

**Live demo:** _add Vercel URL here_
**Contract:** _add deployed address here_ ([Mantlescan](https://sepolia.mantlescan.xyz))

---

## Features

- **Smart Money Leaderboard** — top wallets ranked by activity, tagged by AI (whale / accumulator / trader / bot)
- **Protocol Dashboard** — TVL, volume, and AI health scores for Agni, Merchant Moe, Lendle, Aurelius, INIT
- **Wallet Profiler** — paste any address → instant AI risk score + behavior classification
- **Write to Chain** — AI insights committed on-chain via `MantleScopeInsights` oracle contract
- **AI Chat** — natural language Q&A over live Mantle data (streaming, Groq LPU)
- **Anomaly Detection** — 15-min scheduled scan detecting unusual wallet behavior

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, Recharts |
| Web3 | viem + wagmi + ConnectKit |
| AI | Groq (`llama-3.3-70b-versatile`, `llama-3.1-8b-instant`) + Vercel AI SDK |
| Data | Mantlescan/Etherscan v2 · Blockscout fallback · DefiLlama · Goldsky subgraphs |
| Cache | Upstash Redis |
| Scheduling | Upstash QStash |
| Contract | Solidity 0.8.24, Hardhat, OpenZeppelin |

---

## Setup

### Prerequisites
- Node.js >= 20
- pnpm >= 9 (`npm i -g pnpm`)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

```bash
cp apps/web/.env.local.example apps/web/.env.local
cp contracts/.env.example contracts/.env
```

Fill in all values. Required:
- `GROQ_API_KEY` — [console.groq.com](https://console.groq.com)
- `ETHERSCAN_API_KEY` — [etherscan.io/register](https://etherscan.io/register) (free)
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` — [upstash.com](https://upstash.com)
- `QSTASH_TOKEN` + signing keys — [upstash.com/qstash](https://upstash.com/qstash)
- `ORACLE_PRIVATE_KEY` — a fresh EOA private key (never use a funded mainnet wallet)
- `NEXT_PUBLIC_CONTRACT_ADDRESS` — fill after deploying the contract

### 3. Deploy the smart contract

```bash
cd contracts
pnpm install
pnpm deploy:testnet
```

Copy the deployed address into `apps/web/.env.local` as `NEXT_PUBLIC_CONTRACT_ADDRESS`.

### 4. Run the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Contract

`MantleScopeInsights.sol` is deployed on **Mantle Sepolia (chainId 5003)**.

| Function | Who | Description |
|---|---|---|
| `triggerAnalysis(wallet)` | Anyone | Request AI analysis on-chain. Emits `AnalysisRequested`. |
| `getWalletInsight(wallet)` | Anyone | Read stored AI risk score + behavior tag. |
| `writeWalletInsight(...)` | Oracle EOA | Write AI result (riskScore, behaviorTag, summaryHash). |
| `getProtocolSnapshot(name)` | Anyone | Read stored protocol health score. |
| `setOracleAddress(addr)` | Owner | Rotate oracle key. |

> **Security note:** The oracle private key is stored in a Vercel environment variable — acceptable for hackathon scope. Production deployments should use a multi-sig or Chainlink DON.

---

## Deployment Checklist (20 Project Award)

- [ ] Contract deployed on Mantle Sepolia
- [ ] Contract verified on Mantlescan
- [ ] `triggerAnalysis()` callable by anyone (AI-powered on-chain function)
- [ ] Frontend live at public Vercel URL
- [ ] Deployment address in DoraHacks submission
- [ ] Demo video ≥ 2 min
- [ ] This README + ARCHITECTURE.md in public GitHub repo
