// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import { ISendToHash } from "./interfaces/ISendToHash.sol";
import { IIDrissRegistry } from "./interfaces/IIDrissRegistry.sol";
import { AssetLiability } from "./structs/IDrissStructs.sol";
import { AssetType } from "./enums/IDrissEnums.sol";
import { ConversionUtils } from "./libs/ConversionUtils.sol";


/**
 * @title SendToHash
 * @author Rafał Kalinowski
 * @notice This contract is used to pay to the IDriss address without a need for it to be registered
 */
contract SendToHash is ISendToHash, Ownable, ReentrancyGuard, IERC721Receiver, IERC165 {
    using SafeCast for int256;

    // payer => beneficiaryHash => assetType => assetAddress => AssetLiability
    mapping(address => mapping(bytes32 => mapping(AssetType => mapping(address => AssetLiability)))) payerAssetMap;
    // beneficiaryHash => assetType => assetAddress => AssetLiability
    mapping(bytes32 => mapping(AssetType => mapping(address => AssetLiability))) beneficiaryAssetMap;
    // beneficiaryHash => assetType => assetAddress => payer[]
    mapping(bytes32 => mapping(AssetType => mapping(address => address[]))) beneficiaryPayersArray;
    // beneficiaryHash => assetType => assetAddress => payer => didPay
    mapping(bytes32 => mapping(AssetType => mapping(address => mapping(address => bool)))) beneficiaryPayersMap;

    AggregatorV3Interface internal immutable MATIC_USD_PRICE_FEED;
    address public immutable IDRISS_ADDR;
    uint256 public constant PAYMENT_FEE_SLIPPAGE_PERCENT = 5;
    uint256 public PAYMENT_FEE_PERCENTAGE = 10;
    uint256 public PAYMENT_FEE_PERCENTAGE_DENOMINATOR = 1000;
    uint256 public MINIMAL_PAYMENT_FEE = 1;
    uint256 public MINIMAL_PAYMENT_FEE_DENOMINATOR = 1;
    uint256 public paymentFeesBalance;

    event AssetTransferred(bytes32 indexed toHash, address indexed from,
        address indexed assetContractAddress, uint256 amount, AssetType assetType, string message);
    event AssetMoved(bytes32 indexed fromHash, bytes32 indexed toHash,
        address indexed from, address assetContractAddress, AssetType assetType);
    event AssetClaimed(bytes32 indexed toHash, address indexed beneficiary,
        address indexed assetContractAddress, uint256 amount, AssetType assetType);
    event AssetTransferReverted(bytes32 indexed toHash, address indexed from,
        address indexed assetContractAddress, uint256 amount, AssetType assetType);

    constructor( address _IDrissAddr, address _maticUsdAggregator) {
        _checkNonZeroAddress(_IDrissAddr, "IDriss address cannot be 0");
        _checkNonZeroAddress(_IDrissAddr, "Matic price feed address cannot be 0");

        IDRISS_ADDR = _IDrissAddr;
        MATIC_USD_PRICE_FEED = AggregatorV3Interface(_maticUsdAggregator);
    }

    /**
     * @notice This function allows a user to send tokens or coins to other IDriss. They are
     *         being kept in an escrow until it's claimed by beneficiary or reverted by payer
     * @dev Note that you have to approve this contract address in ERC to handle them on user's behalf.
     *      It's best to approve contract by using non standard function just like
     *      `increaseAllowance` in OpenZeppelin to mitigate risk of race condition and double spend.
     */
    function sendToAnyone (
        bytes32 _IDrissHash,
        uint256 _amount,
        AssetType _assetType,
        address _assetContractAddress,
        uint256 _assetId,
        string memory _message
    ) external override nonReentrant() payable {
        address adjustedAssetAddress = _adjustAddress(_assetContractAddress, _assetType);
        (uint256 fee, uint256 paymentValue) = _splitPayment(msg.value);
        if (_assetType != AssetType.Coin) { fee = msg.value; }
        if (_assetType == AssetType.Token) { paymentValue = _amount; }
        if (_assetType == AssetType.NFT) { paymentValue = 1; }

        setStateForSendToAnyone(_IDrissHash, paymentValue, fee, _assetType, _assetContractAddress, _assetId);

        if (_assetType == AssetType.Token) {
            _sendTokenAssetFrom(paymentValue, msg.sender, address(this), _assetContractAddress);
        } else if (_assetType == AssetType.NFT) {
            uint256 [] memory assetIds = new uint[](1);
            assetIds[0] = _assetId;
            _sendNFTAsset(assetIds, msg.sender, address(this), _assetContractAddress);
        }

        emit AssetTransferred(_IDrissHash, msg.sender, adjustedAssetAddress, paymentValue, _assetType, _message);
    }

    /**
     * @notice Sets state for sendToAnyone function invocation
     */
    function setStateForSendToAnyone (
        bytes32 _IDrissHash,
        uint256 _amount,
        uint256 _fee,
        AssetType _assetType,
        address _assetContractAddress,
        uint256 _assetId
    ) internal {
        address adjustedAssetAddress = _adjustAddress(_assetContractAddress, _assetType);

        AssetLiability storage beneficiaryAsset = beneficiaryAssetMap[_IDrissHash][_assetType][adjustedAssetAddress];
        AssetLiability storage payerAsset = payerAssetMap[msg.sender][_IDrissHash][_assetType][adjustedAssetAddress];


        if (_assetType == AssetType.Coin) {
            _checkNonZeroValue(_amount, "Transferred value has to be bigger than 0");
        } else {
            _checkNonZeroValue(_amount, "Asset amount has to be bigger than 0");
            _checkNonZeroAddress(_assetContractAddress, "Asset address cannot be 0");
            require(_isContract(_assetContractAddress), "Asset address is not a contract");
        }

        if (!beneficiaryPayersMap[_IDrissHash][_assetType][adjustedAssetAddress][msg.sender]) {
            beneficiaryPayersArray[_IDrissHash][_assetType][adjustedAssetAddress].push(msg.sender);
            beneficiaryPayersMap[_IDrissHash][_assetType][adjustedAssetAddress][msg.sender] = true;
        }

        if (_assetType == AssetType.NFT) { _amount = 1; }
        beneficiaryAsset.amount += _amount;
        payerAsset.amount += _amount;
        paymentFeesBalance += _fee;

        if (_assetType == AssetType.NFT) {
            beneficiaryAsset.assetIds[msg.sender].push(_assetId);
            payerAsset.assetIds[msg.sender].push(_assetId);
        }
    }

    /**
     * @notice Calculates payment fee 
     * @param _value - payment value
     * @param _assetType - asset type, required as ERC20 & ERC721 only take minimal fee
     * @return fee - processing fee, few percent of slippage is allowed
     */
    function getPaymentFee(uint256 _value, AssetType _assetType) public view override returns (uint256) {
        uint256 minimumPaymentFee = _getMinimumFee();
        if (_assetType == AssetType.Token || _assetType == AssetType.NFT) {
            return minimumPaymentFee;
        }

        uint256 percentageFee = _getPercentageFee(_value);
        if (percentageFee > minimumPaymentFee) return percentageFee; else return minimumPaymentFee;
    }

    function _getMinimumFee() internal view returns (uint256) {
        return (_dollarToWei() * MINIMAL_PAYMENT_FEE) / MINIMAL_PAYMENT_FEE_DENOMINATOR;
    }

    function _getPercentageFee(uint256 _value) internal view returns (uint256) {
        return (_value * PAYMENT_FEE_PERCENTAGE) / PAYMENT_FEE_PERCENTAGE_DENOMINATOR;
    }

    /**
     * @notice Calculates value of a fee from sent msg.value
     * @param _value - payment value, taken from msg.value 
     * @return fee - processing fee, few percent of slippage is allowed
     * @return value - payment value after substracting fee
     */
    function _splitPayment(uint256 _value) internal view returns (uint256 fee, uint256 value) {
        uint256 minimalPaymentFee = _getMinimumFee();
        uint256 feeFromValue = _getPercentageFee(_value);

        if (feeFromValue > minimalPaymentFee) {
            fee = feeFromValue;
        // we accept slippage of matic price
        } else if (_value >= minimalPaymentFee * (100 - PAYMENT_FEE_SLIPPAGE_PERCENT) / 100
                        && _value <= minimalPaymentFee) {
            fee = _value;
        } else {
            fee = minimalPaymentFee;
        }

        require (_value >= fee, "Value sent is smaller than minimal fee.");

        value = _value - fee;
    }

    /**
     * @notice Allows claiming assets by an IDriss owner
     */
    function claim (
        string memory _IDrissHash,
        string memory _claimPassword,
        AssetType _assetType,
        address _assetContractAddress
    ) external override nonReentrant() {
        address ownerIDrissAddr = _getAddressFromHash(_IDrissHash);
        bytes32 hashWithPassword = hashIDrissWithPassword(_IDrissHash, _claimPassword);

        address adjustedAssetAddress = _adjustAddress(_assetContractAddress, _assetType);
        AssetLiability storage beneficiaryAsset = beneficiaryAssetMap[hashWithPassword][_assetType][adjustedAssetAddress];
        address [] memory payers = beneficiaryPayersArray[hashWithPassword][_assetType][adjustedAssetAddress];
        uint256 amountToClaim = beneficiaryAsset.amount;

        _checkNonZeroValue(amountToClaim, "Nothing to claim.");
        require(ownerIDrissAddr == msg.sender, "Only owner can claim payments.");
 
        beneficiaryAsset.amount = 0;

        for (uint256 i = 0; i < payers.length; i++) {
            beneficiaryPayersArray[hashWithPassword][_assetType][adjustedAssetAddress].pop();
            delete payerAssetMap[payers[i]][hashWithPassword][_assetType][adjustedAssetAddress].assetIds[payers[i]];
            delete payerAssetMap[payers[i]][hashWithPassword][_assetType][adjustedAssetAddress];
            delete beneficiaryPayersMap[hashWithPassword][_assetType][adjustedAssetAddress][payers[i]];
            if (_assetType == AssetType.NFT) {
                uint256[] memory assetIds = beneficiaryAsset.assetIds[payers[i]];
                delete beneficiaryAsset.assetIds[payers[i]];
                _sendNFTAsset(assetIds, address(this), ownerIDrissAddr, _assetContractAddress);
            }
        }

        delete beneficiaryAssetMap[hashWithPassword][_assetType][adjustedAssetAddress];

        if (_assetType == AssetType.Coin) {
            _sendCoin(ownerIDrissAddr, amountToClaim);
        } else if (_assetType == AssetType.Token) {
            _sendTokenAsset(amountToClaim, ownerIDrissAddr, _assetContractAddress);
        }

        emit AssetClaimed(hashWithPassword, ownerIDrissAddr, adjustedAssetAddress, amountToClaim, _assetType);
    }

    /**
     * @notice Get balance of given asset for IDrissHash
     */
    function balanceOf (
        bytes32 _IDrissHash,
        AssetType _assetType,
        address _assetContractAddress
    ) external override view returns (uint256) {
        address adjustedAssetAddress = _adjustAddress(_assetContractAddress, _assetType);
        return beneficiaryAssetMap[_IDrissHash][_assetType][adjustedAssetAddress].amount;
    }

    /**
     * @notice Reverts sending tokens to an IDriss hash and claim them back
     */
    function revertPayment (
        bytes32 _IDrissHash,
        AssetType _assetType,
        address _assetContractAddress
    ) external override nonReentrant() {
        address adjustedAssetAddress = _adjustAddress(_assetContractAddress, _assetType);
        uint256[] memory assetIds = beneficiaryAssetMap[_IDrissHash][_assetType][adjustedAssetAddress].assetIds[msg.sender];
        uint256 amountToRevert = setStateForRevertPayment(_IDrissHash, _assetType, _assetContractAddress);

        if (_assetType == AssetType.Coin) {
            _sendCoin(msg.sender, amountToRevert);
        } else if (_assetType == AssetType.Token) {
            _sendTokenAsset(amountToRevert, msg.sender, _assetContractAddress);
        } else if (_assetType == AssetType.NFT) {
            _sendNFTAsset(assetIds, address(this), msg.sender, _assetContractAddress);
        } 

        emit AssetTransferReverted(_IDrissHash, msg.sender, adjustedAssetAddress, amountToRevert, _assetType);
    }

    /**
     * @notice Sets the state for reverting the payment for a user
     */
    function setStateForRevertPayment (
        bytes32 _IDrissHash,
        AssetType _assetType,
        address _assetContractAddress
    ) internal returns(uint256 amountToRevert) {
        address adjustedAssetAddress = _adjustAddress(_assetContractAddress, _assetType);
        amountToRevert = payerAssetMap[msg.sender][_IDrissHash][_assetType][adjustedAssetAddress].amount;
        AssetLiability storage beneficiaryAsset = beneficiaryAssetMap[_IDrissHash][_assetType][adjustedAssetAddress];

        _checkNonZeroValue(amountToRevert, "Nothing to revert.");

        delete payerAssetMap[msg.sender][_IDrissHash][_assetType][adjustedAssetAddress].assetIds[msg.sender];
        delete payerAssetMap[msg.sender][_IDrissHash][_assetType][adjustedAssetAddress];
        beneficiaryAsset.amount -= amountToRevert;

        address [] storage payers = beneficiaryPayersArray[_IDrissHash][_assetType][adjustedAssetAddress];

        for (uint256 i = 0; i < payers.length; i++) {
            if (msg.sender == payers[i]) {
                delete beneficiaryPayersMap[_IDrissHash][_assetType][adjustedAssetAddress][payers[i]];
                if (_assetType == AssetType.NFT) {
                    delete beneficiaryAsset.assetIds[payers[i]];
                }
                payers[i] = payers[payers.length - 1];
                payers.pop();
            }
        }

        if (_assetType == AssetType.NFT) {
            delete beneficiaryAsset.assetIds[msg.sender];
        }
}

    /**
     * @notice This function allows a user to move tokens or coins they already sent to other IDriss
     */
    function moveAssetToOtherHash (
        bytes32 _FromIDrissHash,
        bytes32 _ToIDrissHash,
        AssetType _assetType,
        address _assetContractAddress
    ) external override nonReentrant() {
        address adjustedAssetAddress = _adjustAddress(_assetContractAddress, _assetType);
        uint256[] memory assetIds = beneficiaryAssetMap[_FromIDrissHash][_assetType][adjustedAssetAddress].assetIds[msg.sender];
        uint256 _amount = setStateForRevertPayment(_FromIDrissHash, _assetType, _assetContractAddress);

        _checkNonZeroValue(_amount, "Nothing to transfer");

        if (_assetType == AssetType.NFT) {
            for (uint256 i = 0; i < assetIds.length; i++) {
                setStateForSendToAnyone(_ToIDrissHash, _amount, 0, _assetType, _assetContractAddress, assetIds[i]);
            }
        } else {
            setStateForSendToAnyone(_ToIDrissHash, _amount, 0, _assetType, _assetContractAddress, 0);
        }

        emit AssetMoved(_FromIDrissHash, _ToIDrissHash, msg.sender, adjustedAssetAddress, _assetType);
    }

    /**
     * @notice Claim fees gathered from sendToAnyone(). Only owner can execute this function
     */
    function claimPaymentFees() onlyOwner external {
        uint256 amountToClaim = paymentFeesBalance;
        paymentFeesBalance = 0;

        _sendCoin(msg.sender, amountToClaim);
    }

    /**
    * @notice Wrapper for sending native Coin via call function
    * @dev When using this function please make sure to not send it to anyone, verify the
    *      address in IDriss registry
    */
    function _sendCoin (address _to, uint256 _amount) internal {
        (bool sent, ) = payable(_to).call{value: _amount}("");
        require(sent, "Failed to withdraw");
    }

    /**
     * @notice Wrapper for sending NFT asset with additional checks and iteraton over an array
     */
    function _sendNFTAsset (
        uint256[] memory _assetIds,
        address _from,
        address _to,
        address _contractAddress
    ) internal {
        require(_assetIds.length > 0, "Nothing to send");

        IERC721 nft = IERC721(_contractAddress);
        for (uint256 i = 0; i < _assetIds.length; i++) {
            nft.safeTransferFrom(_from, _to, _assetIds[i], "");
        }
    }

    /**
     * @notice Wrapper for sending ERC20 Token asset with additional checks
     */
    function _sendTokenAsset (
        uint256 _amount,
        address _to,
        address _contractAddress
    ) internal {
        IERC20 token = IERC20(_contractAddress);

        bool sent = token.transfer(_to, _amount);
        require(sent, "Failed to transfer token");
    }

    /**
     * @notice Wrapper for sending ERC20 token from specific account with additional checks and iteraton over an array
     */
    function _sendTokenAssetFrom (
        uint256 _amount,
        address _from,
        address _to,
        address _contractAddress
    ) internal {
        IERC20 token = IERC20(_contractAddress);

        bool sent = token.transferFrom(_from, _to, _amount);
        require(sent, "Failed to transfer token");
    }

    /**
    * @notice Check if an address is a deployed contract
    * @dev IMPORTANT!! This function is used for very specific reason, i.e. to check
    *      if ERC20 or ERC721 is already deployed before trying to interact with it.
    *      It should not be used to detect if msg.sender is an user, as any code run
    *      in a contructor has code size of 0
    */    
    function _isContract(address addr) internal view returns (bool) {
        uint size;
        assembly { size := extcodesize(addr) }
        return size > 0;
    }

    /**
    * @notice Helper function to set asset address to 0 for coins for asset mapping
    */
    function _adjustAddress(address _addr, AssetType _assetType)
        internal
        pure
        returns (address) {
            if (_assetType == AssetType.Coin) {
                return address(0);
            }
            return _addr;
    }

    /**
    * @notice Helper function to retrieve address string from IDriss hash and transforming it into address type
    */
    function _getAddressFromHash (string memory _IDrissHash)
        internal
        view
        returns (address IDrissAddress)
    {
        string memory IDrissString = IIDrissRegistry(IDRISS_ADDR).getIDriss(_IDrissHash);
        require(bytes(IDrissString).length > 0, "IDriss not found.");
        IDrissAddress = ConversionUtils.safeHexStringToAddress(IDrissString);
        _checkNonZeroAddress(IDrissAddress, "Address for the IDriss hash cannot resolve to 0x0");
    }

    /*
    * @notice Get current amount of wei in a dollar
    * @dev ChainLink officially supports only USD -> MATIC,
    *      so we have to convert it back to get current amount of wei in a dollar
    */
    function _dollarToWei() internal view returns (uint256) {
        (,int256 maticPrice,,,) = MATIC_USD_PRICE_FEED.latestRoundData();
        require (maticPrice > 0, "Unable to retrieve MATIC price.");

        uint256 maticPriceMultiplier = 10**MATIC_USD_PRICE_FEED.decimals();

        return(10**18 * maticPriceMultiplier) / uint256(maticPrice);
    }

    /**
    * @notice Helper function to check if address is non-zero. Reverts with passed message in that casee.
    */
    function _checkNonZeroAddress (address _addr, string memory message) internal pure {
        require(_addr != address(0), message);
    }

    /**
    * @notice Helper function to check if value is bigger than 0. Reverts with passed message in that casee.
    */
    function _checkNonZeroValue (uint256 _value, string memory message) internal pure {
        require(_value > 0, message);
    }

    /**
    * @notice adjust payment fee percentage for big native currenct transfers
    * @dev Solidity is not good when it comes to handling floats. We use denominator then, 
    *      e.g. to set payment fee to 1.5% , just pass paymentFee = 15 & denominator = 1000 => 15 / 1000 = 0.015 = 1.5%
    */
    function changePaymentFeePercentage (uint256 _paymentFeePercentage, uint256 _paymentFeeDenominator) external onlyOwner {
        _checkNonZeroValue(_paymentFeePercentage, "Payment fee has to be bigger than 0");
        _checkNonZeroValue(_paymentFeeDenominator, "Payment fee denominator has to be bigger than 0");

        PAYMENT_FEE_PERCENTAGE = _paymentFeePercentage;
        PAYMENT_FEE_PERCENTAGE_DENOMINATOR = _paymentFeeDenominator;
    }

    /**
    * @notice adjust minimal payment fee for all asset transfers
    * @dev Solidity is not good when it comes to handling floats. We use denominator then, 
    *      e.g. to set minimal payment fee to 2.2$ , just pass paymentFee = 22 & denominator = 10 => 22 / 10 = 2.2
    */
    function changeMinimalPaymentFee (uint256 _minimalPaymentFee, uint256 _paymentFeeDenominator) external onlyOwner {
        _checkNonZeroValue(_minimalPaymentFee, "Payment fee has to be bigger than 0");
        _checkNonZeroValue(_paymentFeeDenominator, "Payment fee denominator has to be bigger than 0");

        MINIMAL_PAYMENT_FEE = _minimalPaymentFee;
        MINIMAL_PAYMENT_FEE_DENOMINATOR = _paymentFeeDenominator;
    }

    /**
    * @notice Get bytes32 hash of IDriss and password. It's used to obfuscate real IDriss that received a payment until the owner claims it.
    *         Because it's a pure function, it won't be visible in mempool, and it's safe to execute.
    */
    function hashIDrissWithPassword (
        string memory  _IDrissHash,
        string memory _claimPassword
    ) public pure override returns (bytes32) {
        return keccak256(abi.encodePacked(_IDrissHash, _claimPassword));
    }

    /*
    * @notice Always reverts. By default Ownable supports renouncing ownership, that is setting owner to address 0.
    *         However in this case it would disallow receiving payment fees by anyone.
    */
    function renounceOwnership() public override view onlyOwner {
        revert("Renouncing ownership is not supported");
    }

   function onERC721Received (
        address,
        address,
        uint256,
        bytes calldata
    ) external override pure returns (bytes4) {
       return IERC721Receiver.onERC721Received.selector;
    }

    function supportsInterface (bytes4 interfaceId) public pure override returns (bool) {
        return interfaceId == type(IERC165).interfaceId
         || interfaceId == type(IERC721Receiver).interfaceId
         || interfaceId == type(ISendToHash).interfaceId;
    }
}