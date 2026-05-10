# MantleScope — Architecture

## System Overview

```
                                 User Browser
                                       │
              ┌────────────────────────┼─────────────────────────┐
              │                        │                         │
              ▼                        ▼                         ▼
       ┌──────────────┐       ┌──────────────────┐      ┌──────────────────┐
       │  Pages (SSR) │       │  Client (wagmi)  │      │  ConnectKit / wallet
       │  Dashboard   │       │  Profiler trigger│      │   MetaMask
       │  /wallets    │       │  Agent badge     │      └──────────────────┘
       │  /protocols  │       │  /oracle stream  │
       │  /profiler   │       └──────────────────┘
       │  /chat       │
       │  /oracle     │
       │  /about      │
       └──────┬───────┘
              │
   Next.js API Routes (serverless)
              │
   ┌──────────┼─────────────────────────────────────────────┐
   │          │                                             │
   ▼          ▼                                             ▼
DefiLlama  Mantlescan / Etherscan v2              Mantle RPC (viem)
TVL/DEX    wallets, tokentx, bridge tokentx       contract reads/writes
   │          │                                             │
   └──────────┴──────────────► Upstash Redis ◄─────────────┘
                                 (cache + log)

                    Upstash QStash ─► /api/cron/anomalies (every 15 min)
```

---

## Three Defining Features → Code Path

### 1. On-chain Benchmarking of AI
- `MantleScopeInsights.sol` — stores `WalletInsight { riskScore, behaviorTag, summaryHash, updatedAt }` per address
- `MantleScopeAgent.sol` — ERC-8004 NFT with `incrementAchievement(tokenId)` called after every successful insight
- Read path: any Mantle contract can call `getWalletInsight(address)` for trustless AI risk scores

### 2. ERC-8004 Agent Identity
- `contracts/src/MantleScopeAgent.sol` (ERC-721 + ERC-8004 metadata)
- Token #0 = "MantleScope AI Oracle" with capabilities, AI model, mint timestamp, growing achievement counter
- UI: `<AgentBadge />` in sidebar reads on-chain metadata; full details on `/about`

### 3. Radical Transparency
- `lib/oracle-log.ts` — Redis LPUSH event log (max 100 entries)
- Every `analyzeWallet()`, `detectAnomalies()`, and `writeWalletInsight()` call pushes a structured event
- `/oracle` page polls `/api/oracle/log` every 5s, renders typed event stream with timestamps and tx links

---

## Data Flow: Wallet Profiler

```
User enters address
    │
    ▼
/api/insights?address=0x…
    │
    ├─► Redis cache check (TTL 1h)
    │      ▼ miss
    │   Mantlescan tokentx + txlist  ───► aggregate {txCount, counterparties, netMNTFlow}
    │      ▼
    │   Groq llama-3.3-70b-versatile  (JSON mode + Zod validation)
    │      ▼
    │   {riskScore, behaviorTag, summary, reasoning}
    │      ▼
    │   pushOracleEvent("ai_analysis")  ───► /oracle stream
    │      ▼
    │   Redis SET 1h
    │      ▼
    └─► Return to client

User clicks "Trigger On-Chain (0.001 MNT)" ──► wagmi writeContract
    │
    ▼
MantleScopeInsights.triggerAnalysis(wallet)  [user pays gas]
    │
    ▼ AnalysisRequested event emitted
    │
After confirmation, frontend auto-calls /api/onchain
    │
    ▼
Oracle wallet → MantleScopeInsights.writeWalletInsight(...)
    │
    ▼
Oracle wallet → MantleScopeAgent.incrementAchievement(0)  [reputation++]
    │
    ▼
pushOracleEvent("onchain_write") + tx hash → /oracle stream
    │
    ▼
Frontend wagmi useReadContract polls getWalletInsight() → shows on-chain record
```

---

## Data Flow: Anomaly Detection

