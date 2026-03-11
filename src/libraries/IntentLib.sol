// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title IntentLib - EIP-712 intent definitions and Dutch auction math
library IntentLib {
    struct Intent {
        address maker;
        address sellAsset;
        uint256 sellAmount;
        address buyAsset;
        uint256 minBuyAmount;
        uint256 startBuyAmount;
        uint256 deadline;
        uint256 decayStartTime;
        uint256 nonce;
        address exclusiveFiller;
    }

    bytes32 internal constant INTENT_TYPEHASH = keccak256(
        "Intent(address maker,address sellAsset,uint256 sellAmount,address buyAsset,uint256 minBuyAmount,uint256 startBuyAmount,uint256 deadline,uint256 decayStartTime,uint256 nonce,address exclusiveFiller)"
    );

    /// @notice Hash an intent struct for EIP-712 signing
    function hash(Intent calldata intent) internal pure returns (bytes32) {
        return keccak256(
            abi.encode(
                INTENT_TYPEHASH,
                intent.maker,
                intent.sellAsset,
                intent.sellAmount,
                intent.buyAsset,
                intent.minBuyAmount,
                intent.startBuyAmount,
                intent.deadline,
                intent.decayStartTime,
                intent.nonce,
                intent.exclusiveFiller
            )
        );
    }

    /// @notice Calculate the current buy amount based on Dutch auction decay
    /// @dev Linear decay from startBuyAmount to minBuyAmount over the decay period
    /// @param intent The intent with decay parameters
    /// @return currentBuyAmount The current price the filler must provide
    function currentPrice(Intent calldata intent) internal view returns (uint256) {
        if (block.timestamp <= intent.decayStartTime) {
            return intent.startBuyAmount;
        }

        if (block.timestamp >= intent.deadline) {
            return intent.minBuyAmount;
        }

        uint256 elapsed = block.timestamp - intent.decayStartTime;
        uint256 duration = intent.deadline - intent.decayStartTime;
        uint256 priceDrop = intent.startBuyAmount - intent.minBuyAmount;

        // Linear decay: startPrice - (priceDrop * elapsed / duration)
        uint256 decay = (priceDrop * elapsed) / duration;
        return intent.startBuyAmount - decay;
    }
}
