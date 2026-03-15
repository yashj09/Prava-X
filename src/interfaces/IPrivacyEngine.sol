// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title IPrivacyEngine - Interface to the Rust PVM Privacy Engine
/// @notice Cross-VM interface: Solidity calls this, PVM dispatches to Rust contract
/// @dev The Rust contract matches these exact selectors via keccak256 of signatures
interface IPrivacyEngine {
    /// @notice Compute a blake2s commitment over intent parameters
    /// @param sellAsset The asset being sold (address padded to bytes32)
    /// @param sellAmount The amount being sold
    /// @param buyAsset The asset being bought (address padded to bytes32)
    /// @param minBuyAmount The minimum acceptable buy amount
    /// @param salt Random salt for commitment hiding
    /// @return commitment The blake2s hash commitment
    function computeCommitment(
        bytes32 sellAsset,
        uint256 sellAmount,
        bytes32 buyAsset,
        uint256 minBuyAmount,
        bytes32 salt
    ) external view returns (bytes32 commitment);

    /// @notice Verify that revealed parameters match a previously stored commitment
    /// @param commitment The expected commitment hash
    /// @param sellAsset The revealed sell asset
    /// @param sellAmount The revealed sell amount
    /// @param buyAsset The revealed buy asset
    /// @param minBuyAmount The revealed minimum buy amount
    /// @param salt The revealed salt
    /// @return valid True if the commitment matches the parameters
    function verifyCommitment(
        bytes32 commitment,
        bytes32 sellAsset,
        uint256 sellAmount,
        bytes32 buyAsset,
        uint256 minBuyAmount,
        bytes32 salt
    ) external view returns (bool valid);

    /// @notice Compute a Pedersen commitment on the JubJub curve: C = value*G + blinding*H
    /// @dev Returns x-coordinate of the curve point (big-endian bytes32)
    /// @param value The value to commit to
    /// @param blinding The blinding factor for hiding
    /// @return commitment The x-coordinate of the Pedersen commitment point
    function pedersenCommit(
        uint256 value,
        uint256 blinding
    ) external view returns (bytes32 commitment);

    /// @notice Verify a Pedersen commitment by recomputing and comparing
    /// @param expected The expected commitment (x-coordinate)
    /// @param value The claimed value
    /// @param blinding The claimed blinding factor
    /// @return valid True if the recomputed commitment matches expected
    function verifyPedersenCommitment(
        bytes32 expected,
        uint256 value,
        uint256 blinding
    ) external view returns (bool valid);
}
