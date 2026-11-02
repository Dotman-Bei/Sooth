// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ISellVenue} from "./ISellVenue.sol";

interface IERC20Min {
    function balanceOf(address) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
}

/// @title BackstopVenue: testnet backstop, not market liquidity (prd.md §9.3)
/// @notice Pays for DOGE that Sooth pulled, at exactly the signed trigger price, in a test payout token.
///         Holds the DOGE it receives and counts it with DOGE.balanceOf(this) only (no native double count).
contract BackstopVenue is ISellVenue {
    IERC20Min public constant DOGE = IERC20Min(0x530000000000000000000000000000000000d09e);

    IERC20Min public immutable payoutToken;
    uint8 public immutable priceDecimals; // RedStone DOGE value decimals (expected 8, G0-1)
    address public immutable deployer;
    address public sooth; // set once by bind(); Sooth takes the venue in its constructor

    event Bound(address sooth);
    event Sold(address indexed holder, address indexed caller, uint256 dogeAmount, uint256 price, uint256 proceeds, uint256 fee);

    error NotSooth();
    error AlreadyBound();
    error NotDeployer();
    error VenueInsolvent(uint256 needed, uint256 available);

    constructor(IERC20Min payoutToken_, uint8 priceDecimals_) {
        payoutToken = payoutToken_;
        priceDecimals = priceDecimals_;
        deployer = msg.sender;
    }

    function bind(address sooth_) external {
        if (msg.sender != deployer) revert NotDeployer();
        if (sooth != address(0)) revert AlreadyBound();
        sooth = sooth_;
        emit Bound(sooth_);
    }

    /// @inheritdoc ISellVenue
    function sell(address holder, uint256 dogeAmount, uint256 price, address caller, uint256 feeBps)
        external
        returns (uint256 proceeds)
    {
        if (msg.sender != sooth || sooth == address(0)) revert NotSooth();
        // DOGE 18 decimals × price (priceDecimals) → payout token 18 decimals. Multiply before divide;
        // rounds down, against the holder, by less than 1 wei of payout (prd.md §9.5).
        proceeds = (dogeAmount * price) / (10 ** priceDecimals);
        uint256 fee = (proceeds * feeBps) / 10_000;
        uint256 available = payoutToken.balanceOf(address(this));
        if (available < proceeds) revert VenueInsolvent(proceeds, available);
        require(payoutToken.transfer(holder, proceeds - fee), "payout to holder failed");
        if (fee > 0) require(payoutToken.transfer(caller, fee), "payout to caller failed");
        emit Sold(holder, caller, dogeAmount, price, proceeds, fee);
    }

    /// DOGE received from Sooth triggers, counted once.
    function dogeHeld() external view returns (uint256) {
        return DOGE.balanceOf(address(this));
    }
}
