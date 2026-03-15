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
import {IPrivacyEngine} from "./interfaces/IPrivacyEngine.sol";

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
    using IntentLib for IntentLib.PrivateIntent;
    using SafeERC20 for IERC20;

    // --- Constants ---
    IXcm public constant XCM_PRECOMPILE =
        IXcm(0x00000000000000000000000000000000000a0000);

    // --- State ---
    mapping(address maker => mapping(uint256 nonce => bool used))
        public nonceUsed;
    address public escrowVault;
    address public owner;

    // --- Privacy State ---
    IPrivacyEngine public privacyEngine;
    mapping(bytes32 commitment => address maker) public commitmentMaker;
    mapping(bytes32 commitment => uint256 deadline) public commitmentDeadline;

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

    event PrivateIntentSubmitted(
        bytes32 indexed commitmentHash,
        address indexed maker,
        uint256 deadline
    );

    event PrivateIntentFilled(
        bytes32 indexed commitmentHash,
        address indexed maker,
        address indexed filler,
        address sellAsset,
        uint256 sellAmount,
        address buyAsset,
        uint256 minBuyAmount
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
    error PrivacyEngineNotSet();
    error CommitmentAlreadyExists();
    error CommitmentNotFound();
    error CommitmentVerificationFailed();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor() EIP712("XCMIntents", "1") {
        owner = msg.sender;
    }

    // =======================================================================
    // Configuration
    // =======================================================================

    function setEscrowVault(address _escrowVault) external onlyOwner {
        if (_escrowVault == address(0)) revert ZeroAddress();
        escrowVault = _escrowVault;
    }

    function setPrivacyEngine(address _privacyEngine) external onlyOwner {
        if (_privacyEngine == address(0)) revert ZeroAddress();
        privacyEngine = IPrivacyEngine(_privacyEngine);
    }

    // =======================================================================
    // Public Intent Flow (existing — unchanged)
    // =======================================================================

    function fillIntent(
        IntentLib.Intent calldata intent,
        bytes calldata signature
    ) external nonReentrant {
        _validateIntent(intent, signature);

        uint256 currentBuyAmount = intent.currentPrice();

        IERC20(intent.sellAsset).safeTransferFrom(
            intent.maker,
            msg.sender,
            intent.sellAmount
        );

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

    function fillIntentXCM(
        IntentLib.Intent calldata intent,
        bytes calldata signature,
        bytes calldata xcmDestination,
        bytes calldata xcmMessage
    ) external nonReentrant {
        if (escrowVault == address(0)) revert EscrowNotSet();
        _validateIntent(intent, signature);
        bytes32 intentHash = _hashTypedDataV4(intent.hash());

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

        XCM_PRECOMPILE.send(xcmDestination, xcmMessage);

        emit IntentInitiatedXCM(
            intentHash,
            intent.maker,
            msg.sender,
            xcmDestination
        );
    }

    function cancelIntent(uint256 nonce) external {
        nonceUsed[msg.sender][nonce] = true;
        emit IntentCancelled(msg.sender, nonce);
    }

    // =======================================================================
    // Private Intent Flow (NEW — commitment-based with Rust PVM verification)
    // =======================================================================

    /// @notice Submit a private intent with hidden parameters
    /// @dev The commitment hides sellAsset, sellAmount, buyAsset, minBuyAmount.
    ///      Only the commitment hash and maker are visible on-chain.
    /// @param intent The private intent containing the commitment
    /// @param signature The maker's EIP-712 signature over the PrivateIntent
    function submitPrivateIntent(
        IntentLib.PrivateIntent calldata intent,
        bytes calldata signature
    ) external nonReentrant {
        if (address(privacyEngine) == address(0)) revert PrivacyEngineNotSet();
        if (block.timestamp > intent.deadline) revert IntentExpired();
        if (nonceUsed[intent.maker][intent.nonce]) revert NonceAlreadyUsed();

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

        // Check commitment not already used
        if (commitmentMaker[intent.commitment] != address(0)) {
            revert CommitmentAlreadyExists();
        }

        // Mark nonce used
        nonceUsed[intent.maker][intent.nonce] = true;

        // Store commitment
        commitmentMaker[intent.commitment] = intent.maker;
        commitmentDeadline[intent.commitment] = intent.deadline;

        emit PrivateIntentSubmitted(
            intent.commitment,
            intent.maker,
            intent.deadline
        );
    }

    /// @notice Fill a private intent by revealing the hidden parameters
    /// @dev The solver provides the original parameters + salt. The Rust PVM
    ///      privacy engine verifies the reveal matches the stored commitment.
    /// @param commitment The commitment hash from submitPrivateIntent
    /// @param sellAsset The revealed sell asset address
    /// @param sellAmount The revealed sell amount
    /// @param buyAsset The revealed buy asset address
    /// @param minBuyAmount The revealed minimum buy amount
    /// @param salt The salt used when creating the commitment
    function fillPrivateIntent(
        bytes32 commitment,
        address sellAsset,
        uint256 sellAmount,
        address buyAsset,
        uint256 minBuyAmount,
        bytes32 salt
    ) external nonReentrant {
        if (address(privacyEngine) == address(0)) revert PrivacyEngineNotSet();

        address maker = commitmentMaker[commitment];
        if (maker == address(0)) revert CommitmentNotFound();

        uint256 deadline = commitmentDeadline[commitment];
        if (block.timestamp > deadline) revert IntentExpired();

        // Cross-VM call: Solidity -> Rust PVM privacy engine
        // Verifies that the revealed parameters produce the stored commitment
        bool valid = privacyEngine.verifyCommitment(
            commitment,
            bytes32(uint256(uint160(sellAsset))),
            sellAmount,
            bytes32(uint256(uint160(buyAsset))),
            minBuyAmount,
            salt
        );
        if (!valid) revert CommitmentVerificationFailed();

        // Clear commitment (prevent replay)
        delete commitmentMaker[commitment];
        delete commitmentDeadline[commitment];

        // Execute the swap
        IERC20(sellAsset).safeTransferFrom(maker, msg.sender, sellAmount);
        IERC20(buyAsset).safeTransferFrom(msg.sender, maker, minBuyAmount);

        emit PrivateIntentFilled(
            commitment,
            maker,
            msg.sender,
            sellAsset,
            sellAmount,
            buyAsset,
            minBuyAmount
        );
    }

    // =======================================================================
    // View functions
    // =======================================================================

    function getCurrentPrice(
        IntentLib.Intent calldata intent
    ) external view returns (uint256) {
        return intent.currentPrice();
    }

    function getIntentDigest(
        IntentLib.Intent calldata intent
    ) external view returns (bytes32) {
        return _hashTypedDataV4(intent.hash());
    }

    function getPrivateIntentDigest(
        IntentLib.PrivateIntent calldata intent
    ) external view returns (bytes32) {
        return _hashTypedDataV4(intent.hash());
    }

    function getDomainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    // =======================================================================
    // Internal
    // =======================================================================

    function _validateIntent(
        IntentLib.Intent calldata intent,
        bytes calldata signature
    ) internal {
        if (block.timestamp > intent.deadline) revert IntentExpired();
        if (nonceUsed[intent.maker][intent.nonce]) revert NonceAlreadyUsed();

        if (
            intent.exclusiveFiller != address(0) &&
            intent.exclusiveFiller != msg.sender
        ) {
            revert ExclusiveFillerViolation();
        }

        bytes32 digest = _hashTypedDataV4(intent.hash());
        address signer = ECDSA.recover(digest, signature);
        if (signer != intent.maker) revert InvalidSignature();

        nonceUsed[intent.maker][intent.nonce] = true;
    }
}
