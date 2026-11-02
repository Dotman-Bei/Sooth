// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@redstone-finance/evm-connector/contracts/data-services/PrimaryProdDataServiceConsumerBase.sol";

// G0-3 (prd.md §7.2): does a RedStone primary-prod consumer return DOGE/USD in a tx on Chikyū?
// Also records G0-1 decimals: the raw value is logged as delivered (expected 8 decimals, UNVERIFIED).
// Call read() with the RedStone payload appended to calldata.

contract RedstoneProbe is PrimaryProdDataServiceConsumerBase {
    event Read(uint256 value, uint256 timestampMs, uint256 blockTimestamp);

    function read() external returns (uint256 value, uint256 timestampMs) {
        bytes32[] memory ids = new bytes32[](1);
        // "DOGE" is 4 bytes, so the cast cannot truncate.
        // forge-lint: disable-next-line(unsafe-typecast)
        ids[0] = bytes32("DOGE");
        (uint256[] memory values, uint256 ts) = getOracleNumericValuesAndTimestampFromTxMsg(ids);
        emit Read(values[0], ts, block.timestamp);
        return (values[0], ts);
    }
}
