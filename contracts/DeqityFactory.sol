// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.17;

import "./TokenizedEquity.sol";

/** @title Deqity Factory V1.0.0
 *  @notice Allows user to deploy a contract to represent the equity of their organization.
 *  @author MaximilianFullStack
 */
contract DeqityFactory {
    address public adminFeeSetter;
    uint16 public adminFee;
    address[] public equityContracts;

    mapping(string => mapping(string => address)) public getEquity;

    /* === CONSTRUCTOR ===*/

    constructor(uint16 adminFee_) {
        adminFee = adminFee_;
        adminFeeSetter = msg.sender;
    }

    /* === EVENTS === */

    event EquityTokenized(
        string name,
        string symbol,
        string cid,
        address[] shareholders,
        uint256[] shares
    );

    /** === Modifiers === **/

    /** @dev Prevents functions from being called by addresses that are
     *  not the owner address.
     */
    modifier onlyOwner() {
        require(
            msg.sender == adminFeeSetter,
            "Msg sender in not admin fee setter"
        );
        _;
    }

    /* === RECEIVE FUNCTION === */

    receive() external payable {}

    /* === FALLBACK FUNCTION === */

    fallback() external {}

    /* === EXTERNAL FUNCTIONS === */

    /// @notice deploys new contract representing organization equity
    function createEquity(
        string memory name,
        string memory symbol,
        string memory cid,
        address[] memory shareHolders,
        uint256[] memory shareHolderShares
    ) external returns (address equity) {
        require(
            shareHolders.length == shareHolderShares.length,
            "Num of shareholders and coresponding shares mismatch"
        );
        require(
            shareHolders[0] != address(0),
            "Shareholder address cant be null"
        );
        require(shareHolderShares[0] > 0, "Shareholder cant have zero shares");
        require(
            keccak256(abi.encodePacked((name))) !=
                keccak256(abi.encodePacked((""))),
            "Organization name cannot be blank"
        );
        require(
            keccak256(abi.encodePacked((symbol))) !=
                keccak256(abi.encodePacked((""))),
            "Organization name cannot be blank"
        );
        require(
            getEquity[name][symbol] == address(0),
            "Contract already exists with name and symbol"
        );
        equity = address(
            new TokenizedEquity(
                name,
                symbol,
                cid,
                adminFee,
                msg.sender,
                shareHolders,
                shareHolderShares
            )
        );
        equityContracts.push(equity);
        getEquity[name][symbol] = equity;

        emit EquityTokenized(
            name,
            symbol,
            cid,
            shareHolders,
            shareHolderShares
        );
    }

    /// @notice sets fee for all depolyed contracts. Sale amounts are divied by admin fee. e.g. 200 = 0.5%
    function setAdminFee(uint16 adminFee_) external onlyOwner {
        require(adminFee_ != adminFee, "New fee is the same as previous");
        adminFee = adminFee_;
    }

    /// @notice sets the address than can change fee amount and the fees are transfered to.
    function setFeeSetter(address adminFeeSetter_) external onlyOwner {
        require(
            adminFeeSetter != adminFeeSetter_,
            "New setter is the same as old"
        );
        adminFeeSetter = adminFeeSetter_;
    }

    /// @notice transfers contract balance to the fee setter
    function withdrawl() external onlyOwner {
        require(address(this).balance > 0, "No generated fees to withdraw");
        payable(adminFeeSetter).transfer(address(this).balance);
    }

    /* === VIEW FUNCTIONS ===*/

    function getEquityAddress(string memory name, string memory symbol)
        public
        view
        returns (address)
    {
        return getEquity[name][symbol];
    }

    function numOfEquityContracts() public view returns (uint256) {
        return equityContracts.length;
    }
}
