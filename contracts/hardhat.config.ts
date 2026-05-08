import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import * as dotenv from "dotenv";

dotenv.config();

const PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY ?? "0x" + "0".repeat(64);

const config: HardhatUserConfig = {
  paths: {
    sources: "./src",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },
  networks: {
    mantleSepolia: {
      url: "https://rpc.sepolia.mantle.xyz",
      chainId: 5003,
      accounts: [PRIVATE_KEY],
    },
    mantle: {
      url: "https://rpc.mantle.xyz",
      chainId: 5000,
      accounts: [PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY ?? "",
    customChains: [
      {
        network: "mantleSepolia",
        chainId: 5003,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=5003",
          browserURL: "https://sepolia.mantlescan.xyz",
        },
      },
      {
        network: "mantle",
        chainId: 5000,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=5000",
          browserURL: "https://mantlescan.xyz",
        },
      },
    ],
  },
  sourcify: { enabled: false },
};

export default config;
