// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

//TODO: add documentation
library ConversionUtils {
    /**
    * @notice Change a single character from ASCII to 0-F hex value; revert on unparseable value
    */
    function fromHexChar(uint8 c) internal pure returns (uint8) {
        if (bytes1(c) >= bytes1('0') && bytes1(c) <= bytes1('9')) {
            return c - uint8(bytes1('0'));
        } else if (bytes1(c) >= bytes1('a') && bytes1(c) <= bytes1('f')) {
            return 10 + c - uint8(bytes1('a'));
        } else if (bytes1(c) >= bytes1('A') && bytes1(c) <= bytes1('F')) {
            return 10 + c - uint8(bytes1('A'));
        } else {
            revert("Unparseable hex character found in address.");
        }
    }

    /**
    * @notice Get address from string. Revert if address is invalid.
    */    
    function safeHexStringToAddress(string memory s) internal pure returns (address) {
        bytes memory ss = bytes(s);
        require(ss.length == 42, "Address length is invalid");
        bytes memory _bytes = new bytes(ss.length / 2);
        address resultAddress;

        for (uint256 i = 1; i < ss.length / 2; i++) {
            _bytes[i] = bytes1(fromHexChar(uint8(ss[2*i])) * 16 +
                        fromHexChar(uint8(ss[2*i+1])));
        }

        assembly {
            resultAddress := div(mload(add(add(_bytes, 0x20), 1)), 0x1000000000000000000000000)
        }

        return resultAddress;
    }
}