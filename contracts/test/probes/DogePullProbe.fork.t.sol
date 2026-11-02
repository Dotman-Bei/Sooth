// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {DogePullProbe, INativeDoge} from "../../src/probes/DogePullProbe.sol";

interface Vm {
    function deal(address, uint256) external;
    function prank(address) external;
    function createSelectFork(string calldata) external returns (uint256);
    function expectCall(address callee, bytes calldata data) external;
}

/// Fork check of the G0-2 call path against Chikyū state. NOT G0 evidence.
///
/// Finding (2026-10-31): native DOGE's transferFrom moves value by calling a DogeOS precompile at
/// 0x...fd with (from, to, amount). Foundry's EVM has no code there, so on a fork the call returns
/// true and emits Transfer while no balance moves. Balances after a pull can only be checked on
/// Chikyū itself (scripts/g0/run-tx-probes.mjs), and Sooth's tests must mock native DOGE (prd.md §13).
///
/// Run: forge test --match-path "test/probes/*" -vv
contract DogePullProbeForkTest {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    INativeDoge constant DOGE = INativeDoge(0x530000000000000000000000000000000000d09e);
    address constant NATIVE_TRANSFER_PRECOMPILE = address(0xfd);

    function test_fork_balanceOfMirrorsNativeBalance() public {
        vm.createSelectFork("chikyu");
        address holder = address(0xA11CE);
        vm.deal(holder, 10 ether);
        require(DOGE.balanceOf(holder) == 10 ether, "balanceOf does not mirror native balance");
    }

    function test_fork_transferFromDelegatesToPrecompile() public {
        vm.createSelectFork("chikyu");
        DogePullProbe probe = new DogePullProbe();
        address holder = address(0xA11CE);
        vm.deal(holder, 10 ether);

        vm.prank(holder);
        (bool ok,) = address(DOGE).call(abi.encodeWithSignature("approve(address,uint256)", address(probe), 1 ether));
        require(ok, "approve failed");

        vm.expectCall(NATIVE_TRANSFER_PRECOMPILE, abi.encode(holder, address(probe), 1 ether));
        vm.prank(holder);
        probe.pull(1 ether);
        // Balances are deliberately not asserted: the precompile does not exist on a fork.
    }
}
