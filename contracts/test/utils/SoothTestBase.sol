// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Sooth} from "../../src/Sooth.sol";
import {BackstopVenue, IERC20Min} from "../../src/BackstopVenue.sol";
import {ISellVenue} from "../../src/ISellVenue.sol";
import {TestDollar} from "../../src/TestDollar.sol";

interface Vm {
    function sign(uint256 pk, bytes32 digest) external pure returns (uint8 v, bytes32 r, bytes32 s);
    function addr(uint256 pk) external pure returns (address);
    function etch(address target, bytes calldata code) external;
    function prank(address) external;
    function startPrank(address) external;
    function stopPrank() external;
    function warp(uint256) external;
    function expectRevert(bytes calldata) external;
    function assume(bool) external pure;
}

/// Stand-in for native DOGE at its real address (prd.md §13). Forks cannot run the real one:
/// it moves value through a DogeOS precompile at 0x...fd (DECISIONS.md D-013).
contract MockNativeDoge {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

abstract contract SoothTestBase {
    Vm internal constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    address internal constant DOGE_ADDR = 0x530000000000000000000000000000000000d09e;

    // Standard test-mnemonic keys: 0..4 are Sooth's five price signers here, 19 is not.
    uint256 internal constant SIGNER_0 = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
    uint256 internal constant SIGNER_1 = 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d;
    uint256 internal constant SIGNER_2 = 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a;
    uint256 internal constant SIGNER_3 = 0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6;
    uint256 internal constant SIGNER_4 = 0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a;
    uint256 internal constant SIGNER_19 = 0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e;

    uint256 internal constant DOGE_1 = 1 ether;
    uint64 internal constant STOP = 7_000_000; // $0.0700 at 8 decimals (prd.md §5.1)
    uint256 internal constant START = 1_800_000_000; // fixed block time for readable tests

    MockNativeDoge internal doge;
    TestDollar internal usd;
    BackstopVenue internal venue;
    Sooth internal sooth;

    address internal holder = address(0xD06E);
    address internal caller = address(0xCA11);

    function setUp() public virtual {
        vm.warp(START);
        vm.etch(DOGE_ADDR, type(MockNativeDoge).runtimeCode);
        doge = MockNativeDoge(DOGE_ADDR);

        usd = new TestDollar(address(this), 1_000_000 ether);
        venue = new BackstopVenue(IERC20Min(address(usd)), 8);
        usd.transfer(address(venue), 1_000_000 ether);
        sooth = new Sooth(ISellVenue(address(venue)), _signerAddrs());
        venue.bind(address(sooth));

        doge.mint(holder, 100 * DOGE_1); // 100 DOGE in a MyDoge wallet (prd.md §19.1)
    }

    // ------------------------------------------------------------ helpers

    function _arm(uint64 stopPrice, uint256 amount, uint256 floor, uint64 expiry) internal {
        vm.startPrank(holder);
        doge.approve(address(sooth), amount);
        sooth.arm(stopPrice, uint128(amount), uint128(floor), expiry);
        vm.stopPrank();
    }

    function _signerAddrs() internal pure returns (address[5] memory a) {
        a = [vm.addr(SIGNER_0), vm.addr(SIGNER_1), vm.addr(SIGNER_2), vm.addr(SIGNER_3), vm.addr(SIGNER_4)];
    }

    function _signers3() internal pure returns (uint256[] memory pks) {
        pks = new uint256[](3);
        pks[0] = SIGNER_0;
        pks[1] = SIGNER_1;
        pks[2] = SIGNER_2;
    }

    /// RedStone payload: per package [feedId 32 | value 32 | timestamp 6 | valueSize 4 | count 3 | sig 65],
    /// then packagesCount 2 | metadataSize 3 (=0) | marker. Signed hash is raw keccak of the package
    /// without its signature (evm-connector 1.0.0 RedstoneConsumerBase._extractDataPackage).
    function _payload(uint256 price, uint256 tsMs, uint256[] memory pks) internal pure returns (bytes memory) {
        uint256[] memory prices = new uint256[](pks.length);
        for (uint256 i = 0; i < pks.length; i++) prices[i] = price;
        return _payloadEach(prices, tsMs, pks);
    }

    /// One price per signer, as when each signer reads a different exchange.
    function _payloadEach(uint256[] memory prices, uint256 tsMs, uint256[] memory pks)
        internal
        pure
        returns (bytes memory out)
    {
        for (uint256 i = 0; i < pks.length; i++) {
            // forge-lint: disable-next-line(unsafe-typecast)
            bytes memory signed = abi.encodePacked(bytes32("DOGE"), bytes32(prices[i]), uint48(tsMs), uint32(32), uint24(1));
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(pks[i], keccak256(signed));
            out = abi.encodePacked(out, signed, r, s, v);
        }
        out = abi.encodePacked(out, uint16(pks.length), uint24(0), hex"000002ed57011e0000");
    }

    function _trigger(uint256 price, uint256 tsMs, uint256[] memory pks) internal returns (bool ok, bytes memory ret) {
        bytes memory data = abi.encodePacked(abi.encodeCall(sooth.trigger, (holder)), _payload(price, tsMs, pks));
        vm.prank(caller);
        (ok, ret) = address(sooth).call(data);
    }

    /// Asserts a low-level call reverted with exactly `expected`. vm.expectRevert did not catch
    /// non-reverting low-level calls here (found by mutation testing), so check by hand.
    function _assertRevert(bool ok, bytes memory ret, bytes memory expected) internal pure {
        if (ok) revert("expected a revert, call succeeded");
        if (keccak256(ret) != keccak256(expected)) revert("reverted with a different error");
    }

    function _nowMs() internal view returns (uint256) {
        return block.timestamp * 1000;
    }

    function _eq(uint256 a, uint256 b, string memory what) internal pure {
        if (a != b) revert(string.concat(what, ": ", _str(a), " != ", _str(b)));
    }

    function _str(uint256 v) internal pure returns (string memory) {
        if (v == 0) return "0";
        bytes memory b;
        while (v > 0) {
            b = abi.encodePacked(bytes1(uint8(48 + (v % 10))), b);
            v /= 10;
        }
        return string(b);
    }
}
