// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {
    ReentrancyGuard
} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title SolverRegistry - Solver staking with native DOT
/// @notice Solvers stake DOT to participate in intent filling.
///         Failed fills can be slashed. Uses native value (msg.value) for DOT.
contract SolverRegistry is ReentrancyGuard {
    uint256 public constant MIN_STAKE = 0.1 ether; // 0.1 DOT minimum
    uint256 public constant SLASH_PERCENT = 10; // 10% slash for failed fills
    uint256 public constant UNSTAKE_DELAY = 1 hours;

    struct SolverInfo {
        uint256 staked;
        uint256 unstakeRequestTime;
        uint256 unstakeAmount;
    }

    mapping(address => SolverInfo) public solvers;
    address public reactor;
    address public owner;

    event SolverStaked(address indexed solver, uint256 amount, uint256 total);
    event UnstakeRequested(address indexed solver, uint256 amount, uint256 availableAt);
    event SolverUnstaked(address indexed solver, uint256 amount);
    event SolverSlashed(address indexed solver, uint256 amount);

    error NotOwner();
    error NotReactor();
    error InsufficientStake();
    error NoUnstakeRequest();
    error UnstakeDelayNotMet();
    error InsufficientBalance();
    error TransferFailed();
    error ZeroAmount();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyReactor() {
        if (msg.sender != reactor) revert NotReactor();
        _;
    }

    constructor(address _reactor) {
        owner = msg.sender;
        reactor = _reactor;
    }

    function setReactor(address _reactor) external onlyOwner {
        reactor = _reactor;
    }

    /// @notice Stake native DOT to become an active solver
    function stake() external payable {
        if (msg.value == 0) revert ZeroAmount();

        solvers[msg.sender].staked += msg.value;

        emit SolverStaked(msg.sender, msg.value, solvers[msg.sender].staked);
    }

    /// @notice Request to unstake. Funds available after UNSTAKE_DELAY.
    function requestUnstake(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        SolverInfo storage info = solvers[msg.sender];
        if (info.staked < amount) revert InsufficientBalance();

        info.staked -= amount;
        info.unstakeAmount += amount;
        info.unstakeRequestTime = block.timestamp;

        emit UnstakeRequested(
            msg.sender,
            amount,
            block.timestamp + UNSTAKE_DELAY
        );
    }

    /// @notice Withdraw unstaked funds after the delay period
    function withdraw() external nonReentrant {
        SolverInfo storage info = solvers[msg.sender];
        if (info.unstakeAmount == 0) revert NoUnstakeRequest();
        if (block.timestamp < info.unstakeRequestTime + UNSTAKE_DELAY) {
            revert UnstakeDelayNotMet();
        }

        uint256 amount = info.unstakeAmount;
        info.unstakeAmount = 0;
        info.unstakeRequestTime = 0;

        (bool success, ) = msg.sender.call{value: amount}("");
        if (!success) revert TransferFailed();

        emit SolverUnstaked(msg.sender, amount);
    }

    /// @notice Slash a solver for a failed fill. Called by the reactor.
    function slash(address solver) external onlyReactor {
        SolverInfo storage info = solvers[solver];
        uint256 slashAmount = (info.staked * SLASH_PERCENT) / 100;
        if (slashAmount > info.staked) {
            slashAmount = info.staked;
        }
        info.staked -= slashAmount;

        // Slashed funds go to the contract (could be distributed to makers later)
        emit SolverSlashed(solver, slashAmount);
    }

    /// @notice Check if a solver has minimum stake to participate
    function isActiveSolver(address solver) external view returns (bool) {
        return solvers[solver].staked >= MIN_STAKE;
    }

    /// @notice Get a solver's current stake
    function getStake(address solver) external view returns (uint256) {
        return solvers[solver].staked;
    }
}
