// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TestERC20
 * @dev A simple ERC20 token for testing purposes
 */
contract TestERC20 is ERC20, Ownable {
    constructor(string memory name, string memory symbol) 
        ERC20(name, symbol) 
        Ownable(msg.sender)
    {}
    
    /**
     * @dev Mints tokens to a specified address
     * @param to The address to mint tokens to
     * @param amount The amount of tokens to mint
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}