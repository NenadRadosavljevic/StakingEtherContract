// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const { ethers } = require('hardhat');
require('dotenv').config()
const { WETHGateway_ADDRESS, aWETH_ADDRESS, LP_ADDRESS } = process.env;

async function main() {
  const [deployer] = await ethers.getSigners()
  const LOCK_PERIOD = 120

  console.log("Deploying contracts with the account:", deployer.address)
  console.log("Account balance:", (await deployer.getBalance()).toString())

  const StakingEthers = await ethers.getContractFactory("StakingEthersContract")
  const stakingEthers = await StakingEthers.deploy(LOCK_PERIOD, WETHGateway_ADDRESS, aWETH_ADDRESS, LP_ADDRESS)
  await stakingEthers.deployed()

  console.log(
    `StakingEthersContract is deployed to ${stakingEthers.address}`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
