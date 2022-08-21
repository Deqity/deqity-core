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

At any time, anyone can call the ```withdrawl``` function. Please note that this alway transfers the contract balance to the ```adminFeeSetter```, thus it doesnt matter who calls it. Im sure the fee setter would be very happy if someone else payed the gas fee to pay him. 

```solidity
/// @notice transfers contract balance to the fee setter (doesnt matter who function caller is)
function withdrawl() external {
     require(address(this).balance > 0, "No generated fees to withdraw");
     payable(adminFeeSetter).transfer(address(this).balance);
}
```

## TokenizedEquity.sol
This contract represents the equity of a buisness as erc-20 tokens. On deployment the contructor calls the ```initilizeEquity``` function along with setting many status varibles. This function mints inputed shares for each inputed shareholder. It then updates some status variables and calls the ```update``` function with its parameter as true. 

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
