// SPDX-License-Identifier: MIT
pragma solidity >=0.8.11;

//import "hardhat/console.sol";

contract WETHGateway {
    string public constant name = "Mocked WETHGateway";
    
    function depositETH(
        address lendingPool,
        address onBehalfOf,
        uint16 referralCode
    ) external payable{
        address _lendingPool = lendingPool;
        address _onBehalfOf = onBehalfOf;
        uint16 _refferalCode = referralCode;
        if(address(_lendingPool)==address(_onBehalfOf)){
            _refferalCode = 1;
        }
    }

    function withdrawETH(
        address lendingPool,
        uint256 amount,
        address onBehalfOf
    ) external {
        (bool success,) = msg.sender.call{value:amount}("");
        require(success,"Transfer failed!");
    }
}