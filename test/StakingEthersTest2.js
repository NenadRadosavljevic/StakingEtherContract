/** 
*  deposit user1
*  deposit user2
*  deposit user3
*  withdrawal user3 (pay penalties, no rewards)   
*  deposit user1
*  deposit user2
*  withdrawal user2 (pay penalties, receive rewards)
*  withdrawal user1 (no penalties, receive rewards)
*
*  user2 and user3 will withdraw their ethers in lock period.
*  user1 will withdraw after lock period.
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
    const stakeEther1 = eth(10)
    const stakeEther2 = eth(20)
    const stakeEther3 = eth(40)
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

    })

    describe('Withdrawal User 3', function(){
        let amountWithdrawn, inRewardPool

        it ('wait some period of time', async function(){    
            // position at the exact time (half lockPeriod) after user3 deposit   
            await network.provider.send("evm_setNextBlockTimestamp", [timeUser3hasStaked+lockPeriod/10-1])
            await network.provider.send("evm_mine")
        })

        it ('user 3 has left the pool', async function(){           
            const txHash = await stakingEthers.connect(user3Signer).withdrawETH()
            const receipt = await txHash.wait()
            // extract from 'Unstaked' event information about withdrawal
            // received ETH and paid early withdrawal penalties
            amountWithdrawn = receipt.events[1].args[1]
            inRewardPool = receipt.events[1].args[2]
            // Note: This is the second event (receipt.events[1]). 
            // First one is ERC20 'Approval'.
         })

         it ('checking withdrawn eth amount', async function(){         
            expect(amountWithdrawn).to.equal(eth(22))
         })
         it ('checking early withdrawal penalties', async function(){          
            expect(inRewardPool).to.equal(eth(18))
        })

    })

    describe('Deposits of users 1, 2', function(){

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
            expect(amountWithdrawn).to.equal(eth(42))    
         })
         it ('checking early withdrawal penalties', async function(){         
            expect(inRewardPool).to.equal(eth(10))
        })

    })

    describe('Withdrawal User 1', function(){
        let amountWithdrawn, inRewardPool

        it ('wait some period of time', async function(){    
            // position at the exact time (half lockPeriod) after user1 deposit   
            await ethers.provider.send('evm_increaseTime', [lockPeriod]) // lockPeriod seconds
            await network.provider.send("evm_mine")
        })

        it ('user 1 has left the pool', async function(){           
            const txHash = await stakingEthers.connect(user1Signer).withdrawETH()
            const receipt = await txHash.wait()
            // extract from 'Unstaked' event information about withdrawal
            // received ETH and paid early withdrawal penalties
            amountWithdrawn = receipt.events[2].args[1]
            inRewardPool = receipt.events[2].args[2]
            // Note: This is the second event (receipt.events[1]). 
            // First one is ERC20 'Approval'.
         })

         it ('checking withdrawn eth amount', async function(){            
            expect(amountWithdrawn).to.equal(eth(36))
         })
         it ('checking early withdrawal penalties', async function(){          
            expect(inRewardPool).to.equal(eth(0))
        })

    })

    describe('Check owner unallocated rewards from the pool', function(){

        it('try to withdraw', async function(){           
            await expect(stakingEthers.connect(deployerSigner).withdrawOwnerUnallocatedRewards()).to.be.rejectedWith('There are no unallocated rewards at the moment!')
        })

    })

    describe('Checking contract state and balances', function(){

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

})