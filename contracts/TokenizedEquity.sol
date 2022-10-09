// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/** @title Tokenized Equity V1
 *  @notice Allows user to tokenize the equity of their organization and sell it to investors all over the world.
 *  @author MaximilianFullStack
 */
contract TokenizedEquity is ERC20, ReentrancyGuard, Ownable {
    using SafeMath for uint256;

    enum SaleStatus {
        CLOSED,
        OPEN
    }
    SaleStatus status;

    struct Shareholder {
        address holder;
        uint256 shares;
        uint256 equity;
        uint256 initialEquity;
    }

    struct PrivateSale {
        address seller;
        uint256 sharePrice;
        uint256 sharesForSale;
    }

    address public immutable i_factory;
    uint16 public immutable i_adminFee;
    string public cid;
    uint256 public totalShares;
    uint256 public dillutionSharePrice;
    bool public initilzied;

    address[] public initlalShareHolders;
    address[] public shareHolders;
    address[] public peerSellers;

    mapping(address => Shareholder) public shareholdersInfo;
    mapping(address => PrivateSale) public privateSales;

    /* === CONSTRUCTOR ===*/

    constructor(
        string memory name,
        string memory symbol,
        string memory cid_,
        uint16 adminFee_,
        address initilizer,
        address[] memory shareHolders_,
        uint256[] memory shareHolderShares_
    ) ERC20(name, symbol) {
        i_factory = msg.sender;
        i_adminFee = adminFee_;
        cid = cid_;
        initilzied = false;
        status = SaleStatus.CLOSED;
        initilizeEquity(shareHolders_, shareHolderShares_);
        transferOwnership(initilizer);
    }

    /* === RECIEVE FUNCTION === */

    receive() external payable {}

    /* === FALLBACK FUNCTION === */

    fallback() external {}

    /* === EXTERNAL FUNCTIONS ===*/

    /// @notice a dillution is a esentially a sale from all existing share holders at once. It maintains the pre-existing equity ratios
    ///   between the intial shareholders.
    function startDillutionSale(uint256 newShares, uint256 sharePrice_)
        external
        onlyOwner
    {
        require(initilzied == true, "Equity not initilized");

        require(status == SaleStatus.CLOSED, "Sale has already started");
        require(newShares > 0, "Zero new shares set for sale");
        require(sharePrice_ > 0, "Undefined share price set");

        ///updating status variables
        dillutionSharePrice = sharePrice_;
        totalShares = totalShares += newShares;
        status = SaleStatus.OPEN;

        update(true);
        initlalShareHolders = shareHolders;
    }

    /// @notice allows buyers to mint equity tokens, effectivly equally dilluting all existing shareholders.
    function buyDillutionShares(uint256 quantity)
        external
        payable
        nonReentrant
    {
        require(status == SaleStatus.OPEN, "No active sale");
        require(
            totalSupply() < totalShares.add(quantity),
            "Cannot buy more shares than available"
        );
        require(
            shareholdersInfo[msg.sender].initialEquity == 0,
            "Intital Shareholders cannot buy dillution shares"
        );
        require(
            msg.value == (dillutionSharePrice.mul(quantity)).div(1 ether),
            "Input value doesnt match share price"
        );

        ///calculates fee from sale and transfers to factory
        uint256 fee = SafeMath.div(msg.value, i_adminFee);
        payable(i_factory).transfer(fee);

        ///minting tokens and adding minter to share holder array
        _mint(msg.sender, quantity);
        shareHolders.push(msg.sender);

        ///updates status variables
        update(false);

        ///ends sale if there is no shares left to sell
        if (totalSupply() >= totalShares) {
            endDillutionSale();
        }
    }

    /// @notice a peer to peer sale is a sale from a single shareholder.
    function startPeerToPeerSale(uint256 quantity, uint256 sharePrice_)
        external
        nonReentrant
    {
        require(initilzied == true, "Equity not initlilized");
        require(
            privateSales[msg.sender].sharesForSale == 0,
            "Seller already has sale started"
        );
        require(quantity > 0, "Zero value quantity input");
        require(sharePrice_ > 0, "Zero value share price input");
        require(
            balanceOf(msg.sender) >= quantity,
            "User does not have enough shares to sell"
        );

        ///updates peer to peer variables for seller address
        privateSales[msg.sender] = PrivateSale(
            msg.sender,
            sharePrice_,
            quantity
        );
        peerSellers.push(msg.sender);

        ///approves unlimited equity tokens to be moved by the contract. Trade off between ease of use and security.
        approve(
            address(this),
            0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff
        );
    }

    /// @notice motifies a seller's existing sale
    function alterPeerToPeerSale(
        address seller,
        uint256 newQuantity,
        uint256 newSharePrice_
    ) external {
        require(initilzied == true, "Equity not initlilized");
        require(msg.sender == seller, "Only the seller can motify their sale");
        require(
            privateSales[msg.sender].sharesForSale > 0,
            "Seller doesnt have a sale"
        );
        require(
            balanceOf(msg.sender) >= newQuantity,
            "User does not have enough shares to sell"
        );

        if (newQuantity == 0) {
            privateSales[msg.sender].sharesForSale = newQuantity;
            endPeerToPeerSale(msg.sender);
        } else {
            privateSales[msg.sender] = PrivateSale(
                msg.sender,
                newSharePrice_,
                newQuantity
            );
        }
    }

    /// @notice allows buyer to purchase equity tokens from seller
    function buyPeerToPeerShares(address seller, uint256 quantity)
        external
        payable
        nonReentrant
    {
        require(initilzied == true, "Equity not initilzied");
        require(
            privateSales[seller].sharesForSale >= quantity,
            "Inputed seller doesnt have enough shares listed"
        );
        require(
            (privateSales[seller].sharePrice.mul(quantity)).div(1 ether) ==
                msg.value,
            "Invaild msg value"
        );

        ///calculates fee from sale and transfers to factory
        uint256 fee = SafeMath.div(msg.value, i_adminFee);
        payable(i_factory).transfer(fee);

        ///pays seller and tranfers tokens to buyer
        payable(seller).transfer(SafeMath.sub(msg.value, fee));
        _transfer(seller, msg.sender, quantity);

        ///adds buyer to shareholder list
        shareHolders.push(msg.sender);

        ///updates status variables
        update(false);
        privateSales[seller].sharesForSale = privateSales[seller]
            .sharesForSale
            .sub(quantity);

        if (privateSales[seller].sharesForSale == 0) {
            endPeerToPeerSale(seller);
        }
    }

    /* === INTERNAL FUNCTIONS === */

    /// @notice updates the number of tokens shareholders own and their equity
    function update(bool inital) internal {
        for (uint256 i = 0; i < shareHolders.length; i++) {
            uint256 bal = balanceOf(shareHolders[i]);
            if (bal > 0) {
                if (inital == true) {
                    shareholdersInfo[shareHolders[i]] = Shareholder(
                        shareHolders[i],
                        bal,
                        (bal.mul(1 ether)).div(totalSupply()),
                        (bal.mul(1 ether)).div(totalSupply())
                    );
                } else {
                    shareholdersInfo[shareHolders[i]] = Shareholder(
                        shareHolders[i],
                        bal,
                        (bal.mul(1 ether)).div(totalSupply()),
                        shareholdersInfo[shareHolders[i]].initialEquity
                    );
                }
            } else {
                delete shareHolders[i];
            }
        }
    }

    /// @notice mints tokens according to pre-existing equity
    function initilizeEquity(
        address[] memory shareholders_,
        uint256[] memory shareHolderShares_
    ) internal nonReentrant {
        require(totalSupply() == 0, "Equity already initilzied");
        require(initilzied != true, "Equity already initilized");

        uint256 totalShares_;

        ///mints tokens for each shareholder
        for (uint256 i = 0; i < shareholders_.length; i++) {
            _mint(shareholders_[i], shareHolderShares_[i]);
            totalShares_ += shareHolderShares_[i];
            shareHolders.push(shareholders_[i]);
            initlalShareHolders.push(shareholders_[i]);
        }

        ///updates status variables
        totalShares = totalShares_;
        update(true);
        initilzied = true;
    }

    /// @notice ends dillution sale and pays inital shareholders
    function endDillutionSale() internal {
        require(status == SaleStatus.OPEN, "No current sale");
        require(initilzied == true, "Equity not initilized");
        require(totalSupply() >= totalShares, "Still supply left to be sold");

        uint256 contractBal = address(this).balance;

        ///pays the initial shareholders according to their equity
        for (uint256 i = 0; i < initlalShareHolders.length; i++) {
            uint256 amount = (
                shareholdersInfo[initlalShareHolders[i]].initialEquity
            ).mul(contractBal);
            uint256 pay = amount.div(1 ether);
            payable(initlalShareHolders[i]).transfer(pay);
        }

        //closes sale and updates variables
        status = SaleStatus.CLOSED;
        update(true);

        ///updates inital holders for next dillution sale
        initlalShareHolders = shareHolders;
    }

    function endPeerToPeerSale(address seller) internal {
        require(initilzied == true, "Equity not initilzied");
        require(
            privateSales[seller].sharesForSale == 0,
            "User has an active sale"
        );

        delete privateSales[seller];

        for (uint256 i = 0; i < peerSellers.length; i++) {
            if (peerSellers[i] == msg.sender) {
                delete peerSellers[i];
            }
        }
    }

    /* === PUBLIC FUNCTIONS === */

    function transfer(address to, uint256 amount)
        public
        virtual
        override
        returns (bool)
    {
        address owner = msg.sender;
        _transfer(owner, to, amount);

        shareHolders.push(to);

        if (status == SaleStatus.CLOSED) {
            initlalShareHolders.push(to);
        }
        update(false);

        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public virtual override returns (bool) {
        address spender = msg.sender;
        _spendAllowance(from, spender, amount);
        _transfer(from, to, amount);

        shareHolders.push(to);

        if (status == SaleStatus.CLOSED) {
            initlalShareHolders.push(to);
        }
        update(false);

        return true;
    }

    /* === VIEW FUNCTIONS === */

    function getContractStatus() public view returns (SaleStatus, bool) {
        return (status, initilzied);
    }

    function numOfShareHolders() public view returns (uint256) {
        return shareHolders.length;
    }

    function numOfPeerToPeerSales() public view returns (uint256) {
        return peerSellers.length;
    }

    function getHolderData()
        public
        view
        returns (address[] memory, address[] memory)
    {
        return (shareHolders, peerSellers);
    }
}
