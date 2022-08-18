// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.9;

import "../TokenizedEquity.sol";

contract ExposedTokenizedEquity is TokenizedEquity {
    constructor(
        string memory name,
        string memory symbol,
        uint16 adminFee_,
        address initilizer,
        address[] memory shareHolders_,
        uint256[] memory shareHolderShares_
    )
        TokenizedEquity(
            name,
            symbol,
            adminFee_,
            initilizer,
            shareHolders_,
            shareHolderShares_
        )
    {}

    function _update(bool init) public {
        update(init);
    }

    function _initilizeEquity(
        address[] memory shareholders_,
        uint256[] memory shareHolderShares_
    ) public {
        initilizeEquity(shareholders_, shareHolderShares_);
    }

    function _endDillutionSale() public {
        endDillutionSale();
    }

    function _endPeerToPeerSale(address seller) public {
        endPeerToPeerSale(seller);
    }
}
