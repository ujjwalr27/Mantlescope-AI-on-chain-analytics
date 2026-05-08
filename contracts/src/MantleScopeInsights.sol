// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MantleScopeInsights
 * @notice AI oracle that stores wallet risk scores and protocol health metrics on Mantle Network.
 *         Prose summaries are emitted as events (cheap); only compact structs go to storage.
 *         Anyone can call triggerAnalysis() to request an AI analysis for any wallet.
 *         The designated oracle EOA writes back results via writeWalletInsight().
 */
contract MantleScopeInsights is Ownable, ReentrancyGuard {
    // ─── Structs ────────────────────────────────────────────────────────────

    struct WalletInsight {
        uint8 riskScore;     // 0–100, AI-computed risk level
        uint8 behaviorTag;   // 0=unknown 1=accumulator 2=trader 3=bot 4=whale
        bytes32 summaryHash; // keccak256 of off-chain AI summary
        uint64 updatedAt;    // block.timestamp of last update
    }

    struct ProtocolSnapshot {
        uint128 tvlUSD;       // TVL in USD * 1e6
        uint128 volume24hUSD; // 24h volume in USD * 1e6
        uint8 healthScore;    // 0–100, AI-computed health score
        uint64 updatedAt;
    }

    // ─── State ──────────────────────────────────────────────────────────────

    address public oracle;

    mapping(address => WalletInsight) public walletInsights;
    mapping(bytes32 => ProtocolSnapshot) public protocolSnapshots; // key = keccak256(name)

    // ─── Events ─────────────────────────────────────────────────────────────

    event WalletInsightWritten(
        address indexed wallet,
        uint8 riskScore,
        uint8 behaviorTag,
        string summary
    );

    event ProtocolSnapshotWritten(
        bytes32 indexed protocolKey,
        string name,
        uint8 healthScore,
        string aiSummary
    );

    event AnomalyDetected(
        address indexed wallet,
        uint8 severity, // 1=low 2=medium 3=high
        string description
    );

    event AnalysisRequested(
        address indexed wallet,
        address indexed requester
    );

    event OracleUpdated(address indexed previous, address indexed next);

    // ─── Errors ─────────────────────────────────────────────────────────────

    error OnlyOracle();
    error ZeroAddress();
    error InvalidScore();
    error InvalidSeverity();

    // ─── Modifiers ──────────────────────────────────────────────────────────

    modifier onlyOracle() {
        if (msg.sender != oracle) revert OnlyOracle();
        _;
    }

    // ─── Constructor ────────────────────────────────────────────────────────

    constructor(address _oracle) Ownable(msg.sender) {
        if (_oracle == address(0)) revert ZeroAddress();
        oracle = _oracle;
    }

    // ─── Oracle write functions ──────────────────────────────────────────────

    /**
     * @notice Write AI-generated wallet insight. Stores compact data; emits full summary.
     */
    function writeWalletInsight(
        address wallet,
        uint8 riskScore,
        uint8 behaviorTag,
        bytes32 summaryHash,
        string calldata summary
    ) external onlyOracle {
        if (riskScore > 100) revert InvalidScore();

        walletInsights[wallet] = WalletInsight({
            riskScore: riskScore,
            behaviorTag: behaviorTag,
            summaryHash: summaryHash,
            updatedAt: uint64(block.timestamp)
        });

        emit WalletInsightWritten(wallet, riskScore, behaviorTag, summary);
    }

    /**
     * @notice Write AI-generated protocol health snapshot.
     */
    function writeProtocolSnapshot(
        string calldata name,
        uint128 tvlUSD,
        uint128 volume24hUSD,
        uint8 healthScore,
        string calldata aiSummary
    ) external onlyOracle {
        if (healthScore > 100) revert InvalidScore();

        bytes32 key = keccak256(bytes(name));
        protocolSnapshots[key] = ProtocolSnapshot({
            tvlUSD: tvlUSD,
            volume24hUSD: volume24hUSD,
            healthScore: healthScore,
            updatedAt: uint64(block.timestamp)
        });

        emit ProtocolSnapshotWritten(key, name, healthScore, aiSummary);
    }

    /**
     * @notice Emit an anomaly alert detected by the AI oracle.
     */
    function writeAnomalyAlert(
        address wallet,
        uint8 severity,
        string calldata description
    ) external onlyOracle {
        if (severity == 0 || severity > 3) revert InvalidSeverity();
        emit AnomalyDetected(wallet, severity, description);
    }

    // ─── Public trigger function ─────────────────────────────────────────────

    /**
     * @notice Anyone can request an AI analysis for any wallet address.
     *         The oracle backend listens for AnalysisRequested events and fulfills them.
     *         Fee is optional (set to 0 for hackathon demo); owner can withdraw.
     */
    function triggerAnalysis(address wallet) external payable nonReentrant {
        if (wallet == address(0)) revert ZeroAddress();
        emit AnalysisRequested(wallet, msg.sender);
    }

    // ─── Read functions ──────────────────────────────────────────────────────

    function getWalletInsight(address wallet) external view returns (WalletInsight memory) {
        return walletInsights[wallet];
    }

    function getProtocolSnapshot(string calldata name) external view returns (ProtocolSnapshot memory) {
        return protocolSnapshots[keccak256(bytes(name))];
    }

    // ─── Governance ─────────────────────────────────────────────────────────

    function setOracleAddress(address newOracle) external onlyOwner {
        if (newOracle == address(0)) revert ZeroAddress();
        emit OracleUpdated(oracle, newOracle);
        oracle = newOracle;
    }

    function withdraw() external onlyOwner nonReentrant {
        (bool ok, ) = owner().call{value: address(this).balance}("");
        require(ok, "withdraw failed");
    }

    receive() external payable {}
}
