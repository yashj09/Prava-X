// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {
    ReentrancyGuard
} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title EscrowVault - Holds funds for cross-chain intent settlements
/// @notice Locks maker funds during cross-chain fills. Supports timeout refunds.
contract EscrowVault is ReentrancyGuard {
    using SafeERC20 for IERC20;
    struct Escrow {
        address maker;
        address filler;
        address asset;
        uint256 amount;
        uint256 deadline;
        bool settled;
    }

    mapping(bytes32 intentHash => Escrow) public escrows;
    address public reactor;

    error OnlyReactor();
    error EscrowAlreadyExists();
    error EscrowNotFound();
    error EscrowAlreadySettled();
    error DeadlineNotReached();
    error DeadlineReached();

    modifier onlyReactor() {
        if (msg.sender != reactor) revert OnlyReactor();
        _;
    }

    constructor(address _reactor) {
        reactor = _reactor;
    }

    /// @notice Lock funds for a cross-chain intent
    /// @param intentHash The unique hash identifying this intent
    /// @param maker The intent maker whose funds are locked
    /// @param filler The solver filling the intent
    /// @param asset The asset being locked
    /// @param amount The amount being locked
    /// @param deadline Timeout for the escrow
    function lock(
        bytes32 intentHash,
        address maker,
        address filler,
        address asset,
        uint256 amount,
        uint256 deadline
    ) external onlyReactor {
        if (escrows[intentHash].amount != 0) revert EscrowAlreadyExists();

        escrows[intentHash] = Escrow({
            maker: maker,
            filler: filler,
            asset: asset,
            amount: amount,
            deadline: deadline,
            settled: false
        });
    }

    /// @notice Release escrowed funds to the filler after successful cross-chain fill
    /// @param intentHash The intent hash to settle
    function release(bytes32 intentHash) external onlyReactor nonReentrant {
        Escrow storage escrow = escrows[intentHash];
        if (escrow.amount == 0) revert EscrowNotFound();
        if (escrow.settled) revert EscrowAlreadySettled();
        if (block.timestamp > escrow.deadline) revert DeadlineReached();

        escrow.settled = true;
        IERC20(escrow.asset).safeTransfer(escrow.filler, escrow.amount);
    }

    /// @notice Refund escrowed funds to maker if deadline has passed without settlement
    /// @param intentHash The intent hash to refund
    function refund(bytes32 intentHash) external nonReentrant {
        Escrow storage escrow = escrows[intentHash];
        if (escrow.amount == 0) revert EscrowNotFound();
        if (escrow.settled) revert EscrowAlreadySettled();
        if (block.timestamp <= escrow.deadline) revert DeadlineNotReached();

        escrow.settled = true;
        IERC20(escrow.asset).safeTransfer(escrow.maker, escrow.amount);
    }
}
