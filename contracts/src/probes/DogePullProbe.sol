// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// G0-2 (prd.md §7.2): can a contract transferFrom native DOGE out of an approving EOA?
// Pass: pull(1 DOGE) succeeds and the holder's balance drops by exactly 1 DOGE.

interface INativeDoge {
    function balanceOf(address) external view returns (uint256);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

contract DogePullProbe {
    INativeDoge public constant DOGE = INativeDoge(0x530000000000000000000000000000000000d09e);

    event Pulled(address indexed holder, uint256 amount, uint256 holderBefore, uint256 holderAfter, uint256 probeAfter);

    function pull(uint256 amount) external {
        uint256 before = DOGE.balanceOf(msg.sender);
        require(DOGE.transferFrom(msg.sender, address(this), amount), "transferFrom returned false");
        emit Pulled(msg.sender, amount, before, DOGE.balanceOf(msg.sender), DOGE.balanceOf(address(this)));
    }

    /// Returns everything the probe holds to the caller, so the test costs only gas.
    function giveBack() external {
        require(DOGE.transfer(msg.sender, DOGE.balanceOf(address(this))), "transfer returned false");
    }
}
