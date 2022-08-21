# Deqity Core
![banner](https://user-images.githubusercontent.com/108776533/185813055-c8151606-34c7-46f4-8229-bfac05caf27c.png)

### Deployments:

```
Polygon Mumbai:

Factory: 0x962d4BE3B541AD6cB62Aadd799066129c9aAecEB

Deployed Equities for Tests: 
1. 0x8733899fBea52774e2F4AAd71014941Ae00599e8
2. 0xe87E87d0f2784f59869598F2b9f8A6CDA3B5b453
```

### Test

```
yarn hardhat test
```

## Contracts
Deqity consists of two contracts to preform all neccary actions. The contracts could be more gas optimized but they are completly functional and tested. Exposed Tokenized Equity is a contract for testing internal functions only.

### DeqityFactory.sol
Its main purpose is to deploy contracts for each tokenized company. Every time that the createEquity function is called a new equity contract is deployed. 


### TokenizedEquity.sol
