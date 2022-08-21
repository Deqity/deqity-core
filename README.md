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

```
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

```
/// @notice transfers contract balance to the fee setter (doesnt matter who function caller is)
function withdrawl() external {
     require(address(this).balance > 0, "No generated fees to withdraw");
     payable(adminFeeSetter).transfer(address(this).balance);
}
```

## TokenizedEquity.sol
