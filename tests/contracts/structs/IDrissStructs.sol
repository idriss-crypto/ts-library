// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

struct AssetLiability {
    uint256 amount;
    // IMPORTANT - when deleting AssetLiability, please remove assetIds array first. Reference:
    // https://github.com/crytic/slither/wiki/Detector-Documentation#deletion-on-mapping-containing-a-structure
    mapping (address => uint256[]) assetIds;
}