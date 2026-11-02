// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PriceSignersConsumerBase} from "./PriceSignersConsumerBase.sol";
import "@redstone-finance/evm-connector/contracts/core/RedstoneDefaultsLib.sol";
import {ISellVenue} from "./ISellVenue.sol";

interface INativeDoge {
    function balanceOf(address) external view returns (uint256);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/// @title Sooth: an oracle-gated pull of native DOGE (prd.md §5, §9.1)
/// @notice Sells a holder's native DOGE only when the signed DOGE/USD (median of at least 3 of 5 price
///         signers, PriceSignersConsumerBase) is at or below their stop,
///         and always leaves their gas floor. Anyone may call trigger; nobody in the tx chooses the price.
contract Sooth is PriceSignersConsumerBase {
    // ---------------------------------------------------------------- constants (§9.1)

    /// Native DOGE ERC-20 on DogeOS. transferFrom moves native value (G0-2, evidence/g0/g0-2.json).
    INativeDoge public constant DOGE = INativeDoge(0x530000000000000000000000000000000000d09e);
    // forge-lint: disable-next-line(unsafe-typecast)
    bytes32 public constant FEED_ID = bytes32("DOGE");
    uint256 public constant MAX_PRICE_AGE = 60; // seconds; overrides RedStone's 3 min default
    uint256 public constant MAX_PRICE_AHEAD = 30; // seconds; overrides RedStone's 1 min default
    uint256 public constant CALLER_FEE_BPS = 50; // I-6: fixed, cannot change after deploy
    /// G0-8: one revoke costs ~0.006 DOGE, so 1 DOGE covers >10x (evidence/g0/read-probes.json)
    uint256 public constant MIN_GAS_FLOOR = 1 ether;

    ISellVenue public immutable venue;

    // ---------------------------------------------------------------- storage

    struct Stop {
        uint128 amount; // DOGE wei to sell
        uint128 gasFloor; // DOGE wei that must remain
        uint64 stopPrice; // signed price units, 8 decimals
        uint64 armedAt; // block.timestamp at arm, seconds
        uint64 expiry; // seconds; 0 = none
        bool active;
    }

    mapping(address => Stop) public stops;

    uint256 private locked = 1;

    // ---------------------------------------------------------------- events and errors

    event Armed(address indexed holder, uint64 stopPrice, uint128 amount, uint128 gasFloor, uint64 expiry);
    event Cancelled(address indexed holder);
    event Triggered(
        address indexed holder,
        address indexed caller,
        uint256 price,
        uint256 priceTimestamp, // ms
        uint256 amount,
        uint256 proceeds,
        uint256 fee
    );

    error NoActiveStop();
    error StopExpired();
    error PriceAboveStop(uint256 price, uint256 stopPrice);
    error PriceOlderThanArm(uint256 priceTs, uint256 armedAt);
    error BelowGasFloor(uint256 balance, uint256 amount, uint256 gasFloor);
    error GasFloorTooLow();
    error BadAmount();
    error BadStopPrice();
    error BadExpiry();
    error TransferFailed();
    error Reentrancy();

    modifier nonReentrant() {
        if (locked != 1) revert Reentrancy();
        locked = 2;
        _;
        locked = 1;
    }

    constructor(ISellVenue venue_, address[5] memory signers_) PriceSignersConsumerBase(signers_) {
        venue = venue_;
    }

    // ---------------------------------------------------------------- holder

    /// @notice Arm or overwrite your stop. Does not move DOGE; approve Sooth for exactly `amount` separately.
    function arm(uint64 stopPrice, uint128 amount, uint128 gasFloor, uint64 expiry) external {
        if (amount == 0) revert BadAmount();
        if (gasFloor < MIN_GAS_FLOOR) revert GasFloorTooLow();
        if (stopPrice == 0) revert BadStopPrice();
        if (expiry != 0 && expiry <= block.timestamp) revert BadExpiry();
        stops[msg.sender] = Stop({
            amount: amount,
            gasFloor: gasFloor,
            stopPrice: stopPrice,
            armedAt: uint64(block.timestamp),
            expiry: expiry,
            active: true
        });
        emit Armed(msg.sender, stopPrice, amount, gasFloor, expiry);
    }

    /// @notice Disarm your stop. The allowance stays until you revoke it (approve(Sooth, 0)).
    function cancel() external {
        if (!stops[msg.sender].active) revert NoActiveStop();
        stops[msg.sender].active = false;
        emit Cancelled(msg.sender);
    }

    // ---------------------------------------------------------------- anyone

    /// @notice Sell the holder's armed amount if the signed DOGE/USD appended to calldata is at or below
    ///         their stop. Checks run in the order of prd.md §9.1.
    function trigger(address holder) external nonReentrant {
        Stop memory s = stops[holder];
        if (!s.active) revert NoActiveStop(); // I-5
        if (s.expiry != 0 && block.timestamp > s.expiry) revert StopExpired(); // I-5

        // I-4: >=3 authorised primary-prod signers (enforced by the base), then age and arm checks.
        bytes32[] memory ids = new bytes32[](1);
        ids[0] = FEED_ID;
        (uint256[] memory values, uint256 priceTs) = getOracleNumericValuesAndTimestampFromTxMsg(ids);
        // 1.0.0 does not validate the timestamp it returns, so do it here (DECISIONS.md D-015).
        validateTimestamp(priceTs);
        if (priceTs < uint256(s.armedAt) * 1000) revert PriceOlderThanArm(priceTs, s.armedAt);

        uint256 price = values[0];
        if (price > s.stopPrice) revert PriceAboveStop(price, s.stopPrice); // I-1

        uint256 balance = DOGE.balanceOf(holder);
        if (balance < uint256(s.amount) + s.gasFloor) revert BelowGasFloor(balance, s.amount, s.gasFloor); // I-2

        // Effects before interactions (I-5).
        stops[holder].active = false;

        // I-7: exactly the armed amount, whatever the allowance.
        if (!DOGE.transferFrom(holder, address(venue), s.amount)) revert TransferFailed();
        // I-2 again after the move, in case balanceOf and the transfer ever disagree.
        uint256 after_ = DOGE.balanceOf(holder);
        if (after_ < s.gasFloor) revert BelowGasFloor(after_, s.amount, s.gasFloor);

        uint256 proceeds = venue.sell(holder, s.amount, price, msg.sender, CALLER_FEE_BPS);
        emit Triggered(holder, msg.sender, price, priceTs, s.amount, proceeds, (proceeds * CALLER_FEE_BPS) / 10_000);
    }

    /// @notice What a trigger at `price` would find, for the UI. Does not check signatures or timestamps.
    function preview(address holder, uint256 price)
        external
        view
        returns (bool active, bool notExpired, bool atOrBelowStop, bool keepsGasFloor, uint256 balance)
    {
        Stop memory s = stops[holder];
        balance = DOGE.balanceOf(holder);
        active = s.active;
        notExpired = s.expiry == 0 || block.timestamp <= s.expiry;
        atOrBelowStop = s.stopPrice != 0 && price <= s.stopPrice;
        keepsGasFloor = balance >= uint256(s.amount) + s.gasFloor;
    }

    // ---------------------------------------------------------------- connector overrides

    /// Price must be at most MAX_PRICE_AGE old and at most MAX_PRICE_AHEAD in the future (I-4).
    function validateTimestamp(uint256 receivedTimestampMilliseconds) public view virtual override {
        uint256 ts = receivedTimestampMilliseconds / 1000;
        if (ts > block.timestamp) {
            if (ts - block.timestamp > MAX_PRICE_AHEAD) {
                revert RedstoneDefaultsLib.TimestampFromTooLongFuture(ts, block.timestamp);
            }
        } else if (block.timestamp - ts > MAX_PRICE_AGE) {
            revert RedstoneDefaultsLib.TimestampIsTooOld(ts, block.timestamp);
        }
    }
}
