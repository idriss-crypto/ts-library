// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import { AssetType } from "../enums/IDrissEnums.sol";

interface ISendToHash {
    function sendToAnyone (
        string memory _IDrissHash,
        uint256 _amount,
        AssetType _assetType,
        address _assetContractAddress,
        uint256 _assetId
    ) external payable;

    function claim (
        string memory _IDrissHash,
        AssetType _assetType,
        address _assetContractAddress
    ) external;

    function revertPayment (
        string memory _IDrissHash,
        AssetType _assetType,
        address _assetContractAddress
    ) external;

    function balanceOf (
        string memory _IDrissHash,
        AssetType _assetType,
        address _assetContractAddress
    ) external view returns (uint256);
}