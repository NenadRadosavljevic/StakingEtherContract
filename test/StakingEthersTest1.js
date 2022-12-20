/** 
*  deposit user1
*  deposit user2
*  deposit user3
*  withdrawal user2 (pay penalties, no rewards)   
*  deposit user1
*  withdrawal user3 (pay penalties, receive rewards)
*  withdrawal user1 (pay penalties, receive rewards)
*
*  user2 and user3 will withdraw their ethers in half lockPeriod after deposits.
*  user1 will withdraw in half lockPeriod after it's second deposit.
*
*  unallocated rewards from the user1 early withdrawal penalties will be 
*  distributed to the contract owner.
*
*/
const { expect } = require('chai');
const { ethers } = require('hardhat');
// const WETHGateway = require("../artifacts/contracts/WETHGateway.sol/WETHGateway.json");

function eth(n) {
    return ethers.utils.parseEther(n.toString());
}


describe("StakingEthers", function () {
    let stakingEthers
    const lockPeriod = 60 // seconds
    const stakeEther1 = eth(1)
    const stakeEther2 = eth(2)
    const stakeEther3 = eth(4)
    const totalStakedBalance = eth(7)
    const ownersPassiveIncome = eth(0.1)
    let deployer, user1, user2, user3
    let deployerSigner, user1Signer, user2Signer, user3Signer
    // time in seconds elapsed from epoch 
    let timeUser1hasStaked, timeUser2hasStaked, timeUser3hasStaked
    // lending pool address, not important for this test
    const LP_ADDRESS = '0x368EedF3f56ad10b9bC57eed4Dac65B26Bb667f6';

    before(async function () {     
        [deployerSigner, user1Signer, user2Signer, user3Signer] = await ethers.getSigners()
        deployer = await deployerSigner.getAddress();
        user1 = await user1Signer.getAddress();
        user2 = await user2Signer.getAddress();
        user3 = await user3Signer.getAddress();

        const aWETH = await ethers.getContractFactory("aWETH")
        //deploying Mocked aWETH and fetching back aWETH address
        aWETHmocked = await aWETH.deploy() 
        await aWETHmocked.deployed();

        const WETHGateway = await ethers.getContractFactory("WETHGateway")
        //deploying Mocked WETHGateway and fetching back WETHGateway address
        wETHGatewayMocked = await WETHGateway.deploy() 
        await wETHGatewayMocked.deployed();

        const StakingEthers = await ethers.getContractFactory("StakingEthersContract")
        //deploying StakingEthersContract and fetching back StakingEthersContract address
        stakingEthers = await StakingEthers.deploy(lockPeriod, wETHGatewayMocked.address, aWETHmocked.address, LP_ADDRESS)
        await stakingEthers.deployed();
        
        // to test the passive income withdrawal from the "AAVE" lending pool
        // send aWETH to the StakingEthersContract account
        await aWETHmocked.connect(deployerSigner).transfer(stakingEthers.address, ownersPassiveIncome)
        // deposit ethers to the gateway contract
        await wETHGatewayMocked.connect(deployerSigner).depositETH(LP_ADDRESS, stakingEthers.address, 0, {value: ownersPassiveIncome});

    })

    describe('StakingEthersContract deployment', function(){
        it ('has a name', async function(){           
            const name = await stakingEthers.name()
            expect(name).to.equal('Staking ethers smart contract') 
        })
    })

    describe('Deposits of users 1, 2 and 3', function(){

        it ('deposit user 1', async function(){  
            // deposit ethers by calling the contract function         
            const txHash = await stakingEthers.connect(user1Signer).depositETH({value: stakeEther1});          
            await txHash.wait();
        })
        it ('wait some period of time', async function(){
            // wait before the next user makes a deposit
            await ethers.provider.send('evm_increaseTime', [5]) // 5 seconds
            await ethers.provider.send("evm_mine")
        })
        it ('deposit user 2', async function(){           
            const params = { to: stakingEthers.address, value: stakeEther2};
            // deposit ethers by calling contract receive function
            const txHash = await user2Signer.sendTransaction(params);            
            await txHash.wait();
            // extract transaction timestamp
            let blockData = await ethers.provider.getBlock(txHash.block);
            timeUser2hasStaked = blockData.timestamp
        })
        it ('wait some period of time', async function(){      
            // wait before the next user makes a deposit     
            await ethers.provider.send('evm_increaseTime', [5]) // 5 seconds
            await ethers.provider.send("evm_mine")
        })
        it ('staking user 3', async function(){           
            const params = { to: stakingEthers.address, value: stakeEther3};
            // call stakingEthers contract receive function
            const txHash = await user3Signer.sendTransaction(params);
            await txHash.wait();
            // extract transaction timestamp
            let blockData = await ethers.provider.getBlock(txHash.block);          
            timeUser3hasStaked = blockData.timestamp
        })

        it ('checking staking balances', async function(){           
            let amount = await stakingEthers.connect(user1Signer).getUserStakedAmount()
            expect(amount).to.equal(stakeEther1)

            amount = await stakingEthers.connect(user2Signer).getUserStakedAmount()
            expect(amount).to.equal(stakeEther2)

            amount = await stakingEthers.connect(user3Signer).getUserStakedAmount()
            expect(amount).to.equal(stakeEther3)
         })

         it ('checking current number of stakers', async function(){           
            let numOfStakers = await stakingEthers.getCurrentNumberOfUsers()
            expect(numOfStakers).to.equal(3)
         })

         it ('checking current staked balance', async function(){  
            // checking the monitored balance         
            let balance = await stakingEthers.getCurrentStakedBalance()
            expect(balance).to.equal(totalStakedBalance)
            // checking contract's account balance, should be zero
            // all deposits are sent to the Aave lending pool
            balance = await ethers.provider.getBalance(stakingEthers.address)
            expect(balance).to.equal(eth(0))
         })
    })

    describe('Withdrawal User 2', function(){
        let amountWithdrawn, inRewardPool

        it ('wait some period of time', async function(){    
            // position at the exact time (half lockPeriod) after user2 deposit   
            await network.provider.send("evm_setNextBlockTimestamp", [timeUser2hasStaked+lockPeriod/2-1])
            await network.provider.send("evm_mine")
        })

        it ('user 2 has left the pool', async function(){           
            const txHash = await stakingEthers.connect(user2Signer).withdrawETH()
            const receipt = await txHash.wait()
            // extract from 'Unstaked' event information about withdrawal
            // received ETH and paid early withdrawal penalties
            amountWithdrawn = receipt.events[1].args[1]
            inRewardPool = receipt.events[1].args[2]
            // Note: This is the second event (receipt.events[1]). 
            // First one is ERC20 'Approval'.
         })

         it ('checking withdrawn eth amount', async function(){           
            expect(amountWithdrawn).to.equal(eth(1.5))
         })
         it ('checking early withdrawal penalties', async function(){           
            expect(inRewardPool).to.equal(eth(0.5))
        })

        it('try to withdraw again', async function(){   
            // smart contract storage about previous stakers are already cleared.        
            await expect(stakingEthers.connect(user2Signer).withdrawETH()).to.be.rejectedWith('You are not participant!')
        })

    })

    describe('Deposit User 1', function(){
        it ('staking user 1', async function(){           
            const params = { to: stakingEthers.address, value: stakeEther1};
            // deposit ethers by calling contract receive function
            const txHash = await user1Signer.sendTransaction(params);
            await txHash.wait();
            // extract transaction timestamp
            let blockData = await ethers.provider.getBlock(txHash.block);          
            timeUser1hasStaked = blockData.timestamp
        })

        it ('checking staking balances', async function(){           
            let amount = await stakingEthers.connect(user1Signer).getUserStakedAmount()
            expect(amount).to.equal(eth(2))
         })
    })

    describe('Withdrawal User 3', function(){
        let amountWithdrawn, inRewardPool

        it ('wait some period of time', async function(){     
            // position at the exact time (half lockPeriod) after user3 deposit       
            await network.provider.send("evm_setNextBlockTimestamp", [timeUser3hasStaked+lockPeriod/2-1])
            await network.provider.send("evm_mine")
        })

        it ('user 3 has left the pool', async function(){           
            const txHash = await stakingEthers.connect(user3Signer).withdrawETH()
            const receipt = await txHash.wait()
            // extract from 'Unstaked' event information about withdrawal
            // received ETH and paid early withdrawal penalties
            amountWithdrawn = receipt.events[1].args[1]
            inRewardPool = receipt.events[1].args[2]
         })

         it ('checking withdrawn eth amount', async function(){           
            expect(amountWithdrawn).to.equal(eth(3.4))
         })
         it ('checking early withdrawal penalties', async function(){           
            expect(inRewardPool).to.equal(eth(1))
         })
    })

    describe('Withdrawal User 1', function(){
        let amountWithdrawn, inRewardPool, unallocatedRewards

        it ('wait some period of time', async function(){  
            // position at the exact time (half lockPeriod) after user1 deposit          
            await network.provider.send("evm_setNextBlockTimestamp", [timeUser1hasStaked+lockPeriod/2-1])
            await network.provider.send("evm_mine")
        })

        it ('user 1 has left the pool', async function(){ 
            const txHash = await stakingEthers.connect(user1Signer).withdrawETH()
            const receipt = await txHash.wait()
            // extract from 'Unstaked' event information about withdrawal
            // received ETH and paid early withdrawal penalties
            amountWithdrawn = receipt.events[2].args[1]
            inRewardPool = receipt.events[2].args[2]
            // extract from 'OwnerGotRewards' event information about 
            // unallocated rewards distributed to the contract owner
            unallocatedRewards = receipt.events[0].args[2]

            // checking contract's account balance
            balance = await ethers.provider.getBalance(stakingEthers.address)
           // expect(balance).to.equal(eth(0.5))
         })

         it ('checking withdrawn eth amount', async function(){           
            expect(amountWithdrawn).to.equal(eth(2.6))
         })
         it ('checking early withdrawal penalties', async function(){           
            expect(inRewardPool).to.equal(eth(0.5))
         })
         it ('checking unallocated rewards', async function(){           
            expect(inRewardPool).to.equal(eth(0.5))
         })
    })

    describe('Owner withdraw unallocated rewards from the pool', function(){

        it ('unallocated rewards withdrawn', async function(){ 
            // unallocated rewards received by the contract owner
            const txHash = await stakingEthers.connect(deployerSigner).withdrawOwnerUnallocatedRewards()
            const receipt = await txHash.wait()
            // extract from 'OwnerRewardsWithdrawn' event information about withdrawal
            let amount = receipt.events[1].args[1]
            expect(amount).to.equal(eth(0.5))
         })

        it('try to withdraw again', async function(){           
            await expect(stakingEthers.connect(deployerSigner).withdrawOwnerUnallocatedRewards()).to.be.rejectedWith('There are no unallocated rewards at the moment!')
        })

    })

    describe('Checking contract state and balances', function(){

        it('checking user1 state', async function(){           
            await expect(stakingEthers.connect(user1Signer).getUserStakedAmount()).to.be.rejectedWith('You are not participant!')
        })

        // contract account balance should be 0
        it ('checking contract balance', async function(){           
            balance = await ethers.provider.getBalance(stakingEthers.address)
            expect(balance).to.equal(eth(0))
        })

        it ('checking current staked balance', async function(){           
            let balance = await stakingEthers.getCurrentStakedBalance()
            expect(balance).to.equal(0)
        })

        it ('checking current number of stakers', async function(){           
            let numOfStakers = await stakingEthers.getCurrentNumberOfUsers()
            expect(numOfStakers).to.equal(0)
        })
    })

    describe('Owner\'s passive income withdrawal', function(){

        it('Owner receive remaining profit from AAVE', async function(){   
            // remaining profit received by the contract owner
            const txHash = await stakingEthers.connect(deployerSigner).withdrawOwnerRemainingProfit()
            const receipt = await txHash.wait()
            // extract from 'OwnerIncomeWithdrawn' event information about withdrawal
            let amount = receipt.events[1].args[1]
            expect(amount).to.equal(ownersPassiveIncome)            
        })

    })


})