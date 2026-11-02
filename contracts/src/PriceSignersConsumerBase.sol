// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@redstone-finance/evm-connector/contracts/core/RedstoneConsumerNumericBase.sol";

/// @title Sooth's own price signers on RedStone's pull-consumer checks (DECISIONS.md D-018)
/// @notice RedStone's public gateways closed on 2026-10-29 and keyed access was not available, so
///         redstone-primary-prod's signers are replaced by five keys fixed at deploy. Each key signs one
///         exchange's DOGE/USD; the connector still verifies every signature, counts unique signers and
///         takes the median, so at least 3 of the 5 must sign and one bad source cannot set the price.
///         The keys are held by the Sooth operator: this is the oracle trust assumption.
abstract contract PriceSignersConsumerBase is RedstoneConsumerNumericBase {
    address public immutable signer0;
    address public immutable signer1;
    address public immutable signer2;
    address public immutable signer3;
    address public immutable signer4;

    error BadSigners();

    constructor(address[5] memory signers) {
        for (uint256 i = 0; i < 5; i++) {
            if (signers[i] == address(0)) revert BadSigners();
            for (uint256 j = 0; j < i; j++) {
                if (signers[i] == signers[j]) revert BadSigners();
            }
        }
        signer0 = signers[0];
        signer1 = signers[1];
        signer2 = signers[2];
        signer3 = signers[3];
        signer4 = signers[4];
    }

    function getDataServiceId() public view virtual override returns (string memory) {
        return "sooth-price-signers";
    }

    function getUniqueSignersThreshold() public view virtual override returns (uint8) {
        return 3;
    }

    function getAuthorisedSignerIndex(address signerAddress) public view virtual override returns (uint8) {
        if (signerAddress == signer0) return 0;
        if (signerAddress == signer1) return 1;
        if (signerAddress == signer2) return 2;
        if (signerAddress == signer3) return 3;
        if (signerAddress == signer4) return 4;
        revert SignerNotAuthorised(signerAddress);
    }
}
