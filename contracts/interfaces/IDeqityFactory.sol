// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.17;

interface IDeqityFactory {
    event EquityTokenized(
        string name,
        string symbol,
        string cid,
        address[] shareholders,
        uint256[] shares
    );

    function createEquity(
        string memory name,
        string memory symbol,
        string memory cid,
        address[] memory shareHolders,
        uint256[] memory shareHolderShares
    ) external returns (address equity);
}