```
Upstash QStash (every 15 min) OR first dashboard load (cold-cache fallback)
    │
    ▼
/api/cron/anomalies/status
    │
    ▼
Read top wallets from cache (mantle:wallets:top50:v2) — no extra API cost
    │
    ▼ for each wallet (parallel):
    Mantlescan txlist + tokentx (last 15 min)
    │
    ▼ compute:
    {address, txCount, volumeUSD (real, priced), direction (inflow/outflow/mixed)}
    │
    ▼ filter to active-only (txCount > 0 OR volumeUSD > 0)
    │
    ▼
Groq llama-3.3-70b-versatile  (JSON mode + Zod)
    │
    ▼
{anomalies: [{address, description, severity 1-3}]}
    │
    ▼
pushOracleEvent("anomaly_scan")  → /oracle stream
    │
    ▼
Redis SET mantle:anomalies:latest TTL 900s
```

---

## Data Flow: Bridge Inflow Tracker (unique data)

```
GET /api/data/bridge
    │
    ▼ Redis cache (TTL 10 min)
    │
    ▼ miss
    │
For each bridged token (USDT, USDC, WETH, WBTC) in parallel:
    Mantlescan tokentx with contractaddress=token AND address=L2StandardBridge (0x4200…0010)
    │
    ▼ filter outbound from bridge → recipients (= completed deposits)
    │
    ▼ apply USD prices, dedupe dust < $10
    │
Also fetch native MNT inflows via txlist on bridge address
    │
    ▼ aggregate by recipient → topRecipients
    │
    ▼
{totalInflowUSD, txCount, topRecipients, recentTransfers}
```

---

## Data Flow: AI Chat (streaming)

```
POST /api/chat (Vercel AI SDK)
    │
    ▼
Parallel cache reads:
  • mantle:tvl:snapshot       (DefiLlama protocol TVLs)
  • mantle:wallets:top50:v2   (with MantleScope Score)
  • mantle:anomalies:latest   (latest scan)
    │
    ▼
Inject as system prompt context
    │
    ▼
streamText({ model: groqProvider("llama-3.3-70b"), messages, system })
    │
    ▼
SSE stream → client (useChat hook)
```

---

## Component Structure

```
apps/web/
├── app/
│   ├── page.tsx                Dashboard (SSR with Suspense)
│   ├── wallets/                Smart Money table
│   ├── protocols/              Protocol health cards
│   ├── profiler/               Profiler with dual on-chain actions
│   ├── chat/                   Streaming chat
│   ├── oracle/                 Live activity log
│   ├── about/                  ERC-8004 badge + verified contracts
│   └── api/
│       ├── data/{tvl,dex,wallets,bridge,lending}/route.ts
│       ├── insights/route.ts          AI wallet analysis (cached 1h)
│       ├── chat/route.ts              Streaming chat with live context
│       ├── onchain/route.ts           Oracle bridge: AI → contract
│       ├── cron/anomalies/route.ts    QStash 15-min trigger
│       ├── cron/anomalies/status/...  First-load fallback scan
│       └── oracle/log/route.ts        Returns last 50 events
├── components/
│   ├── layout/             Navbar, Sidebar (with AgentBadge)
│   ├── ui/skeleton.tsx     Skeleton loaders for SSR fallbacks
│   ├── dashboard/          MetricCard, TVLChart, VolumeChart, AnomalyCard, BridgeInflowCard
│   ├── wallets/            SmartMoneyTable, WalletBadge
│   ├── chat/               ChatWindow (streaming)
│   └── AgentBadge.tsx      ERC-8004 NFT badge
└── lib/
    ├── mantle/             viem clients, contract ABIs/addresses
    ├── data/               mantlescan, defillama, bridge, walletData
    ├── ai/                 groq, prompts, schemas (Zod), analyzer
    ├── cache/redis.ts      Upstash wrapper (graceful degradation)
    ├── oracle-log.ts       Redis-backed event stream
    └── scoring.ts          Composite MantleScope Score (0-100)
```

