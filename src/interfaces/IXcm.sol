// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title IXcm - Polkadot Hub XCM Precompile Interface
/// @notice Precompile at 0x00000000000000000000000000000000000a0000
/// @dev All messages must be SCALE-encoded. Use weighMessage before execute.
interface IXcm {
    struct Weight {
        uint64 refTime;
        uint64 proofSize;
    }

    /// @notice Execute an XCM message locally with the caller's origin
    /// @param message SCALE-encoded XCM message
    /// @param weight Execution weight (use weighMessage to estimate)
    function execute(bytes calldata message, Weight calldata weight) external;

    /// @notice Send an XCM message to another consensus system
    /// @param destination SCALE-encoded multilocation destination
    /// @param message SCALE-encoded XCM message
    function send(bytes calldata destination, bytes calldata message) external;

    /// @notice Estimate the weight required to execute an XCM message
    /// @param message SCALE-encoded XCM message
    /// @return weight The estimated refTime and proofSize
    function weighMessage(bytes calldata message) external view returns (Weight memory weight);
}
