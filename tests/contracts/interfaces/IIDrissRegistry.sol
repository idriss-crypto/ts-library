// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

interface IIDrissRegistry {
    function getIDriss(string memory hashPub) external view returns (string memory);
    function IDrissOwners(string memory _address) external view returns (address);
}