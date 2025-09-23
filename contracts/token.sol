// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.4.0
pragma solidity ^0.8.27;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract GITToken is ERC20, Ownable, ERC20Permit {
    // Supply cap to prevent inflation risk
    uint256 private constant MAX_SUPPLY = 1_000_000 * 10**18; // 1M tokens max
    uint256 private constant INITIAL_SUPPLY = 500 * 10**18;   // 500 tokens initial
    
    // Events
    event SupplyCapReached(uint256 totalSupply);
    
    // Errors
    error SupplyCapExceeded();
    error InvalidAmount();
    error InvalidAddress();

    constructor(address recipient, address initialOwner)
        ERC20("GIT token", "GTK")
        Ownable(initialOwner)
        ERC20Permit("GIT token")
    {
        if(recipient == address(0)) revert InvalidAddress();
        if(initialOwner == address(0)) revert InvalidAddress();
        
        // Verify initial supply doesn't exceed cap
        if(INITIAL_SUPPLY > MAX_SUPPLY) revert SupplyCapExceeded();
        
        _mint(recipient, INITIAL_SUPPLY);
    }

    // Mint new tokens with supply cap protection
    function mint(address to, uint256 amount) public onlyOwner {
        if(to == address(0)) revert InvalidAddress();
        if(amount == 0) revert InvalidAmount();
        
        uint256 newTotalSupply = totalSupply() + amount;
        if(newTotalSupply > MAX_SUPPLY) revert SupplyCapExceeded();
        
        _mint(to, amount);
        
        // Emit event if we've reached the cap
        if(newTotalSupply == MAX_SUPPLY) {
            emit SupplyCapReached(newTotalSupply);
        }
    }

    // Burn tokens from sender
    function burn(uint256 amount) public {
        if(amount == 0) revert InvalidAmount();
        _burn(msg.sender, amount);
    }

    // Burn from another address (requires allowance)
    function burnFrom(address account, uint256 amount) public {
        if(account == address(0)) revert InvalidAddress();
        if(amount == 0) revert InvalidAmount();
        
        _spendAllowance(account, msg.sender, amount);
        _burn(account, amount);
    }

    // View functions
    function getMaxSupply() public pure returns (uint256) {
        return MAX_SUPPLY;
    }

    function getRemainingSupply() public view returns (uint256) {
        return MAX_SUPPLY - totalSupply();
    }
}
