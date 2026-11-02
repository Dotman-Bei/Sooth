// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// prd.md §9.2. Only Sooth may call sell. The venue pays out at the price passed in,
/// so the sell price equals the trigger price (SOOTH-C5).
interface ISellVenue {
    /// @return proceeds Gross payout before the caller fee, in payout-token units.
    function sell(address holder, uint256 dogeAmount, uint256 price, address caller, uint256 feeBps)
        external
        returns (uint256 proceeds);
}
