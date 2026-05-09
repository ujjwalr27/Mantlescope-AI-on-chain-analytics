// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MantleScopeAgent
 * @notice ERC-721 + ERC-8004 Agent Identity NFT for the MantleScope AI Oracle.
 *
 * ERC-8004 (AI Agent Identity Standard) extends ERC-721 with on-chain
 * metadata describing an AI agent's capabilities, model, and achievements.
 * This satisfies the hackathon's "defining feature #2: ERC 8004 agent identity".
 *
 * Each NFT represents a unique AI agent. The oracle address may increment
 * the achievement counter after each successful analysis, creating a
 * verifiable on-chain reputation trail.
 */
contract MantleScopeAgent is ERC721, Ownable {
    // ── ERC-8004 Agent Metadata ──────────────────────────────────────────────
    struct AgentMetadata {
        string name;
        string capabilities;   // comma-separated list e.g. "wallet_analysis,anomaly_detection"
        string aiModel;         // e.g. "groq/llama-3.3-70b-versatile"
        uint256 achievements;  // incremented after each successful on-chain analysis
        uint64  mintedAt;      // unix timestamp
        bool    active;        // can be deactivated by owner (e.g. model retirement)
    }

    // tokenId → metadata
    mapping(uint256 => AgentMetadata) public agentMetadata;

    // Address authorised to increment achievements (= oracle EOA)
    address public oracle;

    uint256 private _nextTokenId;

    // ── Events ───────────────────────────────────────────────────────────────
    event AgentMinted(
        uint256 indexed tokenId,
        string  name,
        string  capabilities,
        string  aiModel
    );
    event AchievementIncremented(uint256 indexed tokenId, uint256 total);
    event OracleUpdated(address indexed newOracle);
    event AgentStatusChanged(uint256 indexed tokenId, bool active);

    // ── Modifiers ─────────────────────────────────────────────────────────────
    modifier onlyOracle() {
        require(msg.sender == oracle || msg.sender == owner(), "Not oracle");
        _;
    }

    constructor() ERC721("MantleScopeAgent", "MSA") Ownable(msg.sender) {}

    // ── Owner / Oracle Admin ──────────────────────────────────────────────────

    function setOracle(address _oracle) external onlyOwner {
        oracle = _oracle;
        emit OracleUpdated(_oracle);
    }

    /**
     * @notice Mint a new AI agent NFT (only owner — one per deployment is the intent).
     */
    function mintAgent(
        string calldata name,
        string calldata capabilities,
        string calldata aiModel
    ) external onlyOwner returns (uint256 tokenId) {
        tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        agentMetadata[tokenId] = AgentMetadata({
            name:         name,
            capabilities: capabilities,
            aiModel:      aiModel,
            achievements: 0,
            mintedAt:     uint64(block.timestamp),
            active:       true
        });
        emit AgentMinted(tokenId, name, capabilities, aiModel);
    }

    /**
     * @notice Called by the oracle after each successful analysis cycle.
     *         Increments the achievement counter, building on-chain reputation.
     */
    function incrementAchievement(uint256 tokenId) external onlyOracle {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        agentMetadata[tokenId].achievements += 1;
        emit AchievementIncremented(tokenId, agentMetadata[tokenId].achievements);
    }

    /**
     * @notice Deactivate / reactivate an agent (e.g. when switching AI models).
     */
    function setAgentActive(uint256 tokenId, bool active) external onlyOwner {
        agentMetadata[tokenId].active = active;
        emit AgentStatusChanged(tokenId, active);
    }

    // ── ERC-8004 View Helpers ─────────────────────────────────────────────────

    /**
     * @notice Returns the full metadata struct for a given agent token.
     *         Satisfies the ERC-8004 "getAgentMetadata" interface.
     */
    function getAgentMetadata(uint256 tokenId)
        external
        view
        returns (
            string memory name,
            string memory capabilities,
            string memory aiModel,
            uint256 achievements,
            uint64  mintedAt,
            bool    active
        )
    {
        AgentMetadata storage m = agentMetadata[tokenId];
        return (m.name, m.capabilities, m.aiModel, m.achievements, m.mintedAt, m.active);
    }

    /**
     * @notice Returns total number of agents minted.
     */
    function totalAgents() external view returns (uint256) {
        return _nextTokenId;
    }
}
