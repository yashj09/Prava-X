// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {
    ReentrancyGuard
} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {
    SafeERC20,
    IERC20
} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IntentLib} from "./libraries/IntentLib.sol";
import {IXcm} from "./interfaces/IXcm.sol";

interface IEscrowVault {
    function lock(
        bytes32 intentHash,
        address maker,
        address filler,
        address asset,
        uint256 amount,
        uint256 deadline
    ) external;
}

contract IntentReactor is EIP712, ReentrancyGuard {
    using IntentLib for IntentLib.Intent;
    using SafeERC20 for IERC20;

    // --- Constants ---
    IXcm public constant XCM_PRECOMPILE =
        IXcm(0x00000000000000000000000000000000000a0000);

    // --- State ---
    mapping(address maker => mapping(uint256 nonce => bool used))
        public nonceUsed;
    address public escrowVault;
    address public owner;

    // --- Events ---
    event IntentFilled(
        bytes32 indexed intentHash,
        address indexed maker,
        address indexed filler,
        address sellAsset,
        uint256 sellAmount,
        address buyAsset,
        uint256 buyAmount
    );

    event IntentCancelled(address indexed maker, uint256 nonce);

    event IntentInitiatedXCM(
        bytes32 indexed intentHash,
        address indexed maker,
        address indexed filler,
        bytes xcmDestination
    );

    // --- Errors ---
    error IntentExpired();
    error NonceAlreadyUsed();
    error InvalidSignature();
    error InsufficientOutput();
    error ExclusiveFillerViolation();
    error EscrowNotSet();
    error NotOwner();
    error ZeroAddress();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor() EIP712("XCMIntents", "1") {
        owner = msg.sender;
    }

    /// @notice Set the escrow vault address for cross-chain fills
    /// @param _escrowVault Address of the EscrowVault contract
    function setEscrowVault(address _escrowVault) external onlyOwner {
        if (_escrowVault == address(0)) revert ZeroAddress();
        escrowVault = _escrowVault;
    }

    /// @notice Fill a same-chain intent by providing the required buy asset
    /// @param intent The signed intent from the maker
    /// @param signature The maker's EIP-712 signature
    function fillIntent(
        IntentLib.Intent calldata intent,
        bytes calldata signature
    ) external nonReentrant {
        _validateIntent(intent, signature);

        uint256 currentBuyAmount = intent.currentPrice();

        // Transfer sell asset from maker to filler
        IERC20(intent.sellAsset).safeTransferFrom(
            intent.maker,
            msg.sender,
            intent.sellAmount
        );

        // Transfer buy asset from filler to maker
        IERC20(intent.buyAsset).safeTransferFrom(
            msg.sender,
            intent.maker,
            currentBuyAmount
        );

        bytes32 intentHash = _hashTypedDataV4(intent.hash());
        emit IntentFilled(
            intentHash,
            intent.maker,
            msg.sender,
            intent.sellAsset,
            intent.sellAmount,
            intent.buyAsset,
            currentBuyAmount
        );
    }

    /// @notice Initiate a cross-chain intent fill via XCM
    /// @param intent The signed intent from the maker
    /// @param signature The maker's EIP-712 signature
    /// @param xcmDestination SCALE-encoded destination multilocation
    /// @param xcmMessage SCALE-encoded XCM message for the target chain
    function fillIntentXCM(
        IntentLib.Intent calldata intent,
        bytes calldata signature,
        bytes calldata xcmDestination,
        bytes calldata xcmMessage
    ) external nonReentrant {
        if (escrowVault == address(0)) revert EscrowNotSet();
        _validateIntent(intent, signature);
        bytes32 intentHash = _hashTypedDataV4(intent.hash());

        // Lock maker's sell asset in escrow
        IERC20(intent.sellAsset).safeTransferFrom(
            intent.maker,
            escrowVault,
            intent.sellAmount
        );

        IEscrowVault(escrowVault).lock(
            intentHash,
            intent.maker,
            msg.sender,
            intent.sellAsset,
            intent.sellAmount,
            intent.deadline
        );

        // Send XCM message to target chain
        XCM_PRECOMPILE.send(xcmDestination, xcmMessage);

        emit IntentInitiatedXCM(
            intentHash,
            intent.maker,
            msg.sender,
            xcmDestination
        );
    }

    /// @notice Cancel an intent by marking its nonce as used
    /// @param nonce The nonce to cancel
    function cancelIntent(uint256 nonce) external {
        nonceUsed[msg.sender][nonce] = true;
        emit IntentCancelled(msg.sender, nonce);
    }

    /// @notice Get the current Dutch auction price for an intent
    function getCurrentPrice(
        IntentLib.Intent calldata intent
    ) external view returns (uint256) {
        return intent.currentPrice();
    }

    /// @notice Get the EIP-712 digest for an intent (for off-chain signing)
    function getIntentDigest(
        IntentLib.Intent calldata intent
    ) external view returns (bytes32) {
        return _hashTypedDataV4(intent.hash());
    }

    /// @notice Get the EIP-712 domain separator
    function getDomainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    // --- Internal ---

    function _validateIntent(
        IntentLib.Intent calldata intent,
        bytes calldata signature
    ) internal {
        if (block.timestamp > intent.deadline) revert IntentExpired();
        if (nonceUsed[intent.maker][intent.nonce]) revert NonceAlreadyUsed();

        // Exclusive filler check
        if (
            intent.exclusiveFiller != address(0) &&
            intent.exclusiveFiller != msg.sender
        ) {
            revert ExclusiveFillerViolation();
        }

        // Verify EIP-712 signature
        bytes32 digest = _hashTypedDataV4(intent.hash());
        address signer = ECDSA.recover(digest, signature);
        if (signer != intent.maker) revert InvalidSignature();

        // Mark nonce as used
        nonceUsed[intent.maker][intent.nonce] = true;
    }
}
