// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./utils/SoothTestBase.sol";
import "@redstone-finance/evm-connector/contracts/core/RedstoneDefaultsLib.sol";
import "@redstone-finance/evm-connector/contracts/core/RedstoneConstants.sol";
import {PriceSignersConsumerBase} from "../src/PriceSignersConsumerBase.sol";

/// prd.md §13. Every negative test asserts its specific custom error.
contract SoothTest is SoothTestBase {
    uint256 constant AMOUNT = 98 * DOGE_1; // prd.md §5.1
    uint256 constant FLOOR = 2 * DOGE_1;

    // ------------------------------------------------------------ T-P1

    function test_P1_sellsBelowStop() public {
        _arm(STOP, AMOUNT, FLOOR, 0);
        uint256 price = 6_980_000; // $0.0698
        vm.warp(START + 10);
        (bool ok,) = _trigger(price, _nowMs(), _signers3());
        require(ok, "trigger reverted");

        _eq(doge.balanceOf(holder), 100 * DOGE_1 - AMOUNT, "holder DOGE = before - amount");
        _eq(doge.balanceOf(address(venue)), AMOUNT, "venue got exactly amount");
        uint256 proceeds = (AMOUNT * price) / 1e8; // 6.8404 tDOLLAR
        uint256 fee = (proceeds * 50) / 10_000;
        _eq(usd.balanceOf(holder), proceeds - fee, "holder paid proceeds - fee at the signed price");
        _eq(usd.balanceOf(caller), fee, "caller got 0.5%");
        (,,,,, bool active) = sooth.stops(holder);
        require(!active, "stop disarmed");
    }

    // ------------------------------------------------------------ T-N1 (I-1)

    function test_N1_priceAboveStop() public {
        _arm(STOP, AMOUNT, FLOOR, 0);
        vm.warp(START + 10);
        (bool ok_, bytes memory ret_) = _trigger(7_710_000, _nowMs(), _signers3());
        _assertRevert(ok_, ret_, abi.encodeWithSelector(Sooth.PriceAboveStop.selector, 7_710_000, STOP));
        _eq(doge.balanceOf(holder), 100 * DOGE_1, "nothing moved");
    }

    function test_N1_priceExactlyAtStopSells() public {
        _arm(STOP, AMOUNT, FLOOR, 0);
        vm.warp(START + 10);
        (bool ok,) = _trigger(STOP, _nowMs(), _signers3());
        require(ok, "at-stop trigger should sell");
    }

    // ------------------------------------------------------------ T-N2 (I-2)

    function test_N2_belowGasFloor() public {
        _arm(STOP, AMOUNT, FLOOR, 0);
        vm.prank(holder);
        doge.transfer(address(0xBEEF), 1 * DOGE_1); // holder spends 1 DOGE: 99 < 98 + 2
        vm.warp(START + 10);
        (bool ok_, bytes memory ret_) = _trigger(6_980_000, _nowMs(), _signers3());
        _assertRevert(ok_, ret_, abi.encodeWithSelector(Sooth.BelowGasFloor.selector, 99 * DOGE_1, AMOUNT, FLOOR));
    }

    // ------------------------------------------------------------ T-N3 (I-4 age)

    function test_N3_priceOlderThan60s() public {
        _arm(STOP, AMOUNT, FLOOR, 0);
        vm.warp(START + 200);
        uint256 tsSec = block.timestamp - 61;
        (bool ok_, bytes memory ret_) = _trigger(6_980_000, tsSec * 1000, _signers3());
        _assertRevert(ok_, ret_, abi.encodeWithSelector(RedstoneDefaultsLib.TimestampIsTooOld.selector, tsSec, block.timestamp));
    }

    function test_N3_priceTooFarInFuture() public {
        _arm(STOP, AMOUNT, FLOOR, 0);
        vm.warp(START + 10);
        uint256 tsSec = block.timestamp + 31;
        (bool ok_, bytes memory ret_) = _trigger(6_980_000, tsSec * 1000, _signers3());
        _assertRevert(ok_, ret_, abi.encodeWithSelector(RedstoneDefaultsLib.TimestampFromTooLongFuture.selector, tsSec, block.timestamp));
    }

    function test_N3_priceAt60sStillAccepted() public {
        _arm(STOP, AMOUNT, FLOOR, 0);
        vm.warp(START + 60);
        (bool ok,) = _trigger(6_980_000, START * 1000, _signers3()); // exactly 60 s old, signed at arm time
        require(ok, "60 s old price should pass");
    }

    // ------------------------------------------------------------ T-N4 (I-4 arm)

    function test_N4_priceOlderThanArm() public {
        _arm(STOP, AMOUNT, FLOOR, 0); // armedAt = START
        vm.warp(START + 5);
        uint256 tsMs = (START - 10) * 1000; // fresh (15 s) but signed before the arm
        (bool ok_, bytes memory ret_) = _trigger(6_980_000, tsMs, _signers3());
        _assertRevert(ok_, ret_, abi.encodeWithSelector(Sooth.PriceOlderThanArm.selector, tsMs, START));
    }

    // ------------------------------------------------------------ T-N5, T-N6 (I-4 signers)

    function test_N5_onlyTwoSigners() public {
        _arm(STOP, AMOUNT, FLOOR, 0);
        vm.warp(START + 10);
        uint256[] memory two = new uint256[](2);
        two[0] = SIGNER_0;
        two[1] = SIGNER_1;
        (bool ok_, bytes memory ret_) = _trigger(6_980_000, _nowMs(), two);
        _assertRevert(ok_, ret_, abi.encodeWithSelector(RedstoneConstants.InsufficientNumberOfUniqueSigners.selector, 2, 3));
    }

    function test_N5_sameSignerThriceCountsOnce() public {
        _arm(STOP, AMOUNT, FLOOR, 0);
        vm.warp(START + 10);
        uint256[] memory same = new uint256[](3);
        same[0] = SIGNER_0;
        same[1] = SIGNER_0;
        same[2] = SIGNER_0;
        (bool ok_, bytes memory ret_) = _trigger(6_980_000, _nowMs(), same);
        _assertRevert(ok_, ret_, abi.encodeWithSelector(RedstoneConstants.InsufficientNumberOfUniqueSigners.selector, 1, 3));
    }

    function test_N6_unauthorisedSigner() public {
        _arm(STOP, AMOUNT, FLOOR, 0);
        vm.warp(START + 10);
        uint256[] memory pks = _signers3();
        pks[2] = SIGNER_19;
        (bool ok_, bytes memory ret_) = _trigger(6_980_000, _nowMs(), pks);
        _assertRevert(ok_, ret_, abi.encodeWithSelector(RedstoneConstants.SignerNotAuthorised.selector, vm.addr(SIGNER_19)));
    }

    function test_N6_fourthAndFifthSignersCount() public {
        _arm(STOP, AMOUNT, FLOOR, 0);
        vm.warp(START + 10);
        uint256[] memory pks = _signers3();
        pks[0] = SIGNER_3;
        pks[1] = SIGNER_4;
        (bool ok,) = _trigger(6_980_000, _nowMs(), pks);
        require(ok, "signers 3, 4 and 2 should be accepted");
    }

    function test_N6_oneBadSourceCannotSetPrice() public {
        // Two exchanges near $0.071, one far below the stop: the median stays above the stop.
        _arm(STOP, AMOUNT, FLOOR, 0);
        vm.warp(START + 10);
        uint256[] memory prices = new uint256[](3);
        prices[0] = 7_100_000;
        prices[1] = 1_000_000;
        prices[2] = 7_120_000;
        bytes memory data = abi.encodePacked(abi.encodeCall(sooth.trigger, (holder)), _payloadEach(prices, _nowMs(), _signers3()));
        vm.prank(caller);
        (bool ok_, bytes memory ret_) = address(sooth).call(data);
        _assertRevert(ok_, ret_, abi.encodeWithSelector(Sooth.PriceAboveStop.selector, 7_100_000, STOP));
    }

    function test_constructor_rejectsBadSigners() public {
        address[5] memory dup = _signerAddrs();
        dup[4] = dup[1];
        (bool ok_, bytes memory ret_) = _tryDeploy(dup);
        _assertRevert(ok_, ret_, abi.encodeWithSelector(PriceSignersConsumerBase.BadSigners.selector));
        address[5] memory zero = _signerAddrs();
        zero[2] = address(0);
        (ok_, ret_) = _tryDeploy(zero);
        _assertRevert(ok_, ret_, abi.encodeWithSelector(PriceSignersConsumerBase.BadSigners.selector));
    }

    function _tryDeploy(address[5] memory signers) internal returns (bool, bytes memory) {
        try new Sooth(ISellVenue(address(venue)), signers) returns (Sooth) {
            return (true, "");
        } catch (bytes memory ret) {
            return (false, ret);
        }
    }

    function test_N6_noPayload() public {
        _arm(STOP, AMOUNT, FLOOR, 0);
        vm.prank(caller);
        vm.expectRevert(abi.encodeWithSelector(RedstoneConstants.CalldataMustHaveValidPayload.selector));
        sooth.trigger(holder);
    }

    // ------------------------------------------------------------ T-N7, T-N8 (I-5)

    function test_N7_secondTriggerAfterFire() public {
        _arm(STOP, AMOUNT, FLOOR, 0);
        doge.mint(holder, 200 * DOGE_1);
        vm.prank(holder);
        doge.approve(address(sooth), 2 * AMOUNT); // allowance would allow a second pull
        vm.warp(START + 10);
        (bool ok,) = _trigger(6_980_000, _nowMs(), _signers3());
        require(ok, "first trigger");
        (bool ok_, bytes memory ret_) = _trigger(6_980_000, _nowMs(), _signers3());
        _assertRevert(ok_, ret_, abi.encodeWithSelector(Sooth.NoActiveStop.selector));
    }

    function test_N8_triggerAfterCancel() public {
        _arm(STOP, AMOUNT, FLOOR, 0);
        vm.prank(holder);
        sooth.cancel();
        vm.warp(START + 10);
        (bool ok_, bytes memory ret_) = _trigger(6_980_000, _nowMs(), _signers3());
        _assertRevert(ok_, ret_, abi.encodeWithSelector(Sooth.NoActiveStop.selector));
    }

    function test_N8_triggerAfterExpiry() public {
        _arm(STOP, AMOUNT, FLOOR, uint64(START + 3600));
        vm.warp(START + 3601);
        (bool ok_, bytes memory ret_) = _trigger(6_980_000, _nowMs(), _signers3());
        _assertRevert(ok_, ret_, abi.encodeWithSelector(Sooth.StopExpired.selector));
    }

    // ------------------------------------------------------------ T-N9 (I-7)

    function test_N9_allowanceLargerThanAmount() public {
        _arm(STOP, 10 * DOGE_1, FLOOR, 0);
        vm.prank(holder);
        doge.approve(address(sooth), 90 * DOGE_1);
        vm.warp(START + 10);
        (bool ok,) = _trigger(6_980_000, _nowMs(), _signers3());
        require(ok, "trigger");
        _eq(doge.balanceOf(holder), 90 * DOGE_1, "exactly amount moved");
        _eq(doge.allowance(holder, address(sooth)), 80 * DOGE_1, "rest of allowance untouched");
    }

    // ------------------------------------------------------------ T-N10, T-N11 (venue)

    function test_N10_onlySoothCallsVenue() public {
        vm.expectRevert(abi.encodeWithSelector(BackstopVenue.NotSooth.selector));
        venue.sell(holder, AMOUNT, 6_980_000, caller, 50);
    }

    function test_N10_venueBindsOnce() public {
        vm.expectRevert(abi.encodeWithSelector(BackstopVenue.AlreadyBound.selector));
        venue.bind(address(0xBAD));
    }

    function test_N11_venueInsolventMovesNoDoge() public {
        // A venue with no payout tokens
        BackstopVenue empty = new BackstopVenue(IERC20Min(address(usd)), 8);
        Sooth s2 = new Sooth(ISellVenue(address(empty)), _signerAddrs());
        empty.bind(address(s2));
        vm.startPrank(holder);
        doge.approve(address(s2), AMOUNT);
        s2.arm(STOP, uint128(AMOUNT), uint128(FLOOR), 0);
        vm.stopPrank();
        vm.warp(START + 10);

        uint256 price = 6_980_000;
        bytes memory data = abi.encodePacked(abi.encodeCall(s2.trigger, (holder)), _payload(price, _nowMs(), _signers3()));
        vm.prank(caller);
        (bool ok, bytes memory ret) = address(s2).call(data);
        _assertRevert(ok, ret, abi.encodeWithSelector(BackstopVenue.VenueInsolvent.selector, (AMOUNT * price) / 1e8, 0));
        _eq(doge.balanceOf(holder), 100 * DOGE_1, "no DOGE moved");
        _eq(doge.balanceOf(address(empty)), 0, "venue got nothing");
        (,,,,, bool active) = s2.stops(holder);
        require(active, "stop still armed after revert");
    }

    // ------------------------------------------------------------ T-I1 (I-3)

    function test_I1_noCustodyBeforeTrigger() public {
        _arm(STOP, AMOUNT, FLOOR, 0);
        _eq(doge.balanceOf(address(sooth)), 0, "Sooth holds none");
        _eq(doge.balanceOf(address(venue)), 0, "venue holds none");
        _eq(doge.balanceOf(holder), 100 * DOGE_1, "holder keeps all");
    }

    // ------------------------------------------------------------ arm validation, I-6

    function test_arm_rejectsZeroAmount() public {
        vm.prank(holder);
        vm.expectRevert(abi.encodeWithSelector(Sooth.BadAmount.selector));
        sooth.arm(STOP, 0, uint128(FLOOR), 0);
    }

    function test_arm_rejectsLowGasFloor() public {
        vm.prank(holder);
        vm.expectRevert(abi.encodeWithSelector(Sooth.GasFloorTooLow.selector));
        sooth.arm(STOP, uint128(AMOUNT), uint128(DOGE_1 - 1), 0);
    }

    function test_arm_rejectsZeroStop() public {
        vm.prank(holder);
        vm.expectRevert(abi.encodeWithSelector(Sooth.BadStopPrice.selector));
        sooth.arm(0, uint128(AMOUNT), uint128(FLOOR), 0);
    }

    function test_arm_rejectsPastExpiry() public {
        vm.prank(holder);
        vm.expectRevert(abi.encodeWithSelector(Sooth.BadExpiry.selector));
        sooth.arm(STOP, uint128(AMOUNT), uint128(FLOOR), uint64(START));
    }

    function test_arm_doesNotMoveDoge() public {
        _arm(STOP, AMOUNT, FLOOR, 0);
        _eq(doge.balanceOf(holder), 100 * DOGE_1, "arm moves nothing");
    }

    function test_cancel_withoutStop() public {
        vm.prank(holder);
        vm.expectRevert(abi.encodeWithSelector(Sooth.NoActiveStop.selector));
        sooth.cancel();
    }

    function test_I6_feeIsFixed() public view {
        _eq(sooth.CALLER_FEE_BPS(), 50, "fee bps");
        _eq(sooth.MAX_PRICE_AGE(), 60, "max age");
        _eq(sooth.MAX_PRICE_AHEAD(), 30, "max ahead");
        _eq(sooth.MIN_GAS_FLOOR(), 1 ether, "min floor");
        _eq(sooth.getUniqueSignersThreshold(), 3, "threshold");
    }

    // ------------------------------------------------------------ T-F1: I-1, I-2, I-7 for all inputs

    function testFuzz_F1_invariants(uint64 price, uint64 stopPrice, uint96 amount, uint96 floor, uint96 balance) public {
        vm.assume(price > 0 && price < 1e12 && stopPrice > 0);
        vm.assume(amount > 0 && floor >= DOGE_1);
        // fresh holder with a fuzzed balance
        address h = address(0xF00D);
        doge.mint(h, balance);
        vm.startPrank(h);
        doge.approve(address(sooth), type(uint256).max); // I-7 must hold even with unlimited allowance
        sooth.arm(stopPrice, amount, floor, 0);
        vm.stopPrank();
        vm.warp(START + 10);

        bytes memory data = abi.encodePacked(abi.encodeCall(sooth.trigger, (h)), _payload(price, _nowMs(), _signers3()));
        vm.prank(caller);
        (bool ok,) = address(sooth).call(data);

        if (ok) {
            require(price <= stopPrice, "I-1: sold above stop");
            require(doge.balanceOf(h) >= floor, "I-2: below floor after sell");
            _eq(balance - doge.balanceOf(h), amount, "I-7: moved != amount");
        } else {
            _eq(doge.balanceOf(h), balance, "failed trigger moved DOGE");
            require(price > stopPrice || uint256(balance) < uint256(amount) + floor
                || (uint256(amount) * price) / 1e8 > usd.balanceOf(address(venue)), "reverted for no reason");
        }
    }
}