---

## Caching Strategy

| Key | TTL | Source |
|---|---|---|
| `mantle:tvl:snapshot` | 5 min | DefiLlama chain TVL |
| `mantle:wallets:top50:v2` | 10 min | Multi-token wallet discovery + scoring |
| `mantle:bridge:inflow24h` | 10 min | Mantlescan tokentx on L2StandardBridge |
| `mantle:wallet:{addr}:ai` | 1 hour | Groq wallet analysis |
| `mantle:ai:protocols` | 30 min | Groq protocol health |
| `mantle:anomalies:latest` | 15 min | Groq anomaly scan |
| `mantle:anomalies:lastrun` | 15 min | Last scan timestamp |
| `mantle:oracle:log` | LRANGE/LTRIM (max 100) | Event stream |

---

## Smart Contract Design

### `MantleScopeInsights.sol` (Oracle)

Storage is gas-optimized: only compact uint types are stored on-chain; prose summaries are emitted as events (log reads are free, storage writes are expensive).

```solidity
struct WalletInsight {
  uint8   riskScore;     // 0-100
  uint8   behaviorTag;   // 0=unknown,1=accumulator,2=trader,3=bot,4=whale
  bytes32 summaryHash;   // keccak256 of full summary
  uint64  updatedAt;
}
struct ProtocolSnapshot {
  uint128 tvlUSD;
  uint128 volume24hUSD;
  uint8   healthScore;
  uint64  updatedAt;
}

event WalletInsightWritten(address indexed wallet, uint8 riskScore, uint8 behaviorTag, string summary);
event ProtocolSnapshotWritten(bytes32 indexed key, string name, uint8 healthScore, string summary);
event AnomalyDetected(address indexed wallet, uint8 severity, string description);
event AnalysisRequested(address indexed wallet, address indexed requester);  // user-triggered
```

### `MantleScopeAgent.sol` (ERC-8004)

```solidity
struct AgentMetadata {
  string  name;          // "MantleScope AI Oracle"
  string  capabilities;  // "wallet_analysis,protocol_health,anomaly_detection,..."
  string  aiModel;       // "groq/llama-3.3-70b-versatile"
  uint256 achievements;  // incremented per successful analysis
  uint64  mintedAt;
  bool    active;
}
```

Event flow:
- `mintAgent` → `AgentMinted(tokenId, name, capabilities, aiModel)`
- `incrementAchievement` → `AchievementIncremented(tokenId, total)` — called by oracle after every `writeWalletInsight`

---

## MantleScope Score (Composite, 0-100)

Six weighted on-chain signals — `lib/scoring.ts`:

| Signal | Weight | Source |
|---|---|---|
| Tx volume (capped at 500) | 20% | Mantlescan txlist |
| Counterparty diversity (capped at 100 unique) | 15% | Aggregate from txlist |
| Behavior classification | 20% | Heuristic tagging |
| Token diversity (capped at 5 distinct) | 15% | Mantlescan tokentx |
| Risk-adjusted engagement | 20% | (1 − risk/100) × activity |
| Counterparty ratio (unique/total) | 10% | Penalises loop bots |

This is genuinely unique to MantleScope — judges cannot find this on any explorer or DefiLlama.

---

## Failure Modes & Graceful Degradation

| Failure | Fallback |
|---|---|
| Mantlescan rate limit / 429 | Returns empty array; UI shows skeleton, no crash |
| Groq API timeout | 1× retry at temp=0; on 2nd failure → "unclassified" |
| Groq JSON validation error | Same retry path |
| Upstash Redis down | All cache reads return `null`, route still works (just slower) |
| RPC down (`rpc.mantle.xyz`) | viem retries; falls back to default if alternate RPC configured |
| Anomaly cron miss | First dashboard request triggers an in-line scan |
| Bridge API failure | Card shows "No bridge activity in last 24h" |
| Agent contract not deployed | `<AgentBadge />` returns null cleanly |
