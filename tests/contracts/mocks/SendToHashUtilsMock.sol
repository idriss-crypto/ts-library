// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import { SendToHash } from "../SendToHash.sol";
import { ConversionUtils } from "../libs/ConversionUtils.sol";

/**
 * @title SendToHashUtilsMock
 * @author Rafał Kalinowski
 * @notice test util functions
 * custom:experimental used only as a mock for tests
 */
contract SendToHashUtilsMock {
    constructor() {}

   function hashIDrissWithPassword (string memory _IDrissHash, string memory _password)
       external
       pure
       returns (bytes32 _hash)
   {
       return keccak256(abi.encodePacked(_IDrissHash, _password));
   }

    function fromHexChar(uint8 c) external pure returns (uint8) {
        return ConversionUtils.fromHexChar(c);
    }

    function safeHexStringToAddress(string memory s) external pure returns (address) {
        return ConversionUtils.safeHexStringToAddress(s);
    }
}