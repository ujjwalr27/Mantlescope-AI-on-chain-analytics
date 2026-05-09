import { ethers, network, run } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log(`Network:  ${network.name} (chainId ${network.config.chainId})`);
  console.log(`Deployer: ${deployer.address}`);

  const Factory = await ethers.getContractFactory("MantleScopeAgent");
  const agent = await Factory.deploy();
  await agent.waitForDeployment();

  const address = await agent.getAddress();
  console.log(`\nMantleScopeAgent deployed to: ${address}`);
  console.log(`Add to .env.local: NEXT_PUBLIC_AGENT_CONTRACT=${address}`);
  console.log(`\nNext step: AGENT_CONTRACT=${address} pnpm hardhat run scripts/mintAgent.ts --network ${network.name}`);

  // Auto-verify on supported networks
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("\nWaiting 10s for explorer to index the contract...");
    await new Promise((r) => setTimeout(r, 10_000));
    try {
      await run("verify:verify", {
        address,
        constructorArguments: [],
      });
      console.log("Contract verified on Mantlescan.");
    } catch (e: unknown) {
      if (e instanceof Error && e.message.includes("Already Verified")) {
        console.log("Already verified.");
      } else {
        console.warn("Verification failed:", e);
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
