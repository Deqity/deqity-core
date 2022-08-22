# Deqity Core
![banner](https://user-images.githubusercontent.com/108776533/185813055-c8151606-34c7-46f4-8229-bfac05caf27c.png)

### Deployments:

```
Polygon Mumbai:

Factory: 0x962d4BE3B541AD6cB62Aadd799066129c9aAecEB

Deployed Equities for Tests: 
    - 0x8733899fBea52774e2F4AAd71014941Ae00599e8
    - 0xe87E87d0f2784f59869598F2b9f8A6CDA3B5b453
```

## Test

```
yarn hardhat test
```

# Contracts
Deqity consists of two contracts to preform all neccary actions. The contracts could be more gas optimized but they are completly functional and tested. Exposed Tokenized Equity is a contract for testing internal functions only.

## DeqityFactory.sol
Its primary purpose is to deploy contracts for each tokenized company. To do this, the  ```createEquity```  function is called. After every new contract is deployed, the factory stores the adress, name, and symbol of the company. For organizational and search purposes, no two equity contracts can have the same name and symbol. This allows each contract to have a unique idenetifier. 

The frontend beutifally utilizes this design choice by using a query string containing the name and symbol of the contract. It then calls the function below to retrieve the address of the desired contract.

```solidity
function getEquityAddress(string memory name, string memory symbol)
        public
        view
        returns (address)
    {
        return getEquity[name][symbol];
    }
```
The secondary purpose of the factroy contract is to collect generated fees and transfer them to ```adminFeeSetter```, aka the contract owner. When the factory is deployed it is set with an ```adminFee```. This admin fee can be only altered by the ```adminFeeSetter```. When an equity contract is deployed this admin fee is passed to the new contract. The ```msg.value``` of every share sale is divided by the ```adminFee``` to create a ```fee```. This fee is then transfered to the factory. 

At any time, anyone can call the ```withdrawl``` function. Please note that this always transfers the contract balance to the ```adminFeeSetter```, thus it doesnt matter who calls it. I'm sure the fee setter would be very happy if someone else payed the gas fee to pay him. 

```solidity
/// @notice transfers contract balance to the fee setter (doesnt matter who function caller is)
function withdrawl() external {
     require(address(this).balance > 0, "No generated fees to withdraw");
     payable(adminFeeSetter).transfer(address(this).balance);
}
```

## TokenizedEquity.sol
This contract represents the equity of a buisness as erc-20 tokens. On deployment the contructor calls the ```initilizeEquity``` function along with setting many status varibles. This function mints inputed shares for each inputed shareholder. It then updates some status variables, transfers ownership to the caller, and calls the ```update``` function with its parameter as true. 

```solidity
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
  ```
  
The ```update``` function updates the variables that keep track of shareholders and their equity. Equity percentage is represented by ether. ```1 ether = 100%``` This method of representing percentages allows for an extreme amount of percison which is of upmost importance when working with ownership. 

The contract maintains two lists of sharehodlers, ```initalShareHolders``` and ```shareHolders```. Inital shareholders are the shareholders that owned equity before a dillution sale. Every time ```update``` is called, the shareholders list is updated. But the inital shareholders list is only updated when true is passed in ```update```'s perameter. This only occurs durring initlization via ```initilizeEquity``` or at the conclusion of a dilution sale via ```endDillutionSale```.

```solidity
 /// @notice updates the number of tokens shareholders own and their equity
    function update(bool inital) internal {
        for (uint256 i = 0; i < shareHolders.length; i++) {
            uint256 bal = balanceOf(shareHolders[i]);
            if (bal > 0) {
                shareHolderShares[shareHolders[i]] = bal;
                equity[shareHolders[i]] = (bal.mul(1 ether)).div(totalSupply());
                if (inital == true) {
                    initialEquity[shareHolders[i]] = (bal.mul(1 ether)).div(
                        totalSupply()
                    );
                }
            } else {
                delete shareHolders[i];
            }
        }
    }
```

The contract allows for two methods of selling shares. The first method is called a dilution sale. This type of sale effectivly dilutes all the shareholder's equities equally. A company may choese to do this if they want to maintain the equity ratios amoung the current sharholders and a sigle sharholder does not want to directly sell their equity. 

To start the dilution sale, the owner of the contract specifies a new amount of total shares. And then inputs that amount into the ```startDillutionSale``` function along with a price per share. The function updates status variables and then allows buyers to buy shares. Note, inital shareholders cannot purchase dilution shares to prevent them from getting (essentially) free equity.

After the dilution sale is started, a buyer can call the ```startPeerToPeerSale``` and input and certain quantity of shares. The contract then mints the inputed quantity of shares for the buyer as long as that quantity does not surpass the new total amount of shares. The ```msg.value``` (minus fee) of their puchase is kept in the equity contract. If their purchase raises the ```totalSupply``` to the ```totalShares``` then the ```endDillutionSale``` function will be called to end the dilution sale.

At the end of a dilution sale, each inital shareholder will be paid a percantage of the equity contract's balance. This percentage is determined by ```initalEquity``` which is only caluclated at initalization and at the end of a dilution sale along with ```initialShareHolders```.

```solidity 
 /// @notice ends dillution sale and pays inital shareholders
    function endDillutionSale() internal {
        require(status == SaleStatus.OPEN, "No current sale");
        require(initilzied == true, "Equity not initilized");
        require(totalSupply() >= totalShares, "Still supply left to be sold");

        ///pays the initial shareholders according to there equity
        for (uint256 i = 0; i < initlalShareHolders.length; i++) {
            uint256 amount = (initialEquity[initlalShareHolders[i]]).mul(
                address(this).balance
            );
            uint256 pay = amount.div(1 ether);
            payable(shareHolders[i]).transfer(pay);
        }

        //closes sale and updates variables
        status = SaleStatus.CLOSED;
        update(true);

        ///updates inital holders for next dillution sale
        initlalShareHolders = shareHolders;
    }
```

The second method of selling shares is via a "peer to peer sale". Which is ecentally a single seller to single buyer. Note, there can be muliple buyers if the previous buyer does not buy the entire sale quantity. Any shareholder can start on of these sales by calling ```startPeerToPeerSale``` and inputing a qunatity of share and a price per share. The contract approves an "unlimited" amount of equity shares for the equity contract for a better user experience alothough it's a tradeoff with security.

After "peer to peer sales" are created, the contract maintains a list of "peer to peer sellers" and mappings of their corresponding data of their sale i.e. quantity and price. To buy from a seller, the buyer has to call ```buyPeerToPeerShares``` and imput the seller's address along with a quantity of shares. The ```msg.value``` (minus fee) is then transfered to the seller and the quantity of shares are transfered to the buyer. After the sale, the sale's status variables are updated and similarly to the dillution sale, if the sales quantity is reached then the sale will be ended via ```endPeerToPeerSale```.

Finally there is a function to motifiy a user's sale. This can be called if they want to change the quantity being sold, the price, or if they want to stop the sale entirely. To do this, the seller calls ```alterPeerToPeerSale``` and inputs their address, a quantity, and a price. Note, only the seller can motifiy their sale. If the new quantity is equal to zero then ```endPeerToPeerSale``` will be called and the sale will be ended.
