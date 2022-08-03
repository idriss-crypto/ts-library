// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import { ISendToHash } from "../interfaces/ISendToHash.sol";
import { SendToHash } from "../SendToHash.sol"; 
import { IIDrissRegistry } from "../interfaces/IIDrissRegistry.sol";
import { AssetLiability } from "../structs/IDrissStructs.sol";
import { AssetType } from "../enums/IDrissEnums.sol";
import { ConversionUtils } from "../libs/ConversionUtils.sol";

/**
 * @title SendToHashMock
 * @author Rafał Kalinowski
 * @notice mock SendToHash used to test internal functions
 * custom:experimental used only as a mock for tests
 */
contract SendToHashMock is SendToHash {

    constructor(
        address _IDrissAddr,
        address _maticUsdAggregator
    ) SendToHash(_IDrissAddr, _maticUsdAggregator) {}


    function splitPayment(uint256 _value) public view returns (uint256 fee, uint256 value) {
        return _splitPayment(_value);
    }

    function adjustAddress(address _addr, AssetType _assetType)
        external
        pure
        returns (address) {
            return _adjustAddress(_addr, _assetType);
    }

    function getAddressFromHash (string memory _IDrissHash)
        external
        view
        returns (address IDrissAddress)
    {
        return _getAddressFromHash(_IDrissHash);
    }

    function fromHexChar(uint8 c) external pure returns (uint8) {
        return ConversionUtils.fromHexChar(c);
    }

    function safeHexStringToAddress(string memory s) external pure returns (address) {
        return ConversionUtils.safeHexStringToAddress(s);
    }

    function dollarToWei() external view returns (uint256) {
        return _dollarToWei();
    }

    function getPayerAssetMapAmount(
        address _payerAddress,
        bytes32 _IDrissHash,
        AssetType _assetType,
        address _assetContractAddress) external view returns (uint256) {
            return payerAssetMap[_payerAddress][_IDrissHash][_assetType][_assetContractAddress].amount;
    }

    function getPayerAssetMapAssetIds(
        address _payerAddress,
        bytes32 _IDrissHash,
        AssetType _assetType,
        address _assetContractAddress) external view returns (uint256[] memory) {
            return payerAssetMap[_payerAddress][_IDrissHash][_assetType][_assetContractAddress].assetIds[_payerAddress];
    }

    function getBeneficiaryMapAmount(
        bytes32 _IDrissHash,
        AssetType _assetType,
        address _assetContractAddress) external view returns (uint256) {
            return beneficiaryAssetMap[_IDrissHash][_assetType][_assetContractAddress].amount;
    }

    function getBeneficiaryMapAssetIds(
        bytes32 _IDrissHash,
        AssetType _assetType,
        address _assetContractAddress,
        address _payerAddress) external view returns (uint256[] memory) {
            return beneficiaryAssetMap[_IDrissHash][_assetType][_assetContractAddress].assetIds[_payerAddress];
    }

    function getBeneficiaryPayersArray(
        bytes32 _IDrissHash,
        AssetType _assetType,
        address _assetContractAddress) external view returns (address[] memory) {
            return beneficiaryPayersArray[_IDrissHash][_assetType][_assetContractAddress];
    }

    function getBeneficiaryPayersMap(
        address _payerAddress,
        bytes32 _IDrissHash,
        AssetType _assetType,
        address _assetContractAddress) external view returns (bool) {
            return beneficiaryPayersMap[_IDrissHash][_assetType][_assetContractAddress][_payerAddress];
    }
}