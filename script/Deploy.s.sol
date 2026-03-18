// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {IntentReactor} from "../src/IntentReactor.sol";
import {EscrowVault} from "../src/EscrowVault.sol";
import {SolverRegistry} from "../src/SolverRegistry.sol";
import {MockERC20} from "../src/test/MockERC20.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address privacyEngineAddress = vm.envAddress("PRIVACY_ENGINE_ADDRESS");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy IntentReactor
        IntentReactor reactor = new IntentReactor();
        console.log("IntentReactor deployed at:", address(reactor));

        // 2. Deploy EscrowVault linked to reactor
        EscrowVault escrow = new EscrowVault(address(reactor));
        console.log("EscrowVault deployed at:", address(escrow));

        // 3. Deploy SolverRegistry linked to reactor
        SolverRegistry registry = new SolverRegistry(address(reactor));
        console.log("SolverRegistry deployed at:", address(registry));

        // 4. Link escrow to reactor
        reactor.setEscrowVault(address(escrow));
        console.log("EscrowVault linked to IntentReactor");

        // 5. Link Rust PVM privacy engine to reactor
        // Deploy PVM contract first:
        //   cast send --create "$(xxd -p -c 99999 rust-privacy-engine/target/rust-privacy-engine.release.polkavm)"
        // Pass the resulting address via PRIVACY_ENGINE_ADDRESS env var
        reactor.setPrivacyEngine(privacyEngineAddress);
        console.log("PrivacyEngine linked at:", privacyEngineAddress);

        // 6. Link solver registry so active-solver checks are enforced
        reactor.setSolverRegistry(address(registry));
        console.log("SolverRegistry linked to IntentReactor");

        // 7. Deploy mock test tokens and mint to deployer
        MockERC20 mockUsdc = new MockERC20("Mock USDC", "USDC", 6);
        MockERC20 mockDot = new MockERC20("Mock DOT", "DOT", 18);
        mockUsdc.mint(deployer, 1_000 * 1e6); // 1k USDC
        mockDot.mint(deployer, 100 * 1e18); // 100 DOT
        console.log("MockUSDC deployed at:", address(mockUsdc));
        console.log("Minted 1,000 USDC to deployer");
        console.log("MockDOT deployed at:", address(mockDot));
        console.log("Minted 100 DOT to deployer");

        vm.stopBroadcast();

        console.log("\n=== Deployment Summary ===");
        console.log("IntentReactor:  ", address(reactor));
        console.log("EscrowVault:    ", address(escrow));
        console.log("SolverRegistry: ", address(registry));
        console.log("PrivacyEngine:  ", privacyEngineAddress);
        console.log("MockUSDC:       ", address(mockUsdc));
        console.log("MockDOT:        ", address(mockDot));
    }
}
