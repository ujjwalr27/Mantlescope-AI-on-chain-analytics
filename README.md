# MantleScope

**AI-powered on-chain analytics for Mantle Network — with AI insights written trustlessly on-chain so any contract can consume them.**

> Built for the **Turing Test Hackathon** · Alpha & Data Track Path A · also targeting Grand Champion, Best UI/UX, and the 20 Project Deployment Award.

---

## Live Demo & Contracts

| What | Where |
|---|---|
| Live demo | [mantlescope-ai-on-chain-analytics.vercel.app](https://mantlescope-ai-on-chain-analytics-atonin0k9.vercel.app/) |
| `MantleScopeInsights` (oracle contract) | `0x034b8af90B166551A7cEaA98b5603b2915e6fC64` → [Mantlescan](https://sepolia.mantlescan.xyz/address/0x034b8af90B166551A7cEaA98b5603b2915e6fC64) |
| `MantleScopeAgent` (ERC-8004 Agent NFT) | `0xE6c9493561cA5d2ef322F0AFdd24B3dCE030944d` → [Mantlescan](https://sepolia.mantlescan.xyz/address/0xE6c9493561cA5d2ef322F0AFdd24B3dCE030944d) |
| Network | Mantle Sepolia (chainId 5003) |
| Open data source for | Mantle Mainnet (chainId 5000) |

---

## How It Aligns With the Hackathon's Three Defining Features

| Defining Feature | How MantleScope satisfies it |
|---|---|
| **1. On-chain benchmarking of AI** | Every AI risk score and behavior tag is written on-chain to `MantleScopeInsights`. Achievement counter on the agent NFT increments per analysis — a permanent, decentralised record of AI performance. |
| **2. ERC-8004 agent identity** | `MantleScopeAgent.sol` is a deployed ERC-721 + ERC-8004 NFT. Token #0 is the "MantleScope AI Oracle" with on-chain capabilities, model name, and growing achievement count. |
| **3. Radical transparency** | The `/oracle` page is a live event stream — every Groq AI call, every on-chain write, every anomaly scan appears in real time. Open this in a tab during the demo. |

---

## Features

### Data & Analytics
- **Smart Money Leaderboard** — top wallets discovered dynamically across **4 tokens in parallel** (USDC + USDT + WETH + WMNT), tagged by AI
- **Composite MantleScope Score** — proprietary 0–100 score combining 6 on-chain signals (tx volume, counterparty diversity, behavior, token diversity, risk-adjusted engagement, ratio)
- **Bridge Inflow Tracker** — tracks deposits to L2StandardBridge (`0x4200...0010`), shows top recipients and recent transfers — data not available on any other dashboard
- **Protocol Dashboard** — TVL + AI health scores for Agni, Merchant Moe, Lendle, Aurelius, INIT
- **Live Anomaly Detection** — every 15 min, AI scans top wallets for unusual activity; non-blocking first-load fallback

### AI Layer
- **Wallet Profiler** — paste any address → instant Groq AI risk score + behavior classification
- **AI Chat** — natural language Q&A over live Mantle data (streaming via Vercel AI SDK)
- **Anomaly Detection** — AI scoring on real USD volume, not just tx counts
- **Trend Prediction** — 3-day TVL forecasts

### On-chain
- **`triggerAnalysis(wallet)`** payable — anyone can pay 0.001 MNT to request an AI analysis on-chain
- **Trustless fulfillment** — `/api/cron/fulfill` reads `AnalysisRequested` logs directly from chain and fulfills them via the oracle, with **no frontend required**. The request and the fulfillment are both on-chain and auditable.
- **`writeWalletInsight(...)`** oracle-only — the AI result is committed on-chain and any contract can read it via `getWalletInsight(address)`
- **Live Oracle Activity Log** at `/oracle` — auto-refreshes every 5s

### Insight quality
- **On-chain entity labeling** — counterparties are resolved to known entities (L2 bridge, Lendle/Aurelius pools, token contracts, system predeploys), so AI reasoning cites real protocols instead of raw hex — surfaced as chips on the Profiler
- **Transparent MantleScope Score** — every wallet's composite score expands to a per-signal breakdown (6 weighted components), so the number is auditable, not a black box

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, Recharts |
| Web3 | viem 2.x · wagmi 2.x · ConnectKit |
| AI | Groq SDK (`llama-3.3-70b-versatile`) · Vercel AI SDK (`@ai-sdk/groq`) · Zod schema validation |
| Data | Mantlescan/Etherscan v2 (100k req/day) · DefiLlama · DefiLlama DEX overview · L2StandardBridge tokentx |
| Cache | Upstash Redis · Upstash QStash for cron |
| Contracts | Solidity 0.8.24 (EVM target: cancun) · Hardhat · OpenZeppelin v5 |
| Monorepo | pnpm workspaces (`apps/web` + `contracts`) |

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
Copy `.env.local.example` and fill in:

```env
# AI
GROQ_API_KEY=gsk_...

# On-chain data
ETHERSCAN_API_KEY=...                # works for chainId 5000 + 5003
DATA_CHAIN_ID=5000                   # fetch data from mainnet
NEXT_PUBLIC_CHAIN_ID=5003            # connect wallet to testnet

# Cache
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Cron
QSTASH_TOKEN=...
QSTASH_CURRENT_SIGNING_KEY=...

# Oracle wallet (FRESH key, never use a funded mainnet wallet)
ORACLE_PRIVATE_KEY=...

# Contracts
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...   # MantleScopeInsights
NEXT_PUBLIC_AGENT_CONTRACT=0xE6c9493561cA5d2ef322F0AFdd24B3dCE030944d
```

### 3. Deploy the smart contracts
```bash
# 1. Insights oracle
pnpm --filter contracts deploy:testnet

# 2. ERC-8004 Agent NFT
pnpm --filter contracts deploy:agent
pnpm --filter contracts mint:agent
```

Set the deployed addresses in `apps/web/.env.local`.

### 4. Run dev server
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## On-chain Functions

| Function | Caller | Purpose |
|---|---|---|
| `triggerAnalysis(wallet)` payable | **Anyone** (0.001 MNT) | Request AI analysis on-chain. Emits `AnalysisRequested`. |
| `getWalletInsight(wallet)` view | Anyone | Read AI risk score + behavior tag. |
| `writeWalletInsight(...)` | Oracle EOA | Commit AI result. Emits `WalletInsightWritten`. |
| `getProtocolSnapshot(name)` view | Anyone | Read AI protocol health score. |
| `getAgentMetadata(0)` view | Anyone | Read ERC-8004 agent name, model, capabilities, achievements. |
| `incrementAchievement(0)` | Oracle | Bump the agent's on-chain reputation counter (called after each successful analysis). |

> **Security note:** The oracle private key is stored in Vercel env vars — acceptable for hackathon scope. Production should use a multi-sig or Chainlink DON.

---

## Pages

| Route | Purpose |
|---|---|
| `/` | Dashboard — TVL, real DEX volume (DefiLlama), bridge inflows, anomalies, top wallets |
| `/wallets` | Smart Money leaderboard — multi-token discovery, MantleScope Score, behavior tags |
| `/protocols` | Protocol health — Agni, Moe, Lendle, Aurelius, INIT with AI summaries |
| `/profiler` | Wallet Profiler — AI analysis + dual on-chain actions (user-trigger or oracle-write) |
| `/chat` | AI Chat — streaming Q&A with live Mantle context |
| `/oracle` | **Live Oracle Activity Log** — every AI call + on-chain write in real time |
| `/about` | ERC-8004 Agent NFT badge + architecture summary + verified contract addresses |

---

## Deployment Checklist (20 Project Award)

- [x] `MantleScopeInsights` deployed on Mantle Sepolia
- [x] `MantleScopeAgent` (ERC-8004) deployed on Mantle Sepolia
- [x] Both contracts verified on Mantlescan
- [x] **AI-powered function callable on-chain**: `triggerAnalysis()` is payable + user-callable from the Profiler page
- [x] Frontend live at public Vercel URL → [mantlescope-ai-on-chain-analytics.vercel.app](https://mantlescope-ai-on-chain-analytics-atonin0k9.vercel.app/)
- [ ] Deployment addresses in DoraHacks submission
- [ ] Demo video ≥ 2 min walking through the flow

---

## Business Model & Go-to-Market

MantleScope is not just a dashboard — it's an **AI insight layer for Mantle** with two complementary surfaces: a consumer analytics product (the dashboard) and a B2B/B2C2 oracle (`MantleScopeInsights`) that other contracts pay to read.

### The problem
Every Mantle DeFi protocol that wants risk-aware behavior — risk-gated lending, dynamic collateral factors, sybil-resistant airdrops, anomaly-aware market making — currently has to build its own off-chain AI pipeline (data ingestion, model hosting, oracle plumbing). That's expensive, redundant, and untrustworthy when each protocol grades wallets in its own black box.

### The solution / why now
MantleScope runs the pipeline **once** and commits the result on-chain, so any protocol gets a trustless, timestamped AI risk score from a single `getWalletInsight(address)` call. One shared oracle replaces N duplicated AI stacks. Mantle's low gas + sub-second Groq LPU inference make on-chain AI insight economically viable today in a way it wasn't on L1.

### Revenue model
| Stream | Mechanism | Who pays |
|---|---|---|
| **Pay-per-trigger** | `triggerAnalysis(wallet)` is payable (MNT). Demo fee is 0; production sets a per-call fee, owner-withdrawable. | End users / protocols refreshing a score |
| **Oracle read subscriptions** | Protocols pay a monthly fee (or per-read micro-fee) for SLA-backed access to fresh `getWalletInsight` / `getProtocolSnapshot` data. | DeFi protocols (Lendle, Merchant Moe, Agni, etc.) |
| **Premium analytics / API** | Hosted API + advanced dashboards (custom watchlists, alerting, historical MantleScope Score) on a SaaS tier. | Funds, market makers, treasuries |
| **Reputation-as-a-service** | ERC-8004 agent identity + achievement trail licensed to other agentic projects needing verifiable on-chain reputation. | AI agent builders on Mantle |

### Target customers & GTM
1. **Mantle DeFi protocols** (primary) — direct integration partnerships; the oracle removes a build-vs-buy decision. Land via the ecosystem teams of Lendle/Moe/Agni already covered in the Protocols page.
2. **Professional investors / funds** — Smart Money leaderboard + MantleScope Score as a paid alpha feed; convert dashboard users to API subscribers.
3. **Mantle ecosystem itself** — grant-funded public-good phase to bootstrap the oracle as shared infrastructure, then transition to usage fees.

GTM sequence: (1) free public dashboard for top-of-funnel + community voting reach → (2) design-partner integrations with 1–2 lending protocols proving risk-gated lending → (3) open the oracle read API with metered pricing.

### Market & defensibility
- **TAM proxy:** every protocol on Mantle's ~$200M+ TVL is a potential oracle consumer; the cross-protocol risk graph compounds in value with each integration (data network effect).
- **Moat:** the proprietary **MantleScope Score** (6-signal composite, see below) and an accumulating on-chain history of insights that competitors can't backfill — the longer it runs, the more valuable and harder to replicate.

---

## Scalability & Sustainability

**Scaling to more protocols/chains:**
- Data layer is source-abstracted ([walletData.ts](apps/web/lib/data/walletData.ts) already does Mantlescan→Blockscout failover); adding a protocol is a config entry, not a rewrite. The Etherscan v2 key covers 60+ EVM chains with one credential, so multi-chain expansion is a `DATA_CHAIN_ID` change.
- AI layer is schema-driven (Zod + Groq JSON mode), so new insight types (e.g. LP-position risk, governance participation) are additive prompts + schemas, not new infrastructure.

**Keeping pipelines live post-hackathon:**
- Caching (Upstash Redis, 5min–1h TTLs) + QStash cron keep API costs bounded and predictable; Groq LPU inference is cheap enough to run continuously.
- Pay-per-trigger and read subscriptions are designed to make the oracle **self-funding** — usage fees cover RPC, AI, and infra costs rather than relying on perpetual grants.
- **Production hardening roadmap:** migrate the single oracle EOA to a multi-sig signer set, then to a Chainlink DON / decentralized keeper for trust-minimized writes; add on-chain staking/slashing for oracle accountability. The current single-key design is the bootstrap stage, not the end state.

---

## Submission Answers

**Data sources:** Mantlescan / Etherscan v2 (primary, 100k req/day, single key for testnet+mainnet+60 EVM chains) for wallet activity, ERC-20 transfers, bridge events. DefiLlama for protocol TVL series + DEX volume. Direct Mantle RPC via viem for `eth_call` reads on Lendle/Aurelius reserves and our deployed contracts. All cached in Upstash Redis (5-15 min TTLs).

**AI role:** Groq running `llama-3.3-70b-versatile` on LPU hardware classifies wallet behavior (risk score 0-100 + behavior tag), detects on-chain anomalies, summarises protocol health, answers natural-language questions over live data, and predicts 3-day TVL trends. Sub-second inference enables real-time analytics. Results are written on-chain so any Mantle contract can consume them trustlessly.

**Verifiable value on Mantle:** `MantleScopeInsights` is an AI oracle — Mantle DeFi protocols can call `getWalletInsight(address)` for trustless, timestamped AI risk scores, enabling risk-gated lending, dynamic collateral factors, or sybil resistance without each protocol running its own AI pipeline. Anyone can invoke `triggerAnalysis()` on-chain to refresh a wallet's score, paying gas in MNT — directly generating Mantle network usage. The ERC-8004 `MantleScopeAgent` NFT establishes on-chain agent identity with a growing achievement counter, satisfying the hackathon's three defining features.

---

## License

MIT
