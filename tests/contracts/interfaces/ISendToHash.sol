// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import { AssetType } from "../enums/IDrissEnums.sol";

interface ISendToHash {
    function sendToAnyone (
        bytes32 _IDrissHash,
        uint256 _amount,
        AssetType _assetType,
        address _assetContractAddress,
        uint256 _assetId,
        string memory _message
    ) external payable;

    function claim (
        string memory _IDrissHash,
        string memory _claimPassword,
        AssetType _assetType,
        address _assetContractAddress
    ) external;

    function revertPayment (
        bytes32 _IDrissHash,
        AssetType _assetType,
        address _assetContractAddress
    ) external;

    function moveAssetToOtherHash (
        bytes32 _FromIDrissHash,
        bytes32 _ToIDrissHash,
        AssetType _assetType,
        address _assetContractAddress
    ) external;

    function balanceOf (
        bytes32 _IDrissHash,
        AssetType _assetType,
        address _assetContractAddress
    ) external view returns (uint256);

    function hashIDrissWithPassword (
        string memory  _IDrissHash,
        string memory _claimPassword
    ) external pure returns (bytes32);

    function getPaymentFee(
        uint256 _value,
        AssetType _assetType
    ) external view returns (uint256);
}