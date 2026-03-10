// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title IERC20Asset - Polkadot Hub Native Asset ERC20 Precompile Interface
/// @notice Each native asset has a deterministic precompile address derived from its asset ID
/// @dev Address format: 0x[assetId (8 hex)][24 zeros][prefix (8 hex)]
///      Example: Asset ID 1984 (USDT) -> 0x000007C000000000000000000000000001200000
///      NOTE: name(), symbol(), decimals() are NOT supported by this precompile
interface IERC20Asset {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}
