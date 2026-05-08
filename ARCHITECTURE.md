# MantleScope — Architecture

## System Overview

```
User Browser
    │
    ├── Next.js Frontend (Vercel)
    │       ├── /             Dashboard
    │       ├── /wallets      Smart Money Leaderboard
    │       ├── /protocols    Protocol Health
    │       ├── /profiler     Wallet Profiler + Write-to-Chain
    │       └── /chat         AI Streaming Chat
    │
    └── Next.js API Routes (serverless)
            ├── /api/data/tvl       → DefiLlama
            ├── /api/data/dex       → Goldsky subgraphs
            ├── /api/data/lending   → viem RPC → Lendle/Aurelius
            ├── /api/data/wallets   → Mantlescan/Etherscan v2 → Blockscout (fallback)
            ├── /api/insights       → Groq analysis (cached 1h in Redis)
            ├── /api/chat           → Groq streaming
            ├── /api/onchain        → Oracle writes to MantleScopeInsights contract
            └── /api/cron/anomalies → QStash 15-min trigger → Groq anomaly scan
                                                              └── Redis cache update
```

## Data Flow: Wallet Profiler

```
User enters address
    → /api/insights?address=0x...
    → Redis cache check (TTL 1h)
    → Miss: Mantlescan tokentx + txlist (fallback: Blockscout)
    → Aggregate: txCount, uniqueCounterparties, netMNTFlow, protocols
    → Groq llama-3.3-70b-versatile (JSON mode + Zod validation)
    → { riskScore, behaviorTag, summary, reasoning }
    → Redis SET 1h
    → Return to client
    → User clicks "Write to Chain"
    → /api/onchain POST
    → Oracle wallet writeWalletInsight() → MantleScopeInsights.sol
    → Event: WalletInsightWritten(wallet, score, tag, summary)
    → Frontend wagmi useReadContract polls getWalletInsight()
    → Display on-chain record with tx hash link
```

## Data Flow: Anomaly Detection

```
Upstash QStash (every 15 min)
    → POST /api/cron/anomalies (signature verified)
    → Fetch last 15 min txs for tracked wallets (Mantlescan)
    → Build activity delta snapshot
    → Groq llama-3.3-70b-versatile anomaly detection prompt
    → { anomalies: [{address, description, severity}] }
    → Redis SET mantle:anomalies:latest TTL 900s
    → AI Chat context reads this cache at conversation start
```

## Component Structure

```
apps/web/
├── app/                    # Next.js App Router pages + API routes
├── components/
│   ├── layout/             # Navbar, Sidebar
│   ├── dashboard/          # MetricCard, TVLChart, VolumeChart
│   ├── wallets/            # SmartMoneyTable, WalletBadge
│   ├── profiler/           # (inline in page.tsx)
│   └── chat/               # ChatWindow (streaming)
└── lib/
    ├── mantle/             # viem client, contract ABIs/addresses
    ├── data/               # mantlescan.ts, blockscout.ts, defillama.ts, walletData.ts
    ├── subgraph/           # agni.ts, merchantMoe.ts (Goldsky GraphQL)
    ├── ai/                 # groq.ts, prompts.ts, schemas.ts, analyzer.ts
    └── cache/              # redis.ts (Upstash wrapper)
```

## Caching Strategy

| Key | TTL | Source |
|---|---|---|
| `mantle:tvl:snapshot` | 5 min | DefiLlama |
| `mantle:dex:combined` | 5 min | Goldsky |
| `mantle:lending:combined` | 10 min | viem RPC |
| `mantle:wallets:top50` | 5 min | Mantlescan |
| `mantle:wallet:{addr}:ai` | 1 hour | Groq |
| `mantle:ai:protocols` | 30 min | Groq |
| `mantle:anomalies:latest` | 15 min | Groq |

## Smart Contract Design

Storage is gas-optimized: only compact uint types are stored on-chain; prose summaries are emitted as events (reads from logs are free, storage writes are expensive).

```
WalletInsight { riskScore u8, behaviorTag u8, summaryHash bytes32, updatedAt u64 }
ProtocolSnapshot { tvlUSD u128, volume24hUSD u128, healthScore u8, updatedAt u64 }

Events (prose storage):
  WalletInsightWritten(wallet, score, tag, summary)
  ProtocolSnapshotWritten(key, name, score, summary)
  AnomalyDetected(wallet, severity, description)
  AnalysisRequested(wallet, requester)   ← user-callable trigger
```
