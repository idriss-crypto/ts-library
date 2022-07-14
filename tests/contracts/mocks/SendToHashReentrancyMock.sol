// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import { ISendToHash } from "../interfaces/ISendToHash.sol";
import { AssetType } from "../enums/IDrissEnums.sol";

/**
 * @title SendToHashReentrancyMock
 * @author Rafał Kalinowski
 * @notice mock SendToHash reentrancy attach used to test for this kind of attacks
 * custom:experimental used only as a mock for tests
 */
contract SendToHashReentrancyMock {
    ISendToHash contractToAttack;
    string hashToPerformAttackOn;
    uint256 public reentrancyCounter;

    constructor (address _sendToHashAddress, string memory _hash) {
        contractToAttack = ISendToHash(_sendToHashAddress);
        hashToPerformAttackOn = _hash;
    }

    //ERC721
    function safeTransferFrom (
        address,
        address,
        uint256,
        bytes calldata
    ) external {
        _sendToAnyoneReentrancy(AssetType.NFT);
    }

    //ERC20
    function transfer(address, uint256) external returns (bool) {
        _sendToAnyoneReentrancy(AssetType.Token);

        return true;
    }

    //ERC20
    function transferFrom(
        address,
        address,
        uint256
    ) external returns (bool) {
        _sendToAnyoneReentrancy(AssetType.Token);

        return true;
    }

    function _sendToAnyoneReentrancy (
        AssetType _assetType
    ) internal {
        reentrancyCounter++;

        if (reentrancyCounter < 5) {
            contractToAttack.sendToAnyone{value: 3 * 10**18}(hashToPerformAttackOn, 5, _assetType, address(this), 1);  
        }
    }

    function balance() public view returns (uint256) {
        return address(this).balance;
    }

    receive() payable external {}
}