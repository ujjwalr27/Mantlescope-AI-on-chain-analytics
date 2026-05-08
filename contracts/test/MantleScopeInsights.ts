import { expect } from "chai";
import { ethers } from "hardhat";
import { MantleScopeInsights } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("MantleScopeInsights", () => {
  let contract: MantleScopeInsights;
  let owner: HardhatEthersSigner;
  let oracle: HardhatEthersSigner;
  let user: HardhatEthersSigner;

  beforeEach(async () => {
    [owner, oracle, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MantleScopeInsights");
    contract = (await Factory.deploy(oracle.address)) as MantleScopeInsights;
    await contract.waitForDeployment();
  });

  describe("deployment", () => {
    it("sets owner and oracle correctly", async () => {
      expect(await contract.owner()).to.equal(owner.address);
      expect(await contract.oracle()).to.equal(oracle.address);
    });

    it("reverts with ZeroAddress if oracle is zero", async () => {
      const Factory = await ethers.getContractFactory("MantleScopeInsights");
      await expect(
        Factory.deploy(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(contract, "ZeroAddress");
    });
  });

  describe("writeWalletInsight", () => {
    it("stores insight and emits event", async () => {
      const wallet = user.address;
      const riskScore = 75;
      const behaviorTag = 4; // whale
      const summary = "High-value accumulator with consistent inflows.";
      const summaryHash = ethers.keccak256(ethers.toUtf8Bytes(summary));

      await expect(
        contract.connect(oracle).writeWalletInsight(wallet, riskScore, behaviorTag, summaryHash, summary)
      )
        .to.emit(contract, "WalletInsightWritten")
        .withArgs(wallet, riskScore, behaviorTag, summary);

      const stored = await contract.getWalletInsight(wallet);
      expect(stored.riskScore).to.equal(riskScore);
      expect(stored.behaviorTag).to.equal(behaviorTag);
      expect(stored.summaryHash).to.equal(summaryHash);
    });

    it("reverts if riskScore > 100", async () => {
      await expect(
        contract.connect(oracle).writeWalletInsight(user.address, 101, 0, ethers.ZeroHash, "")
      ).to.be.revertedWithCustomError(contract, "InvalidScore");
    });

    it("reverts if called by non-oracle", async () => {
      await expect(
        contract.connect(user).writeWalletInsight(user.address, 50, 0, ethers.ZeroHash, "")
      ).to.be.revertedWithCustomError(contract, "OnlyOracle");
    });
  });

  describe("writeProtocolSnapshot", () => {
    it("stores snapshot and emits event", async () => {
      const name = "agni";
      const tvl = ethers.parseUnits("5000000", 6); // $5M
      const vol = ethers.parseUnits("800000", 6);  // $800k
      const health = 82;
      const summary = "Healthy liquidity with growing volume.";

      await expect(
        contract.connect(oracle).writeProtocolSnapshot(name, tvl, vol, health, summary)
      ).to.emit(contract, "ProtocolSnapshotWritten");

      const stored = await contract.getProtocolSnapshot(name);
      expect(stored.tvlUSD).to.equal(tvl);
      expect(stored.healthScore).to.equal(health);
    });

    it("reverts if healthScore > 100", async () => {
      await expect(
        contract.connect(oracle).writeProtocolSnapshot("agni", 0n, 0n, 101, "")
      ).to.be.revertedWithCustomError(contract, "InvalidScore");
    });
  });

  describe("writeAnomalyAlert", () => {
    it("emits AnomalyDetected event", async () => {
      await expect(
        contract.connect(oracle).writeAnomalyAlert(user.address, 2, "Unusual spike in outflows")
      )
        .to.emit(contract, "AnomalyDetected")
        .withArgs(user.address, 2, "Unusual spike in outflows");
    });

    it("reverts on invalid severity", async () => {
      await expect(
        contract.connect(oracle).writeAnomalyAlert(user.address, 0, "")
      ).to.be.revertedWithCustomError(contract, "InvalidSeverity");
      await expect(
        contract.connect(oracle).writeAnomalyAlert(user.address, 4, "")
      ).to.be.revertedWithCustomError(contract, "InvalidSeverity");
    });
  });

  describe("triggerAnalysis", () => {
    it("emits AnalysisRequested event", async () => {
      await expect(contract.connect(user).triggerAnalysis(user.address))
        .to.emit(contract, "AnalysisRequested")
        .withArgs(user.address, user.address);
    });

    it("reverts for zero wallet address", async () => {
      await expect(
        contract.connect(user).triggerAnalysis(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(contract, "ZeroAddress");
    });
  });

  describe("governance", () => {
    it("allows owner to rotate oracle", async () => {
      await expect(contract.connect(owner).setOracleAddress(user.address))
        .to.emit(contract, "OracleUpdated")
        .withArgs(oracle.address, user.address);
      expect(await contract.oracle()).to.equal(user.address);
    });

    it("reverts if non-owner tries to set oracle", async () => {
      await expect(
        contract.connect(user).setOracleAddress(user.address)
      ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
    });

    it("allows owner to withdraw ETH", async () => {
      await user.sendTransaction({ to: await contract.getAddress(), value: ethers.parseEther("1") });
      const before = await ethers.provider.getBalance(owner.address);
      await contract.connect(owner).withdraw();
      const after = await ethers.provider.getBalance(owner.address);
      expect(after).to.be.gt(before);
    });
  });
});
