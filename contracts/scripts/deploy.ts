import { ethers, network, run } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const oracleAddress = process.env.ORACLE_ADDRESS ?? deployer.address;

  console.log(`Network:  ${network.name} (chainId ${network.config.chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Oracle:   ${oracleAddress}`);

  const Factory = await ethers.getContractFactory("MantleScopeInsights");
  const contract = await Factory.deploy(oracleAddress);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`\nMantleScopeInsights deployed to: ${address}`);
  console.log(`\nVerify with:`);
  console.log(`  pnpm --filter contracts verify:testnet ${address} "${oracleAddress}"`);

  // Auto-verify on supported networks
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("\nWaiting 10s for explorer to index the contract...");
    await new Promise((r) => setTimeout(r, 10_000));
    try {
      await run("verify:verify", {
        address,
        constructorArguments: [oracleAddress],
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
