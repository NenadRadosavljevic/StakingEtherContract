# StakingEthersContract

## Getting started
* Copy project to your directory ( `git clone https://github.com/NenadRadosavljevic/StakingEthersContract` )
* Install Hardhat and project packages (`npm install --save-dev hardhat`)
* Compile the project (`npx hardhat compile`)

## For Testing
* To run the test, use the command: `npx hardhat test`
There are two different test scenarios in a test folder.
Mocked aWETH contract, and WETH Gateway are just for testing purposes.

Test output for the first one `npx hardhat test test/StakingEthersTest1.js`
```
  StakingEthers
    StakingEthersContract deployment
      ✔ has a name
    Deposits of users 1, 2 and 3
      ✔ deposit user 1
      ✔ wait some period of time
      ✔ deposit user 2 (173ms)
      ✔ wait some period of time
      ✔ staking user 3 (157ms)
      ✔ checking staking balances
      ✔ checking current number of stakers
      ✔ checking current staked balance
    Withdrawal User 2
      ✔ wait some period of time
      ✔ user 2 has left the pool (46ms)
      ✔ checking withdrawn eth amount
      ✔ checking early withdrawal penalties
      ✔ try to withdraw again
    Deposit User 1
      ✔ staking user 1 (150ms)
      ✔ checking staking balances
    Withdrawal User 3
      ✔ wait some period of time
      ✔ user 3 has left the pool
      ✔ checking withdrawn eth amount
      ✔ checking early withdrawal penalties
    Withdrawal User 1
      ✔ wait some period of time
      ✔ user 1 has left the pool (43ms)
      ✔ checking withdrawn eth amount
      ✔ checking early withdrawal penalties
      ✔ checking unallocated rewards
    Owner withdraw unallocated rewards from the pool
      ✔ unallocated rewards withdrawn
      ✔ try to withdraw again
    Checking contract state and balances
      ✔ checking user1 state
      ✔ checking contract balance
      ✔ checking current staked balance
      ✔ checking current number of stakers
    Owner's passive income withdrawal
      ✔ Owner receive remaining profit from AAVE


  32 passing (1s)
```

## Deployment to the Ethereum test network
* Deployment script for the StakingEthersContract is in `/scripts/deploy.js`.
* Configuration for the test network, providers, and source code verification are in `hardhat.config.js`.
* Goerli testnet AAVE v3 contract addresses and Hardhat configuration keys are in `.env`.

Build and deploy contracts to the Goerly testnet
```bash
npx hardhat compile
# deploy the contract
npx hardhat run scripts/deploy.js --network goerli
```
Source code verification for the StakingEthersContract
```bash
# the contract verification
npx hardhat verify --network goerli 0x0e75051906F2426E30D26386f14Bf1a10be50Fa7 120 0xd5B55D3Ed89FDa19124ceB5baB620328287b915d 0x27B4692C93959048833f40702b22FE3578E77759 0x368EedF3f56ad10b9bC57eed4Dac65B26Bb667f6
```
#
Current Admin on Test Net
* Goerly: 0x9AebBD6c624b440B0B73E2680E65d258Ee26698F
#
StakingEthers Smart Contract Address on Test Net
* Goerly: https://goerli.etherscan.io/address/0x0e75051906f2426e30d26386f14bf1a10be50fa7

## Deployed info

https://goerli.etherscan.io/address/0x9AebBD6c624b440B0B73E2680E65d258Ee26698F

```
Deploying contracts with the account: 0x9AebBD6c624b440B0B73E2680E65d258Ee26698F
Account balance: 99999999955083194
StakingEthersContract is deployed to 0x0e75051906F2426E30D26386f14Bf1a10be50Fa7

```

## Code verification info

https://goerli.etherscan.io/address/0x0e75051906f2426e30d26386f14bf1a10be50fa7#code

```
Successfully submitted source code for contract
contracts/StakingEthers.sol:StakingEthersContract at 0x0e75051906F2426E30D26386f14Bf1a10be50Fa7
for verification on the block explorer. Waiting for verification result...

Successfully verified contract StakingEthersContract on Etherscan.
https://goerli.etherscan.io/address/0x0e75051906F2426E30D26386f14Bf1a10be50Fa7#code

```
