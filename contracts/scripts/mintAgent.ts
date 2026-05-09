/**
 * Mint the MantleScope AI Oracle agent NFT (token #0).
 * Run AFTER deployAgent.ts and set AGENT_CONTRACT env var.
 *
 * Usage:
 *   AGENT_CONTRACT=0x... pnpm hardhat run scripts/mintAgent.ts --network mantleSepolia
 */
import { ethers, network } from "hardhat";

const AGENT_CONTRACT = process.env.AGENT_CONTRACT ?? "0xE6c9493561cA5d2ef322F0AFdd24B3dCE030944d";

const AGENT_NAME = "MantleScope AI Oracle";
const CAPABILITIES =
  "wallet_analysis,protocol_health,anomaly_detection,trend_prediction,bridge_tracking";
const AI_MODEL = "groq/llama-3.3-70b-versatile";

async function main() {
  if (!AGENT_CONTRACT) {
    throw new Error("Set AGENT_CONTRACT env var to the deployed MantleScopeAgent address");
  }

  const [deployer] = await ethers.getSigners();
  console.log(`Network:  ${network.name}`);
  console.log(`Minter:   ${deployer.address}`);
  console.log(`Contract: ${AGENT_CONTRACT}`);

  const agent = await ethers.getContractAt("MantleScopeAgent", AGENT_CONTRACT);
  const tx = await agent.mintAgent(AGENT_NAME, CAPABILITIES, AI_MODEL);
  const receipt = await tx.wait();

  console.log(`\nAgent minted! Tx: ${receipt?.hash}`);
  console.log(`Token #0 → ${AGENT_NAME}`);
  console.log(`Capabilities: ${CAPABILITIES}`);
  console.log(`Model: ${AI_MODEL}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
