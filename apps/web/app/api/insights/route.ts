import { NextRequest, NextResponse } from "next/server";
import { getWalletActivity } from "@/lib/data/walletData";
import { getAllProtocolTvls } from "@/lib/data/defillama";
import { analyzeWallet, analyzeProtocols } from "@/lib/ai/analyzer";
import { cacheGet, cacheSet } from "@/lib/cache/redis";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const address = searchParams.get("address");
  const type = searchParams.get("type") ?? "wallet";

  // Protocol health analysis
  if (type === "protocol") {
    const cacheKey = "mantle:ai:protocols";
    const cached = await cacheGet(cacheKey);
    if (cached) return NextResponse.json(cached);

    const protocols = await getAllProtocolTvls();
    const result = await analyzeProtocols(protocols);
    await cacheSet(cacheKey, result, 1800);
    return NextResponse.json(result);
  }

  // Wallet analysis
  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return NextResponse.json({ error: "Valid address required" }, { status: 400 });
  }

  const cacheKey = `mantle:wallet:${address.toLowerCase()}:ai:v2`; // v2: includes entity labels
  const cached = await cacheGet(cacheKey);
  if (cached) return NextResponse.json(cached);

  const activity = await getWalletActivity(address);
  const result = await analyzeWallet(activity);

  const payload = {
    ...result,
    selfLabel: activity.selfLabel,
    labeledCounterparties: activity.labeledCounterparties,
  };

  await cacheSet(cacheKey, payload, 3600);
  return NextResponse.json(payload);
}
