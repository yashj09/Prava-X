// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {IntentReactor} from "../src/IntentReactor.sol";
import {EscrowVault} from "../src/EscrowVault.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy IntentReactor
        IntentReactor reactor = new IntentReactor();
        console.log("IntentReactor deployed at:", address(reactor));

        // Deploy EscrowVault linked to reactor
        EscrowVault escrow = new EscrowVault(address(reactor));
        console.log("EscrowVault deployed at:", address(escrow));

        // Link escrow to reactor
        reactor.setEscrowVault(address(escrow));
        console.log("EscrowVault linked to IntentReactor");

        vm.stopBroadcast();
    }
}
